# Auditoria: Swipe Tabs Bugfix (v0.111.x)

**Data:** 2026-05-31
**Escopo:** `src/hooks/useSwipeTabs.ts`, `src/pages/StudioPage.tsx`, `tests/hooks/useSwipeTabs.test.ts`
**Focos:** Engenharia, tipos, cobertura de testes, referências órfãs

---

## Escopo da revisão

| Arquivo | Linhas | Lido por completo |
|---------|--------|-------------------|
| `src/hooks/useSwipeTabs.ts` | 136 | Sim |
| `src/pages/StudioPage.tsx` | 206 | Sim |
| `tests/hooks/useSwipeTabs.test.ts` | 347 | Sim |

**Verificações realizadas:**
- Diff completo das 3 mudanças (unstaged, +30/-21)
- Busca por `constraintRef` em todo o projeto (src/ + tests/ via supergrep, raiz via grep textual)
- Tipos do Motion (`motion-dom`, `motion-utils`) verificados diretamente nos `.d.ts`
- Único consumidor do hook (`StudioPage.tsx`) validado
- 347 linhas de testes revisadas para cobertura dos novos comportamentos

---

## Veredito

**Sem problemas relevantes** — as mudanças são consistentes, bem tipadas e os testes cobrem os novos comportamentos.

---

## Achados priorizados

### [SUGGESTION] Documentação desatualizada em AGENTS.md, CLAUDE.md e CHANGELOG.md

- **Arquivo:** `AGENTS.md:282`, `CLAUDE.md:282`, `CHANGELOG.md:204,215`
- **Confidence:** 95/100
- **Categoria:** Dead Code / Documentação
- **Problema:** Três arquivos de documentação ainda referenciam `constraintRef` e o threshold antigo de `50px`, que foram substituídos nesta mudança.
- **Evidência:**
  - AGENTS.md:282 — "`constraintRef` para limitar arrasto", "thresholds de distância (50px)"
  - CLAUDE.md:282 — idem
  - CHANGELOG.md:204 — "`constraintRef` para limitar arrasto", "(50px)"
  - CHANGELOG.md:215 — "container com `constraintRef` para limitar arrasto"
- **Impacto:** Nenhum impacto funcional. Documentação dos agentes fica divergente da API real, o que pode confundir futuras intervenções de IA.
- **Sugestão:** Atualizar para `dragConstraints: { left: 0, right: 0 }` e `DISTANCE_THRESHOLD = 40`. Pode ser feito no próximo `/fast`.

---

## O que parece saudável

- **Zero referências órfãs a `constraintRef` em código** — supergrep em `src/` e `tests/` não encontrou nenhuma ocorrência.
- **Tipos 100% compatíveis com Motion** — `dragConstraints: { left: number; right: number }` satisfaz `Partial<BoundingBox>`; `dragDirectionLock: boolean` e `dragElastic: number` também correspondem exatamente aos tipos esperados.
- **`as const` em `DRAG_CONSTRAINTS`** garante referência estável entre renders — não causa re-render do `motion.div`.
- **A API do hook está enxuta e coesa** — 5 retornos claros, cada um com responsabilidade única, types explícitos, comentários JSDoc.
- **Comentário do StudioPage.tsx (linha 133)** continua correto — o `Box` pai ainda serve como container de clipping (`overflow: hidden`) mesmo sem o `ref`.
- **Testes cobrem os novos comportamentos** — `dragConstraints` testa `toEqual({ left: 0, right: 0 })`, `dragDirectionLock` testa `toBe(true)`, `dragElastic` testa `toBe(1)`.
- **Testes de regressão intactos** — swipe (distância + velocidade), limites de aba, elementos interativos, variants e reatividade permanecem cobertos.
- **Apenas 1 consumidor real do hook** — `StudioPage.tsx` — sem risco de propagação.

---

## Limites da revisão

- Não foi consultado o NotebookLM do Motion (nenhum notebook dedicado disponível). A verificação de tipos foi feita diretamente nos `.d.ts` do `motion-dom` e `motion-utils` instalados.
- Não foi executado o suite de testes (`bun run test`) — análise baseada em leitura estática.
- Não foi avaliado o comportamento visual/tátil em dispositivo real — a auditoria confirmou apenas consistência de código e tipos.
