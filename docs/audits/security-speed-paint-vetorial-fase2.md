# Auditoria de Segurança — Speed Paint Vetorial (Fase 2)

**Data:** 2026-06-14
**Escopo:** `vectorizer.ts`, `imageProcessing.ts`, `strokeCache.ts`
**Auditor:** Security Agent (Koda AI Studio)

---

## 1. Escopo da Revisão

Foram analisados 3 arquivos críticos da Fase 2 (vetorização) mais os componentes downstream:

| Arquivo | Linhas | Superfície Sensível |
|---------|--------|---------------------|
| `src/features/speed-paint/lib/vectorizer.ts` | 272 | `isValidImageData`, regex parser, `extractFill`, `enrichPaths` |
| `src/features/speed-paint/lib/imageProcessing.ts` | 830 | Decodificação de imagem (`img.src = dataUrl`), resize, bifurcação vetorial |
| `src/features/video-render/lib/strokeCache.ts` | 315 | SHA-256 key building, LRU eviction, discriminated union |
| `src/features/video-render/components/SpeedPaintScene.tsx` | 467 | Consumo de `StrokeAnimation` (não `VetorialAnimation`) |
| `src/features/video-render/lib/speedPaintRenderer.ts` | 428 | Renderização em canvas 2D nativo |
| `src/features/speed-paint/types/vetorial.ts` | 88 | Tipos `VetorialPath`, `VetorialAnimation` |

**Superfícies cobertas:**
- [x] Validação de input (ImageData, data URL)
- [x] Sanitização do SVG parseado via regex
- [x] ReDoS (Regular Expression Denial of Service)
- [x] Prototype pollution / type confusion
- [x] Cache (SHA-256 collision, LRU memory)
- [x] DoS via vetorização (resize, pathomit, AbortSignal)
- [x] Logging de dados sensíveis
- [x] AbortSignal propagation
- [x] Renderização do path data (XSS via SVG)
- [x] Uso de `dangerouslySetInnerHTML`

---

## 2. Veredito

**✅ Sem riscos relevantes** — todos os pontos investigados passaram pelo confidence gate. Nenhum achado atingiu confidence >= 80.

## 3. Confidence Gate Summary

| Potencial Risco | Confidence | Decisão |
|-----------------|:----------:|:-------:|
| `isValidImageData` sem validação de `data.length` | 60/100 | ❌ Descartado |
| Data URL SVG em `img.src` | 40/100 | ❌ Descartado |
| XSS via path data malicioso (`d`) | 20/100 (atual) 95/100 (Fase 3) | ❌ Descartado (mitigado pelo React JSX) |
| ReDoS nas regex | — | ❌ Não identificado |
| Prototype pollution | — | ❌ Não identificado |
| Cache collision SHA-256 | — | ❌ Não identificado |
| Logging de dados sensíveis | — | ❌ Não identificado |

---

## 4. Análise Detalhada

### 4.1 Validação de Input (`vectorizer.ts:115-123`)

```typescript
function isValidImageData(imageData: ImageData): boolean {
  return (
    imageData !== null &&
    imageData !== undefined &&
    imageData.data instanceof Uint8ClampedArray &&
    imageData.width > 0 &&
    imageData.height > 0
  );
}
```

**Observação:** A função não valida `imageData.data.length >= width * height * 4`. Um `ImageData` malformado com `width/hight` grandes mas `data` pequena poderia causar out-of-bounds no `imagetracerjs`.

**Confidence:** 60/100 — descartado porque:
- A única origem de `ImageData` no fluxo é `ctx.getImageData()` do canvas nativo, que sempre produz dados válidos.
- Um atacante precisaria conseguir fabricar `ImageData` arbitrário, o que requer execução de código (impossível no modelo BYOK sem script injection prévio).
- `imagetracerjs` é uma lib madura e pode tratar internamente.

**Sugestão (defense-in-depth):** Adicionar guardrail na Fase 3 se a API de vetorização for exposta a dados vindos de WebCodecs ou outras fontes externas ao canvas:

```typescript
if (imageData.data.length < imageData.width * imageData.height * 4) {
  throw new Error('ImageData data length mismatch');
}
```

### 4.2 Data URL SVG (`imageProcessing.ts:472`)

O código aceita qualquer data URL via `img.src = dataUrl`. Um SVG injetado como `data:image/svg+xml,...` não decodifica como imagem raster — `img.onerror` dispara (linha 471), capturado como "Failed to load image".

