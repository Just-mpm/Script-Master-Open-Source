# Auditoria de estado final — `useVoicePreviews` + limites de complexidade SVG (Speed Paint)

- **Data:** 2026-08-04
- **Escopo:** 9 arquivos lidos por completo (7 de código + 2 de teste), mais adjacentes necessários (`vetorialWorker.ts`, `strokeCache.ts`, `vetorialPresets.ts`, `animationStore.ts`, `speedPaintTimings.ts`, `useCodecSupport.ts`, `SpeedPaintExportPanel.tsx`, `types/renderController.ts`, `types/vetorial.ts`, greps em `ExportCrossRouteToast`/`BatchOrchestrator`/`WhiteboardScene`).
- **Validações já executadas:** `tsc -b` exit 0 · ESLint 0 erros · Vitest 2645/2645.
- **Notebooks consultados:** Remotion Docs (contrato `renderMediaOnWeb`), React Docs (padrão de ciclo de vida de `HTMLAudioElement` em hook).

---

## 1. Escopo da revisão

| Arquivo | Linhas | Foco |
|---|---|---|
| `src/hooks/useVoicePreviews.ts` | 174 | Contrato de codes 0/1/2/3/4, cleanup, token de sessão |
| `src/features/speed-paint/lib/vectorizer.ts` | 1317 | Regex `[ \t\r\n]`, sanitização, limites 500 paths / 250KB |
| `src/features/speed-paint/lib/bezierFitting.ts` | 601 | RDP + Schneider, validação `getLength` |
| `src/features/speed-paint/lib/imageProcessing.ts` | 1065 | try/catch no worker e no `img.onload`, fallbacks |
| `src/features/speed-paint/store/speedPaintRenderController.tsx` | 1107 | Single por dado, batch propagando mode/preset/sortOrder |
| `src/pages/SpeedPaintPage.tsx` | 1487 | `startBatchRender` propagando estado da store |
| `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` | 337 | Fachada fina, sync de codec |
| `tests/hooks/useVoicePreviews.unit.test.ts` | 439 | Cobertura dos 5 codes + unmount + stale |
| `tests/speed-paint/vectorizer.safetyLimits.unit.test.ts` | 307 | Limites de segurança |

---

## 2. Veredito

**Ajustes recomendados** — 1 WARNING (fallback de codec VP8/WebM inócuo no speed paint) e 6 SUGGESTIONs. Nenhum CRITICAL. Os dois objetivos do escopo (falso positivo do hook; proteção de complexidade SVG) estão implementados corretamente e cobertos por testes. Os contratos de propagação (single por dado, batch com mode/preset/sortOrder) estão corretos.

---

## 3. Achados priorizados

### CRITICAL

Nenhum.

---

### WARNING

