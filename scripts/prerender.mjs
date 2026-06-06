/**
 * Script de pre-renderização das 10 rotas públicas.
 *
 * Usa puppeteer-core + Chrome do sistema (versão moderna, compatível com JS do Vite 8).
 * O vite-plugin-prerender empacota Puppeteer 1.20 (2019) que não suporta a sintaxe
 * JS moderna gerada pelo Vite — por isso este script customizado.
 *
 * Uso: node scripts/prerender.mjs
 * Chamado automaticamente por "bun run build:full" após o vite build.
 */

import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';

const DIST_DIR = join(import.meta.dirname, '..', 'dist');
const PORT = 9753;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ROUTES = [
  '/',
  '/funcionalidades',
  '/open-source',
  '/perguntas-frequentes',
  '/contato',
  '/sobre',
  '/termos',
  '/privacidade',
  '/cookies',
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

/** Servidor HTTP estático para servir dist/ */
function startServer() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const urlPath = req.url?.split('?')[0] ?? '/';
      let filePath = join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

      try {
        const data = await readFile(filePath);
        const ext = extname(filePath);
        res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(data);
      } catch {
        // SPA fallback para rotas não-arquivo
        try {
          const indexData = await readFile(join(DIST_DIR, 'index.html'));
          res.setHeader('Content-Type', 'text/html');
          res.end(indexData);
        } catch {
          res.writeHead(404);
          res.end();
        }
      }
    });

    server.listen(PORT, () => resolve(server));
    server.on('error', reject);
  });
}

/** Pre-renderiza uma rota usando Puppeteer */
async function prerenderRoute(browser, route) {
  const page = await browser.newPage();

  try {
    const url = `http://localhost:${PORT}${route}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

    // Espera a flag do DocumentHead ou fallback (title preenchido)
    await Promise.race([
      page.waitForFunction(() => window.__PRERENDER_READY === true, { timeout: 10000 }),
      page.waitForFunction(() => {
        const title = document.title;
        return title && title.length > 0 && !title.includes('Vite');
      }, { timeout: 10000 }),
    ]);

    const html = await page.content();
    return { route, html };
  } finally {
    await page.close();
  }
}

/** Salva o HTML renderizado no diretório correto */
async function saveRendered(route, html) {
  const dir = route === '/' ? DIST_DIR : join(DIST_DIR, route);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), html, 'utf-8');
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`[prerender] Iniciando pre-renderização de ${ROUTES.length} rotas...`);

  const server = await startServer();
  console.log(`[prerender] Servidor estático em http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  console.log(`[prerender] Chrome ${await browser.version()}`);

  try {
    for (const route of ROUTES) {
      const start = Date.now();
      try {
        const { html } = await prerenderRoute(browser, route);
        await saveRendered(route, html);
        const kb = (html.length / 1024).toFixed(1);
        console.log(`[prerender] ✅ ${route || '/'} (${kb} KB, ${Date.now() - start}ms)`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[prerender] ❌ ${route}: ${msg}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('[prerender] Concluído.');
}

main().catch((error) => {
  console.error('[prerender] Erro fatal:', error);
  process.exit(1);
});
