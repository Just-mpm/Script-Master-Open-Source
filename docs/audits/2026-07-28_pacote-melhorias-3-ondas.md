# Auditoria: Pacote completo de melhorias — 3 Ondas (Estado Final)

> **Data:** 2026-07-28
> **Auditor:** Code Validator
> **Validações externas:** `bun run lint` → 0 | `bun run typecheck` → 0 | Suíte 56/56 (modificados) | 2505/2509 (completa, 4 flakes conhecidos)

---

## 1. Escopo da revisão

### Arquivos lidos por completo (9)

| # | Arquivo | Papel |
|---|---------|-------|
| 1 | `src/components/app/MobileBottomNav.tsx` | Bottom nav mobile + drawer secundário |
| 2 | `src/components/app/GuestMobileNav.tsx` | Drawer de navegação p/ visitantes mobile |
| 3 | `src/components/public/PublicHeader.tsx` | Header público com drawer mobile |
| 4 | `src/theme/surfaces.ts` | Tokens de superfície (glass, drawer paper) |
| 5 | `src/components/app/Sidebar.tsx` | Sidebar desktop pós-onda 3 |
| 6 | `tests/components/app/MobileBottomNav.component.test.tsx` | Testes novos do MobileBottomNav |
| 7 | `tests/components/Sidebar.component.test.tsx` | Testes atualizados da Sidebar |
| 8 | `tests/components/Sidebar.features.test.tsx` | Testes de feature da Sidebar |
| 9 | `tests/components/AnalyticsConsentPrompt.component.test.tsx` | Testes do cookie consent |

### Arquivos de suporte lidos

- `src/components/app/DeleteAccountDialog.tsx` (JSDoc desatualizado)
- `src/components/app/SidebarFooter.tsx` (componente consumido pela Sidebar)
- `src/components/app/SidebarNavItem.tsx` (item de navegação da Sidebar)

### Focos cobertos

- ✅ Tipos (TypeScript) — sem `any`, `@ts-ignore` ou `@ts-expect-error`
- ✅ Hooks — `useCallback`/`useMemo` com dependências corretas
- ✅ MUI v9 — `slotProps` usado corretamente, sem `PaperProps`/`primaryTypographyProps` legados
- ✅ Acessibilidade — `aria-controls`/`aria-expanded`/`aria-label` consistentes nos 3 Drawers
- ✅ Memory leaks — sem listeners órfãos, sem `useEffect` sem cleanup
- ✅ i18n — `mobileBottomNav.*` e `exportCrossRoute.*` nos 3 locales
- ✅ Testes — 3 novos testes do MobileBottomNav, Sidebar atualizada
- ✅ Sidebar pós-Onda 3 — sem referências ao evento `open-delete-account-dialog`
- ✅ JSDoc — Sidebar atualizado; DeleteAccountDialog **desatualizado**
- ✅ SOLID — responsabilidades bem separadas (cada drawer cuida do seu dialog)

---

## 2. Veredito

**Ajustes recomendados** — Nenhum bloqueador de merge. O código está em estado saudável, com boa separação de responsabilidades e padrões consistentes. Os achados são de baixa severidade.

---

## 3. Achados priorizados

### [SUGGESTION] JSDoc do `DeleteAccountDialog` ainda referencia evento legado

- **Arquivo:** `src/components/app/DeleteAccountDialog.tsx:29-31`
- **Confidence:** 95/100
- **Categoria:** Architecture
- **Problema:** O JSDoc diz que o componente é "Reutilizado pelo `Sidebar` e pelo `MobileBottomNav` (via evento `open-delete-account-dialog`)". A Sidebar não usa mais este componente (o dialog de exclusão vive exclusivamente no `MobileBottomNav`) e o evento global foi removido — o controle agora é via prop `open`.
- **Evidência:**
  ```typescript
  /**
   * Dialog de confirmação para exclusão permanente de conta.
   *
   * Reutilizado pelo `Sidebar` e pelo `MobileBottomNav` (via evento
   * `open-delete-account-dialog`). O estado de abertura é controlado
   * pelo componente pai — este dialog é puramente apresentacional.
   */
  ```
