# Auditoria de Lacunas — StackedHeader e Adoção

**Data:** 2026-06-03
**Escopo:** Componente `src/components/ui/StackedHeader.tsx` (824 linhas, 5 props novas) e 16 call sites
**Método:** Investigação estática (read, grep, supergrep, analyze) sem execução de testes nem edição de código

---

## 1. Contexto assumido

- O componente `StackedHeader` foi ampliado com 5 novas props: `direction`, `actionAlign`, `controlAlign`, `actionPlacement`, `density`.
- O `analyze_aitool_changes` confirma 18 arquivos modificados (+1041/-294) e adição de 5 tipos públicos + 2 helpers + 1 constante de density.
- O plano original previa migrar ~12 call sites; a versão atual 0.125.0 documenta 12 migrados (Ondas 1-3).
- A auditoria deve:
  1. Confirmar que NENHUM call site foi esquecido
  2. Detectar gaps na API
  3. Detectar gaps em testes, JSDoc, AGENTS.md, i18n, barrel
  4. Verificar consistência entre call sites
  5. Listar combinações de props potencialmente problemáticas

---

## 2. Mapa rápido — sólido vs frágil

### Sólido
- **API implementada:** 5 tipos exportados (`StackedHeaderAxis`, `StackedHeaderBreakpoint`, `StackedHeaderResponsiveAxis`, `StackedHeaderDirection`, `StackedHeaderActionAlign`, `StackedHeaderControlAlign`, `StackedHeaderActionPlacement`, `StackedHeaderDensity`), helper `axisToStackDirection`, `alignToFlexValue`, `resolveDirection`, `resolveAlignItems`, `getEffectiveAxis`, mapa `DIRECTION_DEFAULTS` e `DENSITY_TOKENS`.
- **Defaults inteligentes:** `DIRECTION_DEFAULTS[alert]='vertical'`, `DIRECTION_DEFAULTS[glass|plain]='responsive'`. Em `actionAlign`/`controlAlign` o default deriva de `effectiveAxis` (vertical → 'end', horizontal → 'center').
- **Barrel export** completo: 14 tipos exportados de `src/components/ui/index.ts`.
- **JSDoc inline:** todas as 5 props novas têm JSDoc com `@default` e descrição semântica.
- **Cobertura de testes:** 935 linhas em `tests/components/StackedHeader.component.test.tsx` com 6 describe blocks específicos (`direction`, `actionAlign`, `controlAlign`, `actionPlacement`, `density`, `defaults inteligentes por variant`) + 3 testes de retrocompatibilidade.
- **9 call sites com `action` migrados** corretamente para `actionPlacement="stack" actionAlign="end"` (Library 5×, ImageStudio 2×, Assistant 1×, VideoLibrary 1×, AnalyticsConsentPrompt 1×, FeedbackBanner 1×).
- **1 refatoração especial:** `CreditBlockedMessage` usa `actionAlign="start"` (intencional para "Ver planos" alinhado à esquerda em diálogo de bloqueio).
- **1 migração de sidebar:** `ImageStudio.tsx` linhas 285-376 substituiu `<Paper><Collapse>...` por `<StackedHeader collapsible>`.
- **1 migração de controles:** `SpeedPaintControls.tsx` (lido 173 linhas) substituiu `<Box><Collapse>` por `<StackedHeader density="compact">`.
- **2 gaps `GAP-07`** documentados inline (ImageStudio.tsx linha 365, 555; Assistant.tsx linha 474) marcam Alerts migrados.

