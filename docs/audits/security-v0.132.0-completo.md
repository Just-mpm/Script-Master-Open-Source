# Auditoria de Segurança — Release 0.132.0 (Speed Paint Vetorial Completo)

**Data:** 2026-06-15
**Agente:** Security
**Plano fonte:** `docs/plan/speed-paint-vetorial-completo-plano-final.md`
**Superfície:** 12 leivas (L0–L11), 27 arquivos modificados + 2 novos

---

## Escopo da Revisão

### O que foi auditado holísticamente

- **Cache LRU com SHA-256** (`strokeCache.ts`) — chave, colisão, cache poisoning
- **Validação de entrada** (`renderMode`, `vetorialPreset`) — origem, propagação, runtime safety
- **Race condition / TOCTOU** — `processingIdRef` + `AbortController` em 5 pontos
- **XSS / Injection** — i18n (105 strings), SVG inline (`WhiteboardScene`, `Pencil`), `<Select>` com `t()`
- **DoS / Resource exhaustion** — `MAX_PATHS_PER_SCENE=500`, `MAX_CACHE_SIZE=20`, blur clamp `3px`
- **PII em logs** — data URLs, `log.error` com `err`, sanitização automática
- **Type guards** — `isVetorialAnimation`, `isStrokeAnimation` (narrowing real)
- **Module augmentation** — `AnalyticsEventMap` em `SpeedPaintPage.tsx`
- **Auth / BYOK** — nenhuma mudança (BYOK não tocado)
- **CSP / COEP** — nenhuma mudança no `vite.config.ts` (DISABLE_HMR, COEP intacto)

### Arquivos lidos por completo

| Arquivo | Linhas | Relevância |
|---------|--------|------------|
| `strokeCache.ts` | 315 | Cache key SHA-256, LRU, type guards |
| `speedPaintRenderer.ts` | 514 | Propagação renderMode/vetorialPreset |
| `vectorizer.ts` | 491 | sortPaths seed determinístico, MAX_PATHS |
| `WhiteboardScene.tsx` | 456 | SVG inline, Pencil, blur, tremor |
| `SpeedPaintPage.tsx` | 1172 | handleRenderModeChange, race protection, module augmentation |
| `imageProcessing.ts` | 830 | Branch vetorial, generateStrokesFromImage |
| `BatchOrchestrator.tsx` | 206 | Race protection, getState() |
| `speedPaintRenderController.tsx` | 1020 | renderMode no batch, composição lazy |
| `videoRenderController.tsx` | 571 | Propagação do bridge |
| `videoRenderBridge.ts` | 77 | Bridge state |
| `animationStore.ts` | ~210 | Defaults renderMode/preset |
| `logger/index.ts` | 260 | Sanitização, batch Firestore |
| `logger/sanitization.ts` | 172 | Padrões de redação |
| `vetorialPresets.ts` | 50 | Constantes, sem risco |
| i18n locales (3) | ~1430 cada | Strings de tooltips/presets |

### Comandos de verificação

- `grep -rn "dangerouslySetInnerHTML\|innerHTML\s*=" src/features/speed-paint/ src/features/video-render/ src/pages/SpeedPaintPage.tsx src/pages/VideoPage.tsx` → **0 matches no código novo** (4 matches em arquivos não modificados: `main.tsx`, `Inspector.tsx`, `DeleteAccountDialog.tsx`)
- `grep -rn "Math.random" src/features/speed-paint/ src/features/video-render/` → **Math.random no código novo: ZERO** (todos os matches são do modo mask preexistente: `imageProcessing.ts`, `strokeWorker.ts`, `speedPaintRenderer.ts`)
- `grep -rn "console.log" src/features/speed-paint/ src/features/video-render/` → **0 matches**
- `grep -rn "@ts-ignore\|@ts-expect-error\|@ts-nocheck" src/features/speed-paint/ src/features/video-render/ src/pages/SpeedPaintPage.tsx src/pages/VideoPage.tsx` → **0 matches**
- `grep -rn 'as [A-Z]' src/pages/SpeedPaintPage.tsx src/pages/VideoPage.tsx` → **0 matches no código novo**
- COEP / DISABLE_HMR: `vite.config.ts` não foi tocado nesta release. ✅

