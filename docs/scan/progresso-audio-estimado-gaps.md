# Relatório de Lacunas — Progresso Estimado na Geração de Áudio

## 1. Contexto assumido

Foi implementada uma simulação de progresso durante a chamada `await audioCallable()` no hook `useAudioGenerator.ts`. A cada 60 segundos, um `setInterval` incrementa um contador de ticks e calcula `Math.min((progressTicks / estimatedChunks) * 50, 49)` para atualizar `generationProgress` na store. O objetivo é dar feedback visual ao usuário enquanto a Cloud Function processa o áudio.

## 2. Mapa rápido: sólido vs frágil

### Sólido ✅

- **Timer é limpo em todos os cenários**: `clearInterval` no sucesso (linha 457), no `finally` (linha 771) que roda para catch, cancelamento e retorno antecipado.
- **Teto de 49% respeitado**: `Math.min(..., 49)` garante que nunca ultrapasse 49% antes da resposta real.
- **Zero chunks**: `if (estimatedChunks > 0)` impede criação do timer quando não há estimativa.
- **UI exibe progresso**: `ActionBar` recebe `generationProgress` como prop e renderiza `LinearProgress` com o valor.
- **Timeout de 30min na callable**: garante que a promise eventualmente resolve/rejeita e o timer é limpo.
- **Sem race condition crítica**: o timer dispara a cada 60s, e `clearInterval` roda imediatamente após a resposta. Não há condição de corrida real porque as operações não conflitam — o pior caso (timer já disparou antes do clear) é inofensivo.

### Frágil ⚠️

- **`totalPlanned` contém créditos, não chunks**: a base da estimativa está conceitualmente errada.
- **Progresso pode regredir**: timer pode setar valor menor que os 10% iniciais.
- **`estimatedChunkCount` não chega ao timer**: o backend calcula corretamente, mas o campo não é transmitido.
- **Timer não reage a cancelamento**: continua atualizando progresso mesmo após o usuário cancelar.

---

## 3. Gaps priorizados

### 🔴 ALTA — Gap 1: `totalPlanned` contém créditos, não chunks — timer ineficaz

| Campo | Valor |
|-------|-------|
| **ID** | GAP-001 |
| **Severidade** | ALTA |
| **Tipo** | Fluxo incompleto / Dados incorretos |
| **Confidence** | 95 |
| **Descrição** | O timer usa `options.preflight?.totalPlanned` como número de chunks, mas esse campo é na verdade o total de **créditos** (soma de `steps[].credits`). Créditos incluem custos de geração de imagem (40 créditos/cena), scene prompts (2+ créditos/cena), áudio (5 + chars/120) e chunking. Para um roteiro de 1200 chars com 10 cenas: `totalPlanned ≈ 427`, enquanto `estimatedChunkCount = 3` (chunks reais de áudio). O timer precisaria de **427 ticks = 7 horas** para atingir 49% — na prática o progresso fica congelado em 10% até a resposta chegar (~3 min). A simulação é **completamente ineficaz** para roteiros com geração de cenas, que é o caso comum. |
| **Evidência** | `backend: functions/src/usage/audio-preflight.ts` linha 139 → `estimatedChunkCount = estimateChunkCount(input.script)` (número real de chunks); linha 144 → `totalPlanned = steps.reduce((sum, step) => sum + step.credits, 0)` (soma de créditos de TODAS as etapas). `frontend: src/hooks/useAudioGenerator.ts` linha 437 → `const estimatedChunks = options.preflight?.totalPlanned ?? 0`. `AudioGenerationHandler.tsx` linha 260-262 → `totalPlanned: preflight.credits.totalPlanned` (passa créditos). `credit-policy.ts` linha 73 → `image: cost = 40 + (hasReferenceImage ? 10 : 0)` — cada imagem custa 40 créditos |
| **Mitigações verificadas** | Nenhuma. O timer existe mas é ineficaz porque usa a métrica errada. |
| **Pergunta/decisão** | `estimatedChunkCount` precisa ser propagado até o timer. Duas opções: (1) adicionar campo `estimatedChunkCount` em `GenerateOptions.preflight` e `AudioFlowInput.preflight`; (2) converter `totalPlanned` no momento do `confirmGenerate`, salvando `estimatedChunkCount` em vez de `totalPlanned` no `GenerateOptions.preflight.totalPlanned` (mas isso quebraria o backend que espera créditos). |

---

### 🟡 MÉDIA — Gap 2: Progresso pode regredir dos 10% iniciais

