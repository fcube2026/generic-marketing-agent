import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import {
  UpdatePatientProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/update-patient-profile.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
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
    const existing = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.patientProfile.update({
        where: { userId },
        data: dto,
      });
    }

    return this.prisma.patientProfile.create({
      data: {
        ...(dto as CreatePatientProfileDto),
        user: { connect: { id: userId } },
      },
    });
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

    return this.prisma.address.create({
      data: {
        ...dto,
        userId,
      },
    });
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
