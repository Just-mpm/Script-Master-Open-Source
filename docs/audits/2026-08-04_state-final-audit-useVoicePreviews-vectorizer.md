# Auditoria do Estado Final — useVoicePreviews + Vectorizer (limites de segurança)

- **Data:** 2026-08-04
- **Escopo:** correção do falso positivo do preview de voz (MediaError 0/1/4) e proteção da complexidade SVG do pipeline vetorial (500 paths / 250KB `d`)
- **Validações confirmadas (fornecidas):** `tsc -b` exit 0 · ESLint 0 erros (3 arquivos) · `bun run test` 2639/2639 · suites focadas 16/16, 8/8 e 2/2
- **Notebooks consultados:** React Docs (padrão de cleanup de useEffect — confirma zerar `onerror`/`onended` no cleanup e o uso de token para callbacks fora do escopo do efeito). Notebook Remotion retornou `NOT_FOUND` (ID não encontrado); rationale dos limites validado por código + incidente real citado no escopo.

---

## 1. Escopo da revisão

**Lidos por completo (fonte da verdade):**
- `src/hooks/useVoicePreviews.ts` (151 linhas)
- `src/features/speed-paint/lib/vectorizer.ts` (1303 linhas)
- `tests/hooks/useVoicePreviews.unit.test.ts` (232 linhas)
- `tests/speed-paint/vectorizer.safetyLimits.unit.test.ts` (307 linhas)
- `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts` (700 linhas)

**Adjacentes lidos por completo:**
- `src/features/speed-paint/lib/vetorialWorker.ts` · `imageProcessing.ts` · `bezierFitting.ts`
- `src/features/speed-paint/constants/vetorialPresets.ts` · `types/vetorial.ts`
- `src/features/speed-paint/components/batch/BatchOrchestrator.tsx`
- `src/features/video-render/store/videoRenderController.tsx` · `lib/speedPaintService.ts` · `lib/speedPaintRenderer.ts` · `lib/strokeCache.ts` · `components/WhiteboardScene.tsx`
- Consumidores do hook: `src/components/Inspector.tsx` (parcial, contexto do uso) e `src/components/Configuracoes.tsx` (grep de uso)

**Focos cobertos:** Bugs, gaps, regressões, efeitos colaterais, arquitetura, tipagem, estados, testes, aderência ao contrato.

## 2. Veredito

**Ajustes recomendados (não bloqueante).**

Nenhum CRITICAL e nenhum WARNING. Os dois contratos do escopo estão implementados corretamente e cobertos por testes; os achados são SUGGESTIONs de manutenibilidade, observabilidade e defesa em profundidade. Nada impede o encerramento.

## 3. Achados priorizados

### [SUGGESTION] Observabilidade perdida: `MediaError.code = 4` silenciado também engole o caso real de asset ausente (404)

- **Arquivo:** `src/hooks/useVoicePreviews.ts:111-114`
- **Confidence:** 85/100
- **Categoria:** UX / Observabilidade
- **Problema:** O silenciamento de `code === 4` (`MEDIA_ERR_SRC_NOT_SUPPORTED`) — correto para o falso positivo do cleanup — também torna invisível o caso real de preview ausente: no Chrome, `404` em `<audio>` também dispara `error` com code 4. `errorId` nunca é populado e não há `log.error`; a UI fica muda (nem `isPlaying`, nem `hasError`).
- **Evidência:**
  ```ts
  if (code === null || code === 0 || code === 1 || code === 4) {
    log.debug('Preview de voz abortado ou áudio substituído', { voiceId, code });
    return;
  }
  ```
- **Impacto:** Se um asset `public/voice-previews/{voz}.wav` faltar (voz nova adicionada sem o WAV), o problema fica indetectável em produção (`debug` é suprimido). É uma regressão de diagnóstico em relação ao comportamento anterior — o trade-off é aceito pelo contrato, mas vale registrar.
- **Sugestão:** Enriquecer o `log.debug` com `networkState` e `currentSrc` (ex.: `NETWORK_NO_SOURCE` + `src` não-vazio é forte indício de 404 real) e, opcionalmente, considerar um `log.warn` para o caso `src` válido + code 4 após `loadedmetadata` nunca ter disparado (timeout de `canplay`).

