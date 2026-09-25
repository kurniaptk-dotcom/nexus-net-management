import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'LogoNexusputihoren.png',
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        name: 'Nexus Net Management',
        short_name: 'NexusNet',
        description: 'Sistem Manajemen Lapangan dan Operasional WiFi Nexus Net',
        theme_color: '#0D1B4A',
        background_color: '#0D1B4A',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,mp3}'],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (normalized.includes('node_modules/react/')) return 'vendor'
          if (normalized.includes('node_modules/react-dom/')) return 'vendor'
          if (normalized.includes('node_modules/react-router')) return 'vendor'
          if (normalized.includes('node_modules/recharts/')) return 'charts'
          if (normalized.includes('node_modules/lucide-react/')) return 'icons'
          if (normalized.includes('node_modules/@supabase/')) return 'supabase'
        },
      },
    },
  },
})