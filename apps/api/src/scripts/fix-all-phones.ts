import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users.`);

  let updatedCount = 0;

  for (const user of users) {
    let phone = user.phone;
    let newPhone = phone;

    // Remove all letters and special chars, keep digits and leading +
    const hasPlus = phone.startsWith('+');
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 10) {
      // Rule: 10 digits -> +91 prefix
      newPhone = '+91' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      // Rule: 12 digits starting with 91 -> +91
      newPhone = '+' + cleaned;
    } else if (hasPlus && cleaned.length > 10) {
       // If it had a + but is not 91 prefix (e.g. +1111111111)
       // The user said "add +91 instead of +"
       // If it was + followed by 10 digits, we want +91 + those 10 digits.
       // Let's take the last 10 digits if it's > 10 and had a +.
       const last10 = cleaned.slice(-10);
       newPhone = '+91' + last10;
    } else if (cleaned.length > 10) {
       // No + but > 10 digits, maybe it starts with 0?
       const last10 = cleaned.slice(-10);
       newPhone = '+91' + last10;
    }

    if (newPhone !== user.phone) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: newPhone },
        });
        console.log(`Updated user ${user.id}: ${user.phone} -> ${newPhone}`);
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update user ${user.id} (${user.phone}): ${err.message}`);
      }
    }
  }

  console.log(`Finished. Updated ${updatedCount} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
