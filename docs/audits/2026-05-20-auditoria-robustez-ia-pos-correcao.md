# Auditoria

## Escopo da revisão

- Estado atual do repositório em `2026-05-20`, após a leva recente de robustez da IA.
- Focos cobertos:
  - cancelamento cooperativo em `assistant`, `audio`, `scene-prompts` e `images`
  - parser de callable errors
  - lifecycle de `ai_requests`
  - confirmação de créditos
  - preflight do Estúdio
  - bloqueio por saldo real
  - riscos transacionais
  - UX enganosa
  - lacunas de testes
- Arquivos lidos por completo no escopo principal:
  - `src/hooks/useCredits.ts`
  - `src/hooks/useAssistant.ts`
  - `src/hooks/useAudioGenerator.ts`
  - `src/hooks/useImageGenerator.ts`
  - `src/hooks/useInlineAssistant.ts`
  - `src/components/app/AudioGenerationHandler.tsx`
  - `src/components/app/AudioPreflightDialog.tsx`
  - `src/features/assistant/Assistant.tsx`
  - `src/features/assistant/components/AssistantComposer.tsx`
  - `src/features/assistant/components/AssistantMessages.tsx`
  - `src/lib/callable-errors.ts`
  - `src/lib/gemini.ts`
  - `functions/src/usage/ai-requests.ts`
  - `functions/src/usage/audio-preflight.ts`
  - `functions/src/usage/credit-policy.ts`
  - `functions/src/usage/credit-estimator.ts`
  - `functions/src/usage/credit-service.ts`
  - `functions/src/genkit/middlewares/credit-metering.ts`
  - `functions/src/genkit/schemas/common.ts`
  - `functions/src/flows/audio-preflight.ts`
  - `functions/src/flows/audio.ts`
  - `functions/src/flows/assistant.ts`
  - `functions/src/flows/images.ts`
  - `functions/src/flows/scene-prompts.ts`
  - `functions/src/flows/inline-assistant.ts`
  - `functions/src/flows/cancel-ai-request.ts`
  - `tests/app/audioGenerationHandler.unit.test.tsx`
  - `tests/hooks/useAssistant.unit.test.tsx`
  - `tests/hooks/useAudioGenerator.unit.test.ts`
  - `tests/hooks/useImageGenerator.unit.test.ts`
  - `tests/lib/callable-errors.unit.test.ts`
- Ferramentas usadas:
  - Analyze `changes`, `file_context`, `impact_analysis`, `area_context`, buscas estruturais com `rg`
  - NotebookLM:
    - Firebase Cloud Functions Docs
    - Firebase Firestore Docs
    - React Docs

## Veredito

**Bloqueadores de merge**

## Achados priorizados

### [CRITICAL] O bloqueio por saldo usa um snapshot cru do Firestore e pode barrar usuário novo ou saldo já recuperável

- **Arquivo:** `src/hooks/useCredits.ts:66`
- **Confidence:** 97/100
- **Categoria:** Firebase
- **Problema:** O frontend trata ausência de `users/{uid}/beta_access/current` e reservas zumbis ainda não reconciliadas como se fossem saldo real igual a zero.
- **Evidência:** `useCredits` escuta `users/{uid}/beta_access/current`; quando o documento não existe, apenas encerra o loading e mantém `availableCredits: 0` (`src/hooks/useCredits.ts:69-88`). Esse valor é usado para bloquear envio/geração em `useAudioGenerator` (`src/hooks/useAudioGenerator.ts:225-231`), `useAssistant` (`src/hooks/useAssistant.ts:162-168`), `useImageGenerator` (`src/hooks/useImageGenerator.ts:110-116`) e `AssistantComposer` (`src/features/assistant/components/AssistantComposer.tsx:71-123`). No backend, o documento é criado sob demanda em `getOrCreateBetaAccess()` (`functions/src/usage/credit-service.ts:264-279`) e reservas stale só são limpas em `reserveCredits()` (`functions/src/usage/credit-service.ts:354-357`), não em `getCreditAvailabilitySnapshot()` (`functions/src/usage/credit-service.ts:154-169`) nem no listener do cliente.
- **Impacto:** Usuário autenticado sem `beta_access/current` pode ficar totalmente impedido de usar áudio, assistente, inline e imagem antes da primeira operação; além disso, créditos presos em `reserved` podem continuar aparecendo como saldo zerado e bloquear o preflight por um saldo que já deveria estar liberado.
- **Sugestão:** Pare de usar o documento cru como gate final. Inicialize/reconcilie `beta_access/current` no fluxo de auth ou passe a buscar o saldo por um snapshot de backend que também expire reservas stale antes de bloquear a UI.

### [WARNING] A confirmação de créditos pode subcobrar e ainda divergir os dois livros-razão

