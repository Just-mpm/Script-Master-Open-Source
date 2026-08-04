# Auditoria de estado final — v0.135.x (vetorial SVG + useVoicePreviews)

**Data:** 2026-08-04
**Escopo original:** (a) falso positivo do hook `useVoicePreviews`; (b) proteção da complexidade SVG no pipeline vetorial do Speed Paint.
**Arquivos auditados (lidos por completo):** `useVoicePreviews.ts`, `vectorizer.ts`, `bezierFitting.ts`, `imageProcessing.ts`, `speedPaintRenderController.tsx`, `SpeedPaintPage.tsx`, `useVoicePreviews.unit.test.ts`, `vetorialWorker.ts`, `SpeedPaintScene.tsx`, `WhiteboardScene.tsx` + apoio: `vetorialPresets.ts`, `types/vetorial.ts`, `strokeWorker.ts`, `speedPaintRenderer.ts`, `useSpeedPaintExporter.tsx`, `WhiteboardComposition.tsx`, testes de speed-paint, `AbsoluteFill` do Remotion instalado.
**Validações:** `tsc -b` ✅ | ESLint ✅ | 2644/2644 testes ✅.

---

## CRITICAL

Nenhum.

---

## WARNING

### W-1 — Export vetorial (single e batch) não faz *fit* da animação na composição; o SVG fica pequeno/deslocado no canto quando a resolução de export difere das dimensões nativas

- **Arquivo:** `src/features/video-render/components/WhiteboardScene.tsx:435-447` (comparar com `SpeedPaintScene.tsx:378-384` e `speedPaintRenderController.tsx:210`).
- **Descrição:** O `<svg>` do `WhiteboardScene` usa `width={animation.canvasWidth} height={animation.canvasHeight}` (atributos fixos em px) e **não** tem CSS de escala nem `useVideoConfig()`. O `AbsoluteFill` do Remotion 4.0.448 (verificado no source instalado) é `position: absolute; display: block` — **sem centralização nem flex**. No export, `getSpeedPaintResolution()` (useSpeedPaintExporter.tsx:121-147) escala a composição para o lado maior da qualidade (ex: imagem 800×600 + 1080p → composição 1920×1440), mas o SVG continua renderizando em 800×600 px no canto superior esquerdo. O modo máscara resolve isso com `fitMode="contain"` + `renderedWidth/renderedHeight` percentuais (SpeedPaintScene.tsx:378-384; controller linha 210 passa `fitMode="contain"` no batch) — o vetorial não tem equivalente em nenhum dos 3 caminhos de export (`ExportableWhiteboardComposition`, `VetorialBatchSceneWrapper`, batch mask usa contain mas vetorial não). O `img` do hold usa `width/height 100% + objectFit: contain` (linhas 420-434) — então a transição desenho→hold "salta" de tamanho/posição. **Caso comum afetado:** imagem < 1920px no lado maior exportada em 1080p, ou qualquer imagem exportada em 1440p/4K, e cenas batch com aspect diferente do primeiro item.
- **Mitigações verificadas:** Preview (`SpeedPaintPlayer`) usa `compositionWidth/Height = canvasWidth/Height` (SpeedPaintPlayer.tsx:149-150, 195-196) — preview correto; o bug é exclusivo do export.
- **Recomendação:** No `WhiteboardScene`, usar `useVideoConfig()` e espelhar o padrão do mask (`renderedWidth/renderedHeight` + `width/height: '100%'`/`auto`) ou, mais simples, aplicar `style={{ width: '100%', height: '100%' }}` + `preserveAspectRatio="xMidYMid meet"` no `<svg>` (fit nativo do SVG, centralizado) — vale para single, batch e vetorial.
- **Confidence:** ~85 (layout confirmado no source do Remotion; sem validação visual de export nesta sessão).

### W-2 — `useVoicePreviews`: code 4 silenciado (404 real) deixa `playingId` preso — UI mostra "tocando" eterno sem áudio e sem log