---

## Veredito

### ✅ SEGURO COM RESSALVAS

Não há vulnerabilidades críticas exploráveis nesta release. Os riscos identificados são **teóricos** (cache poisoning SHA-256) ou **baixos** (PII em logs de erro, module augmentation type-only). Todas as camadas de race protection estão corretas. TypeScript type guards são reais (sem `as` bypass). O código segue os padrões de segurança do projeto sem introduzir novas superfícies de ataque.

**3 warnings de segurança, nenhum bloqueador.**

---

## Achados Priorizados

### [WARNING] Data URLs em logs de erro podem vazar para o Firestore

- **Arquivos:** `strokeCache.ts:206`, `speedPaintRenderer.ts:396`, `SpeedPaintPage.tsx:408`, `BatchOrchestrator.tsx:131`
- **Confidence:** 85/100
- **Categoria:** PII
- **Problema:** `log.warn('Falha ao ler cache de strokes', { error: String(err) })` — quando a imagem carregada pelo usuário (data URL) causa erro de processamento, o `String(err)` pode conter fragmentos da URL. O `sanitizeMessage()` do logger remove JWT, emails e credenciais, mas **não cobre data URLs** (`data:image/png;base64,...`). Em produção, `warn`+ são enviados ao Firestore.
- **Evidência:**
  ```typescript
  // strokeCache.ts:206
  log.warn('Falha ao ler cache de strokes', { error: String(err) });

  // SpeedPaintPage.tsx:408
  log.error('Falha ao reprocessar imagem', { error: err });

  // sanitization.ts:21-30 — padrões de redação NÃO incluem data URLs
  const SENSITIVE_PATTERNS: readonly RegExp[] = [
    /eyJ.../g,             // JWT
    /[a-zA-Z0-9._%+-]+@.../g,  // emails
    /:\/\/[^@\s]+:[^@\s]+@/g,  // URLs com credenciais
    /[?&](token|key|...)=.../gi, // query params sensíveis
  ];
  ```
- **Impacto:** Uma data URL de imagem (ex: `data:image/png;base64,iVBORw0KG...`) contém o conteúdo binário da imagem codificado em base64. Se o usuário fizer upload de uma imagem com dados sensíveis embutidos, e essa imagem causar erro de processamento, o fragmento da data URL no log pode ser armazenado no Firestore.
- **Pré-condição de ataque:** Usuário faz upload de imagem que contém dados sensíveis (ex: screenshot de documento). O processamento falha. `err.message` contém parte da data URL. O log é enviado ao Firestore. Um atacante com acesso ao Firestore (admin ou regras mal configuradas) lê o log.
- **Mitigação existente:** Os logs de debug (onde `imageUrl.substring(0, 60)` aparece) NÃO vão para o Firestore — apenas `warn`+ são enviados (index.ts:100). O `substring(0, 60)` limita a exposição nos logs de debug. Data URLs **não contêm metadados de PII** por si só (não têm email, nome, token). A probabilidade de um `err.message` conter a data URL completa é baixa — normalmente contém `"Falha ao carregar imagem"` ou `"NetworkError"`.
- **Sugestão:** Adicionar data URL aos padrões de `sanitizeMessage()` — redactar o payload base64 mantendo o prefixo `data:image/...;base64,[REDACTED]`. Custo: ~3 linhas no `sanitization.ts`. Alternativa: truncar data URLs em logs de erro manualmente.

---

