import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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