| Campo | Valor |
|-------|-------|
| **ID** | GAP-002 |
| **Severidade** | MÉDIA |
| **Tipo** | Comportamento incorreto |
| **Confidence** | 90 |
| **Descrição** | O progresso é setado para 10% antes do timer (linha 430). Se o primeiro tick do timer calcular um valor < 10%, o progresso **regride**. Com `estimatedChunks` = 50 (créditos de roteiro médio com cenas), o primeiro tick é `(1/50)*50 = 1%`, regredindo de 10% para 1%. Mesmo corrigindo para usar `estimatedChunkCount`, se houver 8 chunks, `(1/8)*50 = 6.25%`, ainda regride de 10%. No cenário corrigido (chunks reais), com 2 chunks o primeiro tick dá 25% — não regride. Mas com 3+ chunks, regride. |
| **Evidência** | `useAudioGenerator.ts` linha 430: `storeApi.getState().setGenerationProgress(10)` (antes do timer). Linha 442: `const estimated = Math.min((progressTicks / estimatedChunks) * 50, 49)` — não considera o progresso atual. |
| **Mitigações verificadas** | Nenhuma. O timer sempre sobrescreve o progresso sem verificar o valor atual. |
| **Pergunta/decisão** | Usar `Math.max(currentProgress, estimated)` no callback do timer para evitar regressão? Ou reposicionar o set de 10% para depois do timer (não ideal porque o timer pode não existir se estimatedChunks = 0). |

---

### 🟡 MÉDIA — Gap 3: `estimatedChunkCount` não é passado ao timer (campo ausente no tipo)

| Campo | Valor |
|-------|-------|
| **ID** | GAP-003 |
| **Severidade** | MÉDIA |
| **Tipo** | Fluxo incompleto |
| **Confidence** | 95 |
| **Descrição** | O backend calcula e retorna `estimatedChunkCount` no `AudioPreflightOutput`. O frontend tipa corretamente em `AudioPreflightSummary` (AudioPreflightDialog.tsx linha 26). Mas em `confirmGenerate` (AudioGenerationHandler.tsx linhas 257-263), apenas `preflight.credits.*` é passado para `GenerateOptions.preflight`. O campo `estimatedChunkCount` nunca chega ao `useAudioGenerator`. Mesmo que o Gap 1 seja corrigido (usar chunks em vez de créditos), o valor correto não está disponível onde é necessário. |
| **Evidência** | `AudioPreflightOutputSchema` (functions common.ts) → tem `estimatedChunkCount`. `AudioPreflightSummary` (AudioPreflightDialog.tsx) → tem `estimatedChunkCount`. `AudioGenerationHandler.tsx` linha 257-263 → só passa `preflight.credits.*`. `GenerateOptions.preflight` (useAudioGenerator.ts linha 117-121) → só tem `totalPlanned`, sem `estimatedChunkCount`. `AudioFlowInput.preflight` (linha 79-83) → idem. |
| **Mitigações verificadas** | Nenhuma — o campo existe no backend e no preflight summary mas não chega ao timer. |
| **Pergunta/decisão** | Adicionar `estimatedChunkCount` em `GenerateOptions.preflight` e `AudioFlowInput.preflight`. Ou, como solução mais localizada, extrair o `estimatedChunkCount` do `preflight` (já disponível em `AudioPreflightSummary`) e passá-lo diretamente para `generateAudio` como parâmetro extra (em vez de dentro de `options.preflight`). |

---

### 🔵 BAIXA — Gap 4: Timer ignora `cancelRef` — continua atualizando progresso após cancelamento

| Campo | Valor |
|-------|-------|
| **ID** | GAP-004 |
| **Severidade** | BAIXA |
| **Tipo** | Comportamento visual inconsistente |
| **Confidence** | 85 |
| **Descrição** | Quando o usuário clica em Cancelar, `handleCancel` seta `cancelRef.current = true`. O timer não verifica `cancelRef` antes de atualizar o progresso. Como o `finally` só roda depois que a chamada `await audioCallable` termina (o que pode levar minutos), o progresso continua sendo atualizado mesmo após o cancelamento visual. O usuário vê "Parando após concluir a etapa atual..." mas a barra de progresso continua avançando. Não causa erro funcional, mas é enganoso. |
| **Evidência** | `useAudioGenerator.ts` linha 440-444: callback do `setInterval` não tem `if (cancelRef.current) return;` ou qualquer verificação de cancelamento. |
| **Mitigações verificadas** | O progresso não é crítico e a UI de cancelamento (statusText) informa o usuário. O timer eventualmente será limpo quando a promise resolver/rejeitar. |
| **Pergunta/decisão** | Adicionar `if (cancelRef.current) return;` no início do callback do timer? Isso interromperia a atualização visual imediatamente após o cancelamento. |

