# Auditoria: Drawers, a11y, Mocks e Testes (pós-fix)

**Data:** 2026-07-28
**Escopo:** 5 arquivos finais do pacote de melhorias
**Comandos verificados:** `lint` → 0, `typecheck` → 0, `test --run` → 2610/2613 (3 falhas pré-existentes)

---

## 1. Escopo da revisão

| Arquivo | Linhas | Foco |
|---------|--------|------|
| `src/components/app/MobileBottomNav.tsx` | 576 | Drawer, a11y, DeleteAccountDialog, `appDrawerPaperSx` |
| `src/components/app/GuestMobileNav.tsx` | 196 | Drawer, a11y, `appDrawerPaperSx` |
| `src/components/public/PublicHeader.tsx` | 407 | Drawer, a11y, `appDrawerPaperSx`, logout |
| `src/theme/surfaces.ts` | 80 | Novo helper `appDrawerPaperSx` |
| `tests/components/app/MobileBottomNav.component.test.tsx` | 139 | 3 novos testes de regressão |

**Cobertura:** a11y, MUI v9, tipos, hooks, memory leaks, i18n, qualidade de testes, mocks.

---

## 2. Veredito

**Ajustes recomendados** — 3 achados (1 WARNING, 2 SUGGESTION). Nenhum bloqueador de merge. O pacote está funcional e correto; as ressalvas são de consistência e robustez de teste.

---

## 3. Achados priorizados

### [WARNING] Drawer do MobileBottomNav não segue o padrão a11y `aria-controls` + `id` usado pelos outros 2 Drawers

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:312-325` (trigger), `:330-361` (Drawer)
- **Confidence:** 95/100
- **Categoria:** A11y
- **Problema:** O botão "Mais" tem `aria-expanded` (linha 318) mas **não** tem `aria-controls`, e o `<Drawer>` (linha 330) **não** tem `id`. Os outros dois Drawers do mesmo pacote (`GuestMobileNav` e `PublicHeader`) implementam o padrão completo: trigger com `aria-expanded` + `aria-controls` apontando para um `id` único no Drawer.
- **Evidência:**

  **GuestMobileNav.tsx (correto):**
  ```tsx
  // Trigger (linha 83-84):
  aria-expanded={drawerOpen}
  aria-controls="guest-mobile-drawer"
  // Drawer (linha 102):
  id="guest-mobile-drawer"
  ```

  **PublicHeader.tsx (correto):**
  ```tsx
  // Trigger (linha 229-230):
  aria-expanded={drawerOpen}
  aria-controls="public-mobile-drawer"
  // Drawer (linha 292):
  id="public-mobile-drawer"
  ```

  **MobileBottomNav.tsx (incorreto):**
  ```tsx
  // Trigger (linha 318 — só aria-expanded, sem aria-controls):
  aria-expanded={drawerOpen}
  // Drawer (linha 345 — só aria-label, sem id):
  aria-label={t('mobileBottomNav.ariaDrawer')}
  ```

- **Impacto:** Leitores de tela (NVDA, VoiceOver, TalkBack) não conseguem estabelecer a relação programática entre o botão "Mais" e o drawer que ele controla. Isso significa que, ao navegar por tab, o usuário ouve "Abrir menu, alternado" mas não sabe **qual** elemento é controlado. A inconsistência com os outros 2 Drawers sugere que foi um lapso na implementação.
- **Sugestão:** Adicionar `id="mobile-bottom-drawer"` ao Drawer e `aria-controls="mobile-bottom-drawer"` ao `BottomNavigationAction` "Mais".

---

### [SUGGESTION] MobileBottomNav duplica `appDrawerPaperSx` inline em vez de estender o helper

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:335-343`
- **Confidence:** 90/100
- **Categoria:** Architecture
- **Problema:** O novo helper `appDrawerPaperSx` em `surfaces.ts` centraliza exatamente 3 propriedades de estilo do Paper do Drawer (`backgroundColor`, `backgroundImage`, `borderRight`). O `MobileBottomNav` replica essas 3 mesmas linhas no `slotProps.paper.sx` e adiciona `width: 280`. O correto seria estender o objeto em vez de duplicar.
- **Evidência:**

  **Helper em `surfaces.ts:53-57`:**
  ```ts
  export const appDrawerPaperSx: SxProps<Theme> = {
    backgroundColor: APP_SURFACE,
    backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
    borderRight: `1px solid ${APP_BORDER}`,
  };
  ```

  **Uso em GuestMobileNav.tsx (correto):**
  ```tsx
  slotProps={{ paper: { sx: appDrawerPaperSx } }}
  ```

  **Uso em MobileBottomNav.tsx (duplicação):**
  ```tsx
  slotProps={{
    paper: {
      sx: {
        backgroundColor: APP_SURFACE,
        backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
        borderRight: `1px solid ${APP_BORDER}`,
        width: 280,
      },
    },
  }}
  ```