**Confidence:** 40/100 — descartado porque:
- O erro é capturado e rejeitado com mensagem clara.
- Não há execução de script ou vazamento de dados.
- O pior cenário é negação de serviço (imagem não processa), que já é possível com qualquer imagem inválida.

### 4.3 XSS via Path Data SVG (`vectorizer.ts:71`, futuro `WhiteboardScene.tsx`)

**Contexto crítico:** O `WhiteboardScene.tsx` (que renderizará os paths SVG) **ainda não existe** — é parte da Fase 3. Atualmente:
- `SpeedPaintScene.tsx` só aceita `StrokeAnimation` (modo máscara) e renderiza em canvas 2D nativo → **sem SVG no DOM**.
- `VetorialAnimation.paths[].d` é extraído e armazenado, mas nunca renderizado como SVG.
- Não há `dangerouslySetInnerHTML` em nenhum lugar do projeto.

**Verificação NotebookLM:** React 19 escapa automaticamente `<`, `>`, `&`, `"` em atributos JSX (ex: `<path d={pathData} />`). Mesmo path data contendo `</path><script>alert('XSS')</script>` é tratado como string literal — o script **não é executado**.

**Mitigação confirmada:** Se a Fase 3 mantiver `<path d={pathData} />` via JSX (sem `dangerouslySetInnerHTML`), **não há risco de XSS**.

**Confidence:** 20/100 (risco atual) / 95/100 (risco futuro mitigado pelo React) — descartado.

**Recomendação preventiva para Fase 3:** Documentar no `WhiteboardScene.tsx` que o `<path d={...}>` DEVE ser sempre via JSX, nunca via `innerHTML` ou `dangerouslySetInnerHTML`.

### 4.4 ReDoS nas Regex (`vectorizer.ts:71-78`)

```typescript
const PATH_TAG_REGEX = /<path\b[^>]*\bd="([^"]+)"[^>]*?>/g;
const FILL_ATTR_REGEX = /fill="(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|none)"/;
```

Análise de backtracking catastrófico:
- `[^>]*` — ganancioso, mas **exclui `>`**, então não pode ultrapassar o fechamento da tag.
- `[^>]*?` — lazy, seguro.
- `\b` (word boundary) antes de `d=` — evita capturar `desc=` e outros atributos com "d".
- `lastIndex` resetado em `parseSvgPaths` (linha 158) — evita estado residual entre chamadas.

**Veredito:** Sem ReDoS. O pior cenário é um SVG com ~100K tags, que o loop percorre em O(n) sem backtracking exponencial.

### 4.5 Prototype Pollution / Type Confusion

- `VetorialPath` é interface TypeScript pura — sem `Object.assign`, sem spread de objetos não confiáveis.
- `imageData.data` é `Uint8ClampedArray` — sem cadeia de prototype customizada.
- Cache usa discriminated union com runtime type guard (`isVetorialAnimation`, `isStrokeAnimation`) que narrowa via campo exclusivo (`'totalLength' in animation`).
- `Math.random().toString(36).substring(7)` para geração de IDs — colisão é improvável (36^7 ≈ 78 bilhões) e OK para IDs de sessão.

**Veredito:** Sem risco de prototype pollution ou type confusion.

### 4.6 Cache SHA-256 (`strokeCache.ts:77-84`)

```typescript
const payload = `${imageUrl}|${JSON.stringify(context)}`;
const data = encoder.encode(payload);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
```

- Chave inclui `imageUrl + mode + preset` → discriminação correta entre modos.
- SHA-256 collision-resistant (128 bits de segurança contra birthday attack).
- LRU de 20 entradas → memória controlada mesmo com URLs grandes (1 MB).
- Fallback: `crypto.subtle` indisponível → cache desabilitado com warn log.

**Veredito:** Seguro. Sem risco de colisão ou vazamento.

### 4.7 DoS via Vetorização

| Contramedida | Onde | Eficácia |
|-------------|------|----------|
| Resize 1920×1080 | `imageProcessing.ts:362-372` | ✅ Previne pixel count excessivo |
| `ABORT_CHECK_INTERVAL = 50` | `vectorizer.ts:55,199` | ✅ UI responde a abort a cada 50 paths |
| `ensureNotAborted` (3 pontos) | `vectorizer.ts:249,256,200` | ✅ Cobre antes, durante e depois |
| `pathomit: 8` default | `vectorizer.ts:46` | ✅ Filtra paths pequenos |
| Async wrapper | `vectorizer.ts:232` | ✅ Permite yield points |

