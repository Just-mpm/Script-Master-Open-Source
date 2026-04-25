# Plano: Evolucao do Speed Paint no Video (UI, UX e Funcionalidades)

## Contexto

O projeto Script Master tem duas implementacoes de speed paint:

1. **Dedicado** (`/app/pintura-rapida`) — Upload direto, Konva canvas, batch processing, dupla velocidade (draw + paint), download imagem/video, watch/record modes.
2. **Integrado ao video** (`/app/video`) — Cenas do pipeline TTS/imagens, canvas nativo Remotion (deterministico, frame-driven), sincronizado com audio e legendas.

O motor de rendering e o mesmo (`speedPaintRenderer.ts` compartilha `StrokeAnimation`, `strokeCache`, `strokeWorker`), mas o video tem **controles significativamente mais pobres**:

| Funcionalidade | Dedicado | Video |
|---|---|---|
| Velocidade draw/paint separada | 2 controles independentes (speed + paintSpeed) | 1 unico `speedMultiplier` global |
| Granularidade de velocidade | 6 niveis (0.25x a 8x) | 3 niveis (0.5x, 1x, 1.5x) |
| Indicador de fase | "Desenhando Objetos..." / "Colorindo..." | Nenhum |
| Intensidade por cena | N/A | Nenhum |
| Estilo de brush | N/A (unica opcao) | N/A (unica opcao) |

**Objetivo:** Evoluir o speed paint integrado ao video para igualar/superar o dedicado em controles de velocidade, adicionar indicador de fase no preview, e melhorar a UX do painel de exportacao.

## Decisoes Pendentes

_Nenhuma (modo --auto)._

## Decisoes Tomadas

### 1. Velocidade draw/paint separada no video

- Opcao A: Manter `speedMultiplier` unico, adicionar `drawSpeed`/`paintSpeed` como novas props opcionais
- **Opcao B: Estender `speedMultiplier` para aceitar objeto `{ sketch: number; reveal: number }` ou `number` (backward compat)**
- **Escolhida:** Opcao B — mantem compatibilidade com codigo existente, permite evolucao gradual. `SpeedPaintFrameOptions.speedMultiplier` passa a ser `number | SpeedPaintMultipliers` (ja opcional via `?`). No `renderSpeedPaintFrame`, se `SpeedPaintMultipliers`, aplica o multiplicador correto baseado em `animation.revealThreshold ?? 0.8` (fallback consistente com AnimationPlayer dedicado).

### 2. Seletor de velocidade no VideoExportPanel

- Opcao A: Substituir `ToggleButtonGroup` por `SpeedSelector` movido para shared
- **Opcao B: Criar `SpeedPaintControls` dedicado no video-render com Collapse expansivel**
- **Escolhida:** Opcao B — O `SpeedSelector` dedicado usa modelo numerico (0.25-8x) via `Button`, enquanto o video usa `SpeedPaintSpeed` enum. Em vez de adapter complexo, criar componente nativo no video-render que segue os padroes do projeto (Collapse toggle com aria-expanded do Inspector, FormControlLabel + Slider do subtitle-editor). Mais coeso com a linguagem visual do VideoExportPanel.

### 3. Indicador de fase no preview

- Opcao A: Badge sobreposto no canvas do player
- **Opcao B: Texto inline no VideoExportPanel (durante preview)**
- **Escolhida:** Opcao A — Badge semi-transparente sobreposto no player (padrao `AbsoluteFill` do Remotion com posicao fixa). Calculado a partir de `progress * revealThreshold` do strokeAnimation. Desaparece quando `isExporting = true`.

### 4. Intensidade por cena individual

- Opcao A: Slider por cena no VideoExportPanel (lista expansivel)
- Opcao B: Deferir para versao futura
- **Escolhida:** Opcao B — Intensidade por cena adiciona complexidade significativa na UI (lista editavel de cenas, sync com store, passagem via inputProps) com beneficio questionavel para a maioria dos usuarios. Focar na evolucao do controle global (dupla velocidade, indicador de fase) que ja entrega 80% do valor com 20% do esforco.

## Reutilizacao e Padroes

