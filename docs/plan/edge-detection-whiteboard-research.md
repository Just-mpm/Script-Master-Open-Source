# Pesquisa: Edge Detection + Contour Tracing + Bezier Curves para Whiteboard Animation

**Data:** 2026-06-16
**Contexto:** Substituição do `imagetracerjs@1.2.6` por pipeline Canvas nativo para gerar traços grossos e contínuos (estilo marcador/whiteboard) no Speed Paint do Script Master.

---

## 1. Pergunta

É viável implementar um pipeline de edge detection → contour tracing → bezier curve fitting 100% em JavaScript puro (Canvas 2D, Web Worker) que produza **5-50 traços contínuos grossos** (strokeWidth 6-8, strokeLinecap round) por cena, substituindo os 100-500 paths finos (strokeWidth 2) do `imagetracerjs`?

---

## 2. Contexto Atual (Extraído do Código)

### Pipeline Atual (`vectorizer.ts` + `imageProcessing.ts`)

1. **Redimensionamento:** imagem redimensionada para max 1920×1080
2. **ImageData extraído** do Canvas na main thread
3. **`ImageTracer.imagedataToSVG()`** (imagetracerjs, ~290KB) converte pixels em SVG string (síncrono, main thread)
4. **Parser regex** extrai `<path d="..." />` do SVG (sem DOMParser)
5. **`@remotion/paths.getLength()`** calcula comprimento de cada path
6. **Filtro `pathomit`:** descarta paths com length < 8 (default)
7. **Filtro de contraste:** remove paths com cor próxima ao fundo
8. **Truncamento:** max 150 paths/cena (config `MAX_PATHS_PER_SCENE`)
9. **Ordenação** opcional (top-down, center-out, big-first, random)

### Resultado Atual

- 100-500 paths SVG fechados (fill) por cena
- strokeWidth: 2 (fino)
- Paths são preenchidos (fill) em vez de contorno (stroke)
- Aparência de "rabisco" / baixa qualidade visual
- Latência ~500ms para 1920×1080 (main thread)
- GPU timeout observado com >150 paths/cena no Remotion `renderMediaOnWeb`

### Modo Máscara (atual `imageProcessing.ts`)

Já existe um Web Worker inline com edge detection básico (diferença adjacente simples) que produz strokes para o modo "raspadinha" (mask). Esse código tem um algoritmo de edge detection primitivo:

- Conversão para grayscale
- Diferença absoluta entre pixel atual e vizinhos (direita + baixo)
- Threshold fixo (`diff > 20`)
- BFS clustering (5×5 search)
- Tracing com janela 2×2
- Subsampling (stepSize=5) + curva quadrática manual

Esse algoritmo existente é um bom ponto de partida, mas produz muitos strokes pequenos em vez de traços contínuos.

---

## 3. Critérios de Decisão

| Critério | Peso | Descrição |
|----------|------|-----------|
| **Zero dependências externas novas** | Alto | Preferir Canvas API pura em vez de libs adicionais |
| **Determinismo** | Crítico | Mesma imagem → mesmos paths sempre (Remotion) |
| **Latência < 2000ms** | Alto | Para 1920×1080, edge detection + tracing + fitting |
| **Qualidade visual** | Alto | Traços contínuos grossos (caneta), não rabiscos finos |
| **Paths SVG válidos** | Crítico | Compatíveis com `@remotion/paths.getLength()` |
| **Web Worker** | Médio | Pipeline deve rodar em Worker via OffscreenCanvas |
| **Baixo path count** | Alto | 5-50 paths/cena (vs 150 atuais) |
| **Stroke grosso** | Alto | strokeWidth 6-8, strokeLinecap round |

---

## 4. Opções Consideradas

### Opção A: Edge Detection (Sobel/Canny) + Moore-Neighbor Tracing + RDP + Cubic Bezier Fitting (RECOMENDADA)

Pipeline completo em JS puro:

1. **Gaussian Blur** (convolução 5×5) — reduz ruído
2. **Sobel operator** (gradientes Gx, Gy) — magnitude + direção
3. **Non-maximum suppression** — afina bordas para 1px
4. **Double threshold + hysteresis** — Canny completo
5. **Moore-Neighbor Tracing** — extrai contornos ordenados
6. **Ramer-Douglas-Peucker** — simplifica pontos (~2px epsilon)
7. **Cubic Bezier fitting** — converte pontos em curvas suaves
8. **SVG path generation** — `M... C... C...` com strokeWidth 6-8

### Opção B: Potrace JS (port do potrace CLI)

Port do [Potrace](http://potrace.sourceforge.net/) existente como [`kilobtye/potrace`](https://github.com/kilobtye/potrace) (343 stars, GPL-2.0). Já faz o pipeline completo de bitmap → paths SVG otimizados (edge detection + contour tracing + bezier curves).

### Opção C: Apenas melhorias no `imagetracerjs` atual

Ajustar parâmetros do `imagetracerjs` para produzir menos paths mais grossos. A lib permite configurar `pathomit`, `numberofcolors`, `blurRadius`, etc.

### Opção D: Canvas `getImageData` + filter nativo `ctx.filter`

Usar `ctx.filter = 'url(#svg-edge)'` ou `ctx.filter = 'blur(2px) brightness(1.5)'` + `getImageData` para detectar bordas sem convolução manual. Combinar com marching squares via lookup table.

---

## 5. Comparação Detalhada

### Opção A: Pipeline Canvas Puro (RECOMENDADA)

| Prós | Contras | Limitações | Quando faz sentido |
|------|---------|------------|-------------------|
| Zero dependências externas | Implementação de Canny é trabalhosa (~300-400 linhas) | Canny completo requer 5 etapas (Gaussian, Sobel, NMS, double threshold, hysteresis) | Projetos que precisam de controle total sobre o pipeline |
| Determinístico (sem random) | Precisa de testes extensivos com diversos tipos de imagem | Moore-Neighbor pode produzir contornos "quebrados" em bordas com baixo contraste | Quando a qualidade visual (traço contínuo grosso) é prioridade |
| Controle total sobre strokeWidth, linecap, linejoin | Performance depende da implementação (vs libs C otimizadas) | Bezier fitting pode criar loops em curvas muito complexas | Quando já se tem Web Worker e OffscreenCarbon no projeto |
| Pode rodar em Web Worker via OffscreenCanvas | Curva de aprendizado dos algoritmos | RDP com epsilon muito baixo produz muitos pontos | Projetos com restrições de licença (BYOK open source) |
| Latência estimada: 800-1500ms (1920×1080) | — | — | — |

### Opção B: Potrace JS

| Prós | Contras | Limitações | Quando faz sentido |
|------|---------|------------|-------------------|
| Pipeline completo + testado (~10+ anos) | Licença GPL-2.0 (pode conflitar com MIT do projeto) | Não mantido há 6+ anos | Projetos compatíveis com GPL |
| Edge detection + contour tracing + bezier | Port JS tem 7KB, mas usa Canvas 2D (browser) | Precisa de Canvas/Buffer como entrada | Quando não se quer implementar algoritmos do zero |
| Parâmetros ajustáveis (turdsize, alphamax, optcurve) | Potrace foi feito para traços finos (stroke de 1px) | Para obter stroke grosso, precisaria pós-processar com `strokeWidth` | Projetos sem restrição de licença |
| Saída SVG direta (paths com curvas Bezier) | A versão Node (`node-potrace`) não funciona no browser sem bundler | O port browser (kilobtye) não é mantido | Como alternativa rápida para MVP |

### Opção C: Ajustes no `imagetracerjs`

| Prós | Contras | Limitações | Quando faz sentido |
|------|---------|------------|-------------------|
| Mudança mínima no código | `imagetracerjs` produz paths **fill** (preenchidos), não stroke (contorno) | A lib não foi projetada para traços grossos | Apenas como melhoria incremental |
| Já integrado no projeto | Paths preenchidos viram 50-500 polígonos por cena | Stroke em paths preenchidos parece "borda dupla" (feio) | Se o resto falhar |
| Baixo risco de regressão | Mesmo com pathomit alto, ainda gera muitos paths | GPU timeout documentado com >150 paths/cena | — |

### Opção D: Canvas filter + Marching Squares

| Prós | Contras | Limitações | Quando faz sentido |
|------|---------|------------|-------------------|
| `ctx.filter` usa GPU nativa | Suporte limitado (Safari < 16.4, Firefox < 103) | Sem controle sobre os kernels | Prototipagem rápida |
| Menos código manual | Marching squares lookup table é 16 entradas | Marching squares produz isolinhas, não contornos ordenados | Apenas como prova de conceito |
| Rápido (<200ms) | Sem non-maximum suppression (bordas grossas) | Não resolve o problema de contornos para curve fitting | — |

---

## 6. Respostas às Perguntas de Pesquisa

### 6.1 Edge Detection em JS — Qual a melhor forma?

**Canny edge detection** é o algoritmo mais adequado. Implementações de referência em JS puro:

1. **`web.dev/canvas-imagefilters`** — Documentação oficial do Google com implementação de Sobel + convolução em JS puro. Código de referência para Gaussian blur e Sobel operator.

2. **Wikipedia Canny Edge Detector** — Descrição completa das 5 etapas:
   - Gaussian filter (5×5 kernel, σ=1.4)
   - Intensity gradient (Sobel 3×3: Gx, Gy)
   - Non-maximum suppression (afina bordas)
   - Double threshold (high/low)
   - Edge tracking by hysteresis (blob analysis 8-connected)

3. **Implementação Earth Engine** — `ee.Algorithms.CannyEdgeDetector{threshold, sigma}` — Google documenta o algoritmo com parâmetros `threshold: 10` e `sigma: 1` como defaults.

**Parâmetros críticos para whiteboard:**
- **Sigma do Gaussian blur:** 1.0-1.5 (σ=1.4 é o default do Canny original). Mais alto → menos bordas finas (bom para fotos). Para whiteboard com imagens flat/design, σ=1.0 é suficiente.
- **High threshold:** 0.3 (normalizado). Controla quantas bordas fortes são detectadas. Mais baixo → mais bordas (incluindo ruído).
- **Low threshold:** 0.1 (normalizado), tipicamente 1/2 a 1/3 do high threshold. Controla quais bordas fracas são conectadas às fortes.
- **Para imagens flat/design** (comuns no whiteboard): threshold alto (0.3-0.5) + sigma baixo (1.0) produz bordas limpas.

**Recomendação:** Implementar Canny completo em ~400 linhas de JS puro. Para whiteboard, podemos simplificar: pular a etapa de Gaussian se a imagem já for limpa (ícones, diagramas), e usar apenas Sobel + NMS + single threshold.

### 6.2 Contour Tracing — Marching Squares vs Moore-Neighbor

| Característica | Marching Squares | Moore-Neighbor |
|---------------|-----------------|----------------|
| **Entrada** | Campo escalar (valores contínuos) | Imagem binária (borda/não borda) |
| **Saída** | Segmentos de linha (isolinhas) | Sequência ordenada de pixels |
| **Ordem** | Não ordenada (segmentos soltos) | Ordenada (contorno fechado ou aberto) |
| **Ideal para curve fitting?** | Não (precisa juntar segmentos) | Sim (sequência direta de pontos) |
| **Complexidade** | O(n) com lookup table | O(n) com backtracking |
| **Implementação** | 16-case lookup table (simples) | ~30 linhas de código (simples) |
| **Saddle points** | Ambiguidade (precisa resolver) | Não aplicável (binário) |
| **Contornos fechados** | Sim (cada segmento fecha) | Sim (volta ao pixel inicial) |
| **Contornos abertos** | Não | Sim (atinge borda da imagem) |

**Recomendação: Moore-Neighbor tracing** — produz sequências ordenadas de pixels perfeitas para alimentar RDP + curve fitting. O algoritmo é simples (~30 linhas), determinístico, e já existe implementação de referência no modo mask (`imageProcessing.ts` faz tracing com janela 2×2, mas não usa Moore-Neighbor puro).

**Moore-Neighbor melhoria sobre o tracing atual:**
- O tracing atual (`imageProcessing.ts`) usa busca em "janela 2×2" que pode perder pixels diagonais
- Moore-Neighbor usa vizinhança 8-directional com regra de backtracking → nunca perde o contorno
- Terminação: "entrar no pixel inicial pela segunda vez na mesma direção" (Jacob Eliosoff) — robusto contra falsos positivos

### 6.3 Bezier Curve Fitting — A partir de pontos 2D

**Pipeline recomendado:**

1. **Ramer-Douglas-Peucker (RDP)** com ε=2.0-3.0px — simplifica o contorno de milhares de pixels para 20-100 pontos chave
2. **Cubic Bezier fitting** — para cada segmento do RDP, ajusta uma curva cúbica (4 pontos de controle por segmento)

**Por que RDP + Bezier e não Catmull-Rom?**
- RDP preserva cantos vivos (parâmetro `epsilon` controla sensibilidade)
- Cubic Bezier é o formato nativo do SVG (`C` command) — compatível com `@remotion/paths.getLength()`
- Catmull-Rom → Bezier requer conversão extra (e Catmull-Rom não preserva cantos)

**Implementação do Bezier fitting (dois métodos):**

| Método | Prós | Contras |
|--------|------|---------|
| **Least squares** (Philip J. Schneider alg) | Ajuste suave mesmo com ruído nos pontos | Mais complexo, ~100 linhas |
| **Geometric (tangent-based)** | Simples (~40 linhas), determinístico | Pode sub-oscilar em curvas muito acentuadas |
| **Potrace approach** | Testado em produção (~20 anos) | GPL-licensed, não podemos copiar |

**Recomendação:** Implementar least squares fitting (baseado no algoritmo de Schneider, "An Algorithm for Automatically Fitting Digitized Curves", 1990) — ~80 linhas de JS. O algoritmo:
1. Para cada segmento RDP, calcula tangentes no início e fim
2. Ajusta os 2 pontos de controle internos da Bezier cúbica usando aproximação de mínimos quadrados
3. Se o erro máximo > threshold, subdivide recursivamente

**Saída SVG esperada:**
```svg
<path d="M 100 200 C 150 200, 200 250, 200 300 C 250 300, 300 200, 300 150"
      stroke="#222" stroke-width="7" stroke-linecap="round" fill="none" />
```

### 6.4 Performance no Remotion `renderMediaOnWeb`

**Resposta do NotebookLM (Remotion Docs):**
- `renderMediaOnWeb` é **experimental alpha** — sem limites numéricos documentados
- O gargalo é o **navegador**, não o Remotion — timeout de GPU quando o frame leva muito tempo para rasterizar
- **SVG com 5-50 paths grossos (strokeWidth 6-8) é MUITO mais leve** que 150 paths preenchidos com geometria complexa
- Stroke grosso ≠ mais complexidade de render — o custo é proporcional ao número de paths, não à espessura
- **Recomendação oficial:** usar `reduceInstructions()` do `@remotion/paths` para simplificar paths complexos

**Análise de impacto:**
- 5-50 paths com stroke = 10-100x menos elementos SVG que o cenário atual (150 paths/cena)
- Com 3 cenas → 15-150 paths totais (vs 450 atuais que causam GPU timeout)
- **A redução direta de paths resolve o GPU timeout** — a premissa #12 documentada (`MAX_PATHS_PER_SCENE=150`) foi uma contenção. Com 5-50 paths, o problema simplesmente desaparece
- strokeWidth 6-8 vs 2: o GPU rasteriza mais pixels por path, mas o número total de paths é 10x menor → **performance MELHOR**

### 6.5 Alternativas — Libs JS Leves

| Lib | Descrição | Licença | Tamanho | Compatibilidade |
|-----|-----------|---------|---------|-----------------|
| [`kilobtye/potrace`](https://github.com/kilobtye/potrace) | Port JS do Potrace (browser) | GPL-2.0 | ~7KB | Canvas 2D (browser) |
| [`imagetracerjs`](https://github.com/jankovicsandras/imagetracerjs) (atual) | Vectorização via tracing | MIT (unlicense) | ~290KB | Browser + Node |
| [`node-potrace`](https://github.com/tooolbox/node-potrace) | Node port do Potrace | GPL-2.0 | ~30KB | Node apenas (usa Jimp) |
| **Pipeline Canvas Puro** (esta pesquisa) | Edge detection + contour + curve fitting | MIT (projeto) | ~10KB min | Canvas 2D + Worker |

**Nota sobre Potrace JS:** O port browser (`kilobtye/potrace`) não é mantido (último commit 2015), licença GPL-2.0 (incompatível com MIT do projeto se distribuirmos como binário). Além disso, Potrace otimiza para traços finos (1-2px) — não produz o efeito "marcador grosso" desejado.

**Conclusão sobre alternativas:** Nenhuma lib existente atende aos requisitos (traços grossos contínuos, MIT, browser + Worker). Implementação própria é o caminho.

### 6.6 `reduceInstructions()` ainda é necessário?

**Resposta: Depende da complexidade dos paths.**

- Com 5-50 paths e curvas Bezier suaves (3-4 comandos `C` por path), o `reduceInstructions()` é **desnecessário**
- Paths serão do tipo: `M x y C x1 y1, x2 y2, x y C x1 y1, x2 y2, x y` — cada path tem 2-5 comandos apenas
- `@remotion/paths.getLength()` em paths simples é instantâneo (~1μs por path)
- Se algum path tiver muitos comandos (>20), usar `reduceInstructions()` como otimização

**Conclusão:** Com 5-50 paths simples, `reduceInstructions()` não traz benefício perceptível. Manter a chamada como safety net (já existe no código) não custa nada.

### 6.7 Web Worker — Edge detection em Worker

**Resposta do NotebookLM (React Docs):**
- Padrão recomendado: `useEffect` + `useRef` para ciclo de vida do Worker
- **`OffscreenCanvas.transferControlToOffscreen()`** — permite renderizar e processar pixels inteiramente no Worker
- **Transferable Objects:** `ArrayBuffer` do `ImageData.data` pode ser transferido com zero-copy: `worker.postMessage({ pixels: imageData.data.buffer }, [imageData.data.buffer])`
- ⚠️ **Cuidado:** ao transferir o buffer, a main thread perde acesso — precisa copiar antes se for manter o dado

**Latência esperada para 1920×1080 no Worker:**
- Gaussian Blur (5×5): ~100ms (O(n) com kernel 5×5 = 25 ops/pixel × 2M pixels = 50M ops)
- Sobel (Gx + Gy): ~80ms
- NMS + Double Threshold + Hysteresis: ~100ms
- Moore-Neighbor Tracing: ~50ms (depende da densidade de bordas)
- RDP + Bezier Fitting: ~30ms (para 5-50 contornos)

**Total estimado: ~400ms no Worker** — muito abaixo do limite de 2000ms. O Worker não bloqueia a UI, então mesmo que levasse 2000ms, seria aceitável (UI não trava).

**Comparação com `imagetracerjs` atual (500ms main thread):**
- O atual `imagetracerjs` roda na main thread (o código documenta que `importScripts` não funciona com Blob URL)
- O novo pipeline rodará no Worker → UI permanece responsiva mesmo durante o processamento
- OffscreenCanvas elimina a necessidade de criar canvas temporário na main thread

---

## 7. Recomendação Final

### ✅ Pipeline Canvas Puro (Opção A) — VIÁVEL E RECOMENDADO

**Abordagem recomendada:**

1. **Gaussian Blur** (opcional, 5×5 kernel, σ=1.0) — apenas para imagens ruidosas
2. **Sobel operator** (Gx, Gy 3×3) — magnitude + ângulo do gradiente
3. **Non-Maximum Suppression** — afina bordas
4. **Double Threshold** (high=0.3, low=0.1, normalizado) — classifica bordas fortes/fracas
5. **Edge Tracking by Hysteresis** — conecta fracas às fortes (8-vizinhança)
6. **Moore-Neighbor Tracing** — extrai contornos ordenados da imagem binária
7. **Ramer-Douglas-Peucker** (ε=2.0-3.0px) — simplifica para 20-50 pontos/contorno
8. **Cubic Bezier Fitting** (least squares) — ajusta curvas suaves
9. **SVG Path generation** — `fill="none" stroke="#222" strokeWidth="7" strokeLinecap="round"`

**Por que esta abordagem vence:**
- ✅ **Zero dependências externas** — implementação própria em ~800 linhas de TS
- ✅ **Determinístico** — sem `Math.random()`, tudo baseado em thresholds fixos
- ✅ **Web Worker** — pode rodar via OffscreenCanvas (transferControlToOffscreen)
- ✅ **Qualidade visual** — traços contínuos grossos (marcador piloto)
- ✅ **Performance** — ~400ms no Worker para 1920×1080
- ✅ **Escalabilidade** — 5-50 paths/cena resolve o GPU timeout do Remotion
- ✅ **Licença MIT** — compatível com o projeto

### Riscos Técnicos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| Contornos quebrados em áreas de baixo contraste | Média | Alto (paths incompletos) | Ajustar threshold dinâmico (Otsu's method) ou permitir fallback manual |
| Subdivisão excessiva do Bezier fitting | Baixa | Médio (mais paths que o ideal) | Definir `MAX_PATHS_PER_SCENE=50` como safety limit |
| Performance inferior ao esperado em imagens complexas | Baixa | Médio | Adicionar yield/setTimeout no Worker (cooperativo) |
| Diferença visual entre modo vetorial e resultado esperado | Média | Alto | Validar com Matheus antes de merge — ajustar parâmetros estéticos |
| Regressão em snapshots de teste | Baixa | Baixo | Criar testes de integração com 10 imagens de referência |
| Moore-Neighbor em contornos abertos (atinge borda da imagem) | Média | Baixo | Marcar contorno como "aberto" e não fechar o path (SVG válido) |

### Impacto no Plano Atual

1. **Arquivo novo:** `src/features/speed-paint/lib/edgeDetection.ts` — todo o pipeline (Canny + Moore-Neighbor + RDP + Bezier)
2. **Arquivo modificado:** `src/features/speed-paint/lib/vectorizer.ts` — novo branch no `renderMode === 'vetorial'` que chama o novo pipeline
3. **Arquivo modificado:** `src/features/speed-paint/lib/imageProcessing.ts` — `processVetorialOnMainThread` → `processVetorialInWorker` (OffscreenCanvas)
4. **Arquivo removido:** dependência `imagetracerjs` do `package.json` (se o novo pipeline substituir completamente)
5. **Testes:** 30+ testes unitários + 10 testes de integração com imagens de referência
6. **Snapshot:** snapshots de componentes Remotion precisam ser atualizados (paths mudam)
7. **Tracker:** atualizar premissa #12 (MAX_PATHS_PER_SCENE: 150 → 50), remover limitação de batch vetorial (já não se aplica)

---

## 8. Plano de Validação Rápida

### Fase 1 — Prova de Conceito (2-3 dias)

1. Implementar Sobel edge detection + NMS em um Web Worker inline
2. Validar com 3 imagens (flat design, foto, diagrama) — verificar se bordas são contínuas
3. Implementar Moore-Neighbor tracing
4. Verificar se contornos são ordenados (sequência de pontos)

### Fase 2 — Curve Fitting (1-2 dias)

1. Implementar RDP com epsilon ajustável
2. Implementar cubic Bezier fitting (least squares)
3. Validar visualmente: os paths parecem "traço de caneta"?

### Fase 3 — Integração (1-2 dias)

1. Converter paths para VetorialPath[] (d, length, color, strokeWidth)
2. Substituir `vectorizeImage` no modo vetorial
3. Testar com WhiteboardScene (Remotion) — verificar animação
4. Rodar testes existentes (2268 testes) — garantir zero regressão

### Fase 4 — Performance (1 dia)

1. Medir latência: Worker vs main thread
2. Medir frame rate durante renderização Remotion com 5-50 paths
3. Testar com 3 cenas simultâneas (projetos reais)

---

## 9. Fontes Consultadas

- **NotebookLM - Remotion Docs** (`3333bad6-...`): renderMediaOnWeb é experimental alpha, sem limites numéricos; recomenda `reduceInstructions()`; gargalo é o navegador, não o Remotion
- **NotebookLM - Motion Guide** (`697b773a-...`): `pathLength` nativo; animações rodam fora do React; SVG layout não suporta `layout` prop
- **NotebookLM - React Docs** (`8765c786-...`): padrões de Web Worker com OffscreenCanvas e Transferable Objects
- **NotebookLM - Bun Docs** (`dc744a2f-...`): Bun não tem APIs de processamento de imagem nativas
- **Wikipedia - Canny Edge Detector**: 5 etapas completas, parâmetros (σ=1.4, double threshold)
- **Wikipedia - Marching Squares**: algoritmo O(n) com lookup table de 16 entradas
- **Wikipedia - Moore Neighborhood**: algoritmo de tracing com pseudocódigo (~30 linhas)
- **Wikipedia - Ramer-Douglas-Peucker**: simplificação O(n log n) com ε ajustável
- **Google Developer Docs - Canvas Image Filters**: implementação de Sobel + convolução em JS puro
- **Earth Engine - CannyEdgeDetector**: parâmetros `threshold: 10`, `sigma: 1`
- **GitHub - kilobtye/potrace**: port JS do Potrace (browser), GPL-2.0, não mantido
- **Código atual**: `vectorizer.ts` (696 linhas), `imageProcessing.ts` (849 linhas), tipos `vetorial.ts`
