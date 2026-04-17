import { BadRequestException, Injectable } from '@nestjs/common';
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
      const provider = this.partnerProviders.get(partner.toLowerCase());
      if (!provider) {
        throw new BadRequestException(
          `Unknown pharmacy partner provider: ${partner}`,
        );
      }

      return this.searchProvider(provider, query, pincode);
    }

    const results = await Promise.allSettled(
      Array.from(this.partnerProviders.values()).map((p) =>
        this.searchProvider(p, query, pincode),
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