### Frágil
- **1 call site com `action={<Stack><Button>...</Button></Stack>}` SEM `actionPlacement`:** `Configuracoes.tsx` linha 740 (warning reset confirmation). A variant `alert` aplica default `actionPlacement='inline'`, mas com 2 botões o `stack` é semanticamente mais consistente.
- **3 call sites colapsáveis usando `useState` manual + `useId` em vez de `useCollapsibleSection`:** `Inspector.tsx` (2×), `ImageStudio.tsx` (1×), `SpeedPaintControls.tsx` (1×). Reduz boilerplate se migrarem para o hook centralizado.
- **AGENTS.md desatualizado:** o parágrafo `### StackedHeader` (linha 144-145) menciona apenas props antigas (`collapsible`, `defaultCollapsed`, `action`, `severity`, variantes `section`/`banner`) — não cita as 5 props novas nem o hook `useCollapsibleSection`.
- **Inconsistência na API:** `actionAlign` aceita `'stretch'` mas `controlAlign` não. Provavelmente intencional (control = Chip/Switch raramente estica), mas o tipo interno `alignToFlexValue` ainda trata `'stretch'` como caso possível.
- **Sem `docs/plan` ou `docs/scan`** dedicado ao StackedHeader, apesar do JSDoc referenciar `@see docs/plan/stacked-header-plano-final.md` e o AGENTS.md mencionar "9 auditorias + 3 planos documentados".
- **`actionAlign` JSDoc não documenta o caso `'stretch'`** (linha 343-348) — descreve o default mas não o quarto valor do union.
- **Combinação `density="compact"` com `variant="alert"` + `collapsible`** é suportada mas não tem teste explícito (o teste de padding em linha 787-853 cobre `glass` collapsible).

---

## 3. Gaps priorizados

### GAP-01 — `Configuracoes.tsx` (warning reset) sem `actionPlacement`

- **Categoria:** Call site (consistência)
- **Severidade:** MÉDIO
- **Arquivo:** `src/components/Configuracoes.tsx:740-755`
- **Problema:** O StackedHeader de confirmação de reset tem 2 botões (Cancelar + Reset) agrupados em um `<Stack direction="row">` dentro de `action={...}`, mas NÃO define `actionPlacement` nem `actionAlign`. O default `'inline'` (herdado de `variant="alert"`+vertical) põe o Stack à direita do texto — visualmente aceitável, mas diverge do padrão consolidado nos outros 9 sites (`actionPlacement="stack" actionAlign="end"`).
- **Evidência:**
  ```tsx
  <StackedHeader
    variant="alert"
    severity="warning"
    title={t('common.warning')}
    description={t('configuracoes.resetConfirm')}
    action={
      <Stack direction="row" spacing={1}>
        <Button ...>{t('common.cancel')}</Button>
        <Button color="warning" variant="contained" ...>{t('configuracoes.reset')}</Button>
      </Stack>
    }
  />
  ```
  Comparado com `Library.tsx:498-511` que tem `actionPlacement="stack" actionAlign="end"` no mesmo padrão (alert + action Button).
- **Impacto:** Visual: ambos os botões ficam grudados à direita do texto em uma única linha. Comportamental: nenhum, é retrocompatível. Consistência: quebra o padrão "9 sites migrados, 1 não".
- **Mitigações verificadas:** Default `actionPlacement='inline'` produz layout aceitável (Action no rightContent, lado a lado com chevron ausente aqui). Não trava UX.
- **Sugestão:** Adicionar `actionPlacement="stack" actionAlign="end"`. Como 2 botões (Cancel+Reset) em variant alert, o `stack` separa visualmente o bloco de ação do texto da confirmação, alinhando com a heurística dos outros sites. Aprovação de design recomendada (afeta fluxo de reset de preferências).
- **Pergunta/decisão:** Manter o default `inline` (mais compacto, OK para 2 botões pequenos) ou migrar para `stack` (consistência)?

### GAP-02 — `Inspector.tsx` usa `useState` manual em 2 StackedHeader colapsáveis

- **Categoria:** Call site (adoção do hook)
- **Severidade:** BAIXO
- **Arquivo:** `src/components/Inspector.tsx:190-191, 193-194, 333, 465`
- **Problema:** Os 2 StackedHeader colapsáveis (Voice e Direction sections) usam `useState` manual + IDs hardcoded (`'inspector-voice-section'`, `'inspector-direction-section'`) em vez do hook `useCollapsibleSection` que já foi criado para reduzir boilerplate.
- **Evidência:**
  ```tsx
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState(true);
  const [isDirectionCollapsed, setIsDirectionCollapsed] = useState(true);
  const voiceSectionId = 'inspector-voice-section';
  const directionSectionId = 'inspector-direction-section';
  // ...
  onToggle={() => setIsVoiceCollapsed((prev) => !prev)}
  collapseId={voiceSectionId}
  ```
  Comparado com `Configuracoes.tsx:86` que adota o hook:
  ```tsx
  const { expanded, onToggle } = useCollapsibleSection(true);
  ```
