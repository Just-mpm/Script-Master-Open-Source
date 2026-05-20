# Scan de Lacunas

## 1. Contexto assumido

Analisei apenas o código atual do repositório em `D:\Pictures\ProgML\Script-Master`, com foco nas mudanças recentes de robustez da IA em:

- preflight do Estúdio
- breakdown e reconciliação visual de créditos
- bloqueio amigável por saldo
- sincronização entre prévia e execução
- cancelamento cooperativo de `assistant`, `audio`, `scene-prompts` e `images`
- propagação de erros estruturados
- preservação do comportamento esperado

Validação usada antes de reportar:

- mapeamento estrutural com `Analyze Project Map` e `Area Detail`
- rastreamento de símbolos com `Analyze Find`
- leitura completa dos arquivos centrais de frontend e backend
- `Impact Analysis` nos hooks/flows principais
- NotebookLM consultado para contrato de `HttpsError` callable e limites reais de cancelamento cooperativo em Firestore/Genkit

## 2. Mapa rápido: sólido vs frágil

**Sólido**

- `audio`, `assistant`, `scene-prompts` e `images` já têm `requestId`, `ai_requests` e checkpoints explícitos de cancelamento no backend.
- `audio` já reconcilia desvio entre preflight e execução com `CREDITS_CHANGED_AFTER_PREFLIGHT`.
- `callable-errors.ts` já normaliza `details` estruturado do Firebase callable e já há teste unitário cobrindo isso.
- o preflight de áudio já calcula etapas, créditos e bloqueio de confirmação no backend.

**Frágil**

- o cancelamento remoto depende de uma corrida implícita entre “cliente pediu cancelamento” e “backend já criou `ai_requests/{requestId}`”.
- o Image Studio não entrou no mesmo padrão de cancelamento cooperativo que `audio` e `assistant`.
- o estado visual de “sem créditos” está fragmentado por hook e reage a erro anterior, não ao saldo real atual.
- o preflight do Estúdio vira um modal bloqueante durante carregamento, sem saída local se a callable travar ou demorar demais.

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---:|---|---|---|---|
| GAP-01 | ALTO | implementação + contrato | 95 | **Cancelamento remoto pode falhar silenciosamente no clique rápido.** Se o usuário cancelar muito cedo, `cancelAiRequest` pode chegar antes de o backend criar `users/{uid}/ai_requests/{requestId}`. Nesse caso o backend retorna `false`, o frontend ignora a resposta e a operação continua consumindo tempo/créditos. Isso afeta `assistant` e `audio`, inclusive o pipeline visual disparado por `useAudioGenerator`. | `functions/src/usage/ai-requests.ts:56-57` retorna `false` quando o doc ainda não existe. `src/hooks/useAssistant.ts:117-123` e `src/hooks/useAudioGenerator.ts:234-237` só fazem fire-and-forget e não tratam `success:false`. O backend só começa a honrar cancelamento depois de `startAiRequest(...)` em `functions/src/flows/assistant.ts:137` e `functions/src/flows/audio.ts:202`. | Existe infraestrutura real de cancelamento: `cancelAiRequest`, `startAiRequest`, `throwIfAiCancellationRequested` e checkpoints no backend. O gap é a janela sem handshake/ack entre cliente e criação do registro. | O contrato de cancelamento precisa ser “best effort” ou “confirmado”? Se for confirmado, o frontend precisa retry/ack enquanto o request existir ou o backend precisa aceitar cancelamento antecipado. |
| GAP-02 | ALTO | implementação | 98 | **O cancelamento do Image Studio não é efetivo nem cooperativo.** O botão “Cancelar” só seta uma flag local. A chamada remota continua, não há `requestId` ativo guardado, não há `cancelAiRequest`, e o resultado ainda pode ser aplicado na UI mesmo após o usuário cancelar. | `src/hooks/useImageGenerator.ts:141` aguarda `await callable(...)`; `src/hooks/useImageGenerator.ts:195-196` cancela só com `cancelRef.current = true`; não há `activeRequestIdRef` nem uso de `cancelAiRequest` no arquivo. O rastreamento de símbolo mostrou `cancelAiRequest` apenas em `useAssistant` e `useAudioGenerator` (`src/hooks/useAssistant.ts:112-123`, `src/hooks/useAudioGenerator.ts:194-237`). No backend, `images.ts` já suporta cancelamento cooperativo com `startAiRequest` e `throwIfAiCancellationRequested` (`functions/src/flows/images.ts:104-149`). | O backend de `images` já está preparado para cooperar. O gap é só no cliente standalone de imagens. | O cancelamento de imagem precisa ter o mesmo contrato de `audio` e `assistant`? Se sim, falta alinhar `useImageGenerator` ao padrão já adotado. |
| GAP-03 | ALTO | produto + implementação | 94 | **O bloqueio amigável por saldo não está reconciliado com o saldo real.** O header pode mostrar `0` créditos, mas os banners/bloqueios locais dependem de um erro anterior e não do saldo atual. Resultado: usuário com saldo zerado ainda consegue tentar gerar/enviar e só descobre o bloqueio depois de bater no backend. | Todos os hooks começam com `creditsExhausted = false` e só fazem reset quando `availableCredits > 0`: `src/hooks/useAssistant.ts:98,162-163`, `src/hooks/useAudioGenerator.ts:193,226-227`, `src/hooks/useImageGenerator.ts:75,102-103`. A própria nota em `src/hooks/useCredits.ts:43-44` reconhece o estado fragmentado. A UI usa esse flag local para mostrar bloqueio: `src/App.tsx:143`, `src/components/ImageStudio.tsx:563`, `src/features/assistant/Assistant.tsx:47`. Mesmo assim, as ações continuam habilitadas por critérios que ignoram saldo: `src/features/assistant/components/AssistantComposer.tsx:69,171`, `src/components/ImageStudio.tsx:462`, `src/components/app/AudioGenerationHandler.tsx:121`. | Há leitura em tempo real do saldo via `useCredits` e o preflight de áudio bloqueia a confirmação final quando falta saldo. O que falta é usar o saldo como fonte de verdade para o bloqueio visual e preventivo. | O produto quer bloqueio preventivo assim que `availableCredits <= 0`, ou só após primeira falha? Hoje o comportamento real é o segundo, mas a UI comunica o primeiro. |
| GAP-04 | MÉDIO | produto + implementação | 91 | **O preflight do Estúdio pode prender o usuário em um modal sem saída local.** Durante o loading, o diálogo desabilita fechamento e o handler não usa cancelamento/timeout local da callable. Se houver lentidão de rede, App Check travado ou callable pendente, o Estúdio fica bloqueado atrás do modal. | `src/components/app/AudioGenerationHandler.tsx:159-162` abre modal e dispara `audioPreflightCallable(options)`. `src/components/app/AudioPreflightDialog.tsx:86` remove `onClose` durante loading e `src/components/app/AudioPreflightDialog.tsx:210` desabilita o botão “Fechar”. Não há `AbortController`, fallback de timeout local ou ação “continuar sem prévia”. | O backend do preflight existe e já devolve erro estruturado de saldo insuficiente; a confirmação também é corretamente bloqueada em `canProceed=false`. O gap é só de resiliência/UX do carregamento. | O preflight precisa ser obrigatório sempre, ou o usuário pode abortar a prévia e voltar a editar? |