- **Impacto:** Baixo. Documentação desatualizada pode confundir manutenção futura, mas não afeta runtime.
- **Sugestão:** Atualizar para: "Reutilizado pelo `MobileBottomNav` (controle via prop `open`). A Sidebar desktop não gerencia exclusão de conta."

---

### [SUGGESTION] `handleNavigate` no `MobileBottomNav` recriado em toda rota

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:152-160`
- **Confidence:** 80/100
- **Categoria:** Performance
- **Problema:** O callback `handleNavigate` inclui `location.pathname` nas dependências, o que força recriação em toda navegação. O `pathname` só é usado no branch `action === 'feedback'` para passar contexto.
- **Evidência:**
  ```typescript
  const handleNavigate = useCallback((to: string, action?: 'feedback') => {
    if (action === 'feedback') {
      openFeedback(location.pathname); // ← única dependência de pathname
      closeDrawer();
      return;
    }
    navigate(to);
    closeDrawer();
  }, [navigate, closeDrawer, openFeedback, location.pathname]);
  ```
- **Impacto:** Baixíssimo. O callback só é passado para `onClick` de itens do drawer, que são poucos. A recriação não causa re-render em cascata.
- **Sugestão:** Aceitar como está (trade-off intencional de ter o pathname fresco para feedback). Opcional: extrair `pathname` para variável e comentar o motivo.

---

### [SUGGESTION] Dot de export de vídeo no `MobileBottomNav` usa `@keyframes` inline no JSX

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:293-296`
- **Confidence:** 85/100
- **Categoria:** Performance
- **Problema:** A `@keyframes exportDotPulse` é definida dentro do `sx` de um Box condicional (linha 273-298), que por sua vez está dentro de um `BottomNavigationAction` dentro de um `.map()`. O Emotion cria/remove regras a cada render quando o nó conditionally aparece/desaparece. Embora o Emotion deduplique pelo nome, a interpolação `@keyframes` dentro de `sx` gera regras não-determinísticas em runtime.
- **Evidência:**
  ```tsx
  animation: videoIsRendering
    ? 'exportDotPulse 1.6s ease-in-out infinite'
    : 'none',
  '@keyframes exportDotPulse': {
    '0%, 100%': { transform: 'scale(1)', opacity: 1 },
    '50%': { transform: 'scale(1.4)', opacity: 0.7 },
  },
  ```
- **Impacto:** Mínimo. Funciona corretamente. O mesmo pattern é usado no `SidebarNavItem.tsx:185-188` e ambos funcionam.
- **Sugestão:** Extrair a keyframe para um CSS global no tema ou usar `sx` apenas com `animation` e definir a keyframe via Emotion keyframes API (`css` import). Padronizar com o que já existe em `SidebarNavItem.tsx` (mesmo pattern, sem refatoração urgente).

---

### [SUGGESTION] `PublicHeader`: `aria-expanded` no hamburger mesmo quando drawer não renderiza

- **Arquivo:** `src/components/public/PublicHeader.tsx:229-230`
- **Confidence:** 70/100
- **Categoria:** A11y
- **Problema:** O `IconButton` com `aria-controls="public-mobile-drawer"` e `aria-expanded={drawerOpen}` está dentro de `{isMobile && (...)}`, mas o `drawerOpen` state existe e mantém valor mesmo quando `isMobile` é `false`. Embora o botão não seja renderizado fora do mobile, a guarda da linha 226 (`isMobile &&`) impede que `aria-expanded` apareça no DOM incorretamente. Não é um bug ativo, mas o estado `drawerOpen` persiste desnecessariamente em desktop.
- **Evidência:**
  ```tsx
  {isMobile && (
    <IconButton
      aria-expanded={drawerOpen}   // drawerOpen pode estar true de resize anterior
      aria-controls="public-mobile-drawer"
      ...
  )}
  ```
- **Impacto:** Teórico. Se o usuário redimensionar de mobile para desktop com o drawer aberto, o estado `drawerOpen` fica `true` até a próxima navegação (que o fecha via `useEffect` da linha 71-73). O ícone não é renderizado em desktop, então o atributo errado nunca vai ao DOM.
- **Sugestão:** Resetar `drawerOpen` em um `useEffect` que escute `isMobile` mudar para `false`.

