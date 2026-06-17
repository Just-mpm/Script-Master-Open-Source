# Arquitetura: Edge Detection + Contour Tracing + Cubic Bezier Fitting

**Versão:** 1.0  
**Data:** 2026-06-16  
**Status:** Aprovado (substitui `imagetracerjs` no modo vetorial)  
**Domínio:** Speed Paint — modo "Desenho" (vetorial/whiteboard)  

---

## 1. Contexto e Restrições

### Problema
O modo vetorial do Speed Paint usa `imagetracerjs` para converter pixels em paths SVG fechados e finos (strokeWidth 2), gerando 100–500 paths por cena que parecem "rabiscos". O resultado visual é de baixa qualidade e o alto número de paths causa GPU timeout no Remotion durante exportação.

### Solução
Substituir por pipeline Canvas nativo de 3 estágios: **Edge Detection (Canny simplificado)** → **Moore-Neighbor Contour Tracing** → **RDP simplification + Cubic Bezier Fitting**, produzindo 5–50 paths grossos (strokeWidth 6–10, strokeLinecap round) que parecem traços de caneta whiteboard.

### Restrições arquiteturais (validadas no código real)
| Restrição | Origem |
|-----------|--------|
| `vectorizeImage()` mantém assinatura pública idêntica | `vectorizer.ts:626-628` |
| `VetorialPath` inalterado: `{ d, length, color, strokeWidth }` | `types/vetorial.ts:76-86` |
| Modo `'mask'` existente não pode quebrar | `types/vetorial.ts:22` |
| `imagetracerjs` permanece como dependência (fallback) | `vectorizer.ts:28` |
| Cache LRU (`strokeCache.ts`) sem modificações | Chave SHA-256 já inclui `renderMode` + `preset` |
| Testes existentes (2268) devem continuar passando | `AGENTS.md` |
| Zero dependências npm novas | Research docs confirmam viabilidade |
| COEP ativo → `SharedArrayBuffer` + `OffscreenCanvas` disponíveis | `AGENTS.md` |

---

## 2. Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE COMPLETO                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ImageData (Uint8ClampedArray, width, height)                            │
│       │                                                                  │
│       ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Módulo 1: detectEdges()                                        │   │
│  │  ┌──────────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │   │
│  │  │ Gaussian Blur│→│   Sobel  │→│    NMS    │→│ Threshold │  │   │
│  │  │ (5×5 kernel) │  │ (Gx+Gy)  │  │ (non-max  │  │ (binário) │  │   │
│  │  │  σ=1.0-1.4   │  │ magnitude│  │ supress)  │  │ high/low  │  │   │
│  │  └──────────────┘  └──────────┘  └───────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       │  edgeMap: Uint8Array (1 = borda, 0 = não borda)                 │
│       ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Módulo 2: traceContours()                                      │   │
│  │  ┌──────────────────────┐  ┌─────────────────────────────┐      │   │
│  │  │  Moore-Neighbor      │→│  Filtro minContourLength    │      │   │
│  │  │  (8-vizinhança,      │  │  (descarta ruído < N px)   │      │   │
│  │  │   backtracking rule)  │  └─────────────────────────────┘      │   │
│  │  └──────────────────────┘                                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       │  Contour[] = { points: Point2D[], closed: boolean }             │
│       ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Módulo 3: fitBezierPaths()                                     │   │
│  │  ┌──────────────┐  ┌────────────────┐  ┌───────────────────┐   │   │
│  │  │  RDP Simplify │→│  Cubic Bezier  │→│  SVG Path Gen +   │   │   │
│  │  │  (ε=2.0-3.0)  │  │  Least Squares │  │  getLength() calc │   │   │
│  │  └──────────────┘  └────────────────┘  └───────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       │  VetorialPath[] = { d, length, color, strokeWidth }[]           │
│       ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  vectorizeImage() — orquestrador                                │   │
│  │  ┌───────────┐  ┌────────────────┐  ┌──────────┐               │   │
│  │  │  1→2→3    │→│  colorSample   │→│  sort +   │               │   │
│  │  │  pipeline  │  │  (pixel avg)   │  │  truncate │               │   │
│  │  └───────────┘  └────────────────┘  └──────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  VetorialAnimation { paths, totalLength, ... }                           │
│       │                                                                  │
│       ▼                                                                  │
│  WhiteboardScene.tsx — renderiza paths SVG + caneta                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tipos de fronteira entre cada etapa

| Etapa | Entrada | Saída | Tipo |
|-------|---------|-------|------|
| 1→2 | `ImageData` | `Uint8Array` (edgeMap) | `width × height` bytes, 0/1 |
| 2→3 | `Uint8Array` (edgeMap) + `width, height` | `Contour[]` | `interface Contour { points: Point2D[]; closed: boolean }` |
| 3→vectorizer | `Contour[]` + `width, height, options` | `BezierPath[]` | `interface BezierPath { d: string; length: number }` |
| vectorizer→output | `BezierPath[]` | `VetorialPath[]` | `{ d, length, color, strokeWidth }` |

### Quem chama quem (ordem exata dentro de `vectorizeImage()`)

```
vectorizeImage(imageData, options)
  ├─ ensureNotAborted(signal)
  ├─ [edge path] detectEdges(imageData, edgeOptions)        → edgeMap: Uint8Array
  ├─ [edge path] traceContours(edgeMap, w, h, contourOpts)  → contours: Contour[]
  ├─ [edge path] fitBezierPaths(contours, w, h, bezierOpts) → bezierPaths: BezierPath[]
  ├─ [edge path] extractColorPerPath(imageData, contours)    → colors: string[]
  ├─ combine(bezierPaths, colors, strokeWidth)               → paths: VetorialPath[]
  ├─ [legacy path] ImageTracer.imagedataToSVG(...)           → (fallback preservado)
  ├─ ensureNotAborted(signal)
  ├─ sortPaths(paths, sortOrder, w, h)
  ├─ filterPathsByBackgroundContrast(paths, 'white')
  ├─ truncatePaths(paths, MAX_PATHS_PER_SCENE)
  └─ return paths
```

