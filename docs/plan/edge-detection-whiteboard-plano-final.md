# Plano: Edge Detection + Curvas Bezier para Modo Whiteboard (Marcador)

**Versão:** 1.0  
**Data:** 2026-06-16  
**Autor:** Arquiteto (Nexus)  
**Status:** ✅ Aprovado — pronto para execução  

---

## Contexto

O modo vetorial do Speed Paint (modo "Desenho") atualmente usa `imagetracerjs@1.2.6` para converter pixels em paths SVG fechados e finos (strokeWidth 2), gerando 100–500 paths por cena que parecem "rabiscos" preenchendo área. O resultado visual é de baixa qualidade e o alto número de paths causa GPU timeout no Remotion durante exportação via WebCodecs.

O usuário (Matheus) solicitou um pipeline novo baseado em **Edge Detection + Contour Tracing + Bezier Curves** que produza **5–50 traços contínuos grossos** (strokeWidth 6–12, strokeLinecap round) — como uma caneta piloto contornando a imagem.

**Fonte:** `docs/plan/edge-detection-whiteboard-base.md` §1, `docs/plan/edge-detection-whiteboard-research.md` §2, `docs/plan/edge-detection-whiteboard-architecture.md` §1

---

## Escopo

### O que entra
- Pipeline de edge detection (Canny simplificado: Gaussian Blur + Sobel + NMS + double threshold + hysteresis)
- Contour tracing (Moore-Neighbor com regra de Jacob Eliosoff)
- Curve fitting (Ramer-Douglas-Peucker + Cubic Bezier least squares)
- Amostragem de cor por pixel do contorno (em vez de paleta quantizada)
- 4 novos presets: `edge-default`, `edge-detailed`, `edge-bold`, `edge-sketch`
- `MAX_PATHS_PER_SCENE` reduzido de 150 → 60
- `DEFAULT_PRESET` alterado de `'artistic1'` → `'edge-default'`
- `totalDurationMs` recalibrado (`max(3000, paths.length * 120)`)
- `penScale` no WhiteboardScene (caneta proporcional ao strokeWidth)
- Testes unitários (3 novos arquivos) + testes de integração
- Retrocompatibilidade total com modo `'mask'` e presets `imagetracerjs` legados

### O que NÃO entra (nesta versão)
- Web Worker para o pipeline edge+bezier (Fase 2 futura)
- Remoção do `imagetracerjs` das dependências (mantido como fallback)
- UI de novos parâmetros (threshold, epsilon) na interface do usuário
- Batch vetorial (`runBatchRender` para modo vetorial) — mesma limitação atual
- Threshold adaptativo (Otsu) — pode ser adicionado na Fase 4 se necessário

**Fonte:** `docs/plan/edge-detection-whiteboard-base.md` §2, `docs/plan/edge-detection-whiteboard-architecture.md` §6.1

---

## Decisões (MDE)

### Decisões Tomadas

