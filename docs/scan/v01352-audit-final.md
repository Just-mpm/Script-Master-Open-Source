# Auditoria de estado final — v0.135.2 (follow-ups F1–F14)

**Data:** 2026-08-04
**Escopo:** 17 arquivos de src lidos por completo + 5 arquivos de teste lidos por completo + verificação cruzada (grep) de símbolos/dependências.
**Nota de transparência:** os 3 arquivos de locale (pt-BR/en/es, ~2200 linhas cada) foram verificados nas seções modificadas (namespace `speedPaint`) e via grep das chaves novas — não lidos integralmente.

**Quality gate declarado (não re-executado nesta auditoria):** tsc exit 0, eslint 0 errors, 2649/2649 testes.

---

## 1. Contexto assumido

- A sessão aplicou F1–F14 sobre a base v0.135.1; a auditoria lê o estado final, não o diff.
- F2 (canvasColor), F3 (easing) e F4 (fitMode) são propagações de estado que atravessam a cadeia store → geração → cache → composições → render. Regressões nesses contratos aparecem como divergência preview/export ou controle morto.
- O `SpeedPaintPlayer` (preview) e as composições de export (`speedPaintRenderController`) são consumidores independentes da mesma store — a paridade entre eles é o critério de aceite de F2/F3.

## 2. Mapa rápido: sólido vs frágil

