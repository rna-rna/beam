import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { galleries, images, comments, stars } from '@db/schema';
import { eq, and, sql, inArray, or, desc } from 'drizzle-orm';
import { setupClerkAuth, extractUserInfo } from './auth';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { invites } from '@db/schema';
import { nanoid } from 'nanoid';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from 'sharp';

// Replace with your actual bucket name and endpoint
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;

const r2Client = new S3Client({
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
  region: 'auto'
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

// Configure multer with Cloudinary storage
// import { CloudinaryStorage } from 'multer-storage-cloudinary';
// import { cloudinary } from './lib/cloudinary';

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'galleries',
//     format: async (req, file) => 'jpg',
//     public_id: (req, file) => `${Date.now()}-${file.originalname.split('.')[0]}`,
//     transformation: [{ width: 1600, crop: "limit" }]
//   },
// });

const upload = multer({
  // storage,
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

      const userGalleries = await db.query.galleries.findMany({
        where: eq(galleries.userId, userId),
        orderBy: (galleries, { desc }) => [desc(galleries.createdAt)],
        with: {
          images: {
            orderBy: (images, { asc }) => [asc(images.position), asc(images.createdAt)],
            limit: 1  // Fetch only the first image as thumbnail
          }
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

  // Function to generate OG image
  async function generateOgImage(galleryId: string, imagePath: string) {
    // const overlay = 'beam-bar_q6desn';
    // const uploadResponse = await cloudinary.uploader.upload(imagePath, {
    //   eager: [{
    //     width: 1200,
    //     height: 630,
    //     crop: 'limit',
    //     overlay: overlay,
    //     gravity: 'center',
    //     fetch_format: 'auto',
    //     quality: 'auto',
    //   }],
    //   public_id: `og_gallery_${galleryId}`,
    //   overwrite: true,
    // });
    // return uploadResponse.eager[0].secure_url;
    return null; // Placeholder - needs R2 equivalent
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
          // Upload first image with OG optimization
          // const uploadResponse = await cloudinary.uploader.upload(files[0].path, {
          //   transformation: [{
          //     width: 1200,
          //     height: 630,
          //     crop: 'fill',
          //     gravity: "auto",
          //     overlay: 'beam-bar_q6desn',
          //     color: 'rgb:151515',
          //     fetch_format: 'auto',
          //     quality: 'auto'
          //   }],
          //   public_id: `og_gallery_${slug}`,
          //   folder: 'galleries/og'
          // });
          // ogImageUrl = uploadResponse.secure_url;
          const imageUploads = await Promise.all(
            files.map(async (file) => {
              const fileName = `galleries/${slug}/${Date.now()}-${file.originalname}`;

              // Get image dimensions using Sharp
              const metadata = await sharp(file.buffer).metadata();

              await r2Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
              }));

              return {
                url: `${process.env.VITE_R2_PUBLIC_URL}/${fileName}`,
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
        ogImageUrl
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

  // Add images to gallery (supports both guest and authenticated uploads)
  app.post('/api/galleries/:slug/images', upload.array('images', 50), async (req: any, res) => {
    try {
      const gallery = await db.query.galleries.findFirst({
        where: eq(galleries.slug, req.params.slug)
      });

      if (!gallery) {
        return res.status(404).json({
          message: 'Gallery not found',
          error: 'NOT_FOUND',
        });
      }

      // Allow uploads for guest galleries or authenticated owners
      const userId = req.auth?.userId;
      if (!gallery.guestUpload && (!userId || userId !== gallery.userId)) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: 'No images uploaded' });
      }
      const imageUploads = await Promise.all(
        req.files.map(async (file) => {
          // Validate originalFilename
          if (!file.originalname) {
            throw new Error('Missing originalFilename in uploaded file');
          }

          const fileName = `galleries/${gallery.slug}/${Date.now()}-${file.originalname}`;

          // Get image dimensions using Sharp
          const metadata = await sharp(file.buffer).metadata();
          if (!metadata) {
            throw new Error('Failed to read image metadata');
          }

          await r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata: {
              originalFilename: file.originalname
            }
          }));

          return {
            galleryId: gallery.id,
            url: `${process.env.VITE_R2_PUBLIC_URL}/${fileName}`,
            publicId: fileName,
            originalFilename: file.originalname,
            width: metadata.width || 800,
            height: metadata.height || 600,
            createdAt: new Date()
          };
        })
      );

      await db.insert(images).values(imageUploads);
      res.json({
        success: true,
        images: imageUploads
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        message: 'Failed to upload images',
        details: error instanceof Error ? error.message : 'Unknown error'
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

      // Delete the gallery and all associated records
      await db.transaction(async (tx) => {
        // Delete recently viewed records first
        await tx.execute(
          sql`DELETE FROM recently_viewed_galleries WHERE gallery_id = ${gallery.id}`
        );

        // Delete all images in the gallery
        await tx.delete(images)
          .where(eq(images.galleryId, gallery.id));

        // Finally delete the gallery itself
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
        )
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

      // Fetch user data for all stars
      const imagesWithUserData = await Promise.all(
        imagesWithStars.map(async (img) => {
          const starsWithUserData = await Promise.all(
            img.stars.map(async (star) => {
              try {
                const user = await clerkClient.users.getUser(star.userId);
                return {
                  ...star,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  imageUrl: user.imageUrl
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
        url: img.url,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        publicId: img.publicId,
        slug: gallery.slug,
        originalFilename: img.originalFilename,
        userStarred: img.stars.some(star => star.userId === req.auth?.userId),
        stars: img.stars,
        commentCount: commentCounts.find(c => c.imageId === img.id)?.count || 0
      }));

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
        ogImageUrl
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

      // Check if the user already starred this image
      const existingStar = await db.query.stars.findFirst({
        where: and(
          eq(stars.userId, userId),
          eq(stars.imageId, imageId)
        )
      });

      if (existingStar) {
        // Remove the star if it exists
        await db.delete(stars)
          .where(and(
            eq(stars.userId, userId),
            eq(stars.imageId, imageId)
          ));
        return res.json({
          success: true,
          message: "Star removed",
          isStarred: false
        });
      }

      // Add a new star if not starred
      const [star] = await db.insert(stars)
        .values({ userId, imageId })
        .returning();

      res.json({
        success: true,
        data: star,
        message: "Star added",
        isStarred: true
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

      // Fetch user data from Clerk for each star
      const starsWithUserData = await Promise.all(
        starData.map(async (star) => {
          try {
            const user = await clerkClient.users.getUser(star.userId);
            return {
              ...star,
              user: {
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl
              }
            };
          } catch (error) {
            console.error(`Failed to fetch user data for userId: ${star.userId}`, error);
            return {
              ...star,
              user: {
                firstName: null,
                lastName: null,
                imageUrl: null
              }
            };
          }
        })
      );

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

      const permissions = await db.query.invites.findMany({
        where: eq(invites.galleryId, gallery.id)
      });

      // Get user details from Clerk for each invite and the owner
      const usersWithDetails = await Promise.all(
        permissions.map(async (invite) => {
          if (invite.userId) {
            try {
              const user = await clerkClient.users.getUser(invite.userId);
              return {
                id: invite.id,
                email: invite.email,
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                role: invite.role,
                avatarUrl: user.imageUrl
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
        userId: matchingUser?.id,
        primaryEmail: matchingUser?.emailAddresses.find(
          (e) => e.id === matchingUser.primaryEmailAddressId
        )?.emailAddress,
        allEmails: matchingUser?.emailAddresses.map((e) => e.emailAddress)
      });

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