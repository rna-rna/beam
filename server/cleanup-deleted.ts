
import { db } from '@db';
import { galleries, images } from '@db/schema';
import { sql, and, lt, isNotNull } from 'drizzle-orm';

export async function cleanupDeletedGalleries() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const deletedGalleries = await db.query.galleries.findMany({
      where: and(
        isNotNull(galleries.deleted_at),
        lt(galleries.deleted_at, thirtyDaysAgo)
      ),
    });

    for (const gallery of deletedGalleries) {
      await db.transaction(async (tx) => {
        await tx.delete(images)
          .where(eq(images.galleryId, gallery.id));

        await tx.delete(galleries)
          .where(eq(galleries.id, gallery.id));
      });
    }
  } catch (error) {
    console.error('Failed to cleanup deleted galleries:', error);
  }
}

// Run cleanup every day
setInterval(cleanupDeletedGalleries, 24 * 60 * 60 * 1000);
