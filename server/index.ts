import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import './cleanup-deleted';
import { setupVite, serveStatic, log } from "./vite";
import pusherAuthRouter from "./routes/pusherAuth";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { Server } from 'socket.io';
import http from 'http';

// Validate environment variables
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required. Please add it to your environment variables.');
}

if (!process.env.CLERK_PUBLISHABLE_KEY) {
  throw new Error('CLERK_PUBLISHABLE_KEY is required. Please add it to your environment variables.');
}

// Log R2 environment variables
console.log('Environment Variables:', {
  VITE_R2_PUBLIC_URL: process.env.VITE_R2_PUBLIC_URL,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
});

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : true,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  path: '/socket.io'
});

io.on('connection', (socket) => {
  console.log('User connected:', {
    socketId: socket.id,
    headers: socket.handshake.headers,
    origin: socket.handshake.headers.origin,
    address: socket.handshake.address,
    time: new Date().toISOString()
  });

  // Join user-specific room for notifications
  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`Socket ${socket.id} joined user room: user:${userId}`);
  }

  socket.on('join-gallery', (gallerySlug) => {
    socket.join(gallerySlug);
    console.log(`Socket ${socket.id} joined gallery: ${gallerySlug}`);
  });

  socket.on('leave-gallery', (gallerySlug) => {
    socket.leave(gallerySlug);
    console.log(`Socket ${socket.id} left gallery: ${gallerySlug}`);
  });

  socket.on('cursor-update', (cursorData) => {
    const { gallerySlug, ...cursorInfo } = cursorData;
    if (!gallerySlug) return;

    console.log('Cursor update:', {
      socketId: socket.id,
      userId: cursorInfo.id,
      position: { x: cursorInfo.x, y: cursorInfo.y },
      color: cursorInfo.color,
      gallery: gallerySlug
    });
    
    // Relay only to others in the same gallery
    socket.to(gallerySlug).emit('cursor-update', cursorInfo);
  });

  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', {
      socketId: socket.id,
      reason,
      time: new Date().toISOString()
    });
  });
});

// Enable CORS with comprehensive options
app.use(cors({
  origin: process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Pusher-Library', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("Params:", req.params);
  next();
});

// Ensure Pusher auth route is handled before static files
app.use(pusherAuthRouter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Global error handler caught:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (status === 401) {
      return res.status(401).json({ 
        message: "Authentication required",
        details: "Please sign in to continue"
      });
    }

    res.status(status).json({ message, details: err.details });
  });

  // Setup Vite or serve static files
  if (app.get("env") === "development") {
    // Pass environment variables to the frontend
    process.env.VITE_CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;

    // Log the environment variable to verify it's set
    console.log('Setting VITE_CLERK_PUBLISHABLE_KEY for frontend...');
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
  });
})();