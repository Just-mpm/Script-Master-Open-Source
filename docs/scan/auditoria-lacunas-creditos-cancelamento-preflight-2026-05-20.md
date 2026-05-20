# Auditoria de Lacunas

## 1. Contexto assumido

- Escopo auditado: correções recentes de créditos, cancelamento cooperativo e preflight de IA.
- Áreas lidas por completo: `src/hooks/useAudioGenerator.ts`, `src/hooks/useAssistant.ts`, `src/hooks/useImageGenerator.ts`, `src/hooks/useInlineAssistant.ts`, `src/App.tsx`, `src/components/app/AudioGenerationHandler.tsx`, `src/components/app/AudioPreflightDialog.tsx`, `src/features/studio/components/InlineAIWidget.tsx`, `functions/src/flows/audio-preflight.ts`, `functions/src/flows/audio.ts`, `functions/src/flows/assistant.ts`, `functions/src/flows/images.ts`, `functions/src/flows/scene-prompts.ts`, `functions/src/flows/inline-assistant.ts`, `functions/src/flows/cancel-ai-request.ts`, `functions/src/flows/credit-snapshot.ts`, `functions/src/genkit/middlewares/credit-metering.ts`, `functions/src/genkit/schemas/common.ts`, `functions/src/index.ts`, `functions/src/usage/audio-preflight.ts`, `functions/src/usage/ai-requests.ts`, `functions/src/usage/credit-service.ts`, `functions/src/usage/index.ts`.
- Ferramentas de análise usadas antes de reportar: `project_map`, `area_detail`, `area_context`, `find`, `impact_analysis`.
- Validação documental: NotebookLM de Firebase Cloud Functions e Firestore.
- Testes executados: `bun run test -- tests/functions/credit-service.unit.test.ts tests/functions/ai-requests.unit.test.ts tests/hooks/useAudioGenerator.unit.test.ts tests/hooks/useAssistant.unit.test.tsx tests/hooks/useImageGenerator.unit.test.ts` -> 41 testes, todos passando.

## 2. Mapa rápido: sólido vs frágil

### Sólido

- Os flows principais de `audio`, `assistant`, `images` e `scenePrompts` já têm reserva/confirmação/reversão de créditos.
- O cancelamento cooperativo foi realmente implantado nos fluxos mais pesados: `audio`, `assistant`, `images` e `scene_prompts`.
- O preflight de áudio melhorou a UX e o contrato com o backend ao carregar uma estimativa explícita antes da confirmação.
- Há testes cobrindo partes importantes de créditos e cancelamento, incluindo reserva stale em snapshot e status de `ai_requests`.

### Frágil

