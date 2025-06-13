import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output a single bundle
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable code splitting
        entryFileNames: 'creative-directors.js', // Single output file
        chunkFileNames: 'creative-directors.js',
        assetFileNames: 'creative-directors.[ext]'
      }
    },
    // Minify the output
    minify: 'terser',
    // Generate source maps for debugging
    sourcemap: true,
    // Ensure we're building for production
    target: 'es2015',
    // Optimize the bundle
    cssCodeSplit: false,
    // Ensure we're building a library
    lib: {
      entry: 'src/main.jsx', // Your entry point
      
      fileName: 'creative-directors',
      formats: ['iife'] // Immediately Invoked Function Expression
    }
  }
})
