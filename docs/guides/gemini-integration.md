# Integração IA (Gemini)

> Baseado nos arquivos: `src/lib/gemini.ts`, `src/lib/rate-limiter.ts`, `src/lib/logger.ts`
>
> **Nota:** O TTS usa `gemini-3.1-flash-tts-preview` via pipeline separado — veja `docs/guides/audio.md`.

## Visão Geral

A integração com Gemini é **100% client-side** via `@google/genai`. Toda a comunicação com a API acontece diretamente no navegador, sem backend intermediário. A API key é exposta ao bundle (aceito neste contexto privado — ver [Segurança](#segurança)).

```
src/lib/gemini.ts          # Client GenAI + geração de imagens + prompts de cena
src/lib/rate-limiter.ts    # Retry automático com exponential backoff
src/lib/logger.ts          # Logger centralizado (usado por toda a app)
```

## SDK `@google/genai` — Inicialização

O client é instanciado uma vez no escopo do módulo (`src/lib/gemini.ts:8`):

```typescript
import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiApiKey } from './env';

const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
```

A chave é obtida via `getGeminiApiKey()` (`src/lib/env.ts`), que lê `VITE_GEMINI_API_KEY` e lança `Error` se ausente.

## Modelos Utilizados

| Modelo | Constante/uso | Arquivo |
|--------|---------------|---------|
| `gemini-3.1-flash-lite-preview` | Chunking de roteiro → prompts de cena | `src/lib/gemini.ts:80` |
| `gemini-3.1-flash-image-preview` | Geração de imagens | `src/lib/gemini.ts:135` |
| `gemini-3.1-flash-tts-preview` | Text-to-speech | `src/lib/audio.ts` (pipeline TTS separado) |

## Funções Exportadas

### `generateScenePrompts()`

Gera prompts de cena a partir do roteiro narrado, usando o modelo **lite** para análise textual.

```typescript
export async function generateScenePrompts(
  script: string,
  durationInSeconds: number,
  style: string,
  densitySeconds: number = 15,     // intervalo entre cenas
  visualFramework: string = 'general',
): Promise<ScenePromptResult>
```

**Comportamento:**

1. Calcula `imageCount = ceil(duration / densitySeconds)` (mínimo 1)
2. Monta um system prompt com instruções de framework (`whiteboard` ou `general`)
3. Chama `gemini-3.1-flash-lite-preview` com `responseMimeType: "application/json"` e schema estruturado (`Type.ARRAY` de `{ timestamp, prompt }`)
4. Em caso de falha após retries, retorna **fallback** com prompt genérico

**Tipos retornados:**

```typescript
interface ScenePrompt {
  timestamp: number; // em segundos
  prompt: string;
}

interface ScenePromptResult {
  readonly prompts: ScenePrompt[];
  readonly isFallback: boolean; // true quando a API falhou completamente
}
```

**Frameworks visuais:**

| Framework | Comportamento |
|-----------|---------------|
| `whiteboard` | Fundo branco, ilustrações coloridas estilo "doodle", textos integrados no quadro |
| `general` (padrão) | Cenas ricas, fotografia/cinemática, segue a direção de arte do usuário |

**Consumidor:** `src/hooks/useAudioGenerator.ts:504`

### `generateImageFromPrompt()`

Gera uma imagem a partir de um prompt textual, usando o modelo de imagem do Gemini.

```typescript
export async function generateImageFromPrompt(
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '16:9',
  referenceImage?: string, // data URI ou base64 puro
): Promise<string | null> // data URI da imagem gerada, ou null em caso de erro
```

**Comportamento:**

1. Monta o conteúdo com o prompt (e imagem de referência opcional via `inlineData`)
2. Chama `gemini-3.1-flash-image-preview` com `imageConfig.aspectRatio`
3. Extrai a primeira parte com `inlineData` da resposta
4. Retorna `data:mime;base64,...` ou `null` em caso de erro

**Parse de imagem de referência** (`parseReferenceImage`):

- Aceita data URI (`data:image/jpeg;base64,...`) — extrai MIME e base64
- Aceita base64 puro — assume `image/jpeg`

**Consumidor:** `src/hooks/useAudioGenerator.ts:524`

## Sistema de Rate Limiting e Retry

### `withRetry()`

Wraper genérico que executa funções assíncronas com retry automático em erros transitórios.

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RateLimiterConfig>,
): Promise<RetryResult<T>>
```

**Erros que disparam retry:**

| Código | Tipo | Detecção |
|--------|------|----------|
| `429` | `RESOURCE_EXHAUSTED` | `ApiError.status` |
| `503` | `UNAVAILABLE` | `ApiError.status` |
| `504` | Gateway timeout | `ApiError.status` |
| — | Quota/deadline | Keywords em `error.message`: `quota`, `resource_exhausted`, `deadline`, `unavailable` |

Erros definitivos (400, 401, 403, 404) falham **imediatamente** sem retry.

**Configuração padrão:**

| Parâmetro | Default | Uso no gemini.ts |
|-----------|---------|------------------|
| `maxRetries` | 3 | 3 |
| `baseDelayMs` | 1000 | 1000 |
| `jitterMs` | 1000 | 500 |

**Fórmula do delay:** `baseDelayMs × 2^attempt + random(0, jitterMs)`

**Tipos:**

```typescript
interface RateLimiterConfig {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly jitterMs: number;
}

interface RetryResult<T> {
  readonly value: T;
  readonly attempts: number; // quantas tentativas foram necessárias
}
```

**Consumidores:**

| Arquivo | Função protegida |
|---------|-----------------|
| `src/lib/gemini.ts` | `generateScenePrompts()` |
| `src/lib/gemini.ts` | `generateImageFromPrompt()` |
| `src/hooks/useAudioGenerator.ts` | Chamada TTS direta |
| `src/hooks/useImageGenerator.ts` | Chamada de geração de imagem |

## Logger (`createLogger`)

Logger centralizado em `src/lib/logger.ts`, usado por toda a aplicação (28 importações).

```typescript
import { createLogger, logger } from '@/lib/logger';

// Logger com contexto pré-fixado (recomendado)
const log = createLogger('gemini');
log.error('Erro ao gerar imagem', { error });

// Logger genérico (uso pontual)
import { logger } from '@/lib/logger';
logger.info('Projeto salvo', { id: 'abc' });
```

**Níveis:** `debug` < `info` < `warn` < `error`

**Comportamento por ambiente:**

| Nível | Desenvolvimento | Produção |
|-------|-----------------|----------|
| `debug` | exibido | suprimido |
| `info` | exibido | suprimido |
| `warn` | exibido | exibido |
| `error` | exibido | exibido + `console.trace` |

Detecção de ambiente via `import.meta.env.PROD` (`src/lib/logger.ts:40`).

## Referência Rápida de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/gemini.ts` | Client GenAI, `generateScenePrompts()`, `generateImageFromPrompt()`, tipos `ScenePrompt`/`ScenePromptResult` |
| `src/lib/rate-limiter.ts` | `withRetry()`, `RateLimiterConfig`, `RetryResult`, detecção de erros transitórios |
| `src/lib/logger.ts` | `createLogger()`, `logger`, níveis de log, detecção de ambiente |
| `src/lib/env.ts` | `getGeminiApiKey()`, `readRequiredEnv()`, `readOptionalEnv()` |

## Segurança

A `VITE_GEMINI_API_KEY` é exposta no bundle do cliente. Isso é aceito por simplicidade e contexto privado. Para projetos públicos, considere um backend proxy. Veja `docs/guides/environment.md` para detalhes sobre o fluxo de env vars.