- **Reutilizar:** `src/features/video-render/lib/speedPaintRenderer.ts` — logica existente de `renderSpeedPaintFrame`, estender com suporte a speed separado
- **Reutilizar:** `src/features/video-render/lib/transitions.ts` — `springFadeIn/FadeOut` para fade-in suave do badge de fase
- **Reutilizar:** `src/features/video-render/components/SpeedPaintScene.tsx` — componente Remotion, estender props com `drawSpeed`/`paintSpeed`
- **Padrao de referencia (Collapse toggle):** `src/components/Inspector.tsx` (linhas 164-258) — `aria-expanded`, `aria-controls`, `ExpandMore/ExpandLess`
- **Padrao de referencia (React.memo + state local):** `src/features/video-render/components/VideoExportPanel.tsx` — state local para configs de exportacao, props opcionais com defaults
- **Codigo novo:** `SpeedPaintControls` (componente de configuracao avancada no video-render), `SpeedPaintPhaseBadge` (sub-componente dentro de SpeedPaintScene)
- **Codigo novo:** Tipos `SpeedPaintMultipliers` e extensoes em `VideoCompositionProps`/`VideoExportOptions`

## Arquivos a Modificar

### Tipos e Contratos
- `src/features/video-render/types.ts` — Novo tipo `SpeedPaintMultipliers`, campos opcionais em `VideoCompositionProps` e `VideoExportOptions`
- `src/features/video-render/components/VideoExportPanel.tsx` — Adicionar Collapse com `SpeedPaintControls`, nova state `speedPaintMultipliers`

### Engine de Rendering
- `src/features/video-render/lib/speedPaintRenderer.ts` — Estender `SpeedPaintFrameOptions.speedMultiplier` para aceitar `SpeedPaintMultipliers`, logica condicional sketch/reveal
- `src/features/video-render/components/SpeedPaintScene.tsx` — Props novas `drawSpeed`/`paintSpeed`, passagem para renderer

### Composicao Remotion
- `src/features/video-render/components/VideoComposition.tsx` — Receber `speedPaintMultipliers`, passar para `SpeedPaintScene`
- `src/features/video-render/hooks/useVideoExporter.tsx` — Integrar `speedPaintMultipliers` em `VideoExportOptions` e `ExportableComposition`

### Indicador de Fase (integrado)
- `src/features/video-render/components/SpeedPaintScene.tsx` — Badge de fase integrado como sub-componente (usa hooks Remotion)

### Barrels
- `src/features/video-render/index.ts` — Re-exportar novos componentes e tipos

### Testes
- `tests/video-render/types.unit.test.ts` — Testar novo tipo `SpeedPaintMultipliers`
- `tests/video-render/speedPaintRenderer.unit.test.ts` — Atualizar para cobrir speed separado
- `tests/video-render/videoComposition.component.test.tsx` — Atualizar mocks
- `tests/video-render/useVideoExporter-speedpaint.unit.test.tsx` — Atualizar mocks
- `tests/video-render/VideoExportPanel.unit.test.tsx` — Testar novos controles

## Passos de Implementacao

### Lote 1: Tipos + Renderer (base, sem breaking changes)
**Arquivos:** `types.ts`, `speedPaintRenderer.ts`
**Atencao:** Sequencial — passo 2 depende do tipo criado no passo 1.

1. **Adicionar `SpeedPaintMultipliers` e estender tipos em `types.ts`**
   - Criar tipo `SpeedPaintMultipliers = { sketch: number; reveal: number }`
   - Criar helper `DEFAULT_SPEED_PAINT_MULTIPLIERS: Readonly<SpeedPaintMultipliers>` (sketch: 1.0, reveal: 1.0)
   - Adicionar `speedPaintMultipliers?: SpeedPaintMultipliers` opcional em `VideoCompositionProps` (default: undefined = usa speedPaintSpeed global)
   - Adicionar `speedPaintMultipliers?: SpeedPaintMultipliers` opcional em `VideoExportOptions`
   - NAO modificar `SpeedPaintSpeed`, `SPEED_PAINT_MULTIPLIERS`, ou `speedMultiplier` existente
   - Sugestao: `builder-worker` | Notebook: `f2b26992-1584-43dc-a269-688632e39221` (TypeScript 6 Guide)

