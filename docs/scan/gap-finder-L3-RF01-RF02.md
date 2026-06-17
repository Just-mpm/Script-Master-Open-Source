# Relatório Gap-Finder — Leiva L3 (RF-01 + RF-02)

**Data:** 2026-06-15
**Escopo:** Tooltips individuais (RF-01) + Reprocessamento ao trocar modo (RF-02) — UI SpeedPaintPage parte A
**Arquivos alvo:** `src/pages/SpeedPaintPage.tsx`, `src/features/i18n/locales/{pt-BR,en,es}.ts`
**Módulos:** M4 (UI SpeedPaintPage) + M8 (i18n & Acessibilidade)

---

## 1. Contexto assumido

A L3 faz parte da **Fase 1 — P0** (bugs que bloqueiam a experiência) do plano de consolidação do Modo "Desenho" (Vetorial) do Speed Paint. Responsável por:

- **RF-01:** Tooltips individuais (Clássico ≠ Desenho) com `describeChild` e i18n dedicado
- **RF-02:** Reprocessamento ao trocar modo com `AbortController` + `processingIdRef` (race protection)

O tracker define 4 tarefas para L3:
1. `worker` — Reescrever `handleRenderModeChange` com `processingIdRef` + `AbortController` + cache lookup + reprocessamento
2. `ui-designer` — Tooltips individuais + `describeChild` + `aria-live` + Snackbar de erro com `role="alert"` + loading state com `aria-label`
3. `worker` (i18n) — Adicionar chaves: `modeClassicTooltip`, `modeVetorialTooltip`, mensagens de erro, `processingLabel`
4. `test` — Testes do `handleRenderModeChange`

---

## 2. Mapa rápido: sólido vs frágil

### Sólido ✅

| Item | Status | Evidência |
|------|--------|-----------|
| `handleRenderModeChange` reescrita | ✅ Completo | `SpeedPaintPage.tsx:322-390` — `AbortController` + `processingIdRef` + cache lookup + reprocessamento + race protection |
| `describeChild` nos Tooltips | ✅ Completo | `SpeedPaintPage.tsx:937, 950` |
| `aria-label` no `CircularProgress` | ✅ Completo | `SpeedPaintPage.tsx:520` — `aria-label={t('speedPaint.processingLabel')}` |
| `aria-live="polite"` no painel de processamento | ✅ Completo | `SpeedPaintPage.tsx:534-535` — `role="status"` + `aria-live="polite"` (já existia antes da L3, mas está presente) |
| `modeClassicTooltip` nos 3 locales | ✅ Completo | `pt-BR:1431`, `en:1414`, `es:1414` — traduções reais, sem string vazia |
| `modeVetorialTooltip` nos 3 locales | ✅ Completo | `pt-BR:1432`, `en:1415`, `es:1415` — traduções reais |
| `processingLabel` nos 3 locales | ✅ Completo | `pt-BR:1435`, `en:1418`, `es:1418` |
| Tooltip Clássico sem termos proibidos (CT-F02) | ✅ OK | Nenhum contém "vetorial", "SVG", "whiteboard" ou "path" |
| Tooltip Desenho sem termos proibidos (CT-F03) | ✅ OK | Nenhum contém "máscara", "raster", "raspadinha" ou "stroke" |
| `aria-describedby` no `ToggleButtonGroup` | ✅ Completo | `SpeedPaintPage.tsx:900` — aponta para `#speed-paint-mode-description` |
| Cache hit/lookup implementado | ✅ Completo | `SpeedPaintPage.tsx:351-358` — branches discriminadas por literal |
| Lazy import do `generateStrokesFromImage` | ✅ Completo | `SpeedPaintPage.tsx:361` |

### Frágil ⚠️

| Item | Status | Evidência |
|------|--------|-----------|
| `modeProcessingError` usado em UI | ❌ **Nunca usado** | Chave existe nos 3 locales mas `supergrep_find` não encontra `t('speedPaint.modeProcessingError')` em nenhum componente |
| `modeProcessingRetry` usado em UI | ❌ **Nunca usado** | Chave existe nos 3 locales mas `supergrep_find` não encontra `t('speedPaint.modeProcessingRetry')` em nenhum componente |
| Snackbar de erro com `role="alert"` | ❌ **Ausente** | Não há `Snackbar` nem `role="alert"` em `SpeedPaintPage.tsx` |
| Feedback visual de `job.status === 'failed'` | ❌ **Invisível** | `SpeedPaintPage.tsx:384` seta `{ status: 'failed' }` mas não há UI que consuma esse estado — erro fica oculto |

---

## 3. Gaps priorizados

### GAP-L3-01 — MÉDIO — Fluxo incompleto: erro de reprocessamento sem UI

