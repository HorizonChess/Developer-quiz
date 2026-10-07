import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Relative paths so the built app works from any folder or host.
  base: './',
  plugins: [
    react(),
    // Turns the site into an installable PWA: writes the manifest
    // and a service worker that caches files for offline use.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dev Interview Quiz',
        short_name: 'DevQuiz',
        description: 'Practice junior developer interview questions.',
        theme_color: '#4f46e5',
        background_color: '#f7f7fb',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