| ID | Decisão | Problema | Opções | Escolha | Justificativa | Fonte |
|----|---------|----------|--------|---------|---------------|-------|
| **D1** | Algoritmo de edge detection | Canny vs Sobel simplificado | (a) Sobel + threshold simples, (b) Canny completo (5 etapas) | **Canny completo** | Canny produz bordas mais limpas (NMS afina, hysteresis conecta). Sobel simples produz bordas grossas e quebradas — insuficiente para curve fitting | `architecture.md` §14.D1, `research.md` §6.1 |
| **D2** | Algoritmo de contour tracing | Moore-Neighbor vs Marching Squares | (a) Marching Squares LUT 16 entradas, (b) Moore-Neighbor | **Moore-Neighbor** | Produz sequências ordenadas de pontos → ideais para RDP + Bezier. Marching Squares produz segmentos soltos | `architecture.md` §14.D2, `research.md` §6.2 |
| **D3** | Curve fitting | RDP + Bezier vs Catmull-Rom | (a) Catmull-Rom + conversão, (b) RDP + Least Squares Bezier | **RDP + Least Squares Bezier** | RDP preserva cantos, Bezier é nativo SVG, least squares é preciso mesmo com ruído | `architecture.md` §14.D3, `research.md` §6.3 |
| **D4** | Estratégia de cor dos paths | Amostragem vs paleta vs cor fixa | (a) Média da região, (b) Cor fixa `#222`, (c) Amostragem no primeiro pixel do contorno | **Amostragem no primeiro pixel** | O(1), determinístico, simples. Preserva cor original da borda | `architecture.md` §14.D4, §5 |
| **D5** | Local de execução | Main thread vs Web Worker | (a) Main thread (como atual), (b) Worker via OffscreenCanvas | **Main thread (Fase 1), Worker (Fase 2)** | `vectorizeImage()` já é async e checa abort. Custo <500ms = mesma ordem do imagetracerjs atual | `architecture.md` §14.D5, §6 |
| **D6** | Estratégia de presets | Novos valores vs campo separado | (a) `pipelineMode` explícito, (b) Prefixo `edge-*` na union existente | **Prefixo `edge-*` na union** | Mais simples, discriminado por prefixo. `pipelineMode` existe como override explícito | `architecture.md` §14.D6, §4.1 |
| **D7** | MAX_PATHS_PER_SCENE | Manter 150 vs reduzir | (a) 150, (b) 60, (c) 30 | **60** | GPU timeout mitigado com 5–50 paths. Safety limit para ambos os pipelines | `architecture.md` §14.D7, §10.2 |
| **D8** | Fórmula totalDurationMs | Manter vs recalibrar | (a) `max(2000, len * 80)`, (b) `max(3000, len * 120)` | **`max(3000, len * 120)`** | Menos paths porém mais longos exigem mais tempo de animação. Fator 120 ms/path | `architecture.md` §14.D8, §10.4 |
| **D9** | Escala da caneta (penScale) | Fixo vs derivado | (a) Prop fixa na UI, (b) Derivado de `paths[0].strokeWidth` | **Derivado automaticamente** | `penScale = strokeWidth / 4`. Automático e consistente | `architecture.md` §14.D9, §11 |

### Decisões Pendentes

| Decisão | Problema | Opções | Ação | Quando |
|---------|----------|--------|------|--------|
| **Web Worker** | Pipeline edge+bezier bloqueia a UI | (a) Main thread, (b) Worker automático | Decidir na Fase 2 após medir latência real | Fase 2 |
| **Presets legados na UI** | Novos presets podem confundir | (a) Manter todos, (b) Submenu "Legado" | Decidir após feedback do Matheus | Fase 4 |
| **StrokeWidth dinâmico** | Paths mais largos em contornos mais espessos | (a) Fixo por preset, (b) Variável por path | Prototipar e validar visualmente | Fase 4 |

---

## Reutilização e Padrões

### O que REUTILIZAR
- `VetorialPath` tipo (`{ d, length, color, strokeWidth }`) — inalterado
- `VetorialAnimation` tipo — inalterado
- `sortPaths()` — ordenação espacial dos paths — funciona com qualquer path SVG
- `filterPathsByBackgroundContrast()` — filtro de paths invisíveis — continua útil
- `truncatePaths()` — limitador de paths por cena — `MAX_PATHS_PER_SCENE` ajustado para 60
- `strokeCache.ts` — cache LRU — chave SHA-256 já inclui `preset`, compatível nativamente
- `safeGetPointAtLength()` — fallback de path malformado — já existe no `WhiteboardScene`
- `WhiteboardScene.tsx` — componente Remotion — aceita paths de qualquer strokeWidth
- `speedPaintRenderer.ts`, `speedPaintService.ts` — orquestração de cenas — inalterados
- `imageProcessing.ts:generateStrokesFromImage()` — API pública — assinatura idêntica
- `animationStore.ts`, `speedPaintRenderController.tsx` — stores — inalteradas
- `SpeedPaintPage.tsx` — UI — presets `edge-*` aparecem no dropdown automaticamente

### O que CRIAR do zero (5 arquivos)
- `edgeDetection.ts` — `detectEdges()` (Canny simplificado)
- `contourTracing.ts` — `traceContours()` (Moore-Neighbor)
- `bezierFitting.ts` — `fitBezierPaths()` (RDP + cubic Bezier)
- Testes unitários para cada um dos 3 acima

### O que MODIFICAR (7 arquivos)
- `types/vetorial.ts` — +4 presets
- `constants/vetorialPresets.ts` — +1 grupo
- `vectorizer.ts` — branch por preset, novos campos, DEFAULT_PRESET, MAX_PATHS_PER_SCENE
- `imageProcessing.ts` — `totalDurationMs`, passar novas options
- `WhiteboardScene.tsx` — `penScale` prop
- `vectorizer.unit.test.ts` — novos testes
- `imageProcessing.vetorial.integration.test.ts` — testes edge+bezier

