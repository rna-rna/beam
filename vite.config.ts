
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      themePlugin(),
      createHtmlPlugin({
        inject: {
          data: {
            title: 'Gallery',
            description: 'Powered by Beam',
            ogImage: env.VITE_DEFAULT_OG_IMAGE,
            url: env.VITE_SITE_URL,
          },
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './client/src')
      }
    },
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    }
  };
});
