import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@systems': resolve(__dirname, './src/systems'),
      '@utils': resolve(__dirname, './src/utils'),
      '@assets': resolve(__dirname, './src/assets'),
      '@components': resolve(__dirname, './src/components'),
      '@scenes': resolve(__dirname, './src/scenes')
    }
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          physics: ['cannon-es'],
          networking: ['peerjs'],
          audio: ['howler'],
          tweening: ['@tweenjs/tween.js']
        }
      }
    }
  }
});