---

## 3. Módulos — Assinaturas Exatas

### 3.1 `detectEdges()` — Edge Detection

**Arquivo:** `src/features/speed-paint/lib/edgeDetection.ts` (NOVO)

```typescript
/**
 * Opções de configuração para o detector de bordas.
 */
export interface EdgeDetectionOptions {
  /**
   * Raio do blur Gaussiano (σ). Default: 1.0
   * Valores maiores suavizam mais (bom para fotos com ruído).
   * Para imagens flat/design, σ=1.0 é suficiente.
   */
  blurSigma?: number;
  /**
   * Threshold baixo (normalizado 0..1). Default: 0.1
   * Bordas com magnitude >= lowThreshold e conectadas a bordas fortes
   * são mantidas (rastreamento por histerese).
   */
  lowThreshold?: number;
  /**
   * Threshold alto (normalizado 0..1). Default: 0.3
   * Bordas com magnitude >= highThreshold são consideradas bordas fortes.
   */
  highThreshold?: number;
}

/**
 * Aplica edge detection Canny simplificado em ImageData.
 *
 * Pipeline interno:
 * 1. Converte RGBA → grayscale (luminosidade ponderada)
 * 2. Gaussian Blur (5×5 kernel, σ configurável) — opcional, controlado por `blurSigma`
 * 3. Sobel operator (Gx, Gy 3×3) — calcula magnitude do gradiente
 * 4. Non-Maximum Suppression — afina bordas para 1px de espessura
 * 5. Double Threshold — classifica pixels em forte/fraca/não borda
 * 6. Edge Tracking by Hysteresis — conecta bordas fracas às fortes (8-vizinhança)
 *
 * @param imageData - Pixels RGBA da imagem (canvas ImageData)
 * @param options - Configurações opcionais de sensibilidade
 * @returns Mapa binário de bordas: 1 = borda, 0 = não borda
 *          Array de comprimento `width × height` (1 byte por pixel)
 *
 * @throws Error se imageData for inválido
 *
 * @example
 * ```ts
 * const edges = detectEdges(ctx.getImageData(0, 0, w, h), {
 *   blurSigma: 1.0,
 *   lowThreshold: 0.1,
 *   highThreshold: 0.3,
 * });
 * ```
 */
export function detectEdges(
  imageData: ImageData,
  options?: EdgeDetectionOptions,
): Uint8Array;
```

**Detalhes de implementação:**
- **Grayscale:** `0.299*R + 0.587*G + 0.114*B` (NTSC luminance)
- **Kernel Gaussiano 5×5 (σ=1.0):**
  ```
  2  4  5  4  2
  4  9 12  9  4
  5 12 15 12  5   / 159
  4  9 12  9  4
  2  4  5  4  2
  ```
- **Kernel Sobel X (3×3):**
  ```
  -1  0 +1
  -2  0 +2   / 1
  -1  0 +1
  ```
- **Kernel Sobel Y (3×3):**
  ```
  -1 -2 -1
   0  0  0   / 1
  +1 +2 +1
  ```
- **Non-Maximum Suppression:** interpolação bilinear da magnitude entre 2 vizinhos na direção do gradiente; descarta se não for máximo local
- **Hysteresis:** BFS a partir de bordas fortes, incluindo fracas conectadas (8-vizinhança)

### 3.2 `traceContours()` — Contour Tracing

**Arquivo:** `src/features/speed-paint/lib/contourTracing.ts` (NOVO)

```typescript
/** Ponto 2D com coordenadas inteiras (pixel). */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Contorno extraído do mapa de bordas.
 * `closed = true` se o contorno forma um loop fechado.
 * `closed = false` se atinge a borda da imagem.
 */
export interface Contour {
  /** Pontos do contorno em ordem de tracing (sequência contínua). */
  points: Point2D[];
  /** True se o último ponto conecta de volta ao primeiro. */
  closed: boolean;
}

/**
 * Opções para o algoritmo de contour tracing.
 */
export interface ContourTracingOptions {
  /**
   * Comprimento mínimo em pixels para manter um contorno.
   * Contornos menores que este valor são considerados ruído e descartados.
   * Default: 10
   */
  minContourLength?: number;
  /**
   * Gap máximo permitido (em pixels) entre pixels de borda para
   * considerar como conectados. Default: 1 (apenas 8-vizinhança direta)
   */
  maxGap?: number;
}

/**
 * Extrai contornos ordenados de um mapa binário de bordas.
 *
 * Algoritmo: Moore-Neighbor Tracing com regra de Jacob Eliosoff
 * (parar quando entrar no pixel inicial pela segunda vez na mesma direção).
 *
 * 1. Varre o edgeMap procurando pixels de borda não visitados
 * 2. Para cada pixel encontrado, inicia Moore-Neighbor tracing:
 *    a. Define direção de entrada (backtrack)
 *    b. Busca em 8-vizinhança no sentido anti-horário
 *    c. Avança para o próximo pixel de borda encontrado
 *    d. Repete até voltar ao pixel inicial (contorno fechado) ou
 *       atingir borda da imagem (contorno aberto)
 * 3. Marca pixels visitados para não reprocessar
 * 4. Descarta contornos com `points.length < minContourLength`
 * 5. Ordena pontos por sequência de tracing (não por coordenada)
 *
 * @param edgeMap - Mapa binário (1 = borda, 0 = não borda), comprimento w×h
 * @param width - Largura da imagem em pixels
 * @param height - Altura da imagem em pixels
 * @param options - Configurações opcionais
 * @returns Lista de contornos ordenados, sem ruído
 *
 * @example
 * ```ts
 * const edges = detectEdges(imageData);
 * const contours = traceContours(edges, imageData.width, imageData.height, {
 *   minContourLength: 10,
 * });
 * ```
 */
export function traceContours(
  edgeMap: Uint8Array,
  width: number,
  height: number,
  options?: ContourTracingOptions,
): Contour[];
```

