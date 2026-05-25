# Plano: Centralização da Geração de Speed Paint

**Status:** Aprovado | **Versão:** 0.49.1 | **Data:** 2026-05-25

---

## 1. Problema

### 1.1 Erro reportado

```
[useVideoExporter] Erro original na exportação
"A delayRender() "Gerando speed paint das cenas" was called but not cleared after 28000ms."
```

### 1.2 Causa raiz

A geração de speed paint está **triplicada** em 3 locais diferentes. O `VideoComposition.tsx` chama `delayRender('Gerando speed paint das cenas')` (linha 42) e tenta gerar speed paint **de novo** durante a exportação. Se a geração travar (Worker pendente, imagem inválida), `continueRender()` nunca é chamado → timeout de 28s do Remotion.

### 1.3 Diagnóstico completo

| Local | Arquivo:linha | Progresso | Warnings | Cancelamento | Estado | delayRender |
|-------|---------------|-----------|----------|-------------|--------|-------------|
| Preview (Player) | `VideoPreview.tsx:223` | ❌ | ❌ | ✅ (flag `cancelled`) | `useState` | ❌ |
| Exportação | `useVideoExporter.tsx:453` | ✅ (0-50%) | ✅ | ❌ (frágil) | variável local | ❌ |
| Composição | `VideoComposition.tsx:40` | ❌ | ❌ | ✅ (flag `cancelled`) | `useState` | ✅ **bug** |

**Todos os 3 locais** chamam `generateScenesWithSpeedPaint()` com `{ useWorker: true }`. Cada um cria seu próprio Worker. Todos usam o mesmo cache LRU (`strokeCache.ts`).

**Fluxo do bug na exportação:**

1. `useVideoExporter.startRender()` gera speed paint (linha 458) — algumas cenas podem falhar parcialmente (`animation: undefined`)
2. `renderMediaOnWeb` monta `VideoComposition` com as mesmas scenes
3. `shouldGenerateAnimations` (linha 40) detecta que alguma cena ficou sem `strokeAnimation`
4. `delayRender` é chamado (linha 42) e `generateScenesWithSpeedPaint` é disparado DE NOVO (linha 62)
5. Se essa segunda geração travar (mesmo problema da primeira), `continueRender` nunca é chamado
6. Timeout de 28s → erro lançado pelo `renderMediaOnWeb`

**Bugs contribuintes:**

- `VideoComposition.tsx:44-48`: Se `!animateScenes` mas `renderHandle` não é `null`, `continueRender` nunca é chamado
- `VideoComposition.tsx:86-91`: Cleanup do `useEffect` chama `continueRender` prematuramente, liberando o handle antes da promise `run()` terminar

---

## 2. Arquitetura Atual vs Proposta