| Campo | Valor |
|-------|-------|
| **ID** | GAP-L3-01 |
| **Severidade** | MÉDIO (rebaixado de ALTO por confidence 85 — ver abaixo) |
| **Tipo** | Fluxo incompleto / Estado ausente |
| **Confidence** | 95 |
| **Descrição** | `modeProcessingError` e `modeProcessingRetry` foram adicionados aos 3 locales de i18n (pt-BR, en, es) mas NUNCA são referenciados por nenhum `t()` no código. Quando `handleRenderModeChange` falha (catch na linha 380), ele seta `job.status = 'failed'` (linha 384) sem exibir qualquer feedback visual ao usuário. |
| **Evidência** | `supergrep_find "modeProcessingError|modeProcessingRetry" path=src/` → 0 matches em arquivos .ts/.tsx. O único match é nas definições dos arquivos de locale. Leitura direta de `SpeedPaintPage.tsx` confirma que não há `t('speedPaint.modeProcessingError')` ou `t('speedPaint.modeProcessingRetry')` em nenhum lugar. |
| **Mitigações verificadas** | `SpeedPaintPlayer` aceita `jobStatus: 'failed'` no tipo (linha 63) mas não renderiza nada para esse estado. Não há `Alert`/`Snackbar`/`toast` para o erro de reprocessamento. O `BatchOrchestrator` tem seu próprio handling de `'failed'` (linha 148) mas é para batch, não para troca de modo. |
| **Impacto no usuário** | O usuário troca o modo de renderização, o processamento falha, e ele não recebe NENHUM feedback. A imagem simplesmente não aparece. Não há botão de retry. Não há mensagem de erro. A única indicação é o `log.error` no console do desenvolvedor. |
| **Pergunta/Decisão** | Onde deve aparecer o erro? A task #2 do ui-designer no tracker especifica "Snackbar de erro com `role='alert'`". As chaves `modeProcessingError` e `modeProcessingRetry` foram criadas para isso. É necessário adicionar um `Alert` ou `Snackbar` no `catch` do `handleRenderModeChange`. |

### GAP-L3-02 — BAIXO — Acessibilidade: ausência de `role="alert"` em Snackbar de erro