- **Arquivo:** `src/hooks/useVoicePreviews.ts:127-130` (early return do branch silenciado pula `setPlayingId(null)` da linha 137).
- **Descrição:** O branch `code === null || 0 || 1 || 4` faz `return` **antes** de `setPlayingId(null)`/`setErrorId(voiceId)`. Para code 4 com listener ativo e src válido — caso que o próprio comentário (linhas 115-126) identifica como **404 real** — o `playingId` permanece setado indefinidamente (`onended` nunca dispara porque o áudio nunca tocou). O trade-off documentado cobre a perda de telemetria, mas não o estado de UI: o seletor de voz (Inspector/Configurações) fica exibindo o preview como ativo/tocando sem som, sem qualquer feedback e sem log para diagnóstico. É justamente o falso positivo que o escopo (a) queria eliminar — o log foi silenciado, mas o estado errado permanece no caso 404 real.
- **Mitigações verificadas:** Para codes 0/1 o estado é limpo por `stop()`/token (listeners zerados antes) — sem impacto nesses casos. Teste de code 4 (useVoicePreviews.unit.test.ts:140-163) só valida log/debug, não `playingId`.
- **Recomendação:** Chamar `setPlayingId(null)` antes do early return (mantendo o silêncio de log e sem `setErrorId`), de modo que todo `onerror` resete o estado de reprodução; documentar o trade-off de telemetria já existente.
- **Confidence:** ~88.

### W-3 — `processVetorialInWorker`: `worker.onerror` rejeita o job em vez de cair no fallback main thread (assimetria com o modo máscara)

- **Arquivo:** `src/features/speed-paint/lib/imageProcessing.ts:676-679` (comparar com `523-529` — mask faz fallback).
- **Descrição:** O contrato "fallback para `processVetorialOnMainThread` quando module worker indisponível" só cobre o **throw do construtor** (`new Worker` em try/catch, linhas 619-643). Mas `supportsVetorialWorker()` (vetorialWorker.ts:81-83) só checa `typeof Worker !== 'undefined'` — browsers que não suportam **module** workers (Safari < 15, Chrome < 80) não lançam no construtor: ignoram `{ type: 'module' }`, tratam como classic e o parse do `import` dispara `SyntaxError` → `error` event → **`worker.onerror` → `reject`** → job falha (no batch, o lote inteiro falha) em vez de degradar para main thread. O mesmo ocorre com CSP que bloqueia o fetch do módulo. O mask cobre exatamente esse cenário com `worker.onerror → processOnMainThread`.
- **Mitigações verificadas:** Browsers modernos (Chrome 80+, Safari 15+, Firefox) funcionam; o try/catch do construtor cobre o throw direto (Safari 15.x com `SecurityError` em CSP restritivo). O caminho main thread (`processVetorialOnMainThread`, linhas 708-786) recebe os mesmos parâmetros corretos e tem try/catch interno.
- **Recomendação:** No `worker.onerror`, executar `cleanup()` e delegar para `processVetorialOnMainThread(...)` (mesmo padrão do mask, linhas 523-529), preservando `reject` apenas para mensagens `{ type: 'error' }` vindas do pipeline (indicam bug real) e para abort.
- **Confidence:** ~90.

---

## SUGGESTION

### S-1 — Filtro de contraste aplicado 2× no pipeline edge+bezier (redundância + risco latente de canvas `black`)
- **Arquivo:** `vectorizer.ts:1046` (interno, hardcoded `'white'`) + `imageProcessing.ts:753` (main thread, `'white'`) + `vetorialWorker.ts:111` (`msg.canvasColor`).
- **Descrição:** O filtro roda dentro de `vectorizeImageEdgeBezier` e de novo no caller (worker/main). Hoje o request hardcoda `canvasColor: 'white'` (imageProcessing.ts:702), então é consistente e apenas custo O(n) duplicado. Porém, se o `canvasColor` da store (seletor 'black' existe em `SpeedPaintPage.tsx:1419-1471`) for um dia propagado ao worker, o filtro interno `'white'` removeria os paths brancos (o desenho **visível** em canvas preto) e o externo `'black'` os escuros → cena vazia. Armadilha latente.
- **Recomendação:** Remover a aplicação interna (`vectorizer.ts:1046`) e deixar o filtro apenas no caller (que conhece o canvasColor efetivo), ou parametrizar a cor por options.

