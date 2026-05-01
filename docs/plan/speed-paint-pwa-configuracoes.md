# Plano: Speed Paint Defaults + PWA Orientation Lock + Página de Configurações

## Contexto

Três mudanças independentes solicitadas pelo usuário:

1. **Speed Paint Defaults** — `DEFAULT_SPEED_PAINT_MULTIPLIERS = { sketch: 0.25, reveal: 0.25 }` em `src/features/video-render/types.ts:26-29`. O usuário quer sketch em 1.0x (4x mais rápido) e reveal mantendo 0.25x físico mas exibido como "1.0x Normal" (labels shiftados ×4). O fluxo: `DEFAULT_SPEED_PAINT_MULTIPLIERS` → `VideoExportPanel` (state) → `SpeedPaintControls` (sliders) → `useVideoExporter` → `VideoComposition` → `SpeedPaintScene` → `renderSpeedPaintFrame` → `adjustProgress()`. A divisão `/4` em `VideoComposition.tsx:100` só se aplica ao `globalSpeedMultiplier` (fallback legado).

2. **PWA Orientation Lock** — O manifest em `vite.config.ts:63` tem `orientation: 'any'`, causando rotação indesejada no celular. O VitePWA gera o manifest automaticamente em build time (sem `manifest.json` separado). Mudança para `'portrait'` trava a tela quando o PWA está instalado em `display: 'standalone'`.

3. **Página de Configurações** — Não há como configurar valores padrão para geração no estúdio. `getInitialStudioConfig()` (`studio.utils.ts:126-147`) usa valores hardcodados. O usuário quer `/app/configuracoes` com voz padrão, persona, ritmo, emoção, ratio, densidade, framework visual, idioma dos textos, etc. 17 campos persistidos em `StudioConfigState` (exceto `script` e `referenceImage` são candidatos).

### Padrões existentes a seguir

- **Rota:** lazy loading via `lazy()` + export nomeado, dentro de `<Route element={<ProtectedRoute />}>`
- **Página:** wrapper fino em `src/pages/` + componente real em `src/components/`
- **Layout:** `Box` > `Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH }}` (1600px)
- **Navegação:** array `navItems` no Header — desktop (Paper horizontal) e mobile (Drawer lateral)
- **Persistência:** `s2a_` prefix + `safeSetItem()`/`getStoredValue()` para localStorage
- **Estilos:** `glassPanelSx`, `insetPanelSx` de `src/theme/surfaces.ts`
- **i18n:** chaves em 3 locales (pt-BR, en, es)

### Componentes reutilizáveis

| Componente | Localização | Reuso |
|---|---|---|
| `EmotionSelector` | `src/features/studio/components/EmotionSelector.tsx` | Pronto (props: value, intensity, onChange) |
| `useVoicePreviews()` | `src/hooks/useVoicePreviews.ts` | Hook reutilizável para preview de voz |
| `VOICES` array | `src/lib/constants.ts` | 30 vozes com id, name, style |
| `useStudioStore.applySettings()` | `src/features/studio/store/studioStore.ts` | Aplica patch parcial no store |
| `useStudioStore.reset()` | `src/features/studio/store/studioStore.ts` | Restaura estado inicial |
| Chaves i18n do Inspector | `src/features/i18n/locales/*.ts` | Labels para todos os campos |

## Decisões Pendentes

### 1. Escopo dos campos configuráveis (Tarefa 3) — RESOLVIDA
- **Escolhida:** Todos os 15 campos (exceto script e referenceImage), organizados em seções colapsáveis (accordion).

### 2. Persistência dos padrões (Tarefa 3)
- Opção A: **Escrever nas mesmas chaves `s2a_*`** — "Salvar padrões" = setar o estado inicial do estúdio. Simples, sem chaves extras. "Restaurar padrões" = limpar `s2a_*` (volta aos hardcodados).
- Opção B: **Firestore + IndexedDB** — estender `UserSetting` com `studioDefaults`, sync entre dispositivos
- Opção C: **Chaves separadas `s2a_defaults_*` + botão "Aplicar"** — mais complexo, mas separa "última sessão" de "defaults"

