import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createTestApp, cleanDatabase } from '../../../test/integration-setup';

describe('Patients Endpoints (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let patientToken: string;

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

    // Authenticate as a patient to get a valid JWT
    const sendRes = await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+1111111111' });

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+1111111111', otp: sendRes.body.otp });

    patientToken = verifyRes.body.token;
  });

  describe('POST /api/v1/patients/me/profile', () => {
    it('should create a patient profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/patients/me/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          name: 'Test Patient',
          dateOfBirth: '1990-01-15T00:00:00.000Z',
          gender: 'MALE',
        })
        .expect(201);

      expect(res.body.name).toBe('Test Patient');
      expect(res.body.gender).toBe('MALE');
      expect(res.body.userId).toBeDefined();

      // Verify in DB
      const profile = await prisma.patientProfile.findFirst({
        where: { name: 'Test Patient' },
      });
      expect(profile).not.toBeNull();
    });

    it('should update profile if it already exists', async () => {
      // Create profile first
      await request(app.getHttpServer())
        .post('/api/v1/patients/me/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          name: 'Original Name',
          dateOfBirth: '1990-01-15T00:00:00.000Z',
          gender: 'MALE',
        })
        .expect(201);

      // Update via PUT /me endpoint
      const res = await request(app.getHttpServer())
        .put('/api/v1/patients/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
    });
  });

  describe('GET /api/v1/patients/me', () => {
    it('should return profile for authenticated patient', async () => {
      // Create profile
      await request(app.getHttpServer())
        .post('/api/v1/patients/me/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          name: 'Test Patient',
          dateOfBirth: '1990-01-15T00:00:00.000Z',
          gender: 'MALE',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(res.body.name).toBe('Test Patient');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/v1/patients/me').expect(401);
    });
  });

  describe('POST /api/v1/patients/me/addresses', () => {
    it('should add an address for authenticated patient', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/patients/me/addresses')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          label: 'Home',
          addressLine: '123 Test St',
          city: 'Test City',
          state: 'TS',
          pincode: '12345',
          lat: 40.7128,
          lng: -74.006,
          isDefault: true,
        })
        .expect(201);

      expect(res.body.label).toBe('Home');
      expect(res.body.addressLine).toBe('123 Test St');
      expect(res.body.isDefault).toBe(true);
    });
  });
});
