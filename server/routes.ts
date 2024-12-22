import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { galleries, images, comments, annotations } from '@db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

// Migrate flagged to starred if needed
async function migrateSchema() {
  try {
    console.log('Starting schema migration check...');
    // First check if the 'starred' column already exists
    const starredExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'images' AND column_name = 'starred'
    `);
    // If starred already exists, no need to migrate
    if (starredExists.rows && starredExists.rows.length > 0) {
      console.log('Starred column already exists, no migration needed');
      return;
    }
    // Check if flagged column exists
    const flaggedExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'images' AND column_name = 'flagged'
    `);
    if (flaggedExists.rows && flaggedExists.rows.length > 0) {
      console.log('Found flagged column, starting migration...');
      // Rename flagged to starred
      await db.execute(sql`
        ALTER TABLE images 
        RENAME COLUMN flagged TO starred
      `);
      console.log('Successfully renamed flagged column to starred');
    } else {
      console.log('Creating new starred column...');
      // Neither column exists, create the starred column
      await db.execute(sql`
        ALTER TABLE images 
        ADD COLUMN starred BOOLEAN NOT NULL DEFAULT false
      `);
      console.log('Successfully created starred column');
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error; // Re-throw to handle in the caller
  }
}
import { generateSlug } from './utils';

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
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

