import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
    },
  },
  publicDir: path.resolve(__dirname, 'frontend/public'),
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'https://mtg-labels.fly.dev',
        changeOrigin: true,
      },
      '/generate-pdf': {
        target: 'https://mtg-labels.fly.dev',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
