# Auditoria de Segurança — Speed Paint Vetorial (Fase 5.5)

**Data:** 2026-06-14
**Versão alvo:** `0.131.0`
**Autor:** Security Agent (Koda AI Studio)
**Plano fonte:** `docs/plan/plano-speed-paint-vetorial-2026-06-14.md`
**Tracker:** `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`

---

## 1. Escopo da Revisão

### Arquivos Novos (6)
| Arquivo | Status |
|---------|--------|
| `src/features/speed-paint/types/vetorial.ts` | ✅ Lido por completo |
| `src/features/speed-paint/lib/vectorizer.ts` | ✅ Lido por completo |
| `src/types/imagetracerjs.d.ts` | ✅ Lido por completo |
| `src/features/video-render/components/WhiteboardScene.tsx` | ✅ Lido por completo (CRÍTICO) |
| `src/features/speed-paint/components/WhiteboardComposition.tsx` | ✅ Lido por completo |
| `src/features/speed-paint/hooks/useSyncSpeedPaintRenderMode.ts` | ✅ Lido por completo |

### Arquivos Modificados (13)
| Arquivo | Status |
|---------|--------|
| `src/features/speed-paint/types.ts` | ✅ Lido |
| `src/features/speed-paint/store/animationStore.ts` | ✅ Lido |
| `src/features/video-render/lib/strokeCache.ts` | ✅ Lido |
| `src/features/speed-paint/lib/imageProcessing.ts` | ✅ Lido |
| `src/features/speed-paint/lib/userSettings.ts` | ✅ Lido |
| `src/features/speed-paint/store/speedPaintRenderController.tsx` | ✅ Lido |
| `src/pages/SpeedPaintPage.tsx` | ✅ Lido (CRÍTICO — analytics event) |
| `src/lib/analytics.ts` | ✅ Lido (event map) |
| `src/lib/db/types.ts` | ✅ Lido (UserSettings type) |
| `src/lib/db/user-settings.ts` | ✅ Lido |
| `src/lib/logger/index.ts` | ✅ Lido (sanitização) |
| `src/lib/logger/sanitization.ts` | ✅ Lido (padrões de redação) |
| `src/features/i18n/locales/{pt-BR,en,es}.ts` | ✅ Verificado (12 chaves i18n) |

### Superfícies Sensíveis Cobertas
- [x] Renderização de path data SVG via JSX (path injection / XSS)
- [x] Validação de entrada `ImageData` no vectorizer
- [x] Regex de parsing SVG (ReDoS)
- [x] Leitura de `renderMode` do Firestore sem validação de tipo
- [x] Cache SHA-256 (colisão, prototype pollution)
- [x] AbortSignal cooperativo (loop infinito, cancelamento)
- [x] Analytics event `speed_paint_mode_changed`
- [x] Sanitização de logs (dados sensíveis, URLs truncadas)
- [x] Busca global: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `as any`, `process.env`

---

## 2. Veredito

> ✅ **Seguro para release** — Nenhuma vulnerabilidade explorável encontrada.

Os 8 pontos de auditoria foram verificados individualmente. Todos estão em conformidade com as boas práticas de segurança do projeto. Uma sugestão de hardening foi identificada (sem impacto de segurança).

---

## 3. Achados Priorizados

### [SUGGESTION] Ausência de runtime validation no `loadSpeedPaintRenderMode`

- **Arquivo:** `src/features/speed-paint/lib/userSettings.ts:20-24`
- **Confidence:** 90/100
- **Categoria:** Authorization
- **Problema:** `loadSpeedPaintRenderMode` retorna o valor bruto do Firestore/IndexedDB sem validar se o valor corresponde ao union type `SpeedPaintRenderMode` (`'mask' | 'vetorial'`). Se o Firestore for comprometido por uma vulnerabilidade externa (fora do escopo desta feature) ou houver corrupção de dados, um valor arbitrário como `'pwned'` seria aceito.
- **Evidência:** Código em `userSettings.ts:20-24`:
  ```typescript
  export async function loadSpeedPaintRenderMode(
    userId?: string,
  ): Promise<SpeedPaintRenderMode | undefined> {
    const settings = await getUserSettings(userId);
    return settings?.speedPaintRenderMode;  // ← sem validação runtime
  }
  ```
  O valor retornado é passado diretamente para `setRenderMode()` em `useSyncSpeedPaintRenderMode.ts:40`
