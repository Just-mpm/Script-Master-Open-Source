# Auditoria de Lacunas — 4 Melhorias de UX

**Data:** 2026-06-01  
**Escopo:** LocaleSelector no Header, Seção idioma nas Configurações, Dialog de logout, Banner de sync  
**Metodologia:** Leitura completa dos 8 arquivos-chave + 3 locales + 4 arquivos de teste + buscas estruturais

---

## 1. Contexto Assumido

- 4 features de UX implementadas por worker + refinadas por UI designer
- Projeto usa MUI v9, i18n com 3 locales (pt-BR, en, es), Zustand, react-router-dom v7
- Sistema de persistência dual (Firestore + IndexedDB)
- Header.tsx (autenticado), PublicHeader.tsx (visitante), MobileBottomNav.tsx (mobile autenticado)

---

## 2. Mapa Rápido: Sólido vs Frágil

| Feature | Status | Resumo |
|---------|--------|--------|
| #1 LocaleSelector no Header (desktop) | ✅ Sólido | Funciona, i18n completo, acessibilidade correta |
| #1 LocaleSelector no Header (mobile drawer) | ❌ Inalcançável | Código existe mas nunca é acessível (ver GAP-02) |
| #2 Seção idioma nas Configurações | ✅ Sólido | i18n completo, mudança imediata, não interfere no save |
| #3 Dialog de logout | ⚠️ Regressão em teste | Funcional, consistente em 3 componentes, mas quebra teste (ver GAP-01) |
| #4 Banner de sync com Collapse | ✅ Sólido | Comportamento correto, sem `unmountOnExit` mas impacto nulo |
| i18n (3 locales) | ✅ Completo | Todas as chaves existem nos 3 arquivos |
| Acessibilidade | ✅ Correto | aria-labels, roles, focus management via MUI Dialog |

---

## 3. Gaps Priorizados

### GAP-01 | CRÍTICO | Regressão de Teste | Confidence: 95

**Descrição:** O teste `'chama logout ao clicar no botão Sair'` em `Header.component.test.tsx` (linha 130-146) **vai falhar**. O teste clica no botão "Sair" e espera que `logout()` seja chamado diretamente. Após a mudança, o clique abre o `LogoutConfirmDialog` — `logout()` só é chamado ao confirmar no dialog.

**Evidência:**

```typescript
// Header.component.test.tsx:130-146
it('chama logout ao clicar no botão Sair', async () => {
  const mockLogout = vi.fn();
  // ...
  await user.click(screen.getByRole('button', { name: /Sair/i }));
  expect(mockLogout).toHaveBeenCalledTimes(1); // ← FALHA: mockLogout é chamado 0 vezes
});
```

Fluxo atual em `Header.tsx:359`: `onClick={handleOpenLogoutDialog}` → abre dialog (linha 132-134). Logout só em `handleConfirmLogout` (linha 140-143).

**Mitigações verificadas:**
- Não há mock de `LogoutConfirmDialog` no teste que pudesse interceptar o comportamento
- Não há nenhum outro teste que cubra o fluxo "clique → dialog → confirmar → logout"

**Recomendação:** Atualizar o teste para simular o fluxo completo: clicar em "Sair" → encontrar dialog → clicar em "Sair" no dialog → verificar `mockLogout`. Alternativamente, adicionar um novo teste para o dialog e ajustar o teste existente para verificar apenas que o dialog abre.

---

### GAP-02 | ALTO | UI Inalcançável (Dead Code) | Confidence: 95

**Descrição:** O seletor de idioma no drawer mobile do `Header.tsx` (linhas 525-536) **nunca é acessível** para usuários autenticados. O hamburger que abre o drawer (linhas 288-303) é exibido apenas quando `isMobile && !user`. O seletor de idioma, porém, está dentro de `{user && (...)}` (linha 512). Essas duas condições são mutuamente excludentes.

**Evidência:**

```tsx
// Header.tsx:288 — hamburger visível APENAS para visitante
{isMobile && !user && (
  <IconButton onClick={toggleDrawer} ...>
    <MenuIcon />
  </IconButton>
)}

// Header.tsx:512-536 — language selector dentro do bloco {user && (...)}
{user && (
  <>
    {/* ... */}
    <ListItemButton onClick={(e) => setLocaleAnchorEl(e.currentTarget)}>
      <Language /> {/* ← NUNCA ALCANÇÁVEL */}
    </ListItemButton>
  </>
)}
```

Usuários autenticados em mobile usam `MobileBottomNav` (sem hamburger no Header). O drawer nunca abre.

O `Menu` de locale (linhas 578-620) e o estado `localeAnchorEl` (linha 95) são **dead code** — renderizados mas nunca interagíveis.

