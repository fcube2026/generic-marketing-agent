import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createTestApp, cleanDatabase } from '../../../test/integration-setup';

describe('Auth Endpoints (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  describe('POST /api/v1/auth/send-otp', () => {
    it('should send OTP for a valid phone number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: '+1234567890' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('OTP sent successfully');
      // In non-production, OTP is returned in response
      expect(res.body.otp).toBeDefined();
      expect(res.body.otp).toHaveLength(6);

      // Verify OTP was persisted in DB
      const otpRecord = await prisma.otpVerification.findFirst({
        where: { phone: '+1234567890' },
      });
      expect(otpRecord).not.toBeNull();
      expect(otpRecord.verified).toBe(false);
    });

    it('should reject an invalid phone number', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: 'not-a-phone' })
        .expect(400);
    });

    it('should reject a missing phone number', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should verify OTP and return JWT token for a new user', async () => {
      // First, send OTP
      const sendRes = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: '+1234567890' })
        .expect(201);

      const otp = sendRes.body.otp;

      // Verify OTP
      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+1234567890', otp })
        .expect(201);

      expect(verifyRes.body.token).toBeDefined();
      expect(verifyRes.body.user).toBeDefined();
      expect(verifyRes.body.user.phone).toBe('+1234567890');
      expect(verifyRes.body.user.role).toBe('PATIENT');

      // Verify user was created in DB
      const user = await prisma.user.findUnique({
        where: { phone: '+1234567890' },
      });
      expect(user).not.toBeNull();
      expect(user.role).toBe('PATIENT');
    });

    it('should return token for an existing user', async () => {
      // Create user first
      await prisma.user.create({
        data: { phone: '+1234567890', role: 'PATIENT' },
      });

      // Send and verify OTP
      const sendRes = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: '+1234567890' })
        .expect(201);

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+1234567890', otp: sendRes.body.otp })
        .expect(201);

      expect(verifyRes.body.token).toBeDefined();
      expect(verifyRes.body.user.phone).toBe('+1234567890');

      // Should not create a duplicate user
      const users = await prisma.user.findMany({
        where: { phone: '+1234567890' },
      });
      expect(users).toHaveLength(1);
    });

    it('should reject an invalid OTP', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: '+1234567890' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+1234567890', otp: '000000' })
        .expect(401);
    });

    it('should allow specifying PROVIDER role on verify', async () => {
      const sendRes = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: '+9876543210' })
        .expect(201);

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+9876543210', otp: sendRes.body.otp, role: 'PROVIDER' })
        .expect(201);

      expect(verifyRes.body.user.role).toBe('PROVIDER');
    });
  });

  describe('POST /api/v1/auth/admin-login', () => {
    it('should login with valid admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/admin-login')
        .send({ email: 'admin@curex24.com', password: 'admin123' })
        .expect(201);

      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.user.email).toBe('admin@curex24.com');
    });

    it('should reject invalid admin credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/admin-login')
        .send({ email: 'wrong@email.com', password: 'wrong' })
        .expect(401);
    });

    it('should reject missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/admin-login')
        .send({})
        .expect(400);
    });

    it('should handle malformed JSON gracefully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/admin-login')
        .set('Content-Type', 'application/json')
        .send('{"email": invalid json}')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid JSON in request body');
      expect(res.body.error).toBe('Bad Request');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@curex24.com', password: 'admin123' })
        .expect(201);

      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
    });

    it('should handle malformed JSON without closing connection', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send(
          '{\\\"email\\\": \\\"admin@curex24.com\\\", \\\"password\\\": \\\"admin123\\\"}',
        )
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid JSON in request body');
    });
  });
});
