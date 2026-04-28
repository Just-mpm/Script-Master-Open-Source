# Plano: Transformação Estrutural do Script Master

## Contexto

Com base em `docs/research/our-project.md`, `competitive-analysis.md`, `all-in-one-platforms.md`, `tts-platforms.md`, `image-ai-platforms.md` e `video-ai-platforms.md`, o Script Master já tem diferenciais raros no mercado: pipeline roteiro → TTS → cenas → vídeo, renderização client-side, multi-speaker, assistente contextual, dual storage e Speed Paint. Ao mesmo tempo, a pesquisa mostra gaps críticos frente a Canva, InVideo AI, Pictory, Fliki, HeyGen e Synthesia: onboarding inexistente, ausência de templates, social proof fraco, pricing ainda não operacional, time-to-first-value alto, UX mobile pouco lapidada e falta de base para expansão global.

O mapeamento técnico confirmou que o plano precisa atravessar principalmente as áreas **App Shell & Navegação**, **Estúdio de Produção**, **Páginas & Componentes Públicos**, **Persistência & Dual Storage**, **Imagem & Cenas** e uma nova frente de **billing/i18n/onboarding**. Os hotspots mais relevantes são:

- `src/App.tsx` — 511 linhas, 36 imports, alto acoplamento, sem teste dedicado de smoke
- `src/features/studio/store/studioStore.ts` — contrato compartilhado por App, StudioPage, AssistantPage, VideoPage e Inspector
- `src/components/public/PublicHeader.tsx` — componente crítico usado por 31 arquivos
- `src/pages/public/LandingPage.tsx` — página central de aquisição, hoje com boa base visual, mas sem trust layer forte

As explorações paralelas confirmaram estes padrões e restrições:

- o projeto já possui base visual forte em `tokens.ts`, `surfaces.ts` e `src/components/public/animations.ts`
- o estúdio já suporta aplicação de patch parcial via método `useStudioStore.getState().applySettings()` e `StudioSettingsPatch`, ótimo ponto de encaixe para presets/templates
- MUI v9 não oferece tour pronto; o caminho mais estável é `Dialog` + `Popper`/`Tooltip` controlado + `Stepper`/`MobileStepper` quando fizer sentido
- Zustand favorece presets via shallow merge; porém o projeto hoje usa `create()` puro + `subscribe` manual + `PERSIST_MAP`, sem middleware `persist`, então versionamento/migration de preferências exigirá decisão explícita
- React Router v7 suporta i18n com segmento opcional `:lang?`, lazy loading e loader/hydration por layout, mas o projeto hoje usa `<Routes>/<Route>` declarativo; qualquer migração para data router deve ser tratada como mudança arquitetural explícita
- o programa deve respeitar a arquitetura SPA client-side atual e evitar mudanças grandes sem fase prévia de desacoplamento

## Decisões Pendentes

- Nenhuma decisão bloqueia o início da execução do programa.
- Antes dos lotes de billing e i18n, o executor deve confirmar apenas detalhes comerciais e de escopo global, sem travar as fases fundacionais.

## Decisões Tomadas

### 1. Melhorar primeiro a fundação antes das features “visíveis” de maior alcance
- Opção A: começar por Stripe/i18n
  - Pró: impacto comercial/global alto
  - Contra: risco transversal muito alto sobre base ainda acoplada
- Opção B: começar por desacoplamento do app shell, templates, onboarding e landing
  - Pró: reduz risco, acelera valor percebido e prepara billing/i18n com menos retrabalho
  - Contra: monetização fica para lote posterior

**Escolha:** Opção B, porque o codebase ainda concentra lógica demais em `App.tsx` e o principal gargalo competitivo imediato é ativação/primeira experiência.

### 2. Implementar templates reaproveitando o contrato atual do estúdio
- Opção A: criar motor novo separado do `studioStore`
  - Pró: isolamento inicial
  - Contra: duplicação de estado e alto risco de divergência
- Opção B: reaproveitar `StudioDraftState`, `StudioSettingsPatch` e `applySettings()`
  - Pró: menor risco, menos código novo e integração natural com Assistant/StudioPage
  - Contra: exige disciplina para não inflar o store

