import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api':     { target:'http://localhost:5000', changeOrigin:true },
      '/uploads': { target:'http://localhost:5000', changeOrigin:true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react','react-dom','react-router-dom'],
          redux:    ['@reduxjs/toolkit','react-redux'],
          ui:       ['framer-motion','lucide-react'],
          markdown: ['react-markdown','react-syntax-highlighter'],
        },
      },
    },
  },
  preview: { port: 4173 },
});
