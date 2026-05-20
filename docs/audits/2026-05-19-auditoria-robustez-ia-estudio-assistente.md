# Auditoria

## Escopo da revisão

- Mudanças recentes relacionadas à robustez da IA no Estúdio e Assistente.
- Arquivos lidos por completo no escopo principal:
  - `functions/src/flows/audio.ts`
  - `functions/src/flows/audio-preflight.ts`
  - `functions/src/flows/assistant.ts`
  - `functions/src/flows/inline-assistant.ts`
  - `functions/src/flows/cancel-ai-request.ts`
  - `functions/src/usage/audio-preflight.ts`
  - `functions/src/usage/ai-requests.ts`
  - `functions/src/usage/credit-service.ts`
  - `functions/src/genkit/middlewares/credit-metering.ts`
  - `functions/src/genkit/schemas/common.ts`
  - `functions/src/index.ts`
  - `src/hooks/useAudioGenerator.ts`
  - `src/hooks/useAssistant.ts`
  - `src/components/app/AudioGenerationHandler.tsx`
  - `src/components/app/AudioPreflightDialog.tsx`
  - `src/lib/callable-errors.ts`
  - `src/lib/gemini.ts`
  - `src/hooks/useCredits.ts`
  - `src/components/CreditIndicator.tsx`
  - `src/App.tsx`
  - `tests/app/audioGenerationHandler.unit.test.tsx`
  - `tests/hooks/useAssistant.unit.test.tsx`
- Ferramentas usadas:
  - Analyze `changes`, `impact_analysis`, `file_context`, `find`
  - NotebookLM: Firebase Cloud Functions Docs e React Docs
- Focos cobertos:
  - bugs
  - regressões comportamentais
  - inconsistências de contrato frontend/backend
  - riscos de cobrança
  - riscos transacionais
  - UX enganosa
  - lacunas de testes

## Veredito

**Ajustes recomendados**

## Achados priorizados

### [WARNING] Registros `ai_requests` ficam presos em `running` quando o flow falha antes do bloco principal de finalização

- **Arquivo:** `functions/src/flows/audio.ts:197`
- **Confidence:** 96/100
- **Categoria:** Firebase
- **Problema:** `startAiRequest()` é chamado antes de branches que podem lançar erro fora do `try/catch` que faz `finishAiRequest()`, deixando o request marcado como em execução para sempre.
- **Evidência:**
  ```ts
  await startAiRequest(db, uid, requestId, 'audio');

  if (...) {
    throw new HttpsError('failed-precondition', ...);
  }

  let creditMeter = null;
  try {
    creditMeter = await withCreditMetering(...)
  ```
  e:
  ```ts
  const requestId = input.requestId || crypto.randomUUID();
  await startAiRequest(db, uid, requestId, 'assistant');
  ...
  const creditMeter = await withCreditMetering(...)
  ```
- **Impacto:** cancelamento e observabilidade ficam inconsistentes no Firestore. No áudio, o caso de saldo alterado após a prévia (`CREDITS_CHANGED_AFTER_PREFLIGHT`) já nasce como `running` e nunca é encerrado. No assistente, uma falha de reserva de créditos também deixa lixo operacional em `users/{uid}/ai_requests/{requestId}`.
- **Sugestão:** envolver o trecho desde `startAiRequest()` até a reserva inicial no mesmo `try/catch` que fecha o request, ou mover `startAiRequest()` para depois das validações que ainda podem falhar sem metering.

### [WARNING] O parser de erros callable lê o campo errado e perde os `details` estruturados do backend

- **Arquivo:** `src/lib/callable-errors.ts:6`
- **Confidence:** 98/100
- **Categoria:** Bug
- **Problema:** o frontend procura `customData.details`, mas a documentação oficial das callable functions expõe `code`, `message` e `details`.
- **Evidência:**
  ```ts
  interface CallableErrorShape {
    code?: string;
    message?: string;
    customData?: {
      details?: CallableErrorDetails;
    };
  }

  const details = candidate?.customData?.details ?? null;
  ```
  Validação documental: a documentação oficial de callable functions informa que o cliente recebe `code`, `message` e `details`, não `customData.details`.
- **Impacto:** o frontend deixa de reconhecer com confiabilidade códigos como `INSUFFICIENT_CREDITS` e `CREDITS_CHANGED_AFTER_PREFLIGHT`. Na prática, parte da UX cai para heurística por texto da mensagem, o que é frágil e quebra mensagens específicas de prévia/cobrança.
- **Sugestão:** ler `error.details` como fonte principal e tratar `customData.details` apenas como compatibilidade defensiva, se necessário.

### [WARNING] A prévia cobra `chunking`, mas o flow de áudio nunca debita essa etapa