**Mitigações verificadas:**
- `supergrep_find` e `grep` confirmaram que nenhum outro componente dispara `toggleDrawer` ou abre o drawer do Header programaticamente
- O `MobileBottomNav` NÃO possui seletor de idioma

**Recomendação:**  
Opção A: Mover o seletor de idioma para o `MobileBottomNav` drawer (arquivo `MobileBottomNav.tsx`, após linha 378).  
Opção B: Remover o dead code do Header (linhas 525-536 + 578-620 + estado `localeAnchorEl`).  
Opção C: Adicionar um item de idioma no `MobileBottomNav` drawer que navega para Configuracoes.

---

### GAP-03 | MÉDIO | Ausência de LocaleSelector no MobileBottomNav | Confidence: 90

**Descrição:** Usuários autenticados em mobile não têm acesso rápido à troca de idioma pela navegação principal. No desktop, o `LocaleSelector` está no Header (linha 342-346). Em páginas públicas, o `PublicHeader` tem `LocaleSelector` (linha 208). Mas no `MobileBottomNav`, não há seletor de idioma — o drawer mostra apenas navegação secundária + ações de conta (Cookie, Sair, Excluir).

**Evidência:**

```
MobileBottomNav.tsx drawer items:
  - /app/imagens        (ImageStudio)
  - /app/pintura-rapida (SpeedPaint)
  - /app/configuracoes  (Settings)
  - Cookie consent
  - Sair               ← usa LogoutConfirmDialog ✓
  - Excluir conta      ← via evento customizado ✓
  ❌ Sem LocaleSelector
```

**Mitigações verificadas:**
- O usuário pode trocar idioma indo em Configuracoes → seção "Idioma da Interface" (5ª seção). Não está quebrado, apenas menos descobrível.
- `analyze_aitool_find` confirmou que não existe locale selector em MobileBottomNav.

**Recomendação:** Adicionar `ListItemButton` com ícone `Language` no drawer do `MobileBottomNav` (abaixo de "Cookies", acima de "Sair"). Ao clicar, abre o mesmo tipo de `Menu` inline usado no Header drawer ou navega para Configuracoes com scroll automático.

---

## 4. Cenários de Borda sem Resposta

| Cenário | Status | Nota |
|---------|--------|------|
| Trocar idioma no Header E nas Configurações ao mesmo tempo | ✅ Seguro | Ambos usam `setLocale()` do mesmo `useLocale()` context. Sem race condition. |
| Fechar drawer enquanto dialog de logout está aberto | ✅ Seguro | Dialog é renderizado fora do Drawer (portal). `closeDrawer()` não afeta o dialog. |
| Trocar idioma com Configuracoes aberto → mudança reflete imediatamente | ✅ Correto | `setLocale()` re-renderiza tudo. Os labels do formulário atualizam na hora. |
| Banner de sync renderiza conteúdo mesmo quando oculto | ✅ Aceitável | Sem `unmountOnExit`, mas conteúdo é leve (3 Chips + Typography). Custo nulo. |
| `localeOptions` recriado a cada render | ✅ Aceitável | Array de 3 elementos, `useMemo` dependentes sempre recomputam, mas custo trivial. |
| Dialog de logout + Dialog de exclusão abertos ao mesmo tempo | ✅ Impossível | Fluxo não permite abrir ambos simultaneamente (cada um tem seu próprio state). |

---

## 5. Checklist de Sanidade

- [x] **i18n completo:** Todas as chaves de logout (`dialogTitle`, `dialogDescription`, `dialogCancel`, `dialogConfirm`, `drawerLabel`, `tooltip`, `ariaLabel`) existem nos 3 locales
- [x] **i18n completo:** Chaves da seção idioma (`sectionLanguage`, `languageDescription`, `interfaceLocaleLabel`) existem nos 3 locales
- [x] **i18n completo:** `nav.logout` (usado no PublicHeader drawer) existe nos 3 locales
- [x] **Consistência:** `LogoutConfirmDialog` é reutilizado em Header, PublicHeader e MobileBottomNav com a mesma interface
- [x] **Consistência:** Padrão `closeDrawer() → openDialog()` é o mesmo nos 3 componentes
- [x] **Acessibilidade:** Dialog tem `aria-labelledby`, título com `id` correspondente, ícone com `aria-hidden`
- [x] **Acessibilidade:** Botão de logout tem `aria-label` traduzido em todos os contextos
- [x] **Sem estado duplicado:** Locale é gerenciado exclusivamente por `useLocale()` context
- [x] **Sem regressão funcional:** Logout, delete account, navegação e save de configurações continuam funcionando
- [ ] **Testes:** GAP-01 — teste de logout direto precisa ser atualizado
- [ ] **Dead code:** GAP-02 — seletor de idioma no drawer do Header é inalcançável
- [ ] **Descobribilidade:** GAP-03 — mobile autenticado sem acesso rápido ao seletor de idioma
