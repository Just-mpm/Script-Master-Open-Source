# Reauditoria do Estado Final — Documentação Release v0.136.0 (2ª rodada)

**Data:** 2026-08-04
**Escopo:** CHANGELOG.md (leitura integral, 926 linhas), AGENTS.md (leitura integral, 254 linhas), CLAUDE.md (leitura integral, 254 linhas), package.json (linha 13), + verificação cruzada com os arquivos de teste citados e greps de referências de versão.
**Método:** leitura completa dos arquivos documentais; grep de `it(`/`test(` nos arquivos de teste citados; grep de `0.135.1/2/3` e `0.133.1` em todo o repo; comparação integral AGENTS.md ↔ CLAUDE.md.
**Limitação do ambiente:** sem tool de shell — `Get-FileHash`, `git diff` e `git log` não puderam ser executados. A identidade byte-a-byte foi verificada por comparação integral de conteúdo (254 linhas cada, todos os matches de grep idênticos, truncagem da linha 250 no mesmo caractere em ambos), não por hash.

---

## 1. Contexto assumido

- A rodada anterior (gap-finder) emitiu 4 WARNING (GAP-01 a GAP-04) e o code-validator emitiu 4 CRITICAL, todos com instrução de correção no estado final.
- Refs a versões patch inexistentes no histórico (v0.135.1/2/3, v0.133.1) são permitidas em código de produção/testes e em docs de auditoria interna; devem estar neutralizadas apenas nos documentos de release (CHANGELOG.md, AGENTS.md, CLAUDE.md).
- Release atual: `0.136.0` (package.json:13 ✅).

## 2. Mapa rápido: sólido vs frágil

| Área | Estado |
|------|--------|
| package.json versão (`0.136.0`) | ✅ Sólido |
| Tabela de versões AGENTS.md (5 entradas) | ✅ Sólido |
| Contagem i18n (4 chaves × 3 = 12) | ✅ Sólido |
| Presets/grupos (4 opções em 2 grupos) | ✅ Sólido |
| Refs a versões inexistentes em docs de release | ✅ Neutralizadas |
| Delta "+~1500 linhas de teste" | ✅ Sólido |
| Deltas useVoicePreviews (+119, +424) | ⚠️ Parcial (linha 83 divergente) |
| Contagem de testes do safetyLimits no CHANGELOG | ❌ Frágil (ainda "15 testes") |
| AGENTS.md ↔ CLAUDE.md | ✅ Idênticos (comparação integral) |

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|----|-----------|------|-----------|-----------|-----------|------------------------|------------------|
| GAP-R2-01 | **CRITICAL** | Correção não aplicada | 95 | CHANGELOG.md:24 ainda afirma "(315 linhas, **15 testes**)" para `vectorizer.safetyLimits.unit.test.ts` — o arquivo real tem **17 testes** (`it()`). O CRITICAL da rodada anterior (`docs/audits/2026-08-04-release-docs-0.136.0-audit.md:38-46`, com sugestão explícita "Corrigir para '17 testes'") **não foi aplicado** neste local. | Grep independente: 17 `it(` no arquivo (linhas 120, 126, 133, 147, 161, 176, 197, 221, 237, 242, 247, 255, 263, 277, 285, 295, 303 — distribuídos 8/5/2/2, exatamente como o relatório anterior descreve). CHANGELOG.md:24 com "15 testes". AGENTS.md:250 não menciona contagem (grep `15 testes\|17 testes` não retorna a linha) — único local afetado é o CHANGELOG. | Verifiquei que não há segunda ocorrência da contagem em AGENTS.md/CLAUDE.md | Aplicar "17 testes" em CHANGELOG.md:24 |
| GAP-R2-02 | WARNING | Inconsistência interna | 85 | CHANGELOG.md:83 (seção Corrigido) diz "**12 novos testes** em `useVoicePreviews.unit.test.ts` (**+429 linhas**)" enquanto a linha 45 (seção Adicionado) diz "(**+424/-5**, MockAudio, **14 testes**)" — o arquivo real tem **14 testes**. As duas menções do mesmo arquivo na mesma entrada 0.136.0 divergem em contagem (12 vs 14) e delta (+429 vs +424). | Grep: 14 `it(` em `tests/hooks/useVoicePreviews.unit.test.ts` (linhas 128–420). CHANGELOG.md:45 vs :83. | A correção "+424" foi aplicada na linha 45 (instrução do code-validator), mas a linha 83 ficou com "+429" e "12" | Alinhar a linha 83 com "+424/-5" e "14 testes" (ou documentar por que "12 novos" ≠ 14) |
| GAP-R2-03 | SUGGESTION | Verificação pendente | 90 | Identidade byte-a-byte AGENTS.md ↔ CLAUDE.md não pôde ser confirmada por SHA-256 (`Get-FileHash` indisponível no ambiente). Comparação integral de conteúdo (254 linhas cada; greps com matches idênticos linha a linha; linha 250 truncada no mesmo caractere em ambos) indica arquivos idênticos. | Leitura completa dos 2 arquivos; 3 greps distintos retornando matches idênticos. | — | Rodar `Get-FileHash -Algorithm SHA256` nos 2 arquivos para fechamento formal |