**Detalhes de implementação:**
- **Moore-Neighbor:** para cada pixel atual, busca o próximo pixel de borda na vizinhança 8-directional, começando pelo vizinho imediatamente à direita do último vizinho visitado (sentido anti-horário)
- **Terminação:** regra de Jacob Eliosoff — "parar quando visitar o pixel inicial pela segunda vez, vindo da mesma direção de entrada"
- **Contornos abertos:** quando o tracing atinge a borda da imagem, o contorno é marcado como `closed: false`
- **Filtro de ruído:** contornos com `points.length < minContourLength` (default 10) são descartados
- **Forks (junções em T/Y):** quando o Moore-Neighbor encontra múltiplos vizinhos de borda (fork), a prioridade é: continuar na direção que preserva a curvatura (menor mudança angular). O pixel alternativo é enfileirado para ser processado como início de um novo contorno

### 3.3 `fitBezierPaths()` — RDP + Bezier Fitting

**Arquivo:** `src/features/speed-paint/lib/bezierFitting.ts` (NOVO)

```typescript
/**
 * Path intermediário antes da conversão para VetorialPath.
 * Saída do RDP + Bezier fitting, antes da amostragem de cor.
 */
export interface BezierPath {
  /** Atributo `d` do path SVG: ex: "M 10 20 C 30 40, 50 60, 70 80" */
  d: string;
  /** Comprimento total pré-calculado via @remotion/paths.getLength() */
  length: number;
}

/**
 * Opções para o ajuste de curvas Bezier.
 */
export interface BezierFittingOptions {
  /**
   * Tolerância do Ramer-Douglas-Peucker (epsilon) em pixels.
   * Menor = mais pontos (mais preciso), maior = menos pontos (mais simplificado).
   * Default: 2.0 (bom custo-benefício para whiteboard)
   */
  epsilon?: number;
  /**
   * Erro máximo permitido no ajuste da curva Bezier por segmento.
   * Se o erro ultrapassar este valor, o segmento é subdividido recursivamente.
   * Default: 1.5 pixels
   */
  fitError?: number;
}

/**
 * Converte contornos em paths SVG com curvas Bezier cúbicas.
 *
 * Pipeline interno:
 * 1. Para cada contorno, aplica Ramer-Douglas-Peucker (ε configurável)
 * 2. Para cada segmento do RDP, ajusta uma curva Bezier cúbica usando
 *    least squares fitting (algoritmo de Philip J. Schneider, 1990)
 * 3. Gera string SVG `d` com comandos `M` + `C`
 * 4. Calcula `length` via `@remotion/paths.getLength()` (pré-cálculo)
 * 5. Descarta contornos que resultam em paths inválidos ou vazios
 *
 * @param contours - Contornos extraídos do traceContours()
 * @param width - Largura da imagem (para validação de bounds)
 * @param height - Altura da imagem (para validação de bounds)
 * @param options - Configurações opcionais
 * @returns Lista de paths Bezier com comprimento pré-calculado
 *
 * @example
 * ```ts
 * const edges = detectEdges(imageData);
 * const contours = traceContours(edges, w, h);
 * const paths = fitBezierPaths(contours, w, h, {
 *   epsilon: 2.5,
 *   fitError: 1.5,
 * });
 * ```
 */
export function fitBezierPaths(
  contours: Contour[],
  width: number,
  height: number,
  options?: BezierFittingOptions,
): BezierPath[];
```

**Detalhes de implementação:**
- **RDP:** algoritmo recursivo clássico — encontra o ponto com maior distância perpendicular à linha entre os extremos do segmento; se a distância > ε, subdivide e recursa
- **Fontes de ε por preset:** ver seção 6.4
- **Cubic Bezier fitting:** para cada segmento RDP (2 pontos extremos + pontos intermediários), calcula tangentes de entrada/saída, depois ajusta os 2 pontos de controle internos via mínimos quadrados
- **Subdivisão recursiva:** se o erro máximo > `fitError`, o segmento é dividido ao meio e reajustado
- **Geração SVG:** `M x0 y0 C x1 y1, x2 y2, x3 y3 C x4 y4, x5 y5, x6 y6 ...`
- **Contornos abertos (`closed: false`):** geram path sem fechamento (sem `Z`)
- **Contornos fechados (`closed: true`):** o último comando Bezier conecta de volta ao ponto inicial (sem `Z` — o `strokeLinecap="round"` já arredonda as pontas)
- **`getLength()`:** chamado UMA VEZ por path, no momento da geração, nunca no render

---

## 4. Integração no `vectorizeImage()` — Estratégia de Branch

### 4.1 Decisão de pipeline: por preset

O `VectorizeOptions` ganha um campo opcional `pipelineMode?: 'edge+bezier' | 'imagetracerjs'`.  
O preset determina o pipeline **automaticamente**:

| Prefixo do preset | Pipeline | Comportamento |
|---|---|---|
| `'edge-*'` (ex: `'edge-default'`, `'edge-detailed'`) | **Edge+Bezier** (novo) | Chama detectEdges → traceContours → fitBezierPaths |
| `'artistic*'`, `'posterized*'`, etc. (legados) | **imagetracerjs** (atual) | Preserva comportamento existente |

### 4.2 Assinatura modificada de `vectorizeImage()`

