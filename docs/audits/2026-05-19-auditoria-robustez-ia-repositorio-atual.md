# Auditoria

## Escopo da revisão

- Estado atual do repositório em `2026-05-19`, focado em:
  - parser de callable errors
  - lifecycle de `ai_requests`
  - preflight do Estúdio
  - alinhamento entre prévia e execução real
  - cancelamento cooperativo de `assistant` / `audio` / `scene-prompts` / `images`
  - reconciliação de créditos
  - testes adicionados
- Arquivos lidos por completo no escopo principal:
  - `src/lib/callable-errors.ts`
  - `src/hooks/useAssistant.ts`
  - `src/hooks/useAudioGenerator.ts`
  - `src/hooks/useImageGenerator.ts`
  - `src/hooks/useInlineAssistant.ts`
  - `src/components/app/AudioGenerationHandler.tsx`
  - `src/components/app/AudioPreflightDialog.tsx`
  - `src/lib/gemini.ts`
  - `src/hooks/useCredits.ts`
  - `functions/src/usage/ai-requests.ts`
  - `functions/src/usage/audio-preflight.ts`
  - `functions/src/usage/credit-service.ts`
  - `functions/src/genkit/middlewares/credit-metering.ts`
  - `functions/src/flows/audio-preflight.ts`
  - `functions/src/flows/audio.ts`
  - `functions/src/flows/assistant.ts`
  - `functions/src/flows/scene-prompts.ts`
  - `functions/src/flows/images.ts`
  - `functions/src/flows/inline-assistant.ts`
  - `functions/src/flows/cancel-ai-request.ts`
  - `tests/app/audioGenerationHandler.unit.test.tsx`
  - `tests/hooks/useAssistant.unit.test.tsx`
  - `tests/hooks/useAudioGenerator.unit.test.ts`
  - `tests/hooks/useImageGenerator.unit.test.ts`
  - `tests/lib/callable-errors.unit.test.ts`
- Ferramentas usadas:
  - Analyze `changes`, `file_context`, `impact_analysis`, `describe`
  - NotebookLM `Firebase Cloud Functions Docs`

## Veredito

**Ajustes recomendados**

## Achados priorizados

### [WARNING] Cancelar imagem no cliente não cancela a execução real nem impede cobrança

- **Arquivo:** `src/hooks/useImageGenerator.ts:81`
- **Confidence:** 98/100
- **Categoria:** Bug
- **Problema:** o hook de imagem só marca `cancelRef`, mas não guarda `requestId`, não chama `cancelAiRequest` e nem revalida o cancelamento depois que o callable retorna.
- **Evidência:**
  ```ts
  const cancelRef = useRef(false);
  ...
  const result = await callable({
    prompt: options.prompt,
    aspectRatio: options.aspectRatio,
    referenceImage: referenceBase64,
    requestId: crypto.randomUUID(),
  });
  ...
  const handleCancel = () => {
    cancelRef.current = true;
  };
  ```
  No backend, o flow já foi preparado para cancelamento cooperativo:
  ```ts
  await startAiRequest(db, uid, requestId, 'image');
  await throwIfAiCancellationRequested(db, uid, requestId);
  ...
  await throwIfAiCancellationRequested(db, uid, requestId);
  ```
- **Impacto:** se o usuário clicar em cancelar depois do request sair do navegador, a geração continua no servidor, pode consumir créditos e ainda pode voltar a preencher a UI com a imagem mesmo após o cancelamento.
- **Sugestão:** espelhar o padrão de `useAudioGenerator` e `useAssistant`: persistir `requestId`, chamar `cancelAiRequest` e checar `cancelRef` novamente após o `await callable(...)` antes de publicar o resultado.

### [WARNING] O assistente localmente “para”, mas continua aguardando `finalData` até o backend encerrar

- **Arquivo:** `src/hooks/useAssistant.ts:315`
- **Confidence:** 92/100
- **Categoria:** UX
- **Problema:** após `stopGeneration()` ou `startNewChat()`, o loop do stream para localmente, mas o hook ainda faz `await finalData`, sem `AbortSignal` real na chamada.
- **Evidência:**
  ```ts
  for await (const chunk of stream) {
    if (abortController.signal.aborted || !streamActiveRef.current) break;
    ...
  }
  ...
  const output = await finalData;
  ```
  O cancelamento local apenas aborta refs locais e pede cancelamento remoto:
  ```ts
  const stopGeneration = () => {
    requestRemoteCancellation(activeRequestIdRef.current);
    abortControllerRef.current?.abort();
    ...
  };
  ```
  O NotebookLM confirmou que callable streaming não tem cancelamento automático do lado do cliente e que o app precisa implementar sua própria sinalização.
