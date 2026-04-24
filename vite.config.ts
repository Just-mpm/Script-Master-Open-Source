import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Plugin que adiciona headers COOP/COEP para todas as rotas exceto /login.
 *
 * Esses headers habilitam SharedArrayBuffer (Whisper WASM, Remotion).
 * A rota /login fica sem COEP para permitir Firebase Auth popup/iframe.
 *
 * Em produção, configurar headers equivalentes no firebase.json.
 */
function coepPlugin(): PluginOption {
  const coepHeaders = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
  };

  function middleware(req: { url?: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) {
    // Parseia o path ignorando query strings (?v=123, ?import, etc)
    const path = req.url?.split('?')[0] ?? '/';

    // Rotas públicas (sem COEP) — Firebase Auth precisa de iframes cross-origin
    const publicRoutes = ['/', '/login', '/features', '/pricing', '/faq', '/about', '/contact',
      '/terms', '/privacy', '/cookies', '/status', '/blog'];
    const isPublic = publicRoutes.some(route => path === route || path.startsWith(route + '/'));

    if (!isPublic) {
      res.setHeader('Cross-Origin-Opener-Policy', coepHeaders['Cross-Origin-Opener-Policy']);
      res.setHeader('Cross-Origin-Embedder-Policy', coepHeaders['Cross-Origin-Embedder-Policy']);
    }

    next();
  }

  return {
    name: 'coep-headers',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      coepPlugin(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.webp', 'logo-transparente.webp'],
        manifest: {
          name: 'Script Master',
          short_name: 'ScriptMaster',
          description: 'Transforme roteiros em áudio profissional com inteligência artificial.',
          theme_color: '#0a0a0f',
          background_color: '#0a0a0f',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'pwa-192x192.webp',
              sizes: '192x192',
              type: 'image/webp',
            },
            {
              src: 'pwa-512x512.webp',
              sizes: '512x512',
              type: 'image/webp',
            },
            {
              src: 'pwa-512x512.webp',
              sizes: '512x512',
              type: 'image/webp',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Cache-first para assets estáticos (JS, CSS, fontes, imagens)
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
          // SPA: navegação sempre volta ao index.html
          navigateFallback: '/index.html',
          // Não interceptar rotas de login (Firebase Auth precisa de rede)
          navigateFallbackDenylist: [/^\/login/],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: [
        'mediabunny',
        '@mediabunny/aac-encoder',
        '@mediabunny/flac-encoder',
        '@mediabunny/mp3-encoder',
      ],
    },
    optimizeDeps: {
      exclude: ['@remotion/whisper-web'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
  };
});
