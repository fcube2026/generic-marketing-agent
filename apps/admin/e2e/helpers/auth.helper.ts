import path from 'path';

export const AUTH_STATE_PATH = path.resolve(process.cwd(), '.auth/admin.json');

export interface AdminTestCredentials {
  email: string;
  password: string;
}

export function getAdminTestCredentials(): AdminTestCredentials {
  return {
    email: process.env.ADMIN_TEST_EMAIL || 'admin@curex24.com',
    password: process.env.ADMIN_TEST_PASSWORD || 'Admin@12345',
  };
}

export function createMockJwt(subject = 'admin-user'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: subject,
      role: 'ADMIN',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }),
  ).toString('base64url');
  const signature = Buffer.from('playwright-signature').toString('base64url');
  return `${header}.${payload}.${signature}`;
}

export function mockAdminLoginPayload(email: string) {
  return {
    token: createMockJwt(email),
    user: {
      email,
      role: 'ADMIN',
    },
  };
}
