# Plano Técnico: Speed Paint Vetorial (Máscara → Path Animation)

**Data:** 2026-06-14
**Status:** 📋 Plano técnico validado — aguardando spike experimental
**Autor:** Matheus + Nexus
**Versão alvo:** `0.131.0` (após validação visual)
**Tipo:** Reformulação de core feature (não-cosmética)

---

## 1. Resumo Executivo

O Speed Paint atual do Script Master usa **revelação por máscara** (raspadinha) — a imagem já está pronta desde o frame 0, escondida sob uma camada branca que é "riscada" progressivamente. O resultado não parece um desenho sendo feito à mão.

Este plano descreve a migração para **animação vetorial real**, onde cada contorno da imagem é um `<path>` SVG animado com `strokeDashoffset`, fazendo a linha crescer do ponto A ao B enquanto uma caneta segue a ponta do traço.

**Stack da solução:**
- `imagetracerjs` — converte raster (PNG/JPEG) → SVG paths no browser
- `@remotion/paths` — anima os paths de forma determinística no Remotion
- Web Worker existente — roda a vetorização fora da main thread

**Esforço estimado:** 7-10 dias úteis (após spike de validação visual de 4-6h)

---

## 2. O Problema — Como funciona hoje

### 2.1. Arquitetura atual (revelação por máscara)

O pipeline atual está em `src/features/speed-paint/lib/imageProcessing.ts` e `src/features/video-render/lib/speedPaintRenderer.ts`:

```
Upload PNG/JPEG
     ↓
Canvas.getImageData()          ← extrai pixels
     ↓
Edge Detection (diff > 20)     ← encontra bordas
     ↓
BFS Clustering                 ← agrupa bordas conectadas
     ↓
Greedy Tracing                 ← constrói paths pixel-a-pixel
     ↓
Vetorização aproximada         ← Strokes: {points, lineWidth, r/g/b}
     ↓
RENDER (speedPaintRenderer.ts):
  1. Desenha imagem ORIGINAL no canvas          ← já pronta!
  2. Cria BUFFER BRANCO por cima                ← esconde tudo
  3. Sketch strokes: source-over (traça por cima do branco)
  4. Reveal strokes: destination-out (apaga o branco)
  5. Resultado: imagem aparece por baixo da raspadinha
```

### 2.2. Por que não convence

| Problema | Causa técnica |
|---|---|
| O lápis não segue as linhas reais do desenho | Edge detection é aproximação imperfeita dos pixels |
| Fase de "reveal" parece raspadinha | `destination-out` apaga o branco com pinceladas genéricas aleatórias |
| A imagem parece "revelada", não "desenhada" | A imagem está pronta desde o frame 0, só está escondida |
| Sem sensação de traço contínuo A→B | Strokes são segmentos isolados, não paths contínuos |

### 2.3. Evidência no código

`speedPaintRenderer.ts`, função `renderSpeedPaintFrame()` (linhas 121-202):
- Linha 135: `ctx.drawImage(imageElement, 0, 0)` — imagem original desenhada primeiro
- Linha 145: `bCtx.fillRect(0, 0, canvasWidth, canvasHeight)` — branco cobre tudo
- Linha 172: `bCtx.globalCompositeOperation = stroke.type === 'sketch' ? 'source-over' : 'destination-out'` — alternância entre desenhar e apagar

**É literalmente uma raspadinha.** Confirmado pela leitura do código.

---

## 3. A Referência — O que queremos alcançar

### 3.1. Whiteboard Animation real

O efeito visto em ferramentas profissionais (VideoScribe, Doodly, Explaindio) e no vídeo de referência do YouTube:

```
1. Tela branca vazia
2. Caneta aparece no ponto A
3. Linha cresce do A ao B seguindo o contorno real da forma
4. Caneta segue a ponta da linha perfeitamente
5. Quando a linha termina, a forma está completamente desenhada
6. Próximo path começa (outra parte do desenho)
```

### 3.2. Características visuais essenciais

