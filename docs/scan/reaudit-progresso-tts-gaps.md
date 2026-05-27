# Re-auditoria: Simulação de Progresso TTS (Pós-Correção)

**Data:** 2026-05-27 | **Versão:** 0.102.0 | **Propósito:** Verificar se GAP-001 foi resolvido e se restam lacunas

---

## 1. Contexto Assumido

- A simulação de progresso durante geração de áudio TTS usa um `setInterval` de 60s para incrementar `progressTicks` e mapear para progresso (`(tick / estimatedChunks) * 50`, cap 49%)
- A Cloud Function `audioPreflight` retorna `estimatedChunkCount` — número estimado de chamadas TTS ao Gemini
- O timer existe apenas enquanto a Cloud Function `audio` está rodando; é limpo assim que a resposta chega
- Fora do timer, o progresso real avança: 10% (pré-audio) → 50% (áudio pronto) → 60-98% (cenas) → 100%

---

## 2. Mapa Rápido: Sólido vs Frágil

### Sólido ✅

| Item | Status |
|------|--------|
| `AudioPreflightSummary.estimatedChunkCount` | Presente e tipado como `number` (obrigatório) |
| `isAudioPreflightSummary` guard valida `estimatedChunkCount` como `number` | Linha 77 de `AudioGenerationHandler.tsx` |
| `GenerateOptions.estimatedChunkCount` | Campo opcional (`?: number`) com JSDoc (linha 118) |
| `confirmGenerate()` propaga | `nextOptions.estimatedChunkCount = preflight.estimatedChunkCount` (linha 259) |
| `generateAudio()` lê campo correto | `options.estimatedChunkCount ?? 0` (linha 440) — não mais `options.preflight?.totalPlanned` |
| Timer usa `progressTimerRef.current` (useRef) | Declarado na linha 270, setado na 444, limpo nas linhas 461-463, 777-779 |
| Cleanup no `useEffect` de unmount | Linhas 286-297 — limpa `errorTimerRef` e `progressTimerRef` |
| Cleanup no `finally` | Linhas 777-780 — garantido mesmo com `return` no `catch` |
| Cleanup antecipado no `try` | Linhas 461-463 — antes de processar a resposta, evita ticks fantasmas |

### Frágil ⚠️

| Item | Risco |
|------|-------|
| Caminho dev bypass sem preflight | Timer nunca inicia (sem `estimatedChunkCount`) |
| `estimatedChunkCount = 0` (back incorreto) | Timer nunca inicia |
| Intervalo fixo de 60s | Pode não refletir performance real do backend |
| `progressTicks` via closure `let` | Funciona (closure do `useCallback` com `[]` deps), mas é menos robusto que `useRef` |

---

## 3. GAP-001 — Verificação das Correções

### O problema original
O timer usava `options.preflight?.totalPlanned` (total de créditos), que **não é** o número de chunks TTS. Para roteiros longos, `totalPlanned` e `estimatedChunkCount` diferem significativamente, resultando em progresso que nunca atingia 49% dentro do tempo real de processamento.

### As 3 correções aplicadas

| Correção | Status | Evidência |
|----------|--------|-----------|
| `GenerateOptions.estimatedChunkCount?: number` | ✅ Presente | `useAudioGenerator.ts:118` |
| `confirmGenerate()` propaga `preflight.estimatedChunkCount` | ✅ Correta | `AudioGenerationHandler.tsx:259` |
| Timer lê `options.estimatedChunkCount ?? 0` | ✅ Correta | `useAudioGenerator.ts:440` |
| Timer usa `progressTimerRef.current` | ✅ Correta | `useAudioGenerator.ts:270,444,461-463,777-779` |
| `progressTimerRef` limpo no `useEffect` unmount | ✅ Presente | `useAudioGenerator.ts:292-295` |
| `progressTimerRef` limpo no `finally` | ✅ Presente | `useAudioGenerator.ts:777-780` |

**Conclusão: GAP-001 está completamente resolvido.** ✅

---

## 4. Gaps Detectados (Pós-Correção)

### GAP-002 (BAIXO) — Dev bypass: progresso sem estimativa de chunks

| Campo | Valor |
|-------|-------|
| **Severidade** | BAIXO |
| **Confidence** | 95 |
| **Tipo** | Fluxo incompleto (caminho alternativo) |

