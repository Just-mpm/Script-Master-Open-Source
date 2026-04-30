# Plano: Página de Onboarding Wizard (`/onboarding`)

## Contexto

O projeto Script Master tem um tour guiado no estúdio (WelcomeDialog + TourTooltip via OnboardingManager), mas não possui uma experiência de onboarding dedicada pós-cadastro. A referência visual em `docs/onboarding-ux/src/App.tsx` implementa um wizard de 4 steps (boas-vindas, nome+perfil, objetivos, conclusão) com glass morphism, animações suaves (motion/react AnimatePresence) e coleta de dados do usuário.

**Decisões tomadas:**
- Escopo: todos os usuários (reutilizar chave `s2a_onboarding_completed` existente — quem já completou o tour não vê o wizard)
- Proteção: própria (verifica `user !== null`, sem exigir verificação de email)
- Persistência: Firestore (`user_settings`) + localStorage (`s2a_onboarding_profile`)
- Visual: dark theme adaptado (glassPanelSx, BRAND_GRADIENT, tokens existentes)

**Evidências técnicas:**
- AuthContext redireciona para `/app/estudio` via `window.location.href` (linha 74) após login ativo — precisa mudar para `/onboarding`
- ProtectedRoute bloqueia usuários email não verificados — wizard não pode usá-la
- `UserSetting` em `types.ts:84` precisa de campos `name`, `role`, `goals`
- `saveUserSettings` em `user-settings.ts` precisa ser estendido para aceitar os novos campos
- i18n: seção `onboarding` já existe nos 3 locales (welcome + tooltip) — adicionar `wizard` subsection
- Teste de i18n completeness (`tests/i18n/locales.completeness.unit.test.ts:67`) lista `requiredSections` — `onboarding` já está

## Decisões Pendentes

Nenhuma — todas as decisões foram tomadas na Fase 1.

## Decisões Tomadas

### 1. Escopo do wizard
- Decisão: Todos os usuários (reutilizar `s2a_onboarding_completed`)
- Justificativa: Quem já completou o tour do estúdio não é incomodado. Novos usuários veem o wizard antes do tour.

### 2. Proteção de rota
- Decisão: Proteção própria (verificar `user !== null` no componente)
- Justificativa: ProtectedRoute bloqueia email não verificado, o que impediria recém-cadastrados de ver o wizard.

### 3. Persistência dos dados
- Decisão: Firestore + localStorage
- Justificativa: Dados de perfil persistem na nuvem. Cache local para leitura rápida.

### 4. Visual
- Decisão: Dark theme adaptado da referência
- Justificativa: Consistência com o resto do app. A referência usa light theme + Tailwind — adaptar para MUI dark.

### 5. Localização do store
- Decisão: Criar `src/features/onboarding-wizard/` separado do onboarding existente
- Justificativa: Responsabilidades diferentes (wizard de perfil vs tour de tooltips). Evita acoplamento.

## Reutilização e Padrões

- Reutilizar: `src/theme/surfaces.ts` → `glassPanelSx(theme)` (panel principal do wizard)
- Reutilizar: `src/theme/tokens.ts` → `BRAND_GRADIENT`, `APP_BORDER`, `TEXT_PRIMARY/SECONDARY`, `GLASS_BG`
- Reutilizar: `src/theme/authStyles.ts` → `authTextFieldSx` (campo de nome)
- Reutilizar: `src/components/public/animations.ts` → `SPRING_SMOOTH`, `SPRING_GENTLE`, `fadeInUp`, `fadeIn`, `scaleIn`, `staggerContainer`
- Reutilizar: `src/lib/logger.ts` → `createLogger('onboardingWizard')`
- Reutilizar: `src/features/i18n/context.tsx` → `useLocale()` para `t()` e `locale`
- Reutilizar: `src/contexts/AuthContext.tsx` → `useAuth()` para `user` e `loading`
- Reutilizar: `src/lib/seo.ts` → `getPageSeo()` + `DocumentHead`
- Reutilizar: `src/lib/db/user-settings.ts` → `saveUserSettings()` (estendido), `getUserSettings()`
- Reutilizar: `src/components/public/PageLayout.tsx` → padrão de layout de página
- Reutilizar: padrão de lazy loading de rotas em `src/router/routes.tsx`
- Reutilizar: padrão de persistência localStorage com `try/catch` + `createLogger` do `onboardingStore.ts`
- Padrão de referência: `src/features/onboarding/components/WelcomeDialog.tsx` (glass panel MUI, BRAND_GRADIENT, ícones)
- Padrão de referência: `docs/onboarding-ux/src/App.tsx` (estrutura 4 steps, AnimatePresence, variants directionais, stagger)
- Código novo: `src/features/onboarding-wizard/` (feature folder separado), `src/pages/OnboardingPage.tsx`

