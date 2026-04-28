import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const id = 'cmo8on5nr000211ptf27s1sd3';
  const bookings = await prisma.booking.findMany({
    where: { OR: [ { patient: { userId: id } }, { provider: { userId: id } } ] },
  });
  const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: id } });
  const providerProfile = await prisma.providerProfile.findUnique({ where: { userId: id } });

  console.log('New User ID:', id);
  console.log('Bookings count:', bookings.length);
  console.log('Patient Profile:', patientProfile);
  console.log('Provider Profile:', providerProfile);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