**Fonte:** `docs/plan/edge-detection-whiteboard-base.md` §8, `docs/plan/edge-detection-whiteboard-architecture.md` §13

---

## Arquivos e Áreas Prováveis

| Padrão | Área Provável |
|--------|---------------|
| `src/features/speed-paint/lib/` | Speed Paint — pipeline (edgeDetection, contourTracing, bezierFitting) |
| `src/features/speed-paint/types/` | Speed Paint — tipos (vetorial.ts) |
| `src/features/speed-paint/constants/` | Speed Paint — presets (vetorialPresets.ts) |
| `src/features/video-render/components/` | Video Render — WhiteboardScene.tsx |
| `tests/speed-paint/` | Testes do Speed Paint |
| `tests/video-render/` | Testes do Video Render |

Paths específicos mais prováveis de mudança:
- `src/features/speed-paint/lib/vectorizer.ts` — reescrita parcial (branch do pipeline) — Fonte: `architecture.md` §4
- `src/features/speed-paint/lib/imageProcessing.ts` — ajuste de `totalDurationMs` — Fonte: `architecture.md` §10.4

---

## Estratégia Técnica

### Fluxo de dados completo

```
ImageData (Uint8ClampedArray, w, h)
  → detectEdges() → edgeMap (Uint8Array 0/1, w×h)
  → traceContours() → Contour[] ({ points: Point2D[], closed: boolean })
  → fitBezierPaths() → BezierPath[] ({ d: string, length: number })
  → sampleColors() + mount → VetorialPath[] ({ d, length, color, strokeWidth })
  → sortPaths() + filterPathsByBackgroundContrast() + truncatePaths()
  → VetorialAnimation
```

### Branch de pipeline

O `vectorizeImage()` decide qual pipeline usar baseado no prefixo do preset:
- `'edge-*'` → pipeline edge+bezier (novo)
- demais → imagetracerjs (legado, preservado)

### Web Worker

Fase 1: main thread (assíncrono com checagem de abort a cada etapa)
Fase 2: Web Worker via OffscreenCanvas + Transferable Objects

**Fonte:** `docs/plan/edge-detection-whiteboard-architecture.md` §2, §4, §6

---

## Passos de Implementação

### Fase 1 — Fundação (pode paralelizar)

**Leva 1.1 — Tipos e Presets (~15 min)**
1. Adicionar 4 novos valores a `VetorialPreset` em `types/vetorial.ts`
2. Adicionar grupo `'edge-detection'` em `VETORIAL_PRESETS_GROUPED`
   - Agent: `worker` | Evidência: `architecture.md` §8 | Notebook: `f220c012` (Zod) se necessário

**Leva 1.2 — Edge Detection (~2h)**
1. Criar `edgeDetection.ts` com `detectEdges()`:
   - Gaussian Blur (5×5 kernel, σ default 1.0)
   - Sobel operator (Gx, Gy 3×3)
   - Non-Maximum Suppression
   - Double threshold + hysteresis (Canny completo)
2. Criar `tests/speed-paint/edgeDetection.unit.test.ts`
   - Testar com imagem sintética 50×50 (quadrado branco em fundo preto)
   - Testar com imagem sem bordas (fundo sólido)
   - Testar com parâmetros diferentes (threshold, blurSigma)
   - Agent: `worker` | Evidência: `architecture.md` §3.1, `research.md` §6.1

**Leva 1.3 — WhiteboardScene penScale (~1h)**
1. Adicionar prop `penScale` opcional à `WhiteboardSceneProps`
2. Implementar default: `(animation.paths[0]?.strokeWidth ?? 2) / 4`
3. Aplicar `scale(${penScale})` no `<g>` do `Pencil`
4. Testar visual com paths de strokeWidth 8 e 12
   - Agent: `worker` | Evidência: `architecture.md` §11 | Notebook: `3333bad6` (Remotion) se necessário

---

### Fase 2 — Pipeline Core

**Leva 2.1 — Contour Tracing (~2h)**
1. Criar `contourTracing.ts` com `traceContours()`:
   - Moore-Neighbor tracing com 8-vizinhança
   - Regra de Jacob Eliosoff (parar quando visitar pixel inicial pela 2ª vez na mesma direção)
   - Filtro `minContourLength` (descarta ruído < 10px)
   - Forks (junções T/Y): prioridade por menor mudança angular
