import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";
import { defineConfig } from "vite";
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    publicDir: "public",
    base: "./",
    css: {
      postcss: {
        plugins: [
          tailwind(),
          autoprefixer(),
        ],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      outDir: 'dist',
      minify: isProduction ? 'terser' : false,
      sourcemap: !isProduction,
      target: 'es2015',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            auth: ['react-oidc-context', 'oidc-client-ts'],
            ui: ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
            calendar: ['react-calendar', 'react-clock', 'react-datetime-picker', 'date-fns'],
          },
        },
      },
    },
    // Set up API proxy for development
    server: {
      port: 5174,
      strictPort: true,
      host: true,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },
    envPrefix: ['VITE_'],
  };
});