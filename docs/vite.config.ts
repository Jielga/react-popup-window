import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Docs & examples app, deployed to GitHub Pages.
// It consumes the library straight from source, so `npm run dev` gives HMR
// on both the docs and the library itself.
export default defineConfig({
  root: import.meta.dirname,
  base: '/react-popup-window/',
  plugins: [react()],
  resolve: {
    alias: {
      '@jielga/react-popup-window': resolve(import.meta.dirname, '../src/index.ts'),
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, '../dist-docs'),
    emptyOutDir: true,
  },
})
