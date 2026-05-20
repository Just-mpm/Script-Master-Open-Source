# Scan de Lacunas

## 1. Contexto assumido

Escopo analisado no código atual: robustez recente da IA no Estúdio, com foco em cancelamento cooperativo, bloqueio por saldo, preflight de áudio, sincronização entre prévia e execução, confirmação de créditos, reconciliação visual de estado e preservação do comportamento esperado.

Áreas mapeadas e lidas por completo:
- `Áudio & Voz (TTS)`, `App Shell & Navegação`, `Estúdio de Produção`
- Arquivos centrais de frontend: `src/components/app/AudioGenerationHandler.tsx`, `src/hooks/useAudioGenerator.ts`, `src/components/app/AudioPreflightDialog.tsx`, `src/hooks/useCredits.ts`, `src/components/Library.tsx`, `src/lib/db/projects.ts`
- Arquivos centrais de backend: `functions/src/flows/audio.ts`, `functions/src/flows/audio-preflight.ts`, `functions/src/usage/audio-preflight.ts`, `functions/src/flows/cancel-ai-request.ts`, `functions/src/usage/ai-requests.ts`, `functions/src/genkit/middlewares/credit-metering.ts`, `functions/src/usage/credit-service.ts`

Validações externas usadas antes de fechar conclusões:
- NotebookLM `Firebase Cloud Functions Docs`: cancelamento server-side depende de cancelamento cooperativo com estado externo e checkpoints, não há interrupção automática confiável quando o cliente aborta.
- NotebookLM `Firebase Firestore Docs`: reserva/confirmação/reversão transacional com `requestId` é o padrão correto; prévia fora da transação não garante saldo no momento da execução.
- NotebookLM `React Docs`: resultados tardios precisam ser ignorados e estado assíncrono precisa evitar sobrescrita obsoleta.

## 2. Mapa rápido: sólido vs frágil

### Sólido

- Cancelamento cooperativo no backend existe e foi aplicado nos flows pesados com `ai_requests` + `throwIfAiCancellationRequested`.
- A proteção de corrida entre prévia tardia e dialog fechado está bem tratada em `AudioGenerationHandler` via `preflightRequestTokenRef`.
- O backend de créditos está corretamente orientado a transação/idempotência com `reserve -> confirm -> revert`.
- O fluxo de áudio já trata explicitamente saldo alterado após a prévia com `CREDITS_CHANGED_AFTER_PREFLIGHT`.

### Frágil