### [SUGGESTION] Filtro de contraste de fundo duplicado e `canvasColor` sempre `'white'` (dead code + bug latente)

- **Arquivo:** `src/features/speed-paint/lib/vectorizer.ts:1032` · `src/features/speed-paint/lib/vetorialWorker.ts:111` · `src/features/speed-paint/lib/imageProcessing.ts:649,700`
- **Confidence:** 90/100
- **Categoria:** Architecture / Dead Code
- **Problema:** O pipeline edge+bezier aplica `filterPathsByBackgroundContrast(enriched, 'white')` internamente com `'white'` hardcoded; depois o worker (ou o main-thread) aplica o MESMO filtro novamente com `msg.canvasColor`/`'white'`. Todos os callers enviam `canvasColor: 'white'` — o campo do `VetorialWorkerRequest` e o tipo `'white' | 'black'` da animação são, na prática, dead code.
- **Evidência:**
  ```ts
  // vectorizer.ts (edge-bezier, passo 7)
  const visible = filterPathsByBackgroundContrast(enriched, 'white');
  // imageProcessing.ts (request para o worker)
  canvasColor: 'white',
  ```
- **Impacto:** Hoje nenhum (filtro idempotente, mesma cor). Mas o contrato do worker promete suportar `'black'`: se algum dia `canvasColor: 'black'` for usado, o filtro interno com `'white'` descartaria os paths claros (os únicos visíveis em fundo preto) antes do worker — imagem vazia. Armadilha real em arquitetura de "filtro em duas camadas".
- **Sugestão:** Remover o filtro interno do `vectorizeImageEdgeBezier` e centralizar a filtragem por `canvasColor` no chamador (worker/main-thread), passando a cor de fundo como parâmetro (`VectorizeOptions.backgroundColor`) em vez de hardcoded — ou pelo menos documentar a invariante "filtro externo deve receber a mesma cor".

### [SUGGESTION] Web Worker vetorial sem guarda de preset legado — falha obscura se um caller futuro enviar `default`

- **Arquivo:** `src/features/speed-paint/lib/vetorialWorker.ts:89-106`
- **Confidence:** 85/100
- **Categoria:** Architecture (defesa em profundidade)
- **Problema:** O handler do worker chama `vectorizeImage({...}, { preset: msg.preset })` sem validar `isEdgePreset(msg.preset)`. O único caller atual (`imageProcessing.ts:429`) já gateia `isEdgePreset(preset) && supportsVetorialWorker()`, então hoje é seguro — mas o próprio cabeçalho do arquivo documenta que `imagetracerjs` não funciona em Worker (depende de `window`/`importScripts`).
- **Evidência:**
  ```ts
  const rawPaths: VetorialPath[] = await vectorizeImage(
    { data: msg.imageData.data, width: msg.width, height: msg.height } as ImageData,
    { preset: msg.preset, ... },
  );
  ```
- **Impacto:** Um futuro caller que envie um preset legado ao worker recebe um erro de runtime difícil de debugar dentro do `ImageTracer`, derrubando a exportação com mensagem genérica, em vez de um erro claro de contrato.
- **Sugestão:** No handler do worker, validar `isEdgePreset(msg.preset)` e postar `{ type: 'error', error: 'Preset legado não suportado no Worker vetorial' }` antes de qualquer processamento.

### [SUGGESTION] `new Worker(..., { type: 'module' })` sem try/catch pode deixar a promise pendurada (hang) em browsers sem suporte a module workers