**Escolha:** Opção B, usando o método interno `applySettings()` do `useStudioStore` e mantendo, nesta fase, o padrão atual de persistência manual. Se houver necessidade de versionamento real de preferências, isso entra como subprojeto específico de store migration.

### 3. Fazer onboarding com primitives MUI, não com dependência externa logo no início
- Opção A: biblioteca externa de product tour
  - Pró: entrega rápida
  - Contra: mais dependência, menos controle visual, possível desalinhamento com MUI v9
- Opção B: `Dialog` + `Popper`/`Tooltip` controlado + estado próprio
  - Pró: aderente ao design system e previsível a longo prazo
  - Contra: implementação inicial maior

**Escolha:** Opção B.

### 4. Tratar social proof como camada de conversão estruturada, não só cosmética
- Opção A: adicionar apenas contadores e badges
  - Pró: rápido
  - Contra: pouco defensável e facilmente superficial
- Opção B: combinar métricas, testimonials, prova de produto, casos de uso e CTA orientado
  - Pró: melhora conversão e posicionamento
  - Contra: depende de organização de conteúdo e design mais cuidadoso

**Escolha:** Opção B.

### 5. Preparar billing e i18n em duas etapas, não direto no produto inteiro
- Opção A: rollout total imediato
  - Pró: visão completa cedo
  - Contra: risco extremo de regressão
- Opção B: criar fundação e abstrações antes do rollout completo
  - Pró: execução mais segura e incremental
  - Contra: entrega final leva mais tempo

**Escolha:** Opção B.

### 6. Tratar Stripe como trilha condicional à decisão arquitetural de backend
- Opção A: forçar Stripe completo já na arquitetura atual sem backend/serverless
  - Pró: acelera monetização aparente
  - Contra: fulfillment e entitlements ficam frágeis sem webhook seguro
- Opção B: separar foundation de billing do Stripe operacional e só ativar checkout real após decisão entre Payment Links serverless ou Cloud Functions
  - Pró: mantém coerência com a stack atual e evita solução insegura
  - Contra: monetização completa entra mais tarde

**Escolha:** Opção B.

### 7. Tratar i18n em duas camadas: fundação compatível agora, migração de router só se necessária
- Opção A: migrar imediatamente de `<Routes>` para `createBrowserRouter`
  - Pró: habilita loader/hydration e locale routing mais sofisticado
  - Contra: aumenta demais o risco estrutural cedo no programa
- Opção B: começar com dicionários, provider/context e extração de strings no router declarativo atual; avaliar migração posterior para data router apenas se o custo-benefício justificar
  - Pró: compatível com o estado real do projeto e reduz regressão
  - Contra: algumas capacidades avançadas de i18n ficam para fase posterior

**Escolha:** Opção B.

## Reutilização e Padrões

- Reutilizar: `src/features/studio/store/studioStore.ts` (aplicação de presets via método `useStudioStore.getState().applySettings()` e tipos já compartilhados)
- Reutilizar: `src/features/studio/store/studio.utils.ts` (persistência local manual, leitura inicial, `buildGenerateOptions()`)
- Reutilizar: `src/components/public/SocialProofBar.tsx` (base visual para trust layer e métricas)
- Reutilizar: `src/components/public/FeatureCard.tsx` (cards com glass, hover e motion para templates/testimonials)
- Reutilizar: `src/components/DataMigrationDialog.tsx` e `src/components/video-library/DeleteConfirmationDialog.tsx` (padrão de `Dialog` com `glassPanelSx`)
- Reutilizar: `src/theme/tokens.ts`, `src/theme/surfaces.ts`, `src/components/public/animations.ts` (sem criar variações paralelas de estilo)
- Reutilizar: `src/lib/error-mapping.ts`, `src/lib/rate-limiter.ts`, `src/lib/logger.ts` (tratamento transversal e observabilidade)
- Padrão de referência: `src/components/public/*` (componentização pública orientada por seção)
- Padrão de referência: `src/features/*` com `types.ts`, `components/`, `store/`, `utils.ts` (novos módulos devem seguir isso)
- Código novo (se houver): criar apenas nos domínios `features/onboarding`, `features/billing`, `features/i18n` e `src/data/*` quando não existir equivalente reaproveitável

## Arquivos a Modificar

