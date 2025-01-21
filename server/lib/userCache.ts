
import { clerkClient } from "@clerk/clerk-sdk-node";
import { db } from "@db"; 
import { cachedUsers } from "@db/schema";
import { inArray } from "drizzle-orm";
import type { CachedUser } from "@db/schema";

// Track pending requests to prevent duplicate Clerk API calls
const pendingFetches: Map<string, Promise<CachedUser[]>> = new Map();

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

  // Generate cache key for this batch of userIds
  const cacheKey = userIds.sort().join(',');
  
  // Check for pending request for these exact userIds
  const pendingFetch = pendingFetches.get(cacheKey);
  if (pendingFetch) {
    return pendingFetch;
  }

  // Create new fetch promise
  const fetchPromise = (async () => {
    try {
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
        console.log("fetchCachedUserData -> missingOrStale:", missingOrStale);
        const response = await clerkClient.users.getUserList({
          userIds: missingOrStale,
        });
        console.log("clerkClient.users.getUserList response:", {
          type: typeof response,
          hasData: 'data' in response,
          isArray: Array.isArray(response),
          rawResponse: response
        });

        const fetchedUsers = 'data' in response ? response.data : response;

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
    } finally {
      // Remove from pending fetches after short delay
      setTimeout(() => {
        pendingFetches.delete(cacheKey);
      }, 1000);
    }
  })();

  // Store promise in pending fetches
  pendingFetches.set(cacheKey, fetchPromise);
  
  return fetchPromise;
}