| Característica | Como se consegue |
|---|---|
| Linha cresce progressivamente | `strokeDasharray` + `strokeDashoffset` animados |
| Caneta segue a ponta do traço | `getPointAtLength(currentLength)` → `transform: translate(x, y)` |
| Traço contínuo, não segmentos | SVG `<path>` com `d="M... L... C..."` |
| Ordem de desenho lógica | Animar paths em sequência (top-to-bottom, left-to-right) |

---

## 4. Pesquisa Técnica — O que descobrimos

Consultamos 3 notebooks (Remotion, Motion, TailwindCSS) e pesquisamos 2 bibliotecas (`@remotion/paths` e `imagetracerjs`).

### 4.1. Remotion + `@remotion/paths` ✅

**Status:** Pacote oficial, já instalado no projeto (v4.0.448).

**Funções-chave para whiteboard animation:**

| Função | Propósito | Por que importa |
|---|---|---|
| `getLength(pathData)` | Comprimento total do path (síncrono, estático) | Não precisa de `ref` nem DOM — evita flickering |
| `getPointAtLength(pathData, length)` | Coordenadas `{x, y}` num ponto do path | Posicionar a caneta na ponta exata do traço |
| `evolvePath(progress, path1, path2)` | Recorta fisicamente o path pelo progresso 0-1 | Escape para paths complexos com bugs de `strokeDashoffset` |
| `cutPath(pathData, length)` | Corta o path num comprimento específico | Dividir um path grande em segmentos |
| `interpolatePath(path1, path2, progress)` | Interpola (morph) entre dois paths | Transições suaves entre cenas |
| `reversePath(pathData)` | Inverte a direção do path | Controlar ordem de desenho |

**Aviso crítico do notebook:** NÃO usar `ref.current.getTotalLength()` no Remotion — causa atraso de 1 frame e flickering na exportação. Sempre `getLength()` do `@remotion/paths`.

**API completa:** 20 funções para manipulação vetorial, 5 tipos, 1 interface.

### 4.2. Motion (ex-Framer Motion) ❌

**Status:** Já é dependência do projeto, mas **não deve ser usado neste componente.**

**Por que não:**
- Motion é orientado a **tempo real** (animation pipeline nativo do browser)
- Remotion exige **determinismo por frame** (cada frame renderiza idêntico sempre)
- Motion tem `pathLength` (0-1) que é conveniente, mas não é determinístico para exportação
- Forçar `.set()` num `MotionValue` baseado em `useCurrentFrame()` funciona tecnicamente, mas é má prática documentada

**Veredito do notebook:** *"Para vídeos determinísticos, deixe o Motion de lado neste componente específico."*

### 4.3. TailwindCSS ➖ Irrelevante

**Status:** O Script Master usa **MUI v9, não Tailwind**. Mas a pesquisa confirmou o padrão correto:

- Para valores dinâmicos frame-a-frame, **CSS inline é o caminho** (não classes dinâmicas)
- `strokeDashoffset` e `strokeDasharray` não têm utilitários nativos no Tailwind
- Estilos estáticos do SVG (`stroke-black`, `fill-transparent`) poderiam usar classes, mas no nosso caso usamos MUI

**Confirmação:** CSS inline com `style={{ strokeDashoffset }}` já é o padrão do Remotion no projeto.

### 4.4. `imagetracerjs` ✅ (a peça que faltava)

**Status:** Biblioteca externa, precisa instalar.

**O que é:** Simple raster image tracer and vectorizer em JavaScript puro.

| Dado | Valor |
|---|---|
| Versão | 1.2.6 |
| Última publicação | 2018 (há 6 anos — estável, não morta) |
| Downloads semanais | 65.153 |
| Estrelas GitHub | 1.5k |
| Dependências | Zero |
| Licença | Unlicense (domínio público) |
| Tamanho | ~281 KB |
| Tipos TypeScript | Não nativos — criar `declarations.d.ts` |

**API que importa:**

```typescript
// Síncrono, browser + Node.js — PERFEITO para Web Worker
ImageTracer.imagedataToSVG(imageData, options): string
// Retorna: '<svg><path d="M 10 10 L 90 90..." fill="#222"/></svg>'

// Alternativa: dados estruturados em vez de string
ImageTracer.imagedataToTracedata(imageData, options): Tracedata
```

