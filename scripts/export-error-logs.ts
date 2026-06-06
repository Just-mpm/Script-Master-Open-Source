/**
 * Export Error Logs Script
 *
 * Busca documentos da collection errorLogs do Firestore
 * usando a API REST com autenticação do gcloud CLI.
 *
 * Uso: bun run export-error-logs
 */

import { execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LogCategory =
  | 'auth'
  | 'ai'
  | 'audio'
  | 'video'
  | 'storage'
  | 'byok'
  | 'analytics'
  | 'infrastructure'
  | 'system';

interface ErrorLogDocument {
  id: string;
  timestamp: string | null;
  level: LogLevel;
  category: LogCategory;
  context: string;
  message: string;
  payload: Record<string, unknown> | undefined;
  userId: string | undefined;
  sessionId: string | undefined;
  pageUrl: string | undefined;
  userAgent: string | undefined;
  viewport: { width: number; height: number } | undefined;
  stackTrace: string | undefined;
  occurrenceCount: number;
  environment: string | undefined;
}

// Valor individual de um campo no formato REST API do Firestore
interface FirestoreFieldValue {
  stringValue?: string;
  integerValue?: string;
  booleanValue?: string;
  timestampValue?: string;
  mapValue?: { fields: Record<string, FirestoreFieldValue> };
}

// Documento retornado pela API REST do Firestore
interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreFieldValue>;
  createTime?: string;
  updateTime?: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
} as const;

const LEVEL_EMOJI: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  fatal: '💀',
} as const;

const CATEGORY_LABEL: Record<LogCategory, string> = {
  auth: 'Autenticação',
  ai: 'Inteligência Artificial',
  audio: 'Áudio',
  video: 'Vídeo',
  storage: 'Armazenamento',
  byok: 'API Key (BYOK)',
  analytics: 'Analytics',
  infrastructure: 'Infraestrutura',
  system: 'Sistema',
} as const;

const OUTPUT_PATH = join(process.cwd(), 'docs', 'errorLogs.md');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/** Lê o project ID do .firebaserc */
function getProjectId(): string {
  const firebasercPath = join(process.cwd(), '.firebaserc');

  if (!existsSync(firebasercPath)) {
    log('Erro: .firebaserc não encontrado no diretório do projeto.', 'red');
    process.exit(1);
  }

  const content = readFileSync(firebasercPath, 'utf-8');
  const config = JSON.parse(content) as {
    projects: { default: string };
  };
  const projectId = config.projects?.default;

  if (!projectId) {
    log('Erro: project ID não encontrado no .firebaserc.', 'red');
    process.exit(1);
  }

  return projectId;
}

/** Obtém access token via gcloud CLI */
function getAccessToken(): string {
  try {
    const token = execSync('gcloud auth application-default print-access-token', {
      encoding: 'utf-8',
      timeout: 15_000,
    }).trim();
    return token;
  } catch {
    log('Erro: falha ao obter access token. Execute "gcloud auth login" primeiro.', 'red');
    process.exit(1);
  }
}

