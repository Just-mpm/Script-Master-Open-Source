# Plano: Consolidação do Modo "Desenho" (Vetorial) do Speed Paint

**Slug:** `speed-paint-vetorial-completo`
**Versão atual:** 0.131.0 (2026-06-14) → **Versão alvo:** 0.132.0 (minor)
**Data:** 2026-06-15
**Status:** ✅ **APROVADO** pelo Matheus (escopo total P0+P1+P2 confirmado)
**Tipo de release:** Minor — novas features + correções sem quebra de contrato
**Dependências adicionadas:** Nenhuma (`imagetracerjs@1.2.6` e `@remotion/paths@4.0.448` já cobrem tudo)

---

## Contexto

A v0.131.0 introduziu o modo "Desenho" (vetorial/whiteboard) do Speed Paint, mas a feature ficou **incompleta na integração** — o pipeline core funciona (vetorização + paths SVG + caneta), mas há **7 bugs funcionais** e **7 melhorias pedidas pelo usuário** que travam a experiência.

O usuário (Matheus, dono da Koda AI Studio) quer que o modo Desenho produza vídeos comparáveis ao **InstaDoodle** (vídeos whiteboard profissionais — referência de mercado). Ele testou o modo atual com foto do Luffy e não ficou satisfeito; depois mostrou uma imagem de **line art** (garoto pensando com lâmpada e setas) e quer saber se esse tipo de entrada funciona melhor.

### Resumo dos achados de investigação (validados no código real)

| # | Problema | Localização | RF |
|---|----------|-------------|-----|
| 1 | Tooltip `modeDescription` compartilhado entre Clássico e Desenho | `src/pages/SpeedPaintPage.tsx:852, 865` | RF-01 |
| 2 | `handleRenderModeChange` só chama `setRenderMode` — não reprocessa | `src/pages/SpeedPaintPage.tsx:299-307` | RF-02 |
| 3 | `BatchOrchestrator` chama `generateStrokesFromImage` sem `renderMode` | `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:102, 105` | RF-08 |
| 4 | `SpeedPaintEnhanceOptions` sem `renderMode`/`vetorialPreset` | `src/features/video-render/lib/speedPaintService.ts:26-28` | RF-04 |
| 5 | `VideoComposition` faz `scene.strokeAnimation as StrokeAnimation` (cast) | `src/features/video-render/components/VideoComposition.tsx:84` | RF-05 |
| 6 | `runBatchRender` documenta "não suporta modo vetorial em batch" | `src/features/speed-paint/store/speedPaintRenderController.tsx:760-768` | RF-07 |
| 7 | `isVetorialAnimation` em `strokeCache.ts:123` é `function`, não `export function` | `src/features/video-render/lib/strokeCache.ts:123-138` | GAP-16 |
| 8 | `VideoPage` não tem seletor de modo (só toggle on/off `animateScenes`) | `src/features/video-render/components/VideoExportPanel.tsx:255-275` | RF-06 |
| 9 | Falta seletor de `vetorialPreset` na UI (a store já tem o campo) | `src/pages/SpeedPaintPage.tsx` (ausente) | RF-03 |
| 10 | `WhiteboardScene` usa `interpolate` linear (sem easing) | `src/features/video-render/components/WhiteboardScene.tsx:123-128` | RF-10 |
| 11 | `videoRenderBridge` (58 linhas) não tem `renderMode`/`vetorialPreset` | `src/features/video-render/store/videoRenderBridge.ts:10-30` | RF-06 |
| 12 | `useVideoExporter` (`VideoExportOptions`) sem `renderMode`/`vetorialPreset` | `src/features/video-render/hooks/useVideoExporter.tsx:41-63` | RF-06 |

**Achados novos importantes** (redução de escopo — parte do trabalho já está pronto desde v0.131.0):

| # | Achado | Implicação |
|---|--------|-----------|
| **N1** | `PaintingJob.animation` JÁ é união `StrokeAnimation \| VetorialAnimation` em `src/features/speed-paint/types.ts:49` | M1 (Tipos) já está 80% pronto |
| **N2** | `animationStore` JÁ tem `renderMode` e `vetorialPreset` (linhas 19-22, 77-80) | Store já tem defaults `mask` + `artistic1` |
| **N3** | `strokeCache` JÁ discrimina por `mode` + `preset` no SHA-256 (linhas 143-181) | Cache está pronto |
| **N4** | `generateStrokesFromImage` JÁ aceita `renderMode`/`vetorialPreset` em `imageProcessing.ts:282-290` | Gerador está pronto |

---

## Escopo

### O que entra (12 RFs + 9 RNFs)

**P0 — Correções críticas (4 RFs):**
- **RF-01:** Tooltips individuais (Clássico ≠ Desenho) com `describeChild` e i18n dedicado
- **RF-02:** Reprocessamento ao trocar modo (com `AbortController` + `processingIdRef` para race condition)
- **RF-04:** `speedPaintService` propaga `renderMode`/`vetorialPreset` por toda a cadeia
- **RF-05:** `VideoComposition` discrimina `StrokeAnimation` vs `VetorialAnimation` via type guard real (sem `as`)

**P1 — Habilitar pipeline funcional (4 RFs):**
- **RF-03:** Seletor de `vetorialPreset` na UI (16 opções em 6 grupos)
- **RF-06:** Seletor de modo na `VideoPage` (escopo de sessão via `videoRenderBridge`)
- **RF-07:** Batch/lote suporta modo vetorial (`runBatchRender`)
- **RF-08:** `BatchOrchestrator` (modo watch) propaga `renderMode` da store