## Arquivos a Modificar

### Novos arquivos
- `src/pages/OnboardingPage.tsx` — página principal do wizard com 4 steps
- `src/features/onboarding-wizard/types.ts` — tipos do wizard (WizardData, WizardRole, WizardGoal)
- `src/features/onboarding-wizard/store/wizardStore.ts` — Zustand store com localStorage
- `src/features/onboarding-wizard/components/WizardContainer.tsx` — container glass com progress bar
- `src/features/onboarding-wizard/components/WelcomeStep.tsx` — step 0 (boas-vindas)
- `src/features/onboarding-wizard/components/ProfileStep.tsx` — step 1 (nome + role)
- `src/features/onboarding-wizard/components/GoalsStep.tsx` — step 2 (objetivos)
- `src/features/onboarding-wizard/components/CompletionStep.tsx` — step 3 (conclusão)
- `src/features/onboarding-wizard/components/StepNavigation.tsx` — botões prev/next compartilhados
- `src/features/onboarding-wizard/components/SelectionCard.tsx` — card clicável reutilizável
- `src/features/onboarding-wizard/index.ts` — barrel exports
- `src/features/onboarding-wizard/constants.ts` — roles, goals, step variants
- `tests/pages/OnboardingPage.component.test.tsx` — testes da página

### Arquivos existentes a modificar
- `src/lib/db/types.ts` — estender `UserSetting` com `name?`, `role?`, `goals?`
- `src/lib/db/user-settings.ts` — estender `saveUserSettings` para aceitar campos de perfil
- `src/features/i18n/locales/pt-BR.ts` — adicionar `onboarding.wizard.*` + `seo.onboarding.*`
- `src/features/i18n/locales/en.ts` — adicionar `onboarding.wizard.*` + `seo.onboarding.*`
- `src/features/i18n/locales/es.ts` — adicionar `onboarding.wizard.*` + `seo.onboarding.*`
- `src/router/routes.tsx` — adicionar rota `/onboarding` com lazy loading
- `src/contexts/AuthContext.tsx` — mudar redirect pós-login para `/onboarding` (condicional a `s2a_onboarding_completed`)
- `src/App.tsx` — adicionar condição `isOnboardingRoute` para layout sem Header/Container
- `vite.config.ts` — adicionar `/onboarding` ao `publicRoutes` do coepPlugin (evitar COEP em dev)
- `public/robots.txt` — adicionar `/onboarding` ao disallow (página autenticada, não deve ser indexada)

## Passos de Implementação

### Lote 1: Preparação (sem breaking changes)

1. **Estender tipos e persistência de user_settings**
   - Arquivos: `src/lib/db/types.ts`, `src/lib/db/user-settings.ts`
   - Ação: Adicionar `name?: string`, `role?: string`, `goals?: string[]` a `UserSetting`. Estender `saveUserSettings` para aceitar `{ customSystemPrompt, name, role, goals }`.
   - Resultado: Interface estendida sem breaking change (campos opcionais)
   - Sugestão: `builder-worker` | Notebook: `c5e58e83-b49e-402c-80d4-dc53acb5453e` (Firebase Firestore Docs)

2. **Adicionar strings i18n nos 3 locales**
   - Arquivos: `src/features/i18n/locales/pt-BR.ts`, `en.ts`, `es.ts`
   - Ação: Adicionar seção `onboarding.wizard` com strings para 4 steps (welcome, profile, goals, completion) + navegação + SEO
   - Resultado: Todas as strings do wizard traduzidas em 3 idiomas
   - Sugestão: `builder-worker`

### Lote 2: Feature folder do wizard (arquivos novos)

