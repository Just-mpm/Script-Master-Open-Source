# Fase 5.2 — Handoff: Refactor de performance (MAX_PATHS_PER_SCENE=500)

**Você é o agent `refactor` da Koda AI Studio.** Sua tarefa é a Fase 5.2 do plano `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`).

## Objetivo

Otimizar performance da vetorização para imagens 1920×1080 sem travar a UI. Implementar:
- (a) `MAX_PATHS_PER_SCENE = 500` com warning via `createLogger('vectorizer')` ao exceder (Premissa #12 do tracker).
- (b) Ajuste de `pathomit` do `imagetracerjs` ao preset default para controlar complexidade.
- (c) Redimensionamento pré-vetorização se >1080p (já feito em `imageProcessing.ts` linhas 362-372, validar).
- (d) Worker efêmero (Premissa #16): pré-vetorizar batch em paralelo na main thread antes de enviar ao Worker.
- (e) Worker mantém main thread livre (já garantido — vetorização roda na main thread no vetorial).

## Contexto do projeto

- **Stack:** React 19 + Vite 8 + Remotion 4.0.448 + TypeScript 6 + `@remotion/paths` + `imagetracerjs` + Zustand + Vitest 4.
- **Regras:** NUNCA `any`, NUNCA `process.env`, logger `createLogger` (import relativo, NUNCA `@/`), SEMPRE tipos explícitos, SOLID + Clean Code (funções < 20 linhas, magic numbers → constantes), comentários em pt-BR.

## Estado atual

### `src/features/speed-paint/lib/vectorizer.ts` (~298 linhas, refatorado na F1.5)

Função principal: `vectorizeImage(imageData, options?): Promise<VetorialPath[]>`.
- Constantes existentes: `DEFAULT_PRESET='artistic1'`, `DEFAULT_PATHOMIT=8`, `DEFAULT_STROKE_WIDTH=2`, `DEFAULT_COLOR='#222222'`, `ABORT_CHECK_INTERVAL=50`.
- Chamada ao `imagetracerjs`: `ImageTracer.imagedataToSVG(imageData, { preset, pathomit })`.

### `src/features/speed-paint/lib/imageProcessing.ts` (830 linhas, modificado na F2.1)

- `processVetorialOnMainThread()` — vetoriza na main thread (decisão F2.1).
- Resize para max 1920×1080 antes de vetorizar (linhas 362-372, JÁ IMPLEMENTADO).
- `processOnMainThreadVetorial` é chamado UMA imagem por vez (não em paralelo).

### Premissas relevantes do tracker

- **#12 (ALTO):** SVG com 500+ paths trava o Remotion. Mitigação: `MAX_PATHS_PER_SCENE = 500` com warning.
- **#16 (MÉDIO):** Batch com múltiplas imagens — vetorização roda sequencialmente. Considerar paralelizar.

## Tarefas

### 1. Adicionar `MAX_PATHS_PER_SCENE = 500` em `vectorizer.ts`

Localizar a região de constantes no topo do arquivo (perto de `DEFAULT_PRESET` etc.):

```typescript
/**
 * Limite máximo de paths por cena para evitar que SVGs muito complexos
 * travem o Remotion durante a exportação. Quando o vetorizador gera
 * mais paths que este limite, descarta os excedentes e loga um warning.
 *
 * @see Premissa #12 do tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`
 * @see https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md#pathomit
 */
const MAX_PATHS_PER_SCENE = 500;
```

### 2. Aplicar o limite no retorno

No final de `vectorizeImage` (após o loop de enriquecimento), adicionar:

```typescript
// Trunca paths se exceder MAX_PATHS_PER_SCENE (prevenir travamento do Remotion)
if (result.length > MAX_PATHS_PER_SCENE) {
  log.warn('Vetorização gerou muitos paths — truncando para evitar travamento', {
    originalCount: result.length,
    maxAllowed: MAX_PATHS_PER_SCENE,
    preset,
  });
  return result.slice(0, MAX_PATHS_PER_SCENE);
}

return result;
```

**Atenção:** Truncar pode mudar `totalLength` no consumidor (`imageProcessing.ts:529`). Como `totalLength` é recalculado a partir de `paths`, isso é OK — `processVetorialOnMainThread` faz `paths.reduce((sum, p) => sum + p.length, 0)`.

### 3. Ajustar `pathomit` por preset

Nem todos os 16 presets geram a mesma quantidade de paths. Os mais "ricos" (`'detailed'`, `'artistic4'`) podem exceder o limite facilmente. Ajuste dinâmico de `pathomit` baseado no preset (Fase 5.2 item b):

```typescript
/**
 * `pathomit` mínimo por preset. Presets que tendem a gerar muitos paths
 * têm `pathomit` mais alto para controlar complexidade.
 *
 * Referência: testes empíricos com imagens flat design 1920×1080.
 */
const PATHOMIT_BY_PRESET: Record<VetorialPreset, number> = {
  default: 8,
  posterized1: 8,
  posterized2: 8,
  posterized3: 8,
  curvy: 10,
  sharp: 10,
  detailed: 20,        // gera muitos paths
  smoothed: 10,
  grayscale: 8,
  fixedpalette: 8,
  randomsampling1: 12,
  randomsampling2: 12,
  artistic1: 8,        // default — sweet spot
  artistic2: 10,
  artistic3: 12,
  artistic4: 15,       // gera muitos paths
};
```

E na função `vectorizeImage`, ajustar o `pathomit` enviado ao `imagetracerjs`:

```typescript
// pathomit passado para imagetracerjs é o MÍNIMO entre:
// - options.pathomit (override do usuário)
// - PATHOMIT_BY_PRESET[preset] (heurística por preset)
const effectivePathomit = Math.max(
  options.pathomit ?? DEFAULT_PATHOMIT,
  PATHOMIT_BY_PRESET[preset] ?? DEFAULT_PATHOMIT,
);

const svg = ImageTracer.imagedataToSVG(imageData, {
  preset,
  pathomit: effectivePathomit,
});
```

**E o filtro `pathomit` final (após `getLength`)** continua usando o `pathomit` original (`options.pathomit ?? DEFAULT_PATHOMIT`), não o `effectivePathomit` (que serve só para a chamada ao `imagetracerjs`).

### 4. Validar resize pré-vetorização (já implementado)

Verificar que `imageProcessing.ts:362-372` redimensiona imagens > 1920×1080 antes de chamar `vectorizeImage`. JÁ ESTÁ FEITO (verificar via leitura). Se OK, pular; se não, adicionar.

### 5. (Opcional) Pré-vetorizar batch em paralelo (Premissa #16)

A vetorização atual (`processVetorialOnMainThread`) é sequencial. Para batch de N imagens, isso significa N × tempo_unitário de vetorização.

**Decisão pragmática:** Para esta task, **NÃO paralelizar** (complexidade alta, baixa prioridade). O batch atual é raramente usado com `renderMode='vetorial'` (decisão da Fase 3.2 — `runBatchRender` só suporta mask). Documentar com comentário:

```typescript
// Premissa #16: batch em paralelo com vetorização seria possível, mas
// o batch atual não suporta `renderMode='vetorial'` (Fase 3.2 limitação).
// Se a Fase 5.3 ou futuro habilitar batch vetorial, considerar
// pré-vetorizar N imagens em paralelo via `Promise.all([...])`.
```

### 6. Refatoração: `totalLength` pré-calculado no vetorizador (opcional)

O `totalLength` é calculado no consumidor (`imageProcessing.ts:529`). Poderia ser pré-calculado no `vectorizer.ts` para evitar duplicação.

**Decisão:** **NÃO** fazer nesta task. É um refactor cosmético que pode introduzir bugs. O cálculo no consumidor é trivial (`reduce` 1 vez por geração, não por frame).

## Restrições

- **NÃO** modificar API pública de `vectorizeImage` (consumidores já existentes).
- **NÃO** usar `any` / `process.env`.
- Comentários em pt-BR.
- Constantes nomeadas (NÃO magic numbers).
- Funções < 20 linhas (extrair helpers se necessário).
- **NÃO** quebrar os 22 testes do `vectorizer.unit.test.ts` (Fase 2.2).
- **NÃO** modificar `imageProcessing.ts` (consumidor) — só se for estritamente necessário.
- **NÃO** usar `as` bypass — narrowing real.

## Detalhes de implementação

### Comportamento esperado após refactor

1. Usuário escolhe preset `'artistic1'` (default) → `pathomit=8` (sem mudança).
2. Usuário escolhe `'artistic4'` → `pathomit=15` (mais restritivo para evitar estouro).
3. Imagem 4K (8192×4608) → redimensionada para 1920×1080 antes de vetorizar (Fase 2.1 já faz).
4. Vetorização gera 700 paths → truncado para 500 + warning no log.
5. Vetorização gera 50 paths → retorna os 50 (sem warning).

### Sobre `imageProcessing.ts:362-372` (resize)

JÁ EXISTE — confirmado na F2.1. O `vectorizer.ts` NÃO precisa fazer resize (recebe `ImageData` já redimensionado). Manter a responsabilidade no consumidor.

## Notebooks

Não aplicável (refactor de performance local).

## Validação (pronto quando)

- `MAX_PATHS_PER_SCENE = 500` adicionado em `vectorizer.ts`.
- Truncamento com warning funciona.
- `PATHOMIT_BY_PRESET` ajusta o pathomit por preset.
- Os 22 testes do `vectorizer.unit.test.ts` continuam passando.
- 9 testes do `imageProcessing.vetorial.integration.test.ts` (Fase 5.1) continuam passando.
- `bun run typecheck` — 0 erros.
- `bun run lint` — 0 erros/warnings.
- `bun run test` completo — sem regressões.
- Retorne mensagem final com: (a) resumo do refactor, (b) saída dos comandos, (c) decisões de performance relevantes, (d) impacto em latência (se mensurável).