**P2 — Melhorias visuais (4 RFs, condicionais a gate L6):**
- **RF-09:** Ordem de desenho configurável (4 opções: top-down, center-out, big-first, random)
- **RF-10:** Easing configurável (linear / smooth / bounce) em `WhiteboardScene`
- **RF-11:** Caneta SVG mais "mão humana" (inclinação dinâmica + tremor determinístico)
- **RF-12:** Motion blur na caneta (filtro `feGaussianBlur` proporcional à velocidade)

### O que NÃO entra

- Snapshot/render de componentes Remotion em testes (pioneirismo, fora do escopo do projeto)
- Testes e2e com Playwright (não configurado)
- Backend/Cloud Functions (vetorização é 100% client-side, BYOK)
- Modo misto mask + vetorial no mesmo lote (lote uniforme)
- Stripe/billing/créditos (não existe — BYOK)
- Testes visuais de regressão (screenshot comparison)
- Editor de paths SVG manual
- Suporte a GIF animado como entrada
- Renderização no servidor
- Migração de dados legados de projetos v0.131.0 (eles continuam funcionando como mask)
- Refactor de arquitetura Zustand → outro state manager
- Reescrita do `imagetracerjs` ou substituição
- Novas dependências externas
- Reordenação de `QueueStaging`, `ImageUpload`, `AnimationDurationSelector` (CT-C12)
- COEP / SharedArrayBuffer (manter comportamento atual)
- Sistema de skills (não relacionado)

---

## Decisões (MDE)

### Decisões Tomadas (14 do architecture + 8 do planner)

| # | Decisão | Problema | Opções | Escolha | Justificativa | Fonte |
|---|---------|----------|--------|---------|---------------|-------|
| **MDE-01** | Como `VideoComposition` discrimina modos | Como renderizar cenas com `VetorialAnimation` sem cast | (a) `as StrokeAnimation` (atual); (b) type guard `'paths' in animation`; (c) campo `kind` em `VetorialAnimation` | **(b) type guard real** | Sem `as`, sem novo campo, narrowing type-safe, padrão já existe em 2 lugares (SpeedPaintPlayer + strokeCache) | architecture §MDE-01 |
| **MDE-02** | Propagação de `renderMode` no pipeline | Como fazer o modo chegar ao gerador | (a) Context React; (b) parâmetros explícitos; (c) singleton global | **(b) parâmetros explícitos em toda a cadeia** (service → renderer → cache → generateStrokesFromImage) | Explícito, testável, type-safe, sem dependência implícita | architecture §MDE-02 |
| **MDE-03** | BatchOrchestrator obtém modo | De onde vem o modo no batch individual | (a) Props do pai; (b) leitura da store | **(b) store Zustand** (`useAnimationStore`) | Self-contained, mesma origem que UI consome | architecture §MDE-03 |
| **MDE-04** | Reprossamento ao trocar modo | Quando re-processar | (a) Imediato sem debounce; (b) com debounce 500ms; (c) só no botão "salvar" | **(a) Imediato + consulta cache primeiro + race protection** | UX direta; cache hit evita reprocessamento; `processingIdRef` evita race | architecture §MDE-04 |
| **MDE-05** | Seletor de preset na UI | Onde/como mostrar 16 presets | (a) `Select` MUI simples; (b) `Select` com `ListSubheader` agrupado; (c) galeria visual | **(b) `Select` + 6 grupos (Artístico, Posterizado, Suavizado, Detalhado, Cinza, Amostragem)** | Padrão MUI nativo, acessível, escala bem, i18n organizado | architecture §MDE-05 |
| **MDE-06** | Onde mora o easing | Como tornar configurável | (a) Em `VetorialAnimation` (dados); (b) em `WhiteboardSceneProps` (config); (c) global | **(b) `WhiteboardSceneProps.easing?: EasingFunction`** + store + UserSettings | Não polui dados da animação; config por uso | architecture §MDE-06 |
| **MDE-07** | Ordem de desenho | Onde aplicar a ordenação | (a) No `vectorizer.ts`; (b) no `imageProcessing.ts`; (c) helper externo | **(a) Função pura `sortPaths()` em `vectorizer.ts`** com 4 opções | Função pura testável, próxima dos dados | architecture §MDE-07 |
| **MDE-08** | Caneta realista | Como parecer "mão humana" | (a) Variação aleatória; (b) inclinação por tangente + tremor determinístico | **(b) Inclinação por tangente do path ativo + tremor subpixel determinístico (frame + pathIndex) + sombra `feDropShadow`** | Determinístico (Remotion), visualmente natural | architecture §MDE-08 |
| **MDE-09** | Motion blur | Como dar sensação de velocidade | (a) Sempre ligado; (b) só quando velocidade > threshold; (c) filtro global | **(b) `feGaussianBlur` com `stdDeviation` proporcional à velocidade, ativo só quando `speed > 1.5px/frame`** | Performance preservada em frame parado | architecture §MDE-09 |
| **MDE-10** | Cache invalidation | Como invalidar quando modo/preset muda | (a) Limpar tudo; (b) recriar chave | **(b) Chave SHA-256 já inclui `mode + preset`** (já existe em strokeCache) — não invalidar | Coexistência natural, zero invalidação manual | architecture §MDE-10 |
| **MDE-11** | Retrocompatibilidade | Como não quebrar v0.131.0 | (a) Feature flag; (b) default = mask + union discrimada; (c) migração de dados | **(b) `mask` default, união discriminada, type guards runtime, params opcionais** | Projetos antigos continuam funcionando sem migração | architecture §MDE-11 |
| **MDE-12** | Modo na VideoPage | Escopo do modo | (a) Global (sempre compartilhado com SpeedPaintPage); (b) sessão (sincroniza ao entrar); (c) local | **(b) Sessão via `videoRenderBridge`** (sincroniza com `animationStore` ao entrar, override local não afeta SpeedPaint) | Cada rota tem contexto, sem vazamento | architecture §MDE-12 |
| **MDE-13** | Batch lote vetorial | Lote uniforme vs misto | (a) Uniforme (mesmo modo); (b) misto (cada cena escolhe); (c) fallback mask | **(a) Uniforme conforme modo vigente** na exportação | Simples, previsível, evita complexidade | architecture §MDE-13 |
| **MDE-14** | `PaintingJob.animation` typing | Como tipar união | (a) Só `StrokeAnimation`; (b) union com `VetorialAnimation` | **(b) `StrokeAnimation \| VetorialAnimation`** (já parcialmente aplicado em v0.131.0) | type-safe, narrowing via type guard | architecture §MDE-14 |
| **D05** | Padrão de nomenclatura i18n dos presets | Como nomear 16 chaves + 6 grupos | (a) `preset.1` numérico; (b) `preset.artistic1` técnico; (c) `presets.artistic1` + `presetGroups.artistic` | **(c) `speedPaint.presets.{presetName}` + `speedPaint.presetGroups.{groupName}`** | Organização clara, tradução real | planner §L4 |
| **D06** | Easing — duração uniforme vs velocidade linear | Como variar velocidade | (a) Velocidade proporcional ao `length` do path; (b) duração uniforme com ease-in-out | **(b) Duração uniforme com `Easing.inOut(Easing.ease)`** | Padrão InstaDoodle, visualmente fluido | planner §L10 |
| **D07** | Algoritmo Center-Out (RF-09) | Como definir "centro" | (a) Centro geométrico (width/2, height/2); (b) bounding box do path mais relevante | **(a) Centro geométrico** | Simples e previsível | planner §L9 |
| **D08** | Prioridade RF-11/12 | Quando fazer caneta + motion blur | (a) v0.132.0; (b) v0.133.0+ | **(a) v0.132.0 (P2)** — manter opção de cancelar no gate L6 | Decisão padrão, gate permite cancelamento | planner §L11 |

