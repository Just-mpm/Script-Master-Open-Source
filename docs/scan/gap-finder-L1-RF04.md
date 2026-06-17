# Relatório Gap-Finder — Leiva L1 (RF-04)

**Data:** 2026-06-15
**Escopo:** Propagação de `renderMode`/`vetorialPreset` na cadeia do speed paint (Pipeline M2)
**Arquivos alvo:** `speedPaintService.ts`, `speedPaintRenderer.ts`, `useSpeedPaintEnhancer.ts`
**Plano:** `docs/plan/speed-paint-vetorial-completo-plano-final.md`
**Tracker:** `docs/plan/speed-paint-vetorial-completo-tracker.md` (L1)

---

## 1. Contexto Assumido

A L1 (RF-04) faz parte do P0 do plano de consolidação do modo vetorial. Ela deve estender as interfaces da cadeia de geração de speed paint para propagar `renderMode` e `vetorialPreset` desde o ponto de entrada (`SpeedPaintEnhanceOptions`) até o gerador (`generateStrokesFromImage`) e cache (`strokeCache.ts`).

Segundo o tracker, o escopo da L1 é:
1. `SpeedPaintEnhanceOptions` — estender com `renderMode?` + `vetorialPreset?`
2. `GenerateSpeedPaintOptions` — estender com `renderMode?` + `vetorialPreset?`
3. `generateScenesWithSpeedPaint` — propagar para `getStrokeAnimation` e `generateStrokesFromImage`
4. `UseSpeedPaintEnhancerOptions` — ler da `animationStore` via `useShallow`

---

## 2. Mapa Rápido: Sólido vs Frágil

| Aspecto | Avaliação |
|---------|-----------|
| Propagação `SpeedPaintEnhanceOptions → GenerateSpeedPaintOptions` | ✅ Sólido |
| Propagação `GenerateSpeedPaintOptions → cache (getStrokeAnimation)` | ✅ Sólido |
| Propagação `GenerateSpeedPaintOptions → generateStrokesFromImage` | ✅ Sólido |
| Type guards reais (sem `as` bypass) | ✅ Sólido |
| Retrocompatibilidade (campos opcionais) | ✅ Sólido |
| Cobertura de testes (CT-F25 a CT-F30) | ✅ Sólido (path batch) |
| `useSpeedPaintEnhancer` lê da `animationStore` | ⚠️ Frágil (divergência do tracker) |
| Consumidores passando `renderMode`/`vetorialPreset` | ❌ Frágil (fora do escopo da L1) |
| Cobertura de `generateWithWorker` | ⚠️ Ausente (0%) |
| Testes de `speedPaintService.ts` | ❌ Ausentes |

---

## 3. Gaps Priorizados

### 3.1 GAP-01: `UseSpeedPaintEnhancerOptions` não lê da `animationStore`

| Campo | Valor |
|-------|-------|
| **ID** | GAP-01-L1 |
| **Severidade** | BAIXO (rebaixado de MÉDIO via confidence gate) |
| **Tipo** | Desalinhamento tracker vs arquitetura |
| **Confidence** | 85 (rebaixado para BAIXO) |
| **Descrição** | O tracker da L1 diz: "`UseSpeedPaintEnhancerOptions` ler da `animationStore` via `useShallow`". A implementação recebe `renderMode`/`vetorialPreset` via **parâmetros explícitos** nas options do hook, sem ler da store. O único consumidor (`VideoPreview.tsx` linha 223) chama `useSpeedPaintEnhancer(mappedScenes, { enabled: animateScenes })` sem passar `renderMode`/`vetorialPreset` — o que faz o hook cair para `undefined` (modo `mask` padrão). |
| **Evidência** | `speedPaintRenderer.ts` MDE-02 define "(b) parâmetros explícitos em toda a cadeia". A implementação seguiu MDE-02, não o tracker. `VideoPreview.tsx:223-225` mostra a chamada sem os parâmetros. |
| **Mitigações verificadas** | A arquitetura (MDE-02) defende parâmetros explícitos, não leitura da store. O tracker está desalinhado com a decisão de arquitetura. |
| **Impacto real** | Nenhum — os consumidores que precisam do modo vetorial (SpeedPaintPage lado a lado) usarão `generateStrokesFromImage` diretamente ou receberão via options quando as leivas L3+ integrarem. A propagação via `useSpeedPaintEnhancer` é apenas para preview no `VideoPreview`, que é gated por `animateScenes` (toggle da VideoPage). |
| **Pergunta/Decisão** | Atualizar o tracker para refletir MDE-02 (parâmetros explícitos) em vez de leitura da store. A leitura da store será feita pelos **consumidores** (VideoPreview, videoRenderController) nas leivas L3/L7. |

---

