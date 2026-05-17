# Relatório de Gap Analysis — Script Master v0.32.0

**Data:** 2026-05-17  
**Contexto:** Análise exploratória de lacunas de arquitetura, comportamento, decisões pendentes e riscos de escopo.

---

## 1. Mapa Rápido: Sólido vs Frágil

| Dimensão | Avaliação |
|----------|-----------|
| Estrutura de diretórios e áreas | **Sólida** — áreas bem definidas, organização clara |
| Cobertura de testes | **Sólida** — 132 testes, boa cobertura por domínio |
| Stack e tecnologia | **Sólida** — escolhas consistentes, sem frankenstein |
| Sistema de persistência dual | **Sólida** — fallback IndexedDB bem implementado |
| Tema e Design System | **Sólido** — tokens, surfaces, componentes DRY |
| Manutenção do AGENTS.md | **Sólido** — documentado e atualizado |

| Dimensão | Avaliação |
|----------|-----------|
| **Billing / Planos** | **Frágil** — infraestrutura completa mas NUNCA usada em produção |
| **Enforcement de limites** | **Frágil** — `checkEntitlement` só existe em testes |
| **Account Cleanup (LGPD)** | **Frágil** — não limpa subscription/Stripe |
| **Functions Deployment** | **Frágil** — fora do pipeline principal, pode ser esquecido |
| **Uso de memória (listeners)** | **Frágil** — memory leak no `useBillingInit` |

---

## 2. Gaps Priorizados

### 🔴 GAP-001 | CRÍTICO | Confidence: 95
**Sistema de planos pagos completamente desabilitado em produção**

- **Área:** Billing
- **Descrição:** A página de preços (`PricingPage`) define `ctaDisabled={plan.planId !== 'free'}` com tooltip "Em breve" para todos os planos pagos. A FAQ de preços confirma explicitamente que planos pagos "ainda não estão disponíveis" (FAQ pergunta 1, 2, 4, 5). Todo o backend Stripe (Cloud Functions, store, plans, utils, UpgradeDialog) está construído e testado, mas o checkpoint de ativação — remover o `ctaDisabled` e conectar os preços reais do Stripe — nunca foi feito.
- **Evidência:** `PricingPage.tsx:393-394` — `ctaDisabled={plan.planId !== 'free'}` + `ctaTooltip={t('pricing.tooltip.comingSoon')}`. `pricingFaq.ts:21` — "Assim que nossos planos pagos estiverem disponíveis". `pricingFaq.ts:30` — "Planejamos oferecer planos anuais".
- **Mitigações verificadas:** Cloud Functions existem e funcionam, UpgradeDialog existe, store carrega subscription do Firestore.
- **Pergunta:** Qual é o blocker real? Stripe precisa de configuração no dashboard (`price_pro_monthly`, `price_pro_yearly`, `price_business_monthly`, `price_business_yearly`)? Falta contrato/regulatório? Decisão de produto adiada?

---

### 🔴 GAP-002 | CRÍTICO | Confidence: 92
**Uso (usage tracking) nunca é persistido — limites nunca são enforceados**

- **Área:** Billing
- **Descrição:** `useBillingStore.updateUsage()` atualiza apenas um estado local em memória (Zustand). Esse estado nunca é salvo no Firestore, e ao carregar a store, `usage.records` sempre começa vazio. `checkEntitlement()` — a função que verifica se o usuário pode usar um recurso — é chamada exclusivamente em testes unitários, nunca em produção. Componentes como `UsageIndicator` são exportados mas nunca renderizados em nenhuma página. O resultado é que:
  1. Limites de plano (ex: 10 áudios/mês no Free) não são verificados antes de gerar
  2. Usuários podem gerar infinitamente independente do plano
  3. UsageIndicator fica sempre zerado
  4. Não há prorrogação mensal de cotas
- **Evidência:** `useBillingStore.ts:182-213` — `updateUsage` só altera estado local. `loadSubscription` sempre carrega `records: []`. `analyze_aitool_find checkEntitlement` — só referenciado em `tests/`. `analyze_aitool_find UsageIndicator` — 0 usos em produção. Nenhum hook de geração (useAudioGenerator, useImageGenerator, useVideoExporter) chama `checkEntitlement` antes de iniciar.
- **Mitigações verificadas:** A arquitetura para tracking existe (UsageResource, UsageRecord, UsageState, UsageIndicator, checkEntitlement). Falta o middleware de persistência e os pontos de enforcement.
- **Pergunta:** O usage deve ser persistido no Firestore (subcoleção `users/{uid}/usage`) ou ser calculado sob demanda via queries? Quem implementa a lógica de "reset mensal"?