### Decisões Confirmadas pelo Matheus (2026-06-15)

| ID | Decisão | Escolha | Justificativa | Bloqueia |
|----|---------|---------|---------------|----------|
| **D02** | Mecanismo de propagação na VideoPage (RF-06) | ✅ **`videoRenderBridge` Zustand** | GAP-02 era falso positivo — store existe, 7 imports, padrão do projeto | L7 (P2) |
| **D03** | Escopo do seletor na VideoPage | ✅ **Sessão** (sync ao entrar) | Override local não vaza para SpeedPaint; cada rota tem contexto próprio | L7 (P2) |
| **D04** | Lote uniforme vs misto (RF-07) | ✅ **Uniforme** (modo vigente na exportação) | Simples, previsível, evita complexidade de casos mistos | L8 (P2) |
| **D07** | Prioridade RF-11/12 (caneta, motion blur) | ✅ **v0.132.0 (P2)** | Gate L6 permite cancelar se houver problema | L11 (P2) |
| **D08** | Texto da limitação na UI (fotos vs line art) | ✅ **"Modo Desenho funciona melhor com ilustrações e line art. Fotos podem não ficar ideais."** | Honesto e educativo, no tooltip do seletor de preset | L4 |

> **Escopo confirmado:** **P0 + P1 + P2 (12 leivas completas)**. Versão alvo **0.132.0** (minor).
> **Aprovações obtidas em conversa direta com o Matheus em 2026-06-15.**

---

## Reutilização e Padrões

### O que reaproveitar (sem criar do zero)

- **`WhiteboardScene.tsx`** (`src/features/video-render/components/WhiteboardScene.tsx`) — componente Remotion SVG já pronto, com `Pencil` SVG inline. **Já renderiza `VetorialAnimation`** — só falta conectar.
- **`WhiteboardComposition.tsx`** (`src/features/speed-paint/components/WhiteboardComposition.tsx`) — já existe para cena única.
- **`vectorizer.ts`** (`src/features/speed-paint/lib/vectorizer.ts`) — wrapper do `imagetracerjs` com `vectorizeImage` e `VectorizeOptions`.
- **`strokeCache.ts`** (`src/features/video-render/lib/strokeCache.ts`) — LRU cache que JÁ discrimina por `mode: 'mask' | 'vetorial'` (SHA-256 inclui `mode + preset`).
- **`VetorialPath`, `VetorialAnimation`, `VetorialPreset`** (`src/features/speed-paint/types/vetorial.ts`) — tipos já definidos.
- **`SpeedPaintPlayer.tsx`** — JÁ discrimina via type guard real `'paths' in animation` (linha 100-104).
- **`createExportableWhiteboardComposition()`** (`speedPaintRenderController.tsx:212`) — JÁ implementado para cena única vetorial.
- **`Motion` (Framer Motion)** — já no projeto para animações.
- **`StackedHeader`** (`src/components/ui/`) — header genérico com `collapsible` e `action`.
- **`useSyncSpeedPaintRenderMode`** — padrão de persistência dual storage (Firestore + IndexedDB) com debounce 2s.
- **`useCollapsibleSection`** (`src/hooks/useCollapsibleSection.ts`) — hook de UI collapsível.
- **`createFirestoreConverter<T>()`** — conversor genérico Firestore.

### Padrões a seguir

