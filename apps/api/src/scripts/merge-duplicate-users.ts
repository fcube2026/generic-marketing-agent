import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users.`);

  let mergedCount = 0;

  for (const user of users) {
    // If this user has an un-normalized phone
    const normalized = normalizePhone(user.phone);
    if (normalized !== user.phone) {
      // Check if a user with the normalized phone already exists
      const target = await prisma.user.findUnique({
        where: { phone: normalized },
        include: {
          patientProfile: true,
          providerProfile: true,
        },
      });

      if (target) {
        console.log(`Conflict found for ${user.phone} -> ${normalized}`);
        
        // Check if target has any data
        const bookingsCount = await prisma.booking.count({
          where: { OR: [ { patient: { userId: target.id } }, { provider: { userId: target.id } } ] },
        });

        if (bookingsCount === 0 && !target.patientProfile && !target.providerProfile) {
          console.log(`Target ${target.id} has no data. Merging ${user.id} into it...`);
          
          try {
            // Delete target (the empty shell)
            await prisma.user.delete({ where: { id: target.id } });
            
            // Update source (the one with profile) to the normalized phone
            await prisma.user.update({
              where: { id: user.id },
              data: { phone: normalized },
            });
            
            console.log(`Successfully merged ${user.phone} -> ${normalized}`);
            mergedCount++;
          } catch (err) {
            console.error(`Failed to merge ${user.id}: ${err.message}`);
          }
        } else {
          console.warn(`Cannot merge ${user.id} -> ${target.id}: Target has data.`);
        }
      }
    }
  }

  console.log(`Finished. Merged ${mergedCount} users.`);
}

function normalizePhone(phone: string): string {
    if (!phone) return phone;
    if (phone.startsWith('+')) {
      const digitsAfterPlus = phone.substring(1).replace(/\D/g, '');
      if (digitsAfterPlus.length === 10) return '+91' + digitsAfterPlus;
    }
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return '+91' + cleaned;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return '+' + cleaned;
    return phone.startsWith('+') ? '+' + cleaned : cleaned;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
