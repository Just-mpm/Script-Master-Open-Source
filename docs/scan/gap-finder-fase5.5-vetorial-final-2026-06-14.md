# Gap Finder — Fase 5.5: Auditoria Final Speed Paint Vetorial

**Data:** 2026-06-14
**Versão alvo:** `0.131.0`
**Escopo:** Fases 1-5 completas (Fase 0 removida por decisão Matheus)

---

## 1. Contexto Assumido

- Plano fonte: `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (560 linhas, 12 seções)
- Tracker: `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md` (283 linhas, 5 fases, 16 premissas)
- Fase 0 (spike experimental) foi **removida por decisão do Matheus** — risco aceito
- `hand-pencil.svg` substituído por componente SVG inline no `WhiteboardScene` (tracker §Desvios #4)
- `WhiteboardComposition.tsx` movido para `speed-paint/components/` (tracker §Desvios #2)
- Controller no caminho real `speed-paint/store/` (tracker §Desvios #1)
- Persistência via `UserSettings` dual storage, não `persist` middleware (tracker §Desvios #5)

---

## 2. Mapa Rápido: Sólido vs Frágil

### ✅ Sólido

| Componente | Confiança | Evidência |
|---|---|---|
| Tipos `VetorialPath`/`VetorialAnimation`/`SpeedPaintRenderMode` | 100 | `vetorial.ts` — 88 linhas, sem `any`, documentado |
| Declarações `imagetracerjs.d.ts` | 100 | 83 linhas, 16 presets, `ImageTracerStatic` tipado |
| Feature flag `renderMode` + `vetorialPreset` na store | 100 | `animationStore.ts` — `renderMode` default `'mask'`, `vetorialPreset` default `'artistic1'` |
| Branch `renderMode === 'vetorial'` em `imageProcessing.ts` | 100 | Linha 402: chama `processVetorialOnMainThread`. Fallback mask intacto |
| Cache com chave discriminada por `mode` + `preset` | 100 | `strokeCache.ts` — `CacheContext { mode, preset }`, type guards `isVetorialAnimation`/`isStrokeAnimation` |
| `WhiteboardScene` determinístico | 100 | `useCurrentFrame()` → `interpolate` → `drawnLength`. Zero `useEffect`/`useState` no render |
| `WhiteboardComposition` wrapper | 100 | 66 linhas, `React.memo`, props `VetorialAnimation` |
| Controller com lazy loading da composição vetorial | 100 | `speedPaintRenderController.tsx` — `createExportableWhiteboardComposition()`, discriminado por `renderMode` |
| i18n completo (3 locales × 4 chaves) | 100 | `modeLabel`, `modeClassic`, `modeVetorial`, `modeDescription` nos 3 locales |
| Analytics `speed_paint_mode_changed` | 100 | `analytics.ts` linha 93 (tipo), `SpeedPaintPage.tsx` linha 305 (disparo) |
| Persistência em `UserSettings` | 100 | `db/types.ts:99` (tipo), `db/user-settings.ts:37` (campo), `userSettings.ts` (helpers), `App.tsx:53` (mount) |
| Testes unitários `vectorizer` | 100 | 438 linhas, 6 cenários + AbortSignal |
| Testes de integração `imageProcessing.vetorial` | 100 | 439 linhas, 9 cenários, valida `VetorialAnimation` |
| Testes e2e com 10 imagens | 100 | 685 linhas, 10 imagens diversas, fallback mask incluso |
| MAX_PATHS_PER_SCENE = 500 | 100 | `vectorizer.ts:65` — implementado com warning via `createLogger` |
| `@remotion/paths` como dependência direta | 100 | `package.json` linha 52 |
| `imagetracerjs` instalado | 100 | `package.json` linha 59 |

### ⚠️ Atenção (não são gaps, são decisões conscientes)

| Item | Descrição | Motivo |
|---|---|---|
| Batch não suporta modo vetorial | `runBatchRender` só usa `createExportableBatchSpeedPaintComposition` (mask) | Decisão de escopo Fase 3.2 — batch vetorial é fase futura |
| Vetorial roda na main thread (não em Worker) | `processVetorialOnMainThread` vs modo mask que usa Worker | `imagetracerjs` ~290 KB em Blob URL sem `importScripts` é inviável. Async com checagem de abort mantém UI responsiva |
| Snapshot/render de componente Remotion não testado | Nenhum teste de snapshot do `WhiteboardScene` | Projeto não tem precedente de teste de componente Remotion — seria pioneirismo (Premissa #15) |
| SpeedPaintRenderer não modificado | `speedPaintRenderer.ts` sem referências a vetorial | Correto: render vetorial é SVG via Remotion, não Canvas 2D |

---

## 3. Validação dos Critérios Visuais (§3.2:89-96)

| # | Característica | Como se consegue | Implementado? | Evidência |
|---|---|---|---|---|
| 1 | **Linha cresce progressivamente** | `strokeDasharray` + `strokeDashoffset` animados | ✅ | `WhiteboardScene.tsx:219-221`: `strokeDasharray={pathLen}` + `strokeDashoffset={pathLen - visibleLength}` |
| 2 | **Caneta segue a ponta do traço** | `getPointAtLength(currentLength)` → `transform: translate(x, y)` | ✅ | `WhiteboardScene.tsx:166`: `getPointAtLength(activePath.path.d, activePath.visibleLength)`. Fallback entre paths (Premissa #13) linha 171-188 |
| 3 | **Traço contínuo, não segmentos** | SVG `<path>` com `d="M... L... C..."` | ✅ | `WhiteboardScene.tsx:211-223`: path SVG completo com `fill="none"`, `strokeLinecap="round"`. `VetorialPath.d` contém path contínuo |
| 4 | **Ordem de desenho lógica** | Animar paths em sequência | ✅ | `WhiteboardScene.tsx:131-150`: loop sequencial `renderedPaths[]` com `accumulatedLength`. `drawnLength` é linear, acumulando path por path |

**Veredito §3.2:** ✅ **4/4 critérios atendidos.**

### Comparação Antes vs Depois (§5.2:219-226)

| Aspecto | Hoje (máscara) | Depois (vetorial) | Evidência |
|---|---|---|---|
| Imagem no frame 0 | Completa, escondida sob branco | Vazia (só canvas branco) | ✅ `WhiteboardScene.tsx:194-197`: `backgroundColor` sólido, paths só aparecem com `visibleLength > 0` |
| Como aparece | Branco é riscado/apagado | Linha cresce do A ao B | ✅ `strokeDashoffset` animado por frame (critério #1) |
| Lápis segue | Bordas aproximadas (edge detection) | Contorno real (path vetorial) | ✅ `getPointAtLength()` no path SVG real (critério #2) |
| Reveal secundário | Pinceladas aleatórias destination-out | Não existe — só desenho | ✅ Zero `destination-out`, zero `globalCompositeOperation` em `WhiteboardScene` |
| Resultado visual | Raspadinha | Desenho à mão livre | ✅ Pipeline completo `imagetracerjs` → SVG paths → `strokeDashoffset` |
| Biblioteca core | Edge detection própria | `imagetracerjs` + `@remotion/paths` | ✅ Dependências em `package.json`, `vectorizer.ts` + `WhiteboardScene.tsx` |

---

## 4. Arquivos Novos (Plano §7:451-459 + extras)

### Do plano (6)

| # | Arquivo | Propósito | Status | Nota |
|---|---|---|---|---|
| 1 | `src/features/speed-paint/types/vetorial.ts` | Tipos `VetorialPath`, `VetorialAnimation` | ✅ Criado (88 linhas) | `SpeedPaintRenderMode`, `VetorialPreset` (16 valores), `VetorialPath` (d, length, color, strokeWidth), `VetorialAnimation` (id, canvasWidth/Height, canvasColor, paths, totalLength, fps, totalDurationMs, sourcePreset, resizedImage) |
| 2 | `src/features/speed-paint/lib/vectorizer.ts` | Wrapper do `imagetracerjs` + parser SVG | ✅ Criado (362 linhas) | `vectorizeImage()` assíncrono, `parseSvgPaths()` por regex (funciona em Worker), `enrichPaths()` com `getLength()`, `truncatePaths()` (MAX_PATHS_PER_SCENE = 500), `PATHOMIT_BY_PRESET`, `AbortSignal` cooperativo, logger |
| 3 | `src/types/imagetracerjs.d.ts` | Declarações de tipo da lib | ✅ Criado (83 linhas) | `ImageTracerStatic`, `ImageTracerOptions` com 16 presets + pathomit/numberofcolors/ltres/qtres, export default |
| 4 | `src/features/video-render/components/WhiteboardScene.tsx` | Composição Remotion vetorial | ✅ Criado (298 linhas) | `WhiteboardScene` + `Pencil` SVG inline. Determinístico. Props: animation, durationInFrames, isLastScene, isExporting, showDrawTool, canvasColor |
| 5 | `src/features/speed-paint/components/WhiteboardComposition.tsx` | Wrapper para exportação | ✅ Criado (66 linhas) | `React.memo`, `useVideoConfig()` → `durationInFrames`, `AbsoluteFill` com backgroundColor |
| 6 | `src/assets/speed-paint/hand-pencil.svg` | Sprite da mão/caneta | ❌ **Não criado** (intencional) | **Decisão Matheus (tracker §Desvios #4):** Portar `drawTool()` para SVG inline dentro do `WhiteboardScene`. Substituído pelo componente `Pencil` em `WhiteboardScene.tsx:272-297` |

### Extras de F4.2 (2)

| # | Arquivo | Propósito | Status |
|---|---|---|---|
| 7 | `src/features/speed-paint/lib/userSettings.ts` | Helpers de persistência `loadSpeedPaintRenderMode`/`saveSpeedPaintRenderMode` | ✅ Criado (37 linhas) |
| 8 | `src/features/speed-paint/hooks/useSyncSpeedPaintRenderMode.ts` | Hook de sincronização store ↔ UserSettings | ✅ Criado (69 linhas) — mount + subscribe com debounce 2s |

### Testes (3)

| # | Arquivo | Propósito | Status |
|---|---|---|---|
| 9 | `tests/speed-paint/vectorizer.unit.test.ts` | Testes unitários do vectorizer | ✅ Criado (438 linhas) — 6 cenários |
| 10 | `tests/speed-paint/imageProcessing.vetorial.integration.test.ts` | Testes de integração pipeline vetorial | ✅ Criado (439 linhas) — 9 cenários |
| 11 | `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts` | Testes e2e com 10 imagens diversas | ✅ Criado (685 linhas) — 10 imagens + fallback mask |

---

## 5. Arquivos Modificados (Plano §7:461-473 + extras)

### Do plano (9)

| # | Arquivo | Mudança | Status | Evidência |
|---|---|---|---|---|
| 1 | `src/features/speed-paint/lib/imageProcessing.ts` | Branch `renderMode === 'vetorial'` → `processVetorialOnMainThread` | ✅ | Linha 402: `if (renderMode === 'vetorial')`. Fallback mask intacto (Worker inline + `processOnMainThread`) |
| 2 | `src/features/speed-paint/store/animationStore.ts` | `renderMode`, `vetorialPreset` no `AnimationState` | ✅ | `renderMode: 'mask'` default, `vetorialPreset: 'artistic1'`, `setRenderMode`, `setVetorialPreset`, `DEFAULT_RENDER_MODE` |
| 3 | `src/features/speed-paint/types.ts` | Re-export de `VetorialAnimation`, `SpeedPaintRenderMode`, etc. `PaintingJob.animation` estendido | ✅ | Re-exporta de `./types/vetorial`. `PaintingJob.animation?: StrokeAnimation \| VetorialAnimation` |
| 4 | `src/features/video-render/lib/strokeCache.ts` | Cache de `VetorialAnimation` + discriminated key | ✅ | `CacheContext { mode, preset }`, `isVetorialAnimation()`, `isStrokeAnimation()`, hash inclui context |
| 5 | `src/features/video-render/lib/speedPaintRenderer.ts` | — | ❌ **Não modificado (correto)** | Render vetorial é SVG via Remotion, não Canvas 2D. Controller faz o branch, não o renderer |
| 6 | `src/features/speed-paint/store/speedPaintRenderController.tsx` | `createExportableWhiteboardComposition()` lazy + branch por `renderMode` | ✅ | Linha 540: `isVetorial` type guard. Linha 596-603: branch vetorial/mask. Linha 115: `COMPOSITION_ID_VETORIAL` |
| 7 | `src/pages/SpeedPaintPage.tsx` | Seletor de modo (ToggleButtonGroup), handler analytics | ✅ | Linhas 782-874: `ToggleButtonGroup` com `value="mask"` / `value="vetorial"`, i18n, analytics |
| 8 | `package.json` | Adicionar `imagetracerjs` + `@remotion/paths` | ✅ | Linha 52: `@remotion/paths: "4.0.448"`. Linha 59: `imagetracerjs: "1.2.6"` |
| 9 | `src/features/i18n/locales/{pt-BR,en,es}.ts` | 4 chaves novas cada | ✅ | pt-BR (linhas 1427-1430), en (1410-1413), es (1410-1413) |

### Extras (F4.2 — persistência + analytics + hook)

| # | Arquivo | Mudança | Status |
|---|---|---|---|
| 10 | `src/lib/analytics.ts` | Evento `speed_paint_mode_changed: { mode }` | ✅ Linha 93 |
| 11 | `src/lib/db/types.ts` | Campo `speedPaintRenderMode` no `UserSetting` | ✅ Linha 99 |
| 12 | `src/lib/db/user-settings.ts` | Campo `speedPaintRenderMode` no `StudioUserSettings` | ✅ Linha 37 |
| 13 | `src/App.tsx` | Hook `useSyncSpeedPaintRenderMode()` | ✅ Linha 31 (import), 53 (chamada) |

---

## 6. Feature Flag `renderMode`

### Funcional em todos os níveis

| Nível | Status | Como |
|---|---|---|
| **Store (Zustand)** | ✅ | `animationStore.ts`: `renderMode: SpeedPaintRenderMode` (default `'mask'`) + `setRenderMode()` |
| **Pipeline (imageProcessing)** | ✅ | `GenerateStrokesOptions.renderMode` — branch `if (renderMode === 'vetorial')` |
| **Cache (strokeCache)** | ✅ | `CacheContext.mode` na chave SHA-256 — sem colisão entre modos |
| **Controller (renderController)** | ✅ | `renderMode === 'vetorial' && 'paths' in animationForRender` → composição vetorial lazy |
| **UI (SpeedPaintPage)** | ✅ | `ToggleButtonGroup` com `value="mask"` / `value="vetorial"` |
| **Persistência** | ✅ | `UserSettings.speedPaintRenderMode` — dual storage Firestore/IndexedDB |

### Fallback mask preservado 100%

- `renderMode` default = `'mask'` → projetos existentes continuam funcionando
- `imageProcessing.ts` linha 402: só executa vetorial se explicitamente `renderMode === 'vetorial'`
- `speedPaintRenderController.tsx` linha 540: `isVetorial` precisa de `renderMode === 'vetorial'` **E** `'paths' in animation`
- Teste e2e linha 658-684: `generateStrokesFromImage` sem `renderMode` retorna `StrokeAnimation` (mask)

---

## 7. Gaps Finais

### ❌ Bloqueadores: Nenhum

### ⚠️ Atenção (não bloqueiam release)

| ID | Severidade | Tipo | Descrição | Decisão |
|---|---|---|---|---|
| GAP-01 | BAIXO | Plano desalinhado | Plano §7:468 lista `speedPaintRenderer.ts` como modificado, mas o arquivo não foi alterado | **Correto:** o branch está no controller, não no renderer. Plano continha imprecisão que o tracker corrigiu. Nenhuma ação necessária |
| GAP-02 | BAIXO | Plano desalinhado | Plano §7:456 indica `WhiteboardComposition.tsx` em `video-render/components/`, mas está em `speed-paint/components/` | **Correto:** tracker §Desvios #2 ajustou para consistência com `SpeedPaintComposition.tsx` |
| GAP-03 | BAIXO | Feature incompleta | Batch (`runBatchRender`) não suporta modo vetorial | **Decisão de escopo documentada** Fase 3.2. Fase futura se houver demanda |
| GAP-04 | BAIXO | Teste ausente | Nenhum teste de snapshot/render do `WhiteboardScene` | **Decisão:** Projeto não tem precedente de teste Remotion (Premissa #15). Pipeline de geração é testado via integração |

### 💡 Sugestões (pós-release)

| ID | Descrição |
|---|---|
| SUG-01 | Considerar habilitar batch vetorial em fase futura |
| SUG-02 | Adicionar preset selector na UI (hoje fixo `'artistic1'`) — o tipo `VetorialPreset` já suporta 16 valores |
| SUG-03 | Se usuários reportarem performance lenta em imagens > 1080p, implementar redimensionamento forçado pré-vetorização |

---

## 8. Checklist de Sanidade

- [x] Plano e tracker lidos por completo
- [x] Todos os 6 arquivos novos do plano §7 verificados (1 substituído por decisão documentada)
- [x] 2 arquivos extras de F4.2 verificados
- [x] 3 arquivos de teste verificados
- [x] 9+4 arquivos modificados verificados
- [x] Critérios visuais §3.2 validados (4/4)
- [x] Feature flag `renderMode` funcional em todos os níveis
- [x] Fallback mask (`'mask'` default) preservado 100%
- [x] i18n completo (3 locales × 4 chaves)
- [x] Analytics `speed_paint_mode_changed` tipado e disparando
- [x] Persistência em `UserSettings` (dual storage) funcional
- [x] Pipeline end-to-end testado com 10 imagens diversas
- [x] MAX_PATHS_PER_SCENE = 500 implementado
- [x] Byte-oriented `createLogger` em vez de `console.log`
- [x] Sem `any`, tipos explícitos em todos os arquivos novos
- [x] Determinismo Remotion: zero `useEffect`/`useState` no caminho de render
- [x] `getLength()`/`getPointAtLength()` do `@remotion/paths` (sem `ref.getTotalLength()`)
- [x] Nenhum gap bloqueador encontrado

---

## 9. Recomendações de Release

### Versionamento

**`v0.131.0`** — mudança não-cosmética em core feature (reformulação do Speed Paint de máscara para vetorial).

### Changelog sugerido

```markdown
## v0.131.0 (2026-06-14)

