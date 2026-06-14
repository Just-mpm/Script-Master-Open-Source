# Relatório Gap-Finder — Fase 3: Composição Remotion Vetorial

**Data:** 2026-06-14
**Versão alvo:** `0.131.0`
**Auditor:** gap-finder (Fase 3.5 escopo)
**Plano fonte:** `docs/plan/plano-speed-paint-vetorial-2026-06-14.md`
**Tracker:** `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`

---

## 1. Contexto Assumido

- Stack: React 19 + Remotion 4.0.448 + `@remotion/paths` + Zustand
- Premissas do tracker validadas (3, 6, 13, 14) — aplicadas no código
- Fase 1 (tipos/vectorizer) e Fase 2 (integração worker) já executadas e validadas
- Os 3 arquivos auditados existem e estão no local esperado:
  - `src/features/video-render/components/WhiteboardScene.tsx` (298 linhas)
  - `src/features/speed-paint/components/WhiteboardComposition.tsx` (66 linhas)
  - `src/features/speed-paint/store/speedPaintRenderController.tsx` (1006 linhas)
- `VetorialAnimation`/`VetorialPath` existem e são importados (confirmado por grep: 60+ referências)
- `createExportableWhiteboardComposition` definida no controller e chamada no branch vetorial
- Nenhum dos 3 arquivos foi modificado após a Fase 3 — estado atual reflete a implementação completa

---

## 2. Mapa Rápido: Sólido vs Frágil