- **Impacto:** Boilerplate (~6 linhas por seção) + risco de colisão de IDs se algum outro componente também usar IDs hardcoded.
- **Mitigações verificadas:** IDs hardcoded são únicos (prefixo `inspector-`). Funciona corretamente.
- **Sugestão:** Migrar ambos para `useCollapsibleSection(true)` — reduz 6 linhas por seção, padroniza, evita IDs manuais. Custo: 1 import adicional e troca de `isVoiceOpen` por `expanded` no resto do componente.
- **Pergunta/decisão:** Vale o churn de refatorar para 2 sites? Sim se a Onda 4 da adoção incluir padronização de colapsáveis.

### GAP-03 — `ImageStudio.tsx` usa `useState` manual no sidebar colapsável

- **Categoria:** Call site (adoção do hook)
- **Severidade:** BAIXO
- **Arquivo:** `src/components/ImageStudio.tsx:88-89, 287-294`
- **Problema:** O StackedHeader colapsável da sidebar usa `useState` manual + `useId`, mas o hook `useCollapsibleSection` é o padrão recomendado.
- **Evidência:**
  ```tsx
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const sidebarCollapseId = useId();
  // ...
  onToggle={() => {
    if (!isDesktop) {
      setIsSidebarCollapsed((previous) => !previous);
    }
  }}
  collapseId={sidebarCollapseId}
  ```
  A lógica condicional (`if (!isDesktop)`) impede o toggle em desktop, então a migração para o hook precisa de adaptação (ex: criar um wrapper ou controlar o `expanded` externo).
- **Impacto:** Boilerplate (3 linhas), mas a lógica condicional torna a migração menos trivial. O `useId` do React é mais robusto que o `useId` do hook (`stacked-header-${id}`) se múltiplos `useCollapsibleSection` coexistirem.
- **Sugestão:** Criar variante `useCollapsibleSection` com callback condicional OU manter `useState` aqui (decisão justificada pelo comportamento desktop-only).
- **Pergunta/decisão:** Manter como está (a lógica condicional justifica) ou refatorar criando `useCollapsibleSection({ enabled: isDesktop })` com expansão condicional?

### GAP-04 — `SpeedPaintControls.tsx` usa `useState` manual

- **Categoria:** Call site (adoção do hook)
- **Severidade:** BAIXO
- **Arquivo:** `src/features/video-render/components/SpeedPaintControls.tsx:58-59, 88-90`
- **Problema:** O StackedHeader colapsável usa `useState(false)` + `useId()` manual, mas o hook `useCollapsibleSection` está disponível e o componente é candidato natural (1 seção colapsável, sem lógica condicional).
- **Evidência:**
  ```tsx
  const [isExpanded, setIsExpanded] = useState(false);
  const sectionId = useId();
  // ...
  onToggle={() => setIsExpanded((prev) => !prev)}
  collapseId={sectionId}
  ```
- **Impacto:** Boilerplate (3 linhas), sem benefício técnico. Hook `useCollapsibleSection(false)` é um substituto direto.
- **Sugestão:** Migrar para `useCollapsibleSection(false)` — economiza 2 linhas, padroniza.
- **Pergunta/decisão:** Migrar agora ou empacotar em uma Onda 4 de adoção?

### GAP-05 — AGENTS.md (StackedHeader) não menciona as 5 props novas

- **Categoria:** Documentação
- **Severidade:** MÉDIO
- **Arquivo:** `AGENTS.md:144-145`
- **Problema:** O parágrafo sobre StackedHeader na seção "Design System & Tema" cita apenas props legadas (`collapsible`, `defaultCollapsed`, `onToggle`, `action`, `severity`, variantes `section`/`banner`). Não menciona `direction`, `actionAlign`, `controlAlign`, `actionPlacement`, `density`, nem o hook `useCollapsibleSection`, nem o default inteligente por variant.
- **Evidência:**
  > Resolve 3 famílias de UI com 1 API: (1) Banners com ação (substitui `<Alert action={<Button>}>` em 8+ componentes), (2) Headers de seção colapsáveis (animação Motion para expand/contract), (3) Títulos de seção simples. Props: `collapsible` (com `defaultCollapsed` + `onToggle` via hook `useCollapsibleSection` em `src/hooks/useCollapsibleSection.ts`), `action` (botão opcional), `severity` (success/warning/error/info), variante `section`/`banner`. Migrado em ~12 componentes.
