import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/auth': 'http://localhost:8080',
          '/projects': 'http://localhost:8080',
          '/companies': 'http://localhost:8080',
          '/estimates': 'http://localhost:8080',
          '/api': 'http://localhost:8080',
          '/ai': 'http://localhost:8080',
          '/health': 'http://localhost:8080',
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
