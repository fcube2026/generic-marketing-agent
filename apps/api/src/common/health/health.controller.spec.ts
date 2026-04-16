import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaHealth: PrismaHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({
              database: { status: 'up' },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaHealth = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
  });

  describe('readiness', () => {
    it('should return healthy status when database is up', async () => {
      const result = await controller.readiness();
      expect(result.status).toBe('ok');
      expect(result.details).toHaveProperty('database');
      expect(prismaHealth.isHealthy).toHaveBeenCalledWith('database');
    });
  });
});