- **Type guard real, sem `as` bypass** — `'paths' in animation` em vez de cast
- **AbortController em escopo de módulo** para render singleton (já usado nos controllers)
- **`processingIdRef` + race protection** (padrão do `BatchOrchestrator.tsx:33-35`)
- **Lazy import de Remotion** (preserva bundle principal)
- **`useShallow` Zustand** para seletores otimizados
- **`createLogger('contexto')`** para logging modular
- **`trackAnalyticsEvent`** em mudanças significativas de UX
- **Namespace i18n `speedPaint.*`** organizado em 3 locales (pt-BR, en, es)
- **Memo + forwardRef em componentes Remotion** (genéricos do `@remotion/player`)

### O que evitar

- `@ts-ignore`, `@ts-expect-error`, `eslint-disable` (corrija a causa raiz)
- Casts `as` para bypass de tipos
- Re-renders globais por mudança de seletor simples (usar `useShallow` + seletores primitivos)
- `useEffect` cleanup que aborta render (removido dos controllers — não reintroduzir)
- Snapshots de componentes Remotion (pioneirismo, fora do escopo)
- Dependências novas (já temos tudo)

---

## Arquivos e Áreas Prováveis

### Mapa de mudanças por arquivo (19 total)

| Arquivo | Tipo de mudança | RFs | Leiva | Source |
|---------|-----------------|-----|-------|--------|
| `src/features/video-render/lib/strokeCache.ts` | Adicionar `export` em 2 funções (GAP-16) | — (infra) | L0 | — |
| `src/features/video-render/lib/speedPaintService.ts` | Estender `SpeedPaintEnhanceOptions` com `renderMode`/`vetorialPreset` | RF-04 | L1 | — |
| `src/features/video-render/lib/speedPaintRenderer.ts` | Estender `GenerateSpeedPaintOptions` com `renderMode`/`vetorialPreset`; propagar | RF-04 | L1 | — |
| `src/features/video-render/hooks/useSpeedPaintEnhancer.ts` | Estender `UseSpeedPaintEnhancerOptions`; ler da store | RF-04 | L1 | — |
| `src/features/video-render/types.ts` | `VideoScene.strokeAnimation: StrokeAnimation \| VetorialAnimation \| undefined` | RF-05 | L2 | — |
| `src/features/video-render/components/VideoComposition.tsx` | Type guard real + branch condicional (`WhiteboardScene` vs `SpeedPaintScene`) | RF-05 | L2 | — |
| `src/pages/SpeedPaintPage.tsx` | Tooltips individuais (RF-01); reprocessamento (RF-02); seletor de preset (RF-03) | RF-01, RF-02, RF-03 | L3, L4 | — |
| `src/features/speed-paint/components/batch/BatchOrchestrator.tsx` | Adicionar leitura de `renderMode`/`vetorialPreset` da store | RF-08 | L5 | — |
| `src/features/video-render/store/videoRenderBridge.ts` | Adicionar `renderMode` + `vetorialPreset` + action `syncRenderMode` | RF-06 | L7 (P2) | — |
| `src/features/video-render/hooks/useVideoExporter.tsx` | Estender `VideoExportOptions` com `renderMode`/`vetorialPreset` | RF-06 | L7 (P2) | — |
| `src/features/video-render/components/VideoExportPanel.tsx` | `ToggleButtonGroup` condicional quando `animateScenes === true` | RF-06 | L7 (P2) | — |
| `src/pages/VideoPage.tsx` | Ao montar: `syncRenderMode(animationStore.renderMode, vetorialPreset)` | RF-06 | L7 (P2) | — |
| `src/features/speed-paint/store/speedPaintRenderController.tsx` | `runBatchRender` aceita `renderMode`/`vetorialPreset`; remove limitação | RF-07 | L8 (P2) | — |
| `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` | Estender `SpeedPaintBatchExportOptions` com `renderMode`/`vetorialPreset` | RF-07 | L8 (P2) | — |
| `src/features/speed-paint/lib/vectorizer.ts` | Nova função pura `sortPaths()` com 4 ordenações | RF-09 | L9 (P2) | — |
| `src/features/speed-paint/types/vetorial.ts` | Tipo `VetorialPathSortOrder`; `VetorialEasingType` | RF-09, RF-10 | L9, L10 (P2) | — |
| `src/features/video-render/components/WhiteboardScene.tsx` | Easing configurável (RF-10); caneta melhorada (RF-11); motion blur (RF-12) | RF-10, RF-11, RF-12 | L10, L11 (P2) | — |
| `src/features/speed-paint/store/animationStore.ts` | Adicionar `easing: VetorialEasingType` (default = `'smooth'`) | RF-10 | L10 (P2) | — |
| `src/features/i18n/locales/{pt-BR,en,es}.ts` | Novas chaves: `modeClassicTooltip`, `modeVetorialTooltip`, `vetorialPresetLabel`, 16 `presets.*` + 6 `presetGroups.*`, 3 `easing.*` | RF-01, RF-03, RF-10 | L3, L4, L10 | — |

### Áreas do projeto

| Área | Caminho | Mudanças |
|------|---------|----------|
| Speed Paint & Animação | `src/features/speed-paint/` | L3, L4, L5, L8, L9 (P2) |
| Renderização de Vídeo | `src/features/video-render/` | L1, L2, L7 (P2), L10, L11 (P2) |
| i18n | `src/features/i18n/locales/` | L3, L4, L10 (P2) |
| Páginas | `src/pages/` | L3, L4, L7 (P2) |
| Tipos compartilhados | `src/features/speed-paint/types/` | L2, L9, L10 (P2) |

---

## Estratégia Técnica

### Arquitetura (camadas)

