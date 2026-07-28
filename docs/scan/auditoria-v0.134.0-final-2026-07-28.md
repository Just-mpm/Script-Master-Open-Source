# Auditoria de Estado Final — v0.134.0

**Data:** 2026-07-28
**Escopo:** Release v0.134.0 — 3 itens principais + pacote de melhorias
**Validações executadas:** `bun run lint` (exit 0) · `bun run typecheck` (exit 0) · `bun run test` (2613/2613) · SHA256(AGENTS.md) === SHA256(CLAUDE.md)

---

## 1. Contexto Assumido

- O orquestrador liberou 3 ondas de escopo além dos 3 itens originais (autorizadas em iterações anteriores): extração de `appDrawerPaperSx`, migração de `DeleteAccountDialog` para estado local, correção de a11y do drawer mobile, remoção de dead code no `Sidebar.tsx`.
- 5 testes com mocks inline são escape hatches intencionais e documentados — não devem ser migrados.
- O Vitest 4 usa `pool: 'forks'` como pool default; `poolOptions` foi removido na v4.

---

## 2. Mapa Rápido: Sólido vs Frágil

### ✅ Sólido

| Item | Evidência |
|------|-----------|
| Factory `surfacesMock.ts` com import dinâmico | Padrão correto para hoisting do Vitest 4 (confirmado por NotebookLM) |
| 33 testes migrados para o factory | 33/33 usam `async () => { const { surfacesMock } = await import(...) }` — consistente |
| `appDrawerPaperSx` consumido por 3 Drawers | `MobileBottomNav` (com `width: 280` via spread), `GuestMobileNav` (direto), `PublicHeader` (direto) |
| `exportDotPulseKeyframes` consumido por 2 componentes | `SidebarNavItem.tsx` e `MobileBottomNav.tsx` — ambos via array syntax do MUI v9 |
| `useCallback` removidos do `MobileBottomNav` | Import de `useCallback` removido; 7 handlers convertidos para função simples; comentário justifica |
| `vitest.config.ts` | Config confirmada correta pelo notebook Vitest 4 (pool, maxWorkers, timeouts) |
| Versionamento consistente | `package.json` v0.134.0 = `CHANGELOG.md` v0.134.0 = `AGENTS.md` v0.134.0 = `CLAUDE.md` v0.134.0 |
| Tabela de versões do AGENTS.md | Exatas 5 entradas (0.134.0 .. 0.130.3) — conforme regra |
| CLAUDE.md é espelho exato de AGENTS.md | SHA256 idêntico confirmado |

### ⚠️ Frágil

| Item | Risco |
|------|-------|
| 5 escape hatch tests com mocks parciais | Se qualquer um dos componentes sob teste (ou suas dependências) passar a importar `searchFieldSx` ou outro export não-stubbed, o teste quebra silenciosamente |
| JSDoc de `animations.ts` cita `mergeSx()` inexistente | Documentação enganosa para quem ler sem ver o código real |

---

## 3. Gaps Priorizados

### SUG-01 | BAIXO | Documentação incorreta

**Descrição:** O JSDoc de `exportDotPulseKeyframes` em `src/theme/animations.ts` (linhas 17-19) cita `mergeSx()` como função de utilidade para combinar o keyframe com estilos adicionais. `mergeSx` não existe em lugar nenhum do código — nem no projeto, nem em dependências MUI. O uso real (e correto) é array syntax:

```tsx
// Real (correto):
<Box sx={[exportDotPulseKeyframes, { animation: '...' }]} />

// JSDoc (incorreto):
<Box sx={mergeSx({ animation: '...' }, exportDotPulseKeyframes)} />
```

O JSDoc foi escrito antes da decisão de usar array syntax e não foi atualizado.

**Evidência:**
- `src/theme/animations.ts` linha 17-19: bloco de código com `mergeSx()`
- `supergrep_find mergeSx src/ tests/` → zero matches
- O CHANGELOG e AGENTS.md documentam corretamente o array syntax

**Mitigações verificadas:** Nenhuma — o JSDoc nunca foi corrigido. O código real está correto.

**Decisão:** Corrigir JSDoc para refletir o uso real com array syntax.

---

### SUG-02 | BAIXO | Manutenibilidade

**Descrição:** Os 5 escape hatch tests (`assistantUi.unit.test.ts`, `ConfiguracoesPage.component.test.tsx`, `SpeedPaintControls.unit.test.tsx`, `CaptionEditorPanel.unit.test.tsx`, `VideoExportPanel.unit.test.tsx`) têm mocks inline de `surfaces` que **não cobrem todos os exports** do módulo. Exemplos:

