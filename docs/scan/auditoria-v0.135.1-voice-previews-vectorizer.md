# Auditoria — v0.135.1: useVoicePreviews + Safety Limits do Vectorizer

**Data:** 2026-08-04
**Escopo auditado:** `useVoicePreviews.ts`, `vectorizer.ts`, testes (`useVoicePreviews.unit`, `vectorizer.safetyLimits.unit`, `imageProcessing.vetorial.e2e`) e adjacentes (worker, imageProcessing, BatchOrchestrator, WhiteboardScene, videoRenderController).
**Validações já executadas:** `tsc -b` exit 0 · ESLint 0 erros · 2639/2639 testes passando.

---

## 1. Contexto assumido

- (a) Falso positivo do hook `useVoicePreviews` no Android (`MediaError.code = 4` ao limpar `src` de `<audio>` ativo) — correção: filtro de codes (null/0/1/4 = silencioso; 2/3 = erro real) + cleanup que zera listeners antes de mexer no `src`.
- (b) Proteção da complexidade SVG no pipeline vetorial: `MAX_PATHS_PER_SCENE = 500`, `MAX_D_BYTES_PER_SCENE = 250_000`, sanitização numérica + validação da regex do `d` ANTES de `getLength`, aplicados em ambos os pipelines.
- Modo `mask` não deve ser afetado.

## 2. Mapa rápido: sólido vs frágil

| Área | Estado | Notas |
|---|---|---|
| `useVoicePreviews` — filtro de codes | ✅ Sólido | Dupla proteção (listeners zerados + filtro de codes). Contrato atendido |
| `useVoicePreviews` — cleanup/unmount | ✅ Sólido | Replica `stop()`, token invalida callbacks antigos |
| `vectorizer` — sanitização + regex pré-`getLength` | ✅ Sólido | `enrichPaths` valida antes; try/catch residual cobre fuga |
| `vectorizer` — limites nos 2 pipelines | ✅ Sólido | `applyVetorialSafetyLimits` no fim de `vectorizeImageLegacy` e `vectorizeImageEdgeBezier` |
| Caminho main thread (`processVetorialOnMainThread`) | ✅ Sólido | Recebe proteção via `vectorizeImage` |
| Caminho worker (`vetorialWorker.ts`) | ⚠️ Frágil | Recebe proteção (delegação), mas `new Worker` sem try/catch → ver W-01 |
| Caminho batch (`BatchOrchestrator`) | ✅ Sólido | Usa `generateStrokesFromImage` → proteção vale |
| `WhiteboardScene` | ✅ Sólido | Extras (caneta `<g>`, filtro `<defs>`) são constantes, não passam pelos limites (ok) |
| Modo `mask` | ✅ Sólido | Intocado (teste e2e retrocompat passa) |

---

## 3. CRITICAL

**Nenhum.**

---

## 4. WARNING

### W-01 — `processVetorialInWorker`: `new Worker(..., { type: 'module' })` sem try/catch → promise presa para sempre

- **Arquivo:** `src/features/speed-paint/lib/imageProcessing.ts:587-590` (chamado em 431-447)
- **Descrição do gap:** `supportsVetorialWorker()` (`vetorialWorker.ts:82`) checa apenas `typeof Worker !== 'undefined'` — não detecta suporte a **module workers**. Em navegadores onde `Worker` existe mas `{ type: 'module' }` não é suportado (Safari/iOS < 15, Chrome < 80, ou CSP com `worker-src` restritivo que bloqueia a URL), `new Worker(...)` **lança**. A chamada `processVetorialInWorker` está FORA do único try/catch do `img.onload` (o try/catch cobre apenas `img.decode()`, linhas 372-377). A exceção vira unhandled rejection na função async e a Promise de `generateStrokesFromImage` **nunca settle**:
  - UI do Speed Paint fica em `processing` para sempre (sem erro, sem fallback);
  - no `BatchOrchestrator`, o job fica eternamente `processing` (o `.catch` nunca roda);
  - o listener de `signal` (linha 604) nunca é removido (leak leve por job).
  - O caminho mask tem o padrão correto (try/catch + fallback main thread, linhas 468-475); o vetorial não.
- **Evidência:** leitura completa de `imageProcessing.ts` (linhas 372-465); o teste e2e passa porque jsdom não define `Worker` (cai no main thread — nunca exercita o caminho do worker).
- **Mitigações verificadas:** nenhuma — não há try/catch nem fallback.
- **Recomendação objetiva:** envolver a criação do worker em `try { ... } catch { processVetorialOnMainThread(...); return; }` (consistente com o mask) ou melhorar `supportsVetorialWorker()` com feature-detect real de module worker.

---

## 5. SUGGESTION

