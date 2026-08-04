# Reauditoria Documental — Release 0.136.0 (Estado Final)

- **Data:** 2026-08-04
- **Agente:** code-validator
- **Escopo:** `CHANGELOG.md` (completo), `AGENTS.md` (completo), `CLAUDE.md` (completo), `package.json` (linha 13)
- **Método:** leitura integral dos 4 arquivos + verificação factual contra o código real (contagem de `it()`/linhas em 4 arquivos de teste, contagem de linhas de `vetorialWorker.ts`, hash SHA-256 de AGENTS/CLAUDE, `git show` do commit da v0.133.0) + consulta ao relatório da rodada anterior (`docs/audits/2026-08-04-release-docs-0.136.0-audit.md`)

---

## Veredito

**Bloqueadores de merge** — 2 dos 4 CRITICAL da rodada anterior ficaram **parcialmente ou não aplicados** no `CHANGELOG.md` (linhas 24 e 83). Os demais pontos foram confirmados resolvidos e nenhuma regressão nova emergiu fora dessas duas ocorrências.

---

## Achados priorizados

### [CRITICAL] "15 testes" no safetyLimits ainda não corrigido para "17 testes"

- **Arquivo:** `CHANGELOG.md:24`
- **Confidence:** 98/100
- **Categoria:** Documentação
- **Problema:** A correção do CRITICAL #2 da rodada anterior (15 → 17 testes) **não foi aplicada** nesta linha do CHANGELOG. A contagem real do arquivo é 17.
- **Evidência:**
  - `CHANGELOG.md:24`: `Testes em `tests/speed-paint/vectorizer.safetyLimits.unit.test.ts` (315 linhas, 15 testes)` — claim idêntico ao que a rodada anterior mandou corrigir (relatório anterior, linhas 38-46: "Corrigir para '17 testes'").
  - Verificação direta do arquivo real: `vectorizer.safetyLimits.unit.test.ts` = **315 linhas, 17 `it()`** (8 em `applyVetorialSafetyLimits` + 5 em `sanitizePathOrNull` + 2 em `SVG_PATH_DATA_REGEX` + 2 em `vectorizeImage`).
- **Impacto:** Claim numérico falso persiste na release; a métrica oficial de testes da v0.136.0 fica subestimada.
- **Sugestão:** Alterar para "(315 linhas, 17 testes)".
- **Nota:** O `AGENTS.md` (linha 250, tabela de versões) não contém contagem do safetyLimits — a correção está consistente lá (ausência do claim, não há "15" nem "17"). O problema é exclusivo do CHANGELOG.

### [CRITICAL] "+429 linhas" residual na seção Corrigido — deveria ser "+424"

- **Arquivo:** `CHANGELOG.md:83`
- **Confidence:** 97/100
- **Categoria:** Documentação
- **Problema:** O CRITICAL #3 da rodada anterior ("+424, não +429") foi aplicado nas linhas 38 e 45, mas **restou uma ocorrência do valor errado** na seção "Corrigido". "+429" é exatamente a soma das adições+remoções (424+5) apresentada como "linhas adicionadas" — o mesmo erro diagnosticado na rodada anterior (relatório anterior, linhas 48-56).
- **Evidência:**
  - `CHANGELOG.md:83`: `12 novos testes em `tests/hooks/useVoicePreviews.unit.test.ts` (+429 linhas, MockAudio + helpers de rejeição controlada).`
  - `CHANGELOG.md:45` (corrigido): `(+424/-5, MockAudio com helpers de rejeição controlada, 14 testes)` — contradição interna entre as duas menções do mesmo arquivo.
  - Arquivo real: 448 linhas, 14 `it()` — consistente com "12 novos + 2 pré-existentes = 14" (claim "12 novos" na linha 83 está correto).
- **Impacto:** O mesmo claim numérico falso que o CRITICAL mandou eliminar ainda consta da release, em contradição com a linha 45 do próprio documento.
- **Sugestão:** Alterar "+429 linhas" para "+424/-5" (ou "+424 linhas") na linha 83.

---

## Confirmados RESOLVIDOS (CRITICAL da rodada anterior)

1. **Contagem i18n "4 × 3 = 12 entries"** ✅
   - `CHANGELOG.md:49`: "Total adicionado: 4 chaves × 3 locales = 12 entries."
   - `AGENTS.md:156`: "4 chaves × 3 locales = 12 entries."
   - `AGENTS.md:250` (tabela): "4 novas chaves i18n (`canvasColorReprocess*`, `queueExport*`) × 3 locales = 12 entries."
   - Nenhuma ocorrência de "5 × 3 = 15" nos 3 arquivos.

2. **Deltas do `useVoicePreviews`** ✅ (parcial — ver CRITICAL acima)
   - `CHANGELOG.md:38`: `+119/-22 linhas vs versão v0.135.0` ✅ (não "+141")
   - `CHANGELOG.md:45`: `+424/-5` ✅ (não "+429")