```
┌─────────────────────────────────────────────────────────────────────┐
│  M4: UI SpeedPaintPage       M5: UI VideoPage (P2)                  │
│  (RF-01/02/03)               (RF-06)                                 │
│  └─ ToggleButtonGroup        └─ ToggleButtonGroup (clone)            │
│  └─ StackedHeader+Select     └─ Tooltip + Select                     │
│  └─ handleRenderModeChange   └─ videoRenderBridge sync               │
├─────────────────────────────────────────────────────────────────────┤
│  M6: Batch / Lote                                                      │
│  (RF-08 P1 / RF-07 P2)                                                  │
│  └─ BatchOrchestrator propaga store                                     │
│  └─ runBatchRender aceita renderMode (P2)                                │
├─────────────────────────────────────────────────────────────────────┤
│  M2: Pipeline de Vídeo (Service)                                          │
│  (RF-04)                                                                  │
│  └─ speedPaintService.ts: SpeedPaintEnhanceOptions + renderMode/preset    │
│  └─ speedPaintRenderer.ts: GenerateSpeedPaintOptions + propagação         │
│  └─ useSpeedPaintEnhancer.ts: UseSpeedPaintEnhancerOptions + propagação   │
│  └─ strokeCache.ts: já discrimina mode+preset (pronto)                    │
├─────────────────────────────────────────────────────────────────────┤
│  M3: Composição Remotion (Render)                                          │
│  (RF-05)                                                                  │
│  └─ VideoComposition.tsx: type guard + branch WhiteboardScene/Mask        │
│  └─ WhiteboardScene.tsx: usa VetorialAnimation                            │
│  └─ SpeedPaintScene.tsx: branch mask inalterada                            │
├─────────────────────────────────────────────────────────────────────┤
│  M7: Lib Vetorização & Whiteboard (P2)                                     │
│  (RF-09/10/11/12)                                                          │
│  └─ vectorizer.ts: sortPaths()                                              │
│  └─ WhiteboardScene.tsx: easing + caneta + motion blur                    │
├─────────────────────────────────────────────────────────────────────┤
│  M1: Core Types & Type Guards (Base)                                       │
│  └─ types.ts: PaintingJob.animation (já união)                              │
│  └─ video-render/types.ts: VideoScene.strokeAnimation (estender)            │
│  └─ strokeCache.ts: export isVetorialAnimation (GAP-16)                     │
└─────────────────────────────────────────────────────────────────────┘

  M8: i18n & Acessibilidade (cross-cutting — acompanha M4, M5)
```

### Fluxo do usuário (antes → depois)

**Antes (v0.131.0):**
1. Usuário abre SpeedPaintPage
2. Faz upload de imagem
3. Vê seletor "Clássico | Desenho" com tooltip duplicado
4. Clica em "Desenho" → **nada acontece visualmente** (estado muda, mas `job.animation` continua mask)
5. Sem seletor de preset — sempre `artistic1`
6. Se for na VideoPage, modo é fixo (sem seletor)
7. Lote sempre é mask mode

**Depois (v0.132.0):**
1. Usuário abre SpeedPaintPage
2. Faz upload de imagem
3. Vê seletor "Clássico | Desenho" com tooltips distintos
4. Clica em "Desenho" → **reprocessamento visível** (loading) → preview whiteboard
5. Seletor de preset aparece (16 opções em 6 grupos) → reprocessa ao mudar
6. Na VideoPage, seletor aparece quando `animateScenes === true`
7. Lote respeita o modo vigente
8. (P2) Ordem de desenho configurável, easing suave, caneta realista, motion blur

### Fluxo técnico (pipeline de dados)

```
UI (SpeedPaintPage)
  ↓ setRenderMode / setVetorialPreset
useAnimationStore (Zustand)
  ↓ renderMode + vetorialPreset
handleRenderModeChange (SpeedPaintPage.tsx)
  ↓ generateStrokesFromImage({ renderMode, vetorialPreset })
imageProcessing.generateStrokesFromImage
  ↓ branch: renderMode === 'vetorial' → processVetorialOnMainThread → vectorizeImage (imagetracerjs)
  ↓ branch: renderMode === 'mask' (default) → processOnMainThread + Worker
  ↓ retorna StrokeAnimation | VetorialAnimation
job.animation (PaintingJob)
  ↓ discriminated union
SpeedPaintPlayer
  ↓ 'paths' in animation? (type guard real)
VetorialPlayer → WhiteboardComposition → WhiteboardScene
  OU
MaskPlayer → SpeedPaintComposition → SpeedPaintScene
```

```
VideoPage (useSpeedPaintEnhancer)
  ↓ enhanceScenesWithSpeedPaint({ renderMode, vetorialPreset })
speedPaintService.enhanceScenesWithSpeedPaint
  ↓ propaga para generateScenesWithSpeedPaint
speedPaintRenderer.generateScenesWithSpeedPaint
  ↓ para cada cena: generateStrokesFromImage({ renderMode, vetorialPreset })
  ↓ cache hit? strokeCache.getStrokeAnimation(url, { mode, preset })
  ↓ cache miss? generateStrokesFromImage → store
VideoComposition
  ↓ 'paths' in scene.strokeAnimation? (type guard real)
WhiteboardScene ou SpeedPaintScene
```

### Estratégia de cache

- **Chave SHA-256** em `strokeCache.ts:143-181` já inclui `mode + preset`
- **Não invalidar** quando modo/preset muda (MDE-10) — chave diferente gera cache diferente
- **Coexistência natural** de `StrokeAnimation` (modo mask) e `VetorialAnimation` (modo vetorial) para a mesma imagem
- **LRU 20 entradas** preservado

### Estratégia de re-processamento (RF-02)