### S-01 — Filtro de contraste duplo com cores divergentes (não idempotente para bg ≠ 'white')

- **Arquivo:** `vectorizer.ts:1032` (hardcoded `'white'` dentro de `vectorizeImageEdgeBezier`) × `vetorialWorker.ts:111` (`msg.canvasColor`) × `imageProcessing.ts:649/700` (request e main thread sempre enviam `'white'`).
- **Descrição:** `filterPathsByBackgroundContrast` é puro e idempotente quando reaplicado com o MESMO background. Hoje, no fluxo real, `canvasColor` é sempre `'white'` — sem impacto de usuário. Porém o tipo `VetorialWorkerRequest.canvasColor` aceita `'black'`, e se um dia for usado, o filtro interno hardcoded `'white'` já terá descartado paths brancos que seriam **visíveis** em fundo preto (perda de conteúdo silenciosa). Aplicação 2× com backgrounds diferentes não é idempotente.
- **Recomendação:** aplicar o filtro uma única vez com a cor efetiva — parametrizar/remover o hardcoded `'white'` interno do pipeline edge+bezier (ou aceitar `backgroundColor` em `VectorizeOptions`).

### S-02 — Limite de 250KB é heurística sem calibração empírica

- **Arquivo:** `vectorizer.ts:123` (`MAX_D_BYTES_PER_SCENE`).
- **Descrição:** não há evidência no repo de qual é o teto real de decodificação do `Image` no `renderMediaOnWeb`. Se o teto real for menor que 250KB, o incidente `Failed to convert SVG to image` persiste para SVGs entre o teto real e 250KB; se maior, truncamento desnecessário (paths descartados). Decisão pendente documentada como heurística (~4/3 base64).
- **Recomendação:** teste manual de exportação com SVG próximo a 250KB para calibrar e registrar o resultado no plano (`docs/plan/edge-detection-whiteboard-architecture.md`).

### S-03 — Regex do `d` exclui `+` e expoente, que SÃO válidos na grammar SVG — justificativa do comentário incorreta

- **Arquivo:** `vectorizer.ts:95` (`SVG_PATH_DATA_REGEX`) e comentário nas linhas 86-91.
- **Descrição:** a grammar de path data SVG permite número com sinal (`+`) e notação científica (`e`/`E`). O comentário afirma que esses tokens "não aparecem no formato válido" — factualmente incorreto. Sem impacto hoje (ambos os pipelines formatam via `toString()`/`toFixed(3)`, que nunca emitem `+`/expoente), mas um upstream futuro que emita `M0+10` teria o path descartado silenciosamente (fail-safe, mas invisível).
- **Recomendação:** corrigir o comentário e, se desejado, aceitar `+` na classe (expoente pode permanecer excluído — paths de imagem vetorizada nunca precisam dele).

### S-04 — Nenhum teste exercita o `vetorialWorker.ts` (caminho de produção do edge-*)

- **Arquivo:** `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts` (todo o arquivo).
- **Descrição:** jsdom não define `Worker` → `supportsVetorialWorker()` retorna false → o e2e e todos os testes passam pelo caminho **main thread**. O worker (caminho real em produção para presets edge-*) só é exercitado manualmente. A proteção de limites chega ao worker por delegação (`vectorizeImage`), então o risco é baixo, mas progresso/erro/cleanup do worker não têm cobertura.
- **Recomendação:** teste unitário com mock de `Worker` (capturar `postMessage`, emitir `result`/`error`) ou extrair a montagem da `VetorialAnimation` do worker para função pura testável.

### S-05 — Cobertura do hook: code 3, code 1, code null e unmount cleanup não testados

- **Arquivo:** `tests/hooks/useVoicePreviews.unit.test.ts`.
- **Descrição:** o contrato diz que code 3 (decode) DEVE logar erro real — não há teste para ele (só 0, 2, 4). Code 1 e `mediaError === null` também sem teste. O cleanup do `useEffect` (unmount) — peça central da correção do bug original — não é exercitado por nenhum teste.
- **Recomendação:** adicionar `triggerError(3)` → `errorSpy` chamado; unmount do `renderHook` → `onerror` zerado e token invalidado (tardio não loga).

### S-06 — `playPreview` catch loga "autoplay bloqueado" para qualquer rejeição não-AbortError

- **Arquivo:** `src/hooks/useVoicePreviews.ts:130-137`.
- **Descrição:** `NotSupportedError` (src inválido) cairia no `log.warn` com mensagem enganosa de autoplay. Não afeta UI (code 4 no `onerror` já é silencioso), mas polui telemetria (`warn` → Firestore).
- **Recomendação:** distinguir `NotSupportedError` (warn com mensagem correta ou silêncio) no catch.

