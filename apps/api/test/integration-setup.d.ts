import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
export declare function createTestApp(): Promise<INestApplication>;
export declare function cleanDatabase(prisma: PrismaService): Promise<void>;