### 2.1 Hoje (3 locais de geração — redundante e frágil)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOJE (3 LOCAIS DE GERAÇÃO)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VideoPreview.tsx          useVideoExporter.tsx                  │
│  ┌──────────────────┐      ┌──────────────────────┐             │
│  │ Gera speed paint │      │ Gera speed paint     │             │
│  │ Estado local     │      │ Progresso (0-50%)    │             │
│  │ Sem progresso    │      │ Warnings             │             │
│  │ Sem warnings     │      │ Cancel (frágil)      │             │
│  └──────┬───────────┘      └──────────┬───────────┘             │
│         │                             │                          │
│         │    ┌────────────────────────┼──────────┐              │
│         │    │  VideoComposition.tsx  │          │              │
│         │    │  ┌─────────────────────▼────────┐ │              │
│         │    │  │ Gera speed paint DE NOVO     │ │              │
│         │    │  │ delayRender (BLOQUEANTE!)    │ │ ← CAUSA      │
│         │    │  │ Se travar → timeout 28s ❌   │ │   DO BUG     │
│         │    │  └──────────────────────────────┘ │              │
│         │    └───────────────────────────────────┘              │
│         ▼                                                       │
│    @remotion/player          renderMediaOnWeb                   │
│    (preview)                 (exportação)                       │
│                                                                  │
│  Todos chamam generateScenesWithSpeedPaint()                     │
│  Todos criam Workers separados                                   │
│  Todos usam o mesmo cache LRU (strokeCache.ts) ✅                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Proposta (1 ponto central — robusto e consistente)

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOVO (1 PONTO DE GERAÇÃO)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  speedPaintService.ts ⭐ (ÚNICO PONTO DE VERDADE)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  enhanceScenesWithSpeedPaint(scenes, options)             │   │
│  │                                                           │   │
│  │  • Orquestra generateScenesWithSpeedPaint()               │   │
│  │  • Worker por chamada (cria/destrói a cada batch)         │   │
│  │  • Cache LRU (strokeCache.ts) — já existente              │   │
│  │  • Coleta warnings padronizados                           │   │
│  │  • Suporta AbortSignal + ignore flag (race condition)     │   │
│  │  • Progresso normalizado 0→1                              │   │
│  │  • Graceful degradation: cenas sem animação viram         │   │
│  │    estáticas (fallback SceneSequence)                     │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              ▼                         ▼                        │
│  useSpeedPaintEnhancer()        enhanceScenesWithSpeedPaint()   │
│  (Hook React)                   (Função pura/Promise)           │
│  ┌──────────────────────┐      ┌──────────────────────────┐    │
│  │ Uso: VideoPreview    │      │ Uso: useVideoExporter    │    │
│  │ • Lifecycle autom.   │      │ • startRender() chama    │    │
│  │ • Cancela ao desm.   │      │ • Integra com progresso  │    │
│  │ • Estado: enhanced   │      │ • Recebe AbortSignal     │    │
│  │   scenes, progress   │      │ • Recebe warnings        │    │
│  └──────────────────────┘      └──────────────────────────┘    │
│                                                                  │
│  VideoComposition.tsx — NÃO GERA MAIS NADA                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Apenas CONSOME scenes (já vêm com strokeAnimation)      │   │
│  │  Sem delayRender, sem generateScenesWithSpeedPaint       │   │
│  │  Sem useState para resolvedScenes                        │   │
│  │  Fallback natural: cena sem animação → SceneSequence     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Princípio:** O `speedPaintService.ts` é o **único arquivo que sabe gerar speed paint**. Todos os consumidores apenas chamam esse serviço. Se a lógica de geração precisar mudar, muda em 1 lugar.

---

## 3. API do Novo Módulo

### 3.1 Serviço puro: `speedPaintService.ts`

**Novo arquivo:** `src/features/video-render/lib/speedPaintService.ts`

```typescript
// ═══════════════════════════════════════════════════════════════
// Tipos
// ═══════════════════════════════════════════════════════════════

interface SpeedPaintEnhanceOptions {
  /** Callback de progresso normalizado 0→1 (chamado a cada cena processada) */
  onProgress?: (progress: number) => void;
  /** Sinal para cancelamento cooperativo (AbortController.signal) */
  signal?: AbortSignal;
}

interface SpeedPaintEnhanceResult {
  /** Cenas originais com strokeAnimation populado onde disponível.
   *  Cenas que falharam ficam sem o campo (undefined). */
  scenes: VideoScene[];
  /** Avisos para cenas que falharam.
   *  Formato: "Cena 3: Falha ao carregar imagem" */
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════
// Função principal
// ═══════════════════════════════════════════════════════════════

/**
 * Ponto ÚNICO de geração de speed paint no projeto.
 *
 * Orquestra generateScenesWithSpeedPaint() com:
 * - Verificação de cache LRU por cena (via strokeCache.ts)
 * - Worker por chamada (cria/destrói a cada batch — simples e seguro)
 * - Coleta padronizada de warnings
 * - Cancelamento cooperativo via AbortSignal
 * - Proteção contra race condition via ignore flag
 * - Progresso normalizado 0→1
 *
 * Usado por:
 * - useSpeedPaintEnhancer() — preview no VideoPreview
 * - startRender() — exportação no useVideoExporter
 *
 * @param scenes  Cenas a serem processadas (imageUrl obrigatório)
 * @param options Opções de progresso e cancelamento
 * @returns Cenas com strokeAnimation + warnings
 */
export async function enhanceScenesWithSpeedPaint(
  scenes: VideoScene[],
  options?: SpeedPaintEnhanceOptions,
): Promise<SpeedPaintEnhanceResult>;
```

**Detalhes de implementação:**