| Área | Estado |
|---|---|
| `useVoicePreviews` (F8) | Sólido — useCallback nos 3, token de sessão, cleanup de unmount |
| `vectorizer` (F9, F11, F12) | Sólido — sanitize null p/ length 0/NaN; regex `-?\d*\.?\d+`; doc-comments limpos |
| `strokeWorker` (F6) | Sólido — try/catch + revoke + `cause`; testes cobrem os 2 caminhos |
| `easingConverter` (F3) | Sólido — conversão correta; usado nas 3 compositions de export |
| `strokeCache` (F2) | Frágil — chave ignora canvasColor no modo `mask` (decisão documentada, mas com efeito colateral real, ver W2) |
| `WhiteboardScene` (F4, F7) | Sólido — fitMode contain default + preserveAspectRatio; useId no pencil-fx |
| `speedPaintRenderController` (F1, F13, F14) | Sólido — codec/container preservados em reset/preparing/validação; sem `void getState().renderMode`; edge cases → `failed` |
| `BatchOrchestrator` (F2) | Frágil — `canvasColor` no dep array sem reset de refs no cleanup (S1) |
| `SpeedPaintPage` + `SpeedPaintPlayer` | **Frágil** — W1 (easing não chega ao preview) e W2 (toggle de canvasColor sem efeito) |
| i18n (F5) | Sólido — chaves nos 3 locales; tooltip condicional por `hasMixedModes` |

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **W1** | WARNING | Fluxo incompleto (F3 parcial) | 97 | **Easing selecionado não chega ao preview do player** — `SpeedPaintPlayer` → `VetorialPlayer` monta `inputProps = { animation, showDrawTool, isLastScene }` sem `easing`; `WhiteboardComposition` aceita `easing?` mas fica `undefined` → preview sempre `smooth`. O export single (SpeedPaintExportPanel lê `storeEasing`) e o batch (SpeedPaintPage linha 360) usam o easing selecionado → **divergência preview vs vídeo exportado** (mesma classe de bug do W-B da rodada 6, que F3 deveria eliminar). O comentário em `SpeedPaintPage.tsx:636-641` e `pt-BR.ts:1472-1474` afirma que a troca é "REATIVA — a próxima renderização do player já consome o novo valor" — afirmação falsa no estado atual | `SpeedPaintPlayer.tsx:131-135` (inputProps sem easing); `WhiteboardComposition.tsx:60-73` (easing opcional); `SpeedPaintExportPanel.tsx:140-150` (export lê store) | Nenhuma — preview fixo em `Easing.inOut(Easing.ease)` (default de WhiteboardScene:279) | Propagar `useAnimationStore.getState().easing` (ou prop do job) no `VetorialPlayer` e corrigir o comentário, OU documentar que easing é export-only |
| **W2** | WARNING | Controle morto / estado stale (F2 parcial) | 95 | **Toggle de cor do canvas não tem efeito visível na animação atual** — `setCanvasColor` (SpeedPaintPage:1461/1484) só seta a store; nada dispara regeneração. O fundo renderizado vem de `animation.canvasColor` (SpeedPaintComposition:51, WhiteboardComposition:66, WhiteboardScene:416, controller:147/337), e o export single não passa override (SpeedPaintExportPanel:141-150). No modo **mask**, o cache ignora `canvasColor` na chave (strokeCache:218 — decisão documentada) → mesmo reprocessando via toggle de modo, o cache retorna a animação antiga (branca) → **cor nunca muda no mask**. No modo **vetorial**, só muda após reprocessar por preset/sortOrder (reprocessCurrentImage lê `currentCanvasColor` via getState). Efeito: o usuário clica no quadrado preto/branco e nada muda no preview nem no export do item atual | `animationStore.ts:211` (setCanvasColor puro); `SpeedPaintPage.tsx:488-495` (cache mask sem canvasColor); `strokeCache.ts:216-218`; `imageProcessing.ts:1086` (animation.canvasColor) | Em vetorial, batch record e próximo reprocess pegam a cor nova | O toggle deve (a) reprocessar a imagem atual, ou (b) sobrescrever `canvasColor` no render (padrão do fix F3), ou (c) incluir canvasColor na chave do cache mask e invalidar |
| S1 | SUGGESTION | Risco latente (regressão futura) | 88 | `BatchOrchestrator` adicionou `canvasColor` ao dep array do effect (linha 187) sem resetar `currentImageIdRef`/`processingIdRef` no cleanup. Se `canvasColor` mudar **durante** o processamento de um item, o cleanup aborta o job em voo, o catch ignora (`signal.aborted`), e o guard `currentImageIdRef.current !== currentImgId` bloqueia reprocessamento → job preso em `processing` para sempre. Hoje **não alcançável via UI** (os únicos callers de `setCanvasColor` estão na config, que só renderiza com `job.status === 'completed'`), mas qualquer futuro caller (ex: sync dual storage, atalho) dispara o bug | `BatchOrchestrator.tsx:179-187` (cleanup sem reset de refs); `BatchOrchestrator.tsx:78` (guard) | Guard de UI hoje impede o cenário | Resetar `currentImageIdRef`/`processingIdRef` no cleanup, ou remover `canvasColor` do dep array e ler via `getState()` (padrão usado para renderMode/preset) |
| S2 | SUGGESTION | Duplicação/filtro incorreto em edge case | 85 | O filtro de contraste roda 2× no pipeline vetorial: `vectorizeImageEdgeBezier` aplica internamente com `'white'` hardcoded (`vectorizer.ts:1059`), e o caller (main thread `imageProcessing.ts:794` / worker `vetorialWorker.ts:111`) aplica de novo com `canvasColor`. F2 não chegou à API `vectorizeImage` (sem opção `canvasColor`). Edge case real: imagem com traços claros sobre fundo branco + canvas preto → o filtro interno remove os traços claros (visíveis no canvas preto) antes do filtro externo correto rodar | `vectorizer.ts:1059`; `vetorialWorker.ts:98-111`; `imageProcessing.ts:775-794` | Caso dominante (fundo branco + traços escuros) se comporta bem | Passar `canvasColor` ao `vectorizeImage` (único filtro) ou remover o filtro interno |
| S3 | SUGGESTION | Memory leak (pré-existente, não-F) | 82 | `runSingleRender`/`runBatchRender` sobrescrevem `outputUrl` no estado `preparing` sem `URL.revokeObjectURL` da URL anterior (diferente de `cancelRender`/`reset`, que revogam). Exportar A → exportar B sem reset vaza a blob URL de A até reload | `speedPaintRenderController.tsx:699-713` e `969-983` (set sem revoke); contraste com `:502-504` e `:532-535` | ExportResultActions chama reset no fluxo feliz | Revogar `get().outputUrl` no início de runSingleRender/runBatchRender |
| S4 | SUGGESTION | Doc-comments stale (F11 fora do escopo) | 95 | Doc-comments do **vectorizer.ts** estão limpos (F11 ✓), mas a vizinhança do mesmo feature mantém contagens/valores inexistentes: `vetorialPresets.ts:2` ("20 valores…7 grupos"), `:19` (**`edge-sketch`** — preset que não existe; real: 3 edge + 1 legacy), `:60-63`/`:72-73` ("4 presets edge-*"), `:140` ("artistic1"); `pt-BR.ts:1461` e `SpeedPaintPage.tsx:1228` ("16 opções em 6 grupos" — real: 4 presets / 2 grupos) | `vetorialPresets.ts:2,19,60-63,72-73,140`; `pt-BR.ts:1461`; `SpeedPaintPage.tsx:1228`; `types/vetorial.ts:71-79` (4 valores) | — | Atualizar os comentários para 4 presets / 2 grupos e remover `edge-sketch` |
| S5 | SUGGESTION | F5 parcial | 80 | O "badge" de modos mistos é apenas o texto de um tooltip nativo (`title` no Button, QueueStaging:467-471) — sem badge visual; e `hasMixedModes` avalia só `renderMode` por item, não `vetorialPreset`/`vetorialSortOrder` por item (que também seriam forçados ao global na exportação) | `QueueStaging.tsx:254-256, 464-471`; `BatchOrchestrator.tsx:120-133` (preset/sort per-item existem) | Tooltip funciona em desktop; i18n nos 3 locales | Decidir se badge visual é necessário e se hasMixedModes deve incluir preset/sortOrder |