- **Impacto:** se o cancelamento remoto atrasar ou falhar, `isLoading` / `isStreaming` podem ficar presos até o backend terminar, gerando UX enganosa e sessões “travadas” ao trocar de chat.
- **Sugestão:** tratar cancelamento local como terminal para a UI, sem depender de `finalData` para limpar estado, e consumir o resultado final só se o request ainda for o ativo.

### [WARNING] Falha na confirmação de créditos pode passar como sucesso e deixar reserva zombie

- **Arquivo:** `functions/src/genkit/middlewares/credit-metering.ts:372`
- **Confidence:** 96/100
- **Categoria:** Firebase
- **Problema:** `confirmCredits()` retorna `success: false` em cenários reais, mas os wrappers e flows ignoram esse retorno e seguem como se a cobrança tivesse sido reconciliada.
- **Evidência:**
  ```ts
  export async function confirmCredits(...): Promise<ConfirmResult> {
    if (!eventSnap.exists) {
      return { success: false, availableCredits: 0, error: 'Evento de crédito não encontrado' };
    }
    ...
    return { success: false, availableCredits: 0, error: message };
  }
  ```
  O wrapper manual ignora o resultado:
  ```ts
  confirm: async ({ finalCredits, outputSize, model }) => {
    await confirmCredits(
      db,
      uid,
      requestId,
      finalCredits,
      outputSize,
      model,
    ).catch((err: unknown) => {
      console.error(...);
    });
  },
  ```
  E os flows marcam sucesso logo depois:
  ```ts
  await creditMeter.confirm({ ... });
  creditsSettled = true;
  await finishAiRequest(db, uid, requestId, 'completed')
  ```
- **Impacto:** uma resposta de IA pode ser entregue como concluída enquanto o `credit_event` continua reservado e o saldo fica incorreto até a expiração posterior das reservas stale. Isso é risco real de cobrança e reconciliação.
- **Sugestão:** transformar `success: false` em erro explícito no wrapper e só marcar `creditsSettled = true` / `ai_request = completed` quando a confirmação realmente passar.

### [SUGGESTION] O contrato novo de cancelamento/lifecycle não está coberto por testes justamente onde ele é mais frágil

- **Arquivo:** `tests/hooks/useImageGenerator.unit.test.ts:93`
- **Confidence:** 94/100
- **Categoria:** Architecture
- **Problema:** os testes adicionados validam parser e alguns fluxos de assistente/preflight, mas os caminhos mais sensíveis de cancelamento e reconciliação continuam sem cobertura útil.
- **Evidência:**
  ```ts
  // REM-002: Testes de geração de imagem removidos
  // A lógica de clearImage e estados iniciais são cobertos aqui.
  ```
  Em `tests/hooks/useAssistant.unit.test.tsx`, o cancelamento verifica a chamada remota, mas não verifica a liberação final de `isLoading` / `isStreaming` após o stop.
  Em `tests/hooks/useAudioGenerator.unit.test.ts`, os testes continuam superficiais e não exercitam `CREDITS_CHANGED_AFTER_PREFLIGHT`, cancelamento remoto nem falha de reconciliação.
- **Impacto:** as regressões mais caras desta leva continuam dependendo de inspeção manual, especialmente cobrança indevida, cancelamento enganoso e estados presos.
- **Sugestão:** adicionar testes focados em:
  - cancelamento de `useImageGenerator` após o request já ter saído
  - `useAssistant.stopGeneration()` limpando estado mesmo com `finalData` pendente
  - falha de `confirmCredits()` propagando erro em `audio` / `assistant` / `images` / `scene-prompts`

## O que parece saudável

- O parser de callable errors em `src/lib/callable-errors.ts` está alinhado com o contrato documentado de `HttpsError.details`.
- `audio`, `assistant`, `scene-prompts` e `images` no backend já usam `requestId` válido, `startAiRequest()` e `finishAiRequest()`.
- O preflight de áudio está conectado ponta a ponta e evita trafegar `Infinity` no frontend.
- O backend de áudio compara saldo real contra a prévia antes de começar a execução cara.
- Há reconciliação best-effort para reservas stale em `credit-service.ts`, o que reduz dano em falhas parciais.

## Limites da revisão

- Revisão estática apenas: não rodei build, lint, testes, emuladores nem navegador real.
- Não validei regras Firebase nem comportamento de rede/disconnect em ambiente real.
- O finding de streaming do assistente foi validado contra a documentação de Callable Functions, mas não reproduzido em runtime nesta revisão.
- Não tratei histórico de commits anteriores como fonte de verdade; a análise foi feita só sobre o código atual.

## Próximo passo recomendado

`fixer`