| Aspecto | Comportamento |
|---------|---------------|
| Worker | Criado e terminado a cada chamada via `generateScenesWithSpeedPaint({ useWorker: true })`. Sem estado entre chamadas. |
| Cache | Verifica `strokeCache.get()` para cada cena antes de processar. Cache hit = instantâneo. |
| Processamento | Usa o worker path de `generateScenesWithSpeedPaint` quando >5 cenas. |
| Cancelamento | Se `signal.aborted`, interrompe o loop e retorna resultado parcial. O `ignore` flag interno impede que resultados stale atualizem estado. |
| Warnings | Coleta `"Cena {i+1}: {mensagem}"` para cada falha. Retorna array vazio se tudo OK. |
| Fallback | Cenas sem `strokeAnimation` são retornadas como estão — o `VideoComposition` usa `SceneSequence` para elas. |

### 3.2 Hook React: `useSpeedPaintEnhancer.ts`

**Novo arquivo:** `src/features/video-render/hooks/useSpeedPaintEnhancer.ts`

```typescript
// ═══════════════════════════════════════════════════════════════
// Tipos
// ═══════════════════════════════════════════════════════════════

interface UseSpeedPaintEnhancerOptions {
  /** Se a geração está habilitada (default: true).
   *  Quando false, retorna as scenes sem modificação. */
  enabled?: boolean;
  /** Callback de progresso normalizado 0→1 */
  onProgress?: (progress: number) => void;
}

interface UseSpeedPaintEnhancerResult {
  /** Cenas com strokeAnimation populado (ou scenes originais se disabled) */
  enhancedScenes: VideoScene[];
  /** Se está processando ativamente */
  isProcessing: boolean;
  /** Progresso normalizado 0→1 */
  progress: number;
  /** Warnings de cenas que falharam */
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════

/**
 * Hook React para geração de speed paint em componentes.
 *
 * Gerencia lifecycle automaticamente:
 * - Dispara quando scenes ou enabled mudam
 * - Cancela ao desmontar
 * - Cancela processo anterior quando scenes mudam
 *
 * Uso principal: VideoPreview (preview do player Remotion)
 *
 * @param scenes  Cenas a serem processadas
 * @param options Opções de enable e progresso
 * @returns Estado da geração (cenas, progresso, warnings)
 */
export function useSpeedPaintEnhancer(
  scenes: VideoScene[],
  options?: UseSpeedPaintEnhancerOptions,
): UseSpeedPaintEnhancerResult;
```

**Detalhes de implementação:**

| Aspecto | Comportamento |
|---------|---------------|
| Lifecycle | `useEffect` com dependências `[scenes, enabled]` |
| Cancelamento | `AbortController` via `useRef` — aborta ao desmontar ou quando dependências mudam |
| Race condition | `useRef` para `renderId` + `ignore` flag interno — ignora resultados de chamadas antigas |
| Estado inicial | Se `enabled=false`, retorna `scenes` sem modificação imediatamente |
| Progresso | Estado interno atualizado via `onProgress` do serviço |

---

## 4. Mudanças nos Consumidores

### 4.1 `VideoPreview.tsx` (~25 linhas removidas)

**Arquivo:** `src/components/VideoPreview.tsx`

```diff
// ═══════════ ANTES (linhas 217-262) ═══════════

  const mappedScenes = useMemo(
    () => mapScenesToVideoScenes(scenes, durationInFrames, fps),
    [scenes, durationInFrames, fps],
  );
- const [previewScenes, setPreviewScenes] = useState<VideoScene[]>(mappedScenes);
- 
- useEffect(() => {
-   let cancelled = false;
-   setPreviewScenes(mappedScenes);
-   if (!animateScenes || mappedScenes.length === 0) {
-     return () => { cancelled = true; };
-   }
-   const enhanceScenesWithSpeedPaint = async () => {
-     try {
-       const results = await generateScenesWithSpeedPaint(
-         mappedScenes.map((scene) => ({ imageUrl: scene.imageUrl })),
-         undefined,
-         { useWorker: true },
-       );
-       if (cancelled) return;
-       setPreviewScenes(
-         mappedScenes.map((scene, index) => ({
-           ...scene,
-           strokeAnimation: results[index]?.animation,
-         })),
-       );
-     } catch {
-       if (!cancelled) setPreviewScenes(mappedScenes);
-     }
-   };
-   void enhanceScenesWithSpeedPaint();
-   return () => { cancelled = true; };
- }, [animateScenes, mappedScenes]);

// ═══════════ DEPOIS ═══════════

+ const { enhancedScenes } = useSpeedPaintEnhancer(mappedScenes, {
+   enabled: animateScenes,
+ });

  // inputProps usa enhancedScenes em vez de previewScenes
  const inputProps = useMemo(() => ({
-   scenes: previewScenes,
+   scenes: enhancedScenes,
    audioUrl: audioUrl ?? '',
    fps,
    captions: captionVisible ? (captions ?? undefined) : undefined,
    subtitleStyle,
    showDrawTool,
- }), [previewScenes, audioUrl, fps, captions, subtitleStyle, captionVisible, showDrawTool]);
+ }), [enhancedScenes, audioUrl, fps, captions, subtitleStyle, captionVisible, showDrawTool]);

// Remove imports:
// - import { generateScenesWithSpeedPaint } from '../features/video-render';
// Adiciona import:
// + import { useSpeedPaintEnhancer } from '../features/video-render/hooks/useSpeedPaintEnhancer';
```