### App Shell & Navegação
- `src/App.tsx` - quebrar responsabilidades, reduzir acoplamento e preparar app shell para roadmap longo
- `src/main.tsx` - acomodar providers/layouts futuros de onboarding, billing e i18n
- `src/components/Header.tsx` - alinhar navegação autenticada com novas jornadas e estados de plano

### Estúdio de Produção
- `src/features/studio/store/studioStore.ts` - suportar presets/templates, novos campos controlados e persistência estável
- `src/features/studio/store/studio.utils.ts` - evoluir inicialização/persistência/versionamento dos estados do estúdio
- `src/features/studio/types.ts` - ampliar contratos compartilhados do estúdio
- `src/pages/StudioPage.tsx` - integrar templates, onboarding e UX mobile refinada
- `src/components/Inspector.tsx` - expor seletor de templates e controles avançados sem piorar a ergonomia
- `src/components/ScriptEditor.tsx` - melhorar first-use, estados e experiência mobile
- `src/components/ActionBar.tsx` - adequar feedback, gating por plano e safe areas mobile

### Páginas & Componentes Públicos
- `src/pages/public/LandingPage.tsx` - adicionar trust layer, cases, demonstração e conversão melhor orientada
- `src/components/public/SocialProofBar.tsx` - evoluir para camada de métricas mais rica
- `src/components/public/PublicHeader.tsx` - preparar para seletor de idioma e novas rotas de crescimento
- `src/components/public/PageLayout.tsx` - suportar expansões públicas com menor duplicação
- `src/lib/seo.ts` - preparar SEO para páginas novas, comparativas e futuro i18n
- `src/components/DocumentHead.tsx` - garantir compatibilidade com evolução de SEO e locale

### Imagem & Cenas
- `src/components/ImageStudio.tsx` - preparar integração com stock media e fallback visual
- `src/hooks/useImageGenerator.ts` - abstrair origem da imagem (IA vs stock)
- `src/lib/gemini.ts` - manter pipeline de geração compatível com expansão visual

### Persistência & Billing
- `src/lib/db/types.ts` - ampliar tipos para billing, plano, uso e metadados de geração
- `src/lib/db/user-settings.ts` - persistir preferências novas de onboarding/templates/idioma
- `src/lib/db/projects.ts` - suportar metadados de template e futuras regras de entitlement
- `src/lib/db/generations.ts` - preparar contabilização de uso por recurso

### Novos módulos esperados
- `src/data/scriptTemplates.ts` - catálogo inicial de templates
- `src/data/testimonials.ts` - dados de prova social
- `src/features/onboarding/*` - infraestrutura do tour guiado
- `src/features/billing/*` - modelo de plano, limites, uso e entitlement
- `src/features/i18n/*` - layout, dicionários e resolução de locale
- `functions/` ou equivalente serverless futuro - checkout/webhook/entitlements quando billing entrar em execução real

## Passos de Implementação

1. **Desacoplar o app shell sem alterar comportamento funcional** — dividir `src/App.tsx` em rotas lazy, handlers e blocos de layout/test feedback, criando base para as próximas fases com regressão mínima.
   Sugestão: `fix-worker` | Notebook: `a06e89f3-b416-4146-a947-236de5be6f89` (React Docs)

2. **Criar cobertura de segurança para o shell principal** — adicionar smoke tests e validações mínimas para App, roteamento principal e fluxos críticos antes de refactors largos.
   Sugestão: `vitest-specialist` | Notebook: `252363a7-0811-4d80-9dba-829b1277ed10` (Vitest Guide)

3. **Introduzir domínio de templates/presets do estúdio** — criar catálogo de templates, tipagem, utilitários e integração com `studioStore` via método `useStudioStore.getState().applySettings()`/patch parcial, mantendo compatibilidade com Assistant e geração atual.
   Sugestão: `builder-worker` | Notebook: `c7233d41-4d3e-471e-9e96-5247f6f6208c` (Zustand Guide)

4. **Construir galeria/aplicação de templates no estúdio** — expor UI de seleção, preview e aplicação de presets em `StudioPage`, `Inspector` e `ScriptEditor`, reduzindo drasticamente o time-to-first-value.
   Sugestão: `ui-designer` | Notebook: `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` (MUI V9 Docs)

