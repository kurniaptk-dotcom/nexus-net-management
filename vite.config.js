import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/')) return 'vendor'
          if (id.includes('node_modules/react-dom/')) return 'vendor'
          if (id.includes('node_modules/react-router')) return 'vendor'
          if (id.includes('node_modules/recharts/')) return 'charts'
          if (id.includes('node_modules/lucide-react/')) return 'icons'
          if (id.includes('node_modules/@supabase/')) return 'supabase'
        },
      },
    },
  },
})