**16 presets de estilo:**
`'default'`, `'posterized1'`, `'posterized2'`, `'posterized3'`, `'curvy'`, `'sharp'`, `'detailed'`, `'smoothed'`, `'grayscale'`, `'fixedpalette'`, `'randomsampling1'`, `'randomsampling2'`, `'artistic1'`, `'artistic2'`, `'artistic3'`, `'artistic4'`

**Por que resolve o GAP:**
1. Recebe `ImageData` — que **já extraímos** no Worker atual
2. Retorna SVG string — que o `@remotion/paths` consegue animar
3. Roda no browser de forma síncrona — pode ir no Web Worker
4. Zero dependências — não infla o bundle
5. Licença pública — sem restrições comerciais

---

## 5. A Solução — Arquitetura completa

### 5.1. Fluxo de dados (novo)

```
Upload PNG/JPEG ou Gemini gera imagem
        ↓
Canvas.getImageData()                          ← JÁ EXISTE
        ↓
imagetracerjs.imagedataToSVG(imageData, preset)  ← NOVO
        ↓
Parse SVG string → extrai paths individuais
        ↓
Para cada path:
  @remotion/paths.getLength(path)              ← comprimento total
  @remotion/paths.getPointAtLength(path, len)  ← posição da caneta
        ↓
Render no Remotion:
  <svg>
    <path
      d={path}
      strokeDasharray={totalLength}
      strokeDashoffset={totalLength - currentLength}  ← animação
    />
  </svg>
  <img
    src="/hand-pencil.png"
    style={{ transform: `translate(${x}px, ${y}px)` }}  ← caneta segue
  />
        ↓
Exportação via renderMediaOnWeb (já existe)
```

### 5.2. Comparação: antes vs depois

| Aspecto | Hoje (máscara) | Depois (vetorial) |
|---|---|---|
| Imagem no frame 0 | Completa, escondida sob branco | Vazia (só canvas branco) |
| Como aparece | Branco é riscado/apagado | Linha cresce do A ao B |
| Lápis segue | Bordas aproximadas (edge detection) | Contorno real (path vetorial) |
| Reveal secundário | Pinceladas aleatórias destination-out | Não existe — só desenho |
| Resultado visual | Raspadinha | Desenho à mão livre |
| Biblioteca core | Edge detection própria | `imagetracerjs` + `@remotion/paths` |

### 5.3. Padrão técnico de referência

Componente Remotion idiomático para whiteboard animation:

```tsx
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { getLength, getPointAtLength } from '@remotion/paths';

interface WhiteboardSceneProps {
  paths: string[];           // array de path data: ["M 10 10 L 90 90", ...]
  durationInFrames: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const WhiteboardScene = ({
  paths,
  durationInFrames,
  canvasWidth,
  canvasHeight,
}: WhiteboardSceneProps) => {
  const frame = useCurrentFrame();

  // 1. Calcular comprimento total de todos os paths (síncrono, estático)
  const pathLengths = paths.map(p => getLength(p));
  const totalDrawingLength = pathLengths.reduce((a, b) => a + b, 0);

  // 2. Qual comprimento já foi desenhado neste frame?
  const drawnLength = interpolate(
    frame,
    [0, durationInFrames],
    [0, totalDrawingLength],
    { extrapolateRight: 'clamp' }
  );

  // 3. Determinar quais paths estão completos, parciais ou não começados
  let accumulatedLength = 0;
  const renderedPaths = paths.map((pathData, i) => {
    const pathLen = pathLengths[i];
    const pathStart = accumulatedLength;
    const pathEnd = accumulatedLength + pathLen;
    accumulatedLength = pathEnd;

    if (drawnLength <= pathStart) {
      // Path ainda não começou
      return { pathData, visibleLength: 0, pathLen };
    }
    if (drawnLength >= pathEnd) {
      // Path completo
      return { pathData, visibleLength: pathLen, pathLen };
    }
    // Path parcial — em progresso
    return { pathData, visibleLength: drawnLength - pathStart, pathLen };
  });

  // 4. Posição da caneta: ponta do path parcial (ou fim do último completo)
  const activePath = renderedPaths.find(p => p.visibleLength > 0 && p.visibleLength < p.pathLen);
  let penX = 0, penY = 0;
  if (activePath) {
    const point = getPointAtLength(activePath.pathData, activePath.visibleLength);
    penX = point.x;
    penY = point.y;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#fff' }}>
      <svg
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      >
        {renderedPaths.map(({ pathData, visibleLength, pathLen }, i) => {
          if (visibleLength === 0) return null;
          return (
            <path
              key={i}
              d={pathData}
              fill="none"
              stroke="#222"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathLen}
              strokeDashoffset={pathLen - visibleLength}
            />
          );
        })}
      </svg>

      {/* Caneta seguindo a ponta do traço ativo */}
      {activePath && (
        <img
          src="/hand-pencil.png"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${penX}px, ${penY}px)`,
            transformOrigin: 'bottom center',
            pointerEvents: 'none',
          }}
        />
      )}
    </AbsoluteFill>
  );
};
```

**Por que é determinístico e sincronizado:**
- `drawnLength` deriva de `useCurrentFrame()` — mesmo valor sempre
- `strokeDashoffset` e posição da caneta derivam do mesmo `drawnLength`
- Sem estado, sem effects, sem DOM refs — tudo matemática pura

---

## 6. Plano de Implementação

### Fase 0: Spike Experimental (4-6 horas) — OBRIGATÓRIO

**Objetivo:** Validar visualmente se o resultado é convincente antes de comprometer com a reformulação.

**Passos:**
1. Instalar `imagetracerjs` no projeto
2. Criar `declarations.d.ts` com tipos básicos
3. Pegar 3 imagens de teste:
   - 1 imagem gerada pelo Gemini (flat design, típica do Script Master)
   - 1 logo simples (line art puro)
   - 1 foto realista (pior caso)
4. Vetorizar cada uma com 3 presets: `'artistic1'`, `'detailed'`, `'posterized2'`
5. Animar com `@remotion/paths` numa composição Remotion de teste
6. Renderizar vídeo de 5 segundos para cada combinação
7. **Critério de aceite:** Matheus julga visualmente se o resultado parece "desenho à mão"

**Output do spike:**
- 9 vídeos de teste (3 imagens × 3 presets)
- Decisão: GO / NO-GO
- Se GO: qual preset usar como default

### Fase 1: Fundação (2 dias)

**Objetivo:** Tipos, store e infraestrutura sem mudar comportamento visual.

**Tarefas:**
1. Instalar `imagetracerjs` como dependência
2. Criar `src/features/speed-paint/types/vetorial.ts`:
   ```typescript
   export interface VetorialPath {
     d: string;                    // path data: "M 10 10 L 90 90..."
     length: number;               // comprimento pré-calculado
     color: string;                // cor do traço
     strokeWidth: number;
   }

   export interface VetorialAnimation {
     id: string;
     canvasWidth: number;
     canvasHeight: number;
     paths: VetorialPath[];
     totalLength: number;          // soma de todos os paths
     fps: number;
     resizedImage: string;         // mantém para fallback/comparação
     sourcePreset: string;         // qual preset gerou ("artistic1")
   }
   ```
3. Criar `src/features/speed-paint/lib/vectorizer.ts`:
   - Wrapper assíncrono em torno de `imagetracerjs.imagedataToSVG()`
   - Parsing do SVG string → `VetorialPath[]`
   - Filtro de paths muito pequenos (`pathomit`)
4. Criar `declarations.d.ts` para `imagetracerjs`
5. Adicionar campo `renderMode: 'mask' | 'vetorial'` na store (default: `'mask'`)
6. Manter 100% do comportamento atual funcionando (feature flag)

### Fase 2: Vetorização no Worker (2 dias)

**Objetivo:** Substituir edge detection por vetorização real, dentro do Worker existente.

**Tarefas:**
1. Modificar `imageProcessing.ts`:
   - Quando `renderMode === 'vetorial'`: chamar `vectorizer.ts`
   - Quando `renderMode === 'mask'`: manter código atual (fallback)
2. Adaptar o Web Worker para importar `imagetracerjs`
3. Pré-calcular `getLength()` de cada path durante a vetorização (não no render)
4. Atualizar `strokeCache.ts` para cachear `VetorialAnimation` além de `StrokeAnimation`
5. Testes unitários do vectorizer

### Fase 3: Composição Remotion Vetorial (2 dias)

**Objetivo:** Novo componente `WhiteboardScene` que renderiza paths animados.

**Tarefas:**
1. Criar `src/features/video-render/components/WhiteboardScene.tsx` (baseado no código de referência da seção 5.3)
2. Criar `WhiteboardComposition.tsx` (wrapper para o SpeedPaintComposition atual)
3. Integrar com `speedPaintRenderController.tsx` — nova compocisão lazy quando `renderMode === 'vetorial'`
4. Sprite da caneta/mão — reutilizar o `drawTool()` atual ou criar versão SVG
5. Testes de renderização (comparar frames em snapshots)

### Fase 4: UI e Integração (1 dia)

**Objetivo:** Usuário consegue escolher o modo de renderização.

**Tarefas:**
1. Adicionar seletor no `SpeedPaintPage.tsx`:
   - "Modo Clássico" (máscara — atual)
   - "Modo Desenho" (vetorial — novo) ← default após validação
2. Persistir preferência na store (como já faz com `canvasColor`)
3. i18n: 4 chaves × 3 locales = 12 traduções
4. Analytics: evento `speed_paint_mode_changed`

### Fase 5: Validação e Polish (1-2 dias)

**Tarefas:**
1. Testar com 10 imagens diversas (geradas pelo Gemini, logos, fotos)
2. Otimizar preset default baseado nos resultados
3. Performance: vetorizar imagens 1920×1080 sem travar a UI
4. Edge cases: imagens transparentes, muito escuras, muito claras
5. Code review com `code-validator` e `gap-finder`

---

## 7. Arquivos Impactados

### Arquivos novos (criar)

| Arquivo | Propósito |
|---|---|
| `src/features/speed-paint/types/vetorial.ts` | Tipos `VetorialPath`, `VetorialAnimation` |
| `src/features/speed-paint/lib/vectorizer.ts` | Wrapper do `imagetracerjs` + parser SVG |
| `src/features/video-render/components/WhiteboardScene.tsx` | Composição Remotion vetorial |
| `src/features/video-render/components/WhiteboardComposition.tsx` | Wrapper para exportação |
| `src/types/imagetracerjs.d.ts` | Declarações de tipo da lib |
| `src/assets/speed-paint/hand-pencil.svg` | Sprite da mão/caneta (SVG) |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/features/speed-paint/lib/imageProcessing.ts` | Adicionar branch `renderMode === 'vetorial'` |
| `src/features/speed-paint/store/animationStore.ts` | Adicionar `renderMode`, `vetorialPreset` |
| `src/features/speed-paint/types.ts` | Estender com tipos vetoriais |
| `src/features/speed-paint/lib/strokeCache.ts` | Suportar `VetorialAnimation` |
| `src/features/video-render/lib/speedPaintRenderer.ts` | Branch para composição vetorial |
| `src/features/video-render/controllers/speedPaintRenderController.tsx` | Nova composição lazy |
| `src/pages/SpeedPaintPage.tsx` | Seletor de modo |
| `package.json` | Adicionar `imagetracerjs` |
| `src/locales/{pt-BR,en,es}/speedPaint.json` | 4 chaves novas cada |

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `imagetracerjs` gera SVG feio para fotos | Alta | Alto | Spike experimental valida antes. Photos não são o caso de uso principal — Script Master gera flat design |
| Biblioteca sem update há 6 anos | Baixa | Médio | Código é pequeno e estável. Fork é viável se necessário |
| SVG com muitos paths trava o Remotion | Média | Alto | `pathomit` e `numberofcolors` controlam complexidade. Limite máximo de paths por cena |
| Performance da vetorização em imagens 4K | Média | Médio | Redimensionar para 1920×1080 antes (já fazemos). Worker mantém UI fluida |
| Tipos TypeScript inexistentes | Baixa | Baixo | `declarations.d.ts` simples resolve |
| Usuários com projetos antigos (formato mask) | Baixa | Baixo | `renderMode` com default `'mask'` preserva retrocompatibilidade. Migração opcional |

