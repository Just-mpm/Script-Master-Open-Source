# Plano: Edge Detection + Curvas Bezier para Modo Whiteboard

**Versão:** 1.0  
**Data:** 2026-06-16  
**Status:** Rascunho inicial para aprovação  

---

## 1. Objetivo

Substituir o pipeline atual de vetorização (`imagetracerjs` → paths SVG fechados/finos) por um pipeline baseado em **Edge Detection + Contour Tracing + Ajuste de Curvas Bezier** que produza **traços grossos e contínuos** (estilo caneta piloto/whiteboard). O resultado visual deve parecer que uma caneta grossa desenhou o contorno da imagem, em vez de centenas de rabiscos finos preenchendo áreas.

---

## 2. Premissas e Fora de Escopo

### Premissas
- Edge detection será implementado em **canvas puro** (matrizes `Uint8Array`, operações pixel-a-pixel) — sem dependências externas novas.
- O novo pipeline roda **na main thread** por ora (padrão atual do modo vetorial), com possibilidade de migrar para Worker em versão futura.
- A API pública `vectorizeImage(ImageData, options)` mantém a mesma assinatura — consumidores não quebram.
- `VetorialPath` (o tipo) permanece o mesmo — `{ d, length, color, strokeWidth }` — mas `strokeWidth` passa a ser maior (8–12px default vs. 2px atual).
- O número de paths gerados cai drasticamente (de ~150 paths finos para ~30–60 paths grossos), reduzindo risco de GPU timeout no Remotion.
- Retrocompatibilidade total com o modo `'mask'` (raspadinha) — nada do pipeline de máscara é alterado.
- O cache LRU (`strokeCache.ts`) continua funcionando sem modificações — a chave SHA-256 inclui `renderMode` + `preset`, então animações do pipeline novo e do legado não colidem.

### Fora de Escopo (para esta fase)
- **Batch vetorial** (`runBatchRender` para modo `vetorial`) — continua não suportado (mesma limitação da Fase 3.2).
- **Renderização de componentes Remotion em testes** — snapshot de `WhiteboardScene` continua fora de escopo (pioneirismo).
- **Migração para Web Worker** do novo pipeline — pode ser feito como evolução futura.
- **Remoção do `imagetracerjs`** — a lib permanece como fallback/deprecated até que o novo pipeline esteja estável em produção.
- **UI de novos parâmetros** (threshold, stroke width, etc.) — fase posterior, quando os parâmetros estiverem calibrados.

---

## 3. Módulos

### Módulo 1: Edge Detection (`edgeDetection.ts`) — NOVO

| Campo | Detalhe |
|-------|---------|
| **Descrição** | Implementa detecção de bordas via operador Sobel (ou Canny simplificado) em `ImageData`. Converte para escala de cinza, aplica kernels Sobel X/Y, calcula magnitude do gradiente, aplica threshold para produzir mapa binário de bordas. |
| **Arquivos** | `src/features/speed-paint/lib/edgeDetection.ts` (NOVO) |
| **Testes** | `tests/speed-paint/edgeDetection.unit.test.ts` (NOVO) |
| **Exporta** | `detectEdges(imageData, options): Uint8Array` — mapa binário (1 = borda, 0 = não borda) |
| **Opções** | `threshold?: number` (default: 30 — sensibilidade), `blurRadius?: number` (default: 1 — blur Gaussiano pré-detecção) |
| **Dependências** | Nenhuma — canvas puro, matemática em arrays tipados |
| **Risco** | **Baixo** — algoritmo bem conhecido, implementação direta, testável isoladamente |
| **Esforço** | ~2h implementação, ~1h testes |

### Módulo 2: Contour Tracing (`contourTracing.ts`) — NOVO