- **Impacto:** Baixíssimo — em runtime, o `renderMode` é comparado com `=== 'vetorial'` nos consumidores (`imageProcessing.ts:402`, `speedPaintRenderController.tsx:540`). Qualquer valor desconhecido cai no branch `'mask'` (fallback seguro). O pior caso é um ToggleButton não selecionado na UI (glitch visual).
- **Pré-condição de ataque:** Firestore já comprometido por outra vulnerabilidade. Esta não é uma entrada direta de usuário.
- **Sugestão:** Adicionar validação do tipo na leitura:
  ```typescript
  const VALID_MODES: readonly string[] = ['mask', 'vetorial'];
  const raw = settings?.speedPaintRenderMode;
  return raw !== undefined && VALID_MODES.includes(raw)
    ? raw as SpeedPaintRenderMode
    : undefined;
  ```

---

## 4. O que parece saudável

### 4.1. Path data injection (XSS) — ✅ Mitigado por React

`WhiteboardScene.tsx` renderiza `<path d={pathData} />` via JSX. React escapa automaticamente qualquer string injetada. Busca global confirmou:

- **Zero** `dangerouslySetInnerHTML` nos 6 novos arquivos + 13 modificados
- **Zero** `innerHTML`, `outerHTML`, `eval`, `new Function()` no escopo
- As 2 ocorrências existentes de `dangerouslySetInnerHTML` (`Inspector.tsx:430` e `DeleteAccountDialog.tsx:89`) são em arquivos não relacionados, ambas com sanitização (`escapeHtml()` e string de UI do Firebase Auth)

### 4.2. Validação de ImageData — ✅ Robusta

`isValidImageData()` em `vectorizer.ts:155-163` verifica:
- `imageData !== null/undefined`
- `data instanceof Uint8ClampedArray`
- `width > 0 && height > 0`

O `dataUrl` de entrada é carregado via `new Image()` — navegadores não executam scripts em SVGs carregados como imagem (padrão de segurança do `<img>`/`drawImage`). O fluxo é seguro.

### 4.3. SVG parsing — ✅ Sem ReDoS

**`PATH_TAG_REGEX`** (`/<path\b[^>]*\bd="([^"]+)"[^>]*?>/g`):
- Âncoras literais fortes (`<path`, `d=`, `"`)
- `[^>]*` e `[^>]*?` são limitados pelo fechamento `>`
- Backtracking limitado — não há nested quantifiers conflitantes
- **Veredito:** Seguro, sem risco de ReDoS

**`FILL_ATTR_REGEX`** (`/fill="(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|none)"/`):
- Alternativas com limites claros (hex 3-8 chars, `[^)]+` até fechar `)`, `none` literal)
- **Veredito:** Seguro, sem risco de ReDoS

### 4.4. Cache — ✅ Sem colisão ou prototype pollution

