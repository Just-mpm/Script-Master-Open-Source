# Scan de lacunas: Edge Detection Whiteboard v0.132.0

## 1. Contexto assumido

Comparação feita entre o estado atual do workspace e:

- `docs/plan/edge-detection-whiteboard-tracker.md`
- `docs/plan/edge-detection-whiteboard-plano-final.md`

Escopo analisado: Speed Paint, pipeline `edge-*`, `vectorizer`, `imageProcessing`, cache de strokes, render/export Remotion, testes e gates finais de release.

Comandos executados nesta auditoria:

- `bun run lint` — passou.
- `bun run typecheck` — passou.
- `bun run test` — falhou: 9 testes falhando em 7 arquivos, 2589/2598 passando.

Não executei `bun run build` nem `bun run build:full` para respeitar a restrição de não gerar artefatos de build no workspace durante a auditoria.

NotebookLM consultado:

- Vite 8 Guide: build de produção é gate complementar a typecheck/test, especialmente com lazy chunks e empacotamento.
- Vitest Guide: testes unitários/componente não substituem `vite build`.
- Remotion Docs: render/export real cobre riscos que unit tests não cobrem, como WebCodecs, limites de GPU/memória, suporte de elementos e captura de frames.

## 2. Mapa rápido: sólido vs frágil

| Área | Sólido | Frágil |
|---|---|---|
| Pipeline edge+bezier | Arquivos centrais existem: `edgeDetection.ts`, `contourTracing.ts`, `bezierFitting.ts`, `vectorizer.ts`; `edge-*` está tipado e agrupado. | Não há gate verde de suíte completa no estado atual. |
| Integração Speed Paint | `generateStrokesFromImage()` repassa `edgeThreshold` e `contourEpsilon`; `vectorizeImage()` discrimina `edge-*` via type guard. | Default de UI/store continua `artistic1`; isso está documentado no tracker como decisão, mas contradiz a intenção visual de tornar `edge-default` o novo default para novos projetos se essa for a expectativa de produto. |
| Cache | Cache distingue `mode`, `preset` e `sortOrder`. | Não distingue `edgeThreshold`/`contourEpsilon`; hoje esses knobs não têm UI, então não bloqueia usuário comum, mas afeta callers programáticos/testes futuros. |
| Testes | Há 2598 testes e novos arquivos específicos do pipeline. | `bun run test` falha agora com 9 falhas. |
| Build/release | `lint` e `typecheck` passaram nesta auditoria. | `build`, `build:full`, render/export real Remotion e bump de versão continuam não verificados/executados. |

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---:|---:|---|---|---|---|
| GAP-01 | CRÍTICO | Gate de testes | 96 | A suíte completa não está verde no estado atual, então a v0.132.0 não está pronta para merge. | `bun run test` falhou: 7 arquivos com falhas, 9 testes falhando, 2589/2598 passando. Falhas em `SpeedPaintPage.component.test.tsx`, `LoginPage.component.test.tsx`, `Inspector.component.test.tsx`, `ConfiguracoesPage.component.test.tsx`, `LandingPage.component.test.tsx`, `Sidebar.features.test.tsx`, `Inspector.features.test.tsx`. | `bun run lint` passou; `bun run typecheck` passou. Isso não cobre comportamento quebrado em testes. | Corrigir timeouts/falhas ou ajustar mocks/test setup antes de merge. |
| GAP-02 | CRÍTICO | Gate de build/prerender | 94 | `bun run build` e `bun run build:full` ainda não foram validados nesta branch/estado. O tracker marca ambos como pendentes e eles cobrem riscos que lint/typecheck/test não cobrem. | Tracker: Gate de Qualidade Pós-Implementação marca `bun run build` e `bun run build:full` como não verificados. NotebookLM Vite/Vitest confirma que build é complementar por causa de chunking, imports dinâmicos, CJS/ESM e env replacement. | `lint` e `typecheck` passaram; não substituem `vite build`. Não rodei build para evitar gerar `dist/` durante auditoria. | Rodar `bun run build`; depois `bun run build:full` e validar as 10 rotas pré-renderizadas. |
| GAP-03 | ALTO | Gate Remotion/export | 91 | Falta validação real de render/export do modo whiteboard edge+bezier via Remotion/WebCodecs. Unit/component tests não provam que o export real não falha por GPU, codec, suporte de elementos ou frame capture. | Plano exige estabilização/performance; tracker tem build gates pendentes e teste manual de `AbortSignal` parcialmente validado. NotebookLM Remotion confirma que client-side rendering usa WebCodecs, tem limitações de elementos e precisa validação real para SVG/renderMediaOnWeb. | Há testes comparativos e unitários do pipeline, mas não substituem um export real. | Antes de merge, exportar ao menos 1 cena `edge-default` e, idealmente, 1 lote pequeno no fluxo suportado; registrar resultado. |
| GAP-04 | ALTO | Release/versionamento | 93 | O pacote ainda está em `0.131.0`, então o estado atual não representa uma release v0.132.0 pronta. | `package.json` contém `"version": "0.131.0"`. Tracker lista bump `0.131.0 → 0.132.0` como pendência global. | Nenhuma mitigação runtime; é gate de release/documentação. | Rodar o fluxo de versionamento planejado (`fast`) só depois dos gates técnicos verdes. |
| GAP-05 | MÉDIO | Cobertura/escopo funcional | 88 | Validação com imagens reais ainda não foi feita; testes comparativos usam imagens sintéticas. Isso reduz confiança para usuários finais usando fotos/PNG/JPEG reais. | Tracker lista: “Imagens reais (JPEG/PNG) — testado só com sintéticas” e “Análise de imagens reais ... recomendada antes de disponibilizar para usuários finais”. | Pipeline tem fallback de threshold e testes sintéticos amplos. | Validar 3 imagens reais: ilustração, cena Gemini/Remotion e foto/landscape; aceitar ou ajustar preset default/recomendação. |
| GAP-06 | MÉDIO | Decisão de produto | 84 | Há divergência intencional entre `vectorizer` default `edge-default` e UI/orquestrador/store/cache default `artistic1`. Isso não é bug se a decisão for manter retrocompatibilidade, mas bloqueia a afirmação “novos projetos usam edge+bezier por default”. | `vectorizer.ts`: `DEFAULT_PRESET = 'edge-default'`; `imageProcessing.ts`: `options.vetorialPreset ?? 'artistic1'`; `animationStore.ts`: `DEFAULT_VETORIAL_PRESET = 'artistic1'`; `strokeCache.ts`: default vetorial `artistic1`. Tracker documenta a decisão de manter o default do orquestrador como `artistic1`. | A divergência está documentada no tracker, então não reporto como bug crítico. | Decidir: v0.132.0 quer apenas disponibilizar `edge-*` no topo do dropdown, ou quer mudar o default real da UI para `edge-default`? |
| GAP-07 | BAIXO | Cache/knobs avançados | 82 | Cache LRU não inclui `edgeThreshold` e `contourEpsilon`. Se um caller usar esses overrides na mesma imagem/preset, pode receber resultado cacheado de parâmetros anteriores. | `strokeCache.ts` chave inclui `mode`, `preset`, `sortOrder`; `edgeThreshold`/`contourEpsilon` existem em `GenerateStrokesOptions`/`VectorizeOptions`, mas não são propagados ao cache context. Supergrep confirmou usos de `getStrokeAnimation`/`setStrokeAnimation` só com mode/preset/sortOrder. | Não há UI para esses parâmetros; impacto em usuário comum é baixo agora. | Incluir esses campos no cache se os knobs forem expostos ou usados por automação. |