export function registerRoutes(app: Express): Server {
  // Run schema migration
  (async () => {
    try {
      await migrateSchema();
      console.log('Schema migration completed successfully');
    } catch (error) {
      console.error('Failed to migrate schema:', error);
      process.exit(1); // Exit if migration fails
    }
  })();

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
  console.log('Uploads directory configured:', uploadsDir);

  // Create empty gallery with predefined ID
  app.post('/api/galleries/create', async (req, res) => {
    try {
      const { title = "Untitled Project", slug } = req.body;

      // Create gallery with provided or generated slug
      const [gallery] = await db.insert(galleries).values({
        slug: slug || generateSlug(),
        title
      }).returning();
      
      console.log('Created empty gallery:', gallery);
      res.json(gallery);
    } catch (error) {
      console.error('Failed to create gallery:', error);
      res.status(500).json({ message: 'Failed to create gallery' });
    }
  });

  // Create new gallery with images
  app.post('/api/galleries', upload.array('images', 50), async (req, res) => {
    try {
      console.log('Received upload request');
      
      if (!req.files || !Array.isArray(req.files)) {
        console.log('No files in request:', req.files);
        return res.status(400).json({ message: 'No images uploaded' });
      }
      
      console.log(`Processing ${req.files.length} files`);
      
      const [gallery] = await db.insert(galleries).values({
        slug: generateSlug()
      }).returning();
      
      console.log('Created gallery with ID:', gallery.id);
      
      try {
        const imageInserts = [];
        for (const file of req.files) {
          console.log('Processing file:', file.filename);
          const [image] = await db.insert(images).values({
            galleryId: gallery.id,
            url: `/uploads/${file.filename}`,
            publicId: file.filename,
            width: 800, // placeholder
            height: 600 // placeholder
          }).returning();
          imageInserts.push(image);
          console.log('Successfully processed file:', file.filename);
        }
        
        console.log(`Successfully processed all ${imageInserts.length} images`);
        res.json({ galleryId: gallery.slug });
      } catch (err) {
        console.error('Error processing files:', err);
        // Attempt to clean up the gallery if image processing failed
        await db.delete(galleries).where(eq(galleries.id, gallery.id));
        throw err; // Re-throw to be caught by outer catch block
      }
    } catch (error) {
      console.error('Upload error details:', error);
      res.status(500).json({ 
        message: 'Failed to upload images',
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Add images to existing gallery
  app.post('/api/galleries/:slug/images', upload.array('images', 50), async (req, res) => {
    try {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug),
      });
      
      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }
      
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: 'No images uploaded' });
      }
      
      console.log(`Adding ${req.files.length} images to gallery ${gallery.id}`);
      
      const imageInserts = [];
      for (const file of req.files) {
        console.log('Processing file:', file.filename);
        const [image] = await db.insert(images).values({
          galleryId: gallery.id,
          url: `/uploads/${file.filename}`,
          publicId: file.filename,
          originalFilename: file.originalname, // Store the original filename
          width: 800, // placeholder
          height: 600 // placeholder
        }).returning();
        imageInserts.push(image);
        console.log('Successfully processed file:', file.filename);
      }
      
      console.log(`Successfully added ${imageInserts.length} images`);
      res.json({ success: true });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        message: 'Failed to upload images',
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Update gallery title
  app.patch('/api/galleries/:slug/title', async (req, res) => {
    try {
      const { title } = req.body;
      console.log('Updating gallery title:', { slug: req.params.slug, title });

      if (!title || typeof title !== 'string') {
        console.error('Invalid title provided:', title);
        return res.status(400).json({ message: 'Invalid title' });
      }

      // Find the gallery by slug first
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug),
      });

      if (!gallery) {
        console.error('Gallery not found:', req.params.slug);
        return res.status(404).json({ message: 'Gallery not found' });
      }

      console.log('Found gallery:', gallery);

      // Update the gallery title using proper database update
      const [updated] = await db
        .update(galleries)
        .set({ title: title.trim() })
        .where(eq(galleries.id, gallery.id))
        .returning();

      console.log('Updated gallery:', updated);

      // Verify the update was successful
      if (!updated) {
        throw new Error('Failed to update gallery title');
      }

      // Return the updated gallery data
      res.json(updated);
    } catch (error) {
      console.error('Error updating gallery title:', error);
      res.status(500).json({ message: 'Failed to update gallery title' });
    }
  });

  // Get gallery details
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
      
      // Get comment counts for each image
      // Get comment counts for each image
      const commentCounts = await Promise.all(
        galleryImages.map(async (img) => {
          try {
            const count = await db.query.comments.findMany({
              where: eq(comments.imageId, img.id),
            });
            return { imageId: img.id, count: count.length };
          } catch (error) {
            console.error(`Error getting comments for image ${img.id}:`, error);
            return { imageId: img.id, count: 0 };
          }
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
      
      res.json({
        id: gallery.id,
        slug: gallery.slug,
        title: gallery.title,
        images: processedImages
      });
    } catch (error) {
      console.error('Gallery fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch gallery' });
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
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });

  // Reorder images in a gallery
  app.post('/api/galleries/:slug/reorder', async (req, res) => {
    try {
      console.log('Received reorder request for gallery:', req.params.slug);
      const { order } = req.body;
      
      if (!Array.isArray(order)) {
        console.error('Invalid order format:', order);
        return res.status(400).json({ message: 'Invalid order format' });
      }
      
      console.log('New image order:', order);
      
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug),
      });
      
      if (!gallery) {
        console.error('Gallery not found:', req.params.slug);
        return res.status(404).json({ message: 'Gallery not found' });
      }
      
      console.log('Found gallery:', gallery.id);
      
      // Validate all images belong to this gallery
      const galleryImages = await db.query.images.findMany({
        where: eq(images.galleryId, gallery.id),
      });
      
      const validImageIds = new Set(galleryImages.map(img => img.id));
      if (!order.every(id => validImageIds.has(id))) {
        console.error('Invalid image IDs in order');
        return res.status(400).json({ message: 'Invalid image IDs in order' });
      }
      
      // Update order for each image in a transaction
      await db.transaction(async (tx) => {
        for (let i = 0; i < order.length; i++) {
          console.log(`Setting position ${i} for image ${order[i]}`);
          await tx
            .update(images)
            .set({ position: i })
            .where(and(
              eq(images.id, order[i]),
              eq(images.galleryId, gallery.id)
            ));
        }
      });
      
      console.log('Successfully updated image positions');
      res.json({ success: true });
    } catch (error) {
      console.error('Reorder error:', error);
      res.status(500).json({ 
        message: 'Failed to reorder images',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create a new comment
  // Toggle star status for an image
  app.post('/api/images/:imageId/star', async (req, res) => {
    try {
      const imageId = parseInt(req.params.imageId);
      
      // Get current image
      const image = await db.query.images.findFirst({
        where: eq(images.id, imageId)
      });
      
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }
      
      // Toggle star status
      const [updatedImage] = await db
        .update(images)
        .set({ starred: !image.starred })
        .where(eq(images.id, imageId))
        .returning();
      
      res.json(updatedImage);
    } catch (error) {
      console.error('Error starring image:', error);
      res.status(500).json({ message: 'Failed to star image' });
    }
  });

  app.post('/api/images/:imageId/comments', async (req, res) => {
    try {
      const { content, xPosition, yPosition, author } = req.body;
      const imageId = parseInt(req.params.imageId);
      
      console.log('Creating comment with data:', {
        imageId,
        content,
        xPosition,
        yPosition,
        author
      });
      
      // Verify image exists
      const image = await db.query.images.findFirst({
        where: eq(images.id, imageId)
      });
      
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }
      
      const [comment] = await db.insert(comments)
        .values({
          imageId,
          content,
          xPosition,
          yPosition,
          author: author || 'Anonymous'
        })
        .returning();
      
      console.log('Created comment:', comment);
      res.json(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ message: 'Failed to create comment' });
    }
  });

  // Save annotation
  app.post('/api/images/:imageId/annotations', async (req, res) => {
    try {
      const imageId = parseInt(req.params.imageId);
      const { pathData } = req.body;
      
      const [annotation] = await db.insert(annotations)
        .values({
          imageId,
          pathData
        })
        .returning();
      
      res.json(annotation);
    } catch (error) {
      console.error('Error creating annotation:', error);
      res.status(500).json({ message: 'Failed to create annotation' });
    }
  });

  // Get annotations for an image
  app.get('/api/images/:imageId/annotations', async (req, res) => {
    try {
      const results = await db.query.annotations.findMany({
        where: eq(annotations.imageId, parseInt(req.params.imageId)),
        orderBy: (annotations, { asc }) => [asc(annotations.createdAt)]
      });
      
      res.json(results);
    } catch (error) {
      console.error('Error fetching annotations:', error);
      res.status(500).json({ message: 'Failed to fetch annotations' });
    }
  });

  // Get current gallery (most recently created/accessed)
  app.get('/api/galleries/current', async (req, res) => {
    try {
      console.log('Fetching current gallery');
      const gallery = await db.query.galleries.findFirst({
        orderBy: (galleries, { desc }) => [desc(galleries.createdAt)],
      });
      
      if (!gallery) {
        console.log('No galleries found');
        return res.status(404).json({ message: 'No galleries found' });
      }
      
      console.log('Found current gallery:', gallery);
      res.json(gallery);
    } catch (error) {
      console.error('Error fetching current gallery:', error);
      res.status(500).json({ message: 'Failed to fetch current gallery' });
    }
  });


  // Delete multiple images from a gallery
  app.post('/api/galleries/:slug/images/delete', async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}