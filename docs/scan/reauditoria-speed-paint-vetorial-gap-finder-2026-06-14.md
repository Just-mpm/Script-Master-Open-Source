# Reauditoria — Speed Paint Vetorial (gap-finder)

**Data:** 2026-06-14
**Versão alvo:** `0.131.0`
**Agent:** gap-finder (reauditoria independente pós-Fases 1-5)
**Plano fonte:** `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (560 linhas)
**Tracker:** `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md` (283 linhas)

---

## 1. Contexto assumido

Auditoria final independente após conclusão de todas as 5 fases do plano de migração do Speed Paint de **revelação por máscara** (raspadinha) para **animação vetorial** (whiteboard-style). O escopo inclui 10 arquivos novos, 12+ modificados, 22+9+2 testes, passando por lint/typecheck/test/build (2264/2264).

Foco exclusivo em **escopo, completude e alinhamento com o plano fonte**. Não audita qualidade de código (code-validator) nem segurança (security).

---

## 2. Mapa rápido: sólido vs frágil

### Sólido ✅
- **Tipos `VetorialPath`/`VetorialAnimation`/`SpeedPaintRenderMode`/`VetorialPreset`** — implementados conforme §6 do plano
- **`vectorizer.ts`** — wrapper completo com validação, pathomit, MAX_PATHS_PER_SCENE, AbortSignal, truncamento
- **`WhiteboardScene.tsx`** — componente determinístico sem `useEffect`/`useState`/DOM refs, uso correto de `getLength()` e `getPointAtLength()` (Premissa #6)
- **`WhiteboardComposition.tsx`** — wrapper limpo, lazy import no controller
- **`strokeCache.ts`** — discriminated union com eviction LRU, chave SHA-256 inclui mode+preset (Premissa #10)
- **`imageProcessing.ts`** — branch `renderMode === 'vetorial'` com fallback mask intacto
- **`speedPaintRenderController.tsx`** — `createExportableWhiteboardComposition()` lazy, discriminação por `'paths' in animation`, `COMPOSITION_ID_VETORIAL` único
- **Persistência dual storage** — `userSettings.ts` + `useSyncSpeedPaintRenderMode.ts` + `App.tsx` integração
- **i18n 3 locales** — 4 chaves `modeLabel`, `modeClassic`, `modeVetorial`, `modeDescription` nos 3 idiomas
- **Analytics** — evento `speed_paint_mode_changed` tipado em `AnalyticsEventMap`
- **Seletor de modo na UI** — `ToggleButtonGroup` com ícones, tooltip, aria, tokens visuais
- **Testes** — 22 unitários (vectorizer) + 9 integração (pipeline) + 2 e2e (10 imagens + fallback mask)

### Frágil ⚠️
- **Preview quebra no modo vetorial** — `SpeedPaintPage` faz `job.animation as StrokeAnimation` para `SpeedPaintPlayer`, que não aceita `VetorialAnimation`. Usuário que trocar para "Modo Desenho" e gerar uma imagem verá erro no preview.
- **`useSpeedPaintExporter` tipado apenas como `StrokeAnimation`** — `SpeedPaintExportOptions.animation` não aceita `VetorialAnimation` no tipo público, embora o controller discrimine corretamente em runtime.
- **Batch vetorial não suportado** — documentado, mas sem fallback informativo na UI quando usuário tenta.

---

## 3. Validação seção por seção (§1 a §12 do plano fonte)

| § | O que diz o plano | Status | Observação |
|---|---|---|---|
| **§1** | Contexto e motivação — raspadinha vs desenho à mão | ✅ **Conforme** | Problema resolvido: `imagetracerjs` + `@remotion/paths` entregam animação vetorial real |
| **§2** | Problema arquitetura atual (mask) | ✅ **Conforme** | §2.1-2.3 documentados e confirmados no código real |
| **§3.1** | Fallback mask preservado | ✅ **Conforme** | `renderMode: 'mask'` é default, código mask intacto em `imageProcessing.ts`, `speedPaintRenderer.ts` |
| **§3.2** | 4 características visuais essenciais | ✅ **Conforme** | `strokeDashoffset` cresce linha, `getPointAtLength` posiciona caneta, SVG path contínuo, paths em sequência ordenada |
| **§4** | Pipeline (pseudocódigo) | ✅ **Conforme** | Fluxo `ImageData → imagetracerjs → parse SVG → getLength → render WhiteboardScene` segue o especificado |
| **§5.1** | Fluxo de dados (novo diagrama) | ✅ **Conforme** | Implementado conforme diagrama |
| **§5.2** | Tabela antes/depois | ✅ **Conforme** | Todas as diferenças implementadas |
| **§5.3** | Código de referência WhiteboardScene | ✅ **Conforme** | Algoritmo `useCurrentFrame()` → `interpolate` → `drawnLength` → classificação completo/parcial/não começado → caneta via `getPointAtLength()` — exato ao plano |
| **§6** | Tipos | ✅ **Conforme** | `VetorialPath`, `VetorialAnimation`, `SpeedPaintRenderMode`, `VetorialPreset` — todos implementados. `canvasColor` adicionado (Premissa #14) |
| **§7** | Arquivos impactados | 🟡 **Desvios** | (1) `hand-pencil.svg` não criado → SVG inline (decisão Matheus). (2) `WhiteboardComposition` em `speed-paint/components/` (não `video-render/components/`). (3) `speedPaintRenderer.ts` não modificado (controller decide). (4) +4 arquivos extras `userSettings.ts`, `useSyncSpeedPaintRenderMode.ts`, +3 testes |
| **§8** | Riscos e mitigações | ✅ **Mitigado** | Todos os 6 riscos endereçados: pathomit, MAX_PATHS_PER_SCENE=500, abort checks, declarations.d.ts, default 'mask' |
| **§9** | Estimativa (5 fases) | ✅ **Conforme** | 5 fases executadas (Fase 0 removida por decisão) |
| **§10** | Decisões tomadas | ✅ **Conforme** | 7 decisões respeitadas (usar `@remotion/paths`, `imagetracerjs`, não Motion, manter modo mask, etc.) |
| **§11** | Relação com Superfícies + Estilos de Mão | ✅ **Aderido** | Ideia adiada conforme recomendado |
| **§12** | Próximos passos | 🟡 **Parcial** | Plano tinha 5 passos: (1) ✅ documento criado, (2) ❌ spike não executado (decisão), (3) ⏳ revisão com Matheus pendente, (4) ✅ Fases 1-5 executadas, (5) ⏳ AGENTS.md/CLAUDE.md pendente |

---

## 4. Validação das 17 premissas do tracker

| # | Premissa | Status | Evidência |
|---|---|---|---|
| 1 | Caminho do controller | ✅ Correto | Usa `speed-paint/store/speedPaintRenderController.tsx` |
| 2 | Local de WhiteboardComposition | ✅ Correto | Em `speed-paint/components/` (consistente com SpeedPaintComposition) |
| 3 | Sprite da caneta → SVG inline | ✅ Correto | `Pencil` componente SVG inline em `WhiteboardScene.tsx` (272-297) |
| 4 | Preset default 'artistic1' | ✅ Correto | `vectorizer.ts:43`, `animationStore.ts:22` |
| 5 | `@remotion/paths` como dep direta | ✅ Correto | `package.json:52` — `"@remotion/paths": "4.0.448"` |
| 6 | Aviso crítico: sem `getTotalLength` | ✅ Correto | `WhiteboardScene.tsx` usa `getLength()` e `getPointAtLength()`. Zero `ref.current.getTotalLength()` |
| 7 | `imagetracerjs` instalado | ✅ Correto | `package.json:59` — `"imagetracerjs": "1.2.6"` |
| 8 | Fase 0 removida | ✅ Aceito | Decisão Matheus documentada no tracker |
| 9 | Persistência em UserSettings | ✅ Correto | `userSettings.ts` + `useSyncSpeedPaintRenderMode.ts` + campo em `db/types.ts` |
| 10 | Cache com chave incluindo mode+preset | ✅ Correto | `strokeCache.ts:79` — `payload = `${imageUrl}|${JSON.stringify(context)}``` |
| 11 | Vectorizer na main thread com abort | ✅ Correto | `imageProcessing.ts:396-400` (decidiu-se main thread em vez de Worker) |
| 12 | MAX_PATHS_PER_SCENE = 500 | ✅ Correto | `vectorizer.ts:65` + implementação em `truncatePaths()` |
| 13 | Caneta entre paths (fallback) | ✅ Correto | `WhiteboardScene.tsx:171-188` — última path completo como fallback |
| 14 | canvasColor como prop | ✅ Correto | `WhiteboardSceneProps.canvasColor`, usado em `backgroundColor` do SVG |
| 15 | Sem testes de snapshot Remotion | ✅ Aceito | Decisão documentada, fora de escopo |
| 16 | Batch vetorial não suportado | ✅ Documentado | `speedPaintRenderController.tsx:753-761` — limitação explícita |
| 17 | Fallback mask preservado | ✅ Verificado | Testes `imageProcessing.vetorial.integration.test.ts` testam ambos os modos |

