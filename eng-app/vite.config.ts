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
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB instead of default 2 MiB
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
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: "pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
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
    allowedHosts: ['.ngrok-free.app', 'localhost'],
    
    // Add proxy configuration for Fitbit and other fitness APIs
    proxy: {
      '/api/fitbit': {
        target: 'https://api.fitbit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fitbit/, ''),
        configure: (proxy, _options) => {
          console.log('options', _options);
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err, _req, _res);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url, _res);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url, _res);
          });
        }
      },
      // Add more proxies for other fitness APIs as needed
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173
  }
})
