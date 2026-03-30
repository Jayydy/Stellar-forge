import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

function healthJsonPlugin() {
  return {
    name: 'health-json',
    closeBundle() {
      const health = {
        status: 'ok',
        version: process.env.VITE_APP_VERSION ?? '0.0.0',
        timestamp: new Date().toISOString(),
      }
      writeFileSync(resolve(__dirname, 'dist/health.json'), JSON.stringify(health, null, 2))
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    healthJsonPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'StellarForge',
        short_name: 'StellarForge',
        description: 'Deploy and manage custom tokens on the Stellar blockchain without writing code.',
        theme_color: '#7c3aed',
        background_color: '#0f0f1a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/horizon\.stellar\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'stellar-horizon-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https:\/\/horizon-testnet\.stellar\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'stellar-testnet-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            if (id.includes('stellar') || id.includes('@stellar')) {
              return 'stellar';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})