2. Criar `tests/speed-paint/contourTracing.unit.test.ts`
   - Testar com edgeMap controlado (quadrado, linha reta, fork em T)
   - Agent: `worker` | Evidência: `architecture.md` §3.2, `research.md` §6.2

**Leva 2.2 — Bezier Fitting (~3h)**
1. Criar `bezierFitting.ts` com `fitBezierPaths()`:
   - Ramer-Douglas-Peucker (ε default 2.0)
   - Cubic Bezier least squares fitting (algoritmo de Schneider, 1990)
   - Subdivisão recursiva (max 10 para evitar loop)
   - Geração de string SVG `d` com comandos `M` + `C`
   - Validação de paths via `@remotion/paths.getLength()`
2. Criar `tests/speed-paint/bezierFitting.unit.test.ts`
   - Testar com contornos sintéticos (círculo, zigzag, linha reta)
   - Validar que paths SVG gerados são renderizáveis
   - Agent: `worker` | Evidência: `architecture.md` §3.3, `research.md` §6.3

---

### Fase 3 — Integração

**Leva 3.1 — Vectorizer (~2h)**
1. Modificar `vectorizer.ts`:
   - Adicionar `edgeThreshold`, `contourEpsilon`, `pipelineMode` a `VectorizeOptions`
   - Adicionar branch em `vectorizeImage()`: `preset.startsWith('edge-')` → pipeline novo
   - Implementar `sampleColors()` (amostragem do primeiro pixel do contorno)
   - Alterar `DEFAULT_PRESET` de `'artistic1'` para `'edge-default'`
   - Alterar `MAX_PATHS_PER_SCENE` de 150 para 60
   - Fallback automático: se edge detection não encontrar bordas, re-tenta com threshold mais baixo
2. Adicionar testes em `tests/speed-paint/vectorizer.unit.test.ts`
   - Testar pipeline edge+bezier com imagem sintética
   - Testar fallback preservado do imagetracerjs
   - Agent: `worker` | Evidência: `architecture.md` §4, §5, §10.2

**Leva 3.2 — ImageProcessing (~1h)**
1. Modificar `imageProcessing.ts`:
   - `totalDurationMs`: `max(2000, paths.length * 80)` → `max(3000, paths.length * 120)`
   - `GenerateStrokesOptions` (se necessário para passar novos parâmetros ao vectorizer)
2. Atualizar `tests/speed-paint/imageProcessing.vetorial.integration.test.ts`
   - Testar geração com preset `edge-default`
   - Agent: `worker` | Evidência: `architecture.md` §10.4

---

### Fase 4 — Estabilização

**Leva 4.1 — Testes e Calibração (~2h)**
1. Testes comparativos: rodar pipeline edge+bezier vs imagetracerjs com 10 imagens diversas
2. Calibrar parâmetros default (threshold, epsilon, strokeWidth) com feedback do Matheus
3. Testes de performance: medir latência para 1920×1080 (< 2000ms alvo)
4. Rodar bateria completa de testes: `bun run test` (2268+ testes, zero regressão)
5. Rodar `bun run lint` e `bun run typecheck`
   - Agent: `test` (testes), `code-validator` (qualidade) | Evidência: `research.md` §8

---

## Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação | Fonte |
|-------|:-----:|:-------:|-----------|-------|
| **GPU timeout no Remotion** | Baixa | Alto | 5–50 paths (vs 150 atuais) resolve naturalmente. `MAX_PATHS_PER_SCENE=60` como safety | `research.md` §6.4, `base.md` §9 |
| **Edge detection lento em 1920×1080** | Média | Médio | Implementar com acesso linear a `Uint8Array` (~400ms estimado no Worker). Fallback: resize para 1280×720 | `research.md` §6.7 |
| **Contornos com forks (junções T/Y) mal resolvidos** | Média | Médio | Moore-Neighbor com prioridade angular. Pixel alternativo vira novo contorno | `architecture.md` §12.4 |
| **Paths Bezier mal formados (autointersecção)** | Média | Médio | `safeGetPointAtLength()` já existe. `fitBezierPaths` valida cada path com `getLength()` | `architecture.md` §12.6 |
| **totalDurationMs subestimado** | Média | Baixo | Fórmula recalibrada: `max(3000, len * 120)`. Ajustável depois | `architecture.md` §10.4 |
| **Perda de qualidade em imagens fotográficas** | Alta | Médio | Fallback automático com threshold mais baixo. Presets `edge-detailed` + `imagetracerjs` disponíveis | `architecture.md` §12.2 |
| **Regressão em testes existentes** | Baixa | Alto | Pipeline legado intacto. Testes de regressão no `vectorizer.unit.test.ts` | `architecture.md` §13.3 |

