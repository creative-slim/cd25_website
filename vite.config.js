// This is the new config
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
    rollupOptions: {
      output: {
        manualChunks: undefined, // disables code splitting
        entryFileNames: 'bundle.[hash].js', // cache-busting hash
        chunkFileNames: 'bundle.[hash].js',
        assetFileNames: 'bundle.[hash].[ext]'
      }
    },
    cssCodeSplit: false, // inlines CSS into JS
    minify: 'terser',
    sourcemap: false, // set to true if you want debugging
    target: 'es2015',
    lib: {
      entry: 'src/main.jsx', // your entry point
      name: 'MyWidget',      // global variable name (change as needed)
      fileName: 'bundle',
      formats: ['iife']      // <--- THIS IS THE KEY
    }
  }
})



// This is the old config
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   define: {
//     'process.env': {},
//     'process': {},
//   },
//   build: {
//     // Output a single bundle
//     rollupOptions: {
//       output: {
//         manualChunks: undefined, // Disable code splitting
//         entryFileNames: 'creative-directors.[hash].js', // Single output file
//         chunkFileNames: 'creative-directors.[hash].js',
//         assetFileNames: 'creative-directors.[hash].[ext]'
//       }
//     },
//     // Minify the output
//     minify: 'terser',
//     // Generate source maps for debugging
//     sourcemap: true,
//     // Ensure we're building for production
//     target: 'es2015',
//     // Optimize the bundle
//     cssCodeSplit: false,
//     // Ensure we're building a library
//     lib: {
//       entry: 'src/main.jsx', // Your entry point
//       name: 'CreativeDirectors',
//       fileName: 'creative-directors',
//       formats: ['iife'] // Immediately Invoked Function Expression
//     }
//   }
// })
