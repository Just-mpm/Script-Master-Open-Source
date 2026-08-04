# Auditoria documental — Release 0.136.0 (CHANGELOG / AGENTS / CLAUDE / package.json)

- **Data:** 2026-08-04
- **Auditor:** code-validator (Release Engineering)
- **Escopo:** estado final de `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`, `package.json` — sem revisão de diff de código de produção; claims cruzadas com `git status`/`git diff`/leitura de arquivos reais.

---

## 1. Escopo da revisão

- `CHANGELOG.md` completo (785+ linhas), com foco na entrada `0.136.0` (linhas 10–107).
- `AGENTS.md` completo (256 linhas) — seção Speed Paint (131–168) e tabela de versões (248–256).
- `CLAUDE.md` — comparação byte-a-byte com `AGENTS.md`.
- `package.json` (linha 13 — `"version"`).
- Validação cruzada com `git status`/`git diff --stat`/`git diff --numstat`, contagem real de linhas/testes via `[System.IO.File]::ReadAllLines` + regex, leitura integral de `vectorizer.safetyLimits.unit.test.ts`, `strokeCache.ts`, locales i18n (diff), `SpeedPaintPage.tsx` (seletor de easing) e `git log -S` para origem do seletor.

## 2. Veredito

**Ajustes recomendados** — a documentação é de alta qualidade geral (tom, estrutura, referências verificáveis), mas contém **4 erros factuais de contagem** e **1 violação da regra de versões** do próprio AGENTS, além de referências a versões que não existem no histórico. Nenhum achado impede o merge técnico, mas todos os CRITICAL abaixo devem ser corrigidos antes do release final.

---

## 3. Achados priorizados

### [CRITICAL] "5 novas chaves i18n / 15 entries" — real: 4 chaves / 12 entries

- **Arquivo:** `CHANGELOG.md:47` e `AGENTS.md:250`
- **Confidence:** 98/100
- **Categoria:** Bug (documentação factual)
- **Problema:** A entrada 0.136.0 afirma "5 novas chaves i18n" e "Total adicionado: 5 chaves × 3 locales = 15 entries", mas o diff real dos 3 locales (`en.ts` +8, `es.ts` +8, `pt-BR.ts` +9) adiciona exatamente **4 chaves**: `canvasColorReprocessHint`, `canvasColorReprocessAction`, `queueExportUniformTooltip`, `queueExportMixedModeBadge` (= 12 entries).
- **Evidência:**
  - `CHANGELOG.md:47`: "**5 novas chaves i18n** (3 locales...): `canvasColorReprocessHint`..., `canvasColorReprocessAction`, `queueExportUniformTooltip`, `queueExportMixedModeBadge`. Total adicionado: 5 chaves × 3 locales = 15 entries." — 4 nomes listados, contagem 5.
  - `git diff src/features/i18n/locales/{en,es,pt-BR}.ts`: 4 chaves novas por locale.
  - O próprio `AGENTS.md:156` lista as 4 chaves corretamente (inconsistência interna no AGENTS: L156 vs L250).
- **Impacto:** Claim numérico verificável e falso na documentação de release; engana leitores que conferem os locales.
- **Sugestão:** Trocar "5 novas chaves" por "4 novas chaves" e "15 entries" por "12 entries" nos dois arquivos.

### [CRITICAL] Contagem de testes errada no safetyLimits: "15 testes" — real: 17

- **Arquivo:** `CHANGELOG.md:24`
- **Confidence:** 97/100
- **Categoria:** Bug (documentação factual)
- **Problema:** "(315 linhas, 15 testes)" — a leitura integral do arquivo mostra **17 testes** (`it()`): 8 no describe `applyVetorialSafetyLimits` + 5 no `sanitizePathOrNull` + 2 no `SVG_PATH_DATA_REGEX` + 2 no `vectorizeImage`.
- **Evidência:** `tests/speed-paint/vectorizer.safetyLimits.unit.test.ts` — describe blocks às linhas 115, 236, 276, 294; contagem `it()` = 17. A contagem de 315 linhas está correta.
- **Impacto:** Claim factual errado; verificação cruzada falha.
- **Sugestão:** Corrigir para "17 testes".

### [CRITICAL] Deltas de linhas errados no `useVoicePreviews`: "+141 linhas" e "+429 linhas"

- **Arquivo:** `CHANGELOG.md:38` e `CHANGELOG.md:81`
- **Confidence:** 97/100
- **Categoria:** Bug (documentação factual)
- **Problema:** O numstat real é `+119/-22` para `src/hooks/useVoicePreviews.ts` e `+424/-5` para `tests/hooks/useVoicePreviews.unit.test.ts`. Os valores "141" e "429" não correspondem a nenhuma métrica real (são a soma adições+remoções, apresentada como "linhas adicionadas").
- **Evidência:** `git diff --numstat` → `119 22 src/hooks/useVoicePreviews.ts` e `424 5 tests/hooks/useVoicePreviews.unit.test.ts`.
- **Impacto:** Claim numérico falso. Nota: o claim "12 novos testes" (L81) está **correto** (arquivo passou de 2 para 14 `it()`).
- **Sugestão:** Corrigir para "+119 linhas" e "+424 linhas" (ou "+119/-22" e "+424/-5").