- `buildCacheKey()` usa SHA-256 (`crypto.subtle.digest`) — colisão negligenciável
- `JSON.stringify({ mode, preset })` serializa strings fixas — sem risco de prototype pollution (apenas lê propriedades próprias)
- Chave inclui `renderMode` + `preset` (Premissa #10 do tracker) — evita colisão entre animações da mesma imagem em modos diferentes
- Cache LRU com `Map` — sem `__proto__` ou herança envolvida

### 4.5. AbortSignal — ✅ Cooperativo e seguro

`vectorizeImage` checa `signal.aborted`:
1. Antes de iniciar o trabalho (`ensureNotAborted` — linha 318)
2. Após `ImageTracer.imagedataToSVG()` (linha 336)
3. A cada 50 paths em `enrichPaths` (linhas 268-270)

`processVetorialOnMainThread` também checa antes e depois da vetorização. Loop infinito impossível.

### 4.6. Analytics — ✅ Seguro

Evento `speed_paint_mode_changed` com payload `{ mode: 'mask' | 'vetorial' }`:
- Tipado em `AnalyticsEventMap` no `analytics.ts:93`
- Sem PII, sem dados sensíveis
- Modo é enum seguro e restrito ao union type

### 4.7. Logging — ✅ Sanitização ativa

O sistema de logger (`src/lib/logger/`) tem sanitização completa:
- `sanitizeMessage()` — redacta JWTs, emails, URLs com credenciais
- `sanitizeMetadata()` — redacta chaves sensíveis (`password`, `token`, `apiKey`...)
- `sanitizeUrl()` — remove query params sensíveis
- `sanitizeStackTrace()` — remove caminhos absolutos do sistema

Os logs específicos da feature estão limpos:
- `vectorizer.ts`: loga apenas `originalCount`, `maxAllowed`, `preset`, `width`, `height` — sem path data bruto
- `strokeCache.ts`: URLs truncadas em 60 caracteres (linhas 196, 202, 284)
- `useSyncSpeedPaintRenderMode.ts`: apenas `error` genérico sanitizado

### 4.8. Tipagem e código limpo

- **Zero** `as any` em todos os 6 novos + arquivos modificados da speed-paint
- **Zero** `process.env` — usa `import.meta.env` conforme padrão do projeto
- **Zero** `localStorage.setItem` com dados sensíveis
- Type guards (`isVetorialAnimation`, `isStrokeAnimation`) em `strokeCache.ts` com narrowing real em compile-time
- `getLength()` do `@remotion/paths` usado apenas na vetorização (nunca no render) — conforme Premissa #6
- `getPointAtLength()` importado de `@remotion/paths` (não `SVGPathElement.getPointAtLength`) — sem DOM, sem flickering

---

## 5. Limites da Revisão

- Não foi executado `bun run lint` / `bun run typecheck` / `bun run test` (instrução explícita)
- Não foi testado o comportamento do `imagetracerjs` com SVG patológico gerado intencionalmente (teste dinâmico)
- Não foi verificada a segurança do `imagetracerjs` internamente (assumimos que a lib é segura por ser madura, 1.5k stars, zero deps)
- Não foi verificada a segurança de renderização do Remotion (`@remotion/web-renderer`) que consome os paths — assumimos que a sanitização do Chromium + `renderMediaOnWeb` cobre XSS em SVG
- `dangerouslySetInnerHTML` foi verificado apenas no escopo dos arquivos do plano e busca global em `src/` — confirmado zero nos arquivos novos/modificados

---

## 6. Checks Rápidos

| Superfície | Status | Notas |
|---|---|---|
| Auth / Sessão | 🔴 Não escopo | Nenhum auth novo foi adicionado |
| Autorização (RBAC) | ✅ Seguro | `renderMode` é preferência de UI, não controle de acesso |
| Secrets / Credenciais | ✅ Seguro | Nenhuma credencial nas superfícies auditadas |
| PII / Dados sensíveis | ✅ Seguro | Sanitização de logs ativa, zero PII nos payloads |
| Injection (XSS) | ✅ Seguro | React escapa, zero `dangerouslySetInnerHTML` |
| Injection (ReDoS) | ✅ Seguro | Regex comprovadamente seguras |
| Webhook | 🔴 Não escopo | Nenhum webhook novo |
| Upload | ✅ Seguro | `dataUrl` passa por `new Image()` (sanitização do browser) |
| Rate Limit | 🔴 Não escopo | Nenhum endpoint novo |
| CORS | 🔴 Não escopo | Nenhuma nova rota HTTP |
| Cache (collision) | ✅ Seguro | SHA-256 + discriminação por modo/preset |
| Cache (prototype pollution) | ✅ Seguro | JSON.stringify de strings fixas |
| AbortSignal | ✅ Seguro | Checagens cooperativas em 3 pontos |
| Multi-tenant | 🔴 Não escopo | Sem tenant isolation novo |

---

## 7. Priorização

| Prioridade | Achado | Categoria | Ação |
|---|---|---|---|
| 🔵 Sugestão | Validar tipo de `renderMode` na leitura do Firestore | Hardening | Adicionar runtime validation no `loadSpeedPaintRenderMode` |
| — | Todos os demais 7 pontos | ✅ Seguros | Nenhuma ação necessária |

---

## 8. Confirmação Final

### Status: ✅ **Seguro para release**

Nenhuma vulnerabilidade explorável foi identificada nas superfícies sensíveis da feature Speed Paint Vetorial (Fases 1-5). Os 8 pontos de auditoria foram verificados e aprovados:

1. ✅ **Path data injection (XSS):** Zero `dangerouslySetInnerHTML`. React auto-escapa. Mitigado por design.
2. ✅ **Validação de ImageData:** Robusta (null/undefined, tipo, dimensões).
3. ✅ **Sanitização SVG (ReDoS):** Ambas as regex são seguras — âncoras literais fortes, sem nested quantifiers conflitantes.
4. ✅ **UserSettings:** Único achado — **SUGGESTION** de runtime validation (sem impacto de segurança).
5. ✅ **Cache:** SHA-256 sem colisão. Sem prototype pollution.
6. ✅ **AbortSignal DoS:** Cooperativo em 3 pontos. Loop infinito impossível.
7. ✅ **Analytics:** Payload seguro, sem PII.
8. ✅ **Logging:** Sanitização automática, URLs truncadas, sem path data bruto.

### Gate de Saída Final

- [x] Li o contexto mínimo real ou reuni evidência suficiente? — 6 novos + 13 modificados lidos por completo
- [x] Cada achado passou pela validação anti-falso-positivo? — Único achado (SUGGESTION) validado: impacto real é baixíssimo
- [x] Cada achado passou pelo confidence gate numérico? — Confidence 90/100 ≥ 80
- [x] Achados com confidence < 80 foram descartados? — Nenhum descartado (todos > 80)
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`? — ✅
- [x] Existe motivo real para escalar? — **Não.** Nenhum bloqueador de release.