| Campo | Detalhe |
|-------|---------|
| **Descrição** | A partir do mapa binário de bordas, traça contornos conectados usando algoritmo Moore-Neighbor (ou Suzuki85 para encontrar bordas internas/externas). Remove ruído (contornos < N pixels). Ordena pontos de cada contorno em sequência contínua. |
| **Arquivos** | `src/features/speed-paint/lib/contourTracing.ts` (NOVO) |
| **Testes** | `tests/speed-paint/contourTracing.unit.test.ts` (NOVO) |
| **Exporta** | `traceContours(edgeMap, width, height, options): Contour[]` — cada `Contour = { points: Array<{x, y}>, closed: boolean }` |
| **Tipo novo** | `interface Contour { points: Point2D[]; closed: boolean; }` |
| **Opções** | `minContourLength?: number` (default: 10 — descarta ruído), `maxGap?: number` (default: 2 — salta gaps pequenos) |
| **Dependências** | Edge Detection (Módulo 1) — recebe `edgeMap` |
| **Risco** | **Médio** — implementação de Moore-Neighbor requer cuidado com boundary conditions e loops infinitos; decisão de como tratar forks (junções em T/Y) precisa ser calibrada |
| **Esforço** | ~3h implementação, ~1.5h testes |

### Módulo 3: Bezier Curve Fitting (`bezierFitting.ts`) — NOVO

| Campo | Detalhe |
|-------|---------|
| **Descrição** | Aplica **Ramer-Douglas-Peucker** (RDP) para simplificar cada contorno, depois ajusta curvas Bezier cúbicas aos segmentos simplificados. Gera strings `d` de path SVG válidas. Calcula `length` via `@remotion/paths.getLength()` (pré-cálculo, mesmo padrão atual). |
| **Arquivos** | `src/features/speed-paint/lib/bezierFitting.ts` (NOVO) |
| **Testes** | `tests/speed-paint/bezierFitting.unit.test.ts` (NOVO) |
| **Exporta** | `fitBezierPaths(contours, options): BezierPath[]` — `BezierPath = { d: string, length: number }` |
| **Tipo novo** | `interface BezierPath { d: string; length: number; }` (output intermediário, consumido pelo vectorizer) |
| **Opções** | `epsilon?: number` (default: 2.0 — tolerância RDP, menor = mais preciso), `fitError?: number` (default: 1.5 — erro máximo do ajuste Bezier) |
| **Dependências** | Contour Tracing (Módulo 2) — recebe `Contour[]` |
| **Risco** | **Médio** — ajuste de curvas Bezier tem nuances matemáticas; pontos colineares e contornos muito pequenos precisam de tratamento especial; `@remotion/paths.getLength()` pode ser custoso para muitos paths |
| **Esforço** | ~4h implementação, ~2h testes |

### Módulo 4: Novo Vectorizer (`vectorizer.ts`) — MODIFICADO (reescrita parcial)

| Campo | Detalhe |
|-------|---------|
| **Descrição** | Substitui a chamada a `imagetracerjs` pelo pipeline novo (Edge → Contour → Bezier). Mantém a função `vectorizeImage()` com a **mesma assinatura pública**, mas com novas opções internas. Preserva `sortPaths()`, `filterPathsByBackgroundContrast()`, `truncatePaths()` e helpers de ordenação (que continuam funcionando com o novo tipo de path). A cor dos paths agora é extraída por amostragem dos pixels da imagem na posição do contorno, em vez da paleta quantizada do `imagetracerjs`. |
| **Arquivos** | `src/features/speed-paint/lib/vectorizer.ts` (MODIFICADO — linhas 626-696 reescritas, resto preservado) |
| **Testes** | `tests/speed-paint/vectorizer.unit.test.ts` (MODIFICADO — novos testes para o pipeline edge+bezier, mantém testes legados como regressão) |
| **Exporta** | `vectorizeImage(imageData, options): Promise<VetorialPath[]>` (assinatura idêntica) |
| **Novas opções** | `edgeThreshold?: number` (sensibilidade da detecção de borda), `strokeWidth?: number` (default muda de 2 para 10), `contourEpsilon?: number` (tolerância RDP) |
| **Dependências** | Edge Detection (1) + Contour Tracing (2) + Bezier Fitting (3) |
| **Risco** | **Alto** — é a integração final; orquestração dos 3 submódulos + tratamento de edge cases (imagens sem bordas, imagens muito detalhadas, desempenho em 1920x1080) |
| **Esforço** | ~3h implementação, ~1.5h testes |

