import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 5173,
    // Proxy local para a API da OpenAI no preview (evita CORS no navegador)
    proxy: {
      '/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/openai/, '')
      }
    }
  }
});