### 3. Integração com o estúdio (Tarefa 3) — RESOLVIDA
- **Escolhida:** Substituir `getInitialStudioConfig()` — quando há defaults salvos, o estúdio carrega eles em vez dos hardcodados. Transparente para o usuário.

## Decisões Tomadas

### 4. Mapeamento de labels do reveal (Tarefa 1)
- **Escolhida:** Labels shiftados ×4 apenas para reveal. Sketch mantém labels originais (1.0x = "Normal" real).
  - Reveal: 0.25 → "1.0x Normal", 0.5 → "2.0x", 0.75 → "3.0x", 1.0 → "4.0x", ..., 4.0 → "16.0x Máximo"
  - Sketch: labels inalterados (0.25→"Muito lento", 1.0→"Normal", 4.0→"Máximo")
- **Por que:** Assimetria é intencional — o usuário pediu sketch em velocidade real 1.0x e reveal com base 4x mais lenta. Ambos exibem "1.0x Normal" no default, mas representam velocidades físicas diferentes (1.0 vs 0.25). Os sliders estão em seções separadas com labels claros "Desenho (Sketch)" e "Colorir (Reveal)".

### 5. Valor de orientação do PWA (Tarefa 2)
- **Escolhida:** `'portrait'` (aceita portrait-primary e portrait-secondary)
- **Por que:** Permite uso normal em pé e de cabeça para baixo, mas bloqueia landscape. Mais permissivo que `portrait-primary`.

### 6. Navegação da página de configurações (Tarefa 3)
- **Escolhida:** Ícone de engrenagem no array `navItems` do Header (desktop e mobile Drawer)
- **Por que:** Consistente com as demais páginas do app, acessível em ambos os contextos

### 7. Persistência: escrever nas mesmas chaves `s2a_*` (Tarefa 3)
- **Escolhida:** "Salvar padrões" escreve nas mesmas chaves `s2a_*` que o estúdio já usa. "Restaurar padrões" limpa essas chaves (volta aos hardcodados de `getInitialStudioConfig()`).
- **Por que:** Sem chaves extras, sem conflito "defaults vs última sessão". A página de configurações define o estado inicial do estúdio. Se o usuário usar o estúdio e mudar valores, a próxima sessão carrega esses valores (comportamento atual). Se quiser voltar aos padrões configurados, clica "Restaurar" na página de configurações. A store já tem `reset()` que limpa tudo — a página expõe isso com confirmação.

## Reutilização e Padrões

- Reutilizar: `formatSpeedLabel()` (adaptar), `EmotionSelector` (como-is), chaves i18n do Inspector, `useVoicePreviews()`, `VOICES`, `glassPanelSx`/`insetPanelSx`
- Padrão de referência: `AssistantPage.tsx` (layout wrapper), `Inspector.tsx` (seções colapsáveis), `adjustProgress()` (não muda)
- Código novo: `ConfiguracoesPage.tsx`, `Configuracoes.tsx`, `formatRevealLabel()`, chaves i18n `configuracoes.*`, funções de persistência de defaults

## Arquivos a Modificar

### Tarefa 1 — Speed Paint Defaults (4 arquivos)
- `src/features/video-render/types.ts` — `DEFAULT_SPEED_PAINT_MULTIPLIERS.sketch` de 0.25 para 1.0
- `src/features/video-render/components/SpeedPaintControls.tsx` — `formatRevealLabel()` com fator ×4
- `tests/video-render/types.unit.test.ts` — assertion de sketch para 1.0
- `tests/video-render/VideoExportPanel.unit.test.tsx` — assertion de data-sketch de "0.25" para "1.0"

### Tarefa 2 — PWA Orientation Lock (1 arquivo)
- `vite.config.ts` — `orientation: 'any'` → `orientation: 'portrait'`

