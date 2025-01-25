
import { db } from '@db';
import { notifications } from '@db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { pusher } from '../pusherConfig';
import { nanoid } from 'nanoid';

const GROUPING_WINDOW_MINUTES = 5;

interface CreateOrUpdateNotificationOptions {
  recipientId: string;   
  actorId: string;      
  galleryId: number;    
  type: string;         
  data?: any;           
}

export async function createOrUpdateNotification({
  recipientId,
  actorId,
  galleryId,
  type,
  data = {},
}: CreateOrUpdateNotificationOptions) {

  const fiveMinAgo = sql`NOW() - INTERVAL '${GROUPING_WINDOW_MINUTES} minutes'`;
  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.userId, recipientId),
      eq(notifications.type, type),
      eq(notifications.actorId, actorId),
      eq(notifications.galleryId, galleryId),
      gte(notifications.createdAt, fiveMinAgo)
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  if (existing) {
    const newCount = (existing.count || 1) + 1;
    await db.update(notifications)
      .set({
        count: newCount,
        createdAt: new Date(),
        needsEmail: true,
        data: data,
      })
      .where(eq(notifications.id, existing.id));

    pusher.trigger(`presence-gallery-${galleryId}`, type, {
      notificationId: existing.id,
      updatedCount: newCount,
      actorId,
      data,
    });
  } else {
    const groupId = nanoid();
    const [newNotification] = await db.insert(notifications).values({
      userId: recipientId,
      actorId,
      galleryId,
      type,
      data,
      groupId,
      count: 1,
      isSeen: false,
      createdAt: new Date(),
      needsEmail: true,
    }).returning();

    pusher.trigger(`presence-gallery-${galleryId}`, type, {
      notificationId: newNotification.id,
      updatedCount: 1,
      actorId,
      data,
    });
  }
}
