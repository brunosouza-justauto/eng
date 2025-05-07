import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      manifest: {
        name: 'ENG App',
        short_name: 'ENG',
        description: 'Earned Not Given - Bodybuilding & Nutrition Tracker',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    host: '0.0.0.0',          // Listen on all network interfaces
    port: 5173,               // Default Vite port
    strictPort: true,         // Don't try other ports if 5173 is taken
    cors: true,               // Enable CORS for all origins
    hmr: {
      clientPort: 5173,       // Match your port
      host: 'localhost'       // HMR host
    },
    fs: {
      allow: ['..']           // Allow serving files from one level up
    },
    // This is the important part for ngrok connections
    allowedHosts: ['.ngrok-free.app', 'localhost']
  },
  preview: {
    host: '0.0.0.0',
    port: 5173
  }
})
