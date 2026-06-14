# Ideia: Superfícies e Estilos de Mão no Speed Paint

**Data:** 2026-06-14
**Status:** 💡 Proposta — aguardando aprovação
**Origem:** Análise comparativa com 10 ferramentas de whiteboard animation (Powtoon, Doodly, Instadoodle, Canva, Videoscribe, Explaindio, Mango Animate, Animaker, Easy Sketch Pro, Vyond)
**Prioridade proposta:** #2 (Alto impacto / Baixo esforço)

---

## 1. Contexto

Hoje o Speed Paint do Script Master oferece apenas **2 superfícies** (branca/preta) e **1 estilo de mão** (genérica, sem diferenciação visual). Isso limita a diversidade estética do vídeo final e o diferencia pouco de outras ferramentas.

A maioria das ferramentas pagas concorrentes investe pesado nesse eixo visual — Doodly oferece 4 superfícies, Videoscribe tem 100+ estilos de mão, Explaindio tem múltiplas mãos e pincéis. É o que mais gera "uau" no usuário com pouco código.

---

## 2. O que muda

### 2.1. Superfícies (onde o desenho aparece)

| Superfície | Visual | Caso de uso | Dificuldade |
|---|---|---|---|
| **Branca** (atual) | Folha branca lisa | Padrão, clean, profissional | — |
| **Preta** (atual) | Quadro negro | Tom sério, sombrio | — |
| **Verde** (novo) | Lousa escolar com textura | Educacional, didático, infantil | Baixa |
| **Vidro** (novo) | Translúcido com reflexo sutil | Tech, moderno, minimalista | Média |
| **Pautada** (novo) | Papel de caderno com linhas | Diário, storytelling pessoal | Baixa |

**Implementação técnica:** camada de textura SVG/PNG no canvas + filtro CSS sutil (opacidade, blend mode).

### 2.2. Estilos de mão (quem desenha)

| Estilo | Visual | Tom | Dificuldade |
|---|---|---|---|
| **Lápis** (atual) | Traço fino preto (cor fixa 40,40,40) | Simples, universal | — |
| **Caneta** (novo) | Traço firme colorido (azul/preto configurável) | Profissional,商务 | Baixa |
| **Pincel** (novo) | Traço mais orgânico, lineWidth variável | Criativo, artístico | Baixa |
| **Giz** (novo) | Traço branco em fundos escuros, granulado | Lousa, escola | Média |

**Implementação técnica:** sprite/ícone SVG da mão + ajuste de `lineWidth`, cor (r/g/b/alpha) e textura nos strokes gerados pelo `imageProcessing.ts`.

### 2.3. Combinações esperadas

| Combinação | Resultado visual |
|---|---|
| Lousa verde + Giz | Aulas de escola, conteúdo didático |
| Vidro + Caneta azul | Tech explainer, SaaS |
| Caderno pautado + Lápis | Storytelling, vlog, diário |
| Branca + Caneta | Apresentação executiva |

---

## 3. Arquivos que provavelmente mudam

### 3.1. Backend / Geração de strokes

- **`src/features/speed-paint/lib/imageProcessing.ts`**
  - Worker passa a aceitar `handStyle: HandStyle` e `canvasColor` não é mais só 'white' | 'black' — vira `CanvasSurface`.
  - Strokes ganham cor derivada do `handStyle` (lápis = preto, giz = branco, etc.).
  - `lineWidth` base e variação (`dynamicWidth`) mudam por estilo.

- **`src/features/speed-paint/types.ts`**
  - Tipo `CanvasSurface = 'white' | 'black' | 'green' | 'glass' | 'lined'`
  - Tipo `HandStyle = 'pencil' | 'pen' | 'brush' | 'chalk'`
  - `StrokeAnimation.canvasColor` → `canvasSurface: CanvasSurface`
  - `StrokeAnimation` ganha `handStyle: HandStyle`

### 3.2. Store

- **`src/features/speed-paint/store/animationStore.ts`**
  - `canvasColor: 'white' | 'black'` → `canvasSurface: CanvasSurface`
  - Adiciona `handStyle: HandStyle` (default: `'pencil'`)
  - `setCanvasColor` → `setCanvasSurface`
  - `setHandStyle` (novo)

### 3.3. UI / Tela