- **Arquivo:** `functions/src/usage/audio-preflight.ts:74`
- **Confidence:** 97/100
- **Categoria:** Firebase
- **Problema:** o preflight soma créditos da etapa `chunking`, porém o flow real de áudio confirma somente `operationType: 'audio'`.
- **Evidência:**
  ```ts
  if (chunkCount > 1) {
    const chunkingCredits = calculateCreditCost({
      operationType: 'chunking',
      itemCount: chunkCount,
    });
    steps.push({ type: 'chunking', credits: chunkingCredits, ... });
  }
  ```
  versus:
  ```ts
  const finalCredits = calculateCreditCost({
    operationType: 'audio',
    inputChars: input.script.length,
  });

  await creditMeter.confirm({ finalCredits, ... });
  ```
- **Impacto:** há quebra de contrato entre a prévia mostrada ao usuário e o débito real. Hoje a UI anuncia um custo maior do que o saldo efetivamente consumido em roteiros chunkados, e o campo `preflight.totalPlanned` deixa de representar o que o backend realmente confirma.
- **Sugestão:** decidir um contrato único. Ou remover `chunking` da prévia e tratá-lo como custo interno do áudio, ou passar a cobrar `chunking` de verdade no backend.

### [WARNING] O caminho de créditos ilimitados envia `Infinity` no payload callable

- **Arquivo:** `src/components/app/AudioGenerationHandler.tsx:193`
- **Confidence:** 93/100
- **Categoria:** Firebase
- **Problema:** quando a prévia vem com créditos ilimitados, `availableCredits` recebe `Number.POSITIVE_INFINITY` e esse valor é reenviado ao backend no `confirmGenerate()`.
- **Evidência:**
  ```ts
  const available = creditSnapshot.unlimitedCredits
    ? Number.POSITIVE_INFINITY
    : creditSnapshot.availableCredits;
  ```
  e:
  ```ts
  preflight: {
    availableCredits: preflight.credits.available,
    totalPlanned: preflight.credits.totalPlanned,
    unlimited: preflight.credits.unlimited,
  }
  ```
  Validação documental: o protocolo oficial de callable functions não suporta `NaN` nem `Infinity` em `float/double`.
- **Impacto:** contas com `unlimitedCredits === true` podem falhar na confirmação da geração apesar de terem saldo liberado, porque o payload deixa de ser serializável de forma suportada pelo protocolo callable.
- **Sugestão:** não trafegar `availableCredits` quando `unlimited === true`, ou normalizar para um número finito/sentinel antes do envio.

### [SUGGESTION] A cobertura de testes não pega os ramos frágeis de cobrança estruturada e cancelamento cooperativo

- **Arquivo:** `tests/app/audioGenerationHandler.unit.test.tsx:270`
- **Confidence:** 92/100
- **Categoria:** Architecture
- **Problema:** os testes atuais cobrem o fluxo feliz da prévia e um aborto superficial do assistente, mas não cobrem os ramos que concentraram os bugs encontrados.
- **Evidência:**
  ```ts
  expect(mockGenerateAudio).toHaveBeenCalledWith({
    script: 'opts',
    preflight: {
      availableCredits: 100,
      totalPlanned: 10,
      unlimited: false,
    },
  });
  ```
  e:
  ```ts
  mockStreamFn.mockResolvedValue({
    stream: infiniteStream(),
    data: new Promise(() => {}),
  });
  ```
  Não há teste cobrindo:
  - `error.details` estruturado
  - `CREDITS_CHANGED_AFTER_PREFLIGHT`
  - `unlimitedCredits`
  - fechamento de `ai_requests` em falhas antes do metering
- **Impacto:** regressões em cobrança, cancelamento e contrato de erro continuam passando silenciosamente, como ocorreu nestas mudanças.
- **Sugestão:** adicionar testes de backend para `audio.ts` e `assistant.ts` e, no frontend, casos de erro estruturado e de conta ilimitada no `AudioGenerationHandler`.

## O que parece saudável

- O preflight de áudio não reserva créditos nem tenta gerar conteúdo antes da confirmação explícita.
- O fluxo de áudio tem checkpoints cooperativos de cancelamento antes do chunking, antes de cada chunk TTS e antes do retorno final.
- O assistente remove base64 dos anexos apenas para o texto usado no metering (`buildMeteringHistoryText`), o que evita inflar cobrança por conteúdo binário no histórico textual.
- Os flows callable estão protegidos com `authPolicy`, `enforceAppCheck` e `requestId` validado por UUID v4.

## Limites da revisão

- Revisão estática apenas; não rodei `lint`, `typecheck`, build, testes nem navegador.
- Não validei comportamento real de serialização no cliente em runtime; a conclusão sobre `Infinity` foi validada contra a documentação oficial do protocolo callable.
- Não inspecionei telemetria, estado real do Firestore ou efeitos em produção.
- Não revisei profundamente flows fora do escopo pedido, como billing Stripe ou UI pública.

## Próximo passo recomendado

`fixer`