- **Impacto:** Baixo — se o estilo compartilhado precisar ser alterado (ex: cor de superfície), o `MobileBottomNav` precisará de uma atualização manual separada. Risco de deriva visual entre os Drawers.
- **Sugestão:** Trocar para `slotProps={{ paper: { sx: { ...appDrawerPaperSx, width: 280 } } }}`. O `appDrawerPaperSx` é um objeto plano (`SxProps<Theme>`), então o spread funciona sem perda de tipo.

---

### [SUGGESTION] Teste 2 usa negação frouxa (`not.toBe('true')`) em vez de asserção positiva (`toBe('false')`)

- **Arquivo:** `tests/components/app/MobileBottomNav.component.test.tsx:116`
- **Confidence:** 95/100
- **Categoria:** Bug (confiabilidade de teste)
- **Problema:** A segunda asserção do teste 2 verifica se `aria-expanded` **não é** `'true'`, o que passaria se o atributo estiver `null`, `undefined`, vazio ou qualquer outro valor. O correto é verificar se ele é explicitamente `'false'`, já que o drawer foi fechado pela ação de clique.
- **Evidência:**

  ```ts
  // Atual (linha 116) — falso negativo possível:
  expect(moreButton.getAttribute('aria-expanded')).not.toBe('true');

  // Correto:
  expect(moreButton.getAttribute('aria-expanded')).toBe('false');
  ```

- **Impacto:** Risco de falso negativo. Se um futuro bug fizer com que `aria-expanded` seja removido do DOM (em vez de setado para `false`), o teste continua passando e o bug passa despercebido.
- **Sugestão:** Substituir por `toBe('false')`.

---

## 4. O que parece saudável

- **`keepMounted` removido** dos 3 Drawers — sem matches do seletor em `src/`. A correção do scroll extra de 333px está aplicada.
- **`& .MuiModal-root` substituído** por `zIndex: 1300` direto no root do Drawer em MobileBottomNav. Nenhum seletor morto restante.
- **`handleLogout` wrapper removido** — o fluxo agora chama `handleConfirmLogout` que chama `logout()` diretamente, sem camada extra.
- **`appDrawerPaperSx` criado** e usado por `GuestMobileNav` e `PublicHeader`. Helper bem tipado (`SxProps<Theme>`), com JSDoc claro.
- **`DeleteAccountDialog` controlado localmente** no MobileBottomNav — eliminou a dependência do evento global `open-delete-account-dialog` que era um bug silencioso em mobile.
- **`aria-expanded`** presente nos 3 triggers (MobileBottomNav linha 318, GuestMobileNav linha 83, PublicHeader linha 229).
- **i18n completo:** todas as chaves usadas (`mobileBottomNav.*`, `exportCrossRoute.mobileDot*`, `studio.header.logout.drawerLabel`, `studio.header.deleteAccount.drawerLabel`) existem nos 3 locales.
- **Mocks de `surfaces` consistentes:** 38 mocks em testes com `appDrawerPaperSx: {}` — estrutura uniforme.
- **`slotProps` em vez de `PaperProps`:** os 3 Drawers usam a API correta do MUI v9.
- **Hooks respeitam Rules of React:** todas as chamadas de `useState`, `useMemo`, `useCallback`, `useStore`, `useMediaQuery` são feitas antes do early return em todos os componentes.
- **Sem memory leaks:** nenhum `useEffect` com listener/timer não limpo. Nenhum blob URL ou referência circular.
- **Tipos:** sem `any`, sem `@ts-ignore`, sem `as` inseguro. `appDrawerPaperSx` tipado como `SxProps<Theme>` — correto.

---

## 5. Limites da revisão

- **3 falhas pré-existentes** ignoradas — não foram investigadas por estarem fora do escopo.
- **Não foi verificado** se o seletor `& .MuiDrawer-paper` com `transition: 'transform ...'` ainda é necessário nos Drawers que agora usam `appDrawerPaperSx` — pode ser redundante com o slotProps.paper, mas é inofensivo.
- **Não foram conferidos** os testes de outros 38 arquivos que mockam `surfaces` — apenas verificado que o padrão `appDrawerPaperSx: {}` é consistente no grep.