- **`src/pages/SpeedPaintPage.tsx`**
  - Bloco "Cor do canvas" (2 botões redondo) vira seletor visual com 5 superfícies.
  - Adiciona seletor de estilo de mão (4 opções).
  - Ambos no `StackedHeader` de configuração que já existe.

- **`src/features/speed-paint/components/SpeedPaintComposition.tsx`**
  - Lê `animation.canvasSurface` e `animation.handStyle` para aplicar textura/estilo no render.

### 3.4. Assets novos

- **`src/assets/canvas-surfaces/`** (novo diretório)
  - `white.svg` (placeholder, fundo branco liso)
  - `black.svg` (textura de quadro negro sutil)
  - `green.svg` (textura de lousa verde)
  - `glass.svg` (overlay translúcido com reflexo)
  - `lined.svg` (linhas pautadas)

- **`src/assets/hand-styles/`** (novo diretório)
  - Sprites SVG das mãos (4 estilos) + configuração de cor/tamanho

---

## 4. Impacto técnico

| Aspecto | Avaliação |
|---|---|
| **Risco de regressão** | Baixo — mudanças são aditivas, `canvasColor` vira `canvasSurface` com migração simples |
| **Compatibilidade com projetos salvos** | Média — projetos antigos no Firestore/IndexedDB com `canvasColor` precisam de migração (ler `canvasColor` como `canvasSurface` com fallback) |
| **Performance** | Sem impacto — texturas são imagens estáticas, sprites SVG são leves |
| **Bundle size** | +~30-80 KB (sprites SVG + texturas PNG/SVG) |
| **Testes** | Atualizar `imageProcessing.unit.test.ts` + adicionar testes para os 4 hand styles e 5 superfícies |
| **i18n** | 4 strings novas × 3 locales (pt-BR, en, es) = 12 chaves |

---

## 5. Estimativa de esforço

| Fase | Tempo estimado |
|---|---|
| Tipos + migração de dados legados | 0.5 dia |
| Assets (texturas + sprites) | 1 dia (design simples) |
| Worker + imageProcessing com novos estilos | 1 dia |
| UI no SpeedPaintPage (seletores) | 0.5 dia |
| Composição Remotion aplicar texturas | 0.5 dia |
| Testes | 1 dia |
| i18n (3 locales) | 0.5 dia |
| **Total** | **~5 dias úteis** |

---

## 6. Benefícios esperados

- **Visual mais profissional** com pouco código (texturas + sprites fazem 80% do trabalho)
- **Diferenciação** vs. concorrentes gratuitos (a maioria só oferece 1-2 opções)
- **Atrai novos públicos** (educadores, storytellers, tech explainers) sem mudar o core
- **Setup único** — usuário escolhe o estilo uma vez e vale para todo o vídeo (e para todos os vídeos do batch)
- **Compatível com batch** — fila inteira renderiza com o mesmo estilo visual coerente

---

## 7. Próximos passos sugeridos

1. ✅ Validar escopo e opções com Matheus (este doc)
2. 🎨 Gerar/design dos 4 sprites de mão + 3 texturas (verde, vidro, pautada) — pode usar IA de imagem (Gemini) ou desenhar simples
3. 🔧 Implementar tipagem e store primeiro (fundação)
4. 🎬 Adaptar o Worker para gerar strokes com cor/lineWidth por estilo
5. 🖼️ Adaptar composição Remotion para renderizar textura de fundo + sprite da mão
6. 🧪 Adicionar testes cobrindo combinações de estilo + superfície
7. 🌍 i18n nos 3 locales
8. 📸 Capturas de tela para documentação/blog
9. 🚀 Release como `0.131.0` (minor version — feature additive)

---

## 8. Out of scope (não fazer nesta entrega)

- ❌ Editor visual de texturas customizadas pelo usuário
- ❌ Upload de sprite de mão próprio
- ❌ Animação da própria mão (skinning de pose, lip-sync)
- ❌ Combinações avançadas (ex: mão com luva)
- ❌ Estilos 3D — só 2D, foco em velocidade de implementação

---

## 9. Referências

- Transcrição do vídeo: 10 Whiteboard Animation Softwares (YouTube)
- Doodly surfaces: white, black, glass, green board
- Videoscribe: 100+ hand styles
- Explaindio: hands, pens, eraser
- Script Master: `src/features/speed-paint/` (state of v0.130.3)