```typescript
const processingIdRef = useRef<string | null>(null);
const abortControllerRef = useRef<AbortController | null>(null);

const handleRenderModeChange = async (newMode) => {
  if (newMode == null) return;
  setRenderMode(newMode);
  trackAnalyticsEvent('speed_paint_mode_changed', { mode: newMode });

  const { job, vetorialPreset } = useAnimationStore.getState();
  if (!job.inputImage || job.status === 'processing') return;

  // 1. Aborta processamento anterior
  abortControllerRef.current?.abort();
  const ac = new AbortController();
  abortControllerRef.current = ac;

  // 2. Marca ID para race protection
  const processId = `${Date.now()}-${Math.random()}`;
  processingIdRef.current = processId;
  setJob({ status: 'processing', progress: 0 });

  try {
    // 3. Consulta cache primeiro (evita reprocessamento desnecessário)
    const cached = await getStrokeAnimation(job.inputImage, {
      mode: newMode,
      preset: vetorialPreset,
    });
    if (cached) {
      if (processingIdRef.current !== processId) return;
      setJob({ animation: cached, status: 'completed', progress: 1 });
      return;
    }

    // 4. Gera e cacheia
    const animation = await generateStrokesFromImage(
      job.inputImage,
      (p) => {
        if (processingIdRef.current !== processId) return;
        setJob({ progress: p });
      },
      { renderMode: newMode, vetorialPreset, signal: ac.signal },
    );
    if (processingIdRef.current !== processId) return;
    setJob({ status: 'completed', animation, progress: 1 });
    await setStrokeAnimation(job.inputImage, animation, {
      mode: newMode,
      preset: vetorialPreset,
    });
  } catch (err) {
    if (ac.signal.aborted) return;
    if (processingIdRef.current !== processId) return;
    log.error('Falha ao reprocessar imagem', { error: err });
    setJob({ status: 'failed' });
  }
};
```

### Estratégia de retrocompatibilidade (MDE-11)

- **`DEFAULT_RENDER_MODE = 'mask'`** inalterado (linha 19 do `animationStore.ts`)
- **`renderMode` e `vetorialPreset` opcionais** em todas as interfaces (default = `undefined` → mask)
- **Type guard runtime** discrimina união `StrokeAnimation | VetorialAnimation`
- **Projetos v0.131.0 salvos** continuam funcionando como mask por padrão
- **`'as' bypass`** proibido — apenas narrowing real via type guard

### Limites e validações

- **`MAX_PATHS_PER_SCENE = 500`** (v0.131.0) — truncamento + `log.warn` em vetorização
- **`PATHOMIT_BY_PRESET`** heurístico por preset (presets "ricos" como `'detailed'`/`'artistic4'` têm `pathomit` mais alto)
- **Latência < 500ms** para 1920×1080 (RNF-01)
- **Performance P95 < 1000ms** para 1080p (contract §12)
- **`BLUR_THRESHOLD = 1.5px/frame`** — motion blur só quando velocidade > threshold (RF-12)
- **`stdDeviation` máx 3px** — evita degradação de FPS (RF-12)

---

## Passos de Implementação

> **Ordem completa detalhada:** ver `docs/plan/speed-paint-vetorial-completo-tracker.md` (documento vivo).
> **Resumo:** 12 leivas + 2 gates (L0-L12).

### Resumo das leivas

| Leiva | Módulo | RFs | Estimativa | Agents |
|-------|--------|-----|------------|--------|
| **L0** | M1 — Preparação (export type guard) | GAP-16 | S (5 min) | fixer |
| **L1** | M2 — Pipeline de vídeo (RF-04) | RF-04 | M (3-4h) | worker + test |
| **L2** | M3 — VideoComposition (RF-05) | RF-05 | S (1-2h) | worker + test |
| **L3** | M4 parte A — UI SpeedPaintPage (RF-01, RF-02) | RF-01, RF-02 | M (4-5h) | worker + ui-designer + test |
| **L4** | M4 parte B — Seletor de preset (RF-03) | RF-03 | M (3-4h) | ui-designer + worker + test |
| **L5** | M6 — BatchOrchestrator (RF-08) | RF-08 | S (1-2h) | worker + test |
| **L6** | **GATE** — Smoke release 0.132.0-rc.1 | — | 30 min | validação |
| **L7** (P2) | M5 — UI VideoPage (RF-06) | RF-06 | M (4-5h) | ui-designer + worker + test |
| **L8** (P2) | M6 — Batch lote vetorial (RF-07) | RF-07 | M (3-4h) | worker + test |
| **L9** (P2) | M7 — sortPaths (RF-09) | RF-09 | S (2-3h) | worker + test |
| **L10** (P2) | M7 — Easing (RF-10) | RF-10 | M (3-4h) | worker + ui-designer + test |
| **L11** (P2) | M7 — Caneta + motion blur (RF-11, RF-12) | RF-11, RF-12 | L (6-8h) | worker + test |
| **L12** | **GATE** — Smoke release 0.132.0 final | — | 1h | release |

### Validações obrigatórias por leiva

- Após L0: `lint`, `typecheck`
- Após L1, L2, L3, L5, L8: `lint`, `typecheck`, `test`, **code-validator**
- Após L3, L4, L7, L10, L11: `lint`, `typecheck`, `test`, **code-validator + gap-finder** + smoke manual
- Após L6, L12: todas as 9 etapas do contract (lint → typecheck → unit → integration → build → estática → smoke manual → deploy:preview → validar)
- Antes de L12 (tag 0.132.0): validação final macro

### Notebooks a consultar