**Impacto:** Remove ~25 linhas, elimina `useState` local, ganha warnings e progresso automaticamente.

---

### 4.2 `useVideoExporter.tsx` (~40 linhas removidas)

**Arquivo:** `src/features/video-render/hooks/useVideoExporter.tsx`

```diff
// ═══════════ ANTES (linhas 452-492) ═══════════

  // Gera strokeAnimations para cenas quando o toggle está ativo
  if (animateScenes && mappedScenes.length > 0) {
    const SPEED_PAINT_PHASE_WEIGHT = 50;
    try {
      log.info('Gerando strokeAnimations para cenas', { sceneCount: mappedScenes.length });
-     const strokeResults = await generateScenesWithSpeedPaint(
-       mappedScenes.map((s) => ({ imageUrl: s.imageUrl })),
-       (progress) => {
-         const pct = Math.round(progress * SPEED_PAINT_PHASE_WEIGHT);
-         if (pct !== lastReportedPercentRef.current) {
-           lastReportedPercentRef.current = pct;
-           setState(prev => ({
-             ...prev,
-             renderProgress: pct,
-             renderStatusText: `Gerando animações... ${pct}%`,
-           }));
-         }
-       },
-       { useWorker: true },
-     );
- 
-     mappedScenes = mappedScenes.map((scene, index) => {
-       const result = strokeResults[index];
-       if (result?.error) {
-         collectedWarnings.push(`Cena ${index + 1}: ${result.error}`);
-       }
-       return {
-         ...scene,
-         strokeAnimation: result?.animation,
-       };
-     });
- 
-     speedPaintPhaseWeightRef.current = SPEED_PAINT_PHASE_WEIGHT;
-   } catch (err) {
-     log.warn('Falha ao gerar strokeAnimations — exportando sem animação', { error: err });
-     collectedWarnings = ['Falha geral ao gerar animações de speed paint.'];
-   }
+     const result = await enhanceScenesWithSpeedPaint(mappedScenes, {
+       onProgress: (progress) => {
+         const pct = Math.round(progress * SPEED_PAINT_PHASE_WEIGHT);
+         if (pct !== lastReportedPercentRef.current) {
+           lastReportedPercentRef.current = pct;
+           setState(prev => ({
+             ...prev,
+             renderProgress: pct,
+             renderStatusText: `Gerando animações... ${pct}%`,
+           }));
+         }
+       },
+       signal: abortController.signal,
+     });
+     mappedScenes = result.scenes;
+     collectedWarnings = result.warnings;
+     speedPaintPhaseWeightRef.current = SPEED_PAINT_PHASE_WEIGHT;
    }
```

```diff
// Remove import:
- import { generateScenesWithSpeedPaint } from '../lib/speedPaintRenderer';
// Adiciona import:
+ import { enhanceScenesWithSpeedPaint } from '../lib/speedPaintService';
```

**Impacto:** Remove ~35 linhas, ganha cancelamento cooperativo via `AbortSignal`, warnings já vêm formatados.

---

### 4.3 `VideoComposition.tsx` (~55 linhas removidas)

**Arquivo:** `src/features/video-render/components/VideoComposition.tsx`

```diff
// ═══════════ ANTES (linhas 1-13 imports) ═══════════

- import React, { useEffect, useMemo, useState } from 'react';
- import { AbsoluteFill, Sequence, continueRender, delayRender } from 'remotion';
+ import React, { useMemo } from 'react';
+ import { AbsoluteFill, Sequence } from 'remotion';
  import { Audio } from '@remotion/media';
  import type { CaptionWord, VideoCompositionProps } from '../types';
  import { SPEED_PAINT_MULTIPLIERS } from '../types';
  import type { SpeedPaintSpeed } from '../types';
  import { getSpeedPaintOverlapFrames } from '../lib/speedPaintTimings';
- import { generateScenesWithSpeedPaint } from '../lib/speedPaintRenderer';
  import { msToFrames } from '../lib/videoUtils';
  import { SceneSequence } from './SceneSequence';
  import { SpeedPaintScene } from './SpeedPaintScene';
  import { SubtitleOverlay } from './SubtitleOverlay';
  import { WaveformOverlay } from './WaveformOverlay';
```