### Módulo 5: Tipos e Presets (`vetorial.ts`, `vetorialPresets.ts`) — MODIFICADO

| Campo | Detalhe |
|-------|---------|
| **Descrição** | Adiciona novos presets específicos para o pipeline edge detection (ex: `'edge-default'`, `'edge-detailed'`, `'edge-bold'`). Os 16 presets do `imagetracerjs` permanecem como `legacy-*` para retrocompatibilidade com projetos existentes. `VetorialPath` permanece inalterado. |
| **Arquivos** | `src/features/speed-paint/types/vetorial.ts` (MODIFICADO — novos tipos de preset) |
| | `src/features/speed-paint/constants/vetorialPresets.ts` (MODIFICADO — novos grupos) |
| **Mudanças** | `VetorialPreset` ganha novos valores (`'edge-default'`, `'edge-detailed'`, `'edge-bold'`, `'edge-sketch'`). `VETORIAL_PRESETS_GROUPED` ganha novo grupo `'edge-detection'`. |
| **Dependências** | Nenhuma (tipos independentes) |
| **Risco** | **Baixo** — apenas adição de valores a union types existentes |
| **Esforço** | ~1h |

### Módulo 6: Integração no ImageProcessing (`imageProcessing.ts`) — MODIFICADO

| Campo | Detalhe |
|-------|---------|
| **Descrição** | Atualiza `processVetorialOnMainThread()` para passar as novas opções do pipeline edge detection ao `vectorizeImage()`. Adiciona campos opcionais em `GenerateStrokesOptions`. O `defaultColor` agora é calculado por amostragem de pixel (cor média da região da borda) em vez de fixo `#222222`. |
| **Arquivos** | `src/features/speed-paint/lib/imageProcessing.ts` (MODIFICADO — função `processVetorialOnMainThread` e interface `GenerateStrokesOptions`) |
| **Testes** | `tests/speed-paint/imageProcessing.vetorial.integration.test.ts` (MODIFICADO) |
| | `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts` (MODIFICADO) |
| **Mudanças** | `GenerateStrokesOptions` ganha `edgeThreshold?: number`, `contourEpsilon?: number`. Novos testes validam que o novo preset `'edge-default'` produz paths grossos (>5px strokeWidth) e contínuos. |
| **Dependências** | Vectorizer (4) — usa o novo `vectorizeImage()` |
| **Risco** | **Médio** — precisa garantir que o `totalDurationMs` ainda faça sentido com menos paths porém mais longos; o cálculo atual `max(2000, paths.length * 80)` pode subestimar a duração para 30 paths grossos |
| **Esforço** | ~1.5h implementação, ~1h testes |

### Módulo 7: Adaptação WhiteboardScene (`WhiteboardScene.tsx`) — MODIFICADO (mínimo)

| Campo | Detalhe |
|-------|---------|
| **Descrição** | O `WhiteboardScene` já renderiza paths com `strokeWidth` variável (vem de `path.strokeWidth`). Com o novo pipeline, `strokeWidth` será maior (8-12px). Pode ser necessário ajustar o `strokeLinecap` e `strokeLinejoin` para `round` (já são). A caneta SVG (Pencil) precisa ter escala ajustada para não ficar desproporcional a traços grossos — o tamanho da caneta deve escalar com `strokeWidth` médio (via prop ou detecção). |
| **Arquivos** | `src/features/video-render/components/WhiteboardScene.tsx` (MODIFICADO — escala da caneta) |
| **Testes** | `tests/video-render/WhiteboardScene.component.test.tsx` (MODIFICADO — testar com paths de strokeWidth 10) |
| **Mudanças** | Adicionar `penScale` derivado de `animation.paths[0]?.strokeWidth` ou prop opcional. O `<Pencil>` escala proporcionalmente. `strokeLinecap="round"` já está definido (linha 389). |
| **Dependências** | Nenhuma do pipeline novo — pode ser feito em paralelo |
| **Risco** | **Baixo** — mudança isolada, não afeta lógica de animação |
| **Esforço** | ~1h implementação, ~0.5h testes |

### Módulo 8: Limpeza de Dependências (`package.json`) — OPCIONAL