/** Busca todos os documentos da collection errorLogs */
async function fetchAllDocuments(token: string, projectId: string): Promise<FirestoreDocument[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/errorLogs?pageSize=300`;

  log(`Buscando documentos em errorLogs...`, 'cyan');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    log(`Erro na API Firestore (${response.status}): ${body}`, 'red');
    process.exit(1);
  }

  const data = (await response.json()) as {
    documents?: FirestoreDocument[];
  };

  return data.documents ?? [];
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/** Extrai string de um campo Firestore REST */
function extractString(field: FirestoreFieldValue | undefined): string | undefined {
  if (!field) return undefined;
  return field.stringValue;
}

/** Extrai número de um campo Firestore REST */
function extractNumber(field: FirestoreFieldValue | undefined): number | undefined {
  if (!field) return undefined;
  if (field.integerValue) return Number(field.integerValue);
  return undefined;
}

/** Extrai objeto (mapa) de um campo Firestore REST */
function extractMap(
  field: FirestoreFieldValue | undefined,
): Record<string, unknown> | undefined {
  if (!field?.mapValue?.fields) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(field.mapValue.fields)) {
    if (value.stringValue !== undefined) {
      result[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      result[key] = Number(value.integerValue);
    } else if (value.booleanValue !== undefined) {
      result[key] = value.booleanValue === 'true';
    }
  }
  return result;
}

/** Converte documento Firestore REST para ErrorLogDocument */
function parseDocument(doc: FirestoreDocument): ErrorLogDocument {
  const fields = doc.fields;

  // Extrai o timestamp do campo createTime do documento ou do campo dedicado
  const timestamp = fields.timestamp?.timestampValue ?? doc.createTime ?? null;

  // Extrai viewport do mapa
  const viewportFields = fields.viewport;
  const viewport = extractMap(viewportFields) as
    | { width: number; height: number }
    | undefined;

  // Extrai payload do mapa
  const payloadFields = fields.payload;
  const payload = extractMap(payloadFields);

  return {
    id: extractString(fields.id) ?? '',
    timestamp,
    level: (extractString(fields.level) ?? 'error') as LogLevel,
    category: (extractString(fields.category) ?? 'system') as LogCategory,
    context: extractString(fields.context) ?? '',
    message: extractString(fields.message) ?? '',
    payload,
    userId: extractString(fields.userId),
    sessionId: extractString(fields.sessionId),
    pageUrl: extractString(fields.pageUrl),
    userAgent: extractString(fields.userAgent),
    viewport,
    stackTrace: extractString(fields.stackTrace),
    occurrenceCount: extractNumber(fields.occurrenceCount) ?? 1,
    environment: extractString(fields.environment),
  };
}

// ─── Geração do Markdown ─────────────────────────────────────────────────────

/** Formata data/hora em pt-BR */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  } catch {
    return dateStr;
  }
}

/** Formata viewport como WxH */
function formatViewport(vp: { width: number; height: number } | undefined): string {
  if (!vp) return '—';
  return `${vp.width}x${vp.height}`;
}

/** Trunca string com reticências */
function truncate(str: string | undefined, maxLen: number): string {
  if (!str) return '—';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

/** Conta ocorrências por nível */
function countByLevel(logs: ErrorLogDocument[]): Record<LogLevel, number> {
  const counts: Record<LogLevel, number> = {
    debug: 0, info: 0, warn: 0, error: 0, fatal: 0,
  };
  for (const log of logs) {
    counts[log.level]++;
  }
  return counts;
}

/** Conta ocorrências por categoria */
function countByCategory(logs: ErrorLogDocument[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    const key = log.category;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Agrupa logs por categoria */
function groupByCategory(logs: ErrorLogDocument[]): Map<LogCategory, ErrorLogDocument[]> {
  const groups = new Map<LogCategory, ErrorLogDocument[]>();
  for (const log of logs) {
    const existing = groups.get(log.category) ?? [];
    existing.push(log);
    groups.set(log.category, existing);
  }
  return groups;
}

/** Gera o relatório completo em Markdown */
function generateMarkdown(logs: ErrorLogDocument[]): string {
  const now = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  const levelCounts = countByLevel(logs);
  const categoryCounts = countByCategory(logs);
  const groupedLogs = groupByCategory(logs);

  const lines: string[] = [];

  // Cabeçalho
  lines.push('# Relatório de Error Logs');
  lines.push('');
  lines.push(`**Gerado em:** ${now}`);
  lines.push(`**Total de logs:** ${logs.length}`);
  lines.push('');

  // Tabela resumo por nível
  lines.push('## Resumo por Nível');
  lines.push('');
  lines.push('| Nível | Emoji | Quantidade |');
  lines.push('|-------|-------|------------|');
  for (const level of Object.keys(LEVEL_EMOJI) as LogLevel[]) {
    const count = levelCounts[level];
    if (count > 0) {
      lines.push(`| ${level} | ${LEVEL_EMOJI[level]} | ${count} |`);
    }
  }
  lines.push('');

  // Tabela resumo por categoria
  lines.push('## Resumo por Categoria');
  lines.push('');
  lines.push('| Categoria | Label | Quantidade |');
  lines.push('|-----------|-------|------------|');
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCategories) {
    const label = CATEGORY_LABEL[cat as LogCategory] ?? cat;
    lines.push(`| ${cat} | ${label} | ${count} |`);
  }
  lines.push('');

  // Seção detalhada por categoria
  lines.push('## Detalhes por Categoria');
  lines.push('');

  // Ordena categorias por volume de erros (maior primeiro)
  const sortedGroups = [...groupedLogs.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  for (const [category, categoryLogs] of sortedGroups) {
    const label = CATEGORY_LABEL[category] ?? category;
    lines.push(`### ${label} (${category})`);
    lines.push('');

    for (const entry of categoryLogs) {
      lines.push(`#### ${LEVEL_EMOJI[entry.level]} [${entry.level.toUpperCase()}] — ${entry.id}`);
      lines.push('');
      lines.push(`| Campo | Valor |`);
      lines.push(`|-------|-------|`);
      lines.push(`| **Data/Hora** | ${formatDate(entry.timestamp)} |`);
      lines.push(`| **Contexto** | ${entry.context || '—'} |`);
      lines.push(`| **Ocorrências** | ${entry.occurrenceCount} |`);
      lines.push(`| **Página** | ${entry.pageUrl ?? '—'} |`);
      lines.push(`| **User ID** | ${entry.userId ?? '—'} |`);
      lines.push(`| **Viewport** | ${formatViewport(entry.viewport)} |`);
      lines.push(`| **User Agent** | ${truncate(entry.userAgent, 80)} |`);
      lines.push(`| **Ambiente** | ${entry.environment ?? '—'} |`);
      lines.push('');

      // Mensagem
      lines.push(`**Mensagem:**`);
      lines.push('');
      lines.push(`> ${entry.message}`);
      lines.push('');

      // Payload
      if (entry.payload && Object.keys(entry.payload).length > 0) {
        lines.push(`**Payload:**`);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(entry.payload, null, 2));
        lines.push('```');
        lines.push('');
      }

      // Stack trace
      if (entry.stackTrace) {
        lines.push(`**Stack Trace:**`);
        lines.push('');
        lines.push('```');
        lines.push(entry.stackTrace);
        lines.push('```');
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  // Se não houver logs
  if (logs.length === 0) {
    lines.push('> Nenhum log encontrado na collection `errorLogs`.');
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log('📊 Export Error Logs — Script Master', 'cyan');
  log('', 'reset');

  // 1. Obter project ID
  const projectId = getProjectId();
  log(`📦 Project ID: ${projectId}`, 'green');

  // 2. Obter access token
  const token = getAccessToken();
  log('🔑 Access token obtido com sucesso.', 'green');

  // 3. Buscar documentos
  const documents = await fetchAllDocuments(token, projectId);
  log(`📄 Documentos encontrados: ${documents.length}`, 'yellow');

  if (documents.length === 0) {
    log('Nenhum log para exportar.', 'yellow');
  }

  // 4. Parsear documentos
  const logs: ErrorLogDocument[] = documents.map(parseDocument);

  // 5. Gerar Markdown
  const markdown = generateMarkdown(logs);

  // 6. Garantir que o diretório existe
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // 7. Salvar arquivo
  await writeFile(OUTPUT_PATH, markdown, 'utf-8');
  log(`✅ Relatório salvo em: ${OUTPUT_PATH}`, 'green');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  log(`Erro fatal: ${message}`, 'red');
  process.exit(1);
});
