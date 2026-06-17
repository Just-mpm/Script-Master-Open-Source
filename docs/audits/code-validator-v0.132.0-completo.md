# Auditoria Holística — Release v0.132.0 (Speed Paint Vetorial Completo)

**Data:** 2026-06-15
**Versão alvo:** 0.132.0
**Branch:** `main` (HEAD `6ffc187`)
**Escopo:** 12 leivas (L0–L11) + 2 gates (L6, L12) · 27 arquivos modificados + 2 novos

---

## Escopo da Revisão

- **28 arquivos no diff** (+2154 / −85 linhas)
- **10 arquivos de código fonte** modificados em `src/features/speed-paint/`, `src/features/video-render/`, `src/pages/`
- **3 arquivos i18n** (pt-BR, en, es)
- **8 arquivos de teste** (unitários, componentes, integração)
- **1 arquivo de constantes novo** (`vetorialPresets.ts`)
- **1 arquivo de teste novo** (`SpeedPaintPage.component.test.tsx`)

**Cobertura da auditoria:** TypeScript · SOLID · Performance · Race Conditions · Acessibilidade · i18n · Bugs latentes · Manutenibilidade

---

## Veredito

**✅ APROVADO COM RESSALVAS**

A release 0.132.0 está tecnicamente sólida. Não há bloqueadores de merge. As ressalvas são de severidade **WARNING** e **SUGGESTION** — recomenda-se corrigi-las antes da tag final, mas não impedem a release.

---

## Achados Priorizados

---

### [WARNING] `as VetorialPreset` bypass em `handlePresetChange`

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:449`
- **Confidence:** 92/100
- **Categoria:** TypeScript
- **Problema:** `const newPreset = event.target.value as VetorialPreset;` — cast que ignora o sistema de tipos. O `SelectChangeEvent` do MUI é genérico e o `value` chega como `string`. O cast `as VetorialPreset` não valida runtime se o valor é realmente um dos 16 literais da união.
- **Evidência:**
  ```typescript
  const newPreset = event.target.value as VetorialPreset;
  ```
- **Impacto:** Se um valor inválido chegar (ex: manipulação de DOM, future-proofing se novos presets forem adicionados sem atualizar a UI), o tipo será `VetorialPreset` em compile-time mas `string` em runtime — propagando valor inválido para `setVetorialPreset` e `generateStrokesFromImage`.
- **Sugestão:** Extrair validação runtime:
  ```typescript
  const ALL_PRESETS: VetorialPreset[] = ['default', 'posterized1', ...];
  const raw = event.target.value;
  const newPreset: VetorialPreset = ALL_PRESETS.includes(raw as VetorialPreset)
    ? raw as VetorialPreset
    : 'artistic1'; // fallback seguro
  ```

---

### [WARNING] Fake `MouseEvent` no retry de `handleRenderModeChange`

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:1098`
- **Confidence:** 88/100
- **Categoria:** TypeScript
- **Problema:** `{} as React.MouseEvent<HTMLElement>` — objeto vazio é passado como `MouseEvent`. O handler `handleRenderModeChange` desestrutura `_event` mas não usa; no entanto, `_event` passa por `React.MouseEvent<HTMLElement>` que tem type shape específico. Um `{}` vazio não satisfaz o contrato.
- **Evidência:**
  ```typescript
  void handleRenderModeChange({} as React.MouseEvent<HTMLElement>, renderMode);
  ```
- **Impacto:** Baixo (o evento não é usado), mas é um `as` bypass que o `code-validator` precisa sinalizar por consistência com CT-S01. Se no futuro o handler usar `_event`, quebra em runtime.
- **Sugestão:** Mudar assinatura de `handleRenderModeChange` para aceitar `_event?: React.MouseEvent<HTMLElement>` ou extrair a lógica de reprocessamento em função separada que o retry chama sem falsificar evento.

---

### [WARNING] `useEffect` sync no `VideoPage.tsx` com deps `[]` — escopo de sessão não reage a mudanças posteriores

- **Arquivo:** `src/pages/VideoPage.tsx:232-235`
- **Confidence:** 85/100
- **Categoria:** Architecture
- **Problema:** A sincronização do `renderMode`/`vetorialPreset` da `animationStore` para a `videoRenderBridge` roda apenas no mount (`[]`). Se o usuário mudar o modo na SpeedPaintPage enquanto a VideoPage está aberta (ou já visitou a VideoPage e depois mudou), a VideoPage não vê a mudança.
- **Evidência:**
  ```typescript
  useEffect(() => {
    const { renderMode, vetorialPreset } = useAnimationStore.getState();
    useVideoRenderBridge.getState().syncRenderMode(renderMode, vetorialPreset);
  }, []);
  ```
- **Impacto:** Escopo de sessão intencional (D03, MDE-12) — documentado como "override local não vaza para SpeedPaint; cada rota tem contexto próprio". No entanto, se o usuário entra na VideoPage **depois** de mudar o modo na SpeedPaint, o sync funciona. Se muda o modo **depois** de já ter entrado na VideoPage, a VideoPage fica com o modo desatualizado até recarregar.
- **Sugestão:** Documentar explicitamente no código (já tem comentário, mas reforçar a limitação) ou adicionar um subscription opcional via Zustand `subscribe` para re-sincronizar em tempo real quando a VideoPage estiver montada.

---

### [SUGGESTION] `modeDescription` i18n mantida em 3 locales mas usada apenas em `VideoExportPanel`

- **Arquivo:** Todos os 3 locales (pt-BR:1430, en:1413, es:1413)
- **Confidence:** 80/100
- **Categoria:** i18n
- **Problema:** A chave `speedPaint.modeDescription` é usada em `VideoExportPanel.tsx:337` como descrição do `ToggleButtonGroup` (texto corporativo longo: "Clássico: revelação por máscara..."). Na `SpeedPaintPage.tsx:962`, a mesma chave é usada como helper text. No tracker (D08), ela deveria ser mantida para rastreabilidade, mas o texto é genérico e pode causar confusão por ser compartilhado em dois contextos.
- **Evidência:** `VideoExportPanel.tsx:337` usa `t('speedPaint.modeDescription')` como descrição do seletor de modo; `SpeedPaintPage.tsx:962` usa a mesma chave como helper text do `ToggleButtonGroup`.
- **Impacto:** Baixo — não quebra, mas se um tradutor mudar o texto em um local, afeta o outro sem intenção.
- **Sugestão:** Criar chave separada `speedPaint.modeDescriptionVideoPage` para a `VideoExportPanel`, mantendo `modeDescription` como texto da SpeedPaintPage.

---

### [SUGGESTION] Falta UI para easing e sortOrder — campos na store sem seletor visual

- **Arquivo:** `src/features/speed-paint/store/animationStore.ts:88-89`, `src/features/speed-paint/types/vetorial.ts:35,50`
- **Confidence:** 82/100
- **Categoria:** UX
- **Problema:** O easing (`VetorialEasingType`) e o sortOrder (`VetorialPathSortOrder`) têm suporte no pipeline (`WhiteboardScene.easing`, `sortPaths()`, `animationStore.easing`) mas não têm seletor UI. O easing default `'smooth'` está correto, mas o usuário não consegue experimentar os outros modos.
- **Evidência:**
  - `animationStore.ts:88-89`: campo `easing: VetorialEasingType` com `setEasing`
  - `WhiteboardScene.tsx:113`: prop `easing?: EasingFunction`
  - `vectorizer.ts:292`: `sortPaths()` implementada com 4 modos
  - UI `SpeedPaintPage.tsx`: sem `StackedHeader` ou `<Select>` para easing/sortOrder
  - i18n: sem chaves `easingLabel`, `easingLinear`, `easingSmooth`, `easingBounce`, `sortOrderLabel`, etc.
- **Impacto:** Features de P2 (RF-10, RF-09) que estão tecnicamente implementadas no backend da renderização mas sem exposição visual. O easing default `smooth` funciona; sortOrder default (não especificado = ordem do imagetracerjs) funciona.
- **Sugestão:** Adicionar seletor UI em L10/L9 follow-up. Abrir issue para v0.133.0.

---

## Itens Validados por Dimensão

### 1. TypeScript (CT-S01)

| Critério | Status | Evidência |
|----------|--------|-----------|
| Zero `any` em código novo | ✅ | Apenas `canvasFontStretchPatch.ts:105` (pré-existente, explícito no escopo) |
| Zero `@ts-ignore`, `@ts-expect-error` | ✅ | Confirmado via grep |
| Zero `eslint-disable` | ✅ | Apenas `canvasFontStretchPatch.ts:104` (pré-existente) |
| `as StrokeAnimation` removido | ✅ | `VideoComposition.tsx` usa `isVetorialAnimation` — zero matches |
| Type guards reais | ✅ | `isVetorialAnimation` / `isStrokeAnimation` exportados, narrowings via `in` |
| Narrowing da união com type guard | ✅ | `'paths' in animation` (SpeedPaintPlayer), `'totalLength' in animation` (strokeCache) |
| `as const` em chaves i18n do preset | ✅ | `t(\`speedPaint.presets.${preset}\` as const)` seguro (literais conhecidos) |

### 2. SOLID + Clean Code

| Princípio | Status | Análise |
|-----------|--------|---------|
| **SRP** | ⚠️ | `SpeedPaintPage.tsx` com 1172 linhas — coeso (gerencia 1 página), mas grande. Helper `reprocessCurrentImage` extraído corretamente. Nível aceitável para página de feature complexa. |
| **OCP** | ✅ | `renderMode`/`vetorialPreset` adicionados como parâmetros opcionais — código existente inalterado. Retrocompatibilidade total. |
| **LSP** | ✅ | `StrokeAnimation | VetorialAnimation` diferenciada por type guard em runtime. Ambos os tipos funcionam onde a união é esperada. |
| **ISP** | ✅ | Interfaces enxutas: `SpeedPaintEnhanceOptions`, `VideoExportOptions`, `GenerateSpeedPaintOptions` têm campos necessários, sem acoplamento. |
| **DIP** | ✅ | Stores Zustand como abstrações; `videoRenderBridge` desacopla VideoPage do App.tsx; injeção via `useStore` + seletores. |

### 3. Performance (RNF-01, RNF-02)

| Critério | Status | Evidência |
|----------|--------|-----------|
| Cache LRU + SHA-256 com `mode+preset` | ✅ | `strokeCache.ts:77-84` — `buildCacheKey` inclui `JSON.stringify(context)` |
| `MAX_PATHS_PER_SCENE = 500` | ✅ | `vectorizer.ts:69` + `truncatePaths()` |
| `PATHOMIT_BY_PRESET` heurístico | ✅ | `vectorizer.ts:82-99` — 16 entradas |
| Motion blur condicional (threshold) | ✅ | `WhiteboardScene.tsx:281-284` — `stdDeviation > 0` só quando `speed > 1.5` |
| `stdDeviation` máx 3px | ✅ | `MAX_BLUR_STD_DEVIATION = 3` |
| `useShallow` Zustand | ✅ | `SpeedPaintPage.tsx:129-143`, `VideoPage.tsx:58-61` |
| Lazy import de Remotion | ✅ | `videoRenderController.tsx:90-95`, `speedPaintRenderController.tsx` |
| `useCallback`/`useMemo` | ✅ | Consistentemente usado em handlers e cálculos pesados |

### 4. Race Conditions

| Critério | Status | Evidência |
|----------|--------|-----------|
| `processingIdRef` + `AbortController` em SpeedPaintPage | ✅ | `SpeedPaintPage.tsx:116-117`, usado em `reprocessCurrentImage` |
| `processingIdRef` em BatchOrchestrator | ✅ | `BatchOrchestrator.tsx:35-37` (padrão existente) |
| `AbortController` no `videoRenderController` | ✅ | Escopo de módulo `let abortController` |
| `AbortController` no `speedPaintRenderController` | ✅ | Escopo de módulo `let abortController` |

### 5. Acessibilidade (RNF-05, WCAG 2.1 AA)

| Critério | Status | Evidência |
|----------|--------|-----------|
| Tooltips com `describeChild` | ✅ | `SpeedPaintPage.tsx:1008,1022` |
| `aria-describedby` para texto de modo | ✅ | `SpeedPaintPage.tsx:971` aponta `"#speed-paint-mode-description"` |
| `aria-label` no `CircularProgress` | ✅ | `processingLabel` |
| `aria-live="polite"` no processamento | ✅ | `SpeedPaintPage.tsx:604-616` |
| `role="alert"` no erro de reprocessamento | ✅ | `SpeedPaintPage.tsx:1090` |
| `aria-label` no `<Select>` de preset | ✅ | `SpeedPaintPage.tsx:1056` |
| `aria-label` no `ToggleButtonGroup` | ✅ | `SpeedPaintPage.tsx:970` |

### 6. i18n (RNF-06, CT-I01-I06)

| Critério | Status | Evidência |
|----------|--------|-----------|
| 3 locales sincronizados (pt-BR, en, es) | ✅ | Todos os 22 novos `speedPaint.*` chaves presentes nos 3 arquivos |
| Tradução real (não técnica) | ✅ | `modeClassicTooltip`: "Revelação por máscara — rápida e ideal para fotos." / "Mask reveal — fast and ideal for photos." / "Revelado por máscara — rápido e ideal para fotos." |
| 16 presets com tradução | ✅ | `artistic1`: "Artístico 1" / "Artistic 1" / "Artístico 1" |
| 6 grupos com tradução | ✅ | `artistic`: "Artístico" / "Artistic" / "Artístico" |
| Tooltip D08 (limitação) | ✅ | `vetorialPresetTooltip`: "Modo Desenho funciona melhor com ilustrações..." |

### 7. Verificações de Build

| Comando | Resultado |
|---------|-----------|
| `bun run lint` | ✅ 0 erros, 0 warnings |
| `bun run typecheck` | ✅ Exit 0 |
| `bun run test` | ✅ 152 files, 2309 passed |
| `bun run build` | ✅ `dist/` gerado com PWA |

### 8. Checks Específicos do Plano

| Check | Resultado |
|-------|-----------|
| `git diff` escopo | ✅ ~28 arquivos (plano previa 19 + gaps) |
| `QueueStaging`, `ImageUpload`, `AnimationDurationSelector` inalterados | ✅ CT-C12 confirmado |
| `as StrokeAnimation` em VideoComposition | ✅ **0 matches** |
| `as any` em código novo | ✅ **0 matches** |
| `@ts-ignore` | ✅ **0 matches** |
| `eslint-disable` | ✅ apenas `canvasFontStretchPatch.ts:104` (pré-existente) |

---

## O que Parece Saudável

- **`strokeCache.ts`** — overloads corretas, discriminated unions, type guards em runtime e compile-time, eviction LRU com fallback de `crypto.subtle`. Excelente.
- **`WhiteboardScene.tsx`** — componente Remotion puramente declarativo, sem hooks assíncronos, determinístico. Proporção caneta via SVG inline, motion blur condicional no `<defs>`, tremor determinístico (`Math.sin`). Nota 10.
- **`vectorizer.ts` + `sortPaths`** — funções puras testáveis, O(n log n), Fisher-Yates com seed determinístico (sem `Math.random()`). `PATHOMIT_BY_PRESET` e `truncatePaths` como barreiras de segurança.
- **`reprocessCurrentImage`** extraído da `SpeedPaintPage` — evita duplicação com `handlePresetChange`, usa cache LRU antes de gerar, type guards nos branches de cache.
- **`generateScenesWithSpeedPaint`** em `speedPaintRenderer.ts` — branches corretas com type guards nos caches, fallback de Worker para main thread.
- **`videoRenderBridge.ts`** — Zustand bridge minimalista, apenas o necessário. `syncRenderMode` action clara.
- **Comentários e documentação inline** — abundantes e em português, explicando decisões (MDEs, GAPs, justificativas). Facilita manutenção futura.

