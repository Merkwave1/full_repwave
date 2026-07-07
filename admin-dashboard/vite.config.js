import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5180,
    proxy: {
      '/api': {
        target: process.env.DOTNET_API_TARGET || 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
});