### 3.2 GAP-02: `generateWithWorker` sem cobertura de testes

| Campo | Valor |
|-------|-------|
| **ID** | GAP-02-L1 |
| **Severidade** | BAIXO |
| **Tipo** | Cobertura de teste ausente |
| **Confidence** | 95 |
| **Descrição** | Todos os 7 testes de propagação (CT-F25 a CT-F30 e CT-B07) usam `supportsStrokeWorker: vi.fn().mockReturnValue(false)`, forçando o path `generateWithBatch`. O path `generateWithWorker` tem a **mesma lógica de propagação** (branch ternário, type guards, fallback) mas não é testado isoladamente. |
| **Evidência** | `tests/video-render/speedPaintRenderer.unit.test.ts:986` — `supportsStrokeWorker: vi.fn().mockReturnValue(false)` em todos os testes. A função `generateWithWorker` (linhas 313-415) não é exportada e não tem testes dedicados. |
| **Mitigações verificadas** | A lógica de propagação é IDÊNTICA entre `generateWithWorker` e `generateWithBatch` — ambas extraem `renderMode`/`vetorialPreset` do context, calculam `effectiveMode`/`effectivePreset`, e usam o mesmo branch ternário. A diferença é só no mecanismo de processamento (Worker vs main thread), não na propagação. Além disso, o path Worker só é ativado com `>5 cenas + suporte OffscreenCanvas` — raro em ambiente de teste. |
| **Impacto real** | Mínimo. A propagação é idêntica. Risco de regressão apenas se alguém modificar a propagação só no Worker path. |
| **Ação sugerida** | Adicionar 1 teste smoke que force o path Worker (`useWorker: true`, `supportsStrokeWorker: true`, `>5 cenas`) e verifique que `getStrokeAnimation` é chamado com `mode` correto. |

---

### 3.3 GAP-03: `speedPaintService.ts` sem testes

| Campo | Valor |
|-------|-------|
| **ID** | GAP-03-L1 |
| **Severidade** | BAIXO |
| **Tipo** | Cobertura de teste ausente |
| **Confidence** | 90 |
| **Descrição** | `speedPaintService.ts` (142 linhas, função `enhanceScenesWithSpeedPaint`) não tem nenhum teste unitário. A propagação de `renderMode`/`vetorialPreset` nesta camada não é verificada. O service orquestra cache + renderer + warnings. |
| **Evidência** | `glob` para `**/speedPaintService*.test*` retornou 0 arquivos. `generateScenesWithSpeedPaint` é testado em `speedPaintRenderer.unit.test.ts`, mas o service que o envolve não. |
| **Mitigações verificadas** | A propagação é um `pass-through` — `enhanceScenesWithSpeedPaint` extrai `renderMode`/`vetorialPreset` das options e injeta em `generateScenesWithSpeedPaint({ useWorker: true, renderMode, vetorialPreset })`. Não há lógica condicional na propagação. |
| **Impacto real** | Baixo. A propagação no service é direta (1 linha). |
| **Ação sugerida** | Opcional — adicionar 1 teste de integração que mocke o renderer e verifique que `renderMode`/`vetorialPreset` chegam corretamente. |

---

### 3.4 GAP-04: `makeL1Options` cast residual

| Campo | Valor |
|-------|-------|
| **ID** | GAP-04-L1 |
| **Severidade** | BAIXO |
| **Tipo** | Dívida técnica / limpeza |
| **Confidence** | 100 |
| **Descrição** | O helper `makeL1Options` (linhas 922-928) usa `as unknown as ...` porque os testes foram escritos **antes** da implementação da L1, quando `GenerateSpeedPaintOptions` ainda não tinha `renderMode`/`vetorialPreset`. Agora que a interface de produção já tem os campos, o cast pode ser removido e o tipo de produção usado diretamente. |
| **Evidência** | `tests/video-render/speedPaintRenderer.unit.test.ts:922-928` — `return opts as unknown as Parameters<...>` |
| **Mitigações verificadas** | Funciona corretamente. O cast não causa erro de type safety porque ambas as interfaces agora têm os mesmos campos. |
| **Impacto real** | Nenhum. Apenas dívida técnica de legibilidade. |
| **Ação sugerida** | Remover o tipo `L1GenerateSpeedPaintOptions` e o helper `makeL1Options`, usando o tipo de produção `GenerateSpeedPaintOptions` diretamente. |

---

### 3.5 Não-gaps: Consumidores que não propagam

Os seguintes consumidores NÃO passam `renderMode`/`vetorialPreset`, mas **estão fora do escopo da L1**:

