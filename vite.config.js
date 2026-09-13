import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/HyperShot/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'HyperShot',
        short_name: 'HyperShot',
        description: 'A fast 3D arena shooter built with Three.js.',
        start_url: '/HyperShot/',
        scope: '/HyperShot/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#05080d',
        theme_color: '#05080d',
        categories: ['games'],
        icons: [
          {
            src: '/HyperShot/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/HyperShot/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/HyperShot/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/HyperShot/index.html',
        cleanupOutdatedCaches: true
      }
    })
  ]
});