#### [WARNING] `set({...INITIAL_STATE})` no início de cada render zera `codec`/`container` para `'h264'/'mp4'` — o fallback VP8/WebM do `useCodecSupport` é inócuo

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:646-658` (single), `892-904` (batch), `416-417` (INITIAL_STATE), leitura em `738` e `1029`
- **Confidence:** 92/100
- **Categoria:** Bug
- **Problema:** `INITIAL_STATE` contém `codec: 'h264', container: 'mp4'` e é espalhado (`...INITIAL_STATE`) no `set` de início de `runSingleRender` e `runBatchRender` — **depois** de o hook fachada sincronizar o codec resolvido via `setCodecContainer`. O `get().codec` lido logo depois (linha 738/1029) é **sempre** `'h264'`, independente do suporte real do navegador.
- **Evidência:**
  ```ts
  // INITIAL_STATE (416-417)
  codec: 'h264',
  container: 'mp4',
  // runSingleRender (646)
  set({ ...INITIAL_STATE, kind: 'speed-paint', status: 'preparing', ... });
  // leitura do codec (738) — sempre 'h264'
  const codec = get().codec as 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1';
  ```
  O único caminho que re-sincroniza (`useSpeedPaintExporter.tsx:215-220`) depende de `codecSupport.resolvedVideoCodec` mudar — o que não acontece durante um `startRender`. O `reset()` (linha 508) também zera para `'h264'` e agrava: após concluir um export em VP8, um segundo export volta a tentar H.264 sem novo `checkSupport`.
- **Impacto:** Em navegadores sem H.264 no WebCodecs (Firefox Linux sem codecs proprietários, builds específicos), o speed paint export falha com erro de codec mesmo tendo o fallback VP8/WebM funcional — o fallback existe no código (e no `useCodecSupport`) mas nunca é usado. No Chrome/Edge/Safari (H.264 ok) funciona por coincidência do codec default.
- **Sugestão:** Não sobrescrever `codec`/`container` no reset de início de render: `set({ ...INITIAL_STATE, codec: get().codec, container: get().container, ... })` ou separar `codec`/`container` do `INITIAL_STATE` (eles são estado "resolvido", não "resetável"). Vale auditar se `videoRenderController` (M1) tem o mesmo padrão.

---

### SUGGESTION

#### [SUGGESTION] Teste "code 4 com src vazio" é tautológico — o ramo defensivo do hook nunca é exercitado

- **Arquivo:** `tests/hooks/useVoicePreviews.unit.test.ts:166-192`
- **Confidence:** 95/100
- **Categoria:** Testes
- **Problema:** O teste re-registra `audio.onerror = (): void => {}` (handler noop) após o `stop()` — que já zerou o listener do hook. O `triggerError(4)` dispara o noop, e o ramo real `code === 4 && audio.src === ''` do `reportLoadError` (`useVoicePreviews.ts:131`) **nunca executa**. O teste passaria mesmo se a guarda `audio.src === ''` fosse removida do código.
- **Evidência:**
  ```ts
  act(() => { result.current.stop(); });
  if (audio?.src === '') {
    audio.onerror = (): void => {}; // sobrescreve o handler do HOOK
    audio.triggerError(4);          // chama o noop, não o reportLoadError
  }
  expect(errorSpy).not.toHaveBeenCalled(); // tautológico
  ```
- **Impacto:** Falsa sensação de cobertura do contrato "code 4 silenciado SÓ se `src === ''`". Uma regressão no ramo condicional (ex.: remover a checagem de `src`) não seria detectada por esta suíte.
- **Sugestão:** Ou expor `reportLoadError` via `__testing`, ou reestruturar o teste para invocar o handler do hook com `audio.src` vazio (ex.: `stop()` sem zerar listener — o que exigiria mudança no design), ou, no mínimo, renomear o teste/documentar que ele valida apenas o estado pós-stop (que já é coberto pelo teste da linha 212).

#### [SUGGESTION] Acesso morto `void useAnimationStore.getState().renderMode;`

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:623`
- **Confidence:** 95/100
- **Categoria:** Dead Code
- **Problema:** Expressão sem efeito — lê o estado da store e descarta. O comentário admite que é só para "telemetria/consistência", mas não há telemetria: nada é logado nem enviado.
- **Impacto:** Código morto que confunde leitores e sugere um contrato (renderMode da store) que não é usado para decisão.
- **Sugestão:** Remover a linha (e o import de `useAnimationStore` se não for usado em outro ponto do arquivo).