| Teste | Stubs presentes | Faltantes |
|-------|----------------|-----------|
| `assistantUi` | `insetPanelSx`, `appDrawerPaperSx` | `searchFieldSx`, `glassPanelSx`, `glassSurfaceSx` |
| `ConfiguracoesPage` | `glassPanelSx`, `insetPanelSx`, `appDrawerPaperSx` | `searchFieldSx`, `glassSurfaceSx` |
| `SpeedPaintControls` | `insetPanelSx`, `glassPanelSx`, `appDrawerPaperSx` | `searchFieldSx`, `glassSurfaceSx` |
| `CaptionEditorPanel` | `glassSurfaceSx`, `appDrawerPaperSx` | `searchFieldSx`, `glassPanelSx`, `insetPanelSx` |
| `VideoExportPanel` | `glassPanelSx`, `glassSurfaceSx`, `appDrawerPaperSx` | `searchFieldSx`, `insetPanelSx` |

Hoje a suíte passa (2613/2613) porque os componentes sob teste nessas pastas não importam os exports faltantes. Mas se qualquer um deles adicionar `import { searchFieldSx } from '../../theme/surfaces'`, o teste quebra com `TypeError: Cannot read properties of undefined`.

**Mitigações verificadas:** Nenhuma. Os mocks são escape hatches intencionais, mas a fragilidade não é documentada no JSDoc dos próprios testes.

**Decisão:** Mesmo sendo escape hatches, seria mais resiliente que todos os 5 stubssejem completos (incluindo `searchFieldSx`) — ou que a documentação de cada escape hatch alerte sobre a dependência implícita. Baixo risco hoje porque a suíte valida a falta de regressão.

---

## 4. Cenários de Borda Sem Resposta

1. **`Package.json` tem scripts que usam `cd functions && npm run build`** — se o diretório `functions/` não tiver `package.json` ou `node_modules`, o deploy quebra. Não verificado nesta auditoria (fora do escopo da release).
2. **`searchFieldSx` em `surfaces.ts` usa `WHITE_04`, `WHITE_06`, `WHITE_08`, `WHITE_16`, `BRAND_PRIMARY`, `BRAND_PRIMARY_GLOW_SOFT`** — todos existem em `tokens.ts`. ✓ Verificado.
3. **Easing select não exposto na UI do Speed Paint** — limitante conhecido desde v0.132.0, documentado no CHANGELOG e AGENTS.md. Fora do escopo da v0.134.0.
4. **`CHANGELOG.md` tem entrada v0.130.1 vazia** (linha 239): `## [0.130.1] - 2026-06-06` seguida imediatamente de `## [0.130.0] - 2026-06-06`. Pode ser um placeholder de release sem mudanças, ou um erro de formatação. Não impacta a release atual.

---

## 5. Checklist de Sanidade

| Item | Status |
|------|--------|
| Todos os arquivos lidos por completo (10 obrigatórios + adjacentes) | ✅ |
| Factory `surfacesMock` usa import dinâmico dentro de `vi.mock` factory | ✅ |
| Array syntax `sx={[helper, {...}]}` nos 2 consumidores de `exportDotPulseKeyframes` | ✅ |
| `appDrawerPaperSx` consumido pelos 3 Drawers documentados | ✅ (MobileBottomNav, GuestMobileNav, PublicHeader) |
| `useCallback` removido e não importado em `MobileBottomNav` | ✅ |
| `vitest.config.ts` confirmado contra notebook Vitest 4 | ✅ |
| Versionamento consistente (package.json / CHANGELOG / AGENTS.md / CLAUDE.md) | ✅ |
| Tabela AGENTS.md com exatas 5 entradas (regra respeitada) | ✅ |
| SHA256(AGENTS.md) === SHA256(CLAUDE.md) | ✅ |
| Lint passa (exit 0) | ✅ |
| Typecheck passa (exit 0) | ✅ |
| Testes passam (2613/2613) | ✅ |

---

## Resumo

**Total de gaps:** 2 (ambos SUGGESTION — não bloqueiam encerramento)

| ID | Severidade | Tipo | Descrição |
|----|-----------|------|-----------|
| SUG-01 | BAIXO | Documentação incorreta | JSDoc de `animations.ts` referencia `mergeSx()` inexistente |
| SUG-02 | BAIXO | Manutenibilidade | 5 escape hatch tests com mocks parciais — frágeis para futuras adições de import |

**Nenhum gap CRITICAL ou WARNING encontrado.** A release v0.134.0 está consistente entre escopo e implementação, com validações automatizadas (lint, typecheck, testes) passando e contratos de arquitetura respeitados.