### S-2 — Docs desatualizadas no `vectorizer.ts` (drift desde v0.133.1)
- **Arquivo:** `vectorizer.ts:4-10` ("16 presets `ImagetRacerPreset`", "4 presets `EdgePresetName`" incluindo `'edge-sketch'`) e `:143-148` (comentário "15 outros presets removidos" — tipo já é 1 valor).
- **Descrição:** O tipo real (types/vetorial.ts:71-79) é `'default' | 'edge-default' | 'edge-detailed' | 'edge-bold'` — 1 legado + 3 edge. `PATHOMIT_BY_PRESET` (Record com só `default`) está **correto** dado o tipo (sem risco de `undefined` → NaN em `Math.max`), mas os comentários/AGENTS.md ("EdgePresetName 6 valores") divergem do código.
- **Recomendação:** Atualizar os JSDoc/comentários para 3 edge presets + 1 legado.

### S-3 — Teste de code 4 não fixa o invariante de estado (só o de log); `clearError` sem teste
- **Arquivo:** `tests/hooks/useVoicePreviews.unit.test.ts:140-163`.
- **Descrição:** O teste documenta bem o invariante de log, mas não verifica `result.current.playingId` após `triggerError(4)` — o W-2 (estado preso) passaria despercebido na suíte. `clearError` (API pública do hook) não tem nenhum teste.
- **Recomendação:** Adicionar `expect(result.current.playingId).toBeNull()` no teste de code 4 (e code 0) e um teste mínimo de `clearError`.

### S-4 — `interpolate` do `WhiteboardScene` com inputRange `[0, durationInFrames - 1]` degenerado quando `durationInFrames === 1`
- **Arquivo:** `WhiteboardScene.tsx:242-252`.
- **Descrição:** Com `durationInFrames === 1` (batch usa `Math.max(1, ...)` — controller:946), o inputRange vira `[0, 0]` → divisão por zero no interpolate do Remotion (NaN). Hoje impraticável (mínimo real ~90 frames), mas defesa barata.
- **Recomendação:** `const rangeEnd = Math.max(1, durationInFrames - 1)`.

### S-5 — `reprocessCurrentImage` early-return silencioso deixa toggle modo/preset dessincronizado do job durante processamento
- **Arquivo:** `SpeedPaintPage.tsx:444-446`.
- **Descrição:** Se o usuário troca modo/preset enquanto `job.status === 'processing'`, o valor da store muda (UI mostra novo estado) mas o reprocessamento é ignorado; ao concluir, o job fica com a animação do modo/preset antigos — o player (que discrimina por `'paths' in animation`) continua mostrando o resultado anterior. Usuário precisa trocar de novo após concluir.
- **Recomendação:** Enfileirar o reprocessamento pendente (ref de modo desejado) ou desabilitar os seletores durante `processing`.

### S-6 — Cópia redundante do `ImageData` antes do `postMessage` no worker vetorial
- **Arquivo:** `imageProcessing.ts:684-691`.
- **Descrição:** `dataCopy = new Uint8ClampedArray(imageData.data)` + `postMessage(request)` — o structured clone do postMessage já clona o buffer; a cópia explícita adiciona ~8 MB (1920×1080) de cópia extra por cena em batch de N cenas, sem ganho (o buffer original não é transferido nem mutado).
- **Recomendação:** Remover o `dataCopy` e postar o `imageData` original (o clone do postMessage já isola o worker).

---

## Verificações que fecharam OK (checklist de sanidade)