---

### 🔵 BAIXA — Gap 5: `generationProgress` não é resetado após erro

| Campo | Valor |
|-------|-------|
| **ID** | GAP-005 |
| **Severidade** | BAIXA |
| **Tipo** | Estado inconsistente |
| **Confidence** | 80 |
| **Descrição** | No `catch`, quando ocorre um erro (não cancelamento), o progresso mantém o último valor setado pelo timer. A ActionBar não exibe o progresso quando `!isGenerating` (linha 116 do ActionBar.tsx), então o usuário não vê o valor incorreto. Mas o estado da store fica inconsistente: `generationProgress` pode ser e.g. 30% enquanto `error` tem uma mensagem de erro. Se algum componente ler `generationProgress` sem verificar `isGenerating`, receberá um valor espúrio. |
| **Evidência** | `useAudioGenerator.ts` linha 736-768 (`catch`): não há `storeApi.getState().setGenerationProgress(0)` ou similar. A store mantém o último valor do timer/cenas. `ActionBar.tsx` linha 116: `if (!isGenerating && !audioUrl) return null;` — esconde a barra quando não está gerando. |
| **Mitigações verificadas** | A ActionBar esconde o progresso quando `!isGenerating`. Mas o estado na store permanece inconsistente. |
| **Pergunta/decisão** | Adicionar `storeApi.getState().setGenerationProgress(0)` no `catch` (antes do `restoreLastSuccessfulState` ou no início do catch) para resetar o progresso junto com o erro. |

---

## 4. Cenários de borda sem resposta

| Cenário | Impacto | Resposta atual |
|---------|---------|----------------|
| `totalPlanned` = -1 (negativo) | Timer não criado (`-1 > 0` = false) | ✅ Comportamento seguro |
| `totalPlanned` = Infinity | Timer criado, `progressTicks / Infinity` = 0, progresso nunca avança | ⚠️ Improvável, mas se ocorrer, timer fica rodando sem avanço até resposta chegar |
| 0 chunks no backend mas preflight disse > 0 | Timer avança baseado em chunks que não existem; quando resposta chega, progresso pula para 50% | ✅ Aceitável — é uma estimativa |
| Componente desmonta durante geração (navegação) | Timer continua rodando até promise resolver (30min timeout); não crasha porque store global ainda existe | ⚠️ Leve vazamento de timer (max 30min) |
| Múltiplas gerações simultâneas (botão clicado 2x) | `isGenerating` previne (`handleGenerate` checa no início) | ✅ Protegido |

## 5. Checklist de sanidade

- [x] Li o arquivo COMPLETO do `useAudioGenerator.ts`
- [x] Verifiquei a store `audioGeneratorStore.ts` — `generationProgress` e `setGenerationProgress` existem
- [x] Verifiquei a UI `ActionBar.tsx` — lê `generationProgress` como prop e renderiza corretamente
- [x] Verifiquei `AudioGenerationHandler.tsx` — `generationProgress` é propagado
- [x] Verifiquei `AudioPreflightDialog.tsx` — tipos `AudioPreflightSummary` com `estimatedChunkCount` e `credits.totalPlanned`
- [x] Verifiquei `confirmGenerate` — só passa `credits.*`, não `estimatedChunkCount`
- [x] Verifiquei o backend `audio-preflight.ts` — confirma que `totalPlanned` = soma de créditos, `estimatedChunkCount` = número real de chunks
- [x] Verifiquei `credit-policy.ts` — confirma que imagem custa 40 créditos, áudio 5 + chars/120
- [x] Confirmei que **usuário real seria afetado** (Gap 1: progresso congelado; Gap 2: regressão visual)
- [x] Verifiquei que `estimatedChunkCount` não existe em `GenerateOptions.preflight`
- [x] Verifiquei cancelamento: timer não checa `cancelRef`
- [x] Verifiquei cleanup: `finally` com `clearInterval` + sucesso com `clearInterval`

---

## Resumo

- **1 ALTA**: `totalPlanned` são créditos, não chunks — timer ineficaz
- **2 MÉDIAS**: regressão de progresso + `estimatedChunkCount` não chega ao timer
- **2 BAIXAS**: timer ignora cancelamento + progresso não resetado após erro