```typescript
export interface VectorizeOptions {
  // Campos existentes (preservados)
  preset?: VetorialPreset;
  pathomit?: number;
  strokeWidth?: number;
  defaultColor?: string;
  signal?: AbortSignal;
  sortOrder?: VetorialPathSortOrder;

  // NOVOS campos (válidos apenas para edge+bezier pipeline)
  /** Sensibilidade da detecção de borda (0..1). Default: 0.3 */
  edgeThreshold?: number;
  /** Tolerância RDP (epsilon) em pixels. Default: 2.0 */
  contourEpsilon?: number;
  /** Override explícito do pipeline. Se omitido, é inferido do preset. */
  pipelineMode?: 'edge+bezier' | 'imagetracerjs';
}
```

### 4.3 Lógica de branch (pseudocódigo)

```
vectorizeImage(imageData, options):
  preset = options.preset ?? 'edge-default'
  strokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH

  // Decide pipeline
  if preset starts with 'edge-' or options.pipelineMode === 'edge+bezier':
    // ----- NOVO PIPELINE -----
    edgeOptions = {
      blurSigma: 1.0,
      lowThreshold: 0.1,
      highThreshold: options.edgeThreshold ?? 0.3,
    }
    edgeMap = detectEdges(imageData, edgeOptions)
    checkAbort(signal)

    contours = traceContours(edgeMap, imageData.width, imageData.height, {
      minContourLength: 10,
    })
    checkAbort(signal)

    bezierPaths = fitBezierPaths(contours, imageData.width, imageData.height, {
      epsilon: options.contourEpsilon ?? 2.0,
    })
    checkAbort(signal)

    // Amostragem de cor (seção 5)
    colors = sampleColors(imageData, contours)

    // Monta VetorialPath[]
    paths = bezierPaths.map((bp, i) => ({
      d: bp.d,
      length: bp.length,
      color: colors[i] ?? DEFAULT_COLOR,
      strokeWidth: strokeWidth,
    }))
  else:
    // ----- PIPELINE LEGADO (imagetracerjs) -----
    svg = ImageTracer.imagedataToSVG(imageData, { preset, pathomit })
    parsed = parseSvgPaths(svg)
    paths = enrichPaths(parsed, pathomit, strokeWidth, defaultColor, signal)
    // (código existente inalterado)

  // Pós-processamento comum a ambos os pipelines
  paths = filterPathsByBackgroundContrast(paths, 'white')
  paths = truncatePaths(paths, MAX_PATHS_PER_SCENE)
  if sortOrder: paths = sortPaths(paths, sortOrder, w, h)
  return paths
```

### 4.4 Presets do `imagetracerjs` mantidos como fallback

Os 16 presets atuais (`'artistic1'`–`'artistic4'`, `'posterized1'`–`'posterized3'`, etc.) continuam funcionando exatamente como hoje — o `imagetracerjs` é chamado quando o preset **não** começa com `'edge-'`.

### 4.5 `DEFAULT_PRESET` muda de `'artistic1'` para `'edge-default'`

A constante `DEFAULT_PRESET` em `vectorizer.ts:47` muda de `'artistic1'` para `'edge-default'`.  
Todo projeto novo usará o pipeline edge+bezier por padrão. Projetos existentes com preset `'artistic1'` preservam o comportamento legado.

---

## 5. Cor dos Paths — Estratégia de Amostragem

### 5.1 Problema

O `imagetracerjs` extrai cor da paleta quantizada (agrupa cores dominantes e atribui fill a cada path). No novo pipeline, não há paleta — precisamos definir a cor de cada path.

### 5.2 Estratégia adotada: Amostragem do pixel na posição do contorno

Para cada contorno, amostra a cor da imagem ORIGINAL no primeiro pixel do contorno:

```typescript
function sampleColors(
  imageData: ImageData,
  contours: Contour[],
): string[] {
  const { data, width } = imageData;
  return contours.map((contour) => {
    if (contour.points.length === 0) return DEFAULT_COLOR;

    // Usa o primeiro ponto do contorno como referência de cor
    const p = contour.points[0]!;
    const idx = (p.y * width + p.x) * 4;
    const r = data[idx]!;
    const g = data[idx + 1]!;
    const b = data[idx + 2]!;

    // Converte para hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  });
}
```

**Justificativa:** O primeiro pixel do contorno está sobre uma borda da imagem original. Sua cor é representativa da região que aquele contorno delimita. Esta abordagem é:
- **Determinística:** mesmo pixel sempre → mesma cor
- **Rápida:** O(1) por contorno (sem loops adicionais)
- **Simples:** sem dependências externas

### 5.3 Fallback

Se `contour.points` estiver vazio (edge case impossível dado o `minContourLength`), usa `DEFAULT_COLOR = '#222222'`.

### 5.4 `filterPathsByBackgroundContrast()` permanece ativo

Paths cuja cor amostrada é muito próxima do branco (`distance < 30` RGB) são filtrados — mesmo comportamento de hoje, mas agora operando sobre a cor amostrada em vez da paleta do `imagetracerjs`.

---

## 6. Web Worker — Interface e Estratégia

### 6.1 Decisão: Rodar na Main Thread (Fase 1), Worker na Fase 2

| Fase | Local | Justificativa |
|------|-------|---------------|
| **Fase 1 (MVP)** | Main thread | `vectorizeImage()` já é async; custo estimado <500ms para edge+bezier vs ~500ms do `imagetracerjs` atual. Não piora a experiência. |
| **Fase 2 (otimização)** | Web Worker via OffscreenCanvas | UI não bloqueia durante processamento; `Transferable Objects` zero-copy para `ImageData.data.buffer` |

### 6.2 Interface Worker ↔ Main Thread (para Fase 2)

