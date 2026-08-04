# Auditoria Documental — Release 0.136.0 (Release Engineering)

**Data:** 2026-08-04
**Escopo:** CHANGELOG.md, AGENTS.md, CLAUDE.md, package.json vs estado final do código (release 0.135.0 → 0.136.0, commit `406cd5c`).
**Método:** leitura completa dos 4 arquivos documentais + verificação dos arquivos de código adjacentes (easingConverter, vectorizer, strokeCache, strokeWorker, WhiteboardScene, controller, BatchOrchestrator, QueueStaging, SpeedPaintPage, useVoicePreviews, useSpeedPaintExporter, bezierFitting, vetorialWorker, locales i18n, testes novos).

## 1. Contexto assumido

- Último release documentado antes de 0.136.0: 0.135.0 (2026-07-28).
- Arquivos novos: `easingConverter.ts` + 4 arquivos de teste (`vectorizer.safetyLimits.unit.test.ts`, `imageProcessing.workerFallback.unit.test.ts`, `CanvasColorAlert.component.test.tsx`, `easingConverter.unit.test.ts`).
- Sem acesso a `git diff --stat` nesta sessão; lista de arquivos modificados fornecida pelo orquestrador, validada por leitura direta do estado final.

## 2. Mapa rápido: sólido vs frágil

**Sólido (verificado contra código):**
- Versão consistente: CHANGELOG `0.136.0` (L10), AGENTS.md `0.136.0` (L241), CLAUDE.md `0.136.0` (L241), package.json `0.136.0` (L13). Data 2026-08-04 consistente.
- AGENTS.md e CLAUDE.md byte-a-byte idênticos (256 linhas cada, leitura completa lado a lado).
- SemVer MINOR correto: mudanças majoritariamente compatíveis (props opcionais, módulo novo, correções) + capacidades opt-in novas → 0.136.0 ✓.
- `easingConverter.ts` existe com 79 linhas, exporta `getRemotionEasing` ✓; teste com 67 linhas e 7 testes ✓.
- Testes novos: 315 / 175 / 210 / 67 linhas ✓ (batem com CHANGELOG).
- Alert UX de `canvasColor` em SpeedPaintPage.tsx (L1524-1545) com placeholders `{from}`/`{to}` e ação "Reprocessar" ✓.
- Tooltip de batch em QueueStaging.tsx (L254, 467-470) com `hasMixedModes` ✓.
- `fitMode?: FitMode` ('contain'|'cover'|'fill'|'none', default 'contain') + `pencilFxId` via `useId` em WhiteboardScene.tsx ✓.
- `contourIndex` em BezierPath (bezierFitting.ts L89/593) + `sampleColors` com `path.contourIndex ?? i` (vectorizer.ts L862) ✓.
- `applyVetorialSafetyLimits`/`sanitizePathOrNull`/`MAX_PATHS_PER_SCENE=500`/`MAX_D_BYTES_PER_SCENE=250_000`/`SVG_PATH_DATA_REGEX`/namespace `__testing` em vectorizer.ts ✓.
- `matchAll` em `getMinY`/`distFromCenter` (vectorizer.ts L343-368) ✓.
- Cache LRU: `MAX_CACHE_SIZE = 50`, chave com `mode + preset + sortOrder + canvasColor` (strokeCache.ts L69, L88, L302) ✓.
- `reset()` preserva `codec`/`container` (controller L526-547) ✓; falhas de validação setam `status: 'failed'` (L663-668, 936-941) ✓.
- `strokeWorker` try/catch no construtor com `cause` (L412-421) + timeout NÃO chama `terminateStrokeWorker` (L447-476) ✓.
- `imageProcessing` try/catch no `onload` (L387-574) + fallback main-thread em `processVetorialInWorker` (L656-665) ✓.
- `useVoicePreviews`: sessionToken/isStale, cleanup unmount, `code === 4 && src === ''`, `setErrorId(null)`, `clearError` ✓; teste com 448 linhas e 12+ testes ✓.
- `easing`/`canvasColor` em `SpeedPaintExportOptions`/`SpeedPaintBatchExportOptions` (useSpeedPaintExporter L82/92/130/135) ✓.
- Tipos reais: `VetorialPathSortOrder` = `'top-down'|'center-out'|'big-first'|'random'` (vetorial.ts L50) — AGENTS.md L149 diz `random` ✓; `EdgePresetName` = 3 valores ✓; `VetorialPreset` = 4 valores ✓.

