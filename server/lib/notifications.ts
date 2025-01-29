import { db } from "@db";
import { notifications, galleries } from "@db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { pusher } from "../pusherConfig";

export async function addNotification({
  recipientUserId,
  type,
  data,
  actorId,
  groupId
}: {
  recipientUserId: string;
  type: string;
  data: any;
  actorId: string;
  groupId: string;
}) {
  // Check for existing notification within 10 minutes
  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.userId, recipientUserId),
      eq(notifications.type, type),
      eq(notifications.groupId, groupId),
      eq(notifications.isSeen, false),
      gt(notifications.createdAt, sql`NOW() - INTERVAL '10 minutes'`)
    ),
  });

  if (existing) {
    const updatedData = {
      ...existing.data,   // keep old keys
      ...data,            // bring in new fields
      gallerySlug: data.gallerySlug, // explicitly preserve gallerySlug
      count: ((existing.data as any).count || 1) + 1,
      lastUpdated: new Date().toISOString()
    };

    const [updated] = await db
      .update(notifications)
      .set({ 
        data: updatedData,
        createdAt: new Date() 
      })
      .where(eq(notifications.id, existing.id))
      .returning();

    pusher.trigger(`private-user-${recipientUserId}`, "notification", updated);
    return updated;
  }

  const [inserted] = await db.insert(notifications).values({
    userId: recipientUserId,
    type,
    data: {
      ...data,
      count: 1,
      actorId,
      createdAt: new Date().toISOString()
    },
    groupId,
    isSeen: false,
    createdAt: new Date()
  }).returning();

  pusher.trigger(`private-user-${recipientUserId}`, "notification", inserted);
  return inserted;
}

export async function addStarNotification({
  recipientUserId,
  actorId,
  actorName,
  actorAvatar,
  actorColor,
  galleryId,
  imageId,
  count = 1
}: {
  recipientUserId: string;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorColor?: string;
  galleryId: number;
  imageId?: number;
  count?: number;
}) {
  const gallery = await db.query.galleries.findFirst({
    where: eq(galleries.id, galleryId),
    columns: { title: true, slug: true }
  });

  if (!gallery) {
    console.error("Gallery not found:", galleryId);
    return;
  }

  const groupId = `star-${actorId}-${galleryId}`;

  return addNotification({
    recipientUserId,
    type: 'star',
    data: {
      actorName: actorName || 'Someone',  
      actorAvatar: actorAvatar || null,
      actorColor: actorColor || '#ccc',
      galleryId,
      galleryTitle: gallery?.title || 'Untitled Gallery',
      gallerySlug: gallery?.slug,
      count,
      imageId: imageId || null
    },
    actorId,
    groupId
  });
}

export async function addCommentNotification({
  recipientUserId,
  actorId,
  actorName,
  actorAvatar,
  actorColor,
  galleryId,
  imageId,
  comment,
  snippet,
}: {
  recipientUserId: string;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorColor?: string;
  galleryId: number;
  imageId?: number;
  comment?: {id:number};
  snippet?: string;
}) {
  const gallery = await db.query.galleries.findFirst({
    where: eq(galleries.id, galleryId),
    columns: { title: true, slug: true }
  });

  if (!gallery) {
    console.error("Gallery not found:", galleryId);
    return;
  }

  return addNotification({
    recipientUserId,
    type: 'comment',
    data: {
      actorName: actorName || 'Someone',
      actorAvatar: actorAvatar || null,
      actorColor: actorColor || '#ccc',
      galleryId,
      galleryTitle: gallery?.title || "Untitled Gallery",
      gallerySlug: gallery?.slug,
      imageId,
      commentId: comment?.id,
      snippet: snippet || ''
    },
    actorId,
    groupId: `comment-${actorId}-${galleryId}`
  });
}

export async function addInviteNotification({
  recipientUserId,
  actorId,
  actorName,
  actorAvatar,
  actorColor,
  galleryId,
  role,
}: {
  recipientUserId: string;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorColor?: string;
  galleryId: number;
  role: string;
}) {
  const gallery = await db.query.galleries.findFirst({
    where: eq(galleries.id, galleryId),
    columns: { title: true, slug: true }
  });

  if (!gallery) {
    console.error("Gallery not found:", galleryId);
    return;
  }

  return addNotification({
    recipientUserId,
    type: 'gallery-invite',
    data: {
      actorName: actorName || 'Someone',
      actorAvatar: actorAvatar || null,
      actorColor: actorColor || '#ccc',
      galleryId,
      galleryTitle: gallery?.title || 'Untitled Gallery',
      gallerySlug: gallery?.slug,
      role: role || 'View'
    },
    actorId,
    groupId: `invite-${actorId}-${galleryId}`
  });
}

export async function addReplyNotification({
  recipientUserId,
  actorId,
  actorName,
  actorAvatar,
  actorColor,
  galleryId,
  imageId,
  commentId,
  parentCommentId,
  snippet,
}: {
  recipientUserId: string;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorColor?: string;
  galleryId: number;
  imageId: number;
  commentId: number;
  parentCommentId: number;
  snippet?: string;
}) {
  const gallery = await db.query.galleries.findFirst({
    where: eq(galleries.id, galleryId),
    columns: { title: true, slug: true }
  });

  if (!gallery) {
    console.error("Gallery not found:", galleryId);
    return;
  }

  return addNotification({
    recipientUserId,
    type: 'comment-reply',
    data: {
      actorName: actorName || 'Someone',
      actorAvatar: actorAvatar || null,
      actorColor: actorColor || '#ccc',
      galleryId,
      galleryTitle: gallery?.title || 'Untitled Gallery',
      gallerySlug: gallery?.slug,
      imageId,
      commentId,
      parentCommentId,
      snippet: snippet || ''
    },
    actorId,
    groupId: `reply-${actorId}-${parentCommentId}`
  });
}