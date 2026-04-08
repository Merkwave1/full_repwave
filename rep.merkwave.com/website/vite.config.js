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
    port: 5173,
    // Allow requests from your-domain.example
    allowedHosts: [
      'your-domain.example',
      'localhost',
      '.example.com'
    ],
    // Enable HMR with proper WebSocket configuration
    hmr: {
      clientPort: 443,
      protocol: 'wss'
    },
    // Watch options for better performance in Docker
    watch: {
      usePolling: true
    }
  }
})