**Frágil (inconsistências documentais):**
- Contagem de chaves i18n errada (5 vs 4).
- Números de presets desatualizados (20/7 vs 4/2).
- Referências a versões patch que não existem no histórico (0.135.1/0.135.2/0.135.3/0.133.1).
- Tabela "Últimas mudanças" viola a regra de 5 entradas do próprio arquivo (7 linhas).

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| GAP-01 | WARNING | Inconsistência numérica (invenção) | 95 | CHANGELOG.md:47 e AGENTS.md:250 afirmam **"5 novas chaves i18n"** e **"5 × 3 locales = 15 entries"**, mas existem apenas **4 chaves** novas (`canvasColorReprocessHint`, `canvasColorReprocessAction`, `queueExportUniformTooltip`, `queueExportMixedModeBadge`) — 12 entries reais | grep nos 3 locales: 12 matches = 4 chaves × 3 locales; CHANGELOG.md L47 lista exatamente as 4 chaves e ainda soma "5"; AGENTS.md L250 idem | — | Corrigir contagem para 4 chaves / 12 entries em ambos os arquivos |
| GAP-02 | WARNING | Documentação desatualizada (invenção de estado inexistente) | 95 | AGENTS.md:153 diz seletor de preset com **"20 opções em 7 grupos"** e AGENTS.md:156 diz **"presetGroups (7 grupos), presets (20 labels)"** — o estado final real tem **2 grupos / 4 presets** (`edge-detection` + `legacy`) | `vetorialPresets.ts` L54-57 (`VETORIAL_PRESETS_GROUPED` = 2 grupos, 4 presets); locales pt-BR L1482-1491 (2 grupos, 4 labels); consumo pelo SpeedPaintPage documentado no próprio arquivo | A entrada histórica 0.132.0 do CHANGELOG (20/7) explica a origem do número | Atualizar L153 e L156 para 2 grupos / 4 presets (afeta CLAUDE.md idêntico) |
| GAP-03 | WARNING | Referências a versões inexistentes | 80 | CHANGELOG.md 0.136.0 referencia **v0.135.1** (L41, L53, L69, L81), **v0.135.2** (L18) e AGENTS.md referencia **v0.135.1** (L131) e **v0.133.1** (L146-147) — nenhuma existe no histórico documentado (0.135.0 → 0.136.0) | Histórico do CHANGELOG: 0.133.0, 0.134.0, 0.135.0, 0.136.0; tabela AGENTS.md: 0.130.3–0.136.0 sem patches | Comentários de código usam a mesma convenção interna (v0.135.2 etc.) — padrão do projeto | Decidir se versões patch de auditoria interna entram no histórico ou se as referências devem ser neutralizadas na doc pública |
| GAP-04 | WARNING | Regra do próprio arquivo violada | 85 | AGENTS.md:246 declara **"manter apenas as 5 versões mais recentes"**, mas a tabela tem **7 entradas** (0.136.0 a 0.130.3) — 0.131.0 e 0.130.3 deveriam ter sido removidas ao adicionar 0.136.0 | AGENTS.md L250-256: 7 linhas de versão; contexto do orquestrador dizia "5 entradas mantidas" | Regra existente desde versões anteriores (já violada na 0.135.0 com 6 entradas) | Remover 0.131.0 e 0.130.3 da tabela ou revisar a regra |
| GAP-05 | SUGGESTION | Contagem interna inconsistente | 90 | AGENTS.md:131 diz **"3 mecanismos de proteção"** mas lista **4 bullets** (L132-135); CHANGELOG.md L38-43 lista **5 itens** — mesma feature com 3 contagens diferentes | Leitura direta das duas seções | — | Uniformizar a contagem (sugestão: "4 mecanismos" ou agrupar bullets 4-5) |
| GAP-06 | SUGGESTION | Estimativa de linhas de teste divergente | 85 | CHANGELOG.md:105 afirma **"+~1100 linhas de testes novos em 4 arquivos"** — os 4 arquivos novos somam **767 linhas** (315+175+210+67); ~1100 só fecha se incluir o 5º arquivo (useVoicePreviews +429 = 1196), contradizendo "4 arquivos" | Leitura dos 4 arquivos de teste novos (totais: 315/175/210/67) | Uso de "~" e "estimado" na frase | Ajustar para "~770 linhas em 4 arquivos" ou listar explicitamente os 5 arquivos |
| GAP-07 | SUGGESTION | Número de linhas desatualizado | 90 | AGENTS.md:159 cita **`vetorialWorker.ts` (139 linhas)** — arquivo real tem **142 linhas** no estado final | vetorialWorker.ts termina na L142; CHANGELOG 0.133.0 L169 também cita 139 (histórico correto para a época) | — | Atualizar para 142 ou remover a contagem |
| GAP-08 | SUGGESTION | Histórico divergente do estado final | 70 | CHANGELOG 0.132.0 (L207, L210, L214) documenta a 4ª estratégia de sort como **`natural`** ("ordem de tracing"), mas o tipo atual é **`random`** (vetorial.ts:50, "shuffle com seed determinístico") — AGENTS.md atual (L149) já diz `random` ✓. Se a renomeação ocorreu na 0.136.0 (vectorizer.ts foi modificado), o changelog da release a omite | vetorial.ts L48-50; vectorizer.ts L419 (`case 'random'`); AGENTS.md L149 | Renomeação pode ter ocorrido em release intermediária não verificável sem diff | Confirmar via git quando a renomeação `natural`→`random` ocorreu e documentar se foi na 0.136.0 |
| GAP-09 | SUGGESTION | Omissão menor | 75 | SpeedPaintPlayer.tsx agora propaga `easing` do store para o **preview** (L274-291, "W1 da auditoria") — o CHANGELOG 0.136.0 documenta a propagação de easing apenas na cadeia de **export** (L34), não no preview; o AGENTS.md também não cobre W1 | SpeedPaintPlayer.tsx L279-291; CHANGELOG L34 | Impacto baixo: comportamento visível (preview segue o seletor) já é o esperado | Opcional: adicionar 1 linha sobre propagação no preview |

