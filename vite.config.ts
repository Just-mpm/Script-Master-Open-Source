import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type PluginOption } from 'vite';

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

    // Não aplica COEP na rota de login (Firebase Auth precisa de iframes cross-origin)
    if (path !== '/login') {
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
    plugins: [react(), coepPlugin()],
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
