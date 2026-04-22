import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type PluginOption } from 'vite';

/**
 * Plugin que adiciona headers COOP/COEP condicionalmente via query param `?coep=1`.
 *
 * Esses headers habilitam `SharedArrayBuffer`, necessario para Whisper WASM e Remotion.
 * Porem eles quebram Firebase Auth (iframes cross-origin sem credenciais).
 *
 * Uso: acesse http://localhost:3000?coep=1 para ativar.
 * Padrao (sem o param): headers nao sao enviados, Firebase Auth funciona normalmente.
 */
function conditionalCoepPlugin(): PluginOption {
  const coepHeaders = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
  };

  function middleware(req: { url?: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) {
    if (req.url?.includes('coep=1')) {
      res.setHeader('Cross-Origin-Opener-Policy', coepHeaders['Cross-Origin-Opener-Policy']);
      res.setHeader('Cross-Origin-Embedder-Policy', coepHeaders['Cross-Origin-Embedder-Policy']);
    }
    next();
  }

  return {
    name: 'conditional-coep',
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
    plugins: [react(), conditionalCoepPlugin()],
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
