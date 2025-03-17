import { db } from './db';
import { galleries, folders } from './schema';
import { eq, and, inArray } from 'drizzle-orm';
import express from 'express';

// Create the protected router if it doesn't exist
const protectedRouter = express.Router();

// Add a new endpoint to handle moving multiple galleries to a folder by gallery slug
protectedRouter.post('/galleries/:slug/move', async (req, res) => {
  try {
    const { galleryIds } = req.body;
    const slug = req.params.slug;
    
    // Find the folder by slug
    const folder = await db.query.folders.findFirst({
      where: eq(folders.slug, slug),
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Ensure user owns the folder
    if (folder.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update all galleries to have the new folderId
    await db.update(galleries)
      .set({ folderId: folder.id })
      .where(
        and(
          inArray(galleries.id, galleryIds),
          eq(galleries.userId, req.user.id)
        )
      );
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error moving galleries:', error);
    return res.status(500).json({ error: 'Failed to move galleries' });
  }
});

// Add endpoint to get galleries for a specific folder
protectedRouter.get('/folders/:folderId/galleries', async (req, res) => {
  try {
    const folderId = parseInt(req.params.folderId);
    
    // Ensure folder exists and belongs to user
    const folder = await db.query.folders.findFirst({
      where: and(
        eq(folders.id, folderId),
        eq(folders.userId, req.user.id)
      ),
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Get galleries that belong to this folder
    const folderGalleries = await db.query.galleries.findMany({
      where: and(
        eq(galleries.folderId, folderId),
        eq(galleries.userId, req.user.id)
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
    
    return res.json(folderGalleries);
  } catch (error) {
    console.error('Error fetching folder galleries:', error);
    return res.status(500).json({ error: 'Failed to fetch folder galleries' });
  }
});

// Modify the GET /galleries endpoint to support filtering by folderId
protectedRouter.get('/galleries', async (req: any, res) => {
  try {
    const { folderId } = req.query;
    
    let whereClause = eq(galleries.userId, req.user.id);
    
    // If folderId is provided, filter galleries by that folder
    if (folderId) {
      whereClause = and(
        whereClause,
        eq(galleries.folderId, parseInt(folderId))
      );
    }
    
    const userGalleries = await db.query.galleries.findMany({
      where: whereClause,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
    
    res.json(userGalleries);
  } catch (error) {
    console.error('Error fetching galleries:', error);
    res.status(500).json({ error: 'Failed to fetch galleries' });
  }
}); 