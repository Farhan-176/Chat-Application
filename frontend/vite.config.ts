import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '..',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: true,
    hmr: {
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    watch: {
      usePolling: true,
      interval: 150,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react'
            }

            if (id.includes('firebase') || id.includes('@firebase') || id.includes('google-gax') || id.includes('protobufjs')) {
              return 'firebase'
            }

            if (id.includes('framer-motion')) {
              return 'motion'
            }

            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts'
            }

            if (id.includes('lucide-react')) {
              return 'icons'
            }
          }

          return undefined
        },
      },
    },
  },
})
