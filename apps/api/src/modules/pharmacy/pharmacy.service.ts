import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PharmacyPartner } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  PharmacyPartnerProvider,
  MedicineResult,
} from './providers/pharmacy-partner.interface';
import { withRetry } from './utils/retry.util';
import { CircuitBreaker } from './utils/circuit-breaker.util';
import { toPharmacyError } from './errors/pharmacy.errors';

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);

  /**
   * Per-provider circuit breakers so that a single failing partner does not
   * degrade the entire service.
   */
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerProviders: Map<string, PharmacyPartnerProvider>,
  ) {}

  async searchMedicines(
    query: string,
    pincode?: string,
    partner?: string,
  ): Promise<MedicineResult[]> {
    if (partner) {
      const activePartner = await this.prisma.pharmacyPartner.findFirst({
        where: {
          isActive: true,
          OR: [
            { code: partner },
            { code: partner.toLowerCase() },
            { name: partner },
          ],
        },
      });

      if (!activePartner) {
        throw new BadRequestException(
          `Unknown pharmacy partner provider: ${partner}`,
        );
      }

      const provider = this.resolveProvider(activePartner);
      const medicines = await this.searchProvider(
        provider,
        query,
        pincode,
        activePartner.code,
      );
      return this.enforcePrescriptionSafety(medicines);
    }

    const activePartners = await this.prisma.pharmacyPartner.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'asc' }, { displayName: 'asc' }],
    });

    const providers = this.resolveProviders(activePartners);
    if (providers.length === 0) {
      return [];
    }

    const results = await Promise.allSettled(
      providers.map(({ provider, key }) =>
        this.searchProvider(provider, query, pincode, key),
      ),
    );

    const medicines = results
      .filter(
        (r): r is PromiseFulfilledResult<MedicineResult[]> =>
          r.status === 'fulfilled',
      )
      .flatMap((r) => r.value);

    return this.enforcePrescriptionSafety(medicines);
  }

  private normalizeMedicineBaseName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b\d+(?:\.\d+)?\s*(mg|g|mcg|iu|ml)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolvePrescriptionFlag(items: MedicineResult[]): boolean {
    const hasRxTrue = items.some((m) => m.requiresPrescription === true);
    if (hasRxTrue) {
      return true;
    }

    const hasRxFalse = items.some((m) => m.requiresPrescription === false);
    if (hasRxFalse) {
      return false;
    }

    // Fail-safe for legal compliance: unknown classification defaults to Rx.
    return true;
  }

  private enforcePrescriptionSafety(
    medicines: MedicineResult[],
  ): MedicineResult[] {
    const groups = new Map<string, MedicineResult[]>();

    for (const medicine of medicines) {
      const key = this.normalizeMedicineBaseName(medicine.name);
      const existing = groups.get(key) ?? [];
      existing.push(medicine);
      groups.set(key, existing);
    }

    const sanitized: MedicineResult[] = [];

    for (const [baseName, grouped] of groups) {
      const hasMixedClassification =
        grouped.some((m) => m.requiresPrescription === true) &&
        grouped.some((m) => m.requiresPrescription === false);

      const resolvedFlag = this.resolvePrescriptionFlag(grouped);

      if (hasMixedClassification) {
        this.logger.warn(
          `Prescription classification conflict for "${baseName}". Enforcing requiresPrescription=${resolvedFlag}.`,
        );
      }

      sanitized.push(
        ...grouped.map((m) => ({ ...m, requiresPrescription: resolvedFlag })),
      );
    }

    return sanitized;
  }

  async listPartners() {
    const partners = await this.prisma.pharmacyPartner.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'asc' }, { displayName: 'asc' }],
    });

    return partners.map((partner) => {
      const providerKey = this.resolveProviderKey(partner.code, partner.name);
      const cb = this.getCircuitBreaker(providerKey);
      return {
        id: partner.id,
        code: partner.code,
        name: partner.name,
        displayName: partner.displayName,
        description: partner.description,
        logoUrl: partner.logoUrl,
        priority: partner.priority,
        providerKey,
        registered: this.partnerProviders.has(providerKey),
        circuitState: cb.currentState,
      };
    });
  }

  private resolveProviders(
    partners: PharmacyPartner[],
  ): Array<{ provider: PharmacyPartnerProvider; key: string }> {
    const uniqueProviders = new Set<PharmacyPartnerProvider>();
    const result: Array<{ provider: PharmacyPartnerProvider; key: string }> =
      [];

    for (const partner of partners) {
      try {
        const provider = this.resolveProvider(partner);
        if (!uniqueProviders.has(provider)) {
          uniqueProviders.add(provider);
          result.push({
            provider,
            key: this.resolveProviderKey(partner.code, partner.name),
          });
        }
      } catch {
        // Skip unregistered DB partners so search only queries configured providers.
      }
    }

    return result;
  }

  private resolveProvider(partner: Pick<PharmacyPartner, 'code' | 'name'>) {
    const providerKey = this.resolveProviderKey(partner.code, partner.name);
    const provider = this.partnerProviders.get(providerKey);

    if (!provider) {
      throw new BadRequestException(
        `No pharmacy provider configured for partner: ${partner.code}`,
      );
    }

    return provider;
  }

  private async searchProvider(
    provider: PharmacyPartnerProvider,
    query: string,
    pincode: string | undefined,
    providerKey: string,
  ): Promise<MedicineResult[]> {
    const cb = this.getCircuitBreaker(providerKey);
    const start = Date.now();

    let medicines: MedicineResult[];
    try {
      medicines = await withRetry(
        () => cb.execute(() => provider.searchMedicines(query)),
        { maxAttempts: 3, baseDelayMs: 200 },
        `${providerKey}.searchMedicines`,
      );
    } catch (err) {
      const pharmacyErr = toPharmacyError(err);
      this.logger.warn(
        `[${providerKey}] searchMedicines failed after retries: ${pharmacyErr.message}`,
        { query, latencyMs: Date.now() - start, errorCode: pharmacyErr.code },
      );
      return [];
    }

    this.logger.log(
      `[${providerKey}] searchMedicines returned ${medicines.length} result(s) in ${Date.now() - start}ms`,
    );

    if (!pincode) {
      return medicines;
    }

    const withAvailability = await Promise.all(
      medicines.map(async (medicine) => {
        try {
          const availability = await withRetry(
            () =>
              cb.execute(() =>
                provider.checkAvailability(medicine.id, pincode),
              ),
            { maxAttempts: 2, baseDelayMs: 150 },
            `${providerKey}.checkAvailability`,
          );
          if (!availability.available) {
            return null;
          }
          return { ...medicine, availability };
        } catch {
          return null;
        }
      }),
    );

    return withAvailability.filter(
      (medicine): medicine is NonNullable<(typeof withAvailability)[number]> =>
        medicine !== null,
    );
  }

  private resolveProviderKey(code: string, name: string): string {
    if (this.partnerProviders.has(code.toLowerCase())) {
      return code.toLowerCase();
    }
    return name.toLowerCase();
  }

  private getCircuitBreaker(providerKey: string): CircuitBreaker {
    if (!this.circuitBreakers.has(providerKey)) {
      this.circuitBreakers.set(
        providerKey,
        new CircuitBreaker(providerKey, {
          failureThreshold: 5,
          resetTimeoutMs: 30_000,
        }),
      );
    }
    return this.circuitBreakers.get(providerKey)!;
  }
}
