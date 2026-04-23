import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { LocalPharmacyStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterPharmacyPartnerDto } from './dto/register-pharmacy-partner.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class PharmacyPartnersService {
  private readonly logger = new Logger(PharmacyPartnersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a new local pharmacy. Saved with PENDING status.
   * Performs a mock license verification: if licenseNumber is truthy, mark verified.
   */
  async register(dto: RegisterPharmacyPartnerDto) {
    const existing = await this.prisma.localPharmacy.findUnique({
      where: { licenseNumber: dto.licenseNumber },
    });

    if (existing) {
      throw new ConflictException(
        `A pharmacy with license number "${dto.licenseNumber}" is already registered.`,
      );
    }

    // Mock license verification: any non-empty licenseNumber is treated as verified.
    const licenseVerified = Boolean(dto.licenseNumber?.trim());

    const pharmacy = await this.prisma.localPharmacy.create({
      data: {
        name: dto.name,
        licenseNumber: dto.licenseNumber,
        address: dto.address,
        contact: dto.contact,
        operatingHours: dto.operatingHours,
        documents: dto.documents ?? [],
        licenseVerified,
        status: LocalPharmacyStatus.PENDING,
      },
    });

    this.logger.log(
      `Pharmacy "${pharmacy.name}" registered with id=${pharmacy.id} licenseVerified=${licenseVerified}`,
    );

    return pharmacy;
  }

  /** Return all pharmacies (for admin). */
  async findAll() {
    return this.prisma.localPharmacy.findMany({
      orderBy: { createdAt: 'desc' },
      include: { inventory: true },
    });
  }

  /** Approve a pharmacy — sets status to ACTIVE. */
  async approve(id: string) {
    await this.ensureExists(id);
    const updated = await this.prisma.localPharmacy.update({
      where: { id },
      data: { status: LocalPharmacyStatus.ACTIVE },
    });
    this.logger.log(`Pharmacy id=${id} approved → ACTIVE`);
    return updated;
  }

  /** Reject a pharmacy — sets status to REJECTED. */
  async reject(id: string) {
    await this.ensureExists(id);
    const updated = await this.prisma.localPharmacy.update({
      where: { id },
      data: { status: LocalPharmacyStatus.REJECTED },
    });
    this.logger.log(`Pharmacy id=${id} rejected → REJECTED`);
    return updated;
  }

  /**
   * Replace the full inventory for a pharmacy.
   * Deletes existing items then inserts the new list.
   */
  async updateInventory(id: string, dto: UpdateInventoryDto) {
    await this.ensureExists(id);

    await this.prisma.$transaction([
      this.prisma.localPharmacyInventory.deleteMany({
        where: { pharmacyId: id },
      }),
      this.prisma.localPharmacyInventory.createMany({
        data: dto.items.map((item) => ({
          pharmacyId: id,
          medicineName: item.medicineName,
          price: item.price,
          stock: item.stock,
        })),
      }),
    ]);

    this.logger.log(
      `Inventory updated for pharmacy id=${id}: ${dto.items.length} items`,
    );

    return this.prisma.localPharmacy.findUnique({
      where: { id },
      include: { inventory: true },
    });
  }

  /** Fetch ACTIVE pharmacies with their inventory — used by LocalPharmacyProvider. */
  async findActiveWithInventory() {
    return this.prisma.localPharmacy.findMany({
      where: { status: LocalPharmacyStatus.ACTIVE },
      include: { inventory: true },
    });
  }

  private async ensureExists(id: string) {
    const pharmacy = await this.prisma.localPharmacy.findUnique({
      where: { id },
    });
    if (!pharmacy) {
      throw new NotFoundException(`Pharmacy with id "${id}" not found.`);
    }
    return pharmacy;
  }
}