```typescript
// ─── Mensagens ───

interface VetorialWorkerRequest {
  type: 'vectorize';
  /** Buffer dos pixels (transferido via Transferable Objects) */
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  options: {
    blurSigma: number;
    lowThreshold: number;
    highThreshold: number;
    contourEpsilon: number;
    minContourLength: number;
    strokeWidth: number;
  };
  /** ID de correlação para matching request/response */
  requestId: string;
}

interface VetorialWorkerProgress {
  type: 'progress';
  phase: 'grayscale' | 'blur' | 'sobel' | 'nms' | 'hysteresis' | 'tracing' | 'rdp' | 'bezier';
  progress: number; // 0..1
  requestId: string;
}

interface VetorialWorkerResult {
  type: 'result';
  paths: Array<{
    d: string;
    length: number;
    color: string;
    strokeWidth: number;
  }>;
  requestId: string;
}

interface VetorialWorkerError {
  type: 'error';
  error: string;
  requestId: string;
}

type VetorialWorkerResponse = VetorialWorkerProgress | VetorialWorkerResult | VetorialWorkerError;
```

### 6.3 OffscreenCanvas + Transferable Objects

O Worker recebe o `ArrayBuffer` dos pixels com zero-copy:

```typescript
// Main thread
const buffer = imageData.data.buffer.slice(0); // clona se precisar manter na main
worker.postMessage(
  {
    type: 'vectorize',
    pixels: imageData.data,
    width: imageData.width,
    height: imageData.height,
    options: { ... },
    requestId: crypto.randomUUID(),
  },
  [buffer], // Transferable: main thread perde acesso
);
```

### 6.4 Por que não agora?

- O pipeline edge+bezier é código puro (sem DOM) — roda em Worker naturalmente
- `OffscreenCanvas` não é necessário para o pipeline (só usamos `ImageData`)
- A migração para Worker exige apenas: serializar opções, transferir buffer, processar, postar resultado
- **Esforço estimado:** ~2h adicionais após o pipeline estar estável na main thread
- O modo mask atual já tem Worker com `strokeWorker.ts` — mesmo padrão pode ser seguido

---

## 7. Cache — Estratégia de Integração

### 7.1 Estado atual

O `strokeCache.ts` já constrói a chave SHA-256 com `renderMode` + `preset` + `sortOrder`:

```typescript
const payload = `${imageUrl}|${JSON.stringify({ mode, preset, sortOrder })}`;
```

### 7.2 Como o novo pipeline se integra

**Nenhuma modificação no `strokeCache.ts` é necessária.**  
O cache já discrimina por `preset`:

| Chave de cache | Pipeline | Gera |
|---|---|---|
| `mode=vetorial, preset=edge-default` | Edge+Bezier | paths grossos (strokeWidth 8) |
| `mode=vetorial, preset=artistic1` | imagetracerjs | paths finos (strokeWidth 2) |

A mesma imagem com presets diferentes gera **chaves diferentes** no cache — não há colisão.

### 7.3 Pathomit não se aplica ao edge+bezier

O `pathomit` (descartar paths com `length < N`) é específico do `imagetracerjs`. No pipeline edge+bezier, o controle equivalente é `minContourLength` (do `traceContours`). O cache ignora `pathomit` no modo edge+bezier — a chave já é diferente por preset.

---

## 8. Presets e `vetorialPresets.ts`

### 8.1 Novos presets

Adicionar ao tipo `VetorialPreset` em `types/vetorial.ts`:

```typescript
export type VetorialPreset =
  // ... 16 presets existentes ...
  | 'edge-default'
  | 'edge-detailed'
  | 'edge-bold'
  | 'edge-sketch';
```

### 8.2 Grupo `'edge-detection'` em `VETORIAL_PRESETS_GROUPED`

```typescript
export type VetorialPresetGroupId =
  | 'artistic'
  | 'posterized'
  | 'smoothed'
  | 'detailed'
  | 'grayscale'
  | 'sampling'
  | 'edge-detection'; // NOVO
```

### 8.3 Mapeamento preset → parâmetros do pipeline

| Preset | `highThreshold` | `epsilon` | `blurSigma` | `strokeWidth` | Descrição |
|--------|:---:|:---:|:---:|:---:|---|
| `edge-default` | 0.3 | 2.0 | 1.0 | 8 | Equilíbrio entre detalhe e simplicidade |
| `edge-detailed` | 0.2 | 1.0 | 0.5 | 6 | Mais paths, mais detalhes, traço mais fino |
| `edge-bold` | 0.4 | 3.0 | 1.5 | 12 | Menos paths, traço mais grosso, mais simplificado |
| `edge-sketch` | 0.25 | 1.5 | 0.5 | 7 | Traço mais solto (menos pathsomit, mais ruído aparente) |

### 8.4 `PATHOMIT_BY_PRESET` não se aplica a presets `edge-*`

O `PATHOMIT_BY_PRESET` é ignorado para presets que começam com `'edge-'`.  
O controle equivalente é feito pelos parâmetros do pipeline (epsilon, threshold).

### 8.5 `MAX_PATHS_PER_SCENE` muda de 150 para 60

Com paths grossos, 60 paths já cobrem bem a imagem. O GPU timeout é mitigado pelo número reduzido de paths.  
A constante é a mesma para ambos os pipelines (150 → 60), mas o pipeline edge+bezier raramente ultrapassa 50.

---

## 9. Determinismo

### 9.1 Fontes de não-determinismo identificadas

| Fonte | Presente em | Mitigação |
|-------|-------------|-----------|
| `Math.random()` para `id` | `imageProcessing.ts:552` | Inofensivo — `id` não afeta paths |
| Ordem de iteração de `Object.entries()` | Não usado no pipeline | N/A |
| Ordem de `Object.keys()` | Não usado no pipeline | N/A |
| Ordem de `Map/Set` | Não usado no pipeline (arrays) | N/A |
| `contours.sort()` | Estável por padrão (V8) | Usar `sort()` com comparador determinístico |
| Moore-Neighbor (ordem de busca) | Determinístico por construção | Ordem anti-horária fixa |

### 9.2 Garantias

O pipeline inteiro é determinístico (dados as mesmas entradas):
- `detectEdges()` — convoluções e thresholds puramente matemáticos
- `traceContours()` — Moore-Neighbor com ordem de busca fixa (anti-horária)
- `fitBezierPaths()` — RDP determinístico + least squares com ponto inicial fixo
- `sampleColors()` — primeiro pixel do contorno (sempre o mesmo)

