import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates PWA icons (incl. iOS apple-touch-icon + maskable) from one source.
// Run: npm run generate-pwa-assets  → outputs PNGs/ico into public/.
// Replace public/logo.svg with real artwork and re-run to rebrand.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})