- **Arquivo:** `functions/src/usage/credit-service.ts:534`
- **Confidence:** 95/100
- **Categoria:** Bug
- **Problema:** Quando o custo real supera a estimativa e o saldo restante não cobre a diferença, `confirmCredits()` reduz a cobrança em `beta_access.usedCredits`, mas registra o custo cheio em `credit_months.usedCredits`.
- **Evidência:** Na branch `creditDelta < 0`, se `beta.availableCredits < extraConsumption`, o código zera `newAvailable` e reduz `newUsed` (`functions/src/usage/credit-service.ts:541-548`). Logo depois, `beta_access` usa `usedCredits: newUsed` (`functions/src/usage/credit-service.ts:554-560`), mas `credit_months` grava `usedCredits: month.usedCredits + finalCredits` (`functions/src/usage/credit-service.ts:563-571`).
- **Impacto:** Uma operação bem-sucedida pode consumir mais do que foi reservado, cobrar menos do que deveria no saldo principal e ainda deixar `beta_access/current` e `credit_months/{periodKey}` com números diferentes. Isso afeta cobrança, auditoria e qualquer UI/relatório que leia uma fonte ou outra.
- **Sugestão:** Não “encaixe” o excesso abatendo `newUsed`. Ou a confirmação falha quando faltar saldo extra, ou o sistema precisa registrar explicitamente a diferença como débito/reconciliação e persistir o mesmo número nas duas projeções.

### [WARNING] Cancelar o assistente antes do primeiro chunk deixa uma mensagem vazia salva no histórico

- **Arquivo:** `src/hooks/useAssistant.ts:334`
- **Confidence:** 93/100
- **Categoria:** UX
- **Problema:** O hook cria a bolha vazia do modelo antes do streaming e, quando o cancelamento local acontece sem nenhum chunk recebido, essa entrada não é removida.
- **Evidência:** A mensagem vazia do modelo é adicionada antes do stream (`src/hooks/useAssistant.ts:334-339`). Em caso de aborto local, o catch retorna cedo sem limpar a entrada (`src/hooks/useAssistant.ts:410-411`) e o `finally` só encerra flags (`src/hooks/useAssistant.ts:433-447`). Depois disso, o autosave grava a sessão quando `isStreaming` fica `false` (`src/hooks/useAssistant.ts:170-196`). O componente de mensagens renderiza normalmente um card mesmo quando `cleanText` está vazio (`src/features/assistant/components/AssistantMessages.tsx:162-209`).
- **Impacto:** O usuário pode ver uma bolha vazia depois de apertar parar, e essa conversa “suja” pode ficar persistida no histórico, parecendo falha parcial do assistente.
- **Sugestão:** No caminho de cancelamento sem texto acumulado, remova explicitamente a mensagem placeholder do modelo antes do autosave.

### [SUGGESTION] A nova camada transacional de créditos e `ai_requests` continua praticamente sem cobertura direta

- **Arquivo:** `tests/hooks/useAssistant.unit.test.tsx:1`
- **Confidence:** 92/100
- **Categoria:** Architecture
- **Problema:** Os testes adicionados cobrem principalmente hooks de UI e o parser de erro, mas não exercitam diretamente os ramos críticos de backend em `credit-service` e `ai-requests`.
- **Evidência:** Os arquivos novos/alterados em teste são `tests/app/audioGenerationHandler.unit.test.tsx`, `tests/hooks/useAssistant.unit.test.tsx`, `tests/hooks/useAudioGenerator.unit.test.ts`, `tests/hooks/useImageGenerator.unit.test.ts` e `tests/lib/callable-errors.unit.test.ts`. Não há cobertura direta para cenários como criação inicial de `beta_access/current`, expiração de reservas stale, branch de `confirmCredits()` com consumo extra, ou lifecycle `running -> cancel_requested -> cancelled/completed` em `functions/src/usage/ai-requests.ts`.
- **Impacto:** Os dois problemas acima ficam sem rede de proteção automática e tendem a reaparecer em refactors, porque o comportamento crítico está concentrado em branches de servidor que hoje não são exercitadas.
- **Sugestão:** Adicione testes unitários do backend para `credit-service.ts` e `ai-requests.ts`, com foco em: usuário sem `beta_access/current`, reserva stale expirada antes do snapshot, confirmação com `finalCredits > estimatedCredits`, cancelamento pedido antes/depois de `startAiRequest()`.

## O que parece saudável

- O parser de callable errors está alinhado com o contrato documentado do Firebase callable moderno, lendo `error.details` como caminho principal e mantendo fallback defensivo para estruturas antigas.
- `requestId` foi padronizado nos flows relevantes e validado antes de entrar no ciclo transacional.
- `audio`, `assistant`, `images` e `scene-prompts` agora têm caminho explícito para `startAiRequest()` e `finishAiRequest()`, com distinção entre `completed`, `failed` e `cancelled`.
- O preflight do Estúdio já evita confirmar quando a resposta chega tarde ou quando o usuário fecha o modal no meio do carregamento.

## Limites da revisão

- Revisão estática apenas; não executei `lint`, `typecheck`, build, testes ou navegador real.
- Não validei regras do Firestore/Storage em tempo de execução nem comportamento contra emuladores.
- Não confirmei como o banco de produção está populando `beta_access/current`; o achado crítico considera apenas o código atual do repositório, no qual não existe criação automática desse documento no frontend nem em outro fluxo de bootstrap visível.

## Próximo passo recomendado

`fixer` para corrigir os bloqueios de saldo/leitura e a divergência transacional, seguido de `test` focado em `functions/src/usage/credit-service.ts` e `functions/src/usage/ai-requests.ts`.