#### [SUGGESTION] Early returns silenciosos no controller escondem falhas

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:629` e `948-949`
- **Confidence:** 88/100
- **Categoria:** UX
- **Problema:** `if (!isVetorial && !imageSource) return;` retorna sem setar estado de erro/feedback — o usuário clica em exportar e nada acontece. Em `runBatchRender`, `if (!firstAnimation) return;` (linha 949) ocorre **depois** do `set({status:'preparing'})`, deixando o store preso em `preparing` para sempre se atingido.
- **Impacto:** Ambos são inalcançáveis pelos caminhos tipados atuais (defensivos), mas qualquer chamador futuro com input malformado produz um "nada acontece" ou "preparando eterno" sem log.
- **Sugestão:** Nos dois pontos, logar `log.warn` com o contexto e (no caso do batch) setar `status: 'failed'` antes do return.

#### [SUGGESTION] Filtro de contraste com fundo hardcoded `'white'` diverge do `canvasColor` (e aplica 2x no caminho worker)

- **Arquivo:** `src/features/speed-paint/lib/vectorizer.ts:1046`, `src/features/speed-paint/lib/imageProcessing.ts:753`, `src/features/speed-paint/lib/vetorialWorker.ts:111`
- **Confidence:** 90/100
- **Categoria:** Architecture
- **Problema:** O `vectorizeImageEdgeBezier` filtra contra `'white'` fixo e o `processVetorialOnMainThread` idem — mas o worker refaz o filtro com `msg.canvasColor`, e a UI (`SpeedPaintPage.tsx:1432-1476`) já expõe `setCanvasColor('black')`. Se `canvasColor: 'black'` for conectado, o filtro `'white'` removeria paths brancos (visíveis no fundo preto) e manteria pretos invisíveis — artefato "desenho sumindo". Hoje `canvasColor` é sempre `'white'` nos requests, então é divergência latente; e no caminho worker o filtro roda 2× (uma com white interno, outra com canvasColor).
- **Impacto:** Latente (sem bug visível hoje); risco de regressão quando o canvas preto for suportado de verdade; trabalho duplicado no worker.
- **Sugestão:** Receber `canvasColor` via `VectorizeOptions` e aplicar o filtro uma única vez, no ponto único de orquestração (fora do pipeline interno ou com o valor real).

#### [SUGGESTION] Doc-comments desatualizados em relação aos tipos reais

- **Arquivos:** `vectorizer.ts:8-10` (cita `'edge-sketch'` e "4 presets" — o tipo só tem 3), `vectorizer.ts:71` ("20 valores" — hoje 4), `vectorizer.ts:143-148` (comentário "v0.133.1" conflita com o changelog v0.133.0), `useSpeedPaintExporter.tsx:96-98` ("default `'artistic1'` da animationStore" — o default real é `'edge-default'`), `types/vetorial.ts:57-66` ("16 valores legados" — hoje 1), `tests/speed-paint/vectorizer.safetyLimits.unit.test.ts:278` (comentário "`a` minúsculo não permitido" — `a` É permitido pelo charset; o teste passa por causa do `N` de `NaN`)
- **Confidence:** 95/100
- **Categoria:** Manutenibilidade
- **Problema:** Comentários citam presets removidos e valores que não existem mais nos tipos — quem mantém o código confia em premissas falsas (o próprio histórico mostra que um doc-comment falso sobre `useVideoConfig` causou retrabalho, ver W-01 no controller).
- **Impacto:** Baixo, mas custo de manutenção real em um pipeline com muita documentação inline.
- **Sugestão:** Revisar os blocos listados na próxima passagem de limpeza; corrigir o comentário do teste para apontar o `N` como token inválido real.

#### [SUGGESTION] Painel de batch oculto quando `job` está `completed` (fluxo watch → record)

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:800` (`{showBatchExportPanel && !isCompleted && (...)}`)
- **Confidence:** 85/100
- **Categoria:** UX
- **Problema:** No fluxo em que o usuário assiste o preview (modo watch — `job` fica `completed`) e depois inicia "Gravar vídeo" (batch record), `isCompleted` é `true` e o painel dedicado do batch (progresso, chips, retry/back específicos) não renderiza. O progresso e o resultado do lote acabam aparecendo no `SpeedPaintExportPanel` single (que compartilha o mesmo controller) — funciona, mas por acoplamento acidental: no erro do lote, os botões de retry do batch (`handleBatchExportRetry`) não aparecem, só o reset do painel single. O `ExportCrossRouteToast` não cobre (`showInThisRoute` exclui a SpeedPaintPage).
- **Impacto:** Fluxo completável, porém com labels/estado do painel single exibindo um render de lote — confuso em caso de falha do lote.
- **Sugestão:** Exibir o painel batch quando `batchMode === 'record' || isBatchRecording` independente de `isCompleted`, ou usar `isBatchRecording` como condição adicional.

---

## 4. O que parece saudável

