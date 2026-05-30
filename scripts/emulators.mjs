/**
 * scripts/emulators.mjs
 *
 * Script inteligente para iniciar emuladores Firebase seletivamente.
 * Lê as flags VITE_EMULATOR_* do .env e monta o --only automaticamente.
 *
 * Uso:
 *   node scripts/emulators.mjs              # emuladores conforme .env
 *   node scripts/emulators.mjs --only auth  # override manual (ignora .env)
 *   node scripts/emulators.mjs --all        # força todos os emuladores
 *
 * Flags no .env:
 *   VITE_EMULATOR_AUTH=true        → ativa emulador Auth (porta 9099)
 *   VITE_EMULATOR_FIRESTORE=true   → ativa emulador Firestore (porta 8080)
 *   VITE_EMULATOR_STORAGE=true     → ativa emulador Storage (porta 9199)
 *   VITE_EMULATOR_FUNCTIONS=true   → ativa emulador Functions (porta 5001)
 *   VITE_EMULATOR_HOSTING=true     → ativa emulador Hosting (porta 5000)
 *   VITE_EMULATOR_UI=true          → ativa UI dos emuladores (porta 4000)
 *
 * Se nenhuma flag VITE_EMULATOR_* existir no .env, todos os emuladores
 * configurados no firebase.json são iniciados (backward compat).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// ── Caminhos ─────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(ROOT, '.env');

// ── Emuladores conhecidos ────────────────────────────────────────────────────

const KNOWN_EMULATORS = [
  'auth',
  'firestore',
  'storage',
  'functions',
  'hosting',
  'ui',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lê o .env e retorna um Map de chaves → valores.
 * Ignora comentários (#) e linhas vazias.
 * Remove aspas opcionais ao redor dos valores.
 */
function parseEnvFile(filePath) {
  const env = new Map();

  if (!existsSync(filePath)) {
    return env;
  }

  const content = readFileSync(filePath, 'utf-8');

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    // Ignora comentários e linhas vazias
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    // Remove aspas opcionais
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env.set(key, value);
  }

  return env;
}

// ── Lógica principal ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const env = parseEnvFile(ENV_PATH);

// Flag --all força todos os emuladores
const forceAll = args.includes('--all');

// Flag --only manual (passa direto pro firebase)
const onlyIndex = args.indexOf('--only');
const manualOnly = onlyIndex !== -1 ? args[onlyIndex + 1] : null;

// Emuladores ativos no .env (prefixo VITE_EMULATOR_)
const activeEmulators = [];

if (!forceAll && !manualOnly) {
  let hasAnyFlag = false;

  for (const emulator of KNOWN_EMULATORS) {
    const key = `VITE_EMULATOR_${emulator.toUpperCase()}`;
    const value = env.get(key);

    if (value !== undefined) {
      hasAnyFlag = true;
      if (value.toLowerCase() === 'true') {
        activeEmulators.push(emulator);
      }
    }
  }

  // Se nenhuma flag VITE_EMULATOR_* existir, fallback: todos
  if (!hasAnyFlag) {
    console.log(
      '⚠️  Nenhuma flag VITE_EMULATOR_* encontrada no .env — iniciando todos os emuladores.',
    );
    console.log(
      '   Dica: adicione VITE_EMULATOR_AUTH=true, VITE_EMULATOR_FIRESTORE=true, etc.\n',
    );
  }
}

// ── Montar argumentos ────────────────────────────────────────────────────────

const firebaseArgs = ['emulators:start'];

if (manualOnly) {
  // Usuário passou --only manualmente — respeitar
  firebaseArgs.push('--only', manualOnly);
  console.log(`🎛️  Override manual: --only ${manualOnly}\n`);
} else if (forceAll) {
  console.log('🚀 Iniciando TODOS os emuladores (--all).\n');
} else if (activeEmulators.length > 0) {
  firebaseArgs.push('--only', activeEmulators.join(','));
  console.log(`🎛️  Emuladores ativos (via .env): ${activeEmulators.join(', ')}\n`);
} else {
  // Nenhuma flag encontrada — firebase decide (todos do firebase.json)
  console.log('🚀 Iniciando todos os emuladores configurados no firebase.json.\n');
}

// ── Spawn ────────────────────────────────────────────────────────────────────

// No Windows, firebase é um .cmd — precisa de shell: true.
// Concatenamos os args em uma string para evitar o DEP0190.
const cmd = ['firebase', ...firebaseArgs].join(' ');
const child = spawn(cmd, {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error(
      '❌ firebase CLI não encontrado. Instale com: npm i -g firebase-tools',
    );
  } else {
    console.error('❌ Erro ao iniciar emuladores:', err.message);
  }
  process.exit(1);
});

// Repassa sinais de encerramento para o processo filho
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
