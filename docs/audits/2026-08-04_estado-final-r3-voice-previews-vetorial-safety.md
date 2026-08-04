# Auditoria de estado final — `useVoicePreviews` + limites de segurança SVG vetorial (r3)

- **Data:** 2026-08-04
- **Método:** leitura integral dos arquivos-fonte da verdade + adjacentes; sem revisão de diff
- **Validações executadas (fornecidas pelo orquestrador):** `tsc -b` exit 0 · ESLint 0 erros · `bun run test` 2644/2644
- **Notebooks consultados:** React Docs (padrão de cleanup de hook com recursos externos), TypeScript 6 Docs (exports internos para teste)
- **Focos cobertos:** hooks, engenharia/arquitetura, estados/race conditions, tipagem, Firebase (leitura), UX/UI, testes

---

## 1. Escopo da revisão

**Arquivos lidos por completo (fonte da verdade):**

- `src/hooks/useVoicePreviews.ts` (169 linhas)
- `src/features/speed-paint/lib/vectorizer.ts` (1317 linhas)
- `src/features/speed-paint/lib/bezierFitting.ts` (601 linhas)
- `src/features/speed-paint/lib/imageProcessing.ts` (1065 linhas)
- `src/features/speed-paint/store/speedPaintRenderController.tsx` (1097 linhas)
- `src/pages/SpeedPaintPage.tsx` (1480 linhas)
- `tests/hooks/useVoicePreviews.unit.test.ts` (410 linhas)
- `tests/speed-paint/vectorizer.safetyLimits.unit.test.ts` (307 linhas)
- `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts` (700 linhas)

**Arquivos adjacentes lidos:**

- `src/features/speed-paint/lib/vetorialWorker.ts` (138 linhas)
- `src/features/video-render/components/SpeedPaintScene.tsx` (473 linhas)
- `src/features/video-render/components/WhiteboardScene.tsx` (622 linhas)
- `src/features/speed-paint/types/vetorial.ts` (122 linhas)
- `src/features/speed-paint/store/animationStore.ts` (224 linhas)
- `src/features/speed-paint/constants/vetorialPresets.ts` (151 linhas)
- `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` (329 linhas)
- `src/features/speed-paint/components/batch/BatchOrchestrator.tsx` (216 linhas)
- `src/features/speed-paint/components/SpeedPaintPlayer.tsx` (293 linhas)
- `src/features/speed-paint/components/SpeedPaintComposition.tsx` (62 linhas)
- `src/features/speed-paint/components/WhiteboardComposition.tsx` (66 linhas)
- `src/features/video-render/lib/strokeCache.ts` (parcial, 120 linhas — chaves de cache)

---

## 2. Veredito

**Ajustes recomendados** — o objetivo original (a) hook `useVoicePreviews` e (b) limites SVG do pipeline vetorial estão **bem implementados e testados**: sem achados nesses dois focos. Os 3 WARNINGs encontrados são **gaps de integração de UI → pipeline** no Speed Paint (controles que não surtem efeito e propagação incompleta de opções no batch) — são pré-existentes ao escopo desta rodada, mas bloqueiam o encerramento conforme a regra.

---

## 3. Achados priorizados

