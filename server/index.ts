import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { clerkClient, ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required. Please add it to your environment variables.');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add Clerk webhook signing middleware
app.use((req, res, next) => {
  // Skip webhook verification in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Verify webhook signatures in production
  if (req.path.startsWith('/api/webhooks')) {
    const sig = req.headers['svix-signature'];
    const timestamp = req.headers['svix-timestamp'];
    const body = req.body;

    try {
      clerkClient.webhooks.verify(body, {
        signature: sig as string,
        timestamp: timestamp as string,
      });
    } catch (err) {
      console.error('Invalid webhook signature:', err);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }
  next();
});

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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();