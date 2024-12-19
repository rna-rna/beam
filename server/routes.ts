import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { galleries, images } from '@db/schema';
import { eq } from 'drizzle-orm';
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
        orderBy: (images, { desc }) => [desc(images.createdAt)]
      });

      const processedImages = galleryImages.map(img => ({
        id: img.id,
        url: img.url,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height
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

  const httpServer = createServer(app);
  return httpServer;
}