### [WARNING] Seletor de easing (L10/RF-10) é um controle morto — o valor da store nunca chega ao `WhiteboardScene`

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:608-616` (handler) · `src/features/speed-paint/components/SpeedPaintPlayer.tsx:131-135` · `src/features/speed-paint/components/WhiteboardComposition.tsx:58-63` · `src/features/speed-paint/store/speedPaintRenderController.tsx:305-311` e `242-262`
- **Confidence:** 95/100
- **Categoria:** UX / Dead Code
- **Problema:** O `WhiteboardScene` aceita `easing?: EasingFunction` e usa `easing ?? Easing.inOut(Easing.ease)` (linha 249), mas **nenhum consumidor propaga o easing** — nem o player (preview), nem as composições de export single/batch. O comentário do handler afirma o contrário.
- **Evidência:**
  ```ts
  // SpeedPaintPage.tsx:602-607 (comentário) — FALSO
  // "Como o easing é aplicado em runtime pelo WhiteboardScene ... a troca é REATIVA
  //  — não precisa reprocessar a imagem. Persistir na store basta;
  //  a próxima renderização do player já consome o novo valor."
  const handleEasingChange = useCallback((_e, newEasing) => { ... setEasing(newEasing); ... });

  // WhiteboardScene.tsx:249 — único consumo, sempre com fallback
  easing: easing ?? Easing.inOut(Easing.ease),

  // SpeedPaintPlayer.tsx:131-135 — VetorialPlayer não lê a store nem recebe easing
  const inputProps: WhiteboardCompositionProps = { animation, showDrawTool, isLastScene };
  ```
  Grep em `src/` confirma: `easing` da store só é lido na própria página (para o `ToggleButtonGroup`); não existe mapeamento `VetorialEasingType → EasingFunction` em lugar nenhum.
- **Impacto:** As opções "Linear" e "Bounce" do seletor de suavização **não têm efeito nenhum** — preview e export sempre usam `smooth`. Feature L10/RF-10 entregue pela metade, com comentário enganoso que induz a acreditar que funciona.
- **Sugestão:** Propagar `easing` de ponta a ponta: ler `useAnimationStore.getState().easing` no `VetorialPlayer`/composições (ou adicionar ao `VetorialAnimation`/props), com um mapper `VetorialEasingType → EasingFunction` (`linear` → `Easing.linear`, `smooth` → `Easing.inOut(Easing.ease)`, `bounce` → `Easing.out(Easing.bounce)`). Alternativa: remover o seletor da UI até a feature ser implementada.

### [WARNING] Seletor de cor do canvas (branco/preto) é um controle morto — `canvasColor` da store nunca é consumido

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:1418-1471` (botões) · `src/features/speed-paint/lib/imageProcessing.ts:506, 702, 771, 1044` · `src/features/video-render/lib/speedPaintRenderer.ts:416`
- **Confidence:** 95/100
- **Categoria:** UX / Dead Code
- **Problema:** O valor `canvasColor` da `animationStore` é gravado pelos botões da UI, mas **nenhum caminho de geração ou renderização o lê** — todas as animações (mask e vetorial, worker e main thread) são construídas com `canvasColor: 'white'` hardcoded, e o player/composições usam `animation.canvasColor`.
- **Evidência:**
  ```ts
  // imageProcessing.ts:702 (request do worker vetorial) e 771 (main thread)
  canvasColor: 'white',
  // SpeedPaintComposition.tsx:51 / WhiteboardComposition.tsx:56 — usam a animação
  backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000'
  ```
  Grep em `src/`: `setCanvasColor` só é chamado em `SpeedPaintPage.tsx:1426,1449`; leituras de `s.canvasColor` só na mesma página (linha 210) e no store. Nenhum consumidor do valor.
- **Impacto:** O usuário seleciona fundo preto e **nada muda** no preview nem no vídeo exportado (sempre branco). Controle visível sem efeito.
- **Sugestão:** Ou conectar o valor ao pipeline (passar `canvasColor` ao `generateStrokesFromImage`/request do worker e ao player), ou remover os botões da UI se o suporte a fundo preto não for desejado nesta versão.

### [WARNING] `vetorialSortOrder` não é propagado no batch — export em lote e preview watch divergem do preview single

- **Arquivo:** `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:120-127` · `src/features/speed-paint/store/speedPaintRenderController.tsx:922-929` · `src/pages/SpeedPaintPage.tsx:333-346` · `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx:83-100` (tipo sem o campo)
- **Confidence:** 92/100
- **Categoria:** Bug (inconsistência de comportamento)
- **Problema:** O batch export (`runBatchRender`) e o preview watch (`BatchOrchestrator`) re-geram as animações via `generateStrokesFromImage` **sem `vetorialSortOrder`**, enquanto o preview single (`reprocessCurrentImage`) propaga o valor da store. O objetivo desta rodada documenta explicitamente a propagação de `renderMode`/`vetorialPreset` no batch — o `sortOrder` ficou de fora.
- **Evidência:**
  ```ts
  // SpeedPaintPage.tsx:342-345 — propaga renderMode e preset, NÃO sortOrder
  renderMode: storeRenderMode,
  ...(storeRenderMode === 'vetorial' && storePreset !== undefined
    ? { vetorialPreset: storePreset } : {}),

  // speedPaintRenderController.tsx:922-929 — idem
  ...(renderMode !== undefined ? { renderMode } : {}),
  ...(renderMode === 'vetorial' && vetorialPreset !== undefined ? { vetorialPreset } : {}),

  // reprocessCurrentImage (SpeedPaintPage.tsx:482-487) — único caminho que propaga sortOrder
  vetorialSortOrder: mode === 'vetorial' ? currentSortOrder : undefined,
  ```
  `GenerateStrokesOptions.vetorialSortOrder` existe (imageProcessing.ts:297); o campo não existe em `SpeedPaintBatchExportOptions`.