**Sem `Math.random()` em nenhuma etapa do pipeline.**  
O único `Math.random()` existente em `processVetorialOnMainThread` (linha 552) é para o `id` da animação — não afeta paths.

---

## 10. Performance no Remotion

### 10.1 GPU Timeout

| Cenário | Paths/cena | Risco de GPU timeout |
|---------|:----------:|:--------------------:|
| Atual (imagetracerjs, strokeWidth=2) | 100–500 | **Alto** (>150 causa timeout documentado) |
| Novo (edge+bezier, strokeWidth=8) | 5–50 | **Baixo** (10x menos elementos SVG) |
| Novo com 3 cenas simultâneas | 15–150 totais | **Médio** (abaixo do limite de 150 por cena) |

### 10.2 `MAX_PATHS_PER_SCENE`

- **Valor atual:** 150
- **Novo valor:** 60 (safety limit para ambos os pipelines)
- **Raramente atingido:** o pipeline edge+bezier gera tipicamente 5–50 paths

### 10.3 `reduceInstructions()` é desnecessário

Com 5–50 paths de ~3–5 comandos `C` cada, o `reduceInstructions()` não traz benefício. Manter a chamada como safety net (já existe no código) não custa nada — pode ser removida em limpeza futura.

### 10.4 `totalDurationMs` recalibrado

Fórmula atual: `Math.max(2000, paths.length * 80)`  
Fórmula nova: `Math.max(3000, paths.length * 120)`

**Justificativa:** com menos paths porém mais longos (maior `totalLength`), cada path leva mais tempo para desenhar. O fator `120` ms/path (vs 80) compensa o comprimento extra.

---

## 11. WhiteboardScene — PenScale

### 11.1 Problema

A caneta SVG (`Pencil` em `WhiteboardScene.tsx`) tem tamanho FIXO (corpo amarelo de 16×80px). Com paths de strokeWidth 8–12, a caneta fica desproporcionalmente fina.

### 11.2 Solução: `penScale` derivado do strokeWidth

```typescript
export interface WhiteboardSceneProps {
  // ... props existentes ...
  /**
   * Fator de escala da caneta. Default: derivado de `animation.paths[0]?.strokeWidth ?? 2 / 4`
   * (strokeWidth 8 → penScale 2, strokeWidth 2 → penScale 0.5)
   */
  penScale?: number;
}
```

**Cálculo do default:**

```typescript
const defaultPenScale = (animation.paths[0]?.strokeWidth ?? 2) / 4;
// strokeWidth 8 → penScale 2 (caneta 2× maior)
// strokeWidth 2 → penScale 0.5 (caneta ½ tamanho)
// strokeWidth 10 → penScale 2.5
```

**Aplicação no `Pencil`:**

```typescript
// Dentro do <g> da caneta
<g
  transform={`translate(${x + tremor} ${y + bob}) rotate(${rotation}) scale(${penScale})`}
  filter="url(#pencil-fx)"
>
  {/* Mesmo conteúdo, escalado pelo SVG nativamente */}
  <rect x={-8} y={-120} width={16} height={10} fill="#fca5a5" /> {/* borracha */}
  <rect x={-8} y={-110} width={16} height={10} fill="#9ca3af" /> {/* banda */}
  <rect x={-8} y={-100} width={16} height={80} fill={bodyColor} /> {/* corpo */}
  <polygon points="-8,-20 8,-20 0,0" fill="#fde047" /> {/* ponta madeira */}
  <polygon points="-3,-7.5 3,-7.5 0,0" fill="#374151" /> {/* grafite */}
</g>
```

**Impacto:** zero na lógica de animação existente. A prop `penScale` é opcional e tem default inteligente.

---

## 12. Tratamento de Edge Cases

### 12.1 Imagem sem bordas (fundo sólido)

`detectEdges()` produz edgeMap com todos os valores 0.  
`traceContours()` retorna array vazio (`minContourLength` descarta tudo).  
`fitBezierPaths()` retorna array vazio.  
`vectorizeImage()` retorna `[]`.  
`WhiteboardScene` exibe canvas vazio (tratamento existente na linha 334: `if (totalDrawingLength <= 0)`).

### 12.2 Imagem com bordas muito fracas

O threshold `highThreshold` (default 0.3) pode não detectar bordas sutis.  
**Mitigação:** `contourEpsilon` pode ser reduzido, ou o usuário pode mudar para preset `edge-detailed` (threshold 0.2).  
Se mesmo assim não detectar, **fallback automático**:

```typescript
if (contours.length === 0 && preset.startsWith('edge-')) {
  log.warn('Edge detection não encontrou bordas — tentando fallback com threshold mais baixo');
  // Re-tenta com highThreshold = 0.1
  contours = traceContours(detectEdges(imageData, { ...edgeOptions, highThreshold: 0.1 }), ...);
}
```

### 12.3 Imagem muito grande (>1920×1080)

Já existe resize no `generateStrokesFromImage` (linhas 375-379 do `imageProcessing.ts`). O pipeline edge+bezier opera sobre a imagem já redimensionada — sem modificações necessárias.

### 12.4 Fork em contorno (junção T/Y)

O Moore-Neighbor padrão pode "perder" um braço do fork.  
**Estratégia:** quando múltiplos vizinhos de borda são encontrados, escolhe o que minimiza a mudança angular (preserva curvatura). O pixel alternativo é marcado como não visitado e será descoberto na varredura principal como início de um novo contorno.

### 12.5 Contornos muito longos (>1000 pontos)

O RDP simplifica para ~20–50 pontos-chave. Se ainda assim o contorno tiver muitos pontos após RDP (epsilon muito baixo), o Bezier fitting subdivide recursivamente até `fitError` ser satisfeito — limitado a `MAX_SUBDIVISIONS = 10` para evitar loop infinito.