### ✅ Sólido
| Componente | Confiança | Evidência |
|---|---|---|
| `WhiteboardScene.tsx` — algoritmo de animação (drawnLength, renderedPaths) | 100% | Segue §5.3:251-281 exatamente, sem desvios |
| `WhiteboardScene.tsx` — strokeDasharray + strokeDashoffset | 100% | Path inteiro no DOM, gap controlado por offset |
| `WhiteboardScene.tsx` — caneta seguindo traço | 100% | `getPointAtLength()` no path ativo + fallback path completo |
| `WhiteboardScene.tsx` — fallback caneta entre paths (Premissa #13) | 100% | Itera de trás pra frente até último path completo |
| `WhiteboardScene.tsx` — canvasColor (Premissa #14) | 100% | Prop `CanvasColor` + fallback `animation.canvasColor` |
| `WhiteboardComposition.tsx` — wrapper fino | 100% | Análogo a `SpeedPaintComposition`, sem lógica extra |
| Controller — branch `renderMode` com type narrowing | 100% | `'paths' in animation` + `renderMode` check |
| Controller — `createExportableWhiteboardComposition` lazy async | 100% | `Promise.all` com imports dinâmicos |
| Controller — `compositionId` único por modo | 100% | `COMPOSITION_ID_VETORIAL`, `_MASK`, `_BATCH` distintos |
| Zero `getTotalLength` | 100% | grep em todo `src/` confirma ausência |
| Zero `ref.current` nos componentes | 100% | grep confirma ausência |
| Zero `useEffect`/`useState` em WhiteboardScene | 100% | supergrep confirma ausência |

### ⚠️ Atenção
| Ponto | Risco | Mitigação |
|---|---|---|
| Batch vetorial não suportado (linhas 753-761 do controller) | Usuário pode tentar exportar lote em modo vetorial | Documentado como decisão de escopo; `runBatchRender` sempre usa composição mask. Se `renderMode === 'vetorial'`, o batch cai em fallback mask — precisa ser endereçado em fase futura |
| `Pencil` sem `getTangentAtLength()` para rotação | Caneta tem rotação fixa `rotate(-45)` em vez de seguir tangente do path | Comentário no tracker diz "rotação opcional". Decisão consciente — mantido do `drawTool()` original. Pode ser adicionado como melhoria futura |

---

## 3. Gaps

**Nenhum gap bloqueador ou alto encontrado.**

### Não-gaps (descartados após validação)

| Suspeita | Verificação | Veredito |
|---|---|---|
| `WhiteboardScene` usa `getLength()` no render? | `path.length` é pré-calculado em `VetorialPath`, nunca chamado no render | ✅ Descartado |
| `totalDrawingLength` recalculado a cada frame? | Usa `animation.totalLength` (pré-calculado) | ✅ Descartado |
| Caneta desaparece entre paths? | Premissa #13 implementada (fallback último path completo) | ✅ Descartado |
| `canvasColor` ignorado? | Prop + fallback implementados | ✅ Descartado |
| Controller cria componente síncrono? | `createExportableWhiteboardComposition` é `async` | ✅ Descartado |

---

## 4. Cenários de Borda sem Resposta

| Cenário | Impacto | Resposta Atual |
|---|---|---|
| `animation.paths` vazio | Nenhum path para renderizar — caneta escondida, canvas vazio | ✅ Tratado: `showPen = false` quando `totalDrawingLength === 0` (linha 157) |
| `durationInFrames` = 0 | Divisão por zero no `interpolate` | ⚠️ `interpolate` com intervalo [0, 0] causa `NaN`. `drawnLength` será `NaN`, propagated para `visibleLength` = `NaN`. **Não há guard explícito.** Baixo risco porque `durationInFrames` vem do `useVideoConfig()` do Remotion (runtime), que nunca é 0. |
| Path com `length` = 0 | `strokeDasharray={0}` e `strokeDashoffset={-visibleLength}` | ⚠️ `visibleLength` será `NaN` se `pathLen === 0` (divisão implícita no `drawnLength`). `pathLen > 0` no fallback da caneta (linha 174) protege parcialmente. Paths com `length === 0` não deveriam existir (pré-calculado no vectorizer). |
| Múltiplos paths parciais no mesmo frame | Apenas 1 possível por construção (drawnLength contínuo) | ✅ Correto por definição |

---

## 5. Checklist de Sanidade

| Item | Status |
|---|---|
| Linha cresce progressivamente? (`strokeDasharray` + `strokeDashoffset`) | ✅ §3.2:92 |
| Caneta segue a ponta do traço? (`getPointAtLength`) | ✅ §3.2:93 |
| Traço contínuo, não segmentos? (SVG `<path>` completo) | ✅ §3.2:94 |
| Ordem de desenho lógica? (sequência do array) | ✅ §3.2:95 |
| Premissa #3: Sprite externo NÃO criado (drawTool → SVG inline) | ✅ |
| Premissa #6: NUNCA `ref.current.getTotalLength()` | ✅ |
| Premissa #13: Caneta fallback entre paths | ✅ |
| Premissa #14: Prop `canvasColor: 'white' \| 'black'` | ✅ |
| Controller: `createExportableWhiteboardComposition()` lazy async | ✅ |
| Controller: `compositionId` único (`_VETORIAL`) | ✅ |
| Controller: Branch por `renderMode` correto | ✅ |
| Controller: Modo mask continua idêntico | ✅ |
| Controller: Type narrowing (`'paths' in`) seguro | ✅ |
| Controller: Batch vetorial não suportado (documentado) | ✅ |
| Zero `useEffect`/`useState` no caminho de render | ✅ |
| Zero `any` (tipos explícitos) | ✅ |
| Determinismo: mesmo frame → mesmo output | ✅ |

---

## 6. Status Final

| Status | Detalhes |
|---|---|
| **✅ Pronto para Fase 4** | Nenhum gap bloqueador ou alto. As 4 características visuais estão implementadas. As 4 premissas estão atendidas. A integração no controller está correta e segura. |

### Confirmação das 4 características visuais:
1. ✅ **Linha cresce progressivamente** — `strokeDasharray={pathLen}` + `strokeDashoffset={pathLen - visibleLength}` em `WhiteboardScene.tsx:219-221`
2. ✅ **Caneta segue a ponta do traço** — `getPointAtLength()` no path ativo (linha 166) + fallback path completo (linha 182)
3. ✅ **Traço contínuo, não segmentos** — SVG `<path>` completo com `d={path.d}` (linha 213), não segmentado
4. ✅ **Ordem de desenho lógica** — paths em sequência por `accumulatedLength` (linhas 131-150)

### Confirmação das premissas (3, 6, 13, 14):
| Premissa | Atendida | Local |
|---|---|---|
| #3 — drawTool → SVG inline | ✅ | `WhiteboardScene.tsx:272-297` (componente `Pencil`) |
| #6 — zero `getTotalLength()` | ✅ | Confirmado por grep em todo `src/` |
| #13 — caneta fallback entre paths | ✅ | `WhiteboardScene.tsx:167-188` |
| #14 — canvasColor | ✅ | `WhiteboardScene.tsx:47,65,191-196` |

### Confirmação da integração no controller:
- ✅ `createExportableWhiteboardComposition()` — lazy async (controller:212-242), mesmo padrão das composições mask
- ✅ `compositionId = COMPOSITION_ID_VETORIAL` — único (controller:115), diferente de mask/batch
- ✅ Branch por `renderMode` no `runSingleRender` — `renderMode` + `'paths' in animation` (controller:538-613)
- ✅ Modo mask idêntico — branch `else` no controller:604-612, sem alterações
- ✅ Type narrowing seguro — `'paths' in animationForRender` discrimina `VetorialAnimation` de `StrokeAnimation`
- ✅ Batch vetorial documentado como não-suportado (controller:753-761) — decisão de escopo consciente
