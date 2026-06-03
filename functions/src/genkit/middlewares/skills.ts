// ---------------------------------------------------------------------------
// Middleware Genkit de skills — scan, cache e tool use_skill
// ---------------------------------------------------------------------------
//
// Escaneia diretórios de SKILL.md, mantém cache em memória e injeta:
//   1. Lista de skills disponíveis no system prompt (via messages)
//   2. Tool `use_skill` para carregamento sob demanda
//
// Skills são texto passivo (markdown + YAML frontmatter), sem tools/actions.
// O frontmatter contém `name` e `description` para listar no prompt.
//
// Uso:
//   import { createSkillsMiddleware } from '../middlewares/skills.js';
//
//   ai.generateStream({
//     system: '...',
//     messages: [...],
//     tools: [...],
//     use: [createSkillsMiddleware({ skillPaths: ['./skills'] })],
//   });
//
// Estrutura esperada dos diretórios:
//   skills/
//     minha-skill/
//       SKILL.md        ← frontmatter (name, description) + conteúdo
//     outra-skill/
//       SKILL.md
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { generateMiddleware, z } from 'genkit';
import type { MessageData } from 'genkit/model';
import { tool } from 'genkit/beta';
import { createLogger } from '../utils/logger.js';

const log = createLogger('skills-middleware');

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Metadados de uma skill extraídos do diretório e frontmatter */
interface SkillInfo {
  name: string;
  description: string;
  filePath: string;
}