```diff
// ═══════════ ANTES (linhas 40-92 — TODO o bloco de geração) ═══════════

  export const VideoComposition = React.memo(function VideoComposition({
    scenes,
    audioUrl,
    fps,
    animateScenes = false,
    captions,
    subtitleStyle,
    isExporting,
    speedPaintSpeed = 'normal',
    speedPaintMultipliers,
    showDrawTool = true,
  }: VideoCompositionProps) {
-   const shouldGenerateAnimations = animateScenes && scenes.some((scene) => !scene.strokeAnimation);
-   const [resolvedScenes, setResolvedScenes] = useState(scenes);
-   const [renderHandle] = useState(() => (animateScenes ? delayRender('Gerando speed paint das cenas') : null));
- 
-   useEffect(() => {
-     if (!animateScenes) {
-       setResolvedScenes(scenes);
-       return;
-     }
-     if (!shouldGenerateAnimations) {
-       setResolvedScenes(scenes);
-       if (renderHandle !== null) continueRender(renderHandle);
-       return;
-     }
-     let cancelled = false;
-     const run = async () => {
-       const missingScenes = scenes.map((scene) => ({ imageUrl: scene.imageUrl }));
-       const results = await generateScenesWithSpeedPaint(missingScenes, undefined, { useWorker: true });
-       if (cancelled) return;
-       setResolvedScenes(
-         scenes.map((scene, index) => ({
-           ...scene,
-           strokeAnimation: scene.strokeAnimation ?? results[index]?.animation,
-         })),
-       );
-       if (renderHandle !== null) continueRender(renderHandle);
-     };
-     void run().catch(() => {
-       if (cancelled) return;
-       setResolvedScenes(scenes);
-       if (renderHandle !== null) continueRender(renderHandle);
-     });
-     return () => {
-       cancelled = true;
-       if (renderHandle !== null) continueRender(renderHandle);
-     };
-   }, [animateScenes, renderHandle, scenes, shouldGenerateAnimations]);
- 
-   const totalScenes = resolvedScenes.length;
+   const totalScenes = scenes.length;
    const speedPaintOverlapFrames = useMemo(() => getSpeedPaintOverlapFrames('default', fps), [fps]);

    // Pré-computa captions por cena
    const sceneCaptionsMap = useMemo(() => {
      if (!captions || captions.length === 0) return new Map<number, CaptionWord[]>();
      const map = new Map<number, CaptionWord[]>();
-     for (let index = 0; index < resolvedScenes.length; index++) {
-       const scene = resolvedScenes[index];
+     for (let index = 0; index < scenes.length; index++) {
+       const scene = scenes[index];
        // ... (resto do cálculo de captions — inalterado)
      }
      return map;
-   }, [captions, resolvedScenes, fps, speedPaintOverlapFrames]);
+   }, [captions, scenes, fps, speedPaintOverlapFrames]);
```

```diff
// ═══════════ JSX — trocar resolvedScenes por scenes ═══════════

    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        {audioUrl && <Audio src={audioUrl} />}
-       {resolvedScenes.map((scene, index) => {
+       {scenes.map((scene, index) => {
          // ... (resto do JSX — inalterado)
        })}
      </AbsoluteFill>
    );
  });
```

**Impacto:** Remove ~55 linhas (42% do arquivo), elimina `delayRender`/`continueRender`, elimina `generateScenesWithSpeedPaint`, elimina `useState`/`useEffect` de geração.

**Fallback natural:** Cenas sem `strokeAnimation` já caem no `SceneSequence` (linhas 177-184) — nenhuma lógica nova necessária.

---

## 5. O Que Fica Igual (Intocado)

