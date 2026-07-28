# Auditoria — Pacote de melhorias pós-fix de scroll (Drawers)

**Data:** 2026-07-28  
**Versão do projeto:** 0.133.0  
**Escopo:** 5 arquivos alterados + 1 novo + 38 mocks  
**Validação:** `bun run lint` (0), `bun run typecheck` (0), `bun run test --run` (2610/2613 — 3 falhas pré-existentes)

---

## 1. Contexto assumido

- `MobileBottomNav` renderiza apenas em mobile (`isMobile`) com usuário logado.
- `GuestMobileNav` renderiza apenas em mobile (`isMobile`) sem usuário.
- `PublicHeader` renderiza em desktop + mobile, com drawer apenas em mobile.
- `appDrawerPaperSx` é o helper DRY extraído para `theme/surfaces.ts`.
- O evento `open-delete-account-dialog` não é mais disparado por ninguém em produção — a Sidebar mantém o listener apenas por "contrato retrocompatível" com 5 testes existentes.

---

## 2. Mapa rápido: sólido vs frágil

| Arquivo | Estado |
|---|---|
| `surfaces.ts` | ✅ Sólido — `appDrawerPaperSx` exportado com tipagem correta |
| `GuestMobileNav.tsx` | ✅ Sólido — usa `appDrawerPaperSx`, tem `aria-controls`/`id` |
| `PublicHeader.tsx` | ✅ Sólido — usa `appDrawerPaperSx`, tem `aria-controls`/`id`, tem `aria-labelledby` |
| `MobileBottomNav.tsx` | ⚠️ Funcional — mas com 2 lacunas de acessibilidade |
| `Sidebar.tsx` | ⚠️ Dead code — listener do evento sem dispatcher |
| `MobileBottomNav.component.test.tsx` | ⚠️ Funcional — mas com cobertura incompleta |
| Mocks (37 arquivos) | ✅ Consistentes — todos com `appDrawerPaperSx: {}` |

---

## 3. Gaps priorizados

### WARNING (bloqueia encerramento)

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas |
|---|---|---|---|---|---|---|
| GAP-01 | **WARNING** | Acessibilidade incompleta | 95 | **MobileBottomNav: `aria-controls` ausente + Drawer sem `id`** — o botão "Mais" tem `aria-expanded` mas não tem `aria-controls` apontando para o Drawer. O Drawer tem `aria-label` mas não tem `id`. Os outros 2 Drawers (`GuestMobileNav` e `PublicHeader`) têm o par `aria-controls`/`id` completo. | `MobileBottomNav.tsx` L312–325 (botão sem `aria-controls`), L330–360 (Drawer sem `id`). `GuestMobileNav.tsx` L83–84 + L102. `PublicHeader.tsx` L229–230 + L292–293. | O contraste com os outros 2 Drawers comprova que a implementação está incompleta. A descrição do pacote diz "Adicionados aria-expanded, aria-controls e id aos 3 Drawers" — mas o MobileBottomNav só recebeu `aria-expanded`. |

