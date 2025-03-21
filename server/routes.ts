import { fetchCachedUserData, fetchUserAvatarData } from './lib/userCache';

import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { galleries, images, comments, stars, folders, galleryFolders, notifications, contacts, cachedUsers, commentReactions, recentlyViewedGalleries } from '@db/schema';
import { eq, and, sql, inArray, or, desc, isNull, isNotNull } from 'drizzle-orm';
import { setupClerkAuth, extractUserInfo } from './auth';
import { getEditorUserIds } from './utils';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { invites } from '@db/schema';
import { sendInviteEmail, sendMagicLinkEmail } from './lib/emails';
import { nanoid } from 'nanoid';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from 'sharp';
import { pusher } from './pusherConfig';
import { getGalleryUserRole, canManageGallery, canStar } from './lib/roles';

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

  // Clerk webhook handler
  app.post("/clerk-webhook", express.json(), async (req, res) => {
    try {
      const event = req.body;

      if (event.type === "user.created") {
        const userId = event.data.id;

        // Fetch current user data directly from Clerk
        const clerkUser = await clerkClient.users.getUser(userId);
        const existingColor = clerkUser.publicMetadata?.color;

        console.log("New user created via Clerk webhook:", {
          userId,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          existingColor,
          timestamp: new Date().toISOString()
        });

        // Only assign color if this is truly a new user without a color
        let userColor = existingColor;
        if (!existingColor) {
          const palette = ["#F44336","#E91E63","#9C27B0","#3AB79C","#A7DE43","#F84CCF"];
          userColor = palette[Math.floor(Math.random() * palette.length)];

          // Set initial color in Clerk
          await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
              color: userColor
            }
          });
        }

        // Cache the user data in our database with the synchronized color
        await db.insert(cachedUsers).values({
          userId,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          imageUrl: clerkUser.imageUrl || null,
          color: userColor,
          updatedAt: new Date()
        });

        // Update any pending invites for this user's email
        const newUserEmail = clerkUser.emailAddresses[0].emailAddress.toLowerCase();
        await db.update(invites)
          .set({ userId })
          .where(
            and(
              eq(invites.email, newUserEmail),
              sql`${invites.userId} IS NULL`
            )
          );

        console.log(`Updated invites for ${newUserEmail} with userId ${userId}`);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to process clerk webhook:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = (page - 1) * limit;

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
        },
        limit,
        offset
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

      // Tracking can be added server-side here if needed
      // This would require a server-side implementation of analytics

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


  // Get trashed galleries
  protectedRouter.get('/trash', async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      const trashedGalleries = await db.query.galleries.findMany({
        where: and(
          eq(galleries.userId, userId),
          isNotNull(galleries.deletedAt)
        ),
        with: {
          images: {
            limit: 1,
            orderBy: (images, { asc }) => [asc(images.position)]
          }
        },
        orderBy: (galleries, { desc }) => [desc(galleries.deletedAt)]
      });

      // Get image counts for each gallery
      const galleriesWithCounts = await Promise.all(
        trashedGalleries.map(async (gallery) => {
          const imageCount = await db.execute(
            sql`SELECT COUNT(*) as count FROM images WHERE gallery_id = ${gallery.id}`
          );
          return {
            ...gallery,
            imageCount: parseInt(imageCount.rows[0].count.toString(), 10)
          };
        })
      );

      res.json(galleriesWithCounts);
    } catch (error) {
      console.error('Failed to fetch trash:', error);
      res.status(500).json({ message: 'Failed to fetch trash' });
    }
  });

  // Restore gallery from trash
  protectedRouter.post('/galleries/:slug/restore', async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      const [restored] = await db.update(galleries)
        .set({ deletedAt: null })
        .where(and(
          eq(galleries.slug, req.params.slug),
          eq(galleries.userId, userId)
        ))
        .returning();

      if (!restored) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      res.json({ success: true, gallery: restored });
    } catch (error) {
      console.error('Failed to restore gallery:', error);
      res.status(500).json({ message: 'Failed to restore gallery' });
    }
  });

  // Permanently delete gallery
  protectedRouter.delete('/galleries/:slug/permanent-delete', async (req: any, res) => {
    try {
      const userId = req.auth.userId;

      // First verify the gallery is trashed and owned by user
      const gallery = await db.query.galleries.findFirst({
        where: and(
          eq(galleries.slug, req.params.slug),
          eq(galleries.userId, userId),
          isNotNull(galleries.deletedAt)
        )
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Delete associated images and gallery
      await db.transaction(async (tx) => {
        await tx.delete(images)
          .where(eq(images.galleryId, gallery.id));

        await tx.delete(galleries)
          .where(eq(galleries.id, gallery.id));
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to permanently delete gallery:', error);
      res.status(500).json({ message: 'Failed to permanently delete gallery' });
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
      const role = await getGalleryUserRole(gallery.id, req.auth?.userId);
      if (!gallery.guestUpload && !canManageGallery(role)) {
        return res.status(403).json({ message: 'Forbidden - cannot upload images' });
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

            // Emit real-time event via Pusher only
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

      if (!title || typeof title !== 'string') {        return res.status(400).json({ message: 'Invalid title' });
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

      // Find the gallery first
      const gallery= await db.query.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug)
      });

      const role = await getGalleryUserRole(gallery.id, req.auth.userId);
      if (!canManageGallery(role)) {
        return res.status(403).json({ message: 'Forbidden - cannot delete images' });
      }

      // Validate image ownership
      const galleryImages = await db.query.images.findMany({
        where: eq(images.galleryId, gallery.id),      });

      const validImageIds = newSet(galleryImages.map(img => img.id));      const invalidIds = imageIds.filter(id => !validImageIds.has(id));

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
          eq(galleries.userId, userId),
          isNull(galleries.deletedAt)
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

      // Soft delete by setting deletedAt timestamp
      const [updated] = await db.update(galleries)
        .set({ deletedAt: new Date() })
        .where(eq(galleries.id, gallery.id))
        .returning();

      res.json({ success: true, gallery: updated });
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

      // Find the gallery by slug only
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug),
        select: {
          id: true,
          slug: true,
          title: true,
          isPublic: true,
          userId: true,
          guestUpload: true,
          createdAt: true,
          isDraft: true
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

      // Check access permissions
      if (!gallery.guestUpload && !gallery.isPublic && !isOwner) {
        // Check for invite if not public/guest/owner
        const userEmail = req.auth?.userId ? 
          (await clerkClient.users.getUser(req.auth.userId)).emailAddresses[0].emailAddress : '';

        const invite = await db.query.invites.findFirst({
          where: and(
            eq(invites.galleryId, gallery.id),
            eq(invites.email, userEmail)
          )
        });

        if (!invite) {
          return res.status(403).json({
            message: 'This gallery is private',
            isPrivate: true,
            requiresAuth: !req.auth
          });
        }
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

      // Fetch user data for all stars
      const imagesWithUserData = await Promise.all(
        imagesWithStars.map(async (img) => {
          const starsWithUserData = await Promise.all(
            img.stars.map(async (star) => {
              try {
                const [fetchedUser] = await fetchCachedUserData([star.userId]) || [];
                if (!fetchedUser) {
                  console.warn('No user found in cache for userId:', star.userId);
                  return {
                    ...star,
                    firstName: null,
                    lastName: null,
                    imageUrl: null
                  };
                }

                return {
                  ...star,
                  firstName: fetchedUser.firstName,
                  lastName: fetchedUser.lastName,
                  imageUrl: fetchedUser.imageUrl
                };
              } catch (error) {
                console.error(`Failed to fetch user data for userId: ${star.userId}`, error);
                return {
                  ...star,
                  firstName: null,
                  lastName: null,
                  imageUrl: null
                };
              }
            })
          );
          return {
            ...img,
            stars: starsWithUserData
          };
        })
      );

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
      console.log("Comment Request params:", req.params);
      console.log("Comment Request body:", req.body);

      const { content, xPosition, yPosition, parentId } = req.body;
      const imageId = parseInt(req.params.imageId);

      if (!imageId) {
        console.error("Invalid imageId:", req.params.imageId);
        return res.status(400).json({ 
          success: false, 
          message: "Image ID is missing or invalid" 
        });
      }

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

      // Validate parentId if provided
      if (parentId) {
        const parentComment = await db.query.comments.findFirst({
          where: eq(comments.id, parentId)
        });

        if (!parentComment) {
          return res.status(404).json({
            success: false,
            message: 'Parent comment not found'
          });
        }

        if (parentComment.imageId !== imageId) {
          return res.status(400).json({
            success: false,
            message: 'Parent comment does not belong to this image'
          });
        }

        // Prevent nested replies (only allow one level deep)
        if (parentComment.parentId) {
          return res.status(400).json({
            success: false,
            message: 'Nested replies are not allowed'
          });
        }
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
        // Only log essential info
        console.log('Creating comment:', {
          imageId,
          hasParent: !!parentId
        });

        // Validate user info
        if (!userId || !userName) {
          return res.status(400).json({
            success: false,
            message: 'Invalid user information'
          });
        }

        // Create the comment
        // Get cached user data for color
        const [cachedUser] = await fetchCachedUserData([userId]);

        const [comment] = await db.insert(comments)
          .values({
            imageId,
            content,
            xPosition,
            yPosition,
            parentId: parentId || null,
            userId,
            userName,
            userImageUrl: userImageUrl || null,
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

        // Create notifications for all editors except the commenter
        await Promise.all(
          editorUserIds
            .filter(editorId => editorId !== userId)
            .map((editorId) => 
              db.insert(notifications).values({
                userId: editorId,
                type: 'comment',
                data: {
                  actorName: userName,
                  actorAvatar: userImageUrl,
                  actorColor: cachedUser?.color,
                  galleryId: image.gallery.id,
                  galleryTitle: image.gallery.title,
                  snippet: content.slice(0, 100)
                },
                isSeen: false,
                createdAt: new Date()
              })
            )
        );

        // Add user color to response
        const commentWithColor = {
          ...comment,
          userColor: cachedUser?.color || '#ccc'
        };

        // Emit real-time event via Pusher with color
        pusher.trigger(`presence-gallery-${image.gallery.slug}`, 'comment-added', {
          ...commentWithColor,
          timestamp: new Date().toISOString()
        });

        console.log('Debug - Comment created successfully:', {
          commentId: comment.id,
          userId,
          imageId
        });

        return res.status(201).json({
          success: true,
          data: commentWithColor
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
      const imageId = parseInt(req.params.imageId);

      // Get parent comments first
      const parentComments = await db.query.comments.findMany({
        where: and(
          eq(comments.imageId, imageId),
          sql`${comments.parentId} IS NULL`
        ),
        orderBy: (comments, { asc }) => [asc(comments.createdAt)]
      });

      // Get all replies
      const replies = await db.query.comments.findMany({
        where: and(
          eq(comments.imageId, imageId),
          sql`${comments.parentId} IS NOT NULL`
        ),
        orderBy: (comments, { asc }) => [asc(comments.createdAt)]
      });

      // Get all unique user IDs from both parents and replies
      const userIds = [...new Set([...parentComments, ...replies].map(comment => comment.userId))];
      const cachedUsers = await fetchCachedUserData(userIds);

      // Helper function to enrich comment with user data
      const enrichCommentWithUser = (comment) => {
        const user = cachedUsers.find(u => u.userId === comment.userId);
        return {
          ...comment,
          author: {
            id: comment.userId,
            username: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown User',
            imageUrl: user?.imageUrl,
            color: user?.color || '#ccc',
            firstName: user?.firstName,
            lastName: user?.lastName
          }
        };
      };

      // Process parent comments and their replies
      const threadedComments = await Promise.all(parentComments.map(async parent => {
        const parentWithUser = enrichCommentWithUser(parent);

        // Get reactions for parent comment
        const parentReactions = await db.query.commentReactions.findMany({
          where: eq(commentReactions.commentId, parent.id)
        });

        // Group parent reactions
        const groupedParentReactions = parentReactions.reduce((acc, reaction) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = { emoji: reaction.emoji, count: 0, userIds: [] };
          }
          acc[reaction.emoji].count++;
          acc[reaction.emoji].userIds.push(reaction.userId);
          return acc;
        }, {} as Record<string, {emoji: string, count: number, userIds: string[]}>);

        // Get and enrich replies with reactions
        const repliesWithReactions = await Promise.all(
          replies
            .filter(reply => reply.parentId === parent.id)
            .map(async reply => {
              const enrichedReply = enrichCommentWithUser(reply);

              // Get reactions for this reply
              const replyReactions = await db.query.commentReactions.findMany({
                where: eq(commentReactions.commentId, reply.id)
              });

              // Group reply reactions
              const groupedReplyReactions = replyReactions.reduce((acc, reaction) => {
                if (!acc[reaction.emoji]) {
                  acc[reaction.emoji] = { emoji: reaction.emoji, count: 0, userIds: [] };
                }
                acc[reaction.emoji].count++;
                acc[reaction.emoji].userIds.push(reaction.userId);
                return acc;
              }, {} as Record<string, {emoji: string, count: number, userIds: string[]}>);

              return {
                ...enrichedReply,
                reactions: Object.values(groupedReplyReactions)
              };
            })
        );

        return {
          ...parentWithUser,
          replies: repliesWithReactions,
          reactions: Object.values(groupedParentReactions)
        };
      }));

      res.json(threadedComments);
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

      const role = await getGalleryUserRole(image.gallery.id, userId);
      console.log('Star request role check:', {
        userId,
        galleryId: image.gallery.id,
        role,
        canStar: canStar(role)
      });

      // Allow starring if user has explicit invite or gallery is public
      if (!canStar(role) && !image.gallery.isPublic) {
        return res.status(403).json({ message: 'Forbidden - cannot star' });
      }

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
          .values({ userId, imageId });
      }

      // Get all editor users for notifications
      const editorUserIds = await getEditorUserIds(image.gallery.id);

      // Get user data for notifications
      const [actorData] = await fetchCachedUserData([userId]);
      const actorName = actorData ? `${actorData.firstName || ''} ${actorData.lastName || ''}`.trim() : 'Unknown User';

      // Create notifications for editors and owners
      await Promise.all(
        editorUserIds
          .filter(editorId => editorId !== userId)
          .map(async (editorId) => {
            const recipientRole = await getGalleryUserRole(image.gallery.id, editorId);
            if (recipientRole === 'owner' || recipientRole === 'Edit') {
              await addStarNotification({
                recipientUserId: editorId,
                actorId: userId,
                actorName,
                actorAvatar: actorData?.imageUrl,
                imageId,
                galleryId: image.gallery.id,
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
  app.get('/api/galleries/:slug/starred', async (req, res) => {
    try {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug),
        with: {
          images: {
            columns: {
              id: true
            }
          }
        }
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      const imageIds = gallery.images.map(img => img.id);
      const userId = req.auth?.userId;

      const starData = await db.query.stars.findMany({
        where: inArray(stars.imageId, imageIds),
        orderBy: (stars, { desc }) => [desc(stars.createdAt)]
      });

      // Get unique user IDs and batch fetch user data
      const userIds = [...new Set(starData.map(star => star.userId))];
      const userData = await fetchCachedUserData(userIds);

      // Group stars by image ID with user data
      const groupedStars = starData.reduce((acc, star) => {
        const user = userData.find(u => u.userId === star.userId);
        const starWithUser = {
          ...star,
          user: {
            fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown User',
            imageUrl: user?.imageUrl,
            color: user?.color
          }
        };

        if (!acc[star.imageId]) {
          acc[star.imageId] = {
            stars: [],
            userStarred: false
          };
        }
        acc[star.imageId].stars.push(starWithUser);
        if (userId && star.userId === userId) {
          acc[star.imageId].userStarred = true;
        }
        return acc;
      }, {});

      res.json({
        success: true,
        data: groupedStars
      });
    } catch (error) {
      console.error('Error fetching gallery stars:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch gallery stars'
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

      const permissions = await db.query.invites.findMany({
        where: eq(invites.galleryId, gallery.id)
      });

      // Get user details from Clerk for each invite and the owner
      const usersWithDetails = await Promise.all(
        permissions.map(async (invite) => {
          if (invite.userId) {
            try {
              const cachedUsers = await fetchCachedUserData([invite.userId]);
              console.log('Debug - Cached user lookup:', {
                userId: invite.userId,
                found: cachedUsers.length > 0,
                userData: cachedUsers[0] || null
              });

              const user = cachedUsers[0];
              if (!user) {
                console.warn('No cached user data found for:', invite.userId);
                return {
                  id: invite.id,
                  email: invite.email,
                  fullName: null,
                  role: invite.role,
                  avatarUrl: null,
                  color: null
                };
              }
              return {
                id: invite.id,
                email: invite.email,
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                role: invite.role,
                avatarUrl: user.imageUrl,
                color: user.color
              };
            } catch (error) {
              console.error('Failed to fetch user details:', error);
            }
          }
          return {
            id: invite.id,
            email: invite.email,
            fullName: null,
            role: invite.role,
            avatarUrl: null
          };
        })
      );

      // Add owner with Editor role if not already in permissions
      if (gallery.userId !== 'guest') {
          try {
            const [ownerData] = await fetchCachedUserData([gallery.userId]);
            const ownerClerkData = await clerkClient.users.getUser(gallery.userId);
            const ownerEmail = ownerClerkData.emailAddresses[0]?.emailAddress;
                        const isOwnerInPermissions = usersWithDetails.some(u => u.email === ownerEmail);

            if (!isOwnerInPermissions && ownerEmail) {
              usersWithDetails.push({
                id: 'owner', 
                email: ownerEmail,
                fullName: `${ownerData.firstName || ''} ${ownerData.lastName || ''}`.trim(),
                role: 'Edit',
                avatarUrl: ownerData.imageUrl,
                color: ownerData.color
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
      console.log('Invite attempt:', { slug, email, role, userId });

      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, slug),
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Fetch inviter details from cached users
      const [inviterData] = await fetchCachedUserData([req.auth.userId]);
      if (!inviterData) {
        return res.status(404).json({ message: 'Inviter details not found' });
      }

      const inviterName = `${inviterData.firstName || ''} ${inviterData.lastName || ''}`.trim() || 'A Beam User';

      // Get current user's email
      const currentUser = await clerkClient.users.getUser(req.auth.userId);
      const currentEmail = currentUser.emailAddresses[0].emailAddress.toLowerCase();

      if (email === currentEmail) {
        return res.status(400).json({ message: 'Cannot invite yourself' });
      }

      // Check if email is registered in Clerk using exact match
      const usersResponse = await clerkClient.users.getUserList({
        email_address: [email.toLowerCase()]
      });

      // Use first matched user if any
      const matchingUser = usersResponse?.data?.[0] || null;

      console.log("Matching user for invite email:", {
        email,
        matchingUser: matchingUser ? {
          id: matchingUser.id,
          primaryEmail: matchingUser.emailAddresses[0]?.emailAddress,
          emailsCount: matchingUser.emailAddresses.length
        } : null
      });

      // Generate invite token for unregistered users
      const inviteToken = nanoid(32);

      // Handle existing invite
      const existingInvite = await db.query.invites.findFirst({
        where: and(
          eq(invites.galleryId, gallery.id),
          eq(invites.email, email)
        )
      });

      if (existingInvite) {
        const updatePayload = { role };
        console.log("Updating existing invite:", {
          inviteId: existingInvite.id,
          payload: updatePayload
        });

        await db.update(invites)
          .set(updatePayload)
          .where(and(
            eq(invites.galleryId, gallery.id),
            eq(invites.email, email)
          ));
      } else {
        const insertPayload = {
          galleryId: gallery.id,
          email,
          userId: matchingUser ? matchingUser.id : null,
          role,
          token: matchingUser ? null : inviteToken
        };

        console.log("Inserting new invite with payload:", insertPayload);

        await db.insert(invites).values(insertPayload);
      }

      // Upsert contact record
      const existingContact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.ownerUserId, req.auth.userId),
          eq(contacts.contactEmail, email)
        )
      });

      if (existingContact) {
        await db.update(contacts)
          .set({
            inviteCount: existingContact.inviteCount + 1,
            lastInvitedAt: new Date(),
            contactUserId: matchingUser?.id || null
          })
          .where(eq(contacts.id, existingContact.id));
      } else {
        await db.insert(contacts).values({
          ownerUserId: req.auth.userId,
          contactUserId: matchingUser?.id || null,
          contactEmail: email,
          inviteCount: 1,
          lastInvitedAt: new Date()
        });
      }

      // Fetch thumbnail
      const thumbnail = await db.query.images.findFirst({
        where: eq(images.galleryId, gallery.id),
        orderBy: (images, { asc }) => [asc(images.position)]
      });

      const baseUrl = process.env.VITE_APP_URL || `https://${req.headers.host}`;

      if (matchingUser) {
        // Registered user flow
        await sendInviteEmail({
          toEmail: email,
          galleryTitle: gallery.title || 'Untitled Gallery',
          inviteUrl: `${baseUrl}/g/${gallery.slug}`,
          photographerName: inviterName,
          recipientName: email.split('@')[0],
          isRegistered: true,
          role,
          galleryThumbnail: thumbnail?.url || null
        });

        // Create notification
        await db.insert(notifications).values({
          userId: matchingUser.id,
          type: "gallery-invite",
          data: {
            actorName: inviterName,
            actorAvatar: inviterData?.imageUrl,
            actorColor: inviterData?.color,
            galleryId: gallery.id,
            galleryTitle: gallery.title,
            role,
            gallerySlug: gallery.slug
          },
          isSeen: false,
          createdAt: new Date()
        });

        // Real-time notification
        pusher.trigger(`private-user-${matchingUser.id}`, "notification", {
          type: "gallery-invite",
          actorName: inviterName,
          galleryTitle: gallery.title
        });
      } else {
        // Unregistered user flow - send magic link
        const signUpMagicLink = `${baseUrl}/sign-up?email=${encodeURIComponent(email)}&inviteToken=${inviteToken}&gallery=${slug}`;

        await sendMagicLinkEmail({
          toEmail: email,
          galleryTitle: gallery.title || 'Untitled Gallery',
          signUpUrl: signUpMagicLink,
          photographerName: inviterName,
          role,
          galleryThumbnail: thumbnail?.url || null
        });
      }

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
          eq(invites.userId, userId)
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
  protectedRouter.get('/users/search', async (req, res) => {
    try {
      const currentUserId = req.auth.userId;
      const email = req.query.email?.toString().toLowerCase() || "";

      // Quick short-circuit if < 3 chars typed
      if (email.length < 3) {
        return res.json({ success: true, users: [] });
      }

      // Query contacts table with partial email match
      const matches = await db.query.contacts.findMany({
        where: and(
          eq(contacts.ownerUserId, currentUserId),
          sql`${contacts.contactEmail} ILIKE ${'%' + email + '%'}`
        ),
        limit: 5,
        with: {
          contact: true
        }
      });

      // Map contacts to user format
      const users = matches.map(contact => ({
        id: contact.contactUserId || contact.contactEmail,
        email: contact.contactEmail,
        fullName: contact.contact ? 
          `${contact.contact.firstName || ''} ${contact.contact.lastName || ''}`.trim() :
          contact.contactEmail.split("@")[0],
        avatarUrl: contact.contact?.imageUrl || null
      }));

      // Check if it's a valid email for direct Clerk lookup
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (isValidEmail) {
        try {
          const clerkUsers = await clerkClient.users.getUserList({
            emailAddress: [email]
          });

          const exactUser = (clerkUsers.data || []).find(user => 
            user.emailAddresses.some(e => 
              e.emailAddress.toLowerCase() === email
            )
          );

          if (exactUser && !users.some(u => u.email === email)) {
            const primaryEmail = exactUser.emailAddresses.find(
              e => e.id === exactUser.primaryEmailAddressId
            )?.emailAddress;

            users.push({
              id: exactUser.id,
              email: primaryEmail || email,
              fullName: `${exactUser.firstName || ''} ${exactUser.lastName || ''}`.trim(),
              avatarUrl: exactUser.imageUrl
            });
          }
        } catch (error) {
          console.error('Clerk user lookup error:', error);
          // Continue without Clerk results if lookup fails
        }
      }

      return res.json({ success: true, users });
    } catch (error) {
      console.error('Search contacts error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to search contacts',
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

      console.log('[API] Fetched folders for user:', userId);
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
    const folderId = parseInt(req.params.id);

    try {
      // First update all galleries to remove the folder reference
      await db.update(galleries)
        .set({ folderId: null })
        .where(eq(galleries.folderId, folderId));

      // Then delete the folder
      await db.delete(folders).where(eq(folders.id, folderId));
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete folder:', error);
      res.status(500).json({ message: "Failed to delete folder" });
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



  // Public endpoint for magic link landing page
  app.get('/api/public/galleries/:slug', async (req, res) => {
    try {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug),
        select: {
          id: true,
          slug: true,
          title: true,
          ogImageUrl: true,
        }
      });

      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      res.json(gallery);
    } catch (error) {
      console.error('Public gallery fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch gallery' });
    }
  });

  // Track gallery views
  protectedRouter.post('/galleries/:slug/view', async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const slug = req.params.slug;
      console.log("[VIEW ROUTE] Recording view for gallery:", { 
        slug, 
        userId, 
        timestamp: new Date().toISOString(),
        hasAuth: !!req.auth
      });

      // Find the gallery record first
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, slug)
      });

      if (!gallery) {
        console.log("[VIEW ROUTE] Gallery not found:", slug);
        return res.status(404).json({ message: 'Gallery not found' });
      }

      // Check if a recent view record already exists
      const existingRecord = await db.query.recentlyViewedGalleries.findFirst({
        where: and(
          eq(recentlyViewedGalleries.userId, userId),
          eq(recentlyViewedGalleries.galleryId, gallery.id)
        )
      });

      let viewRecord;
      if (existingRecord) {
        // Update existing record's timestamp
        [viewRecord] = await db.update(recentlyViewedGalleries)
          .set({ viewedAt: new Date() })
          .where(eq(recentlyViewedGalleries.id, existingRecord.id))
          .returning();
        console.log("[VIEW ROUTE] Updated existing view record:", viewRecord);
      } else {
        // Insert new record
        [viewRecord] = await db.insert(recentlyViewedGalleries)
          .values({
            userId: userId,
            galleryId: gallery.id,
            viewedAt: new Date()
          })
          .returning();
        console.log("[VIEW ROUTE] Created new view record:", viewRecord);
      }

      // Update gallery's global lastViewedAt field
      const [updated] = await db.update(galleries)
        .set({ lastViewedAt: new Date() })
        .where(eq(galleries.slug, slug))
        .returning();

      console.log("[VIEW ROUTE] Updated gallery record:", updated);
      res.json(updated);
    } catch (error) {
      console.error('Failed to record view:', error);
      res.status(500).json({ message: 'Failed to record gallery view' });
    }
  });

  // Get recent galleries for current user
  protectedRouter.get('/recent-galleries', async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      console.log('[API] Fetching recent galleries for user:', userId);

      // Query the recently_viewed_galleries table for this user
      const recentViews = await db.query.recentlyViewedGalleries.findMany({
        where: eq(recentlyViewedGalleries.userId, userId),
        orderBy: (tbl, { desc }) => [desc(tbl.viewedAt)],
        limit: 10,
      });

      // Extract the gallery IDs from the recent views
      const galleryIds = recentViews.map(view => view.galleryId);
      console.log('[API] Found recent gallery IDs:', galleryIds);

      // If there are no recent views, return an empty list
      if (galleryIds.length === 0) {
        return res.json([]);
      }

      // Query the galleries table to get gallery details for these IDs
      const galleriesData = await db.query.galleries.findMany({
        where: and(
          inArray(galleries.id, galleryIds),
          isNull(galleries.deletedAt)
        ),
        select: {
          id: true,
          title: true,
          slug: true,
          isPublic: true,
          userId: true,
          guestUpload: true,
          createdAt: true,
          isDraft: true,
          lastViewedAt: true,
        }
      });

      // Reorder the galleries to match the order of recent views
      const sortedGalleries = galleryIds
        .map(id => galleriesData.find(gallery => gallery.id === id))
        .filter(Boolean);

      // For each gallery, get additional details (thumbnail and image count)
      const galleriesWithDetails = await Promise.all(
        sortedGalleries.map(async (gallery) => {
          // Query image count for this gallery
          const imageCountResult = await db.execute(
            sql`SELECT COUNT(*) as count FROM images WHERE gallery_id = ${gallery.id}`
          );
          const imageCount = parseInt(imageCountResult.rows[0].count.toString(), 10);

          // Find the first image (thumbnail) for this gallery
          const thumbnailImage = await db.query.images.findFirst({
            where: eq(images.galleryId, gallery.id),
            orderBy: (images, { asc }) => [asc(images.position)]
          });

          return {
            ...gallery,
            thumbnailUrl: thumbnailImage?.url || null,
            imageCount,
            isOwner: gallery.userId === userId
          };
        })
      );

      // Fetch user data for all galleries
      const userIds = [...new Set(galleriesWithDetails.map(g => g.userId))];
      const userData = await fetchCachedUserData(userIds);
      const userDataMap = new Map(userData.map(user => [user.userId, user]));

      const processedGalleries = galleriesWithDetails.map(gallery => {
        const ownerData = userDataMap.get(gallery.userId);
        return {
          ...gallery,
          sharedBy: gallery.userId === userId ? null : {
            firstName: ownerData?.firstName || null,
            lastName: ownerData?.lastName || null,
            imageUrl: ownerData?.imageUrl || null,
            color: ownerData?.color || null
          }
        };
      });

      res.json(processedGalleries);
    } catch (error) {
      console.error('[API] Error fetching recent galleries:', error);
      res.status(500).json({ message: 'Failed to fetch recent galleries' });
    }
  });

  // Reorder images (protected)
  protectedRouter.post('/galleries/:slug/reorder', async (req: any, res) => {
    try {
      const { order } = req.body;
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug)
      });
      const role = await getGalleryUserRole(gallery.id, req.auth.userId);
      if (!canManageGallery(role)) {
        return res.status(403).json({ message: 'Forbidden - cannot reorder images' });
      }
      if (!Array.isArray(order)) {
        return res.status(400).json({ message: 'Invalid order format' });
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

  // Update user role
  protectedRouter.patch('/galleries/:slug/permissions', async (req, res) => {
    const { email, role } = req.body;
    const { slug } = req.params;

    try {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, slug)
      });

      if (!gallery) {
        return res.status(404).json({ success: false, message: 'Gallery not found' });
      }

      const [updatedInvite] = await db.update(invites)
        .set({ role })
        .where(and(
          eq(invites.galleryId, gallery.id),
          eq(invites.email, email.toLowerCase())
        ))
        .returning();

      if (!updatedInvite) {
        return res.status(404).json({ success: false, message: 'Invite not found for that email' });
      }

      res.json({ success: true, message: 'Role updated successfully' });
    } catch (error) {
      console.error('Failed to update permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update permissions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Remove user from gallery
  protectedRouter.delete('/galleries/:slug/permissions', async (req, res) => {
    const { email } = req.body;
    const { slug } = req.params;

    try {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, slug)
      });

      if (!gallery) {
        return res.status(404).json({ success: false, message: 'Gallery not found' });
      }

      const result = await db.delete(invites).where(and(
        eq(invites.galleryId, gallery.id),
        eq(invites.email, email.toLowerCase())
      ));

      if (!result) {
        return res.status(404).json({ success: false, message: 'No invite found to remove' });
      }

      res.json({ success: true, message: 'User removed successfully' });
    } catch (error) {
      console.error('Failed to remove user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add reaction to comment
  app.post('/api/comments/:commentId/reactions', async (req: Request, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const { emoji } = req.body;

      if (!req.auth?.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          requiresAuth: true
        });
      }

      // Verify comment exists
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId)
      });

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Check if reaction already exists
      const existingReaction = await db.query.commentReactions.findFirst({
        where: and(
          eq(commentReactions.commentId, commentId),
          eq(commentReactions.userId, req.auth.userId),
          eq(commentReactions.emoji, emoji)
        )
      });

      if (existingReaction) {
        // Remove existing reaction
        await db.delete(commentReactions)
          .where(eq(commentReactions.id, existingReaction.id));

        res.json({
          success: true,
          message: 'Reaction removed',
          removed: true
        });
      } else {
        // Add new reaction
        const [reaction] = await db.insert(commentReactions)
          .values({
            commentId,
            userId: req.auth.userId,
            emoji,
            createdAt: new Date()
          })
          .returning();

        res.json({
          success: true,
          message: 'Reaction added',
          data: reaction
        });
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to handle reaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get cached user data for current user  
  app.get('/api/user/me', async (req, res) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const [cached] = await fetchCachedUserData([userId]);
      if (!cached) {
        return res.status(404).json({ error: 'No cached user found' });
      }

      res.json({
        userId: cached.userId,
        firstName: cached.firstName,
        lastName: cached.lastName,
        imageUrl: cached.imageUrl,
        color: cached.color,
      });
    } catch (error) {
      console.error('Failed to fetch cached user:', error);
      res.status(500).json({ error: 'Failed to fetch cached user' });
    }
  });

  // Get notifications endpoint
  protectedRouter.get("/notifications", async (req, res) => {
    try {
      const userId = req.auth.userId;
      const rows = await db.query.notifications.findMany({
        where: eq(notifications.userId, userId),
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
        limit: 10,
      });
      res.json(rows);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark all notifications as read endpoint
  protectedRouter.post("/notifications/mark-all-read", async (req, res) => {
    try {
      const userId = req.auth.userId;
      await db.update(notifications)
        .set({ isSeen: true })
        .where(eq(notifications.userId, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Magic link verification endpoint
  app.post("/auth/verify-magic-link", setupClerkAuth, async (req, res) => {
    const { inviteToken, email, gallerySlug } = req.body;
    const userId = req.auth.userId;

    console.log("Magic link verification - Auth details:", {
      userId,
      hasAuth: !!req.auth,
      email,
      inviteToken: inviteToken?.substring(0, 8) + '...',
      gallerySlug,
      timestamp: new Date().toISOString()
    });

    if (!userId) {
      console.error("Magic link verification failed - No userId in auth context");
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!inviteToken || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    // Validate gallery exists if slug provided
    if (gallerySlug) {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, gallerySlug)
      });

      if (!gallery) {
        return res.status(404).json({
          success: false,
          message: "Gallery not found"
        });
      }
    }

    try {
      // Find invite using token
      const invite = await db.query.invites.findFirst({
        where: eq(invites.token, inviteToken),
        with: { gallery: true }
      });

      if (!invite) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid or expired magic link" 
        });
      }

      console.log("Magic link verified:", { inviteToken, email, userId, invite });

      console.log("Magic link verification: userId from auth =", userId);
      console.log("Updating invite record:", {
        inviteId: invite.id,
        oldUserId: invite.userId,
        newUserId: userId,
        email: email.toLowerCase()
      });

      // Ensure the invite record has a user_id from auth context
      await db.update(invites)
        .set({ 
          userId,
          email: email.toLowerCase(),
          token: null // Remove token after use
        })
        .where(eq(invites.id, invite.id));

      //// Verify the update worked
      const updatedInvite = await db.query.invites.findFirst({
        where: eq(invites.id, invite.id)
      });

      console.log("Updated invite record:", updatedInvite);

      res.json({ 
        success: true,
        message: "Magic link verified successfully",
        gallerySlug: invite.gallery?.slug || null,
        role: invite.role
      });
    } catch (error) {
      console.error("Failed to verify magic link:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to verify magic link",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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
async function addStarNotification(data: {
  recipientUserId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string | null;
  imageId: number;
  galleryId: number;
}) {
  const existingNotification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.type,'image-starred'),
      eq(notifications.userId, data.recipientUserId),
      sql`${notifications.data}->>'imageId' = ${data.imageId}::text`,
      sql`${notifications.createdAt} >= NOW() - INTERVAL '5 seconds'`
    )
  });

  if (existingNotification) {
    await db.update(notifications)
      .set({
        createdAt: new Date(),
        data: {
          imageId: data.imageId,
          isStarred: true,
          actorId: data.actorId,
          galleryId: data.galleryId
        }
      })
      .where(eq(notifications.id, existingNotification.id));
  } else {
    const groupId = nanoid();
    await db.insert(notifications).values({
      userId: data.recipientUserId,
      type: 'image-starred',
      data: {
        imageId: data.imageId,
        isStarred: true,
        actorId: data.actorId,
        galleryId: data.galleryId,
        actorName: data.actorName,
        actorAvatar: data.actorAvatar
      },
      groupId,
      isSeen: false,
      createdAt: new Date()
    });
  }
}

export default registerRoutes;