| Campo | Detalhe |
|-------|---------|
| **Descrição** | Remove `imagetracerjs` das dependências se o pipeline legado não for mais necessário. **Não fazer agora** — manter como fallback até estabilização. |
| **Arquivos** | `package.json` (futuro) |
| **Risco** | **Alto** se feito prematuramente — projetos existentes podem depender do preset `'artistic1'` |
| **Esforço** | ~0.5h |

---

## 4. Dependências Entre Módulos

```
Módulo 5 (Tipos/Presets) ──────────────────┐
                                           │ (tipos)
Módulo 1 (Edge Detection) ──┐              │
                            ├──→ Módulo 2 ─┼──→ Módulo 4 ──→ Módulo 6 ──→ Output
                            │   (Contour)  │   (Vectorizer)  (Integration)
                            └──────────────┘         │
                                                     │ (paths grossos)
                                                     ↓
                                              Módulo 7 (WhiteboardScene)
                                              (escala da caneta)
```

**Dependências diretas:**
- Módulo 4 depende de 1, 2, 3 (pipeline completo)
- Módulo 6 depende de 4 (usa o novo `vectorizeImage`)
- Módulo 7 depende apenas das definições de tipo (5), não do pipeline
- Módulo 5 é independente (tipos puros)

---

## 5. Prioridade

| Prioridade | Módulo | Justificativa |
|------------|--------|---------------|
| P0 | Módulo 1 (Edge Detection) | Base do pipeline, sem dependências externas |
| P0 | Módulo 5 (Tipos/Presets) | Tipos são needed pelos demais módulos |
| P1 | Módulo 2 (Contour Tracing) | Depende de 1, alimenta 3 |
| P1 | Módulo 3 (Bezier Fitting) | Depende de 2, alimenta 4 |
| P2 | Módulo 4 (Vectorizer) | Integra 1+2+3, substitui imagetracerjs |
| P2 | Módulo 6 (ImageProcessing) | Consome 4, conecta à UI |
| P3 | Módulo 7 (WhiteboardScene) | Ajuste visual, independente do pipeline |
| P4 | Módulo 8 (Cleanup) | Só depois de estabilização |

---

## 6. Ordem Recomendada de Execução

### Fase 1 — Fundação (pode paralelizar)

```
Semana 1
├── [Módulo 5] Tipos e Presets (~1h)
│   Adicionar 'edge-default', 'edge-detailed', 'edge-bold', 'edge-sketch'
│   Adicionar grupo 'edge-detection' em VETORIAL_PRESETS_GROUPED
│
├── [Módulo 1] Edge Detection (~3h)
│   Implementar detectEdges() + testes unitários
│   Testar com imagens sintéticas (quadrado, círculo, linhas)
│
└── [Módulo 7] WhiteboardScene (~1.5h)
    Ajustar escala da caneta para strokeWidth maior
    Testar visual com paths de exemplo
```

### Fase 2 — Pipeline Core

```
Semana 2
├── [Módulo 2] Contour Tracing (~4.5h)
│   Implementar traceContours() + testes
│   Validar com edgeMap gerado pelo Módulo 1
│
└── [Módulo 3] Bezier Fitting (~6h)
    Implementar RDP simplification + cubic bezier fit
    Implementar fitBezierPaths() + testes
    Validar que paths SVG gerados são renderizáveis
```

### Fase 3 — Integração

```
Semana 3
├── [Módulo 4] Vectorizer (~4.5h)
│   Reescrever vectorizeImage() para orquestrar 1→2→3
│   Manter sortPaths, filterPathsByBackgroundContrast intactos
│   Extrair cor por amostragem de pixel (em vez de paleta fixa)
│   Testes de regressão + novos testes
│
└── [Módulo 6] ImageProcessing (~2.5h)
    Atualizar processVetorialOnMainThread
    Atualizar GenerateStrokesOptions
    Atualizar totalDurationMs (menos paths, mais longos)
    Testes de integração vetorial
```

### Fase 4 — Estabilização