| Consumidor | Leiva | RF | Previsto |
|------------|-------|----|----------|
| `VideoPreview.tsx:223` | L3 / L7 (P2) | RF-02 / RF-06 | Será integrado quando o seletor de modo/preset existir na UI |
| `videoRenderController.tsx:275` | L7 (P2) | RF-06 | `videoRenderBridge` sincronizará modo da store |
| `BatchOrchestrator.tsx:102` | L5 | RF-08 | Leitura da `animationStore` diretamente |
| `speedPaintRenderController.tsx:833` | L8 (P2) | RF-07 | `runBatchRender` aceitará `renderMode` como parâmetro |

**Conclusão:** Esses consumidores não são gaps da L1. Foram mapeados no plano como dependências de leivas posteriores.

---

## 4. Cenários de Borda Sem Resposta

### CT-C05: Retrocompatibilidade total
- ✅ `renderMode?` opcional em todas as interfaces → default `mask`
- ✅ `options?` opcional no hook e functions → chamadas legadas sem options funcionam
- ✅ Type guards reais → `VetorialAnimation` não é confundido com `StrokeAnimation`
- ✅ Cache SHA-256 já discrimina por `mode + preset`
- Verificado: `generateScenesWithSpeedPaint` sem options (CT-F27, linha 1085) funciona e cai para `mode: 'mask'`

### Path Worker (generateWithWorker)
- Código implementa propagação idêntica ao batch path
- Testes ausentes — mas lógica é estruturalmente igual
- Risco aceito para L1

---

## 5. Checklist de Sanidade

- [x] Li os 3 arquivos da L1 COMPLETOS (speedPaintService.ts, speedPaintRenderer.ts, useSpeedPaintEnhancer.ts)
- [x] Verifiquei com `analyze_aitool_find` que as interfaces não são usadas em nenhum outro lugar inesperado
- [x] Verifiquei consumidores com `analyze_aitool_find` (useSpeedPaintEnhancer → VideoPreview, enhanceScenesWithSpeedPaint → videoRenderController)
- [x] Confirmei que há handling no parent (Suspense/ErrorBoundary) — N/A para types/funções
- [x] Verifiquei que a ausência de leitura da store no hook é intencional (segue MDE-02)
- [x] Confirmei que usuário REAL seria afetado apenas indiretamente (modo vetorial não funcionaria no VideoPreview até L3+)
- [x] Consultei `imageProcessing.ts` para confirmar que `GenerateStrokesOptions` aceita os campos
- [x] Verifiquei `strokeCache.ts` (via file_context) que já discrimina por `mode + preset`
- [x] Testes lidos e confirmados (CT-F25 a CT-F30, CT-B07)

---

## 6. Veredicto Final

### ✅ **PARCIALMENTE ALINHADO** (com 4 gaps de severidade BAIXA)

| Item | Status | Observação |
|------|--------|------------|
| `SpeedPaintEnhanceOptions` com `renderMode?` + `vetorialPreset?` | ✅ Completo | Obrigatório seria breaking; opcional é o correto (MDE-11) |
| `GenerateSpeedPaintOptions` com `renderMode?` + `vetorialPreset?` | ✅ Completo | Igual |
| Propagação para `getStrokeAnimation` | ✅ Completo | Branch ternário nos 2 paths |
| Propagação para `generateStrokesFromImage` | ✅ Completo | `effectiveMode` + `effectivePreset` |
| Type guards reais (sem `as`) | ✅ Completo | `isVetorialAnimation`/`isStrokeAnimation` |
| Cobertura CT-F25 a CT-F30 | ✅ Completo | 7 testes passando |
| `useSpeedPaintEnhancer` ler da store | ⚠️ Desalinhado (BAIXO) | Implementou parâmetros explícitos (MDE-02) — tracker precisa ser atualizado |
| Cobertura `generateWithWorker` | ⚠️ Ausente (BAIXO) | Lógica idêntica ao batch, mas sem teste |
| Testes `speedPaintService.ts` | ⚠️ Ausente (BAIXO) | Service não tem testes |
| Cast residual `makeL1Options` | ⚠️ Dívida técnica (BAIXO) | Pode ser limpo |

**Resumo:** A implementação da L1 está **correta e completa** nos 3 arquivos-alvo. Os 4 gaps encontrados são de severidade **BAIXA** — dois de cobertura de teste, um de desalinhamento tracker vs arquitetura, e um de dívida técnica. Nenhum deles bloqueia a feature ou afeta usuários reais no momento.

**Recomendação:** A L1 pode ser marcada como concluída. Os gaps são aceitáveis para seguir para L2. O desalinhamento do tracker (ler da store vs parâmetros explícitos) deve ser resolvido atualizando a descrição da L1 no tracker para refletir MDE-02.

---

### Total de gaps por severidade

| Severidade | Quantidade |
|-----------|-----------|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 0 |
| BAIXO | 4 |
| **Total** | **4** |
