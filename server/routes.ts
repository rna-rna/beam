
import express, { Express } from 'express';
import { createServer } from 'http';
import multer from 'multer';
import path from 'path';
import { and, eq } from 'drizzle-orm';
import { db } from '@db';
import { galleries, images, stars, comments } from '@db/schema';
import { pusher } from './pusherConfig';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { extractUserInfo } from './auth';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

export const registerRoutes = (app: Express) => {
  const server = createServer(app);
  
  // API Routes
  app.get('/api/galleries/current', ClerkExpressRequireAuth(), async (req, res) => {
    const userInfo = extractUserInfo(req);
    const userGalleries = await db.select().from(galleries).where(eq(galleries.userId, userInfo.userId));
    res.json(userGalleries);
  });

  // Add your other routes here...
  
  return server;
};
