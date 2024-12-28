import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { galleries, images, comments } from '@db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { setupClerkAuth, extractUserInfo } from './auth';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { nanoid } from 'nanoid';

// Add Clerk types to Express Request
declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string;
        user?: {
          id: string;
          firstName?: string;
          lastName?: string;
          username?: string;
          emailAddresses?: Array<{ emailAddress: string; verified: boolean }>;
          imageUrl?: string;
          profileImageUrl?: string;
        };
      };
    }
  }
}

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export function registerRoutes(app: Express): Server {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Get Clerk auth middleware
  const protectRoute = setupClerkAuth(app);

  // Protected routes with full user data
  const protectedRouter = express.Router();

  // Apply auth middleware to all protected routes
  protectedRouter.use(protectRoute);

  // Get galleries for current user (main endpoint)
  protectedRouter.get('/galleries', async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      // Get galleries with first image and total image count
      const userGalleries = await db.query.galleries.findMany({
        where: eq(galleries.userId, userId),
        orderBy: (galleries, { desc }) => [desc(galleries.createdAt)],
        with: {
          images: {
            orderBy: (images, { asc }) => [asc(images.position), asc(images.createdAt)],
            limit: 1 // Get only the first image for thumbnail
          }
        }
      });

      // Get image counts for each gallery
      const galleryCounts = await Promise.all(
        userGalleries.map(async (gallery) => {
          const result = await db.execute(
            sql`SELECT COUNT(*) as count FROM images WHERE gallery_id = ${gallery.id}`
          );
          return {
            galleryId: gallery.id,
            count: parseInt(result.rows[0].count.toString(), 10)
          };
        })
      );

      // Transform the response to include thumbnailUrl and correct image count
      const galleriesWithThumbnails = userGalleries.map(gallery => ({
        ...gallery,
        thumbnailUrl: gallery.images[0]?.url || null,
        imageCount: galleryCounts.find(count => count.galleryId === gallery.id)?.count || 0
      }));

      res.json(galleriesWithThumbnails);
    } catch (error) {
      console.error('Failed to fetch galleries:', error);
      res.status(500).json({ message: 'Failed to fetch galleries' });
    }
  });

  // Create empty gallery
  protectedRouter.post('/galleries/create', async (req: any, res) => {
    try {
      const { title = "Untitled Project" } = req.body;
      const userId = req.auth.userId;

      if (!userId) {
        console.error('Gallery creation failed: No user ID in auth token');
        return res.status(401).json({ message: 'Unauthorized: No user ID found' });
      }

      console.log('Creating gallery for user:', userId, 'with title:', title);

      // Create gallery with user association
      const [gallery] = await db.insert(galleries).values({
        slug: generateSlug(),
        title,
        userId,
        createdAt: new Date()
      }).returning();

      console.log('Created gallery:', gallery);
      res.json(gallery);
    } catch (error) {
      console.error('Failed to create gallery:', error);
      res.status(500).json({
        message: 'Failed to create gallery',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create new gallery with images
  protectedRouter.post('/galleries', upload.array('images', 50), async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: 'No images uploaded' });
      }

      const [gallery] = await db.insert(galleries).values({
        slug: generateSlug(),
        userId
      }).returning();

      try {
        const imageInserts = [];
        for (const file of req.files) {
          const [image] = await db.insert(images).values({
            galleryId: gallery.id,
            url: `/uploads/${file.filename}`,
            publicId: file.filename,
            width: 800, // placeholder
            height: 600 // placeholder
          }).returning();
          imageInserts.push(image);
        }

        res.json({ galleryId: gallery.slug });
      } catch (err) {
        await db.delete(galleries).where(eq(galleries.id, gallery.id));
        throw err;
      }
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Failed to upload images' });
    }
  });


  // Get gallery details (with ownership check)
  protectedRouter.get('/galleries/:slug', async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      const gallery = await db.query.galleries.findFirst({
        where: and(
          eq(galleries.slug, req.params.slug),
          eq(galleries.userId, userId)
        ),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      const galleryImages = await db.query.images.findMany({
        where: eq(images.galleryId, gallery.id),
        orderBy: (images, { asc }) => [asc(images.position), asc(images.createdAt)]
      });

      // Get comment counts without requiring author field
      const commentCounts = await Promise.all(
        galleryImages.map(async (img) => {
          const result = await db.execute(
            sql`SELECT COUNT(*) as count FROM comments WHERE image_id = ${img.id}`
          );
          return {
            imageId: img.id,
            count: parseInt(result.rows[0]?.count || '0', 10)
          };
        })
      );

      const processedImages = galleryImages.map(img => ({
        ...img,
        aspectRatio: img.width / img.height,
        commentCount: commentCounts.find(c => c.imageId === img.id)?.count || 0
      }));

      res.json({
        ...gallery,
        images: processedImages
      });
    } catch (error) {
      console.error('Gallery fetch error:', error);
      res.status(500).json({
        message: 'Failed to fetch gallery',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add images to existing gallery (protected)
  protectedRouter.post('/galleries/:slug/images', upload.array('images', 50), async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      // Check gallery ownership
      const gallery = await db.query.galleries.findFirst({
        where: and(
          eq(galleries.slug, req.params.slug),
          eq(galleries.userId, userId)
        ),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: 'No images uploaded' });
      }

      const imageInserts = [];
      for (const file of req.files) {
        const [image] = await db.insert(images).values({
          galleryId: gallery.id,
          url: `/uploads/${file.filename}`,
          publicId: file.filename,
          originalFilename: file.originalname,
          width: 800, // placeholder
          height: 600 // placeholder
        }).returning();
        imageInserts.push(image);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        message: 'Failed to upload images',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update gallery title (protected)
  protectedRouter.patch('/galleries/:slug/title', async (req: any, res) => {
    try {
      const { title } = req.body;
      const userId = req.auth.userId;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: 'Invalid title' });
      }

      // Find the gallery by slug and verify ownership
      const gallery = await db.query.galleries.findFirst({
        where: and(
          eq(galleries.slug, req.params.slug),
          eq(galleries.userId, userId)
        ),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      const [updated] = await db
        .update(galleries)
        .set({ title: title.trim() })
        .where(eq(galleries.id, gallery.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating gallery title:', error);
      res.status(500).json({ message: 'Failed to update gallery title' });
    }
  });

  // Reorder images (protected)
  protectedRouter.post('/galleries/:slug/reorder', async (req: any, res) => {
    try {
      const { order } = req.body;
      const userId = req.auth.userId;

      if (!Array.isArray(order)) {
        return res.status(400).json({ message: 'Invalid order format' });
      }

      const gallery = await db.query.galleries.findFirst({
        where: and(
          eq(galleries.slug, req.params.slug),
          eq(galleries.userId, userId)
        ),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Validate all images belong to this gallery
      const galleryImages = await db.query.images.findMany({
        where: eq(images.galleryId, gallery.id),
      });

      const validImageIds = new Set(galleryImages.map(img => img.id));
      if (!order.every(id => validImageIds.has(id))) {
        return res.status(400).json({ message: 'Invalid image IDs in order' });
      }

      // Update order for each image in a transaction
      await db.transaction(async (tx) => {
        for (let i = 0; i < order.length; i++) {
          await tx
            .update(images)
            .set({ position: i })
            .where(and(
              eq(images.id, order[i]),
              eq(images.galleryId, gallery.id)
            ));
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Reorder error:', error);
      res.status(500).json({
        message: 'Failed to reorder images',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete images (protected)
  protectedRouter.post('/galleries/:slug/images/delete', async (req: any, res) => {
    try {
      const { imageIds } = req.body;
      const userId = req.auth.userId;

      if (!Array.isArray(imageIds)) {
        return res.status(400).json({ message: 'Invalid request: imageIds must be an array' });
      }

      // Find the gallery and verify ownership
      const gallery = await db.query.galleries.findFirst({
        where: and(
          eq(galleries.slug, req.params.slug),
          eq(galleries.userId, userId)
        ),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Validate image ownership
      const galleryImages = await db.query.images.findMany({
        where: eq(images.galleryId, gallery.id),
      });

      const validImageIds = new Set(galleryImages.map(img => img.id));
      const invalidIds = imageIds.filter(id => !validImageIds.has(id));

      if (invalidIds.length > 0) {
        return res.status(400).json({
          message: 'Some images do not belong to this gallery',
          invalidIds
        });
      }

      // Delete the images
      await db.delete(images)
        .where(
          and(
            inArray(images.id, imageIds),
            eq(images.galleryId, gallery.id)
          )
        );

      res.json({ success: true, deletedIds: imageIds });
    } catch (error) {
      console.error('Error deleting images:', error);
      res.status(500).json({
        message: 'Failed to delete images',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete gallery (protected)
  protectedRouter.delete('/galleries/:slug', async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      // Find the gallery and verify ownership
      const gallery = await db.query.galleries.findFirst({
        where: and(
          eq(galleries.slug, req.params.slug),
          eq(galleries.userId, userId)
        ),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Delete the gallery and its associated images
      await db.transaction(async (tx) => {
        // Delete all images in the gallery first
        await tx.delete(images)
          .where(eq(images.galleryId, gallery.id));

        // Then delete the gallery itself
        await tx.delete(galleries)
          .where(eq(galleries.id, gallery.id));
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting gallery:', error);
      res.status(500).json({
        message: 'Failed to delete gallery',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get gallery details (public view)
  app.get('/api/galleries/:slug', async (req, res) => {
    try {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      const galleryImages = await db.query.images.findMany({
        where: eq(images.galleryId, gallery.id),
        orderBy: (images, { asc }) => [
          asc(images.position),
          asc(images.createdAt)
        ]
      });

      const commentCounts = await Promise.all(
        galleryImages.map(async (img) => {
          const result = await db.execute(
            sql`SELECT COUNT(*) as count FROM comments WHERE image_id = ${img.id}`
          );
          return { imageId: img.id, count: parseInt(result.rows[0]?.count || '0', 10) };
        })
      );

      const processedImages = galleryImages.map(img => ({
        id: img.id,
        url: img.url,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        starred: img.starred,
        originalFilename: img.originalFilename,
        commentCount: commentCounts.find(c => c.imageId === img.id)?.count || 0
      }));

      // Include userId in the response for ownership checks
      res.json({
        id: gallery.id,
        slug: gallery.slug,
        title: gallery.title,
        userId: gallery.userId,
        images: processedImages
      });
    } catch (error) {
      console.error('Gallery fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch gallery' });
    }
  });


  // Comment submission endpoint
  protectedRouter.post('/images/:imageId/comments', async (req: Request, res) => {
    try {
      const { content, xPosition, yPosition } = req.body;
      const imageId = parseInt(req.params.imageId);

      // Validate required fields
      if (!content || typeof xPosition !== 'number' || typeof yPosition !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Invalid request: content, xPosition, and yPosition are required'
        });
      }

      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        // Extract user information using helper
        const { userId, userName, userImageUrl } = await extractUserInfo(req);
        console.log('Debug - Comment creation:', {
          userId,
          imageId,
          hasContent: !!content
        });

        // Create the comment
        const [comment] = await db.insert(comments)
          .values({
            imageId,
            content,
            xPosition,
            yPosition,
            userId,
            userName,
            userImageUrl,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        // Update comment count
        await db
          .update(images)
          .set({
            commentCount: sql`COALESCE(${images.commentCount}, 0) + 1`
          })
          .where(eq(images.id, imageId));

        console.log('Debug - Comment created successfully:', {
          commentId: comment.id,
          userId,
          imageId
        });

        res.status(201).json({
          success: true,
          data: comment
        });
      } catch (error: any) {
        console.error('Error processing user data:', error);
        return res.status(401).json({
          success: false,
          message: 'Authentication failed',
          details: error.message || 'Failed to process user data'
        });
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create comment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get comments for an image
  app.get('/api/images/:imageId/comments', async (req, res) => {
    try {
      const imageComments = await db.query.comments.findMany({
        where: eq(comments.imageId, parseInt(req.params.imageId)),
        orderBy: (comments, { asc }) => [asc(comments.createdAt)]
      });

      res.json(imageComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch comments',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get current gallery (most recently created/accessed)
  protectedRouter.get('/galleries/current', async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      // Find the most recent gallery for this user
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.userId, userId),
        orderBy: (galleries, { desc }) => [desc(galleries.createdAt)],
      });

      if (!gallery) {
        // Create a new gallery for the user if none exists
        const [newGallery] = await db.insert(galleries).values({
          slug: generateSlug(),
          title: "Untitled Project",
          userId
        }).returning();

        return res.json(newGallery);
      }

      res.json(gallery);
    } catch (error) {
      console.error('Error fetching/creating current gallery:', error);
      res.status(500).json({ message: 'Failed to initialize gallery' });
    }
  });

  // Delete multiple images from a gallery
  app.post('/api/galleries/:slug/images/delete', async (req: any, res) => {
    try {
      console.log('Attempting to delete images:', req.body.imageIds);

      const { imageIds } = req.body;
      if (!Array.isArray(imageIds)) {
        return res.status(400).json({ message: 'Invalid request: imageIds must be an array' });
      }

      // Find the gallery first
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Ensure all images belong to this gallery before deletion
      const galleryImages = await db.query.images.findMany({
        where: eq(images.galleryId, gallery.id),
      });

      const validImageIds = new Set(galleryImages.map(img => img.id));
      const invalidIds = imageIds.filter(id => !validImageIds.has(id));

      if (invalidIds.length > 0) {
        return res.status(400).json({
          message: 'Some images do not belong to this gallery',
          invalidIds
        });
      }

      // Delete the images
      await db.delete(images)
        .where(
          and(
            inArray(images.id, imageIds),
            eq(images.galleryId, gallery.id)
          )
        );

      console.log(`Successfully deleted images: ${imageIds.join(', ')}`);
      res.json({ success: true, deletedIds: imageIds });
    } catch (error) {
      console.error('Error deleting images:', error);
      res.status(500).json({
        message: 'Failed to delete images',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });


  // Toggle star status for an image
  app.post('/api/images/:imageId/star', async (req, res) => {
    try {
      const imageId = parseInt(req.params.imageId);

      // Get current image
      const image = await db.query.images.findFirst({
        where: eq(images.id, imageId)
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }

      // Toggle star status
      const [updatedImage] = await db
        .update(images)
        .set({ starred: !image.starred })
        .where(eq(images.id, imageId))
        .returning();

      res.json({
        success: true,
        data: updatedImage
      });
    } catch (error) {
      console.error('Error starring image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to star image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Mount protected routes
  app.use('/api', protectedRouter);

  const httpServer = createServer(app);
  return httpServer;
}

function generateSlug(): string {
  // Generate a URL-friendly unique identifier
  // Using a shorter length (10) for more readable URLs while maintaining uniqueness
  return nanoid(10);
}