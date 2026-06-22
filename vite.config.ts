import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' makes all asset URLs relative so the app works whether it is served
// from a domain root (e.g. Vercel) or a subpath (e.g. GitHub Pages /<repo>/).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the SW manually in main.tsx so we can force a reload as soon
      // as a new version is available (otherwise the old page lingers until the
      // next manual refresh).
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg', 'pwa-64x64.png'],
      manifest: {
        name: 'ACGME Case Logger',
        short_name: 'Case Log',
        description: 'Log de-identified operative cases. No PHI.',
        theme_color: '#0f172a',
        background_color: '#0b1120',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: true },
    }),
  ],
})
