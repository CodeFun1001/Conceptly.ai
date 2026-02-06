import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],

    server: {
      port: 5173,
      proxy: {
        '/api': {
          target:
            mode === 'development'
              ? 'http://localhost:8000'
              : 'https://conceptly-backend.onrender.com',

          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
