# Auditoria

## Escopo da revisão

- Estado atual do repositório em `2026-05-20`, após as correções recentes de créditos, cancelamento e preflight de IA.
- Focos cobertos:
  - bugs reais
  - regressões comportamentais
  - inconsistências de cobrança/saldo
  - cancelamento incompleto
  - persistência de projetos/cenas
  - lacunas de testes
- Arquivos lidos por completo no escopo principal:
  - `src/hooks/useCredits.ts`
  - `src/hooks/useAudioGenerator.ts`
  - `src/hooks/useAssistant.ts`
  - `src/hooks/useImageGenerator.ts`
  - `src/components/app/AudioGenerationHandler.tsx`
  - `src/components/app/AudioPreflightDialog.tsx`
  - `src/lib/gemini.ts`
  - `src/lib/callable-errors.ts`
  - `src/lib/db/projects.ts`
  - `src/lib/db/generations.ts`
  - `src/features/studio/store/audioGeneratorStore.ts`
  - `src/pages/VideoPage.tsx`
  - `src/features/video-render/hooks/useVideoExporter.tsx`
  - `src/features/video-render/hooks/useTranscription.ts`
  - `functions/src/usage/credit-service.ts`
  - `functions/src/usage/ai-requests.ts`
  - `functions/src/usage/audio-preflight.ts`
  - `functions/src/genkit/middlewares/credit-metering.ts`
  - `functions/src/flows/audio.ts`
  - `functions/src/flows/audio-preflight.ts`
  - `functions/src/flows/images.ts`
  - `functions/src/flows/cancel-ai-request.ts`
  - `functions/src/flows/credit-snapshot.ts`
  - `tests/hooks/useAudioGenerator.unit.test.ts`
  - `tests/hooks/useAssistant.unit.test.tsx`
  - `tests/app/audioGenerationHandler.unit.test.tsx`
  - `tests/hooks/useImageGenerator.unit.test.ts`
  - `tests/functions/credit-service.unit.test.ts`
- Ferramentas usadas:
  - Analyze `changes`, `project_map`, `describe`, `file_context`, `impact_analysis`
  - NotebookLM `React Docs` e `Firebase Firestore Docs`

## Veredito

**Ajustes recomendados**

## Achados priorizados

### [WARNING] Primeira operação pode criar `beta_access/current` incompleto e corromper o snapshot de créditos

- **Arquivo:** `functions/src/usage/credit-service.ts:394`
- **Confidence:** 95/100
- **Categoria:** Firebase
- **Problema:** `reserveCredits()` promete criar o acesso beta sob demanda, mas quando o documento não existe grava só campos parciais e deixa o saldo sem metadados obrigatórios.
- **Evidência:**
  ```ts
  if (!betaSnap.exists) {
    beta = createInitialBetaAccess(currentPeriod);
  }
  // ...
  const updatedBeta: Partial<BetaAccess> = {
    availableCredits: beta.availableCredits - estimatedCredits,
    reservedCredits: beta.reservedCredits + estimatedCredits,
    updatedAt: Date.now(),
  };
  transaction.set(betaRef, updatedBeta, { merge: true });
  ```
  e depois:
  ```ts
  if (isNewPeriod(data.currentPeriodKey)) {
    const fresh: BetaAccess = {
      currentPeriodKey: currentPeriod,
      bonusCredits: current.bonusCredits,
      availableCredits: MONTHLY_BASE_CREDITS + current.bonusCredits,
    };
  }
  ```
- **Impacto:** usuário novo que dispara `assistant`/`image` antes do bootstrap de `useCredits` pode ficar com `beta_access/current` sem `currentPeriodKey`, `baseCredits`, `usedCredits` e `feedbackBonusGranted`; a próxima reconciliação pode produzir saldo inválido e bloquear/embaralhar cobrança.
- **Sugestão:** quando `betaSnap` ou `monthSnap` não existirem, grave o objeto completo (`beta` / `month`) na transação, não apenas o delta parcial; adicione teste de `reserveCredits()` com usuário sem documentos prévios.

### [WARNING] Falha ou cancelamento de áudio deixa `projectId` fantasma e permite persistir vídeos/legendas em projeto inexistente

- **Arquivo:** `src/hooks/useAudioGenerator.ts:299`
- **Confidence:** 94/100
- **Categoria:** Bug
- **Problema:** o store recebe um `projectId` novo antes de haver qualquer salvamento bem-sucedido, e esse ID não é restaurado no caminho de erro/cancelamento.
- **Evidência:**
  ```ts
  const currentProjectId = crypto.randomUUID();
  storeApi.getState().setProjectId(currentProjectId);
  ```
  e, no cancelamento/erro:
  ```ts
  restoreLastSuccessfulState();
  ```
  enquanto o restore só repõe `audioUrl`, `audioBlob`, `scenes` e `audioSegments`:
  ```ts
  useAudioGeneratorStore.getState().setScenes(prev.scenes);
  useAudioGeneratorStore.getState().setAudioSegments(prev.audioSegments);
  ```
  consumo posterior:
  ```ts
  const currentProjectId = useAudioGeneratorStore((s) => s.projectId);
  useTranscription(currentProjectId, script, userId);
  saveVideoToProject({ projectId, ... }, userId)
  ```
