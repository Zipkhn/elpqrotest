import { defineConfig } from 'vite'
import eslintPlugin from 'vite-plugin-eslint'

// vite.config.js
// GSAP est bundlé (aucun external) → un seul fichier main.js autonome,
// CSS injecté au chargement. Idéal pour une distribution jsDelivr.
export default defineConfig({
  plugins: [eslintPlugin({ cache: false })],
  server: {
    host: 'localhost',
    port: 3000,
    cors: '*',
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
  build: {
    minify: true,
    manifest: true,
    rollupOptions: {
      input: './src/main.js',
      output: {
        format: 'umd',
        name: 'ElparoSite',
        entryFileNames: 'main.js',
        esModule: false,
        compact: true,
        inlineDynamicImports: true,
      },
    },
  },
})
