
import { db } from '@db';
import { galleries, invites } from '@db/schema';
import { and, eq } from 'drizzle-orm';

export async function getGalleryUserRole(galleryId: number, userId: string) {
  // 1. Check if user is the "owner" from the galleries table
  const gallery = await db.query.galleries.findFirst({
    where: eq(galleries.id, galleryId)
  });
  
  if (!gallery) return null;

  if (gallery.userId === userId) {
    return 'owner';
  }

  // 2. If not the owner, look up an invite record for the user
  const invite = await db.query.invites.findFirst({
    where: and(
      eq(invites.galleryId, galleryId),
      eq(invites.userId, userId)
    )
  });

  if (invite) {
    return invite.role;
  }

  // 3. If gallery is public, default to View
  if (gallery.isPublic) {
    return 'View';
  }

  // 4. No access
  return null;
}

export type GalleryRole = 'owner' | 'Edit' | 'Comment' | 'View' | null;
