import { db } from '@db';
import { cachedUsers } from '@db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { clerkClient } from '@clerk/clerk-sdk-node';

export interface UserAvatarData {
  userId: string;
  fullName: string;
  imageUrl?: string | null;
  color?: string | null;
}

interface CachedUser {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  color: string | null;
  updatedAt: Date;
}

export async function fetchCachedUserData(userIds: string[]): Promise<CachedUser[]> {
  if (!userIds.length) return [];

  // Get existing cached users
  const existingUsers = await db.query.cachedUsers.findMany({
    where: inArray(cachedUsers.userId, userIds)
  });

  const existingUserIds = new Set(existingUsers.map(u => u.userId));
  const missingUserIds = userIds.filter(id => !existingUserIds.has(id));

  // Fetch missing users from Clerk
  if (missingUserIds.length > 0) {
    try {
      const clerkResponse = await clerkClient.users.getUserList({
        userId: missingUserIds
      });
      
      const users = Array.isArray(clerkResponse) ? clerkResponse : clerkResponse.data || [];
      
      if (!users.length) {
        console.warn('No users found from Clerk for IDs:', missingUserIds);
        return existingUsers;
      }

      // Insert new users with upsert
      for (const user of users) {
        const clerkColor = user.publicMetadata?.color as string;
        const color = clerkColor || `#${Math.floor(Math.random()*16777215).toString(16)}`;

        await db
          .insert(cachedUsers)
          .values({
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            color: color,
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: cachedUsers.userId,
            set: {
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl,
              color: color,
              updatedAt: new Date()
            }
          });
      }

      // Fetch all users again to get the complete set
      return await db.query.cachedUsers.findMany({
        where: inArray(cachedUsers.userId, userIds)
      });
    } catch (error) {
      console.error('Failed to fetch users from Clerk:', error);
      return existingUsers;
    }
  }

  return existingUsers;
}


export async function fetchUserAvatarData(userIds: string[]): Promise<UserAvatarData[]> {
  const cached = await fetchCachedUserData(userIds);
  return cached.map(u => ({
    userId: u.userId,
    fullName: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Unknown User",
    imageUrl: u.imageUrl,
    color: u.color
  }));
}
