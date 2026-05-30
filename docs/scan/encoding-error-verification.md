# Scan de Lacunas — Verificação: EncodingError Fix

## Escopo

Verificação das 3 recomendações implementadas para corrigir `EncodingError: The source image cannot been decoded`.

## O que parece sólido

| # | Recomendação | Status | Evidência |
|---|---|---|---|
| 1 | `img.decode()` no `loadImageElement` | ✅ Implementado | `speedPaintRenderer.ts:221-236` — `await img.decode()` após `onload`, reject em caso de falha |
| 2 | `preloadImage()` no `VideoPreview.tsx` | ✅ Implementado | `VideoPreview.tsx:20,230-242` — import de `@remotion/preload`, `useEffect` que pré-carrega todas as imagens das cenas com cleanup via `cancelFns` |
| 3 | `validateImageIsDecodable` helper + integração | ✅ Implementado | `validateImage.ts` (novo, 30 linhas) + `useAudioGenerator.ts:13,602-604` — valida imagem antes de adicionar às cenas |

**Todos os 4 arquivos esperados mudaram:**
- `src/features/video-render/lib/speedPaintRenderer.ts` — modificado
- `src/components/VideoPreview.tsx` — modificado
- `src/hooks/useAudioGenerator.ts` — modificado
- `src/lib/validateImage.ts` — novo arquivo

## Cobertura dos caminhos de imagem

| Caminho | Protegido por | Status |
|---|---|---|
| SpeedPaint preview (canvas) | `loadImageElement` com `img.decode()` | ✅ |
| SpeedPaint exportação (canvas) | `loadImageElement` via `SpeedPaintScene` | ✅ |
| Vídeo preview (cenas estáticas) | `preloadImage` + `<Img>` do Remotion com `delayRender`/`cancelRender` | ✅ |
| Vídeo exportação (cenas estáticas) | Reusa `VideoComposition` → `SceneSequence` → `<Img>` do Remotion | ✅ |
| Geração de cenas (useAudioGenerator) | `validateImageIsDecodable` antes de adicionar à lista | ✅ |
| **SpeedPaint processamento (imageProcessing.ts)** | **❌ Sem `img.decode()`** | **GAP** |
| **SpeedPaint exportação em lote (dimensões)** | **❌ Sem `img.decode()` em `loadImageDimensions`** | **GAP** |
| **Library → SpeedPaint importação** | **❌ Sem `validateImageIsDecodable`** | **GAP** |

## Lacunas priorizadas

| ID | Prioridade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| G1 | **MÉDIA** | Proteção ausente | 92 | `imageProcessing.ts` (`generateStrokesFromImage`) cria `new Image()` e desenha em canvas no `onload` sem chamar `img.decode()` antes. É o processador central de imagens do Speed Paint — usado por upload direto, Library→SpeedPaint, BatchOrchestrator e exportação em lote. | Linha 334: `const img = new Image();` → linha 364: `ctx.drawImage(img, 0, 0, width, height);` — sem `await img.decode()` intermediário. `loadImageElement` do `speedPaintRenderer.ts` tem `decode()`, mas `imageProcessing.ts` tem seu próprio carregador de imagens independente. | Fluxo direto (SpeedPaint page) usa `generateStrokesFromImage` diretamente. Library→SpeedPaint vai por `projectQueueAdapter.ts` → `BatchOrchestrator.tsx` → `generateStrokesFromImage`. Exportação em lote vai por `useSpeedPaintExporter.tsx` → `generateStrokesFromImage`. Nenhum desses caminhos tem `decode()`. | Adicionar `await img.decode()` antes do `ctx.drawImage()` no `onload` handler de `generateStrokesFromImage`? |
| G2 | **BAIXA** | Proteção ausente | 78 | `useSpeedPaintExporter.tsx` (`loadImageDimensions`, linhas 132-143) cria `new Image()` e lê `naturalWidth`/`naturalHeight` no `onload` sem `img.decode()`. Menor risco pois apenas lê dimensões (não desenha em canvas), mas pode falhar em imagens corrompidas. | Linha 134: `const image = new Image();` → linha 136: `resolve({ width: image.naturalWidth, height: image.naturalHeight })` — sem `decode()`. | Usado apenas para preflight de resolução antes da exportação em lote. Se a imagem for corrompida, o erro será capturado pelo catch do `startBatchRender`. Risco real baixo. | Adicionar `await image.decode()` antes de ler dimensões? Ouceptar o catch existente como suficiente? |
| G3 | **BAIXA** | Validação ausente | 75 | `projectQueueAdapter.ts` (Library→SpeedPaint) não usa `validateImageIsDecodable` antes de criar blob URL. Imagens corrompidas no Firestore/Storage passariam sem validação e falhariam mais tarde no `generateStrokesFromImage`. | `prepareProjectImagesForSpeedPaint` (linhas 37-72) faz `fetch` → `URL.createObjectURL(blob)` sem validar decodificação. | O erro será capturado pelo `try/catch` na linha 59 e a imagem será contada como `failed`. O usuário vê feedback de falha. Fluxo não quebra, mas a experiência é degradada (erro genérico em vez de mensagem específica). | Adicionar `validateImageIsDecodable` após criar o blob URL no `projectQueueAdapter.ts`? |

## Cenários de borda sem resposta

1. **Imagens geradas pelo Gemini com headers MIME multi-parâmetro**: A correção `extractPcmFromDataUrl` (v0.109.0) lidou com isso para áudio. Imagens geradas podem ter o mesmo problema? O `validateImageIsDecodable` usa `new Image()` + `img.decode()` que deveria lidar com isso, mas não há teste explícito.

2. **Race condition em cenas com transições rápidas**: O `preloadImage` no `VideoPreview.tsx` resolve a race condition na transição entre `Sequence`s. Mas se o usuário gerar cenas e imediatamente exportar (sem passar pelo preview), o `preloadImage` não terá sido chamado — a exportação depende do `delayRender` do Remotion.

## Checklist de sanidade

- [x] Li os 4 arquivos que deveriam ter mudado
- [x] Verifiquei `SceneSequence.tsx` — usa `<Img>` do Remotion com `delayRender`/`cancelRender` (protegido)
- [x] Verifiquei `useVideoExporter.tsx` — reusa `VideoComposition` → `SceneSequence` (protegido)
- [x] Verifiquei `useSpeedPaintExporter.tsx` — reusa `SpeedPaintScene` → `loadImageElement` (protegido)
- [x] Verifiquei `imageProcessing.ts` — **NÃO** tem `img.decode()` (GAP G1)
- [x] Verifiquei `BatchOrchestrator.tsx` — chama `generateStrokesFromImage` (afetado por G1)
- [x] Verifiquei `projectQueueAdapter.ts` — sem validação de decodificação (GAP G3)
- [x] Confirmei que `preloadImage` só é usado em `VideoPreview.tsx` (não em exportação)