2. **Estender `renderSpeedPaintFrame` com suporte a speed separado em `speedPaintRenderer.ts`**
   - `SpeedPaintFrameOptions.speedMultiplier` passa a ser `number | SpeedPaintMultipliers` (manter `?` para optional, backward compat total)
   - Se `number`: comportamento atual (backward compat), `adjustedProgress = progress * speedMultiplier`
   - Se `SpeedPaintMultipliers`: logica condicional baseada em `animation.revealThreshold ?? 0.8`:
     - Referencia de implementacao: `AnimationPlayer.tsx:34` (dedicado) usa `threshold = state.job.animation.revealThreshold || 0.8`
     - `revealThreshold` e a proporcao de strokes que sao sketch (ex: 0.35 = 35% do total)
     - Strokes ordenacao: sketch (layer 0) vem antes de reveal (layer 1) — confirmado em `imageProcessing.ts:260-269`
     - Logica: se `progress < revealThreshold`, aplica `multipliers.sketch` ao progresso da fase sketch; se `progress >= revealThreshold`, todos os strokes sketch ja foram desenhados, aplica `multipliers.reveal` ao progresso restante da fase reveal
     - `visibleCount = floor(sketchCount * sketchProgress)` para fase sketch, `visibleCount = sketchCount + floor(revealCount * revealProgress)` para fase reveal
   - Importar `SpeedPaintMultipliers` de `../types`
   - Manter `generateScenesWithSpeedPaint` inalterado (ele gera strokes, nao renderiza)
   - Sugestao: `builder-worker` | Notebook: `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` (Remotion Docs)

### Lote 2: Componente Remotion + Composicao
**Arquivos:** `SpeedPaintScene.tsx`, `VideoComposition.tsx`, `useVideoExporter.tsx`

3. **Estender `SpeedPaintScene.tsx` com props de speed separado**
   - Adicionar props opcionais `drawSpeed?: number` e `paintSpeed?: number`
   - Se ambos fornecidos, construir `{ sketch: drawSpeed, reveal: paintSpeed }` e passar como `speedMultiplier` para `renderSpeedPaintFrame`
   - Se nao fornecidos, usar `speedMultiplier` existente (backward compat)
   - Sugestao: `builder-worker` | Notebook: `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` (Remotion Docs)

4. **Atualizar `VideoComposition.tsx` para receber e repassar multipliers**
    - Se `speedPaintMultipliers` fornecido em props: passar `drawSpeed={multipliers.sketch}` e `paintSpeed={multipliers.reveal}` para cada `SpeedPaintScene`
    - Se nao: manter `speedMultiplier` global existente
    - Tambem repassar `isExporting={isExporting}` para cada `<SpeedPaintScene>` (necessario para PhaseBadge no passo 7)
    - Sugestao: `builder-worker`

5. **Integrar em `useVideoExporter.tsx`**
    - Adicionar `speedPaintMultipliers` em `VideoExportOptions`
    - No `startRender`: se `speedPaintMultipliers` fornecido, passar como `inputProps.speedPaintMultipliers` no `renderMediaOnWeb`
    - Atualizar `ExportableComposition` wrapper (linha ~94): adicionar `speedPaintMultipliers` à destruturação explicita de props e repassar como prop para `<VideoComposition>` (linhas ~96-105)
    - Sugestao: `builder-worker`

### Lote 3: UI — SpeedPaintControls + PhaseBadge
**Arquivos:** `SpeedPaintControls.tsx` (novo), `VideoExportPanel.tsx`
**Nota:** O `SpeedPaintPhaseBadge` e integrado dentro de `SpeedPaintScene.tsx` (passo 3, Lote 2) pois usa hooks Remotion (`useCurrentFrame()`) que requerem estar dentro da arvore `<Composition>`.

