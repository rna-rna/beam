import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { galleries, images, comments } from '@db/schema';
import { eq, and } from 'drizzle-orm';
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
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
  console.log('Uploads directory configured:', uploadsDir);

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
      const commentCounts = await Promise.all(
        galleryImages.map(async (img) => {
          const count = await db.query.comments.findMany({
            where: eq(comments.imageId, img.id),
          });
          return { imageId: img.id, count: count.length };
        })
      );

      const processedImages = galleryImages.map(img => ({
        id: img.id,
        url: img.url,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        commentCount: commentCounts.find(c => c.imageId === img.id)?.count || 0
      }));

      res.json({
        id: gallery.id,
        slug: gallery.slug,
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
      const { order } = req.body;
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Update order for each image
      // We'll use position field to maintain order
      for (let i = 0; i < order.length; i++) {
        await db
          .update(images)
          .set({ position: i })
          .where(eq(images.id, order[i]));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Reorder error:', error);
      res.status(500).json({ message: 'Failed to reorder images' });
    }
  });

  // Create a new comment
  // Toggle flag status for an image
  app.post('/api/images/:imageId/flag', async (req, res) => {
    try {
      const imageId = parseInt(req.params.imageId);
      
      // Get current image
      const image = await db.query.images.findFirst({
        where: eq(images.id, imageId)
      });

      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Toggle flag status
      const [updatedImage] = await db
        .update(images)
        .set({ flagged: !image.flagged })
        .where(eq(images.id, imageId))
        .returning();

      res.json(updatedImage);
    } catch (error) {
      console.error('Error flagging image:', error);
      res.status(500).json({ message: 'Failed to flag image' });
    }
  });

  app.post('/api/images/:imageId/comments', async (req, res) => {
    try {
      const { content, xPosition, yPosition } = req.body;
      const imageId = parseInt(req.params.imageId);

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
          yPosition
        })
        .returning();

      res.json(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ message: 'Failed to create comment' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