---

## 5. Validação dos 4 critérios do gate humano (Fase 5.5 item 7)

| Critério | Status | Evidência |
|---|---|---|
| Lint, typecheck, test, build passam | ✅ OK | `bun run lint` 0 erros, `bun run typecheck` 0 erros, `bun run test` 2264/2264, `bun run build` OK |
| Modo mask preservado | ✅ OK | `renderMode` default 'mask', código mask intacto em `imageProcessing.ts`/`speedPaintRenderer.ts`, testes de integração comprovam |
| Performance < 30s para 10 imagens | ✅ OK | Test e2e valida `totalMs < 60000`, mas latência observada é ~2700ms para 10 imagens — bem abaixo de 30s |
| Code-validator + security + gap-finder aprovaram | 🟡 **Ressalvas** | gap-finder reporta 1 gap MÉDIO (preview) + 1 gap BAIXO (tipagem) — ver abaixo |

---

## 6. Gaps priorizados

### GAP-01 | MÉDIO | Estado ausente | Preview quebra no modo vetorial

**Descrição:** O `SpeedPaintPage` faz cast `job.animation as StrokeAnimation` nas linhas 694 e 744 e passa ao `SpeedPaintPlayer` e `SpeedPaintExportPanel`, que esperam exclusivamente `StrokeAnimation`. Quando o usuário seleciona "Modo Desenho" (`renderMode: 'vetorial'`), `generateStrokesFromImage` retorna `VetorialAnimation`, e o preview (player) vai receber um objeto sem `strokes`/`totalFrames`, causando erro em runtime.

