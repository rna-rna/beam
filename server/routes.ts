import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { galleries, images, comments, stars, folders, galleryFolders, notifications, cachedUsers } from '@db/schema';
import { eq, and, sql, inArray, or, desc } from 'drizzle-orm';
import { setupClerkAuth, extractUserInfo } from './auth';
import { getEditorUserIds } from './utils';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { invites } from '@db/schema';
import { nanoid } from 'nanoid';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from 'sharp';
import { pusher } from './pusherConfig';

// Replace with your actual bucket name and endpoint
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;

const r2Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
  forcePathStyle: true
});

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



const upload = multer();

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

      const userGalleries = await db.query.galleries.findMany({
        where: eq(galleries.userId, userId),
        orderBy: (galleries, { desc }) => [desc(galleries.createdAt)],
        with: {
          images: {
            orderBy: (images, { asc }) => [asc(images.position), asc(images.createdAt)],
            limit: 1  // Fetch only the first image as thumbnail
          }
        },
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          guestUpload: true,
          folderId: true,
          deletedAt: true,
          isDraft: true // Added isDraft field
        }
      });

      // Transform response to include thumbnail URL and image count
      const galleriesWithThumbnails = await Promise.all(
        userGalleries.map(async (gallery) => {
          // Get total image count for gallery
          const result = await db.execute(
            sql`SELECT COUNT(*) as count FROM images WHERE gallery_id = ${gallery.id}`
          );
          const imageCount = parseInt(result.rows[0].count.toString(), 10);

          return {
            ...gallery,
            thumbnailUrl: gallery.images[0]?.url || null,
            publicId: gallery.images[0]?.publicId || null,
            imageCount
          };
        })
      );

      res.json(galleriesWithThumbnails);
    } catch (error) {
      console.error('Failed to fetch galleries:', error);
      res.status(500).json({ message: 'Failed to fetch galleries' });
    }
  });

  async function generateOgImage(galleryId: string, imagePath: string) {
    // TODO: Implement R2-based OG image generation if needed
    return null;
  }

  // Create gallery (supports both authenticated and guest users)
  app.post('/api/galleries/create', upload.array('images', 50), async (req: any, res) => {
    try {
      const { title = "Untitled Project" } = req.body;
      const userId = req.auth?.userId;
      const isGuestUpload = !userId;
      const files = req.files as Express.Multer.File[];

      if (!userId && !isGuestUpload) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Skip checking for existing galleries
      console.log('Creating new gallery:', {
        title,
        userId: userId || 'guest',
        guestUpload: isGuestUpload,
        fileCount: files?.length || 0
      });

      // Generate unique slug for every new gallery
      const slug = nanoid(10);

      // Create gallery first
      // Get the first image and use it for OG
      let ogImageUrl = null;
      if (files && files.length > 0) {
        try {

          const imageUploads = await Promise.all(
            files.map(async (file) => {
              const fileName = `uploads/originals/${Date.now()}-${file.originalname}`;

              // Get image dimensions using Sharp
              const metadata = await sharp(file.buffer).metadata();

              await r2Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
              }));

              const publicUrl = `${process.env.VITE_R2_PUBLIC_URL}/${fileName}`;
              console.log('Generated Public URL:', publicUrl);

              return {
                url: publicUrl,
                publicId: fileName,
                originalFilename: file.originalname,
                width: metadata.width || 800,
                height: metadata.height || 600
              };
            })
          );

          // Insert image records
          if (imageUploads.length > 0) {
            await db.insert(images).values(
              imageUploads.map(img => ({
                galleryId: gallery.id,
                url: img.url,
                publicId: img.publicId,
                originalFilename: img.originalFilename,
                width: img.width,
                height: img.height,
                position: 0,
                createdAt: new Date()
              }))
            );
          }

          // Set OG image URL from first uploaded image
          if (imageUploads[0]) {
            ogImageUrl = imageUploads[0].url;
          }

        } catch (error) {
          console.error('Failed to process uploads:', error);
          throw error;
        }
      }

      // Create gallery with OG image URL if available
      const [gallery] = await db.insert(galleries).values({
        slug,
        title,
        userId: userId || 'guest',
        guestUpload: isGuestUpload,
        isPublic: isGuestUpload ? true : false,
        createdAt: new Date(),
        ogImageUrl,
        isDraft: false // Added isDraft field, default to false
      }).returning();


      console.log('Gallery created, waiting for propagation...');

      let attempts = 0;
      while (attempts < 5) {
        const exists = await db.query.galleries.findFirst({
          where: eq(galleries.slug, slug)
        });

        if (exists) {
          console.log('Gallery available after:', attempts + 1, 'attempts');
          break;
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
      }

      // Upload images immediately for guest galleries
      if (isGuestUpload && files && files.length > 0) {
        const imageInserts = files.map(file => ({
          galleryId: gallery.id,
          url: file.path || `/uploads/${file.filename}`,
          publicId: file.filename,
          originalFilename: file.originalname,
          width: file.width || 800,
          height: file.height || 600,
          position: 0,
          createdAt: new Date()
        }));

        if (imageInserts.length > 0) {
          await db.insert(images).values(imageInserts);
        }
      }

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
        userId,
        isDraft: false // Added isDraft field, default to false
      }).returning();

      try {
        const imageInserts = [];
        for (const file of req.files) {
          const key = `uploads/originals/${file.filename}`;
          const publicUrl = `${process.env.VITE_R2_PUBLIC_URL}/${key}`;
          const [image] = await db.insert(images).values({
            galleryId: gallery.id,
            url: publicUrl,
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
        console.error(`Gallery not found for slug: ${req.params.slug}`);
        return res.status(404).json({
          message: 'Gallery not found',
          error: 'NOT_FOUND',
          details: 'The gallery you are looking for does not exist or has been removed'
        });
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

  // Update image metadata after direct R2 uploads
  app.post('/api/galleries/:slug/images/metadata', async (req: any, res) => {
    const { images } = req.body;
    const slug = req.params.slug;

    try {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, slug),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Insert image metadata into the database
      await db.insert(images).values(
        images.map((img: any) => ({
          galleryId: gallery.id,
          url: img.publicUrl,
          publicId: img.key,
          originalFilename: img.fileName,
          width: img.width || 800,
          height: img.height || 600,
          createdAt: new Date(),
        }))
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[Metadata Update Error]', error);
      res.status(500).json({ message: 'Failed to update metadata', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Add images to gallery (supports both guest and authenticated uploads)
  // Track processed requests with Map for upload debouncing
  // Track processed requests with request details
  interface ProcessedRequest {
    timestamp: number;
    fileHashes: string[];
    status: 'processing' | 'completed' | 'failed';
  }
  const processedRequests = new Map<string, ProcessedRequest>();

  app.post('/api/galleries/:slug/images', async (req: any, res) => {
    console.log("==== /api/galleries/:slug/images ENDPOINT HIT ====");
    console.log("Request params:", { slug: req.params.slug });

    let { files, uploadId } = req.body;
    const slug = req.params.slug;
    const MAX_FILE_SIZE = 60 * 1024 * 1024; // 60MB

    console.log("Received request body:", {
      filesCount: files?.length,
      uploadId,
      sampleFile: files?.[0] ? {
        name: files[0].name,
        type: files[0].type,
        size: files[0].size
      } : null
    });

    const requestId = uploadId || `${slug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log("Generated requestId:", requestId);

    // Generate unique hash for files array to detect duplicates
    const fileHashes = files?.map((f: any) => `${f.name}-${f.size}`);
    const existingRequest = processedRequests.get(requestId);

    console.log("File hashes computed:", {
      count: fileHashes?.length,
      sample: fileHashes?.[0]
    });

    // Check for duplicate requests with detailed validation
    if (existingRequest) {
      const isDuplicate = existingRequest.fileHashes.toString() === fileHashes?.toString();
      const isRecent = (Date.now() - existingRequest.timestamp) < 5000; // 5 second window

      if (isDuplicate && isRecent) {
        console.warn('[Duplicate Upload Request]', {
          requestId,
          slug,
          filesCount: files?.length,
          timeSinceOriginal: Date.now() - existingRequest.timestamp,
          status: existingRequest.status,
          timestamp: new Date().toISOString()
        });
        return res.status(429).json({
          success: false,
          message: 'Duplicate upload request detected',
          requestId,
          details: 'This upload request was already processed',
          status: existingRequest.status
        });
      }
    }

    // Log incoming files payload
    console.log('[Upload Request Files]', {
      requestId,
      files: files?.map(f => ({
        name: f.name,
        size: f.size,
        hash: `${f.name}-${f.size}`
      }))
    });

    // First get the gallery
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.slug, slug)
    });

    if (!gallery) {
      console.error('[Gallery Not Found]', {
        slug,
        requestId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({
        success: false,
        message: 'Gallery not found',
        error: 'NOT_FOUND',
        details: 'The specified gallery does not exist'
      });
    }

    // Track this request with detailed metadata
    processedRequests.set(requestId, {
      timestamp: Date.now(),
      fileHashes: fileHashes || [],
      status: 'processing'
    });

    // Comprehensive request validation
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.warn('[Invalid Upload Request]', {
        requestId,
        reason: 'Missing or invalid files array',
        body: req.body,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        message: 'No valid files provided',
        requestId
      });
    }

    // Deduplicate files based on name and size
    const uniqueFiles = new Map();
    const duplicates: string[] = [];

    files.forEach(file => {
      const uniqueKey = `${file.name}-${file.size}`;
      if (uniqueFiles.has(uniqueKey)) {
        duplicates.push(file.name);
      } else {
        uniqueFiles.set(uniqueKey, file);
      }
    });

    if (duplicates.length > 0) {
      console.warn('[Duplicate Files Detected]', {
        requestId,
        duplicates,
        timestamp: new Date().toISOString()
      });
    }

    // Use deduplicated files array
    files = Array.from(uniqueFiles.values());

    // Validate file types and sizes
    const invalidFiles = files.filter(file => 
      !file.name || 
      !file.type || 
      !file.size ||
      !file.type.startsWith('image/') ||
      file.size > MAX_FILE_SIZE
    );

    if (invalidFiles.length > 0) {
      console.warn('[Invalid Files]', {
        requestId,
        invalidFiles: invalidFiles.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size
        })),
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid files detected',
        details: 'All files must be images under 10MB'
      });
    }

    // Check for duplicate filenames
    const fileNames = files.map(f => f.name);
    const hasDuplicates = fileNames.length !== new Set(fileNames).size;
    if (hasDuplicates) {
      console.warn('[Duplicate Files]', {
        requestId,
        fileNames,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        message: 'Duplicate filenames detected',
        details: 'All files must have unique names'
      });
    }

    console.log('[Upload Request]', {
      requestId,
      slug,
      filesCount: files.length,
      auth: req.auth ? 'authenticated' : 'unauthenticated',
      timestamp: new Date().toISOString()
    });

    // Track request processing
    const processingStart = Date.now();
    const logTiming = (stage: string) => {
      console.log(`[Upload Timing] ${stage}`, {
        requestId,
        duration: Date.now() - processingStart + 'ms',
        timestamp: new Date().toISOString()
      });
    };

    // The validation is already handled above, removing duplicate code

    console.log('[Upload] Starting request:', {
      slug,
      filesCount: files?.length,
      files: files?.map((f: any) => ({
        name: f.name,
        type: f.type,
        size: (f.size / (1024 * 1024)).toFixed(2) + 'MB'
      }))
    });

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    try {
        console.log("=== Starting upload request processing ===");
        console.log("Looking up gallery in database...");

        const gallery = await db.query.galleries.findFirst({
            where: eq(galleries.slug, slug)
        });

        console.log("Gallery lookup result:", {
          found: !!gallery,
          galleryId: gallery?.id,
          ownerId: gallery?.userId,
          timestamp: new Date().toISOString()
        });

        if (!gallery) {
            console.error('[Gallery Not Found]', {
                slug,
                requestId,
                timestamp: new Date().toISOString()
            });
            return res.status(404).json({
                success: false,
                message: 'Gallery not found',
                error: 'NOT_FOUND',
                details: 'The specified gallery does not exist'
            });
        }

      // Allow uploads for guest galleries or authenticated owners
      const userId = req.auth?.userId;
      if (!gallery.guestUpload && (!userId || userId !== gallery.userId)) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Generate pre-signed URL for direct upload
      // Generate unique batch ID for this upload request
      const batchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('[Generating presigned URLs]', {
        batchId,
        filesCount: files.length,
        files: files.map((f: any) => ({
          name: f.name,
          type: f.type,
          size: f.size
        }))
      });

      console.log("=== Starting presigned URL generation ===");
      console.log("Processing files:", {
        count: files.length,
        totalSize: files.reduce((acc, f) => acc + f.size, 0),
        types: [...new Set(files.map(f => f.type))]
      });

      const preSignedUrls = await Promise.all(
        files.map(async (file: any) => {
          const timestamp = Date.now();
          const key = `uploads/originals/${timestamp}-${batchId}-${file.name}`;

          console.log("Generating URL for file:", {
            name: file.name,
            size: file.size,
            type: file.type,
            key
          });

          const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: file.type,
            Metadata: {
              originalName: file.name,
              uploadedAt: new Date().toISOString(),
              batchId
            }
          });

          const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
          const publicUrl = `${process.env.VITE_R2_PUBLIC_URL}/${key}`;

          // Create placeholder image record with batch tracking
          const [image] = await db.insert(images)
            .values({
              galleryId: gallery.id,
              url: publicUrl,
              publicId: key,
              originalFilename: file.name,
              width: 800,
              height: 600,
              createdAt: new Date()
            })
            .returning();

            // Get all editor users for notifications
            const editorUserIds = await getEditorUserIds(gallery.id);

            // Create notifications for all editors except the actor
            await Promise.all(
              editorUserIds
                .filter(editorId => editorId !== req.auth?.userId)
                .map((editorId) =>
                  db.insert(notifications).values({
                    userId: editorId,
                    type: 'image-uploaded',
                    data: {
                      imageId: image.id,
                      url: publicUrl,
                      actorId: req.auth?.userId,
                      galleryId: gallery.id
                    },
                    isSeen: false,
                    createdAt: new Date()
                  })
                )
            );

            // Emit real-time event via Pusher
            pusher.trigger(`presence-gallery-${gallery.slug}`, 'image-uploaded', {
              imageId: image.id,
              url: publicUrl,
              userId: req.auth?.userId,
              timestamp: new Date().toISOString()
            });

          console.log('[Generated presigned URL]', {
            batchId,
            fileName: file.name,
            imageId: image.id,
            key
          });

          return {
            fileName: file.name,
            key,
            signedUrl,
            publicUrl,
            imageId: image.id
          };
        })
      );

      console.log('[Upload] Signed URLs generated:', {
        slug,
        totalUrls: preSignedUrls.flat().length,
        timestamp: new Date().toISOString()
      });

      // Ensure all URLs were generated successfully
      const invalidUrls = preSignedUrls.flat().filter(url => !url.signedUrl || !url.publicUrl);
      if (invalidUrls.length > 0) {
          console.error('[URL Generation Failed]', {
              slug,
              failedFiles: invalidUrls.map(u => u.fileName),
              timestamp: new Date().toISOString()
          });
          return res.status(500).json({
              success: false,
              message: 'Failed to generate URLs for some files',
              details: 'Internal server error during URL generation'
          });
      }

      // Update request status to completed
      const request = processedRequests.get(requestId);
      if (request) {
        request.status = 'completed';
      }

      res.json({
          success: true,
          urls: preSignedUrls.flat(),
          requestId: requestId
      });
    } catch (error) {
        // Update request status to failed
        const request = processedRequests.get(requestId);
        if (request) {
          request.status = 'failed';
        }

        console.error('[Upload Error]:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            slug,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({
            success: false,
            message: 'Failed to process upload request',
            details: error instanceof Error ? error.message : 'Internal server error'
        });
    }
  });

  // Update gallery title (supports both guest and authenticated galleries)
  app.patch('/api/galleries/:slug/title', async (req: any, res) => {
    try {
      const { title } = req.body;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: 'Invalid title' });
      }

      // Find the gallery by slug
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug)
      });

      if (!gallery) {
        console.error(`Gallery not found for slug: ${req.params.slug}`);
        return res.status(404).json({
          message: 'Gallery not found',
          error: 'NOT_FOUND',
          details: 'The gallery you are looking for does not exist or has been removed'
        });
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
        console.error(`Gallery not found for slug: ${req.params.slug}`);
        return res.status(404).json({
          message: 'Gallery not found',
          error: 'NOT_FOUND',
          details: 'The gallery you are looking for does not exist or has been removed'
        });
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
        console.error(`Gallery not found for slug: ${req.params.slug}`);
        return res.status(404).json({
          message: 'Gallery not found',
          error: 'NOT_FOUND',
          details: 'The gallery you are looking for does not exist or has been removed'
        });
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
        console.error(`Gallery not found for slug: ${req.params.slug}`);
        return res.status(404).json({
          message: 'Gallery not found',
          error: 'NOT_FOUND',
          details: 'The gallery you are looking for does not exist or has been removed'
        });
      }

      // Soft delete by setting deleted_at timestamp
      await db.update(galleries)
        .set({ deleted_at: new Date().toISOString() })
        .where(eq(galleries.id, gallery.id));

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting gallery:', error);
      res.status(500).json({
        message: 'Failed to delete gallery',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Toggle gallery visibility
  protectedRouter.patch('/galleries/:slug/visibility', async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { isPublic } = req.body;

      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({ message: 'Invalid request: isPublic must be a boolean' });
      }

      // Find the gallery and verify ownership
      const gallery = await db.query.galleries.findFirst({
        where: and(
          eq(galleries.slug, req.params.slug),
          eq(galleries.userId, userId)
        ),
      });

      if (!gallery) {
        console.error(`Gallery not found for slug: ${req.params.slug}`);
        return res.status(404).json({
          message: 'Gallery not found',
          error: 'NOT_FOUND',
          details: 'The gallery you are looking for does not exist or has been removed'
        });
      }

      // Update gallery visibility
      const [updated] = await db
        .update(galleries)
        .set({ isPublic })
        .where(eq(galleries.id, gallery.id))
        .returning();

      // Set cache control headers to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating gallery visibility:', error);
      res.status(500).json({
        message: 'Failed to update gallery visibility',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update the public gallery endpoint to include proper cache control and ownership checks
  app.get('/api/galleries/:slug', async (req, res) => {
    try {
      console.log('Gallery fetch request:', {
        slug: req.params.slug,
        authenticatedUserId: req.auth?.userId || 'none',
        hasAuth: !!req.auth
      });

      // Add cache control headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Find the gallery first
      const gallery = await db.query.galleries.findFirst({
        where: or(
          and(
            eq(galleries.slug, req.params.slug),
            eq(galleries.guestUpload, true)
          ),
          and(
            eq(galleries.slug, req.params.slug),
            eq(galleries.isPublic, true)
          ),
          and(
            eq(galleries.slug, req.params.slug),
            eq(galleries.userId, req.auth?.userId || '')
          )
        ),
        select: {
          id: true,
          slug: true,
          title: true,
          isPublic: true,
          userId: true,
          guestUpload: true,
          createdAt: true,
          isDraft: true // Added isDraft field
        }
      });

      console.log('Gallery fetch result:', {
        found: !!gallery,
        galleryId: gallery?.id,
        isGuestUpload: gallery?.guestUpload,
        isPublic: gallery?.isPublic,
        ownerId: gallery?.userId
      });

      if (!gallery) {
        console.error(`Gallery not found for slug: ${req.params.slug}`);
        return res.status(404).json({
          message: 'Gallery not found',
          error: 'NOT_FOUND',
          details: 'The gallery you are looking for does not exist or has been removed'
        });
      }

      // Allow access if gallery is:
      // 1. A guest upload (accessible to everyone)
      // 2. Public
      // 3. User is authenticated and owns the gallery
      const isOwner = gallery.userId === 'guest' || req.auth?.userId === gallery.userId;

      // Guest uploads are always accessible
      if (gallery.guestUpload) {
        const galleryImages = await db.query.images.findMany({
          where: eq(images.galleryId, gallery.id),
          orderBy: (images, { asc }) => [
            asc(images.position),
            asc(images.createdAt)
          ]
        });

        return res.json({
          ...gallery,
          images: galleryImages,
          isOwner: false
        });
      }

      // Check access for non-guest galleries
      if (!gallery.isPublic && !isOwner && !gallery.guestUpload) {
        return res.status(403).json({
          message: 'This gallery is private',
          isPrivate: true,
          requiresAuth: !req.auth
        });
      }

      // If access is allowed, get the gallery images with star data
      const imagesWithStars = await db.query.images.findMany({
        where: eq(images.galleryId, gallery.id),
        orderBy: (images, { asc }) => [
          asc(images.position),
          asc(images.createdAt)
        ],
        with: {
          stars: true
        }
      });

      // Debug image data
      console.log('Gallery Images Data:', {
        count: imagesWithStars.length,
        sampleImage: imagesWithStars[0] ? {
          id: imagesWithStars[0].id,
          originalFilename: imagesWithStars[0].originalFilename,
          hasOriginalFilename: !!imagesWithStars[0].originalFilename,
          url: imagesWithStars[0].url,
        } : null,
        missingFilenames: imagesWithStars.filter(img => !img.originalFilename).length
      });

      // Validate required image fields
      const invalidImages = imagesWithStars.filter(img => !img.originalFilename || !img.url);
      if (invalidImages.length > 0) {
        console.error('Invalid image data detected:', {
          total: imagesWithStars.length,
          invalid: invalidImages.length,
          samples: invalidImages.slice(0, 3).map(img => ({
            id: img.id,
            hasOriginalFilename: !!img.originalFilename,
            hasUrl: !!img.url
          }))
        });
      }

      // Gather all unique user IDs from stars
      const allUserIds = new Set<string>();
      for (const img of imagesWithStars) {
        for (const star of img.stars) {
          allUserIds.add(star.userId);
        }
      }

      // Fetch cached user data in a single query
      const cachedUsersData = await db.query.cachedUsers.findMany({
        where: inArray(cachedUsers.userId, [...allUserIds])
      });

      // Create a map for quick lookups
      const userMap = new Map(cachedUsersData.map(u => [u.userId, u]));

      // Map cached data to stars
      const imagesWithUserData = imagesWithStars.map(img => ({
        ...img,
        stars: img.stars.map(star => {
          const cachedUser = userMap.get(star.userId);
          return {
            ...star,
            firstName: cachedUser?.firstName ?? null,
            lastName: cachedUser?.lastName ?? null,
            imageUrl: cachedUser?.imageUrl ?? null
          };
        })
      }));

      const commentCounts = await Promise.all(
        imagesWithStars.map(async (img) => {
          const result = await db.execute(
            sql`SELECT COUNT(*) as count FROM comments WHERE image_id = ${img.id}`
          );
          return { imageId: img.id, count: parseInt(result.rows[0]?.count || '0', 10) };
        })
      );

      const processedImages = imagesWithUserData.map(img => ({
        id: img.id,
        url: img.url || '',
        width: img.width,
        height: img.height,
        aspectRatio: img.width && img.height ? img.width / img.height : null,
        publicId: img.publicId,
        slug: gallery.slug,
        originalFilename: img.originalFilename || `image-${img.id}`,
        userStarred: img.stars.some(star => star.userId === req.auth?.userId),
        stars: img.stars,
        commentCount: commentCounts.find(c => c.imageId === img.id)?.count || 0
      }));

      // Final validation check
      console.log('Processed Images:', {
        total: processedImages.length,
        withFilenames: processedImages.filter(img => img.originalFilename).length,
        sample: processedImages[0]
      });

      // Get OG image URL from first image or use fallback
      const ogImageUrl = processedImages[0]?.url ||
        'https://res.cloudinary.com/dq7m5z3zf/image/upload/v1700000000/12_crhopz.jpg';

      // Check for invite and role if not owner
      let role = 'View';
      if (!isOwner) {
        const invite = await db.query.invites.findFirst({
          where: and(
            eq(invites.galleryId, gallery.id),
            eq(invites.email, req.auth?.userId ? (await clerkClient.users.getUser(req.auth.userId)).emailAddresses[0].emailAddress : '')
          )
        });

        if (!gallery.isPublic && !invite) {
          return res.status(403).json({
            message: 'Access denied',
            isPrivate: true,
            requiresAuth: !req.auth
          });
        }

        if (invite) {
          role = invite.role;
        }
      }

      res.json({
        id: gallery.id,
        slug: gallery.slug,
        title: gallery.title,
        isPublic: gallery.isPublic,
        images: processedImages,
        isOwner,
        role,
        createdAt: gallery.createdAt,
        ogImageUrl,
        isDraft: gallery.isDraft // Added isDraft field
      });
    } catch (error) {
      console.error('Gallery fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch gallery' });
    }
  });


  // Comment submission endpoint - supports both authenticated and guest gallery comments
  app.post('/api/images/:imageId/comments', async (req: Request, res) => {
    try {
      const { content, xPosition, yPosition } = req.body;
      const imageId = parseInt(req.params.imageId);

      // Early auth check
      if (!req.auth?.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for commenting',
          requiresAuth: true
        });
      }

      // Validate required fields
      if (!content || typeof xPosition !== 'number' || typeof yPosition !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Invalid request: content, xPosition, and yPosition are required'
        });
      }

      const image = await db.query.images.findFirst({
        where: eq(images.id, imageId),
        with: {
          gallery: true
        }
      });

      if (!image || !image.gallery) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
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

        // Validate user info
        if (!userId || !userName) {
          return res.status(400).json({
            success: false,
            message: 'Invalid user information'
          });
        }

        // Create the comment
        const [comment] = await db.insert(comments)
          .values({
            imageId,
            content,
            xPosition,
            yPosition,
            userId,
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

        // Get all editor users for notifications
        const editorUserIds = await getEditorUserIds(image.gallery.id);

        // Create notifications for all editors except the actor
        await Promise.all(
          editorUserIds
            .filter(editorId => editorId !== userId)
            .map((editorId) => 
              db.insert(notifications).values({
                userId: editorId,
                type: 'comment-added',
                data: {
                  imageId: comment.imageId,
                  content: comment.content,
                  actorId: userId,
                  galleryId: image.gallery.id
                },
                groupId: nanoid(),
                isSeen: false,
                createdAt: new Date()
              })
            )
        );

        // Emit real-time event via Pusher
        pusher.trigger(`presence-gallery-${image.gallery.slug}`, 'comment-added', {
          imageId: comment.imageId,
          content: comment.content,
          userId: comment.userId,
          userName: comment.userName,
          userImageUrl: comment.userImageUrl,
          xPosition: comment.xPosition,
          yPosition: comment.yPosition,
          createdAt: comment.createdAt,
          timestamp: new Date().toISOString()
        });

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
      // Ensure we always return JSON, even for auth errors
      if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          requiresAuth: true
        });
      }
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

      // Get unique user IDs from comments
      const userIds = [...new Set(imageComments.map(comment => comment.userId))];

      // Fetch cached user data in a single query
      const cachedUsersData = await db.query.cachedUsers.findMany({
        where: inArray(cachedUsers.userId, userIds)
      });

      // Map cached user data to comments
      const commentsWithUsers = imageComments.map(comment => {
        const cachedUser = cachedUsersData.find(u => u.userId === comment.userId);
        return {
          ...comment,
          firstName: cachedUser?.firstName || null,
          lastName: cachedUser?.lastName || null,
          imageUrl: cachedUser?.imageUrl || null
        };
      });

      res.json(commentsWithUsers);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch comments',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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
        console.error(`Gallery not found for slug: ${req.params.slug}`);
        return res.status(404).json({
          message: 'Gallery not found',
          error: 'NOT_FOUND',
          details: 'The gallery you are looking for does not exist or has been removed'
        });
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


  // Star or unstar an image
  app.post('/api/images/:imageId/star', async (req, res) => {
    try {
      if (!req.auth?.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          requiresAuth: true
        });
      }

      const imageId = parseInt(req.params.imageId);
      const userId = req.auth.userId;

      // Get user from Clerk and cache data
      const clerkUser = await clerkClient.users.getUser(userId);
      await db.insert(cachedUsers)
        .values({
          userId: clerkUser.id,
          firstName: clerkUser.firstName ?? "",
          lastName: clerkUser.lastName ?? "",
          imageUrl: clerkUser.imageUrl ?? "",
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [cachedUsers.userId],
          set: {
            firstName: clerkUser.firstName ?? "",
            lastName: clerkUser.lastName ?? "",
            imageUrl: clerkUser.imageUrl ?? "",
            updatedAt: new Date()
          }
        });

      // Get image and gallery info
      const image = await db.query.images.findFirst({
        where: eq(images.id, imageId),
        with: {
          gallery: true
        }
      });

      if (!image || !image.gallery) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }

      // Check if the user already starred this image
      const existingStar = await db.query.stars.findFirst({
        where: and(
          eq(stars.userId, userId),
          eq(stars.imageId, imageId)
        )
      });

      const isStarred = !!existingStar;
      if (existingStar) {
        // Remove the star if it exists
        await db.delete(stars)
          .where(and(
            eq(stars.userId, userId),
            eq(stars.imageId, imageId)
          ));
      } else {
        // Add a new star if not starred
        await db.insert(stars)
          .values({
            userId,
            imageId,
            createdAt: new Date()
          });
      }

      // Get all editor users for notifications
      const editorUserIds = await getEditorUserIds(image.gallery.id);

      // Create or update notifications for all editors except the actor
      await Promise.all(
        editorUserIds
          .filter(editorId => editorId !== userId)
          .map(async (editorId) => {
            const existingNotification = await db.query.notifications.findFirst({
              where: and(
                eq(notifications.type, 'image-starred'),
                eq(notifications.userId, editorId),
                sql`${notifications.data}->>'imageId' = ${imageId}::text`,
                sql`${notifications.createdAt} >= NOW() - INTERVAL '5 seconds'`
              )
            });

            if (existingNotification) {
              // Update timestamp for existing notification
              await db.update(notifications)
                .set({ 
                  createdAt: new Date(),
                  data: {
                    imageId,
                    isStarred: !isStarred,
                    actorId: userId,
                    galleryId: image.gallery.id
                  }
                })
                .where(eq(notifications.id, existingNotification.id));
            } else {
              // Create a new notification with a new group_id
              const groupId = nanoid();
              await db.insert(notifications).values({
                userId: editorId,
                type: 'image-starred',
                data: {
                  imageId,
                  isStarred: !isStarred,
                  actorId: userId,
                  galleryId: image.gallery.id
                },
                groupId,
                isSeen: false,
                createdAt: new Date()
              });
            }
          })
      );

      // Emit real-time event via Pusher
      pusher.trigger(`presence-gallery-${image.gallery.slug}`, 'image-starred', {
        imageId,
        isStarred: !isStarred,
        userId,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: isStarred ? "Star removed" : "Star added",
        isStarred: !isStarred
      });
    } catch (error) {
      console.error('Error starring image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to star image'
      });
    }
  });

  // Unstar an image
  app.delete('/api/images/:imageId/star', async (req, res) => {
    try {
      if (!req.auth?.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          requiresAuth: true
        });
      }

      const imageId = parseInt(req.params.imageId);
      const userId = req.auth.userId;

      await db.delete(stars)
        .where(and(
          eq(stars.userId, userId),
          eq(stars.imageId, imageId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error('Error unstarring image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unstar image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get users who starred an image
  app.get('/api/images/:imageId/stars', async (req, res) => {
    try {
      const imageId = parseInt(req.params.imageId);
      const userId = req.auth?.userId;

      const starData = await db.query.stars.findMany({
        where: eq(stars.imageId, imageId),
        orderBy: (stars, { desc }) => [desc(stars.createdAt)]
      });

      const userStarred = userId ? starData.some(star => star.userId === userId) : false;

      // Get unique user IDs
      const userIds = [...new Set(starData.map(star => star.userId))];

      // Fetch cached user data in a single query
      const cachedUsersData = await db.query.cachedUsers.findMany({
        where: inArray(cachedUsers.userId, userIds)
      });

      // Map cached user data to stars
      const starsWithUserData = starData.map(star => {
        const cachedUser = cachedUsersData.find(u => u.userId === star.userId);
        return {
          ...star,
          user: {
            firstName: cachedUser?.firstName || null,
            lastName: cachedUser?.lastName || null,
            imageUrl: cachedUser?.imageUrl || null
          }
        };
      });

      res.json({
        success: true,
        data: starsWithUserData,
        userStarred
      });
    } catch (error) {
      console.error('Error fetching stars:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stars',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get gallery permissions
  app.get('/api/galleries/:slug/permissions', async (req, res) => {
    try {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug)
      });

      if (!gallery) {
        return res.status(404).json({
          success: false,
          message: 'Gallery not found'
        });
      }

      // Get all permissions and cached user data in parallel
      const [permissions, cachedUsers] = await Promise.all([
        db.query.invites.findMany({
          where: eq(invites.galleryId, gallery.id)
        }),
        db.query.cachedUsers.findMany({
          where: inArray(cachedUsers.userId, [
            ...permissions.filter(invite => invite.userId).map(invite => invite.userId as string),
            gallery.userId
          ])
        })
      ]);

      // Create user map for efficient lookups 
      const userMap = new Map(cachedUsers.map(u => [u.userId, u]));

      const usersWithDetails = permissions.map(invite => {
        if (invite.userId) {
          const cachedUser = userMap.get(invite.userId);
          return {
            id: invite.id,
            email: invite.email,
            fullName: cachedUser ? `${cachedUser.firstName || ''} ${cachedUser.lastName || ''}`.trim() : null,
            role: invite.role,
            avatarUrl: cachedUser?.imageUrl || null
          };
        }
        return {
          id: invite.id,
          email: invite.email,
          fullName: null,
          role: invite.role,
          avatarUrl: null
        };
      });

      // Add owner with Editor role if not already in permissions
      if (gallery.userId !== 'guest') {
        try {
          const owner = await clerkClient.users.getUser(gallery.userId);
          const ownerEmail = owner.emailAddresses[0]?.emailAddress;
          const isOwnerInPermissions = usersWithDetails.some(u => u.email === ownerEmail);

          if (!isOwnerInPermissions && ownerEmail) {
            usersWithDetails.push({
              id: 'owner',
              email: ownerEmail,
              fullName: `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
              role: 'Editor',
              avatarUrl: owner.imageUrl
            });
          }
        } catch (error) {
          console.error('Failed to fetch owner details:', error);
        }
      }

      res.json({
        success: true,
        users: usersWithDetails
      });
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch permissions'
      });
    }
  });

  // Invite users to a gallery
  protectedRouter.post('/galleries/:slug/invite', async (req, res) => {
    const { role } = req.body;
    const email = req.body.email.toLowerCase();
    const { slug } = req.params;
    const userId = req.auth.userId;

    try {
      console.log('Invite attempt:', {
        slug,
        email,
        role,
        userId,
        timestamp: new Date().toISOString()
      });

      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, slug),
      });

      console.log('Gallery lookup result:', {
        found: !!gallery,
        galleryId: gallery?.id,
        ownerId: gallery?.userId,
        isAuthorized: gallery?.userId === userId
      });

      if (!gallery || gallery.userId !== userId) {
        console.log('Authorization failed:', {
          hasGallery: !!gallery,
          galleryOwnerId: gallery?.userId,
          requesterId: userId
        });
        return res.status(403).json({ message: 'Unauthorized' });
      }

      // Lookup user by email using Clerk's email_address_query
      const usersResponse = await clerkClient.users.getUserList({
        email_address_query: email
      });
      const users = usersResponse?.data || [];
      const matchingUser = users.find((u) =>
        u.emailAddresses.some((e) => e.emailAddress.toLowerCase() === email.toLowerCase())
      );

      console.log('Clerk user lookup:', {
        email,
        found: !!matchingUser,
        userId: matchingUser?.id
      });

      // Cache user data if found
      if (matchingUser) {
        await db.insert(cachedUsers)
          .values({
            userId: matchingUser.id,
            firstName: matchingUser.firstName ?? "",
            lastName: matchingUser.lastName ?? "",
            imageUrl: matchingUser.imageUrl ?? "",
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: [cachedUsers.userId],
            set: {
              firstName: matchingUser.firstName ?? "",
              lastName: matchingUser.lastName ?? "",
              imageUrl: matchingUser.imageUrl ?? "",
              updatedAt: new Date()
            }
          });
      }

      const user = matchingUser;

      // Check for existing invite
      const existingInvite = await db.query.invites.findFirst({
        where: and(
          eq(invites.galleryId, gallery.id),
          eq(invites.email, email)
        )
      });

      if (existingInvite) {
        console.log('Updating existing invite:', {
          inviteId: existingInvite.id,
          email,
          oldRole: existingInvite.role,
          newRole: role
        });

        await db.update(invites)
          .set({ role })
          .where(and(
            eq(invites.galleryId, gallery.id),
            eq(invites.email, email)
          ));
      } else {
        console.log('Creating new invite:', {
          galleryId: gallery.id,
          email,
          role,
          clerkUserId: user?.id
        });

        await db.insert(invites).values({
          galleryId: gallery.id,
          email,
          userId: user?.id,
          role
        });
      }

      if (!user) {
        console.log('Email invite would be sent:', {
          email,
          gallerySlug: gallery.slug,
          role
        });
      }

      console.log('Invite operation successful');
      res.json({ message: 'Invite sent successfully' });
    } catch (error) {
      console.error('Failed to invite user:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        email,
        slug
      });

      res.status(500).json({
        message: 'Failed to invite user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle access requests
  protectedRouter.post('/galleries/:slug/request-access', async (req, res) => {
    try {
      const { slug } = req.params;
      const userId = req.auth.userId;

      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, slug)
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Check if invite already exists
      const existingInvite = await db.query.invites.findFirst({
        where: and(
          eq(invites.galleryId, gallery.id),
          eq(invtes.userId, userId)
        )
      });

      if (existingInvite) {
        return res.status(400).json({ message: 'Access request already exists' });
      }

      // Create pending invite
      await db.insert(invites).values({
        galleryId: gallery.id,
        userId,
        role: 'View',
        email: (await clerkClient.users.getUser(userId)).emailAddresses[0].emailAddress
      });

      res.json({ message: 'Access request sent' });
    } catch (error) {
      console.error('Failed to request access:', error);
      res.status(500).json({ message: 'Failed to request access' });
    }
  });

  // Get folder by slug
  app.get('/api/folders/:slug', async (req, res) => {
    try {
      const folder = await db.query.folders.findFirst({
        where: eq(folders.slug, req.params.slug)
      });

      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      res.json(folder);
    } catch (error) {
      console.error('Failed to fetch folder:', error);
      res.status(500).json({ message: 'Failed to fetch folder' });
    }
  });

  // User search endpoint
  app.get('/api/users/search', async (req, res) => {
    try {
      const email = req.query.email?.toString().toLowerCase();

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email query parameter is required'
        });
      }

      const usersResponse = await clerkClient.users.getUserList({
        email_address_query: email,
      });

      const users = usersResponse?.data.map((user) => ({
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        avatarUrl: user.imageUrl,
      })) || [];

      res.json({
        success: true,
        users
      });
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search users',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Single PUT upload endpoint
  app.post('/api/single-upload-url', async (req: any, res) => {
    const { fileName, contentType } = req.body;

    console.log('Generating single upload URL:', {
      fileName,
      contentType,
      timestamp: new Date().toISOString()
    });

    try {
      console.log('Environment Variables:', {
        VITE_R2_PUBLIC_URL: process.env.VITE_R2_PUBLIC_URL,
        R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
      });

      if (!fileName || !contentType) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'fileName and contentType are required',
        });
      }

      const key = `uploads/originals/${Date.now()}-${fileName}`;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
      const publicUrl = `${process.env.VITE_R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${key}`;

      console.log('Generated Signed URL Details:', {
        signedUrl,
        publicUrl,
        key,
      });

      if (signedUrl.includes(`${R2_BUCKET_NAME}/${R2_BUCKET_NAME}`)) {
        console.warn('Double bucket name detected insigned URL:', signedUrl);
      }

      console.log('URL Validation:', {
        signedUrl,
        publicUrl,
        key,
      });

      // Validation: Log warnings if signedUrl contains redundant bucket name
      if (signedUrl.includes(`${R2_BUCKET_NAME}/${R2_BUCKET_NAME}`)) {
        console.warn('Double bucket name detected in signed URL:', signedUrl);
      }

      res.json({
        url: signedUrl,
        publicUrl,
        key,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
    } catch (err) {
      console.error('Error generating single PUT URL:', err);
      res.status(500).json({
        error: 'Failed to generate upload URL',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Folder endpoints
  protectedRouter.post('/folders', async (req, res) => {
    try {
      const { name } = req.body;
      const userId = req.auth.userId;

      // Generate a unique 8-character slug for the folder
      const slug = nanoid(8);

      const [folder] = await db.insert(folders)
        .values({ 
          name, 
          userId, 
          slug,
          createdAt: new Date() 
        })
        .returning();

      console.log('Created folder:', {
        id: folder.id,
        name: folder.name,
        slug: folder.slug
      });

      res.json(folder);
    } catch (error) {
      console.error('Failed to create folder:', error);
      res.status(500).json({ message: 'Failed to create folder' });
    }
  });

  protectedRouter.get('/folders', async (req, res) => {
    try {
      const userId = req.auth.userId;
      const userFolders = await db.query.folders.findMany({
        where: eq(folders.userId, userId),
        orderBy: (folders, { desc }) => [desc(folders.createdAt)]
      });

      const foldersWithCounts = await Promise.all(
        userFolders.map(async (folder) => {
          const count = await db.select({ count: sql<number>`count(*)` })
            .from(galleryFolders)
            .where(eq(galleryFolders.folderId, folder.id));

          return {
            id: folder.id,
            name: folder.name,
            slug: folder.slug,
            userId: folder.userId,
            createdAt: folder.createdAt,
            galleryCount: Number(count[0].count)
          };
        })
      );

      res.json(foldersWithCounts);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      res.status(500).json({ message: 'Failed to fetch folders' });
    }
  });

  protectedRouter.put('/folders/:id', async (req, res) => {
    try {
      const { name } = req.body;
      const userId = req.auth.userId;
      const folderId = parseInt(req.params.id);

      const [updated] = await db.update(folders)
        .set({ name })
        .where(and(
          eq(folders.id, folderId),
          eq(folders.userId, userId)
        ))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Failed to update folder:', error);
      res.status(500).json({ message: 'Failed to update folder' });
    }
  });

  protectedRouter.delete('/folders/:id', async (req, res) => {
    try {
      const userId = req.auth.userId;
      const folderId = parseInt(req.params.id);

      await db.transaction(async (tx) => {
        await tx.delete(galleryFolders)
          .where(eq(galleryFolders.folderId, folderId));

        const [deleted] = await tx.delete(folders)
          .where(and(
            eq(folders.id, folderId),
            eq(folders.userId, userId)
          ))
          .returning();

        if (!deleted) {
          throw new Error('Folder not found');
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete folder:', error);
      res.status(500).json({ message: 'Failed to delete folder' });
    }
  });

  // Gallery folder assignment endpoints
  protectedRouter.post('/galleries/:id/folder/:folderId', async (req, res) => {
    try {
      const userId = req.auth.userId;
      const galleryId = parseInt(req.params.id);
      const folderId = parseInt(req.params.folderId);

      // Verify ownership
      const folder = await db.query.folders.findFirst({
        where: and(
          eq(folders.id, folderId),
          eq(folders.userId, userId)
        )
      });

      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      const [assignment] = await db.insert(galleryFolders)
        .values({ galleryId, folderId })
        .returning();

      res.json(assignment);
    } catch (error) {
      console.error('Failed to assign gallery to folder:', error);
      res.status(500).json({ message: 'Failed to assign gallery to folder' });
    }
  });

  // Direct upload endpoints only

  // Move gallery to folder
  protectedRouter.patch('/galleries/:id/move', async (req, res) => {
    try {
      const userId = req.auth.userId;
      const galleryId = parseInt(req.params.id);
      const { folderId, folderSlug } = req.body;

      let targetFolder;

      // Find folder by ID or slug
      if (folderId) {
        targetFolder = await db.query.folders.findFirst({
          where: and(
            eq(folders.id, folderId),
            eq(folders.userId, userId)
          )
        });
      } else if (folderSlug) {
        targetFolder = await db.query.folders.findFirst({
          where: and(
            eq(folders.slug, folderSlug),
            eq(folders.userId, userId)
          )
        });
      } else {
        return res.status(400).json({ message: 'Either folderId or folderSlug is required' });
      }

      if (!targetFolder) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      // Update gallery
      const [updated] = await db.update(galleries)
        .set({ folderId: targetFolder.id })
        .where(and(
          eq(galleries.id, galleryId),
          eq(galleries.userId, userId)
        ))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Failed to move gallery:', error);
      res.status(500).json({ message: 'Failed to move gallery' });
    }
  });

  // Get grouped notifications
  protectedRouter.get('/api/notifications', async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      const notifications = await db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, userId),
          eq(notifications.isSeen, false)
        ),
        orderBy: [desc(notifications.createdAt)],
      });

      // Group notifications by groupId, type and similar data
      const grouped = notifications.reduce((acc: any[], notification) => {
        const existingGroup = acc.find(group => 
          group.groupId === notification.groupId && 
          group.type === notification.type &&
          JSON.stringify(group.data) === JSON.stringify(notification.data)
        );

        if (existingGroup) {
          existingGroup.count++;
          if (notification.createdAt > existingGroup.latestTime) {
            existingGroup.latestTime = notification.createdAt;
          }
        } else {
          acc.push({
            groupId: notification.groupId,
            type: notification.type,
            data: notification.data,
            count: 1,
            latestTime: notification.createdAt
          });
        }
        return acc;
      }, []);

      // Sort by latest time
      grouped.sort((a, b) => b.latestTime.getTime() - a.latestTime.getTime());

      res.json(grouped);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Track gallery views
  protectedRouter.post('/galleries/:slug/view', async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const [updated] = await db.update(galleries)
        .set({ lastViewedAt: new Date() })
        .where(eq(galleries.slug, req.params.slug))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Failed to update view timestamp:', error);
      res.status(500).json({ message: 'Failed to update view timestamp' });
    }
  });

  // Get recent galleries for current user
  protectedRouter.get('/galleries/recent', async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      // Get galleries where user is either owner or has viewed
      const galleries = await db.query.galleries.findMany({
        where: sql`(${galleries.userId} = ${userId} OR ${galleries.lastViewedAt} IS NOT NULL)`,
        orderBy: (galleries, { desc }) => [desc(galleries.lastViewedAt)],
        limit: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          isPublic: true,
          userId: true,
          guestUpload: true,
          createdAt: true,
          isDraft: true // Added isDraft field
        }
      });

      const galleriesWithDetails = await Promise.all(
        galleries.map(async (gallery) => {
          const imageCount = await db.execute(
            sql`SELECT COUNT(*) as count FROM images WHERE gallery_id = ${gallery.id}`
          );

          const thumbnailImage = await db.query.images.findFirst({
            where: eq(images.galleryId, gallery.id),
            orderBy: (images, { asc }) => [asc(images.position)]
          });

          return {
            ...gallery,
            thumbnailUrl: thumbnailImage?.url || null,
            imageCount: parseInt(imageCount.rows[0].count.toString(), 10)
          };
        })
      );

      res.json(galleriesWithDetails);
    } catch (error) {
      console.error('Failed to fetch recent galleries:', error);
      res.status(500).json({ message: 'Failed to fetch recent galleries' });
    }
  });

  app.use('/api', protectedRouter);

  const httpServer = createServer(app);
  return httpServer;
}

function generateSlug(): string {
  // Generate a URL-friendly unique identifier
  // Using a shorter length (10) for more readable URLs while maintaining uniqueness
  return nanoid(10);
}