---

## 9. Estimativa Consolidada

| Fase | Duração | Bloqueante? |
|---|---|---|
| **Fase 0:** Spike experimental | 4-6 horas | ✅ Sim — GO/NO-GO |
| **Fase 1:** Fundação (tipos, store) | 2 dias | Não |
| **Fase 2:** Vetorização no Worker | 2 dias | Não |
| **Fase 3:** Composição Remotion | 2 dias | Não |
| **Fase 4:** UI e integração | 1 dia | Não |
| **Fase 5:** Validação e polish | 1-2 dias | Não |
| **Total** | **8-11 dias úteis** | |

**Nota:** Fases 1-5 só começam se a Fase 0 (spike) retornar GO.

---

## 10. Decisões Tomadas

1. ✅ **Usar `@remotion/paths`** (oficial, já instalado) em vez de Motion ou bibliotecas externas
2. ✅ **Usar `imagetracerjs`** para vetorização raster → SVG (client-side, síncrono, zero deps)
3. ❌ **Não usar Motion (Framer Motion)** neste componente — não é determinístico para Remotion
4. ➖ **TailwindCSS irrelevante** — projeto usa MUI v9; CSS inline é o padrão para valores dinâmicos
5. ✅ **Manter modo máscara como fallback** via `renderMode` feature flag — não quebrar projetos existentes
6. ✅ **Web Worker para vetorização** — reaproveita infraestrutura existente, não trava a UI
7. ⏳ **Preset default** — a definir no spike experimental (candidatos: `'artistic1'`, `'detailed'`, `'posterized2'`)