## 4. Checklist da rodada anterior (status)

| Item | Status | Evidência |
|------|--------|-----------|
| GAP-01: "4 chaves × 3 locales = 12 entries" | ✅ RESOLVIDO | CHANGELOG.md:49; AGENTS.md:156 |
| GAP-02: "4 opções em 2 grupos" | ✅ RESOLVIDO | AGENTS.md:153 (`edge-detection` 3 + `legacy` 1) e :156. Menções "20 em 7" remanescentes são históricas (v0.132.0 — corretas para aquela versão) |
| GAP-03: refs v0.135.1/2/3 e v0.133.1 em docs de release | ✅ RESOLVIDO | Grep: zero ocorrências em CHANGELOG.md, AGENTS.md, CLAUDE.md (únicas refs de versão são reais: v0.135.0, v0.134.0...). Restantes apenas em `docs/audits`, `docs/scan` (relatórios de auditoria) e `src/`/`tests/` (código) — permitido |
| GAP-04: tabela com exatamente 5 entradas | ✅ RESOLVIDO | AGENTS.md:250-254: 0.136.0, 0.135.0, 0.134.0, 0.133.0, 0.132.0 |
| CRITICAL: "17 testes" no safetyLimits | ❌ **NÃO RESOLVIDO** | CHANGELOG.md:24 ainda "15 testes" (ver GAP-R2-01) |
| CRITICAL: "+~1500 linhas de teste" | ✅ RESOLVIDO | CHANGELOG.md:107 |
| CRITICAL: deltas "+119" e "+424" | ⚠️ PARCIAL | CHANGELOG.md:38 (+119/-22 ✅), :45 (+424/-5 ✅), :83 (+429/12 — divergente, ver GAP-R2-02) |
| CRITICAL: 5 entradas na tabela | ✅ RESOLVIDO | AGENTS.md:250-254 |
| package.json:13 `"version": "0.136.0"` | ✅ OK | package.json:13 |

## 5. Verificações adicionais (sem achado)

- CHANGELOG.md:18 "easingConverter 67 linhas, 7 testes" ✅ — arquivo real tem 67 linhas e 7 `it(` (leitura integral).
- CHANGELOG.md:20 "CanvasColorAlert 210 linhas, 5 testes" ✅ — arquivo real tem 5 `it(`.
- AGENTS.md:156 "4 chaves × 3 locales = 12 entries" ✅.
- AGENTS.md:153/156 "4 opções em 2 grupos" ✅.
- Estrutura de versões: CHANGELOG `## [0.136.0] - 2026-08-04` ↔ AGENTS.md "Last release: 2026-08-04" ↔ package.json 0.136.0 — consistentes.

## 6. Cenários de borda sem resposta

- Não foi possível executar `git diff 406cd5c..HEAD --stat` / `git log` (sem shell) — o tamanho do diff e a lista de commits da rodada de correção não foram verificados diretamente; a auditoria baseou-se no estado final dos arquivos.
- A interpretação "12 novos testes = 14 total − 2 pré-existentes" para CHANGELOG.md:83 não pôde ser validada sem o diff git (por isso WARNING, não CRITICAL).

## 7. Checklist de sanidade

- [x] Li os arquivos documentais completos (CHANGELOG 926 linhas, AGENTS 254, CLAUDE 254, package.json 99)
- [x] Verifiquei os arquivos de teste reais citados (safetyLimits: 17 testes; useVoicePreviews: 14; CanvasColorAlert: 5; easingConverter: 7)
- [x] Greps confirmaram ausência de refs a versões inexistentes nos docs de release
- [x] Confirmei que a tabela de versões tem 5 entradas
- [x] A contagem i18n e de presets está correta nos 3 pontos verificados
- [x] Nenhum usuário real é afetado — impacto é exclusivamente de precisão documental de release
