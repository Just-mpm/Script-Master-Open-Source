# Relatório de Testes — Componentes Públicos (PricingCard + FAQAccordion)
**Data:** 2026-04-24
**Agent:** vitest-specialist
**Escopo:** Testes de componente para PricingCard e FAQAccordion

## Resumo

| Métrica | Valor |
|---|---|
| Testes criados | 19 |
| Testes executados | 19 |
| Passou | 19 |
| Falhou | 0 |
| Falsos positivos corrigidos | 3 |
| Testes removidos | 0 |
| Taxa de confiabilidade | 100% |

## Testes Criados

| Arquivo | Tipo | Status |
|---|---|---|
| `tests/components/public/PricingCard.component.test.tsx` | component | passou (11 testes) |
| `tests/components/public/FAQAccordion.component.test.tsx` | component | passou (8 testes) |

## Bugs Reais Confirmados

Nenhum bug encontrado.

## Falsos Positivos Corrigidos

### FP-001: `toHaveAttribute` não disponível sem jest-dom setup
- **Testes:** `FAQAccordion.component.test.tsx` (3 testes: expande, colapsa, mantém colapsados)
- **Problema:** `toHaveAttribute` é um matcher do `@testing-library/jest-dom`, que não está importado no setup global do projeto. Os testes de referência usam `toBeDefined()`/`toBeNull()` e `getAttribute()` nativo.
- **Correção:** Substituído `expect(el).toHaveAttribute('aria-expanded', 'false')` por `expect(el.getAttribute('aria-expanded')).toBe('false')` — padrão consistente com o restante da suite.

### FP-002: `queryByRole('heading')` encontra múltiplos headings
- **Teste:** `FAQAccordion.component.test.tsx` — "funciona sem título (title opcional)"
- **Problema:** MUI `AccordionSummary` renderiza internamente `<h3>` para cada pergunta. `queryByRole('heading')` sem filtro retornava múltiplos elementos, causando erro "Found multiple elements".
- **Correção:** Alterado para `queryByRole('heading', { level: 2 })` — o título opcional do FAQAccordion usa `component="h2"`, enquanto os headings internos do MUI são `<h3>`.

## Testes Removidos

Nenhum teste removido.

## Detalhamento dos Testes

### PricingCard (11 testes)

| # | Teste | O que valida |
|---|---|---|
| 1 | renderiza nome, preço e descrição do plano | Dados essenciais do card aparecem no DOM |
| 2 | renderiza todas as features com ícone de check para incluídas | Features `included: true` renderizam texto + SVG de ícone |
| 3 | renderiza ícone de close para features não incluídas | Features `included: false` renderizam texto + SVG de ícone |
| 4 | renderiza botão CTA com label correto | Botão com label e role="button" presente |
| 5 | chama onCtaClick ao clicar no botão | Handler é chamado exatamente 1 vez |
| 6 | aplica estilos de destaque quando recommended=true | Badge "Popular" visível |
| 7 | não renderiza badge Popular quando recommended=false | Chip "Popular" ausente |
| 8 | renderiza subtítulo do preço quando fornecido | `priceSubtitle` aparece no DOM |
| 9 | não renderiza subtítulo do preço quando ausente | Preço principal renderiza sem subtítulo |
| 10 | renderiza lista com aria-label contendo nome do plano | Acessibilidade da lista de features |
| 11 | renderiza sem onCtaClick sem erro | Componente não quebra sem callback |

### FAQAccordion (8 testes)

| # | Teste | O que valida |
|---|---|---|
| 1 | renderiza título quando fornecido | Heading h2 com texto do title |
| 2 | renderiza todas as perguntas | Todas as questions aparecem no DOM |
| 3 | expande resposta ao clicar na pergunta | `aria-expanded` muda de false → true |
| 4 | colapsa resposta ao clicar novamente | `aria-expanded` muda de true → false |
| 5 | funciona sem título (title opcional) | Nenhum h2 quando title omitido |
| 6 | renderiza todas as respostas no DOM | Respostas estão presentes no DOM |
| 7 | renderiza com lista vazia sem erro | Título renderiza, nenhum botão presente |
| 8 | mantém outros accordions colapsados ao expandir um | Apenas o clicado fica expandido |

## Conclusão

Suite de 19 testes criada para PricingCard e FAQAccordion, cobrindo renderização de conteúdo, interações (click, expand/collapse), acessibilidade (aria-label, aria-expanded) e edge cases (callback ausente, lista vazia, título opcional). 3 falsos positivos corrigidos (matcher não disponível e heading level), suite 100% confiável. Todos os 72 testes da pasta `tests/components/public/` passam sem regressão.
