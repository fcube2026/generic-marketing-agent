import { Test, TestingModule } from '@nestjs/testing';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

describe('ServicesController', () => {
  let controller: ServicesController;
  let service: ServicesService;

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
      controllers: [ServicesController],
      providers: [
        {
          provide: ServicesService,
          useValue: {
            getAllCategories: jest.fn().mockResolvedValue(mockCategories),
          },
        },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
    service = module.get<ServicesService>(ServicesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllCategories', () => {
    it('should return an array of service categories', async () => {
      const result = await controller.getAllCategories();

      expect(result).toEqual(mockCategories);
      expect(service.getAllCategories).toHaveBeenCalled();
    });

    it('should return an empty array when no categories exist', async () => {
      (service.getAllCategories as jest.Mock).mockResolvedValueOnce([]);

      const result = await controller.getAllCategories();

      expect(result).toEqual([]);
      expect(service.getAllCategories).toHaveBeenCalled();
    });
  });
});