/** Resultado do parse de YAML frontmatter */
interface FrontmatterData {
  name?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Parser de frontmatter YAML
// ---------------------------------------------------------------------------

/**
 * Extrai YAML frontmatter (entre `---`) de um SKILL.md.
 * Retorna `{ name?, description? }` ou null se não houver frontmatter.
 *
 * Suporta apenas campos simples (chave: valor). Não parseia arrays, objetos
 * ou multiline — suficiente para name e description.
 */
function parseFrontmatter(content: string): FrontmatterData | null {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result: FrontmatterData = {};

  // Extrai campo name
  const nameMatch = yaml.match(/^name:\s*(.+)$/m);
  if (nameMatch) {
    result.name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
  }

  // Extrai campo description
  const descMatch = yaml.match(/^description:\s*(.+)$/m);
  if (descMatch) {
    result.description = descMatch[1].trim().replace(/^['"]|['"]$/g, '');
  }

  return result;
}

// ---------------------------------------------------------------------------
// Scanner de diretórios de skills
// ---------------------------------------------------------------------------

/**
 * Escaneia os diretórios informados em busca de SKILL.md.
 * Para cada subdiretório que contém SKILL.md, extrai frontmatter e
 * adiciona ao Map de skills.
 *
 * - Se o frontmatter não tiver `name`, usa o nome do diretório.
 * - Se não tiver `description`, usa "Sem descrição."
 * - Diretórios que não existem são ignorados com warning.
 */
function scanSkills(skillPaths: string[]): Map<string, SkillInfo> {
  const skills = new Map<string, SkillInfo>();

  for (const skillPath of skillPaths) {
    const resolvedPath = path.resolve(skillPath);

    if (!fs.existsSync(resolvedPath)) {
      log.warn('Diretório de skills não encontrado', { path: resolvedPath });
      continue;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    } catch (error) {
      log.warn('Erro ao ler diretório de skills', {
        path: resolvedPath,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillFilePath = path.join(resolvedPath, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFilePath)) continue;

      try {
        const content = fs.readFileSync(skillFilePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);

        const name = frontmatter?.name ?? entry.name;
        const description = frontmatter?.description ?? 'Sem descrição.';

        skills.set(name, { name, description, filePath: skillFilePath });
      } catch (error) {
        log.warn('Erro ao ler SKILL.md', {
          path: skillFilePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  log.info('Skills escaneadas', { count: skills.size });
  return skills;
}

// ---------------------------------------------------------------------------
// Marcador de idempotência
// ---------------------------------------------------------------------------

/** Texto único usado para detectar se as skills já foram injetadas */
const SKILLS_MARKER = 'HABILIDADES DISPONÍVEIS:';

// ---------------------------------------------------------------------------
// Factory do middleware
// ---------------------------------------------------------------------------

/**
 * Cria um middleware Genkit que injeta skills no system prompt e fornece
 * a tool `use_skill` para carregamento sob demanda.
 *
 * O hook `generate` roda a cada turno do tool loop — por isso precisa
 * ser idempotente (detecta se já injetou via marcador no texto).
 *
 * O `system` do `GenerateOptions` é convertido pelo Genkit em uma mensagem
 * com `role: 'system'` no array `messages` de `GenerateActionOptions` antes
 * de chegar ao middleware. Por isso injetamos via messages, não via system.
 */
export function createSkillsMiddleware(config: { skillPaths: string[] }) {
  // Cache imutável — skills são escaneadas uma vez na inicialização
  const skillCache = scanSkills(config.skillPaths);

  // -----------------------------------------------------------------------
  // Tool use_skill — criada uma única vez quando o middleware é instanciado.
  // Como `createSkillsMiddleware()` é chamado uma única vez (em
  // `assistant.ts`), o `const` no escopo da função já garante inicialização
  // única (não há risco de re-registro no Genkit registry).
  // -----------------------------------------------------------------------

  const useSkillTool = tool(
    {
      name: 'use_skill',
      description:
        'Carrega instruções especializadas de uma habilidade. Use quando a ' +
        'tarefa do usuário se beneficiar de expertise específica disponível ' +
        'nas habilidades listadas. O parâmetro é o nome exato da habilidade.',
      inputSchema: z.object({
        skillName: z
          .string()
          .describe('Nome exato da habilidade a carregar'),
      }),
      outputSchema: z.union([
        z.string(),
        z.object({ error: z.literal(true), tool: z.string(), message: z.string() }),
      ]),
    },
    async (input) => {
      try {
        const info = skillCache.get(input.skillName);
        if (!info) {
          const available = Array.from(skillCache.keys()).join(', ');
          const message = `Habilidade '${input.skillName}' não encontrada. Disponíveis: ${available}`;
          log.warn('Skill não encontrada', { skillName: input.skillName });
          return { error: true as const, tool: 'use_skill', message };
        }

        const content = fs.readFileSync(info.filePath, 'utf-8');
        // Remove frontmatter antes de retornar ao modelo
        const withoutFrontmatter = content.replace(
          /^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/,
          '',
        );

        log.info('Skill carregada', { skillName: input.skillName });
        return withoutFrontmatter.trim();
      } catch (err) {
        const message = err instanceof Error ? err.message.slice(0, 300) : 'Erro desconhecido';
        log.warn('Tool use_skill falhou — modelo receberá erro como resultado', { error: message });
        return { error: true as const, tool: 'use_skill', message };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Middleware
  // -----------------------------------------------------------------------

  return generateMiddleware(
    {
      name: 'skills',
      description:
        'Injeta lista de habilidades disponíveis e tool use_skill para ' +
        'carregamento sob demanda',
    },
    () => ({
      tools: [useSkillTool],

      generate: async (envelope, ctx, next) => {
        // Sem skills cadastradas — passa adiante sem modificar nada
        if (skillCache.size === 0) return next(envelope, ctx);

        const messages = envelope.request.messages;
        if (!messages) return next(envelope, ctx);

        // Busca mensagem de sistema no array de mensagens.
        // O Genkit normaliza o parâmetro `system` em uma mensagem
        // com role: 'system' antes de chegar ao middleware.
        const systemMsgIndex = messages.findIndex(
          (m): m is MessageData => m.role === 'system',
        );
        const systemMsg = systemMsgIndex !== -1
          ? messages[systemMsgIndex]
          : null;

        // Idempotência: verifica se já injetou (o hook roda a cada turno)
        if (systemMsg) {
          const hasMarker = systemMsg.content.some(
            (p) =>
              'text' in p &&
              typeof p.text === 'string' &&
              p.text.includes(SKILLS_MARKER),
          );
          if (hasMarker) return next(envelope, ctx);
        }

        // Constrói lista de skills ordenada alfabeticamente
        const skillsList = Array.from(skillCache.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, info]) => `- ${name}: ${info.description}`)
          .join('\n');

        const skillsPrompt =
          `\n${SKILLS_MARKER}\n${skillsList}\n\n` +
          'Para usar uma habilidade, chame a ferramenta use_skill com o nome exato da habilidade desejada.';

        // Cria cópia superficial das mensagens para não mutar o envelope original.
        // Isso evita efeitos colaterais em telemetria, logs ou retries do Genkit.
        const patchedMessages = [...messages];

        if (systemMsg && systemMsgIndex !== -1) {
          // Substitui a mensagem de sistema por uma nova com conteúdo adicional
          patchedMessages[systemMsgIndex] = {
            ...systemMsg,
            content: [...systemMsg.content, { text: skillsPrompt }],
          };
        } else {
          // Cria nova mensagem de sistema no início
          patchedMessages.unshift({
            role: 'system',
            content: [{ text: skillsPrompt.trim() }],
          });
        }

        // Passa envelope com messages substituídas (cópia)
        return next(
          {
            ...envelope,
            request: { ...envelope.request, messages: patchedMessages },
          },
          ctx,
        );
      },
    }),
  );
}