| Notebook | ID | Quando |
|----------|----|--------|
| Remotion Guide | `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` | L2, L8 (composições), L10, L11 (filtros SVG) |
| React Docs | `8765c786-5be2-4b46-a20c-4ef666804801` | L3 (useCallback, race condition) |
| MUI Docs | `6288089b-58c5-4a0e-a55b-5408e559ae8a` | L3 (Tooltip describeChild), L4 (Select+ListSubheader, StackedHeader) |
| Motion Guide | `697b773a-32b4-43a3-8048-eb85b473176d` | L11 (motion blur SVG) |
| Vitest Guide | `6f3a1b12-a3df-4f31-9ea1-083ba644399a` | L3 (mocks async), todas (testes gerais) |

---

## Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação | Fonte |
|-------|---------|---------------|-----------|-------|
| **Regressão no modo mask** (quebrar projetos v0.131.0) | **Crítico** | Baixa | RNF-07: default `mask` + 2268 testes baseline + code-validator após cada L + 12 testes de retrocompat | — |
| **Race condition no reprocessamento** (RF-02) | Médio | Média | `processingIdRef` + `AbortController` (padrão do `BatchOrchestrator.tsx:33-35`) | — |
| **Cache colisão** | Médio | Baixa | SHA-256 já inclui `mode + preset` (MDE-10) — impossível colidir | — |
| **Type guard narrowing falha** em edge case | Médio | Baixa | Reutilizar `isVetorialAnimation` já testada; React Docs confirma narrowing | — |
| **Remotion lag com > 500 paths** | Alto | Baixa | `MAX_PATHS_PER_SCENE = 500` mantido; `PATHOMIT_BY_PRESET` preservado | — |
| **i18n drift** entre 3 locales | Médio | Média | Validar com `grep` em cada locale; CT-I01 automatizado | — |
| **Escopo de L7+ estourar** (decisões D02/D03/D04 pendentes) | Médio | Média | Decisões padrão já propostas; gate L6 permite cancelar P2 inteiro | — |
| **Test coverage < 80%** em funções novas | Baixo | Média | CT-T12 automatizado; code-validator verifica | — |
| **L11 (caneta + motion blur) degradar FPS** | Médio | Média | `BLUR_THRESHOLD = 1.5` + `stdDeviation` máx 3px; smoke test RNF-02 | — |
| **Worker inline falha em Safari** | Médio | Média | Fallback main thread já existe (RNF-01) | — |
| **Limitações do `imagetracerjs` com texto** ("e as" vira tracinhos) | Baixo | Alta | Documentar como limitação na UI do seletor de preset (D08) | requirements §Riscos |

---

## Verificação

### Checklist obrigatório (Gate de Qualidade da skill arquiteto)

- [x] **Contrato**: todas as seções obrigatórias estão presentes (Contexto, Escopo, MDE, Reutilização, Arquivos, Estratégia, Passos, Riscos, Verificação, Notebooks)
- [x] **Cobertura**: 8 áreas do mapeamento têm passo no plano (M1-M8 + i18n M8)
- [x] **Rastreio**: cada passo cita a seção correspondente deste plano
- [x] **Decisões (MDE)**: 14 MDEs do architecture + 8 do planner, todos com problema + opções + escolha + justificativa
- [x] **Dependências**: ordem L0→L12 respeita dependências (grafo acíclico documentado)
- [x] **Riscos**: 11 riscos listados, cada um com mitigação específica
- [x] **Testabilidade**: 132 critérios observáveis neste plano (CT-F01 a CT-S06)
- [x] **Reutilização**: identificou 12 itens a NÃO criar do zero (seção "Reutilização e Padrões")
- [x] **Tokens**: cada leiva cabe no budget (~50K tokens; L11 é a maior com 6-8h)
- [x] **Contradições**: rodadas 1+2+3 do gap-finder harmonizaram requirements × architecture × contract
- [x] **Tracker**: será gerado em `docs/plan/speed-paint-vetorial-completo-tracker.md` (Fase 7.5)
- [x] **Fases**: tracker organiza 12 leivas + 2 gates com agents, notebooks, dependências
- [x] **Documento Vivo**: esta seção abaixo instrui o orquestrador a seguir e atualizar o tracker

### Validação funcional

- [ ] Tooltip Clássico ≠ Tooltip Desenho (RF-01)
- [ ] Trocar modo reprocessa a imagem com loading visível (RF-02)
- [ ] `videoRenderController.startRender` propaga `renderMode` para o pipeline (RF-04)
- [ ] `VideoComposition` renderiza `WhiteboardScene` quando `paths` presente (RF-05)
- [ ] Seletor de preset aparece no modo Desenho com 16 opções em 6 grupos (RF-03)
- [ ] `BatchOrchestrator` propaga `renderMode`/`vetorialPreset` da store (RF-08)

### Validação técnica

- [ ] `bun run lint` — 0 erros, 0 warnings
- [ ] `bun run typecheck` — 0 erros
- [ ] `bun run test` — 2268+ testes passando + novos testes
- [ ] `bun run build` — sucesso em ~1s
- [ ] `bun run build:full` — pre-render das 10 rotas públicas OK
- [ ] Sem `@ts-ignore`, `@ts-expect-error`, `eslint-disable` (CT-S01)
- [ ] Sem cast `as StrokeAnimation` em `VideoComposition.tsx` (GAP-05)

### Regressão principal

- [ ] Projetos salvos na v0.131.0 ainda renderizam idênticos (modo `mask` default)
- [ ] Todos os 2268 testes baseline passando
- [ ] Modo Clássico continua funcionando sem mudanças
- [ ] i18n 3 locales sem regressão

### Comandos de verificação

```bash
# Após cada leiva
bun run lint
bun run typecheck
bun run test

# Após L1, L2, L3, L5, L7, L8, L10, L11
bun run test tests/speed-paint/  # ou tests/video-render/
bun run test -- --coverage  # verifica threshold ≥80%

# Antes de L6, L12
bun run build
bun run build:full
bun run deploy:preview  # testar em ambiente preview
```