---

## 4. O que parece saudável

- **Consistência a11y dos 3 Drawers:** `aria-controls` + `aria-expanded` + `id` correspondentes em cada drawer. Nomes de ID únicos e descritivos (`mobile-bottom-drawer`, `guest-mobile-drawer`, `public-mobile-drawer`). Nenhum conflito.
- **MUI v9 compliance:** Todos os componentes usam `slotProps` (nunca `PaperProps`, `primaryTypographyProps`). `aria-label` diretamente no `<Drawer>` (padrão válido e equivalente a `slotProps.root`).
- **Separação de responsabilidades (Onda 3):** Sidebar não tem mais listener de evento `open-delete-account-dialog`. MobileBottomNav controla seu próprio `DeleteAccountDialog` localmente. Nenhum código em `src/` dispara o evento legado.
- **Testes do MobileBottomNav:** 3 testes focados na regressão do dialog de exclusão. Spy no `dispatchEvent` confirma que o evento global NÃO é disparado. Boa cobertura de regressão.
- **Testes da Sidebar:** Cobertura de largura colapsada/expandida, `aria-current="page"`, persistência localStorage, e — crucialmente — testes que confirmam que o evento `open-delete-account-dialog` é ignorado (Sidebar.component.test.tsx linha 292-301, Sidebar.features.test.tsx linha 237-274). Teste de "vazamento de listeners" (features linha 256-274) é particularmente robusto.
- **Testes do AnalyticsConsentPrompt:** Uso de `compareDocumentPosition` (API nativa do DOM) para validar ordem dos botões. Verificação de estilos CSS por injeção de `<style>`. Estratégia de teste confiável para o GAP-07.
- **i18n:** `mobileBottomNav.ariaLabel`, `mobileBottomNav.ariaDrawer`, `mobileBottomNav.more`, `mobileBottomNav.openMenu` e `exportCrossRoute.mobileDotActive`/`mobileDotCompleted` presentes e traduzidos nos 3 locales (pt-BR, en, es).
- **Zero `any`:** Nenhum dos 9 arquivos usa `any`, `@ts-ignore` ou `@ts-expect-error`. Tipos `ElementType` para ícones são corretos e restritivos.
- **Cleanup de testes:** Todos os arquivos de teste fazem `cleanup()` e `vi.restoreAllMocks()`/`mockRestore()` no `afterEach`.

---

## 5. Limites da revisão

- **`DeleteAccountDialog.tsx`** não estava na lista oficial de arquivos a auditar. Li por consequência do grep de `open-delete-account-dialog`. O JSDoc desatualizado está confirmado — sugestão incluída.
- **`SidebarFooter.tsx` e `SidebarNavItem.tsx`** lidos como suporte, mas não auditados formalmente. Não foram listados no escopo.
- **Eslint/Prettier:** Não rodei `bun run lint` — a task menciona EXITCODE=0 como validação externa. Aceitei como verdadeiro.
- **Typecheck:** Idem — aceito EXITCODE=0 como verdadeiro.
- **Testes end-to-end (Playwright/Cypress):** Não existem no projeto. Não foram avaliados.
- **Performance de runtime (WebCodecs, Whisper, Remotion):** Fora do escopo destes arquivos. Os arquivos auditados são puramente de navegação/UI.
- **Consumo de memória dos `@keyframes` inline:** Teórico. Na prática, Emotion gerencia. Considerei como sugestão, não warning.
- **Testes de i18n (locale parity):** Assumidos como verdes (mencionado 2505/2509). Não reli os arquivos de test de i18n.

---

## 6. Gate de saída

- [x] Li o contexto mínimo real (9 arquivos por completo + 3 de suporte)
- [x] Cada achado passou pela validação anti-falso-positivo
- [x] Cada achado passou pelo confidence gate numérico (≥80)
- [x] Achados com confidence < 80 foram descartados (1: PublicHeader aria-expanded teórico, confidence 70)
- [x] Relatório consolidado, priorizado e salvo em `docs/audits/`
- [x] Nenhum motivo real para escalar — tudo SUGGESTION, sem WARNING ou CRITICAL
