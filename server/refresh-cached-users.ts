
import { db } from '@db';
import { cachedUsers } from '@db/schema';
import { sql, lt } from 'drizzle-orm';
import { clerkClient } from '@clerk/clerk-sdk-node';

export async function refreshCachedUsers() {
  try {
    // Find users that haven't been updated in over 24 hours
    const staleUsers = await db.query.cachedUsers.findMany({
      where: lt(
        cachedUsers.updatedAt, 
        sql`NOW() - INTERVAL '1 day'`
      )
    });

    console.log(`Found ${staleUsers.length} stale user records to refresh`);

    for (const user of staleUsers) {
      try {
        const clerkUser = await clerkClient.users.getUser(user.userId);
        await db.update(cachedUsers)
          .set({
            firstName: clerkUser.firstName ?? "",
            lastName: clerkUser.lastName ?? "",
            imageUrl: clerkUser.imageUrl ?? "",
            updatedAt: new Date()
          })
          .where(sql`user_id = ${user.userId}`);

        console.log(`Refreshed user data for: ${user.userId}`);
      } catch (err) {
        console.error(`Failed to refresh user: ${user.userId}`, err);
      }
    }
  } catch (error) {
    console.error('Failed to refresh cached users:', error);
  }
}

// Run refresh every hour
setInterval(refreshCachedUsers, 60 * 60 * 1000);