- O bloqueio amigável do frontend depende de `useCredits`, mas o bootstrap do saldo inicial está inconsistente com a criação lazy de `beta_access/current` no backend.
- O ciclo de vida do projeto do Estúdio é iniciado cedo demais, antes de existir saída real.
- A reconciliação visual do estado parcial falha exatamente nos cenários em que a robustez deveria ajudar: saldo mudando ou erro técnico no meio do pacote visual.
- O contrato de “confirmar geração” ficou parcialmente ambíguo: a UI resume o pacote inteiro, mas a confirmação forte acontece só na etapa de áudio.

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---:|---:|---|---|---|---|
| SCAN-01 | CRÍTICO | produto + implementação | 97 | Usuário novo pode ficar bloqueado por saldo `0` antes da primeira geração. `useCredits()` mantém estado anterior/zerado quando não há `beta_access/current`, e os hooks de IA bloqueiam a ação com base nisso. Como o documento de saldo é criado lazy no backend, o próprio bloqueio amigável pode impedir a primeira chamada que criaria o saldo. | `src/hooks/useCredits.ts:61-62` e `:85-87` só fazem `loading: false` sem resetar/seedar créditos quando `user` é `null` ou o documento não existe. `src/hooks/useAudioGenerator.ts:225` bloqueia com `availableCredits <= 0`; o mesmo padrão aparece em `src/hooks/useImageGenerator.ts:110` e `src/hooks/useInlineAssistant.ts:20`. O backend cria/garante o documento de saldo apenas quando entra em `getCreditAvailabilitySnapshot` / `reserveCredits` (`functions/src/usage/credit-service.ts:159`, `:264-320`, `:381-388`), mas o frontend pode impedir chegar lá. | Verifiquei se existia bootstrap anterior do saldo no código atual com busca em `src/` e `functions/`; só encontrei criação lazy no backend e uso do saldo no frontend. Não há handling alternativo no parent. | O saldo inicial será criado no login/onboarding, ou o frontend deve tratar “documento ausente” como “saldo ainda não carregado/inicializável” em vez de “saldo zerado”? |
| SCAN-02 | ALTO | implementação + UX | 95 | O Estúdio cria projetos fantasmas na biblioteca em tentativas que falham, são canceladas ou param antes de gerar qualquer saída. O projeto é salvo antes da chamada ao backend e nunca é limpo quando a geração não entrega áudio/cenas. | `src/hooks/useAudioGenerator.ts:298-327` cria `projectId` e faz `saveProject()` antes da geração. Em cancelamento/falha, o hook só restaura mídia anterior (`:605-624`), sem apagar o projeto recém-criado. A biblioteca carrega todos os projetos sem filtrar “vazios” em `src/components/Library.tsx:122`, `:449`, `:493`; `src/lib/db/projects.ts:60-80` persiste e lista esses projetos normalmente. | Verifiquei se havia limpeza posterior em `projects.ts`, `Library.tsx` ou branches de erro/cancelamento do hook. Não há exclusão automática nem filtro por projeto sem áudio/imagem/vídeo. | O projeto só deve nascer depois da primeira saída real, ou o produto quer rascunhos persistidos e então precisa marcá-los/ocultá-los explicitamente? |
| SCAN-03 | ALTO | implementação + contrato visual | 94 | Quando o pacote visual falha no meio por saldo ou erro técnico, cenas já geradas podem ser perdidas na UI mesmo tendo sido geradas e até salvas no projeto. Isso quebra a reconciliação entre execução real, prévia do estúdio e biblioteca. | `src/hooks/useAudioGenerator.ts:490-508` acumula `generatedScenes` e salva cada imagem com `saveImageToProject()`. As cenas só entram no store no sucesso total (`:539-543`) ou no cancelamento do usuário (`:552-557`). Na falha por crédito, o código só mostra warning (`:564-570`) e não preserva as cenas parciais. Na falha técnica, ele zera explicitamente com `setScenes([])` (`:572-579`). | Verifiquei se havia sincronização incremental em outro arquivo, wrapper ou parent; não há. O único branch que preserva parcial é cancelamento explícito do usuário. | Em falha parcial, o comportamento esperado é manter e mostrar as cenas já prontas, ou esconder tudo? Se for manter, o store e a mensagem precisam refletir isso de forma consistente. |

## 4. Cenários de borda sem resposta

- A prévia comunica `Saldo atual`, `Custo previsto`, `Saldo após concluir` e CTA `Confirmar geração` (`src/components/app/AudioPreflightDialog.tsx:177-218`), mas a nota do backend diz que a parte visual “continua sujeita ao saldo disponível em cada etapa” (`functions/src/usage/audio-preflight.ts:151-160`). Hoje isso funciona como “confirmação forte do áudio + estimativa do pacote visual”, não como reserva integral. Falta decidir se esse contrato é aceitável para o produto ou se o texto/UX precisa deixar isso mais explícito.
- `useCredits()` também preserva estado anterior em logout/troca de conta, então o mesmo bug de bootstrap pode aparecer como saldo herdado entre sessões, não só em usuário novo.
- Não encontrei política definida para rascunho de projeto iniciado mas sem saída: deve aparecer na biblioteca, ficar oculto até primeira mídia ou ser limpado automaticamente?

## 5. Checklist de sanidade

- [x] Mapeei o escopo com Analyze (`project_map`, `area_detail`, `impact_analysis`)
- [x] Li por completo os arquivos centrais de frontend e backend do fluxo
- [x] Usei rastreamento/busca estrutural antes de afirmar ausência de handling alternativo
- [x] Verifiquei handling no parent quando aplicável (`App.tsx`, `Library.tsx`)
- [x] Consultei NotebookLM para os pontos dependentes de React/Firebase/Firestore
- [x] Mantive só lacunas com impacto real em usuário

## 6. Próximo passo

`worker`

Mini-handoff:
- Gaps altos/críticos: 3
- Top bloqueadores: `SCAN-01` (usuário novo pode ficar bloqueado sem conseguir iniciar), `SCAN-03` (estado visual parcial se perde), `SCAN-02` (biblioteca acumula projetos fantasmas)
- Quem precisa responder: produto + engenharia
- Próximo passo recomendado: executar correções em lote curto começando por bootstrap de créditos, depois ciclo de vida do projeto e por fim reconciliação de cenas parciais