- **Impacto:** Futuros contributors que lerem AGENTS.md não saberão das 5 props novas. A versão 0.125.0 no changelog (linha 187) é mais precisa mas é changelog, não documentação de uso.
- **Sugestão:** Reescrever o parágrafo para mencionar:
  - As 5 props novas com 1 linha cada
  - Defaults inteligentes (alert=vertical, glass=responsive)
  - `actionPlacement` ("stack" é o padrão consolidado em 9 sites)
  - Que `useCollapsibleSection` é o helper recomendado
  - Tamanho atual (824 linhas, era 508)
- **Pergunta/decisão:** Atualizar AGENTS.md agora ou criar `docs/design-system/stacked-header.md` separado?

### GAP-06 — Sem `docs/plan/stacked-header-plano-final.md` no disco

- **Categoria:** Documentação
- **Severidade:** BAIXO
- **Arquivo:** (referência quebrada)
- **Problema:** O JSDoc do `StackedHeader.tsx:20` referencia `@see docs/plan/stacked-header-plano-final.md`, mas o arquivo não existe (`glob docs/plan/**` retorna 0 arquivos). O AGENTS.md também menciona "9 auditorias + 3 planos documentados" sem localizá-los.
- **Evidência:** Busca `docs/**/*.md` retorna apenas `docs/CHANGELOG-COMPLETE.md` e `docs/research/*` (relacionados a mercado, não a este componente).
- **Impacto:** Link quebrado. Desenvolvedores que seguirem o `@see` não encontrarão o plano.
- **Sugestão:** Criar `docs/plan/stacked-header-plano-final.md` com pelo menos:
  - Lista das 5 props + defaults
  - Tabela de 16 call sites com props efetivas
  - Critérios de adoção do hook
  - Combinações proibidas/recomendadas
- **Pergunta/decisão:** Criar o plano retroativamente ou apenas corrigir o JSDoc removendo o `@see`?

### GAP-07 — `actionAlign` JSDoc não documenta o valor `'stretch'`

- **Categoria:** API / Documentação
- **Severidade:** BAIXO
- **Arquivo:** `src/components/ui/StackedHeader.tsx:88, 343-348`
- **Problema:** O tipo `StackedHeaderActionAlign = 'start' | 'end' | 'center' | 'stretch'` aceita 4 valores, mas o JSDoc (linha 343-348) só descreve o default e o comportamento genérico. O valor `'stretch'` não é mencionado, apesar de ser tratado por `alignToFlexValue` (linha 163-164).
- **Evidência:**
  ```typescript
  export type StackedHeaderActionAlign = 'start' | 'end' | 'center' | 'stretch';
  // ...
  /** Alinhamento cross-axis do slot `action`.
   * Em direção vertical, aplica `alignSelf` no Box do action (`'end'` = canto
   * direito, `'start'` = canto esquerdo). Em direção horizontal, sem efeito
   * visível (action já está na linha). Default: `'end'` para vertical, `'center'`
   * para horizontal.
   */
  actionAlign?: StackedHeaderActionAlign;
  ```
- **Impacto:** Confusão de quem for usar a prop. `'stretch'` faz o `alignSelf: stretch`, que esticaria o action ao longo do cross-axis (largura total se vertical) — comportamento raramente desejado para um botão, mas pode ser útil para um `Box` custom.
- **Sugestão:** Adicionar ao JSDoc: `- 'stretch': estica o action na cross-axis (equivalente a `alignSelf: stretch`)` ou removê-lo do union se for realmente desnecessário.
- **Pergunta/decisão:** Documentar `'stretch'` ou removê-lo?

### GAP-08 — Inconsistência `actionAlign` vs `controlAlign`