---

### 🔴 GAP-003 | CRÍTICO | Confidence: 88
**Memory leak no hook de billing — listener Firestore nunca é limpo**

- **Área:** Billing
- **Descrição:** `useBillingInit` chama `loadSubscription().then(() => { const unsubscribe = subscribeToSubscription(); return () => unsubscribe(); })`. O retorno da `.then()` é uma função que retorna outra função, mas o `useEffect` espera um cleanup retornado **sincronamente** da callback do effect. Como a Promise resolve assincronamente, o cleanup retornado do `.then()` é ignorado pelo React. Isso significa que:
  - Cada vez que `userAuthReady` muda, um novo `onSnapshot` é criado
  - O listener anterior NUNCA é removido
  - Em Strict Mode (dev), isso dobra
  - O número de listeners cresce ilimitadamente
- **Evidência:** `useBillingInit.ts:54-60` — a Promise chain retorna `() => unsubscribe()` mas o `useEffect` não recebe esse cleanup por ser assíncrono. `subscribeToSubscription()` em `useBillingStore.ts:146-180` — cria `onSnapshot` com retorno de `Unsubscribe`.
- **Correção sugerida:** Extrair o subscription setup para uma função síncrona que retorna o unsubscribe, ou usar `useEffect` com cleanup síncrono que chama `onSnapshot` diretamente.

---

### 🔴 GAP-004 | ALTO | Confidence: 90
**Account cleanup não remove subscription/stripe customer**

- **Área:** Auth + Billing
- **Descrição:** Ao excluir a conta, `deleteAllUserData()` em `account-cleanup.ts` limpa projetos, gerações, chats, memórias, settings e IndexedDB. Porém:
  1. **Não remove** o documento `users/{uid}/subscription/current`
  2. **Não cancela** a assinatura no Stripe (Stripe cobra o cliente até cancelar manualmente)
  3. **Não remove** o campo `stripeCustomerId` do documento `users/{uid}`
  
  Isso significa que usuários pagos que excluem a conta continuam sendo cobrados, e o Firestore fica com dados residuais de subscription.
- **Evidência:** `account-cleanup.ts:24-93` — nenhuma menção a `subscription`, `stripe`, ou `stripeCustomerId`.
- **Mitigações verificadas:** `deleteAllUserData` já tem pattern de try/catch parcial — adicionar a limpeza de subscription segue o mesmo padrão.
- **Pergunta:** A assinatura Stripe deve ser cancelada imediatamente (perde acesso) ou mantida até o fim do período pago? A exclusão do documento Firestore deve ser feita pela Cloud Function (webhook `customer.subscription.deleted`) ou pelo frontend?

---

### 🔴 GAP-005 | ALTO | Confidence: 95
**Storage rules desatualizadas — limites de áudio incorretos**

- **Área:** Plataforma & Configuração
- **Descrição:** AGENTS.md v0.31.1 documenta que o limite de upload de áudio foi alterado de 50MB para 150MB. O arquivo `storage.rules` na raiz do projeto ainda impõe `request.resource.size < 50 * 1024 * 1024` no path `/audios/{userId}/{audioId}`. Isso significa que uploads de áudio entre 50MB e 150MB serão rejeitados pelo Firebase Storage em produção.
- **Evidência:** `storage.rules:27` — `request.resource.size < 50 * 1024 * 1024`. AGENTS.md — "Limite de upload de áudio: 50MB → 150MB". O path `/projects/{userId}/{allPaths=**}` nas regras já permite `150 * 1024 * 1024` (linha 73), mas o path específico `/audios/{userId}/{audioId}` ainda está em 50MB.
- **Correção sugerida:** Alterar `storage.rules:27` de `50 * 1024 * 1024` para `150 * 1024 * 1024`.

---

### 🔴 GAP-006 | ALTO | Confidence: 85
**Express como dependência não declarada nas Cloud Functions**

