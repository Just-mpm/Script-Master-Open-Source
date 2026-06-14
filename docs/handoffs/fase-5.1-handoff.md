# Fase 5.1 — Handoff: Testes de integração do pipeline vetorial

**Você é o agent `test` da Koda AI Studio.** Sua tarefa é a Fase 5.1 do plano `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`).

## Objetivo

Adicionar **testes de integração** do pipeline vetorial no `imageProcessing.ts` (chamada `generateStrokesFromImage` com `renderMode: 'vetorial'`). Validar end-to-end: imagem → `ImageData` → `vectorizeImage` → `VetorialAnimation`.

**Decisão documentada (Premissa #15 do tracker):** Snapshot/render de componente Remotion (`WhiteboardScene`) **fica fora do escopo** (seria pioneirismo — o projeto não tem testes de componentes Remotion). O escopo desta task é testar o **caminho principal**: `processOnMainThreadVetorial` (mesmo padrão do `imageProcessing.unit.test.ts` que testa o mask via `processOnMainThread`).

## Contexto do projeto

- **Stack:** React 19 + Vite 8 + Remotion 4.0.448 + TypeScript 6 + `@remotion/paths` + `imagetracerjs` + Vitest 4.
- **Regras:** NUNCA `any`, comentários em pt-BR.
- **Padrão de teste:** ver `tests/speed-paint/imageProcessing.unit.test.ts` (13 testes do mask).

## Estado atual

### `tests/speed-paint/imageProcessing.unit.test.ts` (existente)

13 testes para o mask:
- Decodifica imagem
- Redimensiona para 1920×1080
- Faz fallback para `processOnMainThread` quando Worker não disponível
- Valida `totalFrames`, `strokes`, `revealThreshold`

### `tests/speed-paint/vectorizer.unit.test.ts` (criado na Fase 2.2)

22 testes do `vectorizeImage`:
- Vetorização básica
- Filtro `pathomit`
- Length pré-calculado
- Presets
- Validação de input
- AbortSignal
- Defaults

### `src/features/speed-paint/lib/imageProcessing.ts` (modificado na F2.1)

`generateStrokesFromImage(dataUrl, onProgress, options?)` agora aceita `renderMode?: 'mask' | 'vetorial'` e `vetorialPreset?: VetorialPreset`. Quando `renderMode === 'vetorial'`, chama `processVetorialOnMainThread()` (Fase 2.1) que monta `VetorialAnimation`.

## Tarefas

### Adicionar testes em `tests/speed-paint/imageProcessing.unit.test.ts` (ou criar novo arquivo)

**Decisão:** criar `tests/speed-paint/imageProcessing.vetorial.integration.test.ts` (separado do mask) para isolar o pipeline vetorial. Mais limpo.

Estrutura sugerida:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { generateStrokesFromImage } from '../../src/features/speed-paint/lib/imageProcessing';

/**
 * Helper: cria data URL a partir de pixels RGBA (igual ao padrão do imageProcessing.unit.test.ts).
 */
function createTestImageDataURL(
  width: number,
  height: number,
  fill: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 },
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `rgb(${fill.r}, ${fill.g}, ${fill.b})`;
  ctx.fillRect(0, 0, width, height);
  // Quadrado preto central para gerar paths na vetorização
  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(width / 4, height / 4, width / 2, height / 2);
  return canvas.toDataURL('image/png');
}