3. **Criar feature folder `src/features/onboarding-wizard/`**
   - Arquivos: `types.ts`, `constants.ts`, `store/wizardStore.ts`, `components/*.tsx`, `index.ts`
   - Ação: Implementar toda a lógica do wizard — types, store Zustand, constants (roles/goals/variants), 4 step components, container glass, selection card, step navigation
   - Detalhes:
     - `WizardData`: `{ name: string, role: string, goals: string[] }`
     - Store: `currentStep`, `direction`, `data`, `isCompleted` + ações `nextStep`, `prevStep`, `complete`
     - Persistência: `s2a_onboarding_completed` (reutilizar), `s2a_onboarding_profile` (JSON com dados)
     - Animações: `AnimatePresence mode="wait"` com `custom={direction}`, variants directionais (enter/exit com blur + slide)
     - Progress bar: `motion.div` com `layout` + `BRAND_GRADIENT`
     - Container: `glassPanelSx(theme)` + `Box component={motion.div}` para animação de entrada
     - Background: 2 orbs animados com `BRAND_PRIMARY_GLOW` e `BRAND_SECONDARY_GLOW_SOFT` + `filter: blur(80px)`
     - SelectionCard: `Paper` com `sx` condicional (selected vs unselected), `motion.button` com `whileHover/whileTap`
   - Resultado: Feature completa, independente, testável isoladamente
   - Sugestão: `builder-worker` | Notebook: `27c5f2f5-8974-40e3-b4d0-53c374743c39` (Motion Guide)
   - Sugestão: `ui-designer` em background para refinamento visual

### Lote 3: Integração (depende do Lote 2)

4. **Criar página OnboardingPage e integrar rota**
   - Arquivos: `src/pages/OnboardingPage.tsx`, `src/router/routes.tsx`
   - Ação:
     - Criar `OnboardingPage` com export nomeado (padrão auth pages)
     - Lazy loading em `routes.tsx` com `<Route path="/onboarding">`
     - Proteção própria: `useAuth()` + `Navigate to="/login"` se `!user`
     - Sem `ProtectedRoute` (não exige verificação de email)
     - `DocumentHead` com `getPageSeo()` usando strings `seo.onboarding.title` e `seo.onboarding.description` (já adicionadas no passo 2)
     - Meta tag `noindex, nofollow`: `DocumentHead` não tem prop `robots` — adicionar `{ name: 'robots', content: 'noindex, nofollow' }` diretamente no JSX como `<meta>` tag (padrão do NotFoundPage), ou estender `SeoProps`/`getPageSeo()` para injetar no array `meta`
   - Resultado: Rota `/onboarding` acessível apenas para usuários autenticados, com SEO e noindex
   - Sugestão: `builder-worker`

5. **Modificar AuthContext para redirect pós-login** (depende do passo 4)
   - Arquivo: `src/contexts/AuthContext.tsx`
   - Ação: Mudar redirect (linha 74) de `window.location.href = '/app/estudio'` para lógica condicional:
     - Se `s2a_onboarding_completed !== 'true'` → `/onboarding`
     - Senão → `/app/estudio` (comportamento atual)
   - Dependência: a rota `/onboarding` deve existir antes de ativar o redirect (passo 4)
   - Resultado: Novos usuários vão para wizard; existentes continuam direto para estúdio
   - Sugestão: `fix-worker` (mudança pequena e cirúrgica)

6. **Ajustar COEP e layout** (depende do passo 4)
   - Arquivos: `vite.config.ts`, `src/App.tsx`, `public/robots.txt`
   - Ação:
     - `vite.config.ts`: adicionar `/onboarding` ao array `publicRoutes` do coepPlugin — evita COEP em dev (o wizard não precisa de SharedArrayBuffer)
     - `src/App.tsx`: adicionar `isOnboardingRoute = currentPath === '/onboarding'` na classificação de rotas (linha 48). A rota já renderiza sem chrome por padrão (`isPublicOrLogin = !isAppRoute`), mas a flag explícita evita efeitos colaterais futuros
     - `public/robots.txt`: adicionar `Disallow: /onboarding` (página autenticada, não deve ser indexada por crawlers)
   - Dependência: a rota `/onboarding` deve existir antes de configurar COEP/robots
   - Resultado: Wizard sem COEP em dev, layout limpo, bloqueado em robots.txt
   - Sugestão: `fix-worker`

### Lote 4: Testes e validação (depende do Lote 3)

7. **Criar testes da página e do store**
   - Arquivos: `tests/pages/OnboardingPage.component.test.tsx`, `tests/features/onboarding-wizard/` (se aplicável)
   - Ação: Testes de renderização dos 4 steps, navegação, persistência localStorage, proteção de rota, i18n
   - Resultado: Cobertura de testes para o wizard
   - Sugestão: `vitest-specialist`