### 🎨 Speed Paint Vetorial

- **Novo modo de renderização "Desenho"** — animação vetorial com paths SVG,
  onde as linhas crescem progressivamente e uma caneta segue a ponta do traço.
  Resultado visual: desenho à mão livre, não mais "raspadinha".
- **Modo "Clássico" preservado** — fallback mask 100% funcional para projetos
  existentes. Seletor no SpeedPaintPage.
- **Vetorização com `imagetracerjs`** — converte imagens raster em paths SVG
  no próprio navegador, com 16 presets de estilo.
- **Caneta SVG inline** — portada do `drawTool()` Canvas 2D, flutuação sutil,
  sem latência de fetch de sprite.
- **Persistência cross-sessão** — preferência de modo salva em UserSettings
  (dual storage Firestore/IndexedDB).
- **Analytics** — evento `speed_paint_mode_changed` para entender qual modo
  é mais popular.

### 🧪 Testes

- 2264 testes (incluindo 3 novos arquivos: vectorizer unit, integração, e2e
  com 10 imagens diversas).
- Pipeline vetorial validado com: flat design, multi-cores, gradiente, formas,
  linhas, alta densidade, 50×50, escura, clara, círculos aninhados.
```

### Gate humano

**Aguardando aprovação do Matheus** antes do merge e deploy.

---

## 10. Status Final

| Item | Status |
|---|---|
| **Status geral** | ✅ **Pronto para release v0.131.0** |
| **Critérios visuais §3.2** | ✅ 4/4 atendidos |
| **Arquivos novos** | ✅ 5/6 do plano + 2 extras + 3 testes = 11 criados (1 substituído por decisão) |
| **Arquivos modificados** | ✅ 9/9 do plano + 4 extras = 13 modificados |
| **Feature flag `renderMode`** | ✅ Funcional em store, pipeline, cache, controller, UI, persistência |
| **Fallback mask** | ✅ Preservado 100% (default `'mask'`) |
| **i18n** | ✅ 3 locales × 4 chaves |
| **Analytics** | ✅ `speed_paint_mode_changed` tipado e disparando |
| **Persistência** | ✅ Dual storage (Firestore + IndexedDB) |
| **Gaps bloqueadores** | ❌ Nenhum |
| **Gaps de atenção** | ⚠️ 4 (todos documentados como decisões conscientes ou imprecisões do plano) |