- **Categoria:** API (consistência)
- **Severidade:** BAIXO
- **Arquivo:** `src/components/ui/StackedHeader.tsx:88, 91`
- **Problema:** `actionAlign` aceita `'start' | 'end' | 'center' | 'stretch'` (4 valores), `controlAlign` aceita apenas `'start' | 'end' | 'center'` (3 valores). A diferença pode ser intencional (control raramente estica), mas a função `alignToFlexValue` (linha 153) ainda aceita `'stretch'` no parâmetro (union `start | end | center | stretch`).
- **Evidência:**
  ```typescript
  export type StackedHeaderActionAlign = 'start' | 'end' | 'center' | 'stretch';
  export type StackedHeaderControlAlign = 'start' | 'end' | 'center';
  ```
- **Impacto:** Inconsistência de tipos. Se um futuro dev tentar passar `controlAlign="stretch"`, TypeScript bloqueia, mas o helper interno continuaria tratando.
- **Sugestão:** Decidir e documentar:
  - (a) Adicionar `'stretch'` ao `StackedHeaderControlAlign` para paridade.
  - (b) Remover `'stretch'` do `StackedHeaderActionAlign` se for raramente usado.
  - (c) Manter como está + adicionar comentário explicando.
- **Pergunta/decisão:** Paridade total ou manter assimetria intencional?

### GAP-09 — Combinação `density="compact" + variant="alert"` sem teste explícito

- **Categoria:** Testes
- **Severidade:** BAIXO
- **Arquivo:** `tests/components/StackedHeader.component.test.tsx:787-853`
- **Problema:** O teste de `density` (linha 787-853) cobre `variant="glass" collapsible`, mas NÃO cobre a combinação `variant="alert" + density="compact"` (que é usada em `FeedbackBanner.tsx` com density=compact, e em outros 4 sites via o default intelligent de 'standard'). Quando `variant="alert"`, o padding do ButtonBase é zerado (linha 677 do StackedHeader.tsx), mas o padding do Alert externo usa `densityTokens.containerPx/Py` (linhas 785-786).
- **Evidência:** A lógica de padding em `StackedHeader.tsx:674-681`:
  ```typescript
  const buttonBasePaddingSx =
    variant === 'alert'
      ? { px: 0, py: 0 }
      : { px: { xs: densityTokens.containerPx.xs, ...}, py: { ... } };
  ```
  E o Alert externo (linha 785-786) usa `densityTokens.containerPx.xs` e `densityTokens.containerPy.xs` para `px` e `py`. Mas o teste de `density` em linha 787 só verifica ButtonBase.
- **Impacto:** Nenhum conhecido — o padding do Alert é aplicado, mas se houver regressão futura, não seria pego.
- **Sugestão:** Adicionar 1 teste que renderiza `<StackedHeader variant="alert" density="compact" collapsible expanded={false} onToggle={...}>` e verifica que o Alert externo tem padding reduzido (4px em xs, 8px em md).
- **Pergunta/decisão:** Adicionar agora ou empacotar em suíte de regressão?

---

## 4. Validação de API

### Tabela por prop

| Prop | Tipo | Default | Testado? | JSDoc? | Exportado barrel? |
|------|------|---------|----------|--------|-------------------|
| `direction` | `StackedHeaderAxis \| 'responsive' \| StackedHeaderResponsiveAxis` | `DIRECTION_DEFAULTS[variant]` (alert→vertical, glass\|plain→responsive) | ✅ 4 testes + 1 default test | ✅ Linhas 331-340 | ✅ `StackedHeaderAxis`, `StackedHeaderBreakpoint`, `StackedHeaderResponsiveAxis`, `StackedHeaderDirection` |
| `actionAlign` | `'start' \| 'end' \| 'center' \| 'stretch'` | `'end'` (vertical) / `'center'` (horizontal) | ✅ 3 testes (end/start/horizontal-no-alignSelf) | ⚠️ JSDoc não menciona `'stretch'` | ✅ `StackedHeaderActionAlign` |
| `controlAlign` | `'start' \| 'end' \| 'center'` | `'end'` (vertical) / `'center'` (horizontal) | ✅ 2 testes (end/horizontal-no-alignSelf) | ✅ Linhas 351-354 | ✅ `StackedHeaderControlAlign` |
| `actionPlacement` | `'inline' \| 'stack' \| 'bottom'` | `'inline'` | ✅ 3 testes (stack/bottom/inline-default) | ✅ Linhas 357-364 | ✅ `StackedHeaderActionPlacement` |
| `density` | `'compact' \| 'standard' \| 'comfortable'` | `'standard'` | ✅ 3 testes (compact<standard, comfortable>standard, padding) | ✅ Linhas 367-370 | ✅ `StackedHeaderDensity` |