### [WARNING] Module augmentation do `AnalyticsEventMap` em página (não no arquivo de tipos)

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:85-89`
- **Confidence:** 80/100
- **Categoria:** Injection (type pollution)
- **Problema:** `declare module '../lib/analytics' { interface AnalyticsEventMap { speed_paint_preset_changed: ... } }` declara um novo evento de analytics via module augmentation **dentro de uma página React**, não no arquivo de definição de tipos (`src/lib/analytics.ts`). É type-only (sem impacto runtime), mas polui o namespace global de tipos.
- **Evidência:**
  ```typescript
  // SpeedPaintPage.tsx:85-89
  declare module '../lib/analytics' {
    interface AnalyticsEventMap {
      speed_paint_preset_changed: { preset: VetorialPreset };
    }
  }
  ```
- **Impacto:** Se outro módulo também fizer `declare module '../lib/analytics'` com a mesma chave, TypeScript reportaria conflito de tipos (erro de compilação, não runtime). Não há risco de injeção runtime porque `declare module` é apagado na compilação. O comentário nas linhas 73-83 documenta que é uma "ponte temporária" até o próximo PR de analytics.
- **Pré-condição de ataque:** Nenhuma — é type-only.
- **Sugestão:** Mover a declaração para `src/lib/analytics.ts` na próxima release que adicionar novos eventos. Até lá, o impacto é estritamente de qualidade de código (manutenibilidade).

---

### [SUGGESTION] Ausência de validação de runtime para `renderMode` e `vetorialPreset`

- **Arquivos:** `BatchOrchestrator.tsx:108`, `speedPaintRenderer.ts:287-288`, `speedPaintRenderController.tsx:780-781`, `videoRenderController.tsx:208-209`
- **Confidence:** 78/100 — **descartado pelo confidence gate (< 80)**. Não reportado como achado, documentado aqui para registro.
- **Motivo do descarte:** Ambos os valores vêm de store Zustand controlada por UI (ToggleButtonGroup + Select). A store só aceita literais da union `SpeedPaintRenderMode` ('mask' | 'vetorial') e `VetorialPreset` (16 literais). Não há input externo que possa injetar valores arbitrários sem bypass do type system. O cache SHA-256 (que inclui `mode`/`preset` na chave) aceitaria qualquer string, mas os valores que chegam ao cache são sempre da union tipada. Validação de runtime seria defesa em profundidade, não correção de vulnerabilidade.

---

## O que parece saudável

- **Cache SHA-256:** A chave `imageUrl + "|" + JSON.stringify(context)` é hash SHA-256 criptográfico. Colisão acidental é essencialmente impossível. Cache poisoning intencional exigiria encontrar colisão SHA-256 — inviável. O LRU de 20 entradas previne DoS de memória.
- **Race protection:** 3 camadas (`processingIdRef` + `AbortController` + guards) em todos os 5 pontos de concorrência (SpeedPaintPage, BatchOrchestrator, speedPaintRenderController, videoRenderController, reprocessCurrentImage). Nenhum TOCTOU identificado.
- **XSS:** Nenhum `dangerouslySetInnerHTML` no código novo. O `<Select>` de preset usa `t(\`speedPaint.presets.${preset}\`)` onde `preset` é do tipo `VetorialPreset` (16 literais). React escapa por padrão. O SVG `<Pencil>` usa apenas coordenadas numéricas sem template injection.
- **DoS:** `MAX_PATHS_PER_SCENE=500` com truncamento + `log.warn` quando excedido. `PATHOMIT_BY_PRESET` evita presets "ricos" gerarem SVGs gigantes. `BLUR_THRESHOLD=1.5` + `MAX_BLUR_STD_DEVIATION=3` previnem blur excessivo. `sortPaths` com seed determinístico (sem `Math.random`).
- **Type guards:** `isVetorialAnimation` e `isStrokeAnimation` são type guards reais (narrowing via `in` operator). Usados consistentemente em todos os branches de cache, sem `as` bypass.
- **`as` casts:** Zero `as` bypass no código novo das páginas e features. Os 2 casts no `videoRenderBridge.ts` (linhas 54-55) são para literais em estado inicial de store — padrão aceitável.
- **Auth / BYOK:** Não foi tocado nesta release. API key do Gemini continua apenas em IndexedDB local. Nenhuma nova rota de backend.
- **COEP / CSP:** `vite.config.ts` não modificado. COEP permanece ativo em `/app/**`.
- **Contrato CT-S01:** Zero `any`, `@ts-ignore` ou `as` bypass no código novo. ✅
- **Contrato CT-S02:** COEP / SharedArrayBuffer inalterado. ✅
- **Contrato CT-B07:** Imports relativos (sem `@/`). ✅
- **Contrato CT-B08:** `DISABLE_HMR` inalterado. ✅

---

## Limites da Revisão

- **Auditoria estática:** Não foram executados testes dinâmicos (fuzzing, pentest runtime). A análise baseia-se em leitura de código e rastreamento de fluxo.
- **Logger offline:** Embora a sanitização de logs não cubra data URLs, não foi possível confirmar se os logs de erro no Firestore estão acessíveis para usuários não-admin. Isso depende das Firestore rules, que não foram modificadas nesta release.
- **imagetracerjs:** A lib externa `imagetracerjs@1.2.6` não foi auditada. Assume-se que é segura (biblioteca de processamento de imagem, sem rede ou IO).
- **Math.random no modo mask:** `Math.random` permanece no pipeline de modo mask preexistente (`imageProcessing.ts`, `strokeWorker.ts`, `speedPaintRenderer.ts`). Isso NÃO faz parte da release 0.132.0 e não foi re-auditado.
- **`as` casts preexistentes:** `speedPaintRenderController.tsx` tem ~20 casts `as RenderStatus`/`as RenderKind` e 2 casts de componente (`as ComponentType<...>`). Todos são preexistentes e não fazem parte desta release.

---

## Checks Rápidos

| Superfície | Status | Notas |
|-----------|--------|-------|
| Cache poisoning (SHA-256) | ✅ Seguro | Colisão inviável, LRU 20 entradas |
| Validação de entrada | ✅ Seguro | Store Zustand + type-safe |
| Race condition / TOCTOU | ✅ Seguro | 3 camadas em todos os pontos |
| XSS (i18n, SVG, Pencil) | ✅ Seguro | Sem dangerouslySetInnerHTML |
| DoS (paths, cache, blur) | ✅ Seguro | Clamps e thresholds |
| PII em logs (data URLs) | ⚠️ Warning | Não coberto pela sanitização |
| Module augmentation | ⚠️ Warning | Type pollution, sem impacto runtime |
| Type guards | ✅ Seguro | Narrowing real, sem `as` |
| Auth / BYOK | ✅ Não tocado | Sem mudanças |
| COEP / CSP | ✅ Não tocado | Intacto |
| `@ts-ignore` / `as` bypass | ✅ Zero | No código novo |
| `Math.random` no vetorial | ✅ Zero | SortPaths é determinístico |

---

## Priorização

### Corrigir (próxima release)

1. **[PII] Adicionar data URL aos padrões de `sanitizeMessage()`** — redactar payload base64 mantendo prefixo. Custo: ~5 min, 3 linhas em `src/lib/logger/sanitization.ts`.

### Monitorar

2. **[Type-only] Mover module augmentation para `src/lib/analytics.ts`** — quando o próximo PR de analytics adicionar novos eventos. Baixa prioridade.

### Descartado

3. **[Suggestion] Validação de runtime para renderMode/preset** — confidence < 80. Store Zustand + type system já garantem segurança. Defesa em profundidade desnecessária.

---

## Conclusão

**Release 0.132.0 está segura para merge.** Os 2 warnings identificados não são bloqueadores. O código respeita todos os contratos de segurança do projeto (CT-S01, CT-S02). As camadas de race protection estão completas e corretas. Recomenda-se adicionar a cobertura de data URLs na sanitização de logs na próxima release como boa prática de hardening.