describe('generateStrokesFromImage — modo vetorial', () => {
  it('retorna VetorialAnimation quando renderMode é vetorial', async () => {
    const dataUrl = createTestImageDataURL(100, 100);
    const animation = await generateStrokesFromImage(
      dataUrl,
      () => {},
      { renderMode: 'vetorial' },
    );
    // Tipo discriminado: deve ter `paths`, NÃO deve ter `strokes`
    expect(animation).toHaveProperty('paths');
    expect(animation).not.toHaveProperty('strokes');
    expect(animation).toHaveProperty('sourcePreset');
    expect(animation).toHaveProperty('totalLength');
    expect(animation.fps).toBe(60);
    expect(animation.canvasWidth).toBe(100);
    expect(animation.canvasHeight).toBe(100);
  });

  it('respeita vetorialPreset customizado', async () => {
    const dataUrl = createTestImageDataURL(100, 100);
    const animation = await generateStrokesFromImage(
      dataUrl,
      () => {},
      { renderMode: 'vetorial', vetorialPreset: 'detailed' },
    );
    expect(animation.sourcePreset).toBe('detailed');
  });

  it('default preset é artistic1 quando não fornecido', async () => {
    const dataUrl = createTestImageDataURL(100, 100);
    const animation = await generateStrokesFromImage(
      dataUrl,
      () => {},
      { renderMode: 'vetorial' },
    );
    expect(animation.sourcePreset).toBe('artistic1');
  });

  it('chama onProgress com valores 0..1', async () => {
    const dataUrl = createTestImageDataURL(80, 80);
    const progressValues: number[] = [];
    await generateStrokesFromImage(
      dataUrl,
      (p) => progressValues.push(p),
      { renderMode: 'vetorial' },
    );
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[0]).toBeGreaterThanOrEqual(0);
    expect(progressValues[progressValues.length - 1]).toBe(1);
  });

  it('respeita AbortSignal — lança AbortError se abortado antes de começar', async () => {
    const dataUrl = createTestImageDataURL(80, 80);
    const controller = new AbortController();
    controller.abort();
    await expect(
      generateStrokesFromImage(
        dataUrl,
        () => {},
        { renderMode: 'vetorial', signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('modo mask (default) ainda retorna StrokeAnimation (retrocompatibilidade)', async () => {
    const dataUrl = createTestImageDataURL(100, 100);
    const animation = await generateStrokesFromImage(
      dataUrl,
      () => {},
      {}, // sem renderMode = mask default
    );
    expect(animation).toHaveProperty('strokes');
    expect(animation).not.toHaveProperty('paths');
  });

  it('modo mask com renderMode: "mask" explícito também retorna StrokeAnimation', async () => {
    const dataUrl = createTestImageDataURL(100, 100);
    const animation = await generateStrokesFromImage(
      dataUrl,
      () => {},
      { renderMode: 'mask' },
    );
    expect(animation).toHaveProperty('strokes');
  });

  it('totalLength é igual à soma dos length de cada path', async () => {
    const dataUrl = createTestImageDataURL(100, 100);
    const animation = await generateStrokesFromImage(
      dataUrl,
      () => {},
      { renderMode: 'vetorial' },
    );
    if ('paths' in animation) {
      const sum = animation.paths.reduce((s, p) => s + p.length, 0);
      expect(animation.totalLength).toBeCloseTo(sum, 1);
    } else {
      throw new Error('Tipo inesperado: esperado VetorialAnimation');
    }
  });

  it('totalDurationMs é >= 2000 (mínimo) e proporcional a paths.length', async () => {
    const dataUrl = createTestImageDataURL(100, 100);
    const animation = await generateStrokesFromImage(
      dataUrl,
      () => {},
      { renderMode: 'vetorial' },
    );
    if ('paths' in animation) {
      expect(animation.totalDurationMs).toBeGreaterThanOrEqual(2000);
      // Cada path contribui 80ms (constante de Fase 2.1)
      const expected = Math.max(2000, animation.paths.length * 80);
      expect(animation.totalDurationMs).toBe(expected);
    }
  });
});
```

### Validação

- 9 testes adicionados.
- `bun run test tests/speed-paint/imageProcessing.vetorial.integration.test.ts` — 9/9 passam.
- `bun run test` completo — sem regressões (mantém 2253+9 = 2262/2262 ou similar).
- `bun run typecheck` e `bun run lint` — 0 erros.

## Restrições

- **NÃO** modificar `imageProcessing.ts`, `vectorizer.ts` ou `WhiteboardScene.tsx`.
- **NÃO** criar testes de snapshot de componentes Remotion (decisão Premissa #15 do tracker).
- **NÃO** usar `any` / `@ts-ignore`.
- Comentários em pt-BR.
- Se algum teste for flaky (depende de timing), usar `try/catch` ou `it.skip` com comentário explicativo.

## Notebooks

Não aplicável (Vitest é direto).

## Validação (pronto quando)

- Arquivo `tests/speed-paint/imageProcessing.vetorial.integration.test.ts` criado.
- 9/9 testes passam.
- `bun run test` completo sem regressões.
- `bun run typecheck` e `bun run lint` passam.
- Retorne mensagem final com: (a) quantos testes, (b) quais passaram, (c) decisões relevantes (ex: testes pulados, edge cases descobertos).
