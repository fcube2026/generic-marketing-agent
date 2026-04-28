import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'gaya', mode: 'insensitive' } },
  });
  const patients = await prisma.patientProfile.findMany({
    where: { name: { contains: 'gaya', mode: 'insensitive' } },
  });
  const providers = await prisma.providerProfile.findMany({
    where: { name: { contains: 'gaya', mode: 'insensitive' } },
  });

  console.log(
    `Found ${users.length} users, ${patients.length} patients, ${providers.length} providers with 'gaya' in email/name.`,
  );

  for (const provider of providers) {
    if (provider.contactInfo.includes('+')) {
      const newContactInfo = provider.contactInfo
        .replace('+91', '')
        .replace('+', '');
      await prisma.providerProfile.update({
        where: { id: provider.id },
        data: { contactInfo: newContactInfo },
      });
      console.log(
        `Updated contactInfo for provider ${provider.id}: ${provider.contactInfo} -> ${newContactInfo}`,
      );

      // We don't have easy access to syncService here without Nest,
      // but the separate sync script will handle it.
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
