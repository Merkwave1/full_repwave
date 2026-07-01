import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for hosting at root
  base: '/',
  build: {
    // Ensure proper handling of dynamic imports
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    },
    // Generate source maps for easier debugging
    sourcemap: false,
    // Set target for better browser compatibility
    target: 'es2015'
  },
  server: {
    // Configure dev server for SPA routing
    historyApiFallback: true,
    // Allow external connections (required for Docker)
    host: '0.0.0.0',
    port: 5174,
    // Allow all hosts for remote dev access (tunnel, etc.)
    allowedHosts: true,
    // Enable HMR
    hmr: true,
    // Proxy API requests to the .NET backend
    proxy: {
      '/api': {
        target: process.env.DOTNET_API_TARGET || 'http://localhost:5050',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.DOTNET_API_TARGET || 'http://localhost:5050',
        changeOrigin: true,
      },
      '/hubs': {
        target: process.env.DOTNET_API_TARGET || 'http://localhost:5050',
        changeOrigin: true,
        ws: true,
        secure: false,
      }
    },
    // Watch options for better performance in Docker
    watch: {
      usePolling: true
    }
  }
})