- **Arquivo:** `src/features/speed-paint/lib/imageProcessing.ts:587-590` (via `processVetorialInWorker`)
- **Confidence:** 80/100
- **Categoria:** Bug latente / Race Condition
- **Problema:** `supportsVetorialWorker()` checa apenas `typeof Worker !== 'undefined'`. Em browsers com `Worker` mas sem suporte a `type: 'module'` (Safari < 15, Chrome < 80), `new Worker(url, { type: 'module' })` lança (SyntaxError/TypeError) dentro do handler `img.onload` async — a exceção rejeita o handler, mas a Promise externa de `generateStrokesFromImage` nunca é resolvida nem rejeitada. O fallback de main-thread (`processVetorialOnMainThread`) nunca é acionado.
- **Evidência:**
  ```ts
  const worker = new Worker(new URL('./vetorialWorker.ts', import.meta.url), {
    type: 'module',
    name: `vetorial-worker-${...}`,
  });
  ```
- **Impacto:** Em browsers antigos (população residual em 2026), o speed paint vetorial fica "eterno em carregando" sem erro visível. Probabilidade baixa, mas o custo de mitigação é trivial.
- **Sugestão:** Envolver a criação do worker em try/catch e, no catch, chamar `processVetorialOnMainThread(...)` (mesmo padrão do fallback do worker inline de máscara, linhas 468-475 do mesmo arquivo).

### [SUGGESTION] Constantes de segurança duplicadas como magic numbers nos testes e2e

- **Arquivo:** `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts:609,618,629`
- **Confidence:** 90/100
- **Categoria:** Testes / Manutenibilidade
- **Problema:** O e2e hardcoda `500`, `250_000` e a regex de validação do `d` em vez de importar `MAX_PATHS_PER_SCENE`, `MAX_D_BYTES_PER_SCENE` e `SVG_PATH_DATA_REGEX` do `__testing` (como a suite unitária já faz). Se os limites mudarem, o teste e2e quebra ou fica desatualizado silenciosamente — e, pior, pode "passar" com limites novos menores que o esperado.
- **Evidência:**
  ```ts
  expect(animation.paths.length).toBeLessThanOrEqual(500);
  const totalDBytes = animation.paths.reduce((s, p) => s + p.d.length * 2, 0);
  expect(totalDBytes).toBeLessThanOrEqual(250_000);
  ```
- **Impacto:** Dupla fonte de verdade para os limites; divergência silenciosa futura entre teste e implementação.
- **Sugestão:** Importar as constantes do `__testing` do `vectorizer` no e2e (o teste unitário já demonstra o padrão).

### [SUGGESTION] Auto-clear do `errorId` inconsistente entre os dois consumidores do hook

- **Arquivo:** `src/components/Inspector.tsx:211-215` vs `src/components/Configuracoes.tsx:122-125,491-493`
- **Confidence:** 85/100
- **Categoria:** UX
- **Problema:** O `Inspector` limpa `errorId` com timeout de 3s; o `Configuracoes` desestrutura apenas `playingId/errorId/playPreview` e não usa `clearError` — um erro real (code 2/3) fica exibido no `VoiceCard` indefinidamente até o próximo `playPreview` (que limpa no início).
- **Evidência:**
  ```ts
  // Inspector
  const timer = window.setTimeout(clearError, 3000);
  // Configuracoes — clearError não é desestruturado
  const { playingId, errorId, playPreview } = useVoicePreviews();
  ```
- **Impacto:** Inconsistência de comportamento de erro entre as duas telas que usam o hook (estúdio vs configurações).
- **Sugestão:** Centralizar o auto-clear de 3s dentro do próprio hook (timer interno no `setErrorId`), tornando o contrato uniforme para todos os consumidores — ou adicionar `clearError` no desestruturamento do `Configuracoes`.

## 4. O que parece saudável