### Tarefa 3 — Página de Configurações (12 arquivos)
- `src/features/studio/store/studio.utils.ts` — `saveStudioDefaults()`, `clearStudioDefaults()` — escreve/remove nas mesmas chaves `s2a_*`
- `src/features/studio/store/studioStore.ts` — `reset()` já existe, a página chama `clearStudioDefaults()` + `reset()`
- `src/features/i18n/locales/pt-BR.ts` — chaves `configuracoes.*` + `studio.header.nav.settings`
- `src/features/i18n/locales/en.ts` — mesmas chaves em inglês
- `src/features/i18n/locales/es.ts` — mesmas chaves em espanhol
- `src/pages/ConfiguracoesPage.tsx` — **novo** página wrapper (export nomeado `ConfiguracoesPage`)
- `src/components/Configuracoes.tsx` — **novo** componente principal com seções
- `src/router/routes.tsx` — lazy import `module.ConfiguracoesPage` + rota `/app/configuracoes`
- `src/router/Redirects.tsx` — redirect `/app/settings` → `/app/configuracoes`
- `src/components/Header.tsx` — ícone Settings em `navItems`
- `CLAUDE.md` — adicionar `/app/configuracoes` na tabela de rotas
- `AGENTS.md` — atualizar seção de domínios se aplicável

### Testes (1 arquivo novo)
- `tests/pages/ConfiguracoesPage.component.test.tsx`

## Passos de Implementação

### Lote 1 — Quick fixes (Tarefas 1 + 2, parallel)

1. **Alterar default de sketch para 1.0x**
   - Arquivos: `src/features/video-render/types.ts`
   - Mudança: `DEFAULT_SPEED_PAINT_MULTIPLIERS.sketch` de `0.25` para `1.0`
   - Resultado: Slider de sketch começa em 1.0x ("Normal")
   - Sugestão: `fix-worker`

2. **Criar labels shiftados para o slider de reveal**
   - Arquivos: `src/features/video-render/components/SpeedPaintControls.tsx`
   - Mudança: `formatRevealLabel(value)` com fator ×4. Valores: 0.25→"1.0x Normal", 0.5→"2.0x Rápido", 0.75→"3.0x", 1.0→"4.0x", 1.5→"6.0x", 2.0→"8.0x", 3.0→"12.0x", 4.0→"16.0x Máximo"
   - Resultado: Reveal exibe velocidade relativa à nova base
   - Sugestão: `fix-worker`

3. **Alterar orientação do manifest PWA**
   - Arquivo: `vite.config.ts`
   - Mudança: `orientation: 'any'` → `orientation: 'portrait'` (linha ~63)
   - Resultado: PWA travado em retrato
   - Sugestão: `fix-worker`

4. **Atualizar testes do speed paint**
   - Arquivos: `tests/video-render/types.unit.test.ts`, `tests/video-render/VideoExportPanel.unit.test.tsx`
   - Mudança: `expect(DEFAULT_SPEED_PAINT_MULTIPLIERS.sketch).toBe(1.0)` (era 0.25) + assertion de `data-sketch` de "0.25" para "1.0" no VideoExportPanel
   - Resultado: Testes refletem o novo default
   - Sugestão: `vitest-specialist`

Após Lote 1: `bun run lint && bun run typecheck && bun run test`

### Lote 2 — Infraestrutura da página de configurações (Tarefa 3)

5. **Criar persistência de defaults**
   - Arquivos: `src/features/studio/store/studio.utils.ts`
   - Mudança: `saveStudioDefaults(defaults)` escreve nas mesmas chaves `s2a_*` (usa `safeSetItem`), `clearStudioDefaults()` remove todas as chaves `s2a_*` (exceto `s2a_script`). Tipo: `Partial<StudioSettingsPatch>`. Sem chaves `s2a_defaults_*` — a página de configurações é literalmente uma UI para setar o estado inicial do estúdio.
   - Resultado: "Salvar padrões" seta o estado inicial; "Restaurar padrões" volta aos hardcodados
   - Sugestão: `builder-worker`

6. **Criar i18n para a página de configurações**
   - Arquivos: `src/features/i18n/locales/pt-BR.ts`, `en.ts`, `es.ts`
   - Mudança: Namespace `configuracoes.*` (title, subtitle, save, reset, sectionVoice, sectionDirection, sectionScenes, sectionAdvanced, resetConfirm, saved) + `studio.header.nav.settings`
   - Resultado: Labels em 3 idiomas
   - Sugestão: `builder-worker`

Após Lote 2: `bun run lint && bun run typecheck`

