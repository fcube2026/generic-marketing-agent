import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseSyncService } from '../../common/supabase/supabase-sync.service';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import {
  UpdatePatientProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/update-patient-profile.dto';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private readonly supabaseSync: SupabaseSyncService,
  ) {}

  private normalizeProfilePayload(
    dto: CreatePatientProfileDto | UpdatePatientProfileDto,
  ) {
    if (!dto.dateOfBirth) {
      return dto;
    }

    return {
      ...dto,
      dateOfBirth: new Date(dto.dateOfBirth),
    };
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        patientProfile: true,
        addresses: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.patientProfile) {
      return { user, patientProfile: null };
    }

    return user.patientProfile;
  }

  async createOrUpdateProfile(
    userId: string,
    dto: CreatePatientProfileDto | UpdatePatientProfileDto,
  ) {
    const profileData = this.normalizeProfilePayload(dto);

    const existing = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      const updated = await this.prisma.patientProfile.update({
        where: { userId },
        data: profileData,
      });
      await this.supabaseSync.syncPatient(updated);
      return updated;
    }

    const created = await this.prisma.patientProfile.create({
      data: {
        ...(profileData as CreatePatientProfileDto),
        user: { connect: { id: userId } },
      },
    });
    await this.supabaseSync.syncPatient(created);
    return created;
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const created = await this.prisma.address.create({
      data: {
        ...dto,
        userId,
      },
    });

    // Keep only the 3 most recent addresses for this user.
    const keep = await this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true },
    });

    await this.prisma.address.deleteMany({
      where: {
        userId,
        id: { notIn: keep.map((a) => a.id) },
        bookings: { none: {} },
        pharmacyOrders: { none: {} },
      },
    });

    return created;
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) throw new NotFoundException('Address not found');

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) throw new NotFoundException('Address not found');

    return this.prisma.address.delete({
      where: { id: addressId },
    });
  }

  async getMyBookings(userId: string) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patientProfile) {
      return [];
    }

    return this.prisma.booking.findMany({
      where: { patientId: patientProfile.id },
      include: {
        provider: true,
        serviceCategory: true,
        address: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
