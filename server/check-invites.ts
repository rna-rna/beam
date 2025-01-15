
import { db } from '@db';
import { invites } from '@db/schema';

async function checkInvites() {
  try {
    const result = await db.select().from(invites);
    console.log('Invites found:', result);
    console.log('Total count:', result.length);
  } catch (error) {
    console.error('Error checking invites:', error);
  }
  process.exit(0);
}

checkInvites();
