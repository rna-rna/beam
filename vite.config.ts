
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    {
      name: 'inject-gallery-og',
      transformIndexHtml(html, { path }) {
        if (path.startsWith('/g/')) {
          const slug = path.split('/g/')[1];
          return html.replace(
            '</head>',
            `<meta property="og:image" content="https://res.cloudinary.com/dq7m5z3zf/image/upload/w_800,c_limit,q_auto,f_auto/l_beam-bar_q6desn,g_center,x_0,y_0/galleries/${slug}.jpg" />
            </head>`
          );
        }
        return html;
      },
    }
  ],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