### 12.6 Path Bezier mal formado

`safeGetPointAtLength()` (já existente em `WhiteboardScene.tsx:85`) captura exceções do `@remotion/paths` e retorna `{ x: 0, y: 0 }` como fallback.  
Além disso, `fitBezierPaths` valida cada path gerado:

```typescript
// Valida que o path é renderizável
try {
  getLength(d);
} catch {
  log.warn('Path Bezier inválido — descartando', { d: d.substring(0, 80) });
  continue; // descarta este path
}
```

### 12.7 Imagem com gradientes suaves (fotos)

Edge detection Canny funciona melhor com alto contraste. Fotos com gradientes suaves podem precisar de:
- `blurSigma` mais baixo (0.5) para preservar bordas fracas
- `highThreshold` mais baixo (0.2) para detectar mais bordas

O preset `edge-detailed` já configura estes valores. Se mesmo assim falhar, o fallback `imagetracerjs` continua disponível.

---

## 13. Mapeamento de Arquivos

### 13.1 Arquivos NOVOS (5)

| Arquivo | Conteúdo | ~Linhas |
|---------|----------|:-------:|
| `src/features/speed-paint/lib/edgeDetection.ts` | `detectEdges()` + helpers (Gaussian, Sobel, NMS, hysteresis) | 250 |
| `src/features/speed-paint/lib/contourTracing.ts` | `traceContours()` + tipo `Contour` + `Point2D` | 200 |
| `src/features/speed-paint/lib/bezierFitting.ts` | `fitBezierPaths()` + RDP + cubic bezier fitting + tipo `BezierPath` | 300 |
| `tests/speed-paint/edgeDetection.unit.test.ts` | Testes com imagem sintética 50×50 (quadrado, círculo, linhas) | 150 |
| `tests/speed-paint/contourTracing.unit.test.ts` | Testes com edgeMap controlado | 150 |
| `tests/speed-paint/bezierFitting.unit.test.ts` | Testes com contornos sintéticos | 200 |

### 13.2 Arquivos MODIFICADOS (7)

| Arquivo | Mudança | ~Linhas alteradas |
|---------|---------|:-----------------:|
| `src/features/speed-paint/types/vetorial.ts` | Adicionar 4 novos presets a `VetorialPreset` | +4 linhas |
| `src/features/speed-paint/constants/vetorialPresets.ts` | Adicionar grupo `'edge-detection'` | +10 linhas |
| `src/features/speed-paint/lib/vectorizer.ts` | Branch por preset no `vectorizeImage()` + novos campos `VectorizeOptions` + `DEFAULT_PRESET` → `'edge-default'` + `MAX_PATHS_PER_SCENE` → 60 | ~40 linhas |
| `src/features/speed-paint/lib/imageProcessing.ts` | `processVetorialOnMainThread` passa novas options (opcional) | ~10 linhas |
| `src/features/video-render/components/WhiteboardScene.tsx` | `penScale` prop + escala no `<Pencil>` | ~20 linhas |
| `tests/speed-paint/vectorizer.unit.test.ts` | Novos testes para pipeline edge+bezier | +200 linhas |
| `tests/speed-paint/imageProcessing.vetorial.integration.test.ts` | Testes com preset `edge-default` | +30 linhas |

### 13.3 Arquivos INTACTOS (principais)

| Arquivo | Motivo |
|---------|--------|
| `src/features/speed-paint/types.ts` | Tipos `Stroke`, `StrokeAnimation`, `PaintingJob` — inalterados |
| `src/features/video-render/lib/strokeCache.ts` | Chave SHA-256 já inclui `preset` — compatível |
| `src/features/video-render/components/WhiteboardComposition.tsx` | Wrapper puro, sem lógica de pipeline |
| `src/features/video-render/lib/speedPaintRenderer.ts` | Orquestração de cenas — inalterado (consome `vectorizeImage` via `generateStrokesFromImage`) |
| `src/features/video-render/lib/strokeWorker.ts` | Worker do modo mask — inalterado |
| `src/features/speed-paint/store/speedPaintRenderController.tsx` | Controller — inalterado |
| `src/features/speed-paint/store/animationStore.ts` | Store — inalterado |
| `src/pages/SpeedPaintPage.tsx` | UI — inalterado (presets `edge-*` aparecem no dropdown automaticamente) |

---

## 14. Decisões de Design Registradas (MDE)

| ID | Decisão | Alternativas Consideradas | Justificativa |
|----|---------|--------------------------|---------------|
| **D1** | Implementar Canny completo (5 etapas) vs Sobel simplificado | Sobel + threshold simples | Canny produz bordas mais limpas (NMS afina, hysteresis conecta). O Sobel simplificado do modo mask atual produz bordas grossas e quebradas — insuficiente para curve fitting |
| **D2** | Moore-Neighbor vs Marching Squares | Marching Squares com 16-case LUT | Moore-Neighbor produz sequências ordenadas de pontos → ideais para RDP + Bezier. Marching Squares produz segmentos soltos que precisariam ser unidos |
| **D3** | RDP + Cubic Bezier (least squares) vs Catmull-Rom | Catmull-Rom + conversão para Bezier | RDP preserva cantos vivos. Bezier é formato nativo SVG. Catmull-Rom não preserva cantos e precisa conversão extra |
| **D4** | Amostragem de cor no primeiro pixel do contorno vs paleta quantizada | (a) Média da região, (b) Cor fixa `#222`, (c) Amostragem perpendicular | O(1), determinístico, simples. A média da região seria O(n) e poderia suavizar cores. Cor fixa perderia riqueza visual |
| **D5** | Pipeline na main thread (Fase 1) vs Worker desde o início | Worker com OffscreenCanvas | `vectorizeImage()` já é async e checa abort. Custo estimado <500ms — mesma ordem do `imagetracerjs` atual. Worker pode ser adicionado sem quebrar API |
| **D6** | Presets `edge-*` como novos valores de `VetorialPreset` vs campo separado `pipelineMode` | Pipeline explícito `'imagetracerjs' vs 'edge+bezier'` | Adicionar à union existente é mais simples e o prefixo `'edge-*'` já discrimina. O campo `pipelineMode` existe como override explícito |
| **D7** | `maxPathsPerScene` de 150 → 60 | Manter 150 | Com paths grossos, 60 já cobre a imagem. GPU timeout é mitigado. O safety limit existe para ambos os pipelines |
| **D8** | `totalDurationMs` recalibrado para paths mais longos | Manter fórmula atual | Menos paths porém mais longos exigem mais tempo de animação. Fator 120 ms/path vs 80 ms |
| **D9** | `penScale` derivado de `paths[0].strokeWidth` | Prop fixa na UI | Automático e consistente. O usuário não precisa configurar manualmente |