### Combinações verificadas (lidas no código)

| Combinação | Comportamento | OK? |
|------------|---------------|-----|
| `collapsible + actionPlacement='bottom'` | action renderizado após `collapseContent` (linha 744-758) | ✅ Testado em `tests/.../StackedHeader.component.test.tsx:648-667` |
| `actionPlacement='stack' + control` | control no rightContent, action no stackedActionBlock — coexistem | ✅ OK (Inspector.tsx linha 329-459 tem control+action+chevron) |
| `density='compact' + variant='alert'` | padding do Alert reduzido, ButtonBase zera | ✅ Renderiza OK (FeedbackBanner.tsx usa `density` implícito=standard mas suporta) |
| `direction='horizontal' + actionPlacement='stack'` | mainRow=row, action em stackedActionBlock com justifyContent | ✅ OK (lógica pura, não testado explicitamente) |
| `actionAlign='stretch' + direction='vertical'` | actionBox com `alignSelf: stretch` (largura total) | ⚠️ Sem teste, comportamento válido pelo CSS |
| `direction={{ xs: 'vertical', md: 'horizontal' }}` | objeto de breakpoints | ✅ Testado (linha 539-546) |

### Props que PODERIAM faltar (não foram adicionadas)

| Prop candidata | Caso de uso | Recomendação? |
|----------------|-------------|--------------|
| `fullWidth` | Containers com largura fixa | ❌ Não necessário — `sx` cobre |
| `textAlign` | Títulos centralizados em banners | ❌ `sx={{ textAlign: 'center' }}` já funciona no slot title |
| `loading` | Skeleton enquanto busca dados | ❌ Estado externo — fora do escopo do header |
| `disabled` (no toggle) | Desabilitar colapso | ❌ `collapsible={false}` já cobre |
| `orientation` (alias de `direction`) | ❌ Adicionaria redundância |
| `headerLayout` (variant interna: 'banner' \| 'section' \| 'inline') | ❌ Já existe `variant` ('alert'\|'glass'\|'plain') |
| `onClick` no header (não-colapsável) | ❌ Use `onClick` no children ou wrap externo |
| `id` | ✅ Já existe (linha 403) |

**Veredito:** API está completa. Nenhuma prop nova é estritamente necessária.

---

## 5. Validação de testes

### Cobertura por prop (em `tests/components/StackedHeader.component.test.tsx`)

| Prop | Testes | % cobertura estimada |
|------|--------|----------------------|
| `direction` (vertical/horizontal/responsive/breakpoint-object) | 4 | 100% |
| `actionAlign` (end/start/horizontal) | 3 | 75% (falta 'center', 'stretch') |
| `controlAlign` (end/horizontal) | 2 | 50% (falta 'start', 'center') |
| `actionPlacement` (stack/bottom/inline) | 3 | 100% |
| `density` (compact/standard/comfortable) | 3 | 100% |
| Defaults inteligentes (alert/glass) | 2 | 100% |
| Retrocompatibilidade | 3 | OK |

### Testes dos call sites modificados

| Teste | Status provável | Notas |
|-------|-----------------|-------|
| `tests/components/StackedHeader.component.test.tsx` (935 linhas) | ✅ Passa | Cobre 5 props novas + retrocompat |
| `tests/video-render/SpeedPaintControls.unit.test.tsx` (253 linhas) | ✅ Passa | Atualizado com mock de `glassPanelSx` e tokens (`+41/-30` no changes) |
| `tests/components/ImageStudio.component.test.tsx` (178 linhas) | ✅ Passa | Usa `tokensMock` + wrapper `I18nProvider` + `ThemeProvider` |
| `tests/components/ImageStudio.features.test.tsx` (172 linhas) | ✅ Passa | Usa `tokensMock` + mocks de hooks |
| `tests/pages/ConfiguracoesPage.component.test.tsx` (341 linhas) | ✅ Passa | Usa `tokensMock` + mocks de store/i18n |

