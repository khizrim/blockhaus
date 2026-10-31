import path from 'path';

import react from '@vitejs/plugin-react';

import dotenv from 'dotenv';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
dotenv.config();

export default defineConfig({
  server: {
    port: Number(process.env.CLIENT_PORT) || 3000,
  },
  define: {
    __SERVER_PORT__: process.env.SERVER_PORT,
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cacheId: 'blockhaus',
        globDirectory: 'dist',
        globPatterns: ['**/*.{html,js,css,png,svg,jpg,jpeg}'],
        navigateFallback: './offline.html',
      },
    }),
  ],
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        app: './index.html',
        offline: './offline.html',
      },
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      },
    },
  },
});
