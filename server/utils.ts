import { customAlphabet } from 'nanoid';
import { db } from '@db';
import { galleries, invites } from '@db/schema';
import { eq } from 'drizzle-orm';

// Create a URL-safe alphabet for our slugs (excluding similar-looking characters)
const alphabet = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
const generateSlug = customAlphabet(alphabet, 10);

async function getEditorUserIds(galleryId: string): Promise<string[]> {
    const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.id, galleryId),
    });

    if (!gallery) {
        throw new Error("Gallery not found");
    }

    const editors = await db.query.invites.findMany({
        where: eq(invites.galleryId, galleryId),
        select: { userId: true },
    });

    const ownerUserId = gallery.userId;
    return [
        ...new Set(editors.map((invite) => invite.userId).concat(ownerUserId)),
    ];
}

export { generateSlug, getEditorUserIds };