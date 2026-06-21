import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// PWA config: installable to the iOS home screen, launches full-screen
// (display: standalone), works offline via a Workbox service worker.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg', 'pwa-64x64.png'],
      manifest: {
        name: 'ACGME Case Logger',
        short_name: 'Case Log',
        description: 'Log de-identified operative cases. No PHI.',
        theme_color: '#0f172a',
        background_color: '#0b1120',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
      },
      // Lets the service worker run during `npm run dev` for PWA testing.
      devOptions: { enabled: true },
    }),
  ],
})