## 4. Contratos F1–F14 verificados como conformes

- **F1** ✓ — `reset` (controller:546-547), validação-falha single (673-674), `preparing` single (711-712), validação-falha batch (945-946, 1042-1043) e `preparing` batch (981-982) preservam `codec`/`container` via `get().codec`/`get().container`.
- **F4** ✓ — `fitMode="contain"` no wrapper vetorial do batch (controller:289) e no mask (controller:224); `WhiteboardScene` default `contain` com `preserveAspectRatio="xMidYMid meet"` (WhiteboardScene:469-475).
- **F5** ✓ (com S5) — chaves `queueExportUniformTooltip`/`queueExportMixedModeBadge` nos 3 locales; `hasMixedModes` correto para renderMode.
- **F6** ✓ — `createStrokeWorker` com try/catch + `URL.revokeObjectURL` + `cause` (strokeWorker:411-426); 2 testes novos.
- **F7** ✓ — `pencilFxId = \`pencil-fx-${useId()}\`` (WhiteboardScene:249); filtro e referência usam o ID (499, 660); teste com `filter[id^="pencil-fx-"]`.
- **F8** ✓ — `playPreview`/`stop`/`clearError` com `useCallback`.
- **F9** ✓ — `sanitizePathOrNull` retorna null p/ `length === 0`/não-finito (vectorizer:1123-1125); testes.
- **F10** ✓ — teste novo cobre fallback main-thread quando o construtor do Worker lança.
- **F11** ✓ no escopo — vectorizer.ts sem "20 valores"/"16 presets"/"edge-sketch"/"18 comandos" (ver S4 para arquivos vizinhos).
- **F12** ✓ — `PATH_POINT_REGEX = /[ML]\s*(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g` (vectorizer:317).
- **F13** ✓ — nenhum `void useAnimationStore.getState().renderMode` em todo o src; controller discrimina por `'paths' in animation` (controller:654).
- **F14** ✓ — validações do controller setam `status: 'failed'` com mensagem (663-677, 936-949, 1033-1046); `BatchOrchestrator` catch → `failed` + auto-skip (161-175); Promise do `generateStrokesFromImage` sempre settle (try/catch global no onload).

## 5. Cenários de borda sem resposta

1. **Cache mask + troca de cor repetida:** com W2 corrigido via cache (opção c), a chave mask passaria a discriminar canvasColor — o cache LRU de 50 entradas passaria a aceitar 2× entradas por imagem (branca + preta). Verificar pressão de eviction.
2. **`durationInFrames - 1` = 0** em `WhiteboardScene:274` (interpolate com range [0,0]) — inalcançável com as durações atuais (≥1s × 30fps), mas sem guarda explícita.
3. **`worker.onerror` pós-resolve no mask** (imageProcessing:549-565): o handler não checa `settled` — se o error event chegar após `resolveOnce`, `processOnMainThread` roda trabalho pesado em vão (resolve/no-op). Terminate imediato após resolve torna o caso improvável, mas não garantido.
4. **`hasMixedModes` falso com presets por item divergentes** (S5): o tooltip não avisa sobre uniformização de preset/sortOrder por item.

## 6. Checklist de sanidade

- [x] Li os arquivos-alvo por completo (17/17; locales: seções modificadas + grep de chaves).
- [x] Verifiquei handling no parent (Suspense/ErrorBoundary) antes de descartar achados de loading/empty.
- [x] Usei grep para confirmar ausência/presença de símbolos (setCanvasColor callers, easing no player, createStrokeWorker callers, `void getState().renderMode`, chaves i18n).
- [x] Confirmei impacto em usuário REAL em W1/W2 (controles visíveis na página, sem workaround).
- [x] Descartados: stuck do BatchOrchestrator como WARNING (inalcançável via UI hoje → S1), leak de blob URL (pré-existente → S3), duplo filtro de contraste (comportamento correto no caso dominante → S2).
- [x] Nenhum achado classificado como CRITICAL.

**Resumo:** 0 CRITICAL · 2 WARNING · 5 SUGGESTION. W1 e W2 são os bloqueadores leves: ambos são completude de contrato (F3/F2) — o encanamento existe, mas o consumidor final (preview player / toggle de cor) não recebe o valor, gerando divergência preview/export e controle sem efeito.