**Descrição:**
Em ambiente de desenvolvimento (`import.meta.env.DEV && VITE_USE_EMULATORS === 'true'`), quando o preflight falha ou retorna resultado inesperado, o `handleGenerate` pode chamar `generateAudio(options)` diretamente (linhas 208 e 229 de `AudioGenerationHandler.tsx`). As `options` passadas vêm de `buildGenerateOptions()`, que **não** inclui `estimatedChunkCount`. O timer então recebe `estimatedChunks = 0` e nunca inicia, deixando o progresso travado em 10% até a resposta real.

**Mitigações verificadas:**
- Caminho só é ativado em dev + emuladores (`SHOULD_SKIP_BROKEN_PREFLIGHT_IN_DEV`)
- A resposta real, quando chega, corrige o progresso (50% imediatamente)
- Usuário real (produção) nunca passa por esse caminho

**Pergunta para decisão:**
> Este bypass em dev é aceitável, ou queremos um fallback de `estimatedChunkCount` calculado via `Math.ceil(script.length / 500)` como valor paliativo?

---

### GAP-003 (BAIXO) — `estimatedChunkCount = 0` sem fallback

| Campo | Valor |
|-------|-------|
| **Severidade** | BAIXO |
| **Confidence** | 85 |
| **Tipo** | Risco técnico (dependência ignorada) |

**Descrição:**
Se o backend retornar `estimatedChunkCount: 0` (ex: por bug no preflight ao estimar chunks para roteiros muito curtos), o timer não inicia e o progresso fica em 10% até o retorno real. Não há fallback para estimar chunks localmente.

**Mitigações verificadas:**
- Roteiros curtos (< 500 chars) geram 1 chunk — mesmo que o timer não inicie, o backend responde rápido
- Não há requisito de progresso "perfeito" durante a chamada async
- O progresso real (50%) substitui o simulado assim que a resposta chega

**Pergunta para decisão:**
> Adicionar fallback `Math.ceil(script.length / 500)` no `generateAudio` caso `estimatedChunks <= 0`?

---

## 5. Cenários de Borda Sem Resposta

| Cenário | Impacto | Resposta atual |
|---------|---------|----------------|
| Timer dispara depois da Cloud Function retornar mas antes do cleanup no `try` | Extremamente improvável (JS single-thread + await já completou) | Cleanup no `finally` garante que será limpo |
| Timer roda enquando `generateScenes` está rodando (pós-áudio) | Não acontece: timer é limpo antes de processar o áudio (linha 461-463), e a geração de cenas usa progresso real 60-98% | ✅ Coberto |
| Duas chamadas simultâneas a `generateAudio` | Não é possível: store `isGenerating` bloqueia UI, e `generateAudio` sobrescreveria `progressTimerRef.current` causando leak | ⚠️ Risco: se chamado novamente sem limpeza anterior, perde referência do timer anterior |

**Sobre o cenário de chamadas simultâneas:** Se `generateAudio` for chamado enquanto outro `generateAudio` ainda está rodando (o que `isGenerating` deveria impedir, mas é possível via bypass direto), o `progressTimerRef.current` sobrescreve a referência do timer anterior sem limpá-lo. **Risco baixíssimo** (impedido pela UI), mas vale documentar.

---

## 6. Checklist de Sanidade

- [x] Li o `AudioPreflightSummary` completo — `estimatedChunkCount` é `number` obrigatório
- [x] Confirmei que `isAudioPreflightSummary` valida o campo (linha 77)
- [x] Verifiquei que `confirmGenerate()` propaga (linha 259)
- [x] Confirmei que `generateAudio()` lê `options.estimatedChunkCount ?? 0` (linha 440)
- [x] Timer usa `progressTimerRef.current` (useRef) — linha 444
- [x] Cleanup no `try` (linhas 461-463) + `finally` (linhas 777-780) + `useEffect` unmount (linhas 292-295)
- [x] Verifiquei os 2 caminhos de bypass em dev (linhas 203-208 e 222-231)
- [x] `buildGenerateOptions` não inclui `estimatedChunkCount` — intencional (vem só do preflight)
- [x] Nenhum erro de lint/typecheck introduzido (projeto builda)

---

## 7. Resumo

| Severidade | Gaps |
|------------|------|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 0 |
| BAIXO | 2 (GAP-002, GAP-003) |

**GAP-001 (CRÍTICO) resolvido completamente.** ✅

As 2 lacunas restantes são de baixa severidade — afetam apenas dev bypass (GAP-002) ou dependem de bug no backend (GAP-003). Nenhuma delas impacta usuário real em produção. A única recomendação acionável seria adicionar fallback local de `estimatedChunkCount` baseado no tamanho do roteiro (ex: `Math.ceil(script.length / 500)`), eliminando ambos os gaps com uma linha.