### Lote 3 — Componente, rota e documentação (Tarefa 3)
> **Depende do Lote 2** — o componente `Configuracoes.tsx` importa de `studio.utils.ts` (modificado no passo 5). Não executar em paralelo com o Lote 2.

7. **Criar componente principal Configuracoes**
   - Arquivo: `src/components/Configuracoes.tsx` (**novo**)
   - Mudança: Seções colapsáveis (padrão Inspector):
     - **Voz**: seletor de voz (grid Paper+ButtonBase + `useVoicePreviews`)
     - **Persona**: speakerAName, audioProfile, scene, styleNotes
     - **Direção**: pace, emotion/intensity (`EmotionSelector`)
     - **Cenas**: generateScenes, sceneDensity, sceneRatio, visualFramework, imageTextLanguage
     - **Multi-speaker**: isMultiSpeaker, speakerBName, speakerBVoice
   - Botões: "Salvar padrões" (chama `saveStudioDefaults()` + toast de sucesso), "Restaurar padrões" (confirmação → chama `clearStudioDefaults()` + `useStudioStore.getState().reset()`)
   - O componente lê os valores atuais de `s2a_*` via `getInitialStudioConfig()` para exibir no formulário
   - Resultado: Formulário completo de configuração
   - Sugestão: `builder-worker` | Notebook: `{c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b}` (MUI V9 Docs)

8. **Criar página wrapper, rota, Header e documentação**
   - Arquivos: `src/pages/ConfiguracoesPage.tsx` (**novo**), `src/router/routes.tsx`, `src/router/Redirects.tsx`, `src/components/Header.tsx`, `CLAUDE.md`
   - Mudança:
     - `ConfiguracoesPage.tsx`: wrapper com `Box` + `Container` (padrão `AssistantPage.tsx`), **export nomeado** `ConfiguracoesPage` (padrão de páginas do app)
     - `routes.tsx`: `const ConfiguracoesPage = lazy(() => import('../pages/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage }))` + rota protegida `/app/configuracoes`
     - `Redirects.tsx`: redirect `/app/settings` → `/app/configuracoes`
     - `Header.tsx`: `{ to: '/app/configuracoes', label: t('studio.header.nav.settings'), icon: Settings }` em `navItems`
     - `CLAUDE.md`: adicionar `/app/configuracoes | ConfiguracoesPage | Sim` na tabela de rotas
   - Resultado: Página acessível via Header, documentação atualizada
   - Sugestão: `builder-worker` (página + rota + CLAUDE.md), `fix-worker` (Header)

Após Lote 3: `bun run lint && bun run typecheck`

### Lote 4 — Testes (Tarefa 3)

9. **Criar testes da página de configurações**
    - Arquivo: `tests/pages/ConfiguracoesPage.component.test.tsx` (**novo**)
    - Mudança: Testes de renderização, interação com seções, salvamento de defaults, reset
    - Resultado: Cobertura da nova página
    - Sugestão: `vitest-specialist`

Após Lote 4: `bun run test`

## Riscos e Mitigações

### Tarefa 1 — Speed Paint
- **Risco:** Usuários podem ter speed paint mais rápido que o esperado (sketch era 0.25x, agora 1.0x)
  - **Mitigação:** State local do `VideoExportPanel` (não persistido). Cada exportação inicializa com o default.
- **Risco:** Label de reveal "16.0x Máximo" vs sketch "4.0x Máximo"
  - **Mitigação:** Sliders em seções separadas com labels "Desenho (Sketch)" e "Colorir (Reveal)".

### Tarefa 2 — PWA
- **Risco:** Páginas que funcionam melhor em landscape ficam limitadas
  - **Mitigação:** Layout responsivo MUI + `objectFit: 'contain'` no vídeo. Screen Orientation API para desbloqueio futuro.
- **Risco:** Mudança só tem efeito no PWA instalado
  - **Mitigação:** Comportamento esperado pela especificação W3C. O problema é no PWA instalado.

### Tarefa 3 — Configurações
- **Risco:** Página complexa com muitos campos no mobile
  - **Mitigação:** Accordion/collapse (padrão Inspector) + Stack responsivo.