- **Impacto:** O vídeo exportado em lote usa a ordem natural do vetorizador (varredura no edge+bezier; ordem de paleta no preset legado `default`), **diferente da ordem escolhida no seletor** (default `top-down`) que o usuário viu no preview single. Resultado visual divergente do esperado, silencioso. A troca de sortOrder durante o watch ainda deixa a fila com itens em ordens mistas.
- **Sugestão:** Adicionar `vetorialSortOrder?: VetorialPathSortOrder` em `SpeedPaintBatchExportOptions`, propagar no `runBatchRender` (condicionado a `renderMode === 'vetorial'`) e no `BatchOrchestrator` (lendo da store via `getState()` no momento do processamento do item), espelhando o padrão já usado para `renderMode`/`vetorialPreset`.

### [SUGGESTION] Troca de modo/preset durante `job.status === 'processing'` é ignorada silenciosamente, deixando UI e animação divergentes

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:444-446` (`reprocessCurrentImage`)
- **Confidence:** 85/100
- **Categoria:** UX
- **Problema:** `reprocessCurrentImage` faz `if (!job.inputImage || job.status === 'processing') return;` **depois** de `reprocessInMode` já ter persistido o novo modo na store. Durante o processamento de um item (ex: watch mode), o usuário troca para "Desenho": a UI mostra o novo modo selecionado, mas a animação conclui no modo antigo — sem erro nem feedback, e o `ToggleButtonGroup` já está no novo valor (clicar de novo é no-op).
- **Impacto:** Estado visual inconsistente (seletor diz "Desenho", player mostra "Clássico") até trocar de item; em fila watch, itens do mesmo batch ficam em modos diferentes.
- **Sugestão:** No early return, agendar o reprocessamento para quando o job completar (ex: flag pendente + `useEffect` reativo a `job.status === 'completed'`) ou exibir aviso curto ("Aguarde o processamento atual terminar").

### [SUGGESTION] No-op `void useAnimationStore.getState().renderMode;` em `runSingleRender`

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:616`
- **Confidence:** 90/100
- **Categoria:** Dead Code
- **Problema:** Expressão sem efeito que apenas lê `renderMode` da store ("acessor opcional para forçar o uso"). O discriminante real é o type guard `'paths' in animation` (correto); o acesso ao store não contribui para nada.
- **Impacto:** Confusão de leitura (parece que a store afeta o branch) sem custo de runtime relevante.
- **Sugestão:** Remover a linha — a decisão por dado já é documentada no comentário do bloco.

### [SUGGESTION] Filtro de contraste de fundo aplicado 2× no pipeline edge+bezier

- **Arquivo:** `src/features/speed-paint/lib/vectorizer.ts:1046` + `src/features/speed-paint/lib/imageProcessing.ts:753` + `src/features/speed-paint/lib/vetorialWorker.ts:111`
- **Confidence:** 88/100
- **Categoria:** Architecture (DRY)
- **Problema:** `vectorizeImageEdgeBezier` já aplica `filterPathsByBackgroundContrast(enriched, 'white')` internamente; os dois callers aplicam novamente após `vectorizeImage`. Para presets edge o segundo filtro é sempre no-op; para o legado, é o único — a responsabilidade está dividida entre camadas.
- **Impacto:** Nenhum funcional; risco futuro de divergência se o limiar interno mudar e o caller usar outro (ex: `canvasColor` 'black' já existe no worker request, `'white'` hardcoded no main thread).
- **Sugestão:** Unificar: aplicar o filtro uma única vez no caller (remover do `vectorizer` ou do caller), e alinhar o `'white'` fixo do main thread com o `msg.canvasColor` do worker.

### [SUGGESTION] Helpers internos de teste expostos via `export const __testing`