### [CRITICAL] Tabela de versões do AGENTS com 7 entradas — regra "5 versões" violada, 0.130.3 não removida

- **Arquivo:** `AGENTS.md:248-256`
- **Confidence:** 100/100
- **Categoria:** Architecture (convenção de projeto)
- **Problema:** A regra documentada no próprio arquivo (L246: "manter apenas as 5 versões mais recentes. Ao adicionar uma nova, remover a mais antiga") exige 5 entradas com a 0.136.0 no topo e 0.130.3 removida. O estado final tem **7 entradas**: 0.136.0, 0.135.0, 0.134.0, 0.133.0, 0.132.0, 0.131.0, 0.130.3. Entradas duplicadas? Não há — mas 0.131.0 e 0.130.3 deveriam ter sido removidas.
- **Evidência:** `AGENTS.md:250-256` — 7 linhas de versão; regra em L246.
- **Impacto:** Violação da convenção de manutenção do arquivo; a tabela cresce indefinidamente.
- **Sugestão:** Remover as entradas 0.131.0 e 0.130.3, mantendo 5.

### [WARNING] Referências a versões inexistentes no histórico: v0.135.1, v0.135.2, v0.135.3, v0.133.1

- **Arquivo:** `CHANGELOG.md:18, 51, 69, 81`; `AGENTS.md:131, 146, 147`
- **Confidence:** 95/100
- **Categoria:** Architecture (inconsistência documental)
- **Problema:** O histórico público salta de 0.135.0 (2026-07-28) direto para 0.136.0 — sem tags, sem entradas no CHANGELOG — mas a entrada 0.136.0 referencia "a propagação de v0.135.2/F3" (L18), "desde a v0.135.1" (L51), "setado por fitBezierPaths desde v0.135.1" (L69), "decisão consciente v0.135.1 round 6" (L81); o AGENTS referencia "(v0.135.1+v0.136.0)" (L131) e "desde v0.133.1" (L146-147). O leitor não consegue resolver nenhuma dessas versões.
- **Evidência:** `git tag` sem tags; CHANGELOG sem entradas 0.135.1/0.135.2/0.135.3/0.133.1; referências coletadas por grep.
- **Impacto:** Claims confusas que parecem apontar para releases que nunca existiram; quebra a rastreabilidade do changelog.
- **Sugestão:** Substituir por referências neutras ("versão de trabalho anterior a 0.136.0", "F3 da auditoria") ou criar as entradas de patch correspondentes se forem releases reais.

### [WARNING] "~1100 linhas de testes novos em 4 arquivos" — real: 767 linhas nos 4 arquivos

- **Arquivo:** `CHANGELOG.md:105`; `AGENTS.md:250`
- **Confidence:** 95/100
- **Categoria:** Bug (claim numérico impreciso)
- **Problema:** Os 4 arquivos de teste novos somam 67 + 210 + 315 + 175 = **767 linhas**. "~1100" só se aproxima se incluir o 5º arquivo (`useVoicePreviews.unit.test.ts`, +424 → 1191). O claim amarra "4 arquivos" a "~1100", internamente inconsistente (o texto se protege com "~" e "estimado").
- **Evidência:** Contagem real via `ReadAllLines` dos 4 arquivos untracked confirmados por `git status`.
- **Impacto:** Estimativa enganosa do delta de testes.
- **Sugestão:** "~770 linhas em 4 arquivos" ou "~1200 linhas em 5 arquivos".

### [WARNING] Contradição com a entrada 0.132.0 sobre o seletor de easing na UI

- **Arquivo:** `CHANGELOG.md:18` vs `CHANGELOG.md:297`; `AGENTS.md:254`
- **Confidence:** 93/100
- **Categoria:** Inconsistência interna
- **Problema:** A entrada 0.136.0 afirma que o seletor de easing "já existia na store e na UI (v0.132.0)" — verificado como **correto** via `git log -S 'easingLabel'` (commit 5481024, v0.132.0). Porém a entrada 0.132.0 do mesmo CHANGELOG (L297) e a tabela AGENTS (L254) documentam "UI de easing não exposta na interface do Speed Paint... seletor não foi adicionado à SpeedPaintPage.tsx" — entrada antiga factualmente errada que permanece no estado final.
- **Evidência:** `git log -S 'easingLabel' -- src/pages/SpeedPaintPage.tsx` → 5481024 (release 0.132.0); seletor presente hoje em `SpeedPaintPage.tsx:1361-1381`.
- **Impacto:** Estado final do CHANGELOG se contradiz internamente; leitor não sabe quando o seletor foi exposto.
- **Sugestão:** Corrigir a limitação documentada na entrada 0.132.0 (ou anotá-la como resolvida) para alinhar com o fato histórico.

---

## 4. Achados de polimento (SUGGESTION)

### [SUGGESTION] "3 mecanismos adicionados" com lista de 5 itens numerados