| Arquivo | Motivo |
|---------|--------|
| `speedPaintRenderer.ts` | Motor de geração — continua sendo usado internamente pelo `speedPaintService.ts` |
| `strokeCache.ts` | Cache LRU — já funciona bem, continua sendo usado pelo serviço |
| `strokeWorker.ts` | Worker — continua sendo usado internamente |
| `speedPaintTimings.ts` | Timings — consumido por `VideoComposition` e `SpeedPaintScene` (não pela geração) |
| `SpeedPaintScene.tsx` | Componente de renderização — não gera, só desenha |
| `SceneSequence.tsx` | Fallback estático — não gera, só exibe |
| `SpeedPaintComposition.tsx` | Composição do Speed Paint standalone — fora do escopo video-render |
| `SpeedPaintPage.tsx` | Página de Speed Paint — fora do escopo video-render |

---

## 6. Benefícios

| Dimensão | Ganho |
|----------|-------|
| **Bug corrigido** | `delayRender` removido do `VideoComposition` → sem timeout de 28s |
| **Código removido** | ~130 linhas duplicadas eliminadas |
| **Novo código** | ~130 linhas (80 serviço + 50 hook) |
| **Worker** | Worker por chamada — simples, sem risco de vazamento, sem estado entre chamadas |
| **Warnings** | Antes só no `useVideoExporter`; agora `VideoPreview` também recebe |
| **Cancelamento** | Flag `cancelled` + `AbortSignal` — dupla proteção contra race condition e cancellation |
| **Consistência** | Mesmo tratamento de erro, mesmas mensagens, mesmo fluxo nos 3 consumidores |
| **Testabilidade** | `enhanceScenesWithSpeedPaint` é função pura testável com Vitest |
| **Manutenibilidade** | Mudar lógica de geração = mudar 1 arquivo (`speedPaintService.ts`) |

---

## 7. Ordem de Implementação

| Etapa | O que fazer | Arquivos afetados | Riscos |
|-------|-------------|-------------------|--------|
| **1** | Criar `speedPaintService.ts` com `enhanceScenesWithSpeedPaint()` | 1 novo | Baixo — função nova, sem consumidores |
| **2** | Criar `useSpeedPaintEnhancer.ts` | 1 novo | Baixo — hook novo |
| **3** | Migrar `useVideoExporter.tsx` para usar o serviço | 1 existente | Médio — exportação é caminho crítico |
| **4** | Migrar `VideoPreview.tsx` para usar o hook | 1 existente | Médio — preview é caminho crítico do usuário |
| **5** | Simplificar `VideoComposition.tsx` (remover geração) | 1 existente | Baixo — só remove código |
| **6** | Rodar `bun run typecheck` | — | — |
| **7** | Rodar `bun run test` | — | — |
| **8** | Testar preview + exportação com várias cenas (5, 10, 20) | — | Validar que não há regressão |

---

## 8. Decisões Confirmadas

### 8.1 Worker compartilhado vs Worker por chamada

**Decisão: Opção B (Worker por chamada).** O cache LRU já evita reprocessamento na maioria dos casos. A simplicidade e segurança (sem vazamentos, sem estado entre chamadas) compensam o overhead mínimo de criar o Worker por batch.

### 8.2 Hook vs serviço puro no `useVideoExporter`

**Confirmado.** O `startRender` é uma função `async` dentro de um hook — hooks não podem ser chamados dentro de callbacks. A separação serviço puro + hook separado resolve o problema corretamente:
- `useSpeedPaintEnhancer` → para VideoPreview (componente React)
- `enhanceScenesWithSpeedPaint()` → para useVideoExporter (função pura assíncrona)

### 8.3 Manter `generateScenesWithSpeedPaint` exportado?

**Confirmado.** A função em `speedPaintRenderer.ts` ainda é usada por:
- `SpeedPaintComposition.tsx` — composição standalone
- `SpeedPaintPage.tsx` — página de Speed Paint
- `projectQueueAdapter.ts` — adaptador da biblioteca

O novo `speedPaintService.ts` é um **wrapper** para o contexto video-render. A função original continua exportada e intocada para os outros contextos.

---

## 9. Rollback

Se algo der errado após o deploy:

1. O `generateScenesWithSpeedPaint` original em `speedPaintRenderer.ts` não foi alterado
2. `VideoComposition`, `VideoPreview` e `useVideoExporter` podem voltar ao código anterior via git revert
3. O `speedPaintService.ts` e `useSpeedPaintEnhancer.ts` são arquivos novos — sem risco de quebrar código existente se não forem importados

A migração é **incremental**: cada consumidor pode ser migrado independentemente. Se a etapa 3 (VideoPreview) falhar, as etapas 4 e 5 ainda não foram feitas.
