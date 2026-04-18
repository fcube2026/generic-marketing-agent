import { BadRequestException, Injectable } from '@nestjs/common';
import { PharmacyPartner } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  PharmacyPartnerProvider,
  MedicineResult,
} from './providers/pharmacy-partner.interface';

@Injectable()
export class PharmacyService {
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

      return this.searchProvider(provider, query, pincode);
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
      providers.map((provider) =>
        this.searchProvider(provider, query, pincode),
      ),
    );

    return results
      .filter(
        (r): r is PromiseFulfilledResult<MedicineResult[]> =>
          r.status === 'fulfilled',
      )
      .flatMap((r) => r.value);
  }

  async listPartners() {
    const partners = await this.prisma.pharmacyPartner.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'asc' }, { displayName: 'asc' }],
    });

    return partners.map((partner) => {
      const providerKey = this.resolveProviderKey(partner.code, partner.name);
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
      };
    });
  }

  private resolveProviders(
    partners: PharmacyPartner[],
  ): PharmacyPartnerProvider[] {
    const uniqueProviders = new Set<PharmacyPartnerProvider>();

    for (const partner of partners) {
      try {
        uniqueProviders.add(this.resolveProvider(partner));
      } catch {
        // Skip unregistered DB partners so search only queries configured providers.
      }
    }

    return Array.from(uniqueProviders);
  }

  private resolveProvider(partner: Pick<PharmacyPartner, 'code' | 'name'>) {
    const providerKey = this.resolveProviderKey(partner.code, partner.name);
    const provider = this.partnerProviders.get(providerKey);

    if (!provider || providerKey === 'mock') {
      throw new BadRequestException(
        `No live pharmacy provider configured for partner: ${partner.code}`,
      );
    }

    return provider;
  }

  private async searchProvider(
    provider: PharmacyPartnerProvider,
    query: string,
    pincode?: string,
  ): Promise<MedicineResult[]> {
    const medicines = await provider.searchMedicines(query);

    if (!pincode) {
      return medicines;
    }

    const withAvailability = await Promise.all(
      medicines.map(async (medicine) => {
        try {
          const availability = await provider.checkAvailability(
            medicine.id,
            pincode,
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
}
