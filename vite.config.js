import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'ON SPEAK — Tutor de idiomas com IA',
        short_name: 'ON SPEAK',
        description: 'Converse e repita até fixar inglês ou espanhol com a Libi, sua tutora IA. Gamificado e offline.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
        background_color: '#0F9D8C',
        theme_color: '#0F9D8C',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Conversar com a Libi', short_name: 'Conversar', description: 'Abre o modo conversação', url: './?mode=chat', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Praticar (Repetição)', short_name: 'Praticar', description: 'Abre exercícios rápidos', url: './?mode=practice', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }
        ],
        screenshots: []
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
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