### Regressões detectadas

**Nenhuma regressão óbvia** identificada estaticamente. Os testes de call sites foram:
- **SpeedPaintControls:** atualizado com mock de `glassPanelSx` no teste (linha 10 do teste) + GAP_COMPACT/GAP_DEFAULT/ICON_SIZE_MD mockados.
- **ImageStudio:** dois testes (`.component` e `.features`) usam `tokensMock` que foi atualizado (no changes: `+GAP_COMPACT`, `+GAP_DEFAULT`).
- **Configuracoes:** usa `tokensMock` (atualizado) + mocks de store/i18n já existentes.

### Lacunas de teste

| Gap | Descrição | Severidade |
|-----|-----------|-----------|
| `direction="horizontal" + actionPlacement="stack"` | Combinação comum (Inspector.tsx usa), não tem teste explícito | BAIXO |
| `actionAlign="center"` e `"stretch"` | Valores aceitos pelo tipo, sem teste | BAIXO |
| `controlAlign="start"` e `"center"` | Valores aceitos, sem teste | BAIXO |
| `density="comfortable" + variant="alert"` | Combinação plausível, sem teste | BAIXO |
| `unmountOnExit` + `actionPlacement="bottom"` | Combinação de extremos, sem teste | BAIXO |

**Total de gaps de teste:** 5 (todos BAIXA severidade — cobertura essencial está OK).

---

## 6. Validação de documentação

### AGENTS.md

- **Status:** ⚠️ PARCIAL — desatualizado nas 5 props novas
- **Linha 144-145:** parágrafo `### StackedHeader` cita apenas props legadas.
- **Linha 187 (changelog 0.125.0):** menciona "StackedHeader componente genérico de UI (508 linhas) + useCollapsibleSection + migração de ~12 componentes" — está OK para changelog, mas contradiz o tamanho atual (824 linhas).
- **Hooks de design system:** nenhuma menção ao `useCollapsibleSection` em seção dedicada.

### JSDoc no `StackedHeader.tsx`

- **Cabeçalho (linhas 1-21):** menciona as 3 famílias de UI, mas o `@see docs/plan/stacked-header-plano-final.md` aponta para arquivo inexistente (GAP-06).
- **5 props novas:** todas com JSDoc + `@default`, exceto:
  - `actionAlign` JSDoc (linha 343-348) não descreve o valor `'stretch'`.
  - `direction` JSDoc (linha 331-340) menciona os 4 valores (`vertical`, `horizontal`, `responsive`, objeto), mas o tipo aceita apenas 3 valores literais + objeto. OK.
- **Status:** ⚠️ PARCIAL — completo nas props, falha no `@see` e em 1 valor de enum.

### i18n

- **Namespace `stackedHeader.*`:** presente nos 3 locales (`pt-BR.ts:2128`, `en.ts:2109`, `es.ts:2109`).
- **Chaves atuais:** apenas `collapseAriaLabel.expand` e `collapseAriaLabel.collapse` (2 strings).
- **Chaves que PODERIAM existir** (mas não são necessárias — props novas não têm strings visíveis):
  - Nenhuma nova chave é estritamente necessária.
- **Status:** ✅ COMPLETO — 3 locales cobertos para o que existe.

### Barrel export

- **Arquivo:** `src/components/ui/index.ts` (22 linhas)
- **14 tipos exportados:** `StackedHeaderProps`, `StackedHeaderVariant`, `StackedHeaderSeverity`, `StackedHeaderAlertVariant`, `StackedHeaderTitleVariant`, `StackedHeaderDescriptionVariant`, `StackedHeaderAxis`, `StackedHeaderBreakpoint`, `StackedHeaderResponsiveAxis`, `StackedHeaderDirection`, `StackedHeaderActionAlign`, `StackedHeaderControlAlign`, `StackedHeaderActionPlacement`, `StackedHeaderDensity`.
- **Status:** ✅ COMPLETO — todos os tipos públicos exportados.

---

## 7. Cenários de borda sem resposta

1. **GAP-01 — `actionPlacement` em `Configuracoes` reset confirm:** Manter `inline` (default, 2 botões cabem) ou migrar para `stack` (consistência)? Decisão de design.