## 4. Cenários de borda sem resposta

- Não foi possível rodar `git diff --stat` nesta sessão (sem shell) — a cobertura "entradas do CHANGELOG vs diff real" foi validada contra a lista de arquivos do orquestrador + leitura do estado final; se algum arquivo fora da lista tiver sido alterado (ex: `docs/plan/*`), pode haver omissão não detectada.
- A renomeação `natural` → `random` (GAP-08) não pôde ser datada sem o diff.

## 5. Checklist de sanidade

- [x] CHANGELOG.md lido por completo (L1-334+)
- [x] AGENTS.md lido por completo (256 linhas)
- [x] CLAUDE.md lido por completo (256 linhas) — idêntico ao AGENTS.md
- [x] package.json lido (L13: `"version": "0.136.0"`)
- [x] Versão consistente nos 4 arquivos (0.136.0) — sem CRITICAL
- [x] Triple-file: AGENTS.md == CLAUDE.md — sem CRITICAL
- [x] SemVer MINOR justificado (novas capacidades opt-in + retrocompatibilidade)
- [x] Símbolos documentados verificados no estado final (getRemotionEasing, applyVetorialSafetyLimits, fitMode, pencilFxId, contourIndex, s.job.status, reset codec, W5, F6, F14)
- [x] Chaves i18n contadas nos 3 locales (4, não 5)
- [x] Presets contados no código e locales (2 grupos / 4 presets, não 20/7)

**Veredito:** sem achados CRITICAL. 4 WARNING + 5 SUGGESTION. A release 0.136.0 pode prosseguir após correções editoriais de contagem (GAP-01, GAP-02) e decisão sobre referências a versões patch internas (GAP-03).
