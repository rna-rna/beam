import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import pusherAuthRouter from "./routes/pusherAuth";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

// Validate environment variables
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required. Please add it to your environment variables.');
}

if (!process.env.CLERK_PUBLISHABLE_KEY) {
  throw new Error('CLERK_PUBLISHABLE_KEY is required. Please add it to your environment variables.');
}

const app = express();

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
app.use('/api/pusher', pusherAuthRouter);

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
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();