---

## Análise de Manutenibilidade

### Score: **4 / 5** (Bom)

| Dimensão | Nota | Justificativa |
|----------|------|---------------|
| Coesão de arquivos | 4 | `SpeedPaintPage.tsx` (1172 linhas) é o arquivo mais denso, mas a responsabilidade é uma página e os helpers foram extraídos (`reprocessCurrentImage`, handlers dedicados). |
| Separação de camadas | 5 | Pipeline limpo: UI → Zustand Store → Service → Renderer → Cache. Cada peça tem responsabilidade única. |
| Nomenclatura | 5 | Nomes descritivos, comments em pt-BR, tipos exportados, padrões consistentes. |
| Complexidade de `WhiteboardScene` | 4 | 456 linhas com Pencil inline, easing, motion blur — coeso, mas denso. Faria sentido extrair `Pencil` para arquivo separado (`Pencil.tsx`). |
| Testabilidade | 5 | Funções puras (`sortPaths`, helpers), stores Zustand com seletores, mocks fáceis de fazer. |

**Pontos de atenção para manutenção futura:**
- `SpeedPaintPage.tsx` vai continuar crescendo — considerar extrair a seção de configurações (modo, preset, canvas color) para um sub-componente dedicado.
- `WhiteboardScene.tsx` poderia ter `Pencil` em módulo separado (já está com interface `PencilProps` bem definida, fácil de extrair).
- `speedPaintRenderController.tsx` (1020 linhas) — o controller já é grande. A separação entre `single` e `batch` está funcional, mas monitorar crescimento.

---

## Limites da Revisão

- Esta auditoria **não** incluiu smoke test manual no navegador (fora do escopo de análise estática).
- **Não foi possível** verificar o comportamento do `DISABLE_HMR` em `vite.config.ts` (CT-B08) — confirmado via grep que não foi alterado.
- **Não foi possível** medir performance real (FPS, latência de vetorização) — análise baseada em código.
- **Notebooks consultados:** MUI Docs (Tooltip), React Docs (race condition patterns), Remotion Guide (composições), Motion Guide (motion blur SVG). Todos os padrões foram validados contra código real.
- **Cobertura de testes** das funções novas não foi calculada numericamente, mas a contagem global de 2309 testes passando (contra baseline de 2268) indica cobertura adequada.

---

## Observações Finais

1. **Nenhum `as` bypass novo foi introduzido** nos arquivos que foram o foco da release (VideoComposition, strokeCache, pipeline) — os dois `as` identificados (`VetorialPreset` e `MouseEvent`) estão em código de UI (retry handler + event handler) e são mitigáveis com pequenas correções.

2. **O module augmentation do `AnalyticsEventMap`** em `SpeedPaintPage.tsx:85-89` é frágil mas adequado — `interface` é aberta por definição, e a documentação inline explica que a entrada definitiva virá em PR futuro de analytics. Não há conflito real.

3. **A lógica de cache em `strokeCache.ts:187` ignora `preset` no modo `mask`** — correto, pois o preset é exclusivo do modo vetorial. O overload de `getStrokeAnimation` com `{ mode: 'mask'; preset?: never }` reforça isso em compile-time.

4. **A sincronização entre VideoPage e SpeedPaintPage** (D03/MDE-12) é intencionalmente de mão única (mount-time apenas) — adequado para o escopo. Se o comportamento precisar mudar, é fácil adicionar subscription Zustand.

5. **O easing e sortOrder** estão implementados no pipeline mas sem UI — decisão de escopo documentada. Abrir issue para v0.133.0 se desejar UI.

---

## Gate de Saída Final

- [x] Li o contexto mínimo real ou reuni evidência suficiente
- [x] Cada achado passou pela validação anti-falso-positivo
- [x] Cada achado passou pelo confidence gate numérico
- [x] Achados com confidence < 80 foram descartados
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`
- [x] Existe motivo real para escalar? **Não** — nenhum CRITICAL encontrado