- **Risco:** Defaults salvos conflitam com "última sessão" do estúdio
  - **Mitigação:** Eliminado — defaults escrevem nas MESMAS chaves `s2a_*`. A página de configurações é uma UI para setar o estado inicial do estúdio. Se o usuário usa o estúdio e muda valores, a próxima sessão carrega esses (comportamento atual preservado). "Restaurar padrões" na página de configurações limpa tudo e volta aos hardcodados. Sem conflito possível.
- **Risco:** Seletor de voz requer cópia de lógica do Inspector (inline)
  - **Mitigação:** Copiar padrão sem extrair componente. Extração em refactor futuro.

## Verificação

- [ ] Validação funcional (T1): abrir /app/video, ativar "Animar cenas" — sketch em 1.0x, reveal em "1.0x" (físico 0.25x)
- [ ] Validação funcional (T2): `bun run build` → PWA instalado não rotaciona
- [ ] Validação funcional (T3): acessar `/app/configuracoes`, configurar defaults, abrir estúdio → valores aplicados
- [ ] Validação funcional (T3): "Restaurar padrões" limpa defaults; Header exibe ícone de engrenagem
- [ ] Validação técnica: `bun run lint && bun run typecheck && bun run test` (zero erros)
- [ ] Validação de regressão: estúdio funciona normalmente sem defaults configurados

## Notebooks Relevantes

| Notebook | ID | Uso |
|----------|----|-----|
| MUI V9 Docs | `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` | Padrões FormControl, Select, MenuItem, Collapse (Lote 3) |
| Zustand Guide | `c7233d41-4d3e-471e-9e96-5247f6f6208c` | Store com persistência manual (Lote 2) |
| Vite PWA Docs | `e7546999-9e94-4dfc-b798-b8150848b342` | Confirmar `orientation` no manifest (Tarefa 2) |

## Instruções de Execução

### 1. Investigação
- `suggest_reads` e `file_context` nos arquivos listados
- Consulte Notebooks MUI V9 e Zustand para padrões
- Leia o Inspector completo para copiar padrões de formulário

### 2. Divisão do Trabalho
- `token-counter_token_count` para calcular budget (40K/agent)
- **Lote 1** (parallel, 2 agents): speed paint (3 arquivos) + PWA (1 arquivo) + testes speed paint (2 arquivos)
- **Lote 2** (parallel, 2 agents): persistência de defaults (studio.utils.ts) + i18n (3 arquivos) — **sem conflito de arquivos**
- **Lote 3** (parallel, 2 agents): componente Configuracoes.tsx + página/rota/Header/CLAUDE.md (5 arquivos) — **depende do Lote 2** (Configuracoes.tsx importa de studio.utils.ts modificado)
- **Lote 4** (1 agent): testes da página de configurações

### 3. Escolha de Agents
- `fix-worker` — Tarefa 1 (speed paint), Tarefa 2 (PWA), Header
- `builder-worker` — Tarefa 3 (persistência, componente, página, rota)
- `vitest-specialist` — testes de ambas as tarefas

### 4. Execução em Lotes
- Lote 1: 2 agents em parallel (fix-worker para speed paint + PWA, vitest-specialist para testes)
- Após Lote 1: `bun run lint && bun run typecheck && bun run test`
- Lote 2: 2 agents em parallel (builder-worker para persistência, builder-worker para i18n) — sem conflito de arquivos
- Após Lote 2: `bun run lint && bun run typecheck` — **gate obrigatório antes do Lote 3**
- Lote 3: 2 agents em parallel (builder-worker para componente + página + rota, fix-worker para Header + CLAUDE.md)
- Após Lote 3: `bun run lint && bun run typecheck`
- Lote 4: 1 agent (vitest-specialist)
- Após Lote 4: `bun run test`

### 5. Validação Pós-lote
- `bun run lint && bun run typecheck` após cada lote
- `bun run test` após lotes 1 e 4
- Corrigir sem `eslint-disable`, `@ts-ignore` ou `@ts-expect-error`
- Verificar `formatRevealLabel` cobre todos os valores do step (0.25 a 4.0 em incrementos de 0.25)
- Testar manualmente: configurar defaults → abrir estúdio → verificar → resetar → verificar limpeza
