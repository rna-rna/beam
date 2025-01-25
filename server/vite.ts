import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: viteLogger,
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  // Set up Pusher auth and API routes before Vite middleware
  app.use((req, res, next) => {
    // Skip Vite for API and Pusher routes
    if (req.url.startsWith('/api/') || req.url.startsWith('/pusher/')) {
      log(`API/Pusher Request: ${req.method} ${req.url}`);
      if (req.url.startsWith('/pusher/auth') && !req.headers['content-type']?.includes('application/json')) {
        req.headers['content-type'] = 'application/json';
      }
      return next();
    }

    // All other routes go through Vite
    log(`Non-API Request: ${req.method} ${req.url}`);
    vite.middlewares(req, res, next);
  });

  // Fallback should only handle non-API routes
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes in the fallback handler
    if (url.startsWith('/api/')) {
      return next();
    }

    try {
      const template = fs.readFileSync(
        path.resolve(__dirname, "..", "client", "index.html"),
        "utf-8"
      );
      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Handle API routes first in production too
  app.use('/api/*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    express.static(distPath)(req, res, next);
  });

  app.use(express.static(distPath));

  app.use("*", (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}