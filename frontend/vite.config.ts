/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Pas de @types/node dans ce projet : seule la variable API_URL est lue.
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      // shortcut: service worker non minifié (la minification Workbox manque de mémoire sur le poste de dev), repasser en 'production' sur un poste normal.
      mode: 'development',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Agri-Digit Bénin',
        short_name: 'Agri-Digit',
        description: 'Prototype de démonstration, données non officielles',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#F3F7EE',
        theme_color: '#0E2F1C',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: process.env.API_URL ?? 'http://127.0.0.1:8000', changeOrigin: false } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
  },
});