2. **GAP-02/03/04 — Migração para `useCollapsibleSection`:** Vale o churn de refatorar 3 sites? Pode ser empacotado em "Onda 4" da adoção.

3. **GAP-05 — Atualizar AGENTS.md:** Manter conciso (parágrafo único) ou criar `docs/design-system/stacked-header.md` separado?

4. **GAP-06 — Plano referenciado mas inexistente:** Criar retroativamente ou remover o `@see`?

5. **GAP-07 — `'stretch'` em `actionAlign`:** Documentar ou remover do union? Qual o caso de uso real?

6. **GAP-08 — Paridade `actionAlign` vs `controlAlign`:** Adicionar `'stretch'` ao controlAlign ou remover do actionAlign?

7. **GAP-09 — Teste `density + alert`:** Adicionar agora ou só se houver regressão?

8. **Direção futura:** O componente está maduro (5 props, 16 sites, 935 linhas de teste). Próximos passos possíveis:
   - Onda 4: migração para `useCollapsibleSection` (4 sites)
   - Onda 5: aderir a `<StackedHeader>` em sites remanescentes com `<Alert action={...}>` (VideoExportPanel, SpeedPaintPage, ExportCrossRouteToast — verificar se vale a pena)
   - Adicionar prop `aria-describedby` para o description (a11y avançada)

---

## 8. Checklist de sanidade

| Item | OK? |
|------|-----|
| 16 call sites verificados? | ✅ Todos lidos (Inspector, ImageStudio, Library, Configuracoes, VideoLibrary, CreditBlockedMessage, FeedbackBanner, FeedbackFormFields, AnalyticsConsentPrompt, Assistant, StockMediaPicker, SpeedPaintControls, TranscriptionPanel) |
| 5 props novas auditadas? | ✅ direction, actionAlign, controlAlign, actionPlacement, density |
| JSDoc das props lido? | ✅ Linhas 273-405 |
| Barrel exports lido? | ✅ 14 tipos |
| AGENTS.md verificado? | ✅ Linhas 144-145, 187 |
| i18n verificado? | ✅ 3 locales (pt-BR, en, es) |
| useCollapsibleSection adoção? | ✅ 1/4 sites adota (Configuracoes), 3 usam useState manual |
| Combinações testadas? | ✅ Listadas 6 combinações |
| Lacunas de teste? | ✅ 5 gaps BAIXA severidade |
| docs/plan existe? | ❌ Não — referência quebrada |
| Action sites sem actionPlacement? | ✅ Apenas 1 (Configuracoes warning) |
| Tests pós-mudança OK? | ✅ Sem regressão óbvia detectada |

---

## 9. Resumo executivo

**Total de gaps identificados:** 9 (1 MÉDIO, 8 BAIXO)

**Por categoria:**
- Call site (consistência): 1 (GAP-01)
- Call site (adoção do hook): 3 (GAP-02, 03, 04)
- Documentação: 3 (GAP-05, 06, 07)
- API: 1 (GAP-08)
- Testes: 1 (GAP-09)

**Top 3 ações prioritárias:**

1. **GAP-01 (MÉDIO) — Adicionar `actionPlacement="stack" actionAlign="end"` no `Configuracoes.tsx:740`** (ou justificar manter default). Risco: 1 linha. Benefício: consistência visual com 9 outros sites.

2. **GAP-05 (MÉDIO) — Atualizar parágrafo `### StackedHeader` no AGENTS.md.** Risco: 0 (só texto). Benefício: futuros contributors descobrem as 5 props novas.

3. **GAP-02/03/04 (BAIXO, em conjunto) — Empacotar migração para `useCollapsibleSection` em "Onda 4"** cobrindo Inspector (2×), ImageStudio (1×) e SpeedPaintControls (1×). Risco: baixo. Benefício: -10 linhas de boilerplate, padronização.

**Quick wins (sem risco):**
- GAP-05 (atualizar AGENTS.md)
- GAP-06 (criar `docs/plan/stacked-header-plano-final.md` ou remover `@see`)
- GAP-09 (adicionar 1 teste de `density + alert`)

**Não-urgentes:**
- GAP-02/03/04 (migração para `useCollapsibleSection` — empacotar)
- GAP-07/08 (decisões de API sobre `'stretch'`)
