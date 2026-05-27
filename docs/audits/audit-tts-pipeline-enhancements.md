# Auditoria: Melhorias no Pipeline TTS do Gemini

**Data:** 2026-05-27
**Auditor:** Code Validator (análise estática)
**Escopo:** 6 arquivos modificados no pipeline de geração de áudio TTS

---

## 1. Escopo da Revisão

### Arquivos lidos por completo

| Arquivo | Linhas | Foco |
|---------|--------|------|
| `functions/src/genkit/constants.ts` | 130 | Novas constantes de audio tags, retry e limites |
| `functions/src/genkit/schemas/common.ts` | 282 | ChunkItemSchema enriquecido, enrichedChunks optional |
| `functions/src/genkit/utils/chunking.ts` | 172 | Fallback programático reescrito, regex expandida |
| `functions/src/genkit/utils/assistant-context.ts` | 526 | buildTtsInstruction, buildChunkingInstruction, helpers |
| `functions/src/flows/chunking.ts` | 218 | Flow de chunking com schema enriquecido |
| `functions/src/flows/audio.ts` | 611 | Retry automático, continuidade enriquecida, audio tags |

### Arquivos consultados para validação

- `functions/src/usage/ai-requests.ts` (implementação de `throwIfAiCancellationRequested`)
- NotebookLM Gemini API (documentação oficial de audio tags e prompting TTS)
- Frontend (`src/`) — verificação de consumo do `enrichedChunks` e `chunking` callable

### Focos cobertos

- Tipos corretos e backward compatibility
- Edge cases no chunking (regex, merge, trailing sentence)
- Retry logic (vazamento, cancelamento, backoff)
- Injeção de audio tags no transcript
- Conformidade com documentação oficial do Gemini TTS
- Tratamento de erros e créditos

---

## 2. Veredito

**Ajustes recomendados** — 1 bug com impacto real no cancelamento, 1 bug de perda de dados no fallback, 3 sugestões de manutenção.

Nenhum bloqueador de merge. O código é sólido no geral, com melhorias significativas sobre a versão anterior.

---

## 3. Achados Priorizados

### [WARNING] Cancelamento do usuário engolido pelo retry loop do TTS

- **Arquivo:** `functions/src/flows/audio.ts:435-478`
- **Confidence:** 93/100
- **Categoria:** Bug
- **Problema:** O `throwIfAiCancellationRequested` dentro do try/catch do retry loop tem seu `HttpsError('cancelled')` engolido pelo catch genérico, causando delay no cancelamento e mensagem de erro incorreta para o usuário.
- **Evidência:**
  ```typescript
  // Linha 435-478: retry loop
  for (let attempt = 0; attempt <= TTS_MAX_RETRIES; attempt++) {
    try {
      // ...
      await throwIfAiCancellationRequested(db, uid, requestId); // linha 443 — lança HttpsError('cancelled')
      const response = await ai.generate({...});
      await throwIfAiCancellationRequested(db, uid, requestId); // linha 452 — mesma coisa
      // ...
      break;
    } catch (retryErr) {
      // Linha 471: catch GENÉRICO — engole TODOS os erros, incluindo cancelamento
      console.error(`[audio] Falha no chunk...`);
    }
  }
  // Linha 480-488: se pcmBuffer é null, lança HttpsError('internal') — não 'cancelled'
  ```
- **Impacto:** Quando o usuário cancela durante o retry loop: (1) delay de 5-11s até o cancelamento ser efetivado (retries desnecessários + backoff), (2) mensagem de erro "Falha ao gerar áudio" em vez de "Operação cancelada", (3) status `failed` em vez de `cancelled` no registro `ai_requests` do Firestore (linha 597 nunca vê `code === 'cancelled'`).
- **Sugestão:** Adicionar verificação explícita de cancelamento no catch do retry loop antes de tratar como falha genérica:
  ```typescript
  } catch (retryErr) {
    if (retryErr instanceof HttpsError && retryErr.code === 'cancelled') {
      throw retryErr; // Propaga cancelamento imediatamente
    }
    console.error(`[audio] Falha no chunk...`);
  }
  ```