---

## Instruções de Execução

### Tracker de Execução (Documento Vivo)

O **Tracker** (`docs/plan/speed-paint-vetorial-completo-tracker.md`) é o documento de execução que deve ser **seguido e atualizado** durante todo o processo:

- **Siga a ordem das leivas** — cada leiva tem agents, notebooks e dependências definidos; não pule leivas nem mude a ordem sem registrar o motivo
- **Marque tarefas concluídas** — após cada leiva ser finalizada (execução + validações), atualize o tracker com o status real
- **Registre desvios** — se precisar mudar a ordem, adicionar tarefa, pular algo ou ajustar escopo, documente no tracker para rastreabilidade
- **Mantenha sincronizado** — o tracker deve refletir o estado real da execução, não só o planejado; se um passo levou mais tempo ou precisou de agent extra, anote
- **Use como checklist de release** — ao final de cada release, confira se todas as leivas da release estão marcadas como concluídas antes de rodar o `pre-deploy-check`
- **Reabrir se necessário** — se o `gap-finder` ou `code-validator` apontarem problemas numa leiva já marcada como concluída, reabra-a, corrija e valide novamente

### Investigação

Antes de modificar, use `suggest_reads`, `impact_analysis` e `file_context` nos arquivos listados. Consulte os Notebooks Relevantes para confirmar padrões.

### Divisão do Trabalho

- **Budget por agent:** ~50K tokens (use `calculator_token_count` para medir)
- **Agrupe por afinidade**; nunca dois agents modificando o mesmo arquivo no mesmo lote
- **A ordem sugerida nos passos já reflete dependências entre eles**

### Execução

- **Passos sem dependência → paralelo (max 2 agents por tool calls)**
- **Passos dependentes → sequencial**
- **Após cada lote: lint + type-check (0 erros, 0 warnings)**
- **Proibido `@ts-ignore`, `@ts-expect-error` ou `eslint-disable`** — corrija a causa raiz

### Branch e PRs

- **Branch:** `feature/speed-paint-vetorial-completo` (a partir de `main` na tag 0.131.0)
- **PRs intermediários:** 1 PR por leiva (L0-L11) + 1 PR de release (L12) — total 12 PRs
- **Tag:** `v0.132.0` ao final de L12

---

## Notebooks Relevantes

| Notebook | ID | Quando consultar |
|----------|----|------------------|
| Remotion Guide | `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` | L2, L8 (composições), L10, L11 (filtros SVG) |
| React Docs | `8765c786-5be2-4b46-a20c-4ef666804801` | L3 (useCallback, race condition) |
| MUI Docs | `6288089b-58c5-4a0e-a55b-5408e559ae8a` | L3 (Tooltip describeChild), L4 (Select+ListSubheader, StackedHeader) |
| Motion Guide | `697b773a-32b4-43a3-8048-eb85b473176d` | L11 (motion blur SVG) |
| Vitest Guide | `6f3a1b12-a3df-4f31-9ea1-083ba644399a` | L3 (mocks async), todas (testes gerais) |
| Zod V4 | `f9f690f9-489c-441b-9b84-16847c5676d2` | (não aplicável — sem schemas novos) |
| Node 24 Guide | `0322d68e-9e17-4ae2-8df9-33bb2d305976` | (não aplicável — só frontend) |

---

## Resumo de Cross-Validation

- **Rodada 1 (requirements):** 8 gaps encontrados (2 ALTO, 3 MÉDIOS, 3 BAIXOS)
  - GAP-02 (ALTO) era **falso positivo** — `videoRenderBridge` existe como store Zustand
  - Outros gaps resolvidos em rodadas seguintes
- **Rodada 2 (architecture vs requirements):** 7 gaps encontrados (1 ALTO, 3 MÉDIOS, 3 BAIXOS)
  - GAP-09 (ALTO): prioridade RF-06/RF-07 resolvida por decisão padrão (P2)
  - GAP-10/11/12 (MÉDIOS): arquivos adicionados ao escopo
- **Rodada 3 (consolidação final):** 19 gaps totais (1 ALTO, 5 MÉDIOS, 9 BAIXOS)
  - Todos os 5 gaps ALTO resolvidos por decisão padrão
  - 4 gaps MÉDIOS corrigíveis durante implementação
  - 9 gaps BAIXOS opcionais
  - **Veredicto: ✅ Plano aprovado para escrita do plano final**

---

## Próximo Passo Imediato

**1. Responder 5 decisões pendentes (D02-D08)** com o Matheus — pode aprovar tudo de uma vez assumindo os padrões sugeridos.

**2. Iniciar L0** (micro-leiva, 5 minutos) — exportar `isVetorialAnimation` e `isStrokeAnimation` em `strokeCache.ts:123-138`. Resolve GAP-16 e destrava L2.

**3. Seguir a ordem proposta:**
- L0 (5 min) → L1 (3-4h) → L2 (1-2h) → L3 (4-5h) → L4 (3-4h) → L5 (1-2h) → **gate L6** → decisão P2 → L7-L11 (se aprovadas) → **gate L12**

**4. Para executar o plano em outro chat:**
> Envie: `Execute o plano em docs/plan/speed-paint-vetorial-completo-plano-final.md seguindo o tracker em docs/plan/speed-paint-vetorial-completo-tracker.md`

---

*Plano final consolidado por Nexus em 2026-06-15.*
*Plano final consolidado por Nexus em 2026-06-15. Documento autocontido — inclui 12 RFs + 9 RNFs, 14 MDEs, 19 arquivos, 132 critérios de pronto, 12 leivas + 2 gates.*
