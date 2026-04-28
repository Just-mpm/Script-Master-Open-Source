# Plano: Transformação Estrutural do Script Master (Pendências)

## Status

**Passos 1-10, 12-14: CONCLUÍDOS** (executado em 7 lotes, 13 agents, 0 erros)

**Passo 13: CONCLUÍDO** (i18n propagado para rotas públicas + áreas autenticadas)

**Passos pendentes: 11 (condicional)**

---

## Pendências

### Passo 11 — Pagamentos e assinatura (CONDICIONAL)
**Status:** Bloqueado — aguarda decisão arquitetural

> "Quando a fundação estiver estável, escolher entre: (a) Payment Links/Portal com limitações serverless; ou (b) camada serverless explícita com Cloud Functions para checkout, webhook e entitlements seguros. Esta etapa só começa após essa decisão ser formalmente tomada."

**Pré-requisito:** Decisão entre Payment Links serverless vs Cloud Functions para checkout/webhook/entitlements.

**O que já existe:**
- `src/features/billing/types.ts` — PlanId, Plan, PlanLimits, UsageRecord, UsageState, EntitlementCheck
- `src/features/billing/plans.ts` — 3 planos (Gratuito, Pro, Business) com limites e preços
- `src/features/billing/usageUtils.ts` — checkEntitlement, getRemainingUsage, needsUpgrade, formatUsageLimit
- `src/features/billing/components/UsageIndicator.tsx` — barra de progresso de uso
- `src/features/billing/components/PlanBadge.tsx` — badge do plano atual

**Nota:** Sugestão: `builder-worker` | Notebook: `aa948c67-185c-4ff4-8fe0-f7927d7a0b78` (Stripe Guide)

---

## Riscos e Mitigações

- Risco: Stripe entrar cedo demais e contaminar a SPA | Mitigação: separar billing foundation do billing operacional; webhook/checkout só em fase própria
- Risco: Stripe conflitar com a restrição atual de "sem backend" | Mitigação: tornar explícita a decisão arquitetural antes do passo operacional

---

## Notebooks Relevantes

| Notebook | ID | Uso |
|----------|----|-----|
| Stripe Guide | `aa948c67-185c-4ff4-8fe0-f7927d7a0b78` | Checkout, assinatura, webhooks, eventos de billing |