- **Regex `[ \t\r\n]`:** cobre o whitespace legal do XML 1.0 (`#x9 #xA #xD #x20`); `e/E/+` excluídos intencionalmente; `formatCoord` (toFixed) nunca emite notação científica → alinhado com a geração dos dois pipelines. ✅
- **`MAX_PATHS_PER_SCENE = 500`:** alinhado com o e2e (`imageProcessing.vetorial.e2e.test.ts:607-609`) e com `vectorizer.safetyLimits.unit.test.ts`. ✅
- **`MAX_D_BYTES_PER_SCENE = 250_000`:** testado (unit:176-231 + e2e:611-618); lógica de acúmulo correta (path individual > limite descartado; acumulado para no 1º estouro). ✅
- **`contourIndex`:** setado em **todos** os paths emitidos por `fitBezierPaths` (bezierFitting.ts:593); `sampleColors` usa `contours` pós-filtro de compacidade (índices consistentes); fallback posicional só para BezierPath manuais (testes). ✅
- **`img.onload` try/catch global:** envolve decode, canvas, getImageData, branch vetorial e branch mask (imageProcessing.ts:373-539); `processVetorialOnMainThread` async nunca rejeita (catch interno chama `rejectOnce`). ✅
- **Abort no caminho vetorial:** `handleAbort` interno de `processVetorialInWorker` tem a referência local do worker e usa `rejectOnce` (settled guard). ✅
- **Batch propaga `renderMode`/`vetorialPreset`:** SpeedPaintPage.tsx:331-346 → controller:922-929. ✅
- **Fechamento sistêmico (`new Worker`):** únicos `new Worker` em `strokeWorker.ts` (chamador `speedPaintRenderer.ts:385-386` tem try/catch + fallback main thread + timeout) e `imageProcessing.ts` (2×, ambos protegidos). Nenhum outro `new Worker({type:'module'})` sem proteção. ✅
- **`MediaError`:** único consumidor no projeto é `useVoicePreviews.ts`. ✅
- **`PATHOMIT_BY_PRESET`:** sem risco de `undefined` (tipo `ImagetRacerPreset` = `'default'` apenas). ✅

## Cenários de borda sem resposta

1. **Export vetorial com `canvasColor: 'black'` selecionado:** a animação é gerada com `canvasColor: 'white'` hardcoded (imageProcessing.ts:702/771) — o seletor de canvas da página não tem efeito no modo vetorial (nem preview nem export). Comportamento não documentado; se intencional, falta doc; se não, é o mesmo vetor do S-1.
2. **Falha do `img.decode()` em data URLs JPEG muito grandes** (imagem próxima de 1920×1080 → data URL ~1-2 MB): coberto por reject com mensagem genérica "Falha ao decodificar imagem para speed paint" — sem retry. Aceitável, mas sem teste.

## RESUMO EXECUTIVO

1. **Escopo coberto:** o hook silencia 0/1/4 e loga 2/3 com token + cleanup corretos e testes abrangentes; o vectorizer sanitiza (regex + 500 paths + 250 KB) nos dois pipelines, com `contourIndex` setado em todos os caminhos e limites testados; batch propaga modo/preset. **Pendente:** o export vetorial não faz fit do SVG na composição (W-1), o code 4 deixa `playingId` preso (W-2) e o `onerror` do worker vetorial não degrada para main thread (W-3).
2. **Bloqueios:** 3 WARNINGs (W-1, W-2, W-3) — nenhum CRITICAL; todos corrigíveis em horas sem tocar na arquitetura. Testes/typecheck/lint passam, mas a suíte não cobre W-1 (sem teste visual de layout) nem W-2 (assertion de estado ausente no teste de code 4).
3. **Recomendação:** fechar W-2 e W-3 (mudanças localizadas e de baixo risco, alinhadas ao padrão mask já existente), avaliar W-1 com um export real de imagem 800×600 em 1080p antes de encerrar; aplicar S-1 a S-6 em follow-up não bloqueante.