6. **Criar `SpeedPaintControls.tsx` — componente de configuracao avancada**
   - Collapse toggle seguindo padrao do Inspector (`aria-expanded`, `aria-controls`)
   - Dois sliders: "Desenho (Sketch)" e "Colorir (Reveal)" com range 0.25x a 4.0x
   - Label mostra valor atual (ex: "1.0x Normal", "2.0x Rapido")
   - Segue tokens de tema (`glassSurfaceSx`, `BRAND_PRIMARY`, etc.)
   - `React.memo` para evitar re-renders do pai
   - Sugestao: `builder-worker` | Notebook: `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` (MUI V9 Docs)

7. **Integrar `SpeedPaintPhaseBadge` dentro de `SpeedPaintScene.tsx` (ja no passo 3)**
   - Badge position absolute no canto superior, dentro do `AbsoluteFill` da cena
   - Exibe "Desenhando..." ou "Colorindo..." baseado no frame atual vs `animation.revealThreshold ?? 0.8`
   - Opacidade reduzida (0.6), desaparece quando `isExporting = true` (prop existente em VideoComposition)
   - Usa `useCurrentFrame()` e `useVideoConfig()` do Remotion — so funciona dentro da arvore Composition
   - Recebe `isExporting` como prop do VideoComposition (propagado via SpeedPaintSceneProps)
   - **Integracao no passo 3:** Adicionar `isExporting?: boolean` as props de `SpeedPaintScene`, renderizar `SpeedPaintPhaseBadge` condicionalmente (`isExporting ? null : <SpeedPaintPhaseBadge ... />` — unmount para performance de render)
   - Sugestao: `builder-worker` | Notebook: `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` (Remotion Docs)

8. **Integrar `SpeedPaintControls` no `VideoExportPanel.tsx`**
   - Novo state local: `speedPaintMultipliers` (default `{ sketch: 1, reveal: 1 }`)
   - Condicionado ao `animateScenes` toggle (aparece apenas quando ativo)
   - Collapse apos o seletor de velocidade existente
   - Passar `speedPaintMultipliers` em `handleStartExport -> VideoExportOptions`
   - Sugestao: `builder-worker` | Notebook: `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` (MUI V9 Docs)

### Lote 4: Testes + Barrel + Validacao
**Arquivos:** 5 testes + `index.ts`

9. **Atualizar testes existentes e adicionar novos**
   - `types.unit.test.ts`: testar `SpeedPaintMultipliers`, `DEFAULT_SPEED_PAINT_MULTIPLIERS`
   - `speedPaintRenderer.unit.test.ts`: testar `renderSpeedPaintFrame` com `{ sketch, reveal }` separados, fallback para `number`
   - `videoComposition.component.test.tsx`: atualizar mock de `SpeedPaintScene` com novas props opcionais
   - `useVideoExporter-speedpaint.unit.test.tsx`: testar `startRender` com `speedPaintMultipliers`
   - `VideoExportPanel.unit.test.tsx`: testar `SpeedPaintControls` (Collapse, sliders, integracao com `animateScenes`)
   - Sugestao: `vitest-specialist`

10. **Atualizar `index.ts` barrel**
     - Re-exportar `SpeedPaintControls`, `SpeedPaintMultipliers`, `DEFAULT_SPEED_PAINT_MULTIPLIERS`
    - Sugestao: `builder-worker`

11. **Validacao final**
    - `bun run lint` — 0 erros, 0 warnings
    - `bun run typecheck` — 0 erros
    - `bun run test` — todos os testes passando
    - Sugestao: `builder-worker`

## Riscos e Mitigacoes