```
Semana 4
├── Testes comparativos (imagetracerjs vs edge+bezier)
├── Calibração de parâmetros default (threshold, strokeWidth, epsilon)
├── Testes de performance (1920x1080, tempo de vetorização)
└── Documentação + atualização de AGENTS.md
```

---

## 7. O que pode ser implementado em paralelo

| Grupo | Módulos | Motivo |
|-------|---------|--------|
| **Grupo A** | Módulo 1 (Edge Detection) + Módulo 5 (Tipos) + Módulo 7 (WhiteboardScene) | Nenhum depende do outro |
| **Grupo B** | Módulo 2 (Contour Tracing) + Módulo 3 (Bezier Fitting) | Ambos dependem de 1 mas não entre si |
| **Grupo C** | Módulo 4 (Vectorizer) + Módulo 6 (ImageProcessing) | Ambos dependem de A+B mas podem ser implementados separadamente |

**Execução paralela máxima:** 3 desenvolvedores trabalhando simultaneamente:
- Dev A: Módulo 1 + Módulo 2
- Dev B: Módulo 3 + Módulo 5
- Dev C: Módulo 7

---

## 8. O que é Reutilizado vs. Substituído

### Reutilizado (intocado)
| Arquivo | Motivo |
|---------|--------|
| `src/features/speed-paint/types.ts` | Tipos `Stroke`, `StrokeAnimation`, `PaintingJob` — inalterados |
| `src/features/video-render/lib/strokeCache.ts` | Cache LRU — funciona com qualquer `VetorialAnimation` |
| `src/features/video-render/components/WhiteboardComposition.tsx` | Wrapper puro, sem lógica de pipeline |
| `src/features/speed-paint/lib/vectorizer.ts:sortPaths()` | Ordenação (top-down, center-out, etc.) — funciona com qualquer path |
| `src/features/speed-paint/lib/vectorizer.ts:filterPathsByBackgroundContrast()` | Filtro de contraste — continua útil |
| `src/features/video-render/lib/speedPaintRenderer.ts` | Cache lookup e orquestração de scenes — inalterado |

### Modificado
| Arquivo | Mudança |
|---------|---------|
| `src/features/speed-paint/lib/vectorizer.ts` | `vectorizeImage()` reescrito para pipeline edge+bezier |
| `src/features/speed-paint/types/vetorial.ts` | Novos presets adicionados |
| `src/features/speed-paint/constants/vetorialPresets.ts` | Novo grupo de presets |
| `src/features/speed-paint/lib/imageProcessing.ts` | `processVetorialOnMainThread` atualizado |
| `src/features/video-render/components/WhiteboardScene.tsx` | Escala da caneta ajustada |

### Substituído (descontinuado internamente)
| Função | Motivo |
|--------|--------|
| `vectorizeImage()` chamando `imagetracerjs` | Substituído pelo pipeline edge+bezier |
| `parseSvgPaths()` (regex parser) | Não necessário — novo pipeline gera paths diretamente |
| `extractFill()` / `parseCssColor()` | Amostragem de cor substitui parse de fill |
| Presets `imagetracerjs` (`artistic1`, etc.) | Mantidos como fallback, novos presets `edge-*` são default |

### Removido (opcional, fase futura)
| Dependência | Motivo |
|-------------|--------|
| `imagetracerjs` do `package.json` | Só quando o pipeline novo estiver estável e o legado não for mais necessário |

---

## 9. Riscos e Decisões em Aberto

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **GPU timeout no Remotion** (muitos paths SVG) | Média | Alto | Menos paths (~40 vs ~150) mitiga naturalmente. Manter `MAX_PATHS_PER_SCENE` como salvaguarda |
| **Edge detection muito lento em 1920x1080** | Média | Médio | Implementar em `Uint8Array` com acesso linear (sem Math.floor repetido). Se necessário, processar em resolução reduzida e escalar paths |
| **Contornos com forks (junções T/Y) mal resolvidos** | Alta | Médio | Moore-Neighbor com estratégia de prioridade (virar à esquerda primeiro). Fallback: dividir contorno no fork |
| **Paths Bezier mal formados (autointersecção, loops)** | Média | Médio | `safeGetPointAtLength()` já existe como fallback. Validar paths gerados com `@remotion/paths` |
| **totalDurationMs subestimado** (30 paths grossos vs 150 finos) | Alta | Baixo | Ajustar fórmula: `max(3000, paths.length * 120)` — paths grossos levam mais tempo para desenhar |
| **Perda de qualidade em imagens fotográficas** | Alta | Médio | Edge detection funciona melhor em imagens com alto contraste. Fotos com gradientes suaves podem precisar de threshold mais baixo. Manter fallback do `imagetracerjs` |

