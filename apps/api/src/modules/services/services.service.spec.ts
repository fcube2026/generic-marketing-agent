import { Test, TestingModule } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: PrismaService;

  const mockCategories = [
    {
      id: '1',
      name: 'Dentistry',
      slug: 'dentistry',
      description: 'Dental care services',
      iconUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Doctor',
      slug: 'doctor',
      description: 'General physician consultation',
      iconUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: PrismaService,
          useValue: {
            serviceCategory: {
              findMany: jest.fn(),
              createMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllCategories', () => {
    it('should return categories when they exist', async () => {
      (prisma.serviceCategory.findMany as jest.Mock).mockResolvedValue(
        mockCategories,
      );

      const result = await service.getAllCategories();

      expect(result).toEqual(mockCategories);
      expect(prisma.serviceCategory.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('should seed and return categories when none exist', async () => {
      (prisma.serviceCategory.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockCategories);
      (prisma.serviceCategory.createMany as jest.Mock).mockResolvedValue({
        count: 10,
      });

      const result = await service.getAllCategories();

      expect(result).toEqual(mockCategories);
      expect(prisma.serviceCategory.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Doctor', slug: 'doctor' }),
        ]),
        skipDuplicates: true,
      });
      expect(prisma.serviceCategory.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