---

### [SUGGESTION] Perda de texto no fallback de chunking quando última sentença não tem pontuação final

- **Arquivo:** `functions/src/genkit/utils/chunking.ts:22`
- **Confidence:** 88/100 (rebaixado de WARNING)
- **Categoria:** Bug
- **Problema:** A regex `SENTENCE_SPLIT_REGEX` exige que cada sentença termine com delimitador (`[.!?\n;:—]` ou `..+`). Texto que termina sem pontuação final tem sua última frase perdida no match.
- **Evidência:**
  ```typescript
  // Linha 22
  const SENTENCE_SPLIT_REGEX = /[^.!?\n;:—]+(?:[.!?\n;:—]+|\.{2,})\s*/g;
  
  // Linha 76 — o fallback || [paragraph] só funciona se NENHUMA sentença for encontrada
  const sentences = paragraph.match(SENTENCE_SPLIT_REGEX) || [paragraph];
  ```
  Para `"Hello world. Goodbye world"` (sem ponto final): o match retorna `["Hello world. "]` e `"Goodbye world"` é perdido. O `|| [paragraph]` não é acionado porque o match não é null.
- **Impacto:** Perda silenciosa da última porção do texto no fallback programático (quando o Gemini falha no chunking). Na prática, roteiros de narração geralmente terminam com pontuação, mas textos colados pelo usuário podem não terminar.
- **Sugestão:** Após o match, verificar se há texto residual não capturado e anexá-lo ao array de sentenças:
  ```typescript
  const sentences = paragraph.match(SENTENCE_SPLIT_REGEX) || [];
  // Captura texto residual que não termina com pontuação
  const matchedLength = sentences.reduce((sum, s) => sum + s.length, 0);
  if (matchedLength < paragraph.length) {
    const remainder = paragraph.slice(matchedLength).trim();
    if (remainder) sentences.push(remainder);
  }
  if (sentences.length === 0) sentences.push(paragraph);
  ```

---

### [SUGGESTION] Tipo `EnrichedChunk` duplicado entre audio.ts e ChunkItemSchema

- **Arquivo:** `functions/src/flows/audio.ts:65-70`
- **Confidence:** 85/100
- **Categoria:** Architecture
- **Problema:** A interface `EnrichedChunk` no `audio.ts` é estruturalmente idêntica ao `ChunkItemSchema` definido em `common.ts`. Duas fontes de verdade para o mesmo conceito.
- **Evidência:**
  ```typescript
  // audio.ts:65-70
  interface EnrichedChunk {
    text: string;
    emotionTag?: string;
    isContinuation?: boolean;
    trailingSentence?: string;
  }
  
  // common.ts:228-233 — ChunkItemSchema com os mesmos campos
  ```
- **Impacto:** Risco de dessincronização futura. Se um campo for adicionado ao `ChunkItemSchema`, o `EnrichedChunk` pode ficar desatualizado silenciosamente.
- **Sugestão:** Importar e reutilizar o tipo inferido do schema: `type EnrichedChunk = z.infer<typeof ChunkItemSchema>` ou exportar um tipo dedicado do `common.ts`.

---

### [SUGGESTION] Indentação inconsistente no flow audio.ts

- **Arquivo:** `functions/src/flows/audio.ts:314-335`
- **Confidence:** 90/100
- **Categoria:** Architecture
- **Problema:** Bloco de código com indentação de 6 espaços em vez de 8 (padrão do restante do flow), quebrando a consistência visual.
- **Evidência:**
  ```typescript
  // Linhas 305-312: indentação correta (8 espaços)
          const {
            voiceConfig,
            isMultiSpeaker = false,
            // ...
          } = input;

  // Linhas 314-335: indentação incorreta (6 espaços)
        const pace = voiceConfig.pace ?? 'normal';
        const emotion = voiceConfig.emotion ?? 'neutral';
        // ...
  ```
- **Impacto:** Legibilidade reduzida, dificuldade de manutenção, indicação de possível refatoração incompleta.
- **Sugestão:** Corrigir a indentação das linhas 314-335 para 8 espaços, alinhando com o restante do bloco try.