- A consistência entre `beta_access/current` e `credit_months/{period}` ainda depende de caminhos parciais.
- O rollover mensal não está centralizado no ponto de reserva, então parte dos flows depende de um refresh prévio ter acontecido.
- O inline assistant ficou fora do mesmo contrato de cancelamento e observabilidade adotado nos demais flows.

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---:|---|---|---|---|
| GAP-01 | ALTO | consistência transacional | 97 | A expiração de reservas antigas corrige `beta_access/current`, mas não corrige `credit_months/{period}`. Depois disso, um usuário pode voltar a ver saldo liberado no app e ainda assim falhar na próxima confirmação, porque o backend continua usando o agregado mensal stale. | `functions/src/usage/credit-service.ts:217-242` expira reserva atualizando só `betaRef` e `credit_events`; `functions/src/usage/credit-service.ts:405-432` reaproveita `credit_months` sem saneamento; `functions/src/usage/credit-service.ts:523-540` exige que `beta_access` e `credit_months` estejam consistentes para confirmar; `tests/functions/credit-service.unit.test.ts:77-99` cobre só a liberação no snapshot, e `:101-178` cobre confirmação isolada, mas não a sequência real após expiração. O NotebookLM de Firestore confirmou que documentos relacionados ficam inalterados se não forem atualizados na mesma transação. | Verifiquei se havia reconciliação equivalente em outro arquivo: não há. `expireStaleReservations` só existe em `credit-service.ts` e não aparece em mais nenhum lugar via `find`. | A decisão técnica é centralizar a reconciliação stale em uma única transação que atualize `beta_access/current`, `credit_months/{period}` e `credit_events/{requestId}` juntos. |
| GAP-02 | ALTO | contrato frontend/backend | 94 | O rollover mensal só acontece em `getOrCreateBetaAccess()` e, na prática, não roda no caminho de reserva da maioria dos flows. Em sessão longa atravessando a virada do mês, `assistant`, `images`, `scenePrompts`, `inlineAssistant` e `chunking` podem continuar usando o saldo do mês antigo e negar uso mesmo após a renovação mensal. | `functions/src/usage/credit-service.ts:270-328` contém o rollover; `functions/src/usage/credit-service.ts:365-398` faz reserva lendo `beta_access/current` sem chamar `getOrCreateBetaAccess()` nem checar `isNewPeriod`; `mcp__analyze__.aitool_find("getOrCreateBetaAccess")` mostrou uso real só em `feedback`; `mcp__analyze__.aitool_find("withCreditMetering")` mostrou que `assistant`, `images`, `inline-assistant`, `scene-prompts` e `chunking` entram por `reserveCredits`; `src/hooks/useCredits.ts:124-228` só faz refresh no mount e no caso `available<=0 && reserved>0`, sem refresh por mudança de período. | Verifiquei handling alternativo no parent e no backend: `getCreditAvailabilitySnapshot()` faz rollover, mas `find` mostrou que ele só é chamado por `audio`, `audioPreflight` e `creditSnapshot`, não pelos demais flows. | A decisão aqui é mover o rollover para o próprio `reserveCredits()` ou para um guard transacional chamado por todo flow antes da reserva. |
| GAP-03 | MÉDIO | robustez / UX / observabilidade | 93 | O inline assistant ficou fora do padrão novo de cancelamento cooperativo e de trilha de execução. O usuário não consegue interromper uma reescrita já iniciada, e o backend também não registra `ai_requests`, então suporte e reconciliação ficam cegos nesse fluxo. Como o Firebase não interrompe a function automaticamente quando o cliente aborta, a operação pode continuar rodando e consumir créditos mesmo após abandono da UI. | `src/hooks/useInlineAssistant.ts:12-95` expõe só `rewrite`, sem `AbortController`, sem `cancelAiRequest` e sem cleanup; `src/features/studio/components/InlineAIWidget.tsx:310-331` desabilita o botão de cancelar enquanto processa, sem ação de stop; `functions/src/flows/inline-assistant.ts:30-41` não importa `startAiRequest`, `throwIfAiCancellationRequested` nem `finishAiRequest`; `functions/src/flows/inline-assistant.ts:151-228` reserva/confirma créditos, mas não consulta cancelamento nem grava status em `users/{uid}/ai_requests`; `mcp__analyze__.aitool_find("startAiRequest")` e `mcp__analyze__.aitool_find("finishAiRequest")` confirmaram ausência do fluxo inline. O NotebookLM de Cloud Functions confirmou que abortar o cliente não interrompe automaticamente a execução no servidor. | Verifiquei se havia handling no parent: `InlineAIWidget` não oferece stop real depois do submit, e não existe flow paralelo de cancelamento ligado ao inline. | A decisão é alinhar o inline assistant ao mesmo contrato dos outros flows: `startAiRequest` + `cancelAiRequest` + checkpoints com `throwIfAiCancellationRequested` + `finishAiRequest`. |

## 4. Cenários de borda sem resposta

- Usuário com aba aberta na virada do mês e sem recarregar a aplicação.
- Reserva stale expirada e nova geração confirmada no mesmo período.
- Inline assistant abandonado no meio da execução por navegação, fechamento de aba ou troca de página.
- `credit_months` já divergente em produção: hoje não há rotina explícita de backfill/reconciliação.

## 5. Checklist de sanidade

- [x] Mapeei o escopo com Analyze (`project_map`, `area_detail`, `area_context`).
- [x] Usei rastreamento de símbolos do Analyze antes de afirmar ausência.
- [x] Li os arquivos centrais completos dos gaps reportados.
- [x] Verifiquei handling equivalente nos pais e nos outros flows.
- [x] Confirmei impacto em usuário real, não só melhoria teórica.
- [x] Consultei NotebookLM para Firebase Functions e Firestore.
- [x] Rodei testes existentes das áreas afetadas.

## 6. Próximo passo

- `architecture`

## Mini-handoff

- Gaps altos: 2
- Top bloqueadores: `GAP-01` e `GAP-02`, porque podem deixar o saldo visível e o saldo transacional divergirem, quebrando uso real de IA.
- Quem precisa responder: backend/arquitetura.
- Próximo passo objetivo: corrigir `credit-service.ts` para que rollover e expiração stale atualizem todos os agregados na mesma trilha transacional, depois alinhar o inline assistant ao contrato padrão de cancelamento/observabilidade.