- **Contrato do hook cumprido:** códigos 0/1/4 → `log.debug`; 2/3 → `log.error` + `errorId`; cleanup de unmount zera `onerror`/`onended`, incrementa `sessionTokenRef` e para o áudio — padrão confirmado pelo notebook React Docs (zerar handlers no cleanup é a prática recomendada; o token é justificável porque o `Audio` é criado em handler, fora do escopo do efeito).
- **`stop()` corrige a raiz do falso positivo:** pausa + zera listeners ANTES de `removeAttribute('src')` + `load()` — o `onerror` de `src=''` nunca alcança o `reportLoadError`.
- **Limites do vectorizer corretos e em ambos os pipelines:** `applyVetorialSafetyLimits` (sanitização numérica → `MAX_PATHS_PER_SCENE` → `MAX_D_BYTES_PER_SCENE`) é aplicado no legado e no edge+bezier; a invariante "nenhum path individual excede 250KB" é garantida; a condição `keptCount > 0` no acumulador de bytes é redundante mas não viola a invariante (primeiro path sempre cabe pois `pathBytes ≤ MAX`).
- **Validação do `d` antes de `getLength`:** em `enrichPaths` (regex + try/catch residual) e em `buildValidatedPath` do bezierFitting (`formatCoord` com `toFixed(3)` evita notação científica; try/catch no `getLength`). O `WhiteboardScene` ainda protege o render com `safeGetPointAtLength`.
- **Todos os caminhos de produção passam pelos limites:** `generateStrokesFromImage` (batch/worker/main-thread) → `vectorizeImage` — incluindo a exportação de vídeo (`enhanceScenesWithSpeedPaint` → `speedPaintRenderer` → `generateStrokesFromImage`) e o `BatchOrchestrator`. O cache LRU guarda animações já limitadas (chave inclui mode+preset).
- **Testes focados sólidos:** determinísticos via `__testing`, cobrindo sanitização, limite de contagem, limite de bytes, path individual oversized, combinação dos limites e a regex (aceita/rejeita).
- **Gate do worker no lugar certo:** `useEdgeWorker = isEdgePreset(preset) && supportsVetorialWorker()` — o legado nunca chega ao worker hoje.

## 5. Limites da revisão

- Revisão estática apenas: não rodei build/lint/testes (resultados fornecidos pelo orquestrador foram aceitos).
- O notebook Remotion retornou `NOT_FOUND` na consulta; o rationale dos limites (falha `Failed to convert SVG to image` no `renderMediaOnWeb`) foi validado por comentários do código, teste e2e e o incidente real citado no escopo, não por documentação externa.
- O arquivo `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts` tem 5 erros de lint preexistentes (declarados no escopo como não-corrigidos de propósito) — não reavaliados aqui como achado.
- **Divergência de contrato observada:** o escopo descreve o retorno do hook como `{ previewingVoiceId, togglePreview, stop, isPreviewSupported, errorId }`; o código real expõe `{ playingId, errorId, playPreview, stop, clearError }` e os dois consumidores (`Inspector`, `Configuracoes`) usam o formato real — o repositório está internamente consistente; a divergência é da descrição do escopo, não do código.
- `useEffect` cleanup não foi exercitado pelos testes do hook (nenhum teste desmonta com áudio ativo) — a cobertura do cleanup de unmount é apenas por leitura.

## 6. RESUMO EXECUTIVO

(1) Estado geral: **saudável** — os dois objetivos do escopo (silenciar MediaError 0/1/4 no hook e limites de segurança 500 paths/250KB com sanitização e regex antes de `getLength` no vectorizer) estão implementados corretamente, em todos os caminhos de produção, com testes determinísticos passando e `tsc`/ESLint limpos. (2) Bloqueios: **nenhum** — zero achados CRITICAL e zero WARNING; os 6 achados são SUGGESTIONs de manutenibilidade/observabilidade que não impedem o encerramento. (3) Recomendação: **fechar** o trabalho; as SUGGESTIONs podem ser convertidas em backlog — as de maior valor são a guarda `isEdgePreset` no worker (baixo custo, elimina armadilha futura), o try/catch no construtor do worker (evita hang em browsers antigos) e a remoção/parametrização do filtro de contraste duplicado (elimina o risco latente de canvas `black`).
