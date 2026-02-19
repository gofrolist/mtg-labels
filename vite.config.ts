import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Root-level Vite config that delegates to the frontend/ directory
export default defineConfig({
  root: path.resolve(__dirname, 'frontend'),
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'frontend/dist'),
    sourcemap: true,
  },
})
