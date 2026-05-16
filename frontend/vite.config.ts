import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,webmanifest}'],
      },
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'Petsitter',
        short_name: 'Petsitter',
        description: 'A calm, custom PWA for whoever is taking care of your pets.',
        theme_color: '#FAF7F2',
        background_color: '#FAF7F2',
        display: 'standalone',
        start_url: '/today',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3032', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3032', changeOrigin: true },
    },
  },
});