**Tipo:** Fluxo incompleto — a UI de preview não foi atualizada para suportar `VetorialAnimation`.

**Evidência:**
- `SpeedPaintPage.tsx:694` — `animation={job.animation as StrokeAnimation}` passado ao `SpeedPaintPlayer`
- `SpeedPaintPage.tsx:744` — `animation={job.animation as StrokeAnimation}` passado ao `SpeedPaintExportPanel`
- `SpeedPaintPlayer` espera `StrokeAnimation` (não tem overload para `VetorialAnimation`)

**Mitigação verificada:**
- A exportação via controller funciona corretamente (discrimina por `'paths' in animation` em `speedPaintRenderController.tsx:540`)
- O default `renderMode: 'mask'` significa que o fluxo padrão não é afetado
- O seletor de modo existe, mas o preview não acompanhou

**Confidence:** 95 (li o arquivo completo, confirmei a ausência de handling no player)

**Pergunta/Decisão:**
- Corrigir o preview para aceitar `VetorialAnimation` ANTES do release?
- Ou desabilitar o toggle do modo vetorial (ex: disabled com tooltip "Em breve") até o preview estar pronto?
- Ou release com ressalva documentada (modo vetorial funcional apenas via exportação)?

---

### GAP-02 | BAIXO | Tipagem | `useSpeedPaintExporter` só aceita `StrokeAnimation`

**Descrição:** `SpeedPaintExportOptions.animation` (linha 48-58 de `useSpeedPaintExporter.tsx`) é tipado como `StrokeAnimation` apenas. O controller internamente aceita `StrokeAnimation | VetorialAnimation` (linha 538 de `speedPaintRenderController.tsx`), mas a fachada pública não reflete isso. O cast em `SpeedPaintPage` (`as StrokeAnimation`) "engana" o TypeScript, e o controller discrimina corretamente em runtime, mas a tipagem enganosa pode causar confusão em manutenção futura.

**Tipo:** Decisão pendente — estender tipo ou aceitar limitação.

**Confidence:** 85

**Recomendação:** Mudar `SpeedPaintExportOptions.animation` para `StrokeAnimation | VetorialAnimation` e propagar a união pela cadeia de consumo.

---

### GAP-03 | INFORMAÇÃO | Documentação | `speedPaintRenderer.ts` não modificado

**Descrição:** O plano §7:468 listava `speedPaintRenderer.ts` como arquivo modificado. A implementação corretamente não o modificou — o controller seleciona a composição (`createExportableSpeedPaintComposition` vs `createExportableWhiteboardComposition`) antes de chamar `renderMediaOnWeb`, sem usar o `speedPaintRenderer` para o modo vetorial.

