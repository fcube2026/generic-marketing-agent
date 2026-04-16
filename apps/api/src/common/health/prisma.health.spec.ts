import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaService } from '../prisma/prisma.service';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return up status when database is reachable', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const result = await indicator.isHealthy('database');
    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('should throw HealthCheckError when database is unreachable', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(indicator.isHealthy('database')).rejects.toThrow(
      HealthCheckError,
    );
  });
});
