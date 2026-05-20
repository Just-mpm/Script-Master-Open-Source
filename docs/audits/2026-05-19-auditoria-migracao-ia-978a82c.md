# Auditoria

## Escopo da revisão

- Comparação estática entre `978a82c` (`0.37.1`) e o estado atual do repositório.
- Arquivos lidos por completo no escopo principal:
  - `functions/src/flows/assistant.ts`
  - `functions/src/flows/inline-assistant.ts`
  - `functions/src/flows/audio.ts`
  - `functions/src/flows/images.ts`
  - `functions/src/flows/scene-prompts.ts`
  - `functions/src/flows/chunking.ts`
  - `functions/src/genkit/schemas/common.ts`
  - `functions/src/genkit/utils/assistant-context.ts`
  - `functions/src/genkit/middlewares/credit-metering.ts`
  - `functions/src/usage/credit-estimator.ts`
  - `functions/src/usage/credit-policy.ts`
  - `functions/src/usage/credit-service.ts`
  - `src/hooks/useAssistant.ts`
  - `src/hooks/useInlineAssistant.ts`
  - `src/hooks/useAudioGenerator.ts`
  - `src/hooks/useImageGenerator.ts`
  - `src/lib/gemini.ts`
  - `src/lib/db/user-settings.ts`
  - `src/lib/db/chats.ts`
  - `src/lib/db/memories.ts`
  - `src/lib/audio.ts`
  - `src/features/assistant/Assistant.tsx`
  - `src/features/assistant/components/AssistantMessages.tsx`
  - `src/features/studio/components/InlineAIWidget.tsx`
- Focos cobertos:
  - assistant
  - inline assistant
  - audio
  - images
  - scene-prompts
  - chunking
  - integração frontend/backend
  - créditos
  - anexos
  - preferências do usuário
  - estado do estúdio
  - fluxos derivados

## Veredito

**Ajustes recomendados**

## Achados priorizados

### [WARNING] Histórico com anexos agora pode consumir créditos em escala absurda no assistant

- **Arquivo:** `src/hooks/useAssistant.ts:251`, `functions/src/flows/assistant.ts:160`, `functions/src/flows/assistant.ts:298`, `functions/src/usage/credit-policy.ts:56`, `src/features/assistant/Assistant.tsx:42`
- **Confidence:** 97/100
- **Categoria:** Firebase
- **Problema:** o frontend voltou a reenviar anexos no histórico, mas o backend mede créditos do assistant usando `JSON.stringify(history)`, o que inclui base64 bruto dos anexos como se fosse texto conversacional.
- **Evidência:** `useAssistant` envia `history` com `attachments[].data` (`src/hooks/useAssistant.ts:251-261`); o flow serializa isso em `historyText` (`functions/src/flows/assistant.ts:160`) e cobra `inputChars: messageChars + historyChars` (`functions/src/flows/assistant.ts:298-306`), com regra de `1 crédito / 500 chars` (`functions/src/usage/credit-policy.ts:52-61`). A UI aceita anexos de até `10 MB` para imagem e `5 MB` para documento (`src/features/assistant/Assistant.tsx:42-43`).
- **Impacto:** um único anexo grande pode zerar o saldo no turno seguinte. Exemplo concreto: uma imagem de `10 MB` vira cerca de `13.981.016` caracteres em base64, o que sozinho equivale a `27.963` créditos de entrada antes mesmo da resposta.
- **Sugestão:** remover `attachments[].data` do material usado para metering do assistant, cobrando apenas texto real e, se necessário, um adicional fixo por anexo/imagem.

### [WARNING] O botão de parar do assistant deixou de cancelar a execução real no backend

- **Arquivo:** `src/hooks/useAssistant.ts:238`, `src/hooks/useAssistant.ts:281`, `src/hooks/useAssistant.ts:287`, `src/hooks/useAssistant.ts:308`, `src/hooks/useAssistant.ts:366`
- **Confidence:** 95/100
- **Categoria:** UX
- **Problema:** o hook ainda expõe `stopGeneration`, mas a migração para `httpsCallable(...).stream()` não tem cancelamento documentado por `AbortSignal`, e o código continua aguardando `finalData` mesmo após o usuário abortar localmente.
- **Evidência:** o cancelamento só marca `abortController.signal.aborted` localmente (`src/hooks/useAssistant.ts:366-371`); o stream é iniciado por `assistantCallable.stream(input)` (`src/hooks/useAssistant.ts:281`), o loop apenas dá `break` (`src/hooks/useAssistant.ts:287-299`) e depois o hook ainda faz `await finalData` (`src/hooks/useAssistant.ts:308-316`). O NotebookLM de Firebase Functions confirma que `.stream()` retorna `stream` + `data`, que `data` representa o resultado completo, e que não há mecanismo documentado de cancelamento via `AbortSignal` no SDK Web.
- **Impacto:** o usuário clica em “parar”, mas a geração pode continuar no servidor até o fim; a UI tende a ficar presa em loading até o resultado final fechar, e o consumo de créditos segue o fluxo completo.
- **Sugestão:** tratar `stopGeneration` como cancelamento real do produto, com protocolo explícito de cancelamento no backend ou remoção do affordance de “parar” enquanto o transporte atual não suporta isso.

