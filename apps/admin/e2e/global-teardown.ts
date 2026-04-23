import fs from 'fs/promises';
import { AUTH_STATE_PATH } from './helpers/auth.helper';

async function globalTeardown(): Promise<void> {
  await fs.rm(AUTH_STATE_PATH, { force: true });
}

export default globalTeardown;