### SUGGESTION (não bloqueia)

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Pergunta/Decisão |
|---|---|---|---|---|---|---|
| SUG-01 | SUGGESTION | Dead code | 100 | **Evento `open-delete-account-dialog` no Sidebar é dead code** — nenhum código em produção dispara o evento desde que o MobileBottomNav migrou para dialog local. O listener no `Sidebar.tsx` (L127–135) nunca será chamado. Os 5 testes existentes (`Sidebar.component.test.tsx` + `Sidebar.features.test.tsx`) ainda dependem do evento. | `grep src/ dispatchEvent.*CustomEvent.*delete` → 0 resultados. `Sidebar.tsx` L131: `window.addEventListener('open-delete-account-dialog')` sem dispatcher. | Vale remover o listener e os 5 testes correspondentes? A decisão anterior foi "contrato retrocompatível", mas não há mais contrato — o dispatcher foi removido. |
| SUG-02 | SUGGESTION | Duplicação de código | 90 | **MobileBottomNav duplica `appDrawerPaperSx` inline** — O drawer do MobileBottomNav (L335–343) reescreve `backgroundColor`, `backgroundImage` e `borderRight` em vez de estender `appDrawerPaperSx`. O JSDoc de `appDrawerPaperSx` (surfaces.ts L48–51) explicitamente diz que MobileBottomNav deveria estendê-lo. | `MobileBottomNav.tsx` L335–343 vs `surfaces.ts` L53–57. `appDrawerPaperSx` JSDoc: "Drawers que precisem de personalização adicional (ex: MobileBottomNav que define width: 280 e borderRight extra) devem estender este objeto em vez de redefinir as três chaves básicas." | Refatorar para: `slotProps={{ paper: { sx: { ...appDrawerPaperSx, width: 280 } } }}` |
| SUG-03 | SUGGESTION | Cobertura de teste | 90 | **Testes não verificam que o DeleteAccountDialog abre** — os 3 testes novos cobrem: (1) ausência de evento global, (2) drawer fecha ao clicar em "Excluir conta", (3) logout não dispara evento. Mas nenhum testa que o dialog realmente aparece na tela. | `MobileBottomNav.component.test.tsx` — nenhum `getByRole('dialog')` ou `queryByText('EXCLUIR')` ou `queryByText('Excluir conta permanentemente')`. | Adicionar: `expect(screen.getByRole('dialog')).toBeInTheDocument()` após clicar em "Excluir conta". |
| SUG-04 | SUGGESTION | Precisão de teste | 85 | **Teste de `aria-expanded` usa `not.toBe('true')` em vez de `toBe('false')`** — no teste 2 (L116): `expect(moreButton.getAttribute('aria-expanded')).not.toBe('true')`. Isso passa até se o atributo for `null` ou inexistente. | `MobileBottomNav.component.test.tsx` L116. | Trocar para: `expect(moreButton.getAttribute('aria-expanded')).toBe('false')` para verificar o valor explícito. |
| SUG-05 | SUGGESTION | Discrepância de contagem | 80 | **Contagem de mocks: 37 em vez de 38** — A descrição do pacote diz "Atualizados 38 mocks". Encontrei 37 arquivos de teste com `appDrawerPaperSx: {}`. Pode ser erro de contagem ou um arquivo foi perdido. | `grep -r "appDrawerPaperSx: {}" tests/ --include="*.test.*"` → 37 arquivos únicos. | Verificar se algum teste ficou sem a atualização. Nenhum teste falhou no `bun run test`, então não há regressão, mas a contagem está errada. |
| SUG-06 | SUGGESTION | Teste faltando | 80 | **Faltam testes de `aria-expanded` específicos para o MobileBottomNav** — Os outros 2 drawers (GuestMobileNav, PublicHeader) têm `aria-expanded` em IconButton com `aria-controls`. O MobileBottomNav tem `aria-expanded` no BottomNavigationAction sem `aria-controls`. Um teste de acessibilidade detectaria a diferença. | Contraste: `GuestMobileNav.tsx` L83–84 (IconButton + aria-controls), `PublicHeader.tsx` L229–230 (IconButton + aria-controls), `MobileBottomNav.tsx` L317–318 (BottomNavigationAction, sem aria-controls). | Adicionar teste que verifica a presença de `aria-controls` no botão "Mais" (após corrigir GAP-01). |

---

## 4. Cenários de borda sem resposta

| Cenário | Risco | Explicação |
|---|---|---|
| `deleteAccount()` resolve sem redirect | Médio | O `DeleteAccountDialog` entra em `isDeleting=true` e nunca sai — `handleConfirm` não chama `onClose` no sucesso. Se o AuthContext falhar em redirecionar (ex: erro silencioso), o dialog fica travado com spinner. Mitigação: AuthContext sempre redireciona, mas não há fallback. |
| COEP + backdropFilter | Baixo | `backdropFilter: 'blur(8px)'` no backdrop do Drawer do MobileBottomNav. COEP requer `Cross-Origin-Embedder-Policy: require-corp` que pode interferir com `backdrop-filter` em alguns navegadores. Já usado em outros lugares (AppBar). |
| i18n async race no teste | Baixo | O teste define `localStorage.setItem('s2a_locale', 'pt-BR')` antes do render. Se o I18nProvider carregar traduções async, as chaves podem não estar disponíveis no primeiro render. O teste passou, então funciona — mas é frágil. |

---

## 5. Checklist de sanidade

- [x] Li o arquivo **COMPLETO** de cada arquivo alterado
- [ ] Verifiquei se existe handling no **parent** (Suspense, ErrorBoundary, wrapper)? — *Não aplicável, não há error states novos*
- [x] Usei `analyze_aitool_find` e `supergrep_find` para confirmar ausência de dispatcher do evento
- [x] Verifiquei se há comentário ou documentação explicando intenção (Sidebar: contrato retrocompatível)
- [x] Confirmei que um **usuário REAL** seria afetado (GAP-01: leitores de tela no mobile)
- [x] 3 falhas de teste são pré-existentes em `AnalyticsConsentPrompt.component.test.tsx`, não relacionadas
- [x] Nenhum CRITICAL encontrado

---

## Resumo

- **0** CRITICAL
- **1** WARNING (**GAP-01**: `aria-controls`/`id` ausente no MobileBottomNav — inconsistência de acessibilidade)
- **6** SUGGESTIONS (dead code, duplicação, cobertura de teste, precisão de teste, contagem de mocks, teste acessibilidade)
