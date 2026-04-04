import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async getAllCategories() {
    const categories = await this.prisma.serviceCategory.findMany({
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      await this.seedCategories();
      return this.prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
    }

    return categories;
  }

  private async seedCategories() {
    const categories = [
      { name: 'Doctor', slug: 'doctor', description: 'General physician consultation' },
      { name: 'Physiotherapy', slug: 'physiotherapy', description: 'Physical therapy and rehabilitation' },
      { name: 'Nursing', slug: 'nursing', description: 'Professional nursing care' },
      { name: 'Speech Therapy', slug: 'speech-therapy', description: 'Speech and language therapy' },
      { name: 'Occupational Therapy', slug: 'occupational-therapy', description: 'Occupational therapy services' },
      { name: 'Mental Health', slug: 'mental-health', description: 'Psychiatry and counseling' },
      { name: 'Dentistry', slug: 'dentistry', description: 'Dental care services' },
      { name: 'Ophthalmology', slug: 'ophthalmology', description: 'Eye care services' },
      { name: 'Dermatology', slug: 'dermatology', description: 'Skin care and treatment' },
      { name: 'Pediatrics', slug: 'pediatrics', description: 'Child healthcare' },
    ];

    await this.prisma.serviceCategory.createMany({
      data: categories,
      skipDuplicates: true,
    });
  }
}
