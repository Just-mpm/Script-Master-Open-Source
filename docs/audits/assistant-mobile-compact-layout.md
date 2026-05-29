# Auditoria — Compactação Mobile do Assistente IA

**Data:** 2026-05-29
**Escopo:** `AssistantHeader.tsx`, `assistantUi.ts`, `AssistantMessages.tsx`
**Foco:** Layout mobile compacto (ui-designer)

---

## Veredito: Sem problemas relevantes

As mudanças são limpas, intencionais e bem executadas. Não há bloqueadores de merge. Há apenas 2 sugestões menores de polimento.

---

## Achados priorizados

### [SUGGESTION] Magic number `30` em vez de token para avatar mobile

- **Arquivo:** `src/features/assistant/components/AssistantHeader.tsx:63-64`
- **Confidence:** 95/100
- **Categoria:** UI
- **Problema:** Avatar no mobile usa `width: { xs: 30, md: AVATAR_SIZE_MD }` — o valor `30` é hardcoded enquanto o projeto tem `AVATAR_SIZE_SM = 32` como token.
- **Evidência:**
  ```tsx
  // AssistantHeader.tsx:63
  width: { xs: 30, md: AVATAR_SIZE_MD },
  height: { xs: 30, md: AVATAR_SIZE_MD },
  
  // tokens.ts:7
  export const AVATAR_SIZE_SM = 32;
  ```
- **Impacto:** Inconsistência com o design system. Se `AVATAR_SIZE_SM` mudar, esse valor fica defasado. Diferença de 2px (30 vs 32) é visualmente irrelevante.
- **Sugestão:** Usar `AVATAR_SIZE_SM` ou criar um `AVATAR_SIZE_XS = 30` se 32px for grande demais para o objetivo.

### [SUGGESTION] Subtitle agora visível em desktop (efeito colateral da mudança de breakpoint)

- **Arquivo:** `src/features/assistant/components/AssistantHeader.tsx:91`
- **Confidence:** 90/100
- **Categoria:** UX
- **Problema:** O `display` do subtítulo mudou de `{ xs: 'block', md: 'none' }` para `{ xs: 'none', sm: 'block' }`. Isso esconde o subtítulo no mobile (intencional), mas **também o torna visível em md+** onde antes estava oculto.
- **Evidência:**
  ```tsx
  // Antes:
  display: { xs: 'block', md: 'none' }  // visível xs/sm, oculto md+
  
  // Depois:
  display: { xs: 'none', sm: 'block' }  // oculto xs, visível sm/md/lg/xl
  ```
- **Impacto:** Usuários desktop agora verão o subtítulo que antes estava oculto. Provavelmente é uma melhoria (mais informação em tela), mas é uma mudança de comportamento que vale confirmar com o designer.
- **Sugestão:** Confirmar com o ui-designer se a visibilidade em desktop era intencional. Se sim, está ótimo.

---

## O que parece saudável

- **Imports limpos** — `GAP_MEDIUM` removido corretamente (não é mais usado), `Box` adicionado e utilizado. Nenhum import não utilizado.
- **Tokens consistentes** — Uso correto de `BRAND_GRADIENT`, `BRAND_PRIMARY`, `RADIUS_XS`, `ICON_SIZE_MD/LG`, `AVATAR_SIZE_MD`, `TEXT_SECONDARY`, `GAP_COMPACT`. Constantes de `assistantUi.ts` continuam usando tokens do projeto.
- **Acessibilidade preservada** — Os 3 `IconButton` mantêm `aria-label` explícito. O botão "Novo chat" (icon-only no mobile) é coberto pelo `Tooltip` que rotula automaticamente o filho (confirmado via documentação MUI). `noWrap` no título previne overflow.
- **Lógica de negócio intacta** — Nenhuma alteração em callbacks, estado, props de negócio ou lógica de streaming. As mudanças são puramente cosméticas (spacing, sizing, breakpoints).
- **Responsividade coerente** — `assistantUi.ts` reduziu padding vertical mobile (`py: 1.5 → 1`) no composer, mensagens e empty state de forma consistente. `assistantComposerControlsSx` ganhou `gap` e `px` responsivos.
- **Touch targets aceitáveis** — Botão "Novo chat" tem `minWidth: 40` no mobile (icon-only). `IconButton` padrão MUI = 40×40. Ambos atendem WCAG AA (≥24px).
- **Empty state compacto** — Avatar, ícone e margens agora responsivos (`xs` menor, `md` mantido). Chips de sugestão com `mt` responsivo.

---

## Limites da revisão

- Não foi possível verificar se o subtítulo em desktop (`md+`) causa overflow em telas menores dessa faixa (ex: 960px com título longo).
- Não rodei typecheck/lint — a análise é por leitura estática do diff e código completo.
- Valores de tokens foram verificados apenas no arquivo `tokens.ts` (não verifiquei se há overrides no theme).
