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

  app.post('/api/galleries', upload.array('images', 50), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: 'No images uploaded' });
      }

      const [gallery] = await db.insert(galleries).values({
        slug: generateSlug()
      }).returning();

      const insertPromises = req.files.map(async (file) => {
        // Get image dimensions (you might want to add sharp or another library later for this)
        // For now we'll use placeholder values
        return db.insert(images).values({
          galleryId: gallery.id,
          url: `/uploads/${file.filename}`,
          publicId: file.filename,
          width: 800, // placeholder
          height: 600 // placeholder
        });
      });

      await Promise.all(insertPromises);

      res.json({ galleryId: gallery.slug });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Failed to upload images' });
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

      if (!galleryImages.length) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      const processedImages = galleryImages.map(img => ({
        ...img,
        aspectRatio: img.width / img.height
      }));

      res.json({ images: processedImages });
    } catch (error) {
      console.error('Gallery fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch gallery' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