## 4. Cenários de borda sem resposta

- Usuário clica em `Cancelar` imediatamente após iniciar `assistant` ou `audio`: não há garantia de que o pedido de cancelamento será reaplicado quando o `ai_request` ainda não existe.
- Usuário abre o app já com `availableCredits = 0`: o header informa saldo zerado, mas os fluxos não entram automaticamente em estado bloqueado.
- Usuário cancela uma geração de imagem já em voo: o botão existe, mas o fluxo atual ainda pode concluir, cobrar e mostrar a imagem.
- Preflight demorado ou travado: o modal impede fechar e não há plano de escape local.

## 5. Checklist de sanidade

- [x] Escopo mapeado com Analyze
- [x] Símbolos rastreados antes de afirmar ausência
- [x] Arquivos centrais lidos por completo
- [x] Dependências cruzadas validadas com Impact Analysis
- [x] NotebookLM consultado para contrato de callable error e cancelamento cooperativo
- [x] Findings limitados a impacto real no usuário

## 6. Próximo passo

`validation-contract`

Definir o contrato esperado de:

- cancelamento confirmado vs best effort
- bloqueio por saldo baseado em saldo real vs baseado em erro anterior
- obrigatoriedade do preflight quando a callable não responde

## Mini-handoff

- Gaps altos: 3
- Top bloqueadores: corrida de cancelamento remoto, cancelamento quebrado no Image Studio, bloqueio por saldo não reconciliado com o saldo real
- Quem precisa responder: produto + arquitetura/worker
- Próximo passo: fechar contrato de cancelamento e bloqueio visual, depois executar correção em lote