3. **Tabela de versões com EXATAMENTE 5 entradas** ✅
   - `AGENTS.md:250-254`: `0.136.0`, `0.135.0`, `0.134.0`, `0.133.0`, `0.132.0` — 5 entradas, sem duplicatas, sem versões fantasma.

4. **AGENTS.md == CLAUDE.md byte-a-byte** ✅
   - SHA-256 idêntico (`C46A7403...0895`) para ambos.

5. **`package.json:13`**: `"version": "0.136.0"` — consistente com `AGENTS.md:241-242` (Current 0.136.0, Last release 2026-08-04) e `CHANGELOG.md:10` (0.136.0 - 2026-08-04).

---

## Verificações adicionais — todas limpas

- **Placeholders / TODO / reticências:** nenhum artefato de documento inacabado nos 3 arquivos. "TODOS" aparece apenas como pronome; `{from}`/`{to}` são placeholders de interpolação i18n legítimos. As reticências em `"A cor do canvas mudou de {from} para {to}..."` (CHANGELOG:20, AGENTS:154) são elipse editorial de citação truncada — aceitável.
- **Markdown bem formado:** linha 250 da tabela termina com pipe `|`; tabelas com separadores consistentes; lista numerada de 5 mecanismos (CHANGELOG:38-43) contínua; listas aninhadas da seção Speed Paint sem quebra.
- **pt-BR consistente:** sim (exceto nomes de arquivos/funções, como esperado).
- **"20 opções em 7 grupos":** presente apenas em contexto **histórico** — `CHANGELOG.md:211/215` e tabela `AGENTS.md:254` descrevem a v0.132.0 (factual para aquela release: 20 presets/7 grupos, confirmado no próprio changelog da v0.132.0), e `AGENTS.md:146` documenta a consolidação "7→2 grupos / 20→4 presets da v0.133.0". O estado atual está correto: `AGENTS.md:153` "4 opções em 2 grupos — `edge-detection` com 3 presets + `legacy` com 1".
- **"139 linhas" do `vetorialWorker`:** a única ocorrência é `CHANGELOG.md:171` na entrada **histórica** 0.133.0, e é factual — verificado via `git show cc34654` (commit da v0.133.0): o arquivo tinha 138 linhas + trailing newline (139 por `wc -l`). O estado atual (`AGENTS.md:159`) diz "123 linhas", que bate com as 123 linhas **não vazias** do arquivo real (142 totais). Sem ref obsoleta ao estado atual.
- **Claims de teste dos outros 3 arquivos novos — verificados e corretos:**
  - `easingConverter.unit.test.ts`: 67 linhas, 7 `it()` ↔ `CHANGELOG.md:18` "(67 linhas, 7 testes)" ✅
  - `CanvasColorAlert.component.test.tsx`: 210 linhas, 5 `it()` ↔ `CHANGELOG.md:20` "(210 linhas, 5 testes)" ✅
  - `imageProcessing.workerFallback.unit.test.ts`: 175 linhas ↔ `CHANGELOG.md:85` "(175 linhas)" ✅
  - Soma dos 4 arquivos: 67+210+315+175 = **767 linhas** — o texto atual "delta estimado +~1500 linhas entre novos e modificados" (CHANGELOG:107 / AGENTS:250) é defensável por incluir as modificações e usar "estimado" ✅
- **"14 testes" (CHANGELOG:45) vs "12 novos testes" (CHANGELOG:83):** consistentes — arquivo passou de 2 para 14 `it()` na release (12 novos), confirmado pela contagem real (14 `it()`).
- **Tabela de versões sem duplicatas** ✅.

---

## O que parece saudável

- Correções da rodada anterior aplicadas com precisão em 3 dos 4 pontos (i18n, deltas nas linhas 38/45, tabela de versões).
- AGENTS.md e CLAUDE.md perfeitamente sincronizados (hash idêntico).
- Claims numéricos dos 3 arquivos de teste novos e da tabela de versões verificados contra o código real.
- Seção Speed Paint do AGENTS.md descreve o estado atual com precisão (4 presets em 2 grupos, 123 linhas do worker, 4 chaves i18n).

---

## Limites da revisão

- Não foi possível verificar via git o numstat exato de `useVoicePreviews` no diff da v0.136.0 (a auditoria anterior registrou +119/-22 e +424/-5 como valores de referência; o arquivo real tem 174 linhas, compatível com a ordem de grandeza de +119/-22 sobre a v0.135.0, mas o diff exato não foi re-verificado nesta rodada).
- A contagem de testes usa `it(`/`test(` como critério (mesmo critério da rodada anterior); `it.each`/`test.each` contam como um único `it`/`test` na chamada.
- Verificação visual de formatação Markdown limitada a leitura estática; não há renderizador de Markdown no escopo.
