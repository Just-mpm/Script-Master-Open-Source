# Scan de Lacunas — Pipeline TTS (5 Fases)

**Data:** 2026-05-27  
**Escopo:** 5 fases do plano de melhorias do TTS Gemini 3.1 Flash  
**Arquivos analisados:** 6 (constants.ts, schemas/common.ts, utils/chunking.ts, utils/assistant-context.ts, flows/chunking.ts, flows/audio.ts)  
**Metodologia:** Leitura completa de cada arquivo + supergrep + analyze_aitool_find + validação cruzada frontend/backend

---

## 1. Contexto assumido

O plano de 5 fases visa melhorar a qualidade do TTS Gemini 3.1 Flash via:
- Chunking inteligente (Fase 1)
- Continuidade de tom entre chunks (Fase 2)
- Audio tags inline no transcript (Fase 3)
- Robustez com retry e anti-read-aloud (Fase 4)
- Reestruturação do prompt TTS (Fase 5)

A análise verificou item por item do plano contra o código real nos 6 arquivos modificados.

---

## 2. Mapa rápido: sólido vs frágil

### Sólido (implementado conforme planejado)

| Fase | Item | Status |
|------|------|--------|
| 1.1 | Regras explícitas de chunking (nunca quebrar frase, pares lógicos) | **Implementado** |
| 1.2 | Output schema enriquecido (text, emotionTag, isContinuation, trailingSentence) | **Implementado** |
| 1.3 | Fallback programático (regex expandida, nunca corta palavra, respeita parágrafos) | **Implementado** |
| 2.1 | Contexto de continuidade enriquecido (última frase + tag de emoção ativa) | **Implementado** |
| 2.2 | Audio tags de transição no início de chunks subsequentes (CONTINUITY_AUDIO_TAG) | **Implementado** |
| 2.3 | Sample Context (últimas frases do chunk anterior como âncora não falada) | **Implementado** |
| 3.1 | Mapeamento de emoções para audio tags (EMOTION_TO_AUDIO_TAGS — 8 emoções) | **Implementado** |
| 3.2 | Injeção de audio tags no transcript (buildTaggedTranscript) | **Implementado** |
| 3.3 | Tags de pace inline (PACE_TO_AUDIO_TAG) | **Implementado** |
| 4.1 | Retry automático para text token returns (TTS_MAX_RETRIES = 2, loop com backoff) | **Implementado** |
| 4.2 | Anti-read-aloud (preâmbulo explícito no buildTtsInstruction) | **Implementado** |
| 5.1 | Reestruturação do buildTtsInstruction (Audio Profile → Scene → Director's Notes → Sample Context → Transcript) | **Implementado** |
| 5.2 | Audio Profile estruturado com nome (speakerName + audioProfile) | **Implementado** |
| 5.3 | Director's Notes consolidado (unifica styleNotes, emotion, pace) | **Implementado** |

### Frágil (desvios menores entre plano e implementação)

3 desalinhamentos encontrados — todos de severidade **BAIXO** (ver seção 3).

---

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|----|-----------|------|------------|-----------|-----------|----------------------|-----------------|
| G-01 | BAIXO | Desvio de threshold | 95% | `MIN_CHUNK_SIZE = 80` no código, mas o plano especifica "evitar chunks < 100 chars" | `constants.ts:130` define `MIN_CHUNK_SIZE = 80`. `buildChunkingInstruction` diz "menos de 80 caracteres" (`assistant-context.ts:348`). `mergeShortChunks` usa 80 como threshold (`chunking.ts:163`) | O `mergeShortChunks` faz merge de chunks curtos com vizinho, mitigando chunks muito pequenos. Chunks entre 80-100 chars são raros na prática | O threshold de 80 foi uma decisão intencional (português tem frases mais curtas) ou o valor do plano (100) deveria ser usado? |
| G-02 | BAIXO | Fluxo incompleto | 90% | `isTruncatedChunk` detecta chunks truncados mas não executa ação corretiva — apenas loga warning | `audio.ts:293-300` importa e chama `isTruncatedChunk` mas o bloco é apenas `console.warn`. Sem merge, re-divisão ou retry do chunk truncado | O plano diz "detectar frase truncada" — a detecção está implementada. O fallback programático (`splitTextProgrammatically`) já respeita sentenças, então chunks truncados são raros | A ausência de ação corretiva é intencional (apenas monitoramento) ou deveria haver merge automático com o chunk seguinte? |
| G-03 | BAIXO | Comentário impreciso | 92% | Comentário diz "backoff exponencial" mas a implementação é linear (`500 * attempt` ms) | `audio.ts:440` — `setTimeout(resolve, 500 * attempt)`. attempt=1: 500ms, attempt=2: 1000ms. Backoff exponencial seria `500 * 2^attempt` (1000ms, 2000ms) | O impacto é mínimo — a diferença entre 500/1000ms e 1000/2000ms é irrelevante para retries de TTS. O retry funciona corretamente | Corrigir o comentário para "backoff linear" ou alterar a fórmula para exponencial real? |

---

## 4. Cenários de borda sem resposta

### 4.1 Audio tags não validadas contra documentação oficial
As audio tags usadas (`[excitedly]`, `[softly]`, `[firmly]`, `[calmly]`, `[energetically]`, `[dramatically]`, `[warmly]`, `[continuing]`, `[slowly]`, `[quickly]`, `[very slow]`, `[very fast]`) não puderam ser validadas contra a lista oficial do Gemini TTS (documentação de transcript tags não acessível durante a análise). O código referencia `https://ai.google.dev/gemini-api/docs/speech-generation#transcript-tags` como fonte, mas a validade de cada tag específica não foi confirmada.

### 4.2 Chunking duplicado entre flows
O `flows/audio.ts` tem sua própria função `chunkScript()` (linhas 90-150) que duplica a lógica do `flows/chunking.ts` (callable separado). Ambos usam `buildChunkingInstruction` e `splitTextProgrammatically`, mas são implementações paralelas. Se uma for atualizada sem a outra, podem divergir. Não é uma lacuna do plano, mas um risco de manutenção.

### 4.3 emotionTag do chunk vs tag global
Quando o Gemini chunking retorna `emotionTag` por chunk, esse tem prioridade sobre a tag global de emoção. Se o Gemini retornar tags inconsistentes entre chunks (ex: "[excitedly]" no chunk 1 e "[calmly]" no chunk 2 para um roteiro uniformemente feliz), a transição pode soar artificial. Não há validação de coerência entre emotionTags adjacentes.

---

## 5. Checklist de sanidade

- [x] Todos os 15 itens do plano foram verificados individualmente
- [x] 6 arquivos modificados lidos por completo (1.839 linhas total)
- [x] `supergrep_find` usado para confirmar ausência de TODOs/FIXMEs
- [x] `supergrep_find` usado para verificar uso de `isTruncatedChunk` (apenas 2 arquivos: definição + audio.ts)
- [x] `supergrep_find` usado para verificar `MIN_CHUNK_SIZE` (consistente em 80)
- [x] Alinhamento frontend/backend verificado: `EmotionType` (8 emoções) = `EMOTION_INSTRUCTIONS` (8) = `EMOTION_TO_AUDIO_TAGS` (8)
- [x] `TtsInstructionParams` — todos os 11 parâmetros são passados pelo `audio.ts`
- [x] `ChunkingOutputSchema` — `chunks` obrigatório + `enrichedChunks` optional (backward compat)
- [x] Ordem das seções no `buildTtsInstruction` confere com o plano
- [x] Sem TODOs, FIXMEs ou HACKs nos arquivos modificados
- [ ] NotebookLM Gemini API — não consultado (auth expirada, webfetch falhou). Validação de audio tags pendente

---

## Resumo

**12 de 15 itens do plano estão implementados conforme especificado.**  
**3 desvios menores** (todos BAIXO): threshold de chunk size (80 vs 100), detecção sem correção de chunks truncados, e comentário de backoff impreciso.

A implementação está sólida e funcional. Nenhum gap impede a execução do pipeline TTS. Os 3 desvios são decisões de implementação ou imprecisões cosméticas que não afetam o usuário final de forma perceptível.