5. **Implementar onboarding guiado de primeira visita** — criar `Dialog` de boas-vindas, tour contextual com `Popper`/tooltip controlado, persistência de conclusão e modo mobile seguro.
   Sugestão: `builder-worker` | Notebook: `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` (MUI V9 Docs)

6. **Elevar a landing para camada real de conversão** — adicionar testimonials, métricas, prova de produto, seções por caso de uso, demonstração orientada e CTA mais forte, sem perder a identidade visual atual.
   Sugestão: `ui-designer` | Notebook: `a06e89f3-b416-4146-a947-236de5be6f89` (React Docs)

7. **Refinar UX mobile das áreas pública e autenticada** — revisar Header/PublicHeader, StudioPage, Inspector, ScriptEditor e ActionBar com foco em safe area, densidade, drawers e fluxo mobile-first real.
   Sugestão: `ui-designer` | Notebook: `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` (MUI V9 Docs)

8. **Adicionar fallback visual via stock media** — permitir busca/seleção de mídia stock nas cenas e no estúdio de imagem, reaproveitando galeria, busca e utilitários existentes para elevar consistência visual.
   Sugestão: `builder-worker` | Notebook: `6c7b050b-e15e-4b83-911f-35027e86338f` (Gemini API)

9. **Expandir o TTS com controle emocional e preparação para direção avançada** — incluir emotion model no estúdio, persistência, tipagem e instruções de prompt sem quebrar o pipeline atual de TTS.
   Sugestão: `builder-worker` | Notebook: `6c7b050b-e15e-4b83-911f-35027e86338f` (Gemini API)

10. **Criar fundação de billing e uso antes do Stripe real** — definir tipos, limites, contadores, entitlement checks, UI de plano/uso e pontos de integração no frontend, sem ainda ativar cobrança nem depender de backend novo.
    Sugestão: `builder-worker` | Notebook: `c5e58e83-b49e-402c-80d4-dc53acb5453e` (Firebase Firestore Docs)

11. **Implementar pagamentos e assinatura de forma isolada, condicionado à decisão arquitetural** — quando a fundação estiver estável, escolher entre: (a) Payment Links/Portal com limitações serverless; ou (b) camada serverless explícita com Cloud Functions para checkout, webhook e entitlements seguros. Esta etapa só começa após essa decisão ser formalmente tomada.
    Sugestão: `builder-worker` | Notebook: `aa948c67-185c-4ff4-8fe0-f7927d7a0b78` (Stripe Guide)

12. **Criar fundação de i18n compatível com o router atual** — extrair strings, criar dicionários, provider/context de idioma, utilitários de locale e rollout inicial EN/ES nas rotas públicas sem migrar imediatamente o app para data router.
    Sugestão: `builder-worker` | Notebook: `850cad71-bd6c-4d2b-a2ae-c7c7768ec2c2` (React Router Guide)

13. **Propagar i18n para estúdio, billing, SEO e navegação pública** — internacionalizar áreas críticas, preparar `seo.ts`, canonical/hreflang e estados de UI compatíveis com multi-locale; avaliar migração futura para `createBrowserRouter` apenas se a fundação anterior mostrar necessidade real.
    Sugestão: `fix-worker` | Notebook: `850cad71-bd6c-4d2b-a2ae-c7c7768ec2c2` (React Router Guide)

14. **Fechar com endurecimento técnico e validação contínua** — ampliar testes, revisar regressões, validar bundle/UX e consolidar documentação operacional para sustentar evolução longa do produto.
    Sugestão: `vitest-specialist` | Notebook: `252363a7-0811-4d80-9dba-829b1277ed10` (Vitest Guide)

## Riscos e Mitigações

