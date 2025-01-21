
import { clerkClient } from "@clerk/clerk-sdk-node";
import { db } from "@db"; 
import { cachedUsers } from "@db/schema";
import { inArray } from "drizzle-orm";
import type { CachedUser } from "@db/schema";

// Generate a consistent color for a user based on their ID
function generateColorForUser(userId: string): string {
  const colors = [
    '#F24822', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0',
    '#FF5722', '#795548', '#607D8B', '#E91E63', '#9E9E9E'
  ];
  
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

export async function fetchCachedUserData(userIds: string[]): Promise<CachedUser[]> {
  if (!userIds.length) return [];

  // 1. Fetch local rows
  const rows = await db.query.cachedUsers.findMany({
    where: inArray(cachedUsers.userId, userIds),
  });

  // 2. Determine stale or missing
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;
  const missingOrStale: string[] = [];
  const localMap: Record<string, CachedUser> = {};

  const foundIds = new Set<string>();

  for (const row of rows) {
    localMap[row.userId] = row;
    foundIds.add(row.userId);

    const age = now - row.updatedAt.getTime();
    if (age > fifteenMinutes) {
      missingOrStale.push(row.userId);
    }
  }

  userIds.forEach(id => {
    if (!foundIds.has(id)) missingOrStale.push(id);
  });

  // 3. If missing or stale, batch fetch from Clerk
  if (missingOrStale.length > 0) {
    const fetchedUsers = await clerkClient.users.getUserList({
      userIds: missingOrStale,
    });

    // 4. Upsert into DB
    await Promise.all(fetchedUsers.map(async (user) => {
      const color = generateColorForUser(user.id);
      const upsertData = {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        color,
        updatedAt: new Date(),
      };

      // Delete existing record if any
      await db.delete(cachedUsers)
        .where(inArray(cachedUsers.userId, [user.id]));
      
      // Insert new record
      await db.insert(cachedUsers)
        .values(upsertData);

      // Update local map
      localMap[user.id] = upsertData;
    }));
  }

  // Return data in same order as input userIds
  return userIds.map(id => localMap[id]).filter(Boolean);
}