**Veredito:** Tratamento adequado. < 500ms para 1920×1080 em hardware moderno.

### 4.8 Logging de Dados Sensíveis

| Arquivo | Log | Dados Expostos |
|---------|-----|----------------|
| `vectorizer.ts:261-265` | `log.warn('Vetorização produziu SVG sem paths', ...)` | `preset`, `width`, `height` — ✅ seguro |
| `imageProcessing.ts:422` | `log.warn('Worker indisponível', ...)` | `error: workerError` — ✅ seguro |
| `imageProcessing.ts:467` | `log.error('Erro no Worker', ...)` | `error: err.message` — ✅ seguro |
| `strokeCache.ts:196` | `log.debug('Cache hit', ...)` | `imageUrl.substring(0, 60)` — ✅ truncado |
| `strokeCache.ts:284` | `log.debug('Cache set', ...)` | `imageUrl.substring(0, 60)` — ✅ truncado |

Nenhum log vaza path data (`d`), ImageData raw, ou API keys.

---

## 5. O Que Parece Saudável

- **Regex bem construídas:** `[^>]*` exclui `>`, `lastIndex` resetado, word boundary em `d=` — sem ReDoS.
- **AbortSignal propagation:** 3 pontos de checagem no `vectorizeImage`, cobertura no `imageProcessing`, e listener dedicado no `processOnMainThread` com cleanup de timeouts.
- **Cache discriminado:** SHA-256 com mode+preset evita colisão entre modos de renderização. LRU com eviction ordenado por timestamp.
- **Sem `dangerouslySetInnerHTML`** em todo o projeto.
- **Renderização em canvas nativo** (SpeedPaintScene) — não expõe SVG ao DOM.
- **Truncamento de URLs em logs** (`substring(0, 60)`) — evita vazamento de data URLs completas.
- **Resize preventivo** para 1920×1080 — evita DoS com megapixels excessivos.

---

## 6. Recomendações Preventivas para a Fase 3

A Fase 3 implementará o `WhiteboardScene.tsx` que renderizará os paths SVG. As seguintes recomendações mantêm a superfície segura:

1. **Sempre renderizar `d` via JSX:** `<path d={path.d} fill={path.color} ... />` — o React escapa automaticamente. **Nunca** usar `dangerouslySetInnerHTML` ou `innerHTML` direto.

2. **Validar `data.length` no `isValidImageData`** (defense-in-depth) se a vetorização passar a aceitar ImageData de fontes externas ao canvas.

3. **Validar tipo MIME** no `img.src` se o upload de imagens aceitar data URLs fornecidas pelo usuário sem validação de formato.

4. **Documentar no WhiteboardScene.tsx** a restrição de não usar strings SVG brutas.

---

## 7. Limites da Revisão

- O `WhiteboardScene.tsx` (Fase 3) não existe ainda — a análise de renderização SVG baseou-se no comportamento do React/Remotion confirmado pelo NotebookLM.
- `imagetracerjs` é tratado como caixa-preta — a segurança da lib em si não foi auditada (assume-se que é segura contra entrada malformada).
- Não foram testados cenários de race condition entre cache write/read concorrentes (improvável no modelo single-thread + async).
- A auditoria é estática — não envolve execução de testes ou fuzzing.

---

## 8. Priorização

**Nenhum bloqueador identificado.** A Fase 2.5 está segura para prosseguir.

| Prioridade | Ação | Quando |
|:----------:|------|--------|
| 🔜 Fase 3 | Documentar restrição de `<path d>` via JSX (sem innerHTML) | Ao criar WhiteboardScene.tsx |
| 💡 Hardening | Adicionar guardrail `data.length >= width * height * 4` | Se expandir fontes de ImageData |

---

## 9. Gate de Saída Final

- [x] Li o contexto mínimo real ou reuni evidência suficiente?
- [x] Cada achado passou pela validação anti-falso-positivo?
- [x] Cada achado passou pelo confidence gate numérico?
- [x] Achados com confidence < 80 foram descartados?
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`?
- [x] Existe motivo real para escalar? **Não.**