---

## 11. Relação com Outras Ideias

### Ideia anterior: "Superfícies + Estilos de Mão"

Documento: `docs/ideia-superficies-estilos-mao-speed-paint-2026-06-14.md`

**Status:** Adiar até depois desta reformulação.

**Justificativa:** Adicionar textura de lousa verde ou estilo de pincel é **cosmético**. Não disfarça que o efeito de animação em si não convence (raspadinha). Faz mais sentido investir primeiro na mudança fundamental (vetorial) e depois adicionar variações cosméticas sobre o novo base sólida.

**Sequência recomendada:**
1. ✅ Este plano (vetorização) → resolve o core do problema
2. ⏳ Depois: superfícies + estilos de mão → adiciona variedade sobre a base nova

---

## 12. Próximos Passos

1. ✅ ~~Criar este documento~~ (feito)
2. 🎯 **Executar spike experimental (Fase 0)** — validar visualmente
3. 📊 Revisar resultados do spike com Matheus — decisão GO/NO-GO
4. 🔧 Se GO: iniciar Fase 1 (Fundação)
5. 📝 Atualizar `AGENTS.md` e `CLAUDE.md` na versão `0.131.0`

---

## Apêndice A: Referências

- **Pacote `@remotion/paths`:** https://www.remotion.dev/docs/paths
- **Pacote `imagetracerjs`:** https://github.com/jankovicsandras/imagetracerjs
- **Opções do imagetracerjs:** https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md
- **Galeria de presets:** https://github.com/jankovicsandras/imagetracerjs/blob/master/docimages/option_presets_small.png
- **Vídeo de referência:** "Mastering Your Finances: A Comprehensive Guide to Money Management #whiteboard"
- **Notebooks consultados:** Remotion Docs, Motion Guide, TailwindCSS Docs

## Apêndice B: Código de Referência do Worker Atual

Para contexto, o Worker atual em `imageProcessing.ts` já faz:
- Extração de `ImageData` via `canvas.getImageData()`
- Processamento em Web Worker inline via Blob URL
- PostMessage com resultado estruturado
- Fallback para main thread se Worker falhar

A vetorização com `imagetracerjs` pode **substituir** as funções `processSketch()` e `processReveal()` (linhas 26-249 do `imageProcessing.ts`) por uma única chamada a `ImageTracer.imagedataToSVG()`, que é mais sofisticada e testada que o edge detection próprio.