| Campo | Valor |
|-------|-------|
| **ID** | GAP-L3-02 |
| **Severidade** | BAIXO |
| **Tipo** | Estado ausente (acessibilidade) |
| **Confidence** | 90 |
| **Descrição** | O tracker (tarefa #2 do `ui-designer`) especifica: "Snackbar de erro com `role='alert'`". Não foi encontrado nenhum `Snackbar` nem `role="alert"` em `SpeedPaintPage.tsx`. A diretriz WCAG 2.1 AA exige que erros inesperados sejam anunciados para leitores de tela via `role="alert"` ou `aria-live="assertive"`. |
| **Evidência** | `supergrep_find 'role="alert"' path=src/` → 0 matches. Leitura de `SpeedPaintPage.tsx` → sem `Snackbar`, sem `Alert` com `role="alert"`. |
| **Mitigações verificadas** | Existe `role="status"` com `aria-live="polite"` no painel de processamento (linhas 534-535) — mas isso é para progresso, não para erro. Erros de batch export têm `Alert` (linha 682) mas sem `role="alert"`. |
| **Impacto no usuário** | Usuários de leitores de tela não são notificados quando um reprocessamento falha. A falha fica invisível tanto visual quanto auditivamente. |

### GAP-L3-03 — BAIXO — Decisão pendente: fluxo de retry após erro de reprocessamento

| Campo | Valor |
|-------|-------|
| **ID** | GAP-L3-03 |
| **Severidade** | BAIXO |
| **Tipo** | Decisão pendente |
| **Confidence** | 80 |
| **Descrição** | A chave `modeProcessingRetry` ("Tentar novamente") foi criada mas não há implementação de retry. Quando o reprocessamento falha, o estado `job.status` fica como `'failed'` sem transição possível. O usuário não tem como "tentar novamente" sem recarregar a página ou fazer upload da imagem novamente. |
| **Evidência** | Não há botão ou ação que consuma `modeProcessingRetry`. O `catch` só loga o erro e seta o status. |
| **Mitigações verificadas** | O `BatchOrchestrator` tem retry próprio (linhas 297-301) mas é específico para exportação em lote, não para troca de modo. |
| **Impacto no usuário** | Usuário não tem ação corretiva após falha na troca de modo. |

---

## 4. Validação de Tooltips (CT-F02/CT-F03)

### CT-F02 — Tooltip do Clássico NÃO pode conter termos vetoriais

| Locale | Texto | "vetorial" | "SVG" | "whiteboard" | "path" | Status |
|--------|-------|:-----------:|:-----:|:------------:|:------:|:------:|
| **pt-BR** | `Revelação por máscara — rápida e ideal para fotos.` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **en** | `Mask reveal — fast and ideal for photos.` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **es** | `Revelado por máscara — rápido e ideal para fotos.` | ❌ | ❌ | ❌ | ❌ | ✅ |

### CT-F03 — Tooltip do Desenho NÃO pode conter termos de máscara

| Locale | Texto | "máscara" | "raster" | "raspadinha" | "stroke" | Status |
|--------|-------|:---------:|:--------:|:------------:|:--------:|:------:|
| **pt-BR** | `Animação vetorial com paths SVG — mais expressivo, ideal para ilustrações e line art.` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **en** | `Vector animation with SVG paths — more expressive, ideal for illustrations and line art.` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **es** | `Animación vectorial con paths SVG — más expresivo, ideal para ilustraciones y line art.` | ❌ | ❌ | ❌ | ❌ | ✅ |

> **Nota:** O termo "paths" e "SVG" no tooltip do Desenho são intencionais e permitidos por CT-F03 — a restrição é apenas para "máscara", "raster", "raspadinha" e "stroke". Ambos os tooltips estão **em conformidade**.

---

## 5. Cenários de borda sem resposta

| Cenário | Ocorre? | Comportamento atual | Risco |
|---------|---------|-------------------|-------|
| Trocar modo durante processamento | ✅ Tratado | `if (job.status === 'processing') return;` (linha 334) — aborta anterior e inicia novo | Baixo |
| Trocar modo durante exportação | ⚠️ Não tratado | Exportação não é abortada pela troca de modo | Baixo (modo é independente da exportação) |
| Erro de rede no cache miss | ✅ Tratado | `catch` seta `status: 'failed'` | **MÉDIO** — sem UI de erro |
| Duas trocas rápidas de modo | ✅ Tratado | `processingIdRef` invalida callbacks antigos | Baixo |
| Cache hit após abort | ✅ Tratado | `processingIdRef.current !== processId` aborta aplicação | Baixo |
| `AbortController.signal.aborted` durante fetch | ✅ Tratado | `if (ac.signal.aborted) return;` (linha 381) | Baixo |

---

## 6. Checklist de sanidade

- [x] Li o arquivo SpeedPaintPage.tsx **COMPLETO** (1027 linhas)
- [x] Li os 3 arquivos de locale (pt-BR, en, es) para as chaves L3
- [x] Usei `supergrep_find` e `grep` para confirmar ausência/presença de símbolos
- [x] Verifiquei o `SpeedPaintPlayer.tsx` completo (293 linhas)
- [x] Confirmei que não há `Snackbar` com `role="alert"` em nenhum lugar da página
- [x] Confirmei que `modeProcessingError` e `modeProcessingRetry` têm 0 referências em componentes
- [x] Verifiquei tooltips contra CT-F02 e CT-F03 — ambos conformes
- [x] Confirmei que `aria-label` no `CircularProgress` está presente
- [x] Confirmei que `aria-live="polite"` no painel de processamento está presente
- [x] Verifiquei que `describeChild` está presente nos Tooltips

---

## 7. Veredicto

**PARCIALMENTE ALINHADO**

| Componente | Status |
|-----------|--------|
| RF-01 (Tooltips individuais) | ✅ **Completo** |
| RF-02 (Reprocessamento) | ✅ **Completo** |
| i18n (5+ chaves) | ⚠️ **Parcial** — chaves de erro adicionadas mas **não conectadas** |
| Snackbar de erro com `role="alert"` | ❌ **Ausente** |
| Feedback visual de falha | ❌ **Ausente** |

### Resumo dos gaps

| ID | Severidade | Descrição |
|----|-----------|-----------|
| GAP-L3-01 | **MÉDIO** | `modeProcessingError`/`modeProcessingRetry` definidos no i18n mas NUNCA usados. Erro de reprocessamento não tem UI. |
| GAP-L3-02 | **BAIXO** | Snackbar de erro com `role="alert"` não implementado (WCAG 2.1 AA). |
| GAP-L3-03 | **BAIXO** | Sem fluxo de retry após falha no reprocessamento (chave `modeProcessingRetry` não conectada). |

### Recomendação

Corrigir GAP-L3-01 como prioridade (MÉDIO) — conectar `modeProcessingError` e `modeProcessingRetry` a um `Alert` com `role="alert"` no `catch` do `handleRenderModeChange`. Isso resolve simultaneamente GAP-L3-02 e GAP-L3-03.

**Estimativa de correção:** ~15-30 min (adição de bloco condicional no JSX + import `Alert`).