---

## Verificação

### Gate de Qualidade Pós-Implementação

- [ ] `bun run typecheck` — 0 erros
- [ ] `bun run lint` — 0 erros, 0 warnings
- [ ] `bun run test` — 2268+ testes passando (zero regressão)
- [ ] `vectorizeImage({ preset: 'edge-default' })` produz paths com strokeWidth >= 6
- [ ] `vectorizeImage({ preset: 'artistic1' })` produz paths idênticos ao comportamento atual (regressão)
- [ ] Cache LRU: mesma imagem + mesmo preset → cache hit
- [ ] Cache LRU: mesma imagem + presets diferentes → cache miss
- [ ] WhiteboardScene exibe caneta proporcional ao strokeWidth
- [ ] Imagem sem bordas retorna `[]` (sem crash)
- [ ] Imagem >1920×1080 é redimensionada antes do processamento
- [ ] `AbortSignal` cancela pipeline no meio (teste manual)
- [ ] Modo `'mask'` completamente inalterado (teste de regressão visual)
- [ ] `code-validator` aprovou qualidade do código
- [ ] `gap-finder` aprovou cobertura do escopo

---

## Instruções de Execução

### Documento de Execução

O **Tracker** (`docs/plan/edge-detection-whiteboard-tracker.md`) é o documento de execução que deve ser **seguido e atualizado** durante todo o processo:

- **Siga a ordem das levas** — cada leva tem agents, notebooks e dependências definidos; não pule levas nem mude a ordem sem registrar o motivo
- **Marque tarefas concluídas** — após cada leva ser finalizada (execução + validações), atualize o tracker com o status real
- **Registre desvios** — se precisar mudar a ordem, adicionar tarefa, pular algo ou ajustar escopo, documente no tracker para rastreabilidade
- **Mantenha sincronizado** — o tracker deve refletir o estado real da execução, não só o planejado; se um passo levou mais tempo ou precisou de agent extra, anote
- **Use como checklist de release** — ao final, confira se todas as levas estão marcadas como concluídas antes de rodar `bun run build:full`
- **Reabrir se necessário** — se `gap-finder` ou `code-validator` apontarem problemas numa leva já marcada como concluída, reabra-a, corrija e valide novamente

### Investigação Pré-Implementação

Antes de modificar cada arquivo, use `suggest_reads`, `impact_analysis` e `file_context` nos arquivos listados. Consulte os Notebooks Relevantes para confirmar padrões.

### Divisão do Trabalho

- Budget por agent: ~50K tokens
- Agrupe por afinidade; nunca dois agents modificando o mesmo arquivo no mesmo lote
- A ordem sugerida nos passos já reflete dependências entre eles

### Execução

- Passos sem dependência → paralelo (max 2 agents por tool calls)
- Passos dependentes → sequencial
- Após cada lote: typecheck + lint (0 erros, 0 warnings)
- Proibido `@ts-ignore`, `@ts-expect-error` ou `eslint-disable` — corrija a causa raiz

---

## Notebooks Relevantes

| Notebook | ID | Quando consultar |
|----------|----|------------------|
| Remotion Docs | `3333bad6-d0f-4f5a-9a82-e5f0c038ef20` | Ao modificar WhiteboardScene ou validar performance de renderização |
| Motion Guide | `697b773a-32b4-43a3-8048-eb85b473176d` | Se usar `pathLength` como alternativa ao strokeDashoffset |
| React Docs | `8765c786-5be2-4b46-a20c-4ef666804801` | Padrões de Web Worker e ciclo de vida |
| TypeScript 6 Guide | `b0467e2a-bb9c-477d-883a-a306d3cd96d8` | Tipagem estrita dos novos módulos |
| Zod V4 | `f220c012-8852-4d5e-8ba4-99d7f4999677` | Validação de schemas se necessário |
| Vitest Guide | `6f3a1b12-a3df-4f31-9ea1-083ba644399a` | Configuração dos novos testes unitários |

---

*Plano consolidado em 2026-06-16 a partir de:*
- `docs/plan/edge-detection-whiteboard-base.md` (planner)
- `docs/plan/edge-detection-whiteboard-research.md` (research)
- `docs/plan/edge-detection-whiteboard-architecture.md` (architecture)