---

## 15. Pendências e Decisões em Aberto

| Decisão | Opções | Impacto | Quando decidir |
|---------|--------|---------|----------------|
| **Web Worker** | (a) Main thread sempre (b) Worker automático se OffscreenCanvas disponível (c) Worker com fallback main thread | Performance da UI durante processamento | Fase 2 (após estabilização) |
| **Remover `imagetracerjs`** | (a) Manter como fallback (b) Remover na próxima major | Tamanho do bundle (~290KB) + manutenção | Após 1 mês em produção sem bugs |
| **Presets legados na UI** | (a) Manter todos (b) Esconder em submenu "Legado" (c) Remover | Experiência do usuário + descoberta dos novos presets | Fase 4 (UI) |
| **StrokeWidth dinâmico** | (a) Fixo por preset (b) Variável por path (derivado da espessura do contorno) | Naturalidade visual | Fase 4 (calibração estética) |
| **Threshold adaptativo (Otsu)** | (a) Threshold fixo (b) Otsu automático (c) Ambos com fallback | Robustez para diferentes tipos de imagem | Fase 4 (se threshold fixo falhar em fotos) |

---

## 16. Plano Técnico de Implementação

### Fase 1 — Fundação (pode paralelizar)

```
Ordem sugerida:
1. Módulo 5 (Tipos/Presets) — ~15min
   ├── Adicionar 'edge-default', 'edge-detailed', 'edge-bold', 'edge-sketch' ao VetorialPreset
   ├── Adicionar grupo 'edge-detection' em VETORIAL_PRESETS_GROUPED
   └── Adicionar namespace i18n 'speedPaint.presetGroups.edge-detection' nos 3 locales

2. Módulo 7 (WhiteboardScene) — ~1h
   ├── Adicionar prop opcional `penScale` (+ default derivado de paths[0].strokeWidth)
   ├── Aplicar `scale(${penScale})` no `<g>` do Pencil
   └── Testar visual com paths de strokeWidth 8 e 12

3. Módulo 1 (Edge Detection) — ~2h
   ├── Implementar detectEdges() com Sobel + NMS + hysteresis
   ├── Escrever testes com imagem sintética 50×50
   └── Validar com imagem flat design 1920×1080
```

### Fase 2 — Pipeline Core

```
4. Módulo 2 (Contour Tracing) — ~2h
   ├── Implementar traceContours() com Moore-Neighbor
   ├── Escrever testes com edgeMap controlado
   └── Validar contornos fechados e abertos

5. Módulo 3 (Bezier Fitting) — ~3h
   ├── Implementar RDP simplification
   ├── Implementar cubic Bezier fitting (least squares)
   ├── Implementar fitBezierPaths()
   ├── Escrever testes com contornos sintéticos
   └── Validar paths SVG gerados com @remotion/paths
```

### Fase 3 — Integração

```
6. Módulo 4 (Vectorizer) — ~2h
   ├── Adicionar branch em vectorizeImage() por preset
   ├── Implementar sampleColors()
   ├── Atualizar DEFAULT_PRESET → 'edge-default'
   ├── Atualizar MAX_PATHS_PER_SCENE → 60
   └── Testes de regressão + novos testes edge+bezier

7. Módulo 6 (ImageProcessing) — ~1h
   ├── Atualizar totalDurationMs (3000, paths.length * 120)
   └── Testes de integração vetorial
```

### Fase 4 — Estabilização

```
8. Testes comparativos (imagetracerjs vs edge+bezier) com 10 imagens
9. Calibração de parâmetros default
10. Testes de performance (1920×1080, ~500ms)
11. Atualizar AGENTS.md + docs
```

---

## 17. Checklist de Verificação Pós-Implementação

- [ ] `bun run typecheck` limpo (tsc sem erros)
- [ ] `bun run lint` limpo (ESLint sem erros)
- [ ] `bun run test` — 2268+ testes passando (nenhuma regressão)
- [ ] `vectorizeImage({ preset: 'edge-default' })` produz `VetorialPath[]` com `strokeWidth >= 6`
- [ ] `vectorizeImage({ preset: 'artistic1' })` produz paths idênticos ao comportamento atual
- [ ] Cache LRU: mesma imagem + mesmo preset → cache hit (não reprocessa)
- [ ] Cache LRU: mesma imagem + presets diferentes → cache miss (chaves diferentes)
- [ ] WhiteboardScene exibe caneta proporcional ao strokeWidth
- [ ] Imagem sem bordas retorna array vazio (sem crash)
- [ ] Imagem >1920×1080 é redimensionada antes do processamento
- [ ] `AbortSignal` cancela o pipeline no meio da execução
- [ ] Modo `'mask'` completamente inalterado

---

*Documento de arquitetura gerado em 2026-06-16 para o projeto Script Master (v0.131.0).  
Próximo passo: implementar Módulo 5 (Tipos/Presets) + Módulo 1 (Edge Detection) em paralelo.*