| Risco | Severidade | Mitigacao |
|-------|-----------|-----------|
| `types.ts` propaga mudancas para 15 arquivos | Alto | Apenas adicionar tipos NOVOS e props OPCIONAIS com defaults. Nao modificar tipos existentes. |
| `SpeedPaintFrameOptions.speedMultiplier` mudanca de tipo | Medio | Union type `number | SpeedPaintMultipliers` garante backward compat. Code path existente inalterado. |
| Testes mockando `SpeedPaintScene` quebram | Medio | Props novas sao opcionais — mocks existentes continuam funcionando sem modifica-las. Atualizar apenas para adicionar cobertura nova. |
| `ExportableComposition` wrapper no `useVideoExporter` desincronizado | Medio | Prop nova opcional — se ausente, Remotion usa default do `VideoComposition`. Validar no teste `useVideoExporter-speedpaint`. |
| Re-renders em cascata no VideoExportPanel com novos controles | Baixo | `SpeedPaintControls` com `React.memo`. State local (padrao ja usado). `Collapse` com `unmountOnExit` para nao renderizar quando inativo. |
| `SpeedPaintPhaseBadge` interfere no render do video | Baixo | Badge renderiza apenas quando `isExporting = false`. Usa `useCurrentFrame()` (deterministico, nao rAF). |

## Verificacao

- [ ] Validação funcional: preview do player com speed paint mostra badge de fase "Desenhando..." / "Colorindo..." corretamente
- [ ] Validação funcional: sliders de sketch/reveal no VideoExportPanel alteram a velocidade visualmente no preview
- [ ] Validação funcional: exportar video com multipliers customizados mantém sincronizacao com audio
- [ ] Validação funcional: backward compat — exportar sem speed paint funciona igual antes
- [ ] Validação técnica: `bun run lint` — 0 erros, 0 warnings
- [ ] Validação técnica: `bun run typecheck` — 0 erros
- [ ] Validação técnica: `bun run test` — todos passando
- [ ] Validação de regressão: preview sem speed paint (animateScenes=false) funciona igual
- [ ] Validação de regressão: preview com speed paint mas sem multipliers (default) funciona igual

## Notebooks Relevantes

| Notebook | ID | Uso |
|----------|----|-----|
| Remotion Docs | `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` | Canvas animations, useCurrentFrame, interpolate, opacity em AbsoluteFill, inputProps estaveis |
| MUI V9 Docs | `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` | Collapse toggle, FormControlLabel, Switch, Slider, Accordion, FormGroup |
| TypeScript 6 Guide | `f2b26992-1584-43dc-a269-688632e39221` | Union types, generics, narrowing |

## Instrucoes de Execução

Ao executar este plano, siga este protocolo:

### 1. Investigacao
- Use analyze tools (`suggest_reads`, `impact_analysis`, `file_context`) nos arquivos listados
- Consulte os Notebooks Relevantes acima para confirmar padroes da tecnologia envolvida
- Identifique padroes, dependencias e riscos que o plano nao cobriu

### 2. Divisao do Trabalho
- Calcule tokens dos arquivos com `token-counter_token_count` (budget: 40K por agent)
- Agrupe por afinidade — arquivos que se modificam juntos ficam juntos
- Respeite dependencias: quem cria tipo usado por outro vai primeiro
- Nunca dois agents do mesmo lote tocam no mesmo arquivo

### 3. Escolha de Agents
Para cada grupo, escolha o agent mais adequado ao contexto:
- `builder-worker` — codigo novo, features, refatoracoes, componentes
- `vitest-specialist` — testes de logica (hooks, utils, services sem Firebase)

### 4. Execucao em Lotes
- **Lote 1** (sequencial): Passo 1 (types.ts) -> Passo 2 (speedPaintRenderer.ts) — 1 agent (dependencia de tipo)
- **Lote 2** (sequencial): Passo 3 (SpeedPaintScene + PhaseBadge integrado) -> Passo 4 (VideoComposition) -> Passo 5 (useVideoExporter) — 1 agent
- **Lote 3** (independente): Passo 6 (SpeedPaintControls) — 1 agent. **Atencao:** deve completar antes do passo 8 (Lote 4)
- **Lote 4** (sequencial, depende do Lote 3): Passo 8 (VideoExportPanel integration) -> Passo 9 (testes) -> Passo 10 (barrel) -> Passo 11 (validacao) — 1 agent
- Apos cada lote, execute lint + type-check do projeto

### 5. Validacao Pos-lote
- Execute scripts de lint e type-check (verifique `package.json`)
- Corrija sem `eslint-disable`, `@ts-ignore` ou `@ts-expect-error` — corrija a causa raiz
- Repita ate 0 erros e 0 warnings