- **Arquivo:** `CHANGELOG.md:38`; `AGENTS.md:131`
- **Confidence:** 95/100
- **Problema:** O bullet anuncia "3 mecanismos adicionados" e enumera 5 (1–5 no CHANGELOG; 4 bullets no AGENTS). A contagem do lead não fecha com o corpo.
- **Sugestão:** "5 mecanismos adicionados" (ou reorganizar em 3 agrupamentos).

### [SUGGESTION] Citação truncada com reticências: `"A cor do canvas mudou de {from} para {to}. Reprocesse a imagem..."`

- **Arquivo:** `CHANGELOG.md:20`; `AGENTS.md:154`
- **Confidence:** 98/100
- **Problema:** O texto real do locale pt-BR termina em "...reflitam a nova cor."; a documentação cita entre aspas com "..." no meio — abreviação que contraria a regra anti-placeholder do projeto (handoff item 1). O uso de `{from}`/`{to}` é legítimo (placeholders reais de i18n), mas o truncamento não.
- **Sugestão:** Citar o texto completo ou descrever sem aspas de citação literal.

### [SUGGESTION] Jargão de sessão de auditoria na entrada de release

- **Arquivo:** `CHANGELOG.md:41`
- **Confidence:** 90/100
- **Problema:** "decisão consciente rodada 6, restauração do ramo condicional que o round 5 removeu" — linguagem de processo de trabalho (rounds de auditoria), não de changelog público; combina pt-BR "rodada" com en "round" no mesmo bullet.
- **Sugestão:** Reformular para linguagem de release ("o ramo condicional foi restaurado após remoção indevida em iteração anterior").

### [SUGGESTION] `vetorialWorker.ts` "139 linhas" desatualizado

- **Arquivo:** `AGENTS.md:159`
- **Confidence:** 90/100
- **Problema:** O claim "(139 linhas)" é da v0.133.0; o arquivo atual tem 142 linhas (+4 nesta release).
- **Sugestão:** Atualizar para 142 ou remover a contagem.

---

## 5. O que parece saudável

- `CLAUDE.md` é **byte-a-byte idêntico** ao `AGENTS.md` (comparação com case-sensitive).
- `package.json:13` → `"version": "0.136.0"` ✓ consistente com CHANGELOG/AGENTS; "Versão MINOR" correta (novas capacidades opt-in).
- Contagens de linhas dos arquivos novos **todas corretas**: `easingConverter.ts` 79, `easingConverter.unit.test.ts` 67 (7 testes), `CanvasColorAlert` 210 (5 testes), `safetyLimits` 315, `workerFallback` 175.
- Claim "12 novos testes" do `useVoicePreviews` ✓ (arquivo: 2 → 14 `it()`).
- Claim "4 arquivos de teste novos" ✓ bate com `git status` (4 untracked em `tests/`).
- Referência `imageProcessing.vetorial.e2e.test.ts:608` ✓ (L607-609: comentário + `expect(paths.length).toBeLessThanOrEqual(500)`).
- Constantes reais confirmadas: `MAX_PATHS_PER_SCENE = 500`, `MAX_D_BYTES_PER_SCENE = 250_000`, `SVG_PATH_DATA_REGEX`, `sanitizePathOrNull` normalizando `strokeWidth` → 1 ✓.
- Cache LRU: `MAX_CACHE_SIZE = 50` e chave com `mode + preset + sortOrder + canvasColor` ✓ (AGENTS L141).
- Tooltip de batch (F5) confirmado no diff de `QueueStaging.tsx` (`queueExportMixedModeBadge`/`queueExportUniformTooltip`) ✓.
- Tom pt-BR, bullets objetivos, seções `Adicionado/Alterado/Corrigido/Validação` — convenção mantida; markdown sem listas quebradas ou links mortos.

## 6. Limites da revisão

- Claim "suíte completa passando" (`CHANGELOG.md:105`) **não verificado** — não rodei `bun run test` (fora do escopo documental; delta de ~1200 linhas de teste novo é plausível, mas a execução precisa ser confirmada pelo pipeline).
- Claims de comportamento interno (race conditions, "worker compartilhado", "hardcodava 'white' em 4 lugares" vs "2 lugares" — escopos ambíguos, descartado como falso-positivo) não foram revalidados por execução; foram conferidos apenas por leitura de código e diff.
- Nenhum notebook do NotebookLM cobre convenção de changelog/markdown de release (notebooks existentes são de tecnologias de runtime), então a regra estrutural não se aplica; a validação foi feita contra o histórico real do repositório (`git log`, `git tag`, entradas anteriores do CHANGELOG).

## 7. Gate de saída

- [x] Evidência suficiente reunida (leitura integral dos 4 arquivos + validação cruzada com diff/código).
- [x] Achados passaram pela validação anti-falso-positivo (contagens confirmadas por método independente — `ReadAllLines`/regex — após método inicial falhar).
- [x] Confidence gate aplicado (todos ≥ 90; nenhum descartado por confiança).
- [x] Relatório salvo em `docs/audits/`.
- [ ] Motivo para escalar: não — erros factuais documentais, sem impacto em runtime; correções pontuais nos CRITICAL antes do release final.