- **Área:** Plataforma & Configuração
- **Descrição:** `functions/src/index.ts` importa `express` diretamente (`import express from 'express'`), mas `express` não está listado em `dependencies` no `functions/package.json`. Atualmente funciona porque `express` é dependência transitiva de `firebase-functions` e está no `package-lock.json`. Porém, se o lock for regenerado ou a versão do Firebase Functions atualizar e parar de depender do Express, a build quebra.
- **Evidência:** `functions/package.json:15-19` — dependências são `firebase-admin`, `firebase-functions`, `stripe` — sem `express`. `functions/src/index.ts:14` — `import express from 'express'`.
- **Correção sugerida:** Adicionar `"express": "^4.21.0"` em `dependencies` no `functions/package.json`.

---

### 🔴 GAP-007 | MÉDIO | Confidence: 90
**Functions fora do pipeline principal de deploy**

- **Área:** Plataforma & Configuração
- **Descrição:** `firebase.json` não contém uma seção `functions`. O comando `bun run deploy` (que executa `lint + typecheck + build + firebase deploy`) só faz deploy de hosting, storage e firestore. As Cloud Functions precisam ser deployadas manualmente via `cd functions && npm run deploy`. Isso significa que:
  - Alterações nas Functions podem ser esquecidas no deploy
  - A build raiz não valida o código das Functions
  - Não há integração no pipeline
- **Evidência:** `firebase.json` — sem chave `functions`. `.firebaserc` — apenas projeto padrão.
- **Pergunta:** As Functions devem ser incluídas no `firebase.json`? O monorepo deve ter um script `deploy:all` que deploya tudo?

---

### 🔴 GAP-008 | MÉDIO | Confidence: 85
**`projectCount` não é rastreável como UsageResource**

- **Área:** Billing
- **Descrição:** O `PlanLimits` define `maxProjectCount: 5` para o plano Free e `maxProjectCount: 50` para Pro, mas o tipo `UsageResource` não inclui `project_count`. Não há como verificar ou exibir o uso de projetos contra o limite do plano. Um usuário Free pode criar projetos indefinidamente.
- **Evidência:** `types.ts:39-44` — `UsageResource` = `audio_generations | image_generations | video_exports | script_chars | storage_mb`. `plans.ts:17` — `maxProjectCount: 5`.
- **Correção sugerida:** Adicionar `project_count` ao `UsageResource` e implementar tracking ao criar projeto.

---

### 🔴 GAP-009 | BAIXO | Confidence: 90
**billing.data.unit.test.ts:209-210 — teste usa `formatPrice` com preço real de plano**

- **Área:** Billing (testes)
- **Descrição:** O teste `billing.data.unit.test.ts` linha 209-210 chama `formatPrice(plan.price.monthly)` e `formatPrice(plan.price.yearly)` para todos os planos para garantir que não lançam erro. Porém, `plan.price.yearly` para o plano Free é `0`, e dividir por 12 não causaria problema. Mas o teste não valida que `formatPrice(Math.round(plan.priceYearlyCents / 12))` no PricingPage para o plano Free produziria `R$ 0,00` — o que é correto, mas testar o comportamento real da PricingPage não está coberto.
- **Evidência:** `pricing.data.unit.test.ts:209-210`. `PricingPage.tsx:330` — `formatPrice(Math.round(plan.priceYearlyCents / 12))`.
- **Observação:** Baixa severidade — não quebra em produção. Apenas cobertura incompleta de teste para o cálculo anual.

---

### 🔴 GAP-010 | BAIXO | Confidence: 80
**Arquivos sem área definida — 10 arquivos não categorizados**

- **Área:** Geral
- **Descrição:** `analyze_aitool_list_areas missing=true` mostra 10 arquivos sem área: `metrics.ts`, `pricingFaq.ts`, `studioOptions.ts`, `useCases.ts`, `pexelsApi.ts`, `stripe.ts`, `docs/onboarding-ux/src/main.tsx`, `functions/src/index.ts`, `DocumentHead.tsx`, `OnboardingPage.tsx`. A maioria é intencional (docs avulsos, arquivos de configuração), mas `pexelsApi.ts` e `stripe.ts` são módulos de serviço que deveriam estar em uma área de "Integrações" ou "Serviços Externos".
- **Evidência:** `analyze_aitool_list_areas missing=true` output.
- **Observação:** Baixa severidade — não afeta runtime. Afeta navegabilidade do código.

---

## 3. Decisões Pendentes