**Tipo:** Desalinhamento plano vs implementação (já capturado no tracker como desvio #1).

**Confidence:** 100

---

### GAP-04 | INFORMAÇÃO | Fluxo incompleto | Batch vetorial não suportado

**Descrição:** `runBatchRender()` no controller documenta explicitamente que não suporta modo vetorial (linhas 753-761). A UI não informa o usuário sobre essa limitação. Se o usuário selecionar modo vetorial e tentar batch, o comportamento é inesperado (cai no fallback mask).

**Confidence:** 90

---

### GAP-05 | INFORMAÇÃO | Decisão técnica | Vetorização na main thread (não Worker)

**Descrição:** O plano previa Web Worker, mas a implementação decidiu rodar na main thread com checks de abort (decisão documentada em `imageProcessing.ts:396-400` e Premissa #11). Decisão técnica correta (imagetracerjs não cabe em Blob URL), mas é um desvio do plano original.

**Confidence:** 100

---

## 7. Cenários de borda sem resposta

| Cenário | Status |
|---|---|
| Imagem com 500+ paths e `renderMode: 'vetorial'` | ✅ Mitigado — `MAX_PATHS_PER_SCENE=500` com truncamento e warning |
| Mudança de modo durante processamento | 🟡 Não verificado — store muda imediatamente, mas job em andamento não é abortado |
| Usuário logado vs visitante na persistência | ✅ Ambos cobertos (Firestore logado / IndexedDB visitante) |
| `canvasColor: 'black'` no modo vetorial | ✅ Implementado (Premissa #14) |
| Caneta desaparece entre paths | ✅ Implementado (Premissa #13) — último path completo como fallback |
| 10+ imagens diversas (flat, fotos, logos) | ✅ Testado em `imageProcessing.vetorial.e2e.test.ts` |

---

## 8. Recomendações para o release

### Pré-release (antes de v0.131.0)
1. **Resolver GAP-01**: Corrigir `SpeedPaintPlayer` para aceitar `VetorialAnimation`, OU desabilitar o botão "Modo Desenho" no seletor com tooltip "Em breve" até o preview estar pronto.
2. **Resolver GAP-02**: Tipar `SpeedPaintExportOptions.animation` como `StrokeAnimation | VetorialAnimation`.
3. **Testar manualmente** o fluxo vetorial completo (upload → preview → export) após correção do GAP-01.

### Versionamento
- `0.131.0` conforme planejado (feature não-cosmética)

### Changelog (sugestão)
```
### v0.131.0 — Speed Paint Vetorial

**Novo:** Modo "Desenho" (vetorial) no Speed Paint — animação whiteboard com paths SVG.
- \[gap-finder note] Preview de modo vetorial requer correção (GAP-01) — desabilitado temporariamente.
- Substitui raspadinha (mask) por animação de traço contínuo com caneta seguindo a ponta.
- Preset padrão: `artistic1` (sweet spot para flat/cartoon).
- 16 presets disponíveis para exportação.
- Retrocompatível: projetos existentes continuam no modo "Clássico" (mask).
```

### Comunicação ao time
- Modo vetorial funcional para **exportação** imediatamente
- **Preview** requer correção antes do release completo
- Batch vetorial não suportado nesta versão

---

## 9. TODOs deixados ($12 do plano) — verificação

| TODO do plano | Status |
|---|---|
| 1. Criar este documento | ✅ OK |
| 2. Executar spike experimental | ❌ Removido (decisão Matheus) |
| 3. Revisar resultados do spike com Matheus | 🟡 Pendente (spike não existe, mas revisão visual do resultado final necessária) |
| 4. Se GO: iniciar Fase 1 | ✅ Executado |
| 5. Atualizar AGENTS.md / CLAUDE.md na versão 0.131.0 | ❌ Pendente |

---

## 10. Confiança geral

| Item | Confidence |
|---|---|
| Escopo completo mapeado | 100 |
| Tipos e interfaces corretos | 100 |
| Fallback mask preservado | 100 |
| Composição Remotion determinística | 100 |
| 4 características visuais do §3.2 | 100 |
| Persistência (dual storage) | 90 |
| Preview funcional no modo vetorial | **10** (GAP-01) |
| Performance (10 imagens < 30s) | 95 |

---

## 11. Status Final

### ✅ **Release v0.131.0 aprovado COM RESSALVAS**

O trabalho das Fases 1-5 está **quase completo e funcional**. A implementação segue o plano fonte com desvios documentados e mitigados. O pipeline vetorial (vetorização → composição → exportação) funciona.

**Ressalvas obrigatórias antes do release:**
1. **GAP-01 (MÉDIO):** Preview quebra no modo vetorial — precisa corrigir ou desabilitar o toggle.
2. **GAP-02 (BAIXO):** Tipagem da fachada de exportação não reflete união real dos tipos.

**Total de gaps:** 1 MÉDIO + 1 BAIXO + 3 INFORMAÇÃO

**Recomendação final:** Corrigir GAP-01 e GAP-02, depois prosseguir com o release v0.131.0.
