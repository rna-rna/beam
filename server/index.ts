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

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : true,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 25000,
  path: '/socket.io'
});

// Enable CORS
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

(async () => {
  // Register API routes first
  registerRoutes(app);

  // Then set up Vite middleware
  if (app.get("env") === "development") {
    process.env.VITE_CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;
    console.log('Setting VITE_CLERK_PUBLISHABLE_KEY for frontend...');
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

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

  const PORT = 5000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
  });
})();