## 4. Cenários de borda sem resposta

| Cenário | Status |
|---|---|
| Export real com `edge-default` em navegador via `renderMediaOnWeb` | Sem validação registrada nesta auditoria. |
| `build:full` com pré-render das 10 rotas públicas | Pendente. |
| `AbortSignal` cancelando no meio do pipeline edge+bezier | Tracker marca como parcialmente validado/flaky. |
| Imagens reais JPEG/PNG | Pendente; só sintéticas no comparativo. |
| Performance real em 1920×1080 | Tracker usa extrapolação linear; não há P50/P95 direto em 1920×1080. |
| Batch vetorial edge+bezier | Fora do escopo declarado, mas precisa permanecer documentado na release para não virar expectativa falsa. |

## 5. Checklist de sanidade

- [x] Escopo mapeado com Analyze (`project_map`, `area_detail`, `area_context`).
- [x] Usei `analyze_find` para símbolos/pontos críticos (`vectorizeImage`, `DEFAULT_VETORIAL_PRESET`, opções edge).
- [x] Usei `supergrep_find` para chamadas estruturais (`vectorizeImage`, `generateStrokesFromImage`, `getStrokeAnimation`, `setStrokeAnimation`).
- [x] Li arquivos centrais completos: `vectorizer.ts`, `imageProcessing.ts`, `animationStore.ts`, `strokeCache.ts`, `vetorialPresets.ts`, `vetorial.ts`, `SpeedPaintPage.tsx`, `speedPaintRenderer.ts`, `speedPaintRenderController.tsx`.
- [x] Usei `impact_analysis` para `vectorizer.ts` e `imageProcessing.ts`.
- [x] Verifiquei documentação/decisão explícita no tracker antes de classificar divergência de default.
- [x] Consultei NotebookLM para Vite, Vitest e Remotion antes de atribuir confiança nos gates.
- [x] Confirmei impacto real de usuário: falha de testes/gates impede merge seguro; build/export ausente pode quebrar entrega/renderização de vídeo.

## Bloqueia merge

Bloqueiam merge agora:

1. `bun run test` falhando no estado atual.
2. `bun run build` não verificado.
3. `bun run build:full` não verificado.
4. Export/render real Remotion do caminho `edge-*` não validado.
5. Versão ainda em `0.131.0`, então não há release v0.132.0 fechada.