| ID | Decisão | Impacto | Dono sugerido |
|----|---------|---------|---------------|
| D01 | **Ativação dos planos pagos** — qual o blocker? Stripe Dashboard sem preços configurados? Aguardando release? | Impede monetização | Product |
| D02 | **Estratégia de persistência de usage** — salvar no Firestore (subcoleção) ou calcular sob demanda? | Define enforcement real de limites | Architecture |
| D03 | **Cancelamento de assinatura no Stripe ao excluir conta** — cancelar imediatamente ou manter até fim do ciclo? | Impacta LGPD e churn | Product + Legal |
| D04 | **Inclusão das Functions no pipeline de deploy** — adicionar ao `firebase.json` ou criar script `deploy:all`? | Risco de esquecer deploy de Functions | DevOps/Platform |
| D05 | **Enforcement de `maxProjectCount`** — deve ser feito via Firestore rules, frontend, ou ambos? | Consistência com outros limites | Architecture |
| D06 | **Stripe Price IDs** — os IDs em `UpgradeDialog.tsx` são placeholders (`price_pro_monthly`, etc.). Precisam ser configurados no Stripe Dashboard | Checkout quebra se não configurado | Product |

---

## 4. Cenários de Borda sem Resposta

| Cenário | Onde | Risco |
|---------|------|-------|
| Usuário Free com 5 projetos tenta criar o 6º | `createProject()` | Nenhum — limites não são enforceados |
| Usuário pago cancela no Stripe e depois exclui conta | `deleteAccount()` | Cobrança continua pois Stripe não é notificado |
| Dois upgrades/downgrades simultâneos | `useBillingInit` + webhook | Race condition potencial entre `onSnapshot` e webhook |
| Uso de mais de 100% de um recurso (ex: 11/10 gerações) | `checkEntitlement()` | Não há bloqueio — pode gerar negativo no display |
| Locale `es` no Stripe checkout | `handleCreateCheckout` | Stripe aceita `es`, `en`, `pt-BR` — mapeamento correto |
| Sessão restaurada sem COEP (popup login) | `AuthContext` | Full reload funciona, mas experiência pode ser abrupta |

---

## 5. Checklist de Sanidade

- [x] Tipagem forte em toda parte (sem `any`)
- [x] SOLID respeitado — SRP evidente nos módulos
- [x] Testes unitários para módulos core
- [x] Logging estruturado (via `createLogger`)
- [x] Tratamento de erros com fallback (IndexedDB quando Firestore falha)
- [x] SEO básico implementado (DocumentHead, sitemap, robots.txt)
- [x] Acessibilidade (skip-to-content, aria-labels)
- [x] PWA com service worker
- [ ] **Planos pagos ativados** ← GAP-001
- [ ] **Limites enforceados** ← GAP-002
- [ ] **Storage rules atualizadas** ← GAP-005
- [ ] **Functions no deploy pipeline** ← GAP-007

---

## 6. Próximo Passo

| Prioridade | Ação | Responsável |
|------------|------|-------------|
| **P0** | Decidir sobre ativação dos planos pagos (D01) | Product |
| **P0** | Implementar persistência de usage + enforcement (GAP-002) | Architecture + Worker |
| **P1** | Corrigir memory leak no useBillingInit (GAP-003) | Worker |
| **P1** | Corrigir storage.rules (GAP-005) | Worker |
| **P1** | Adicionar express nas deps das Functions (GAP-006) | Worker |
| **P1** | Adicionar cleanup de subscription no deleteAccount (GAP-004) | Worker |
| **P2** | Adicionar `project_count` ao UsageResource (GAP-008) | Worker |
| **P2** | Incluir Functions no pipeline de deploy (GAP-007) | Platform |

**Worker indicado:** `architecture` (para decisões D01-D05) e `worker` (para correções GAP-002 a GAP-008).

---

## Resumo

**6 gaps encontrados (2 críticos, 3 altos, 2 médios, 2 baixos)**

O projeto tem uma base sólida — a surpresa positiva é que a infraestrutura de billing está 90% completa (tipos, store, Cloud Functions, UpgradeDialog, plans, usageUtils, testes). O que falta é a conexão final: ativar os CTAs na PricingPage, persistir usage no Firestore, e chamar `checkEntitlement` nos pontos de geração. A arquitetura está correta, mas parou antes da linha de chegada.
