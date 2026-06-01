// ---------------------------------------------------------------------------
// Copia src/skills/ para dist/skills/ após o build do TypeScript.
// O Firebase Cloud Functions só faz upload de dist/ + node_modules/ —
// sem este passo, as SKILL.md não existiriam em produção.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src', 'skills');
const dest = path.join(root, 'dist', 'skills');

if (!fs.existsSync(src)) {
  console.log('[copy-skills] src/skills/ não encontrado — nada a copiar.');
  process.exit(0);
}

// Limpa dist/skills/ antes de copiar para remover skills obsoletas de builds anteriores
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

fs.cpSync(src, dest, { recursive: true });

// Conta quantas skills foram copiadas
const skills = fs.readdirSync(dest, { withFileTypes: true })
  .filter(d => d.isDirectory() && fs.existsSync(path.join(dest, d.name, 'SKILL.md')));

console.log(`[copy-skills] ${skills.length} skill(s) copiada(s) para dist/skills/`);