### Decisões em Aberto

| Decisão | Opções | Impacto |
|---------|--------|---------|
| **Extrair cor de onde?** | (a) Média do pixel na posição do contorno (b) Cor fixa `#222222` (c) Amostragem na direção perpendicular ao contorno | Afeta realismo vs. performance |
| **Presets legados viram deprecated?** | (a) Manter como opção (b) Esconder na UI (c) Remover na próxima versão | Afeta projetos existentes |
| **Web Worker para edge detection?** | (a) Main thread como hoje (b) Worker com OffscreenCanvas (c) Worker com transferable ArrayBuffer | Afeta responsividade da UI durante processamento |
| **Stroke width dinâmico?** | (a) Fixo para todos os paths (b) Variável por path baseado na espessura do contorno | Afeta naturalidade visual |
| **Colorir os paths?** | (a) Traço único (cor sólida, estilo canetinha) (b) Cor extraída da imagem de origem por path | Afeta realismo vs. performance |
| **Limite de paths por cena?** | Manter 150 ou reduzir para 60? | Com paths grossos, 60 já cobre bem a imagem |

---

## 10. Resumo de Arquivos

### Novos (5 arquivos)
```
src/features/speed-paint/lib/edgeDetection.ts      ~200 linhas
src/features/speed-paint/lib/contourTracing.ts      ~250 linhas
src/features/speed-paint/lib/bezierFitting.ts       ~300 linhas
tests/speed-paint/edgeDetection.unit.test.ts        ~150 linhas
tests/speed-paint/contourTracing.unit.test.ts       ~150 linhas
tests/speed-paint/bezierFitting.unit.test.ts        ~200 linhas
```

### Modificados (7 arquivos)
```
src/features/speed-paint/lib/vectorizer.ts           [~696 → ~500 linhas, reescrita parcial]
src/features/speed-paint/types/vetorial.ts           [+4 novos presets, ~30 linhas]
src/features/speed-paint/constants/vetorialPresets.ts [+1 grupo, ~15 linhas]
src/features/speed-paint/lib/imageProcessing.ts      [~849 → ~880 linhas, atualização local]
src/features/video-render/components/WhiteboardScene.tsx [~512 → ~530 linhas, escala caneta]
tests/speed-paint/vectorizer.unit.test.ts            [+novos testes, ~200 linhas]
tests/speed-paint/imageProcessing.vetorial.integration.test.ts [+10-20 linhas]
```

### Intocados (principais)
```
src/features/speed-paint/types.ts
src/features/video-render/lib/strokeCache.ts
src/features/video-render/components/WhiteboardComposition.tsx
src/features/video-render/lib/speedPaintRenderer.ts
src/features/video-render/lib/strokeWorker.ts
src/features/speed-paint/store/animationStore.ts
src/features/speed-paint/store/speedPaintRenderController.tsx
src/pages/SpeedPaintPage.tsx
```

---

## 11. Handoff para Implementação

**Próximo passo recomendado:** Iniciar **Módulo 1 (Edge Detection)** e **Módulo 5 (Tipos/Presets)** em paralelo — são independentes e de baixo risco.

**Ordem de início:**
1. `git checkout -b feat/edge-detection-whiteboard`
2. Implementar `types/vetorial.ts` — novos presets `edge-*`
3. Implementar `edgeDetection.ts` — Sobel simples com threshold
4. Escrever testes unitários para edge detection com imagem sintética 50x50

**Critério de avanço para Fase 2:** Módulo 1 com todos os testes passando e `npm run tsc` limpo.

---

*Plano gerado em 2026-06-16 para o projeto Script Master (v0.131.0)*