### [WARNING] Cancelar geração de áudio não interrompe mais o TTS backend durante a fase longa

- **Arquivo:** `src/hooks/useAudioGenerator.ts:165`, `src/hooks/useAudioGenerator.ts:272`, `src/hooks/useAudioGenerator.ts:299`, `src/hooks/useAudioGenerator.ts:482`
- **Confidence:** 93/100
- **Categoria:** Bug
- **Problema:** após a migração do TTS para callable backend, `handleCancel()` só seta uma flag local; a chamada `audioCallable(audioInput)` não recebe nem suporta cancelamento documentado do cliente.
- **Evidência:** o cancelamento apenas faz `cancelRef.current = true` (`src/hooks/useAudioGenerator.ts:165-167`). Depois disso o código entra em `await audioCallable(audioInput)` (`src/hooks/useAudioGenerator.ts:299-300`) sem qualquer caminho de abort real, e só volta a verificar cancelamento em pontos posteriores do fluxo (`src/hooks/useAudioGenerator.ts:272`, `399`, `482`). Na `0.37.1`, o TTS era gerado chunk a chunk no cliente e o loop checava `cancelRef` antes de cada parte.
- **Impacto:** ao cancelar um roteiro longo, o usuário não interrompe a geração cara de áudio; a operação continua no servidor até terminar, consumindo tempo e possivelmente créditos, com sensação de “cancelar não funciona”.
- **Sugestão:** implementar cancelamento cooperativo no flow `audio` ou ajustar a UI para não prometer interrupção imediata enquanto a operação roda em callable sem abort.

### [WARNING] O pipeline derivado de cenas engole erros de crédito e degrada silenciosamente

- **Arquivo:** `src/lib/gemini.ts:75`, `src/lib/gemini.ts:117`, `src/hooks/useAudioGenerator.ts:384`, `src/hooks/useAudioGenerator.ts:403`
- **Confidence:** 92/100
- **Categoria:** UX
- **Problema:** quando `scenePrompts` ou `images` falham por saldo insuficiente, o frontend converte isso em fallback genérico ou `null`, então o usuário não recebe feedback claro de crédito esgotado no fluxo derivado do áudio.
- **Evidência:** `generateScenePrompts()` captura qualquer erro e retorna fallback com `isFallback: true` (`src/lib/gemini.ts:75-83`); `generateImageFromPrompt()` captura qualquer erro e retorna `null` (`src/lib/gemini.ts:117-119`). O `useAudioGenerator` interpreta isso como “qualidade visual reduzida” (`src/hooks/useAudioGenerator.ts:384-389`) ou como falha genérica de cena (`src/hooks/useAudioGenerator.ts:403-439`), sem setar `creditsExhausted`.
- **Impacto:** perto do fim do saldo, o usuário pode gastar créditos em áudio e prompts, mas ver apenas cenas genéricas ou faltando, sem entender que o motivo real foi bloqueio de saldo.
- **Sugestão:** propagar erro de crédito de `scenePrompts` e `images` até `useAudioGenerator`, diferenciando insuficiência de saldo de falha transitória.

## O que parece saudável

- As correções recentes de contexto do usuário no `assistant` e no `inline assistant` parecem corretas: `name`, `role` e `goals` agora entram no prompt via `buildUserProfileBlock(...)`.
- A correção de `saveUserSettings(...)` para preservar `name/role/goals` parece adequada e endereça bem o risco de sobrescrever onboarding/perfil.
- O backend do assistant voltou a receber histórico com anexos de mensagens anteriores, o que reaproxima o comportamento funcional da `0.37.1`.
- O flow de áudio agora aceita `audioBase64` ou `audioUrl`, e o frontend já consome ambos os formatos.
- O retorno de segmentos reais por chunk no flow de áudio foi integrado corretamente no frontend.
- A imagem de referência no flow `images` deixou de ser empurrada como texto no prompt e passou a seguir o caminho de mídia, o que está alinhado com a intenção da migração.
- `scene-prompts` e `chunking` têm fallback explícito, e a reversão de créditos nesses erros está presente.

## Limites da revisão

- Revisão puramente estática: não rodei build, typecheck, lint, testes, emuladores nem navegador.
- Não validei o comportamento real de `response.media.url` com execução ao vivo; a documentação consultada mostrou nuances entre Gemini TTS e plugin Genkit, então evitei fechar finding separado sobre cabeçalho WAV sem teste runtime.
- Não fiz veredito formal sobre qualidade do CORS/App Check porque o foco aqui foi regressão comportamental da migração das IAs.

## Próximo passo recomendado

`run` ou correção manual focada nestes 4 pontos, seguida por teste manual guiado de:

- assistant com histórico contendo imagem/documento
- stop/cancel no assistant
- cancel no áudio durante roteiro longo
- áudio com `generateScenes=true` em conta com saldo baixo
