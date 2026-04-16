import { Injectable } from '@nestjs/common';
import {
  PharmacyPartnerProvider,
  MedicineResult,
} from './providers/pharmacy-partner.interface';

@Injectable()
export class PharmacyService {
  constructor(
    private readonly partnerProviders: Map<string, PharmacyPartnerProvider>,
  ) {}

  async searchMedicines(
    query: string,
    partner?: string,
  ): Promise<MedicineResult[]> {
    if (partner) {
      const provider = this.partnerProviders.get(partner.toLowerCase());
      if (provider) {
        return provider.searchMedicines(query);
      }
    }

    // Fan-out: search across all active providers and merge results
    const results = await Promise.allSettled(
      Array.from(this.partnerProviders.values()).map((p) =>
        p.searchMedicines(query),
      ),
    );

    return results
      .filter(
        (r): r is PromiseFulfilledResult<MedicineResult[]> =>
          r.status === 'fulfilled',
      )
      .flatMap((r) => r.value);
  }

  listProviders(): string[] {
    return Array.from(this.partnerProviders.keys());
  }
}