8. **Validação pós-lote: lint + typecheck + test**
   - Ação: `bun run lint`, `bun run typecheck`, `bun run test`
   - Corrigir sem `eslint-disable` ou `@ts-ignore`
   - Resultado: 0 erros, 0 warnings
   - Sugestão: `fix-worker`

## Riscos e Mitigações

- **Risco:** Redirect pós-login com COEP — em dev, `coepPlugin()` aplica COEP em rotas fora de `publicRoutes`. | **Mitigação:** Adicionar `/onboarding` ao `publicRoutes` em `vite.config.ts`. Em produção (`firebase.json`), `/onboarding` não está em `/app/**`, então não recebe COEP. Confirmado.
- **Risco:** `s2a_onboarding_completed` já é `true` para usuários existentes (que completaram o tour). | **Mitigação:** É o comportamento desejado — usuários existentes pulam o wizard. Novos usuários veem o wizard antes do tour.
- **Risco:** `UserSetting` com campos novos pode conflitar com `createFirestoreConverter` (remove `undefined`). | **Mitigação:** Campos são opcionais (`?`). O converter já remove `undefined` na serialização. Firestore aceita campos ausentes.
- **Risco:** AnimatePresence com motion.div pode conflitar com LazyMotion. | **Mitigação:** O projeto usa `motion` direto (não `LazyMotion`) nas páginas publicas. O wizard pode seguir o mesmo padrão.
- **Risco:** Dados de perfil coletados mas não utilizados em nenhum lugar do app. | **Mitigação:** Os dados ficam salvos para uso futuro. O wizard é uma experiência de personalização — o valor está na percepção do usuário, não na funcionalidade imediata.

## Verificação

- [ ] Validação funcional: fluxo completo (login → wizard → estúdio), navegação entre steps, salvamento de dados, skip, mobile responsiveness
- [ ] Validação técnica: `bun run lint` (0 erros), `bun run typecheck` (0 erros), `bun run test` (todos passando)
- [ ] Validação de regressão: rotas existentes funcionam, tour do estúdio inalterado, login/logout sem impacto

## Notebooks Relevantes

| Notebook | ID | Uso |
|----------|----|-----|
| Motion Guide | `27c5f2f5-8974-40e3-b4d0-53c374743c39` | AnimatePresence, variants directionais, step transitions |
| Firebase Firestore Docs | `c5e58e83-b49e-402c-80d4-dc53acb5453e` | Extensão de tipos, salvamento de documentos |
| MUI V9 Docs | `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` | Componentes MUI, sx prop, tokens |

## Instruções de Execução

Ao executar este plano, siga este protocolo:

### 1. Investigação
- Use analyze tools (`suggest_reads`, `impact_analysis`, `file_context`) nos arquivos listados
- Consulte os Notebooks Relevantes acima para confirmar padrões da tecnologia envolvida
- Identifique padrões, dependências e riscos que o plano não cobriu

### 2. Divisão do Trabalho
- Calcule tokens dos arquivos com `token-counter_token_count` (budget: 40K por agent)
- Agrupe por afinidade — arquivos que se modificam juntos ficam juntos
- Respeite dependências: quem cria tipo usado por outro vai primeiro
- Nunca dois agents do mesmo lote tocam no mesmo arquivo

### 3. Escolha de Agents
Para cada grupo, escolha o agent mais adequado ao contexto:
- `builder-worker` — código novo, features, refatorações, componentes
- `fix-worker` — correções, ajustes, fixes
- `ui-designer` — refinamento visual de componentes/páginas (MUI)
- `vitest-specialist` — testes de lógica (hooks, utils, services sem Firebase)
- `firebase-vitest-specialist` — testes Firebase (functions, triggers, rules)
- Qualquer outro agent que se encaixe no contexto da tarefa

As sugestões nos passos são pontos de partida — o executor decide com base na investigação.

### 4. Execução em Lotes
- Lote 1 (preparação): passo 1 + passo 2 em paralelo (sem dependência entre si)
- Lote 2 (feature): passo 3 — único, grande
- Lote 3 (integração): passo 4 primeiro (cria rota), depois passo 5 + passo 6 em paralelo (ambos dependem de 4)
- Lote 4 (validação): passo 7 + passo 8 — passo 7 primeiro, depois 8

### 5. Validação Pós-lote
- Execute scripts de lint e type-check (verifique `package.json`)
- Corrija sem `eslint-disable`, `@ts-ignore` ou `@ts-expect-error` — corrija a causa raiz
- Repita até 0 erros e 0 warnings