- Risco: refatorar `src/App.tsx` sem rede de segurança | Mitigação: criar smoke tests antes do desacoplamento e refatorar em extrações pequenas
- Risco: inflar `studioStore.ts` e degradar previsibilidade | Mitigação: manter presets como domínio externo e usar apenas contratos parciais já existentes
- Risco: onboarding conflitar com layout responsivo e ActionBar fixa | Mitigação: implementar tour após estabilizar shell do estúdio e validar z-index/safe area
- Risco: `PublicHeader.tsx` quebrar muitas páginas por ser arquivo crítico | Mitigação: mudanças mínimas, guiadas por testes existentes e rollout posterior ao ganho de fundação
- Risco: social proof virar camada superficial sem impacto real | Mitigação: acoplar conteúdo, métricas, casos de uso e CTA, não apenas badges
- Risco: Stripe entrar cedo demais e contaminar a SPA | Mitigação: separar billing foundation do billing operacional; webhook/checkout só em fase própria
- Risco: Stripe conflitar com a restrição atual de “sem backend” | Mitigação: tornar explícita a decisão arquitetural antes do passo operacional e não começar webhook/checkout sem esse aceite
- Risco: i18n gerar regressão massiva | Mitigação: iniciar por dicionários/provider e rotas públicas no router atual; só depois avaliar migração estrutural
- Risco: novos módulos criarem design paralelo | Mitigação: obrigar reaproveitamento de `tokens.ts`, `surfaces.ts`, `animations.ts` e padrões de `components/public`

## Verificação

- [ ] Pós-passos 1-2: smoke manual das rotas públicas, autenticadas e redirects principais
- [ ] Pós-passos 1-2: `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`
- [ ] Pós-passos 3-4: aplicação de template no estúdio, persistência esperada, compatibilidade com Assistant e geração
- [ ] Pós-passo 5: tour validado em desktop e mobile, com fechamento, retomada e não repetição indevida
- [ ] Pós-passos 6-7: landing page e navegação pública validadas em breakpoints principais, sem regressão de SEO/head
- [ ] Pós-passos 8-9: fallback visual e emoção do TTS validados funcionalmente e sem quebra de exportação/geração
- [ ] Pós-passos 10-11: limites, entitlements e billing validados conforme a arquitetura escolhida
- [ ] Pós-passos 12-13: i18n validado primeiro em rotas públicas, depois nas áreas autenticadas, incluindo SEO/canonical/hreflang
- [ ] Regressão principal: login, cadastro, geração de áudio, geração de cenas, exportação de vídeo, biblioteca e assistente

## Notebooks Relevantes

| Notebook | ID | Uso |
|----------|----|-----|
| React Docs | `a06e89f3-b416-4146-a947-236de5be6f89` | Refactors seguros de componentes, lazy boundaries, composição de UI e padrões de estado de tela |
| Vitest Guide | `252363a7-0811-4d80-9dba-829b1277ed10` | Cobertura de smoke/regressão antes de refactors largos e validação por lote |
| Zustand Guide | `c7233d41-4d3e-471e-9e96-5247f6f6208c` | Presets, persistência seletiva, versionamento/migration do estado e stores novas |
| MUI V9 Docs | `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` | Onboarding via Dialog/Popper, responsividade, cards, steppers e polimento visual |
| Gemini API | `6c7b050b-e15e-4b83-911f-35027e86338f` | Ajustes em TTS, emoção, prompts de cena e expansão do fluxo visual |
| Firebase Firestore Docs | `c5e58e83-b49e-402c-80d4-dc53acb5453e` | Estrutura de uso, entitlement state, contadores e persistência de billing/usage |
| Stripe Guide | `aa948c67-185c-4ff4-8fe0-f7927d7a0b78` | Checkout, assinatura, webhooks, eventos de billing e desenho seguro da monetização |
| React Router Guide | `850cad71-bd6c-4d2b-a2ae-c7c7768ec2c2` | Arquitetura de locale `:lang?`, lazy routes, loaders/hydration e rollout de i18n |

## Instruções de Execução

Ao executar este plano, siga este protocolo:

### 1. Investigação
- Use analyze tools (`suggest_reads`, `impact_analysis`, `file_context`) nos arquivos listados
- Consulte os Notebooks Relevantes acima para confirmar padrões da tecnologia envolvida
- Identifique padrões, dependências e riscos que o plano não cobriu

### 2. Divisão do Trabalho
- Calcule tokens dos arquivos com `calculator_token_count` (budget: 40K por agent)
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
- Grupos sem dependência → executar em paralelo (max 2 por lote)
- Grupos com dependência → lotes sequenciais na ordem correta
- Para cada agent, inclua notebook relevante se houver
- Após cada lote, execute lint + type-check do projeto

### 5. Validação Pós-lote
- Execute scripts de lint e type-check (verifique `package.json`)
- Corrija sem `eslint-disable`, `@ts-ignore` ou `@ts-expect-error` — corrija a causa raiz
- Repita até 0 erros e 0 warnings