- **Arquivo:** `src/features/speed-paint/lib/vectorizer.ts:1311-1317`
- **Confidence:** 82/100
- **Categoria:** Architecture
- **Problema:** O módulo de produção exporta um namespace-objeto `__testing` apenas para a suíte. É o padrão conhecido como *needless namespacing* (confirmado no notebook TypeScript 6); o lint atual não reclama (objeto const, não `namespace`), e o tree-shaking remove no bundle — o custo é só de design/API pública.
- **Impacto:** API pública poluída; risco de consumo acidental em código de produção.
- **Sugestão:** Exportar os helpers individualmente com JSDoc `@internal` (e `stripInternal` na build de declarações), ou testar via `vectorizeImage` público com imagens sintéticas (os limites já são testáveis indiretamente pelo e2e).

---

## 4. O que parece saudável

- **`useVoicePreviews` (objetivo a):** contrato de codes 0/1/4 (debug) vs 2/3 (error + `errorId`) implementado exatamente como especificado; code 4 silenciado incondicionalmente com trade-off documentado; cleanup de unmount zera `onerror`/`onended`, pausa, remove `src` e invalida o token; `stop()` limpa `errorId`. Notebook React confirma que o padrão (zerar listeners + invalidar token) é o correto para recursos externos; a suíte de 12 testes cobre os 5 codes, unmount, `isStale()` e controles positivos/negativos de autoplay.
- **Limites de segurança SVG (objetivo b):** regex `[ \t\r\n]` fecha o vetor XML 1.0 (remotion 4.0.448 sem o fix upstream), `MAX_PATHS_PER_SCENE=500`, `MAX_D_BYTES_PER_SCENE=250_000`, descarte de path individual oversized e sanitização numérica — todos com logs `warn` e tests determinísticos via `__testing`. Invariante de bytes mantido mesmo no caso `keptCount === 0` (primeiro path sempre ≤ limite individual).
- **Pareamento path↔contour** via `BezierPath.contourIndex` com fallback posicional em `sampleColors` — correto e consistente com o array filtrado.
- **`imageProcessing`:** try/catch no `new Worker({ type: 'module' })` com fallback main thread; try/catch global no `img.onload` garante `rejectOnce` (promise sempre settle — mata o job eterno em 'processing').
- **Controller:** single discrimina só pelo dado (`'paths' in animation`); batch vetorial com type guard real + `sceneDurationInFrames` como prop (evita o bug do `useVideoConfig` dentro de `Sequence`); `currentRenderId` protege renders obsoletos.
- **Testes:** 3 suítes focadas com qualidade alta (mock de `Audio` controlado, fake timers no fallback mask, 10 imagens sintéticas no e2e com limites de path/bytes validados).

---

## 5. Limites da revisão

- **Sem execução de lint/typecheck/testes nesta sessão** — resultados fornecidos pelo orquestrador (exit 0 / 2644 passing) foram aceitos como válidos.
- **Não foi possível validar em runtime** o comportamento do `HTMLAudioElement` no Chrome real (race `src=''` + `load()`) nem a decodificação de SVG no `renderMediaOnWeb` — a análise é estática, apoiada na documentação e nos testes.
- **Não consultados nesta rodada:** notebooks de Remotion (inexistente na lista), MUI (sem achados dependentes), Firebase (nenhum achado em regras/auth — os arquivos auditados não tocam serviços Firebase além do logger).
- **Fora do escopo lido:** `speedPaintTimings.ts` (apenas grep de assinaturas), `useCodecSupport`, `VideoPage`/`SceneRenderModePanel` (mencionados no AGENTS mas não no escopo), `speedPaintRenderer.ts` (apenas grep).

---

## 6. RESUMO EXECUTIVO

1. **Estado geral:** os dois objetivos originais — falso positivo do `useVoicePreviews` e limites de complexidade SVG (500 paths / 250KB d-bytes / regex XML 1.0) — estão corretamente implementados, bem documentados e cobertos por testes de alta qualidade; nenhum achado nesses focos.
2. **Bloqueios (3 WARNINGs):** todos são gaps de integração pré-existentes no Speed Paint — (a) seletor de easing sem efeito (valor nunca chega ao `WhiteboardScene`), (b) seletor de cor do canvas sem efeito (`canvasColor` nunca consumido), (c) `vetorialSortOrder` não propagado no batch (export em lote e preview watch divergem do preview single).
3. **Recomendação de fechamento:** **não encerrar com os 3 WARNINGs abertos** — corrigi-los é barato e pontual (2 são remoção ou conexão de controles mortos; 1 é propagação de uma opção já existente no tipo de options). Os 4 SUGGESTIONs podem ser tratados em rodada posterior sem bloqueio.