### S-07 — Fechamento sistêmico: padrão `audio.onerror + MediaError` existe APENAS em `useVoicePreviews` (ok); `AudioContext.handlePlayError` é o análogo mais próximo

- **Arquivo:** `src/contexts/AudioContext.tsx:51-60`.
- **Descrição:** verificado por `supergrep_find` — nenhum outro hook usa `audio.onerror`/`MediaError` (`useAudioGenerator` gera TTS, não reproduz `<audio>`). O `AudioContext` usa `play().catch()`: trata `NotAllowedError`/`AbortError` e loga `log.error` para qualquer outro DOMException — um `NotSupportedError` ao trocar `audio.src` rapidamente (linha 149) geraria falso positivo da mesma classe que o escopo corrigiu. Baixa probabilidade, consistência defensiva apenas.
- **Recomendação:** filtrar `NotSupportedError` quando o src foi substituído (mesma política do hook).

### S-08 — `PATH_POINT_REGEX` não parseia `d` compactos (ordenação degrada silenciosamente)

- **Arquivo:** `vectorizer.ts:297`.
- **Descrição:** `M12.5,30` / `M-5-5` (sintaxe válida, sem espaços ou com vírgula) não casam → `getMinY`/`distFromCenter` retornam fallback (0/Infinity) → `top-down`/`center-out` mantêm ordem original. Pré-existente (v0.131+), sem crash — apenas ordenação imperfeita em paths compactos. Fora do escopo da mudança.
- **Recomendação:** opcional — usar parser numérico mais tolerante (`[-+]?\d*\.?\d+` com separadores `[,\s]`).

---

## 6. Cenários de borda sem resposta

1. **Browser sem suporte a module worker (Safari/iOS < 15, Chrome < 80, CSP restritivo)** → W-01: travamento sem recuperação.
2. **Teto real de decodificação do web-renderer desconhecido** → S-02: o limite 250KB pode ser insuficiente (incidente persiste) ou excessivo (paths descartados à toa).
3. **`canvasColor: 'black'` futuro** → S-01: perda de paths brancos visíveis pelo filtro interno hardcoded.
4. **Path upstream com `+`/expoente no `d`** → S-03: descartado silenciosamente pela regex (comportamento intencional, mas documentação incorreta).
5. **Imagem 1920×1080 com ruído real (foto)** — nenhum teste usa imagem real; os e2e usam 200×200 sintéticas. O truncamento de 500/250KB nunca é exercitado por um teste de integração com imagem real de produção.

## 7. Checklist de sanidade

- [x] Li os 5 arquivos principais por completo (hook, vectorizer, 3 testes).
- [x] Li adjacentes: `vetorialWorker.ts`, `imageProcessing.ts` (completo), `BatchOrchestrator.tsx`, `types/vetorial.ts`, `videoRenderController.tsx` (store), `WhiteboardScene.tsx` (completo), `AudioContext.tsx` (trechos), `vitest.config.ts`.
- [x] `analyze_aitool_find` confirmou consumidores do hook (Inspector, Configuracoes — páginas estáveis, sem unmount rápido).
- [x] `supergrep_find` confirmou que `audio.onerror`+`MediaError` só existe no hook auditado (fechamento sistêmico).
- [x] Verificado que `__testing` só é importado por testes (nenhum import em `src/`).
- [x] Verificado alinhamento 500/250KB entre código e testes (e2e usa 500 e 250_000 hardcoded — consistentes).
- [x] Determinismo dos testes: `applyVetorialSafetyLimits` não usa `Math.random()`; `sortPaths('random')` usa seed determinístico.
- [x] Modo `mask` intocado (teste retrocompat passa; `vectorizeImageLegacy` só recebeu a chamada de limites no final).

## 8. RESUMO EXECUTIVO

1. **Escopo coberto:** o falso positivo do hook está resolvido com dupla proteção (listeners zerados no cleanup/stop + filtro de codes null/0/1/4 vs 2/3), e a proteção de complexidade SVG (500 paths, 250KB, sanitização + regex pré-`getLength`) alcança os dois pipelines e os três caminhos de uso (main thread, worker por delegação, batch) — modo `mask` intocado.
2. **Bloqueios:** 1 WARNING (W-01) — `new Worker({ type: 'module' })` sem try/catch/fallback em `processVetorialInWorker`: em browsers sem suporte a module worker ou CSP restritivo, o job fica eternamente em `processing` sem erro; inconsistente com o padrão de fallback do modo mask.
3. **Recomendação de fechamento:** corrigir W-01 (try/catch + fallback main-thread, ~5 linhas) antes de encerrar; as 8 SUGGESTIONs são melhorias opcionais — priorizar S-02 (calibração empírica do 250KB, diretamente ligada ao incidente original) e S-04 (cobertura do worker).