- **`useVoicePreviews`:** contrato de codes exatamente como especificado (0/1 silenciados; 4 silenciado só com `src === ''`; 2/3/4-com-src logados com `errorId`); cleanup de unmount zerando listeners + `removeAttribute('src')` + `load()` segue o padrão recomendado pelo React Docs (zerar `onerror` **antes** de limpar src); token de sessão com `isStale()` cobre races de `play().catch` e `onerror` tardio; `stop()` limpa `errorId` (S7).
- **Vectorizer:** regex `[ \t\r\n]` explícito (exclui `\x0B`/`\x0C` ilegais em XML 1.0); sanitização `SVG_PATH_DATA_REGEX` antes de `getLength` (que lança em `d` malformado); `applyVetorialSafetyLimits` aplicado nos DOIS pipelines (legacy e edge+bezier) e nos DOIS caminhos (main thread e `vetorialWorker`); limite de bytes com invariante de path individual; warns de telemetria com contexto; teste determinístico via `__testing`.
- **`bezierFitting`:** validação tripla (`getLength` + finitude + length > 0), `contourIndex` para pareamento de cor correto, profundidade máxima de recursão.
- **`imageProcessing`:** try/catch global no `img.onload` (resolve o job preso em 'processing'); try/catch no construtor do module worker com fallback main thread; `resolveOnce`/`rejectOnce` evitam double-settle; o abort do `processOnMainThread` é coberto pelo `handleAbort` do executor (verificado — não é leak).
- **Controller/página:** single discrimina **só pelo dado** (`'paths' in animation`) — correto contra a janela de debounce do sync de renderMode; batch propaga `renderMode`/`vetorialPreset`/`vetorialSortOrder` da store; `runBatchRender` propaga condicionalmente (payload enxuto); cache LRU com chave incluindo mode+preset+sortOrder (confirmado em `strokeCache.ts`); timings de batch consistentes (`sceneStepFrames` = duração − overlap; total = última cena fecha exato).
- **Testes:** 5 codes do `MediaError` cobertos, unmount, token stale com `delayedRejection` (exercita o `isStale()` de verdade — bom design de mock); limites 500/250KB testados deterministicamente; integração `vectorizeImage` com imagem real.

## 5. Limites da revisão

- `WhiteboardScene.tsx` (consumidor do `VetorialAnimation`), `SpeedPaintScene.tsx`, `SpeedPaintPlayer.tsx` e `BatchOrchestrator.tsx` não foram lidos por completo — apenas greps direcionados; o comportamento de render de paths (ex.: `length === 0` pós-sanitização) não foi validado no consumidor.
- O achado do codec foi validado por leitura estática do fluxo completo (INITIAL_STATE → set → get); não foi possível executar em browser real com H.264 indisponível.
- `ExportCrossRouteToast.tsx` foi analisado por grep (seletores do controller), não lido por completo.
- Não foram revisados: rotas adjacentes de vídeo (`videoRenderController` M1 — pode compartilhar o padrão do achado de codec), persistência dual storage e regras Firestore (sem mudanças esperadas no escopo).
- NotebookLM: consultado Remotion (contrato `defaultProps`+`inputProps` — uso do controller válido) e React (padrão de hook de áudio — alinhado). Não há notebook para HTMLMediaElement; o comportamento de `onerror` code 4 foi tratado como conhecimento de plataforma, com testes fixando o contrato.

---

## 6. RESUMO EXECUTIVO

Estado geral: **sólido** — os dois objetivos do escopo estão corretos (hook de vozes com contrato de codes fiel e teste de falso positivo resolvido; limites de complexidade SVG aplicados nos dois pipelines e nos dois caminhos de execução), sem CRITICAL. Há **1 WARNING bloqueante**: o `set({...INITIAL_STATE})` no início de cada render zera `codec`/`container` para `h264/mp4`, tornando o fallback VP8/WebM do `useCodecSupport` inócuo e quebrando export em navegadores sem H.264 (além de o `reset()` agravar a dessincronização). As demais 6 SUGGESTIONs (teste tautológico, dead code, early returns silenciosos, filtro de fundo hardcoded, docs desatualizadas, painel batch oculto em watch→record) não bloqueiam. **Recomendação:** corrigir o WARNING do codec (preservar `codec`/`container` no reset de início de render e no `reset()`) antes do fechamento; tratar as SUGGESTIONs em rodada de limpeza posterior.
