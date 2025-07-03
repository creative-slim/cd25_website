import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'process': {},
  },
  build: {
    // Single bundle configuration
    rollupOptions: {
      output: {
        manualChunks: () => 'app', // Force all chunks into one
        entryFileNames: 'app.[hash].js',
        chunkFileNames: 'app.[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    // Minify the output
    minify: 'terser',
    // Generate source maps for debugging
    sourcemap: true,
    // Ensure we're building for production
    target: 'es2015',
    // Optimize the bundle
    cssCodeSplit: false
  }
})