- **Impacto:** depois de uma geração abortada ou com erro, a página de vídeo passa a tratar um projeto inexistente como ativo; legendas e exportações podem ser salvas em subcoleções órfãs (`projects/{id}/videos`, `projects/{id}/...`) sem documento pai real.
- **Sugestão:** só promover `projectId` para o store após `saveProject()`/`saveAudioToProject()` concluírem, ou salve/restaure também o `projectId` anterior nos caminhos de rollback.

### [WARNING] As cenas persistidas no projeto ficam com timestamps antigos, diferentes dos timestamps corrigidos por silêncio

- **Arquivo:** `src/hooks/useAudioGenerator.ts:493`
- **Confidence:** 97/100
- **Categoria:** Bug
- **Problema:** cada imagem é salva no projeto com o timestamp vindo do Gemini antes da correção final por `detectSceneBoundaries()`.
- **Evidência:**
  ```ts
  const projectImage: ProjectImage = {
    prompt: prompts[i].prompt,
    timestamp: prompts[i].timestamp,
  };
  await saveImageToProject(projectImage, userId);
  ```
  e só depois:
  ```ts
  const detectedBoundaries = await detectSceneBoundaries(wavBlob, prompts.length);
  generatedScenes[i].timestamp = detectedBoundaries[i];
  ```
- **Impacto:** a UI passa a usar os timestamps ajustados, mas a biblioteca/projeto salvo continua com os timestamps antigos; ao reabrir o projeto, exportar vídeo ou mandar para Speed Paint, a sequência temporal pode voltar desalinhada.
- **Sugestão:** faça o refinamento dos timestamps antes de persistir as `ProjectImage`, ou atualize as imagens já salvas após `detectSceneBoundaries()`.

### [WARNING] `retryLastMessage()` reenvia o chat com o fallback de erro ainda presente no histórico enviado ao backend

- **Arquivo:** `src/hooks/useAssistant.ts:327`
- **Confidence:** 93/100
- **Categoria:** Bug
- **Problema:** o retry remove a mensagem de erro no estado visual, mas chama `sendMessage()` na mesma renderização, então a callback ainda fecha sobre `messages` antigos.
- **Evidência:**
  ```ts
  history: messages.slice(1).map((msg) => ({
  ```
  e no retry:
  ```ts
  setMessages((prev) => prev.filter((_, idx) => idx !== lastErrorIdx));
  void sendMessage(lastUserMsg.text, lastUserMsg.attachments);
  ```
- **Impacto:** o backend recebe o fallback `__RETRY_DETECTED__` como resposta anterior do modelo, poluindo o contexto do retry, aumentando input cobrado e podendo enviesar a nova resposta.
- **Sugestão:** derive um `nextMessages` local antes do reenvio e passe esse histórico explicitamente para `sendMessage`, ou faça o retry em um efeito após o estado novo ser aplicado.

### [SUGGESTION] A suíte nova não cobre os cenários exatos que deixaram essas regressões passar

- **Arquivo:** `tests/hooks/useAudioGenerator.unit.test.ts:20`
- **Confidence:** 92/100
- **Categoria:** Architecture
- **Problema:** os testes atuais cobrem fluxo feliz e wiring básico, mas não validam os caminhos regressivos mais frágeis do diff.
- **Evidência:**
  ```ts
  generateScenePrompts: vi.fn().mockResolvedValue({
    prompts: [{ prompt: 'Uma cena bonita', timestamp: 0 }],
  })
  saveImageToProject: vi.fn().mockResolvedValue(undefined)
  detectSceneBoundaries: vi.fn().mockResolvedValue([0, 30, 60])
  ```
  e no retry do assistente o teste só verifica remoção visual:
  ```ts
  result.current.retryLastMessage();
  // A mensagem de erro deve ter sido removida
  ```
- **Impacto:** hoje não há proteção automatizada para:
  - `reserveCredits()` criando documento pela primeira vez
  - rollback de `projectId` após erro/cancelamento
  - persistência dos timestamps corrigidos
  - histórico enviado no retry do assistente
- **Sugestão:** adicionar testes direcionados para esses quatro caminhos antes de seguir com novas mudanças na trilha de IA.

## O que parece saudável

- O preflight de áudio agora separa prévia e execução real e já trata saldo alterado depois da confirmação com `CREDITS_CHANGED_AFTER_PREFLIGHT`.
- O cancelamento cooperativo existe em `audio`, `images` e `assistant`, com `requestId` rastreável e `ai_requests` explícito.
- O parser de callable errors ficou consistente entre frontend e backend, especialmente para créditos e cancelamento.
- `confirmCredits()` passou a validar a soma de saldo livre + reserva antes de fechar o consumo final, reduzindo risco de saldo negativo silencioso.

## Limites da revisão

- Revisão estritamente estática: não rodei build, typecheck, lint, testes ou navegador.
- Não validei regras do Firestore/Storage nem comportamento em emulador; a conclusão sobre projetos órfãos parte da semântica do Firestore e do código atual.
- Não revisei toda a árvore de UI; foquei nos fluxos afetados por créditos, cancelamento, preflight e persistência.

## Próximo passo recomendado

`fixer`