---

### [SUGGESTION] Condição dead code em `isTruncatedChunk`

- **Arquivo:** `functions/src/genkit/utils/chunking.ts:50`
- **Confidence:** 82/100
- **Categoria:** Dead Code
- **Problema:** A verificação `!/\n$/.test(trimmed)` é sempre `true` porque `text.trim()` remove newlines trailing, tornando a condição de newline efetivamente morta.
- **Evidência:**
  ```typescript
  // Linha 47-51
  export function isTruncatedChunk(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length === 0) return false;
    return !/[.!?:;—]$/.test(trimmed) && !/\.{2,}$/.test(trimmed) && !/\n$/.test(trimmed);
    //                                                                      ^^^^^^^^^^^^^^^^
    //                                                                      Sempre true — trim() remove \n
  }
  ```
- **Impacto:** Código enganoso que sugere verificar newlines quando na verdade não o faz. Não afeta funcionalidade (a função ainda detecta chunks truncados corretamente para os casos principais).
- **Sugestão:** Remover a condição `!/\n$/.test(trimmed)` ou, se a intenção era verificar antes do trim, reestruturar a lógica.

---

## 4. O Que Parece Saudável

- **Backward compatibility do `enrichedChunks`** — campo optional no `ChunkingOutputSchema`, frontend não o consome diretamente (o chunking é feito internamente no flow `audio.ts`). Zero risco de breaking change.
- **Estrutura de prompting TTS** — segue fielmente a documentação oficial do Gemini: Audio Profile → Scene → Director's Notes → Sample Context → Transcript com audio tags inline. Validadado contra NotebookLM.
- **Audio tags em inglês** — correto conforme recomendação oficial ("always use English audio tags even if your transcript is in another language").
- **Retry com backoff exponencial** — `500 * attempt` ms (500ms, 1000ms). Simples e eficaz.
- **Validação de chunks truncados** — log de alerta sem bloquear a geração. Abordagem pragmática.
- **Créditos bem gerenciados** — `creditMeter.revert()` em todos os paths de falha, `confirm()` apenas no sucesso.
- **Fallback programático robusto** — `splitTextProgrammatically` com hierarquia de quebras (parágrafo → sentença → palavra), merge de chunks curtos, e geração de enrichedChunks básicos.
- **`buildTaggedTranscript`** — implementação limpa e correta para injeção de tags inline.
- **`extractTrailingSentence`** — lógica inteligente de pegar duas sentências quando a última é curta.
- **Chunking flow separado** — `chunking.ts` como callable independente com créditos próprios e fallback gratuito.
- **Console.log em Cloud Functions** — padrão consistente em todos os flows do diretório `functions/src/flows/` (a regra do `createLogger` é para o frontend).

---

## 5. Limites da Revisão

- **Sem testes de chunking backend** — não existem testes unitários para `splitTextProgrammatically`, `extractTrailingSentence`, `isTruncatedChunk`, `chunkScript` ou o flow `audio.ts`. Os testes existentes (`tests/lib/audio.unit.test.ts`, `tests/app/audioGenerationHandler.unit.test.tsx`) cobrem apenas o frontend.
- **Audio tags não validadas empiricamente** — tags como `[continuing]`, `[firmly]`, `[slowly]`, `[quickly]` não estão na lista oficial de tags comumente usadas do Gemini TTS (que inclui `[amazed]`, `[excited]`, `[serious]`, `[whispers]`, `[shouting]`, `[very fast]`, `[very slow]`). A documentação diz que "não há lista exaustiva" e recomenda experimentação, mas o comportamento real dessas tags específicas só pode ser confirmado com testes de áudio.
- **Race condition em cancelamento concorrente** — não foi possível afirmar se há janela de race entre `throwIfAiCancellationRequested` e `ai.generate` (o cancelamento pode ser solicitado entre as duas chamadas).
- **Performance do retry** — não foi possível medir o impacto real do retry no tempo total de geração. O backoff é curto (500ms-1s), mas chamadas TTS podem levar 2-5s cada.
