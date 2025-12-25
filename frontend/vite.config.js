import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''), // Keep /api prefix if backend expects it? 
        // Backend main.py has /projects/, not /api/projects/.
        // So we likely need rewrite.
        // User said: "同時把前端呼叫改為 /api/projects/"
        // If frontend calls /api/projects/, and backend is /projects/, we need rewrite.
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
