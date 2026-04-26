# Audit Técnico #1 — Hooks, Features, Auth & Performance

**Data:** 2026-04-26
**Branch:** `auto/audit-performance-ux-polish`
**Escopo:** `src/hooks/` (6 hooks), `src/features/` (assistant, studio, video-render, speed-paint), `src/contexts/` (Auth, Audio), `src/lib/` (gemini, db, rate-limiter), `src/App.tsx`
**Arquivos auditados:** 30+ arquivos, ~6.500 linhas

---

## Resumo Executivo

| Severidade | Count | Categorias |
|---|---|---|
| P0 (CRITICAL) | 1 | Bug — runtime |
| P1 (WARNING) | 4 | Memory leak, bug, race condition, type safety |
| P2 (SUGGESTION) | 3 | Cleanup, stale state, UX |

**Total findings:** 8 (após gate de confiança — 5 descartados por confidence < 80)

---

## Findings Detalhados

---

### [P0] CRITICAL — `collectionGroup` referenciado em vez de `collectionGroupName` no log de cleanup

- **Arquivo:** `src/lib/db/account-cleanup.ts:176`
- **Confidence:** 97/100
- **Categoria:** Bug
- **Problema:** Na função `deleteCollectionGroup`, a template string usa `${collectionGroup}` que referencia a **função importada** do Firebase (`collectionGroup` de `firebase/firestore`), não o parâmetro `collectionGroupName`. O resultado é a string `"[object Object]"` no log, mascarando qual collection realmente falhou.
- **Evidência:**
  ```typescript
  // Linha 161 — parâmetro se chama collectionGroupName
  async function deleteCollectionGroup(
    collectionGroupName: string,
    userId: string,
    storagePrefix: string,
  ): Promise<void> {

  // Linha 176 — usa ${collectionGroup} (função importada) em vez de ${collectionGroupName}
  `Erro ao deletar ${collectionGroup} do storage durante cleanup:`,
  ```
- **Impacto:** Logs de cleanup LGPD ficam inúteis — impossível diagnosticar falhas em exclusão de dados do usuário. Não causa crash, mas mascara erros reais durante operação crítica de LGPD.
- **Correção:** Substituir `${collectionGroup}` por `${collectionGroupName}` na linha 176.

---

### [P1] WARNING — Memory leak: setTimeout no finally block sem cleanup ao desmontar

- **Arquivo:** `src/hooks/useAudioGenerator.ts:498,626`
- **Confidence:** 88/100
- **Categoria:** Memory Leak
- **Problema:** O hook usa `setTimeout(() => setError(''), 8000)` para auto-dismiss de erros (linhas 498 e 626), mas nunca armazena o timer ID nem faz cleanup no useEffect de unmount. Se o componente desmontar antes dos 8 segundos, o callback executa `setError` em um componente desmontado.
- **Evidência:**
  ```typescript
  // Linha 498 — dentro de catch, sem guardar referência
  setError('O audio foi gerado, mas houve um erro ao salvar na nuvem...');
  setTimeout(() => setError(''), 8000);

  // Linha 626 — mesmo padrão
  setError(errorMessage);
  setTimeout(() => setError(''), 8000);
  ```
- **Impacto:** `setState` em componente desmontado — no React 19 com strict mode isso pode gerar warning no console. Em produção, o `setError` simplesmente executa sem efeito (sem crash), mas é um anti-pattern documentado.
- **Correção:** Usar `useRef<number>()` para guardar timer IDs e limpar no cleanup effect:
  ```typescript
  const errorTimerRef = useRef<number>(0);
  useEffect(() => () => clearTimeout(errorTimerRef.current), []);
  ```

---

### [P1] WARNING — Race condition: auto-save do assistente dispara ao montar com mensagem de welcome

- **Arquivo:** `src/hooks/useAssistant.ts:101-119`
- **Confidence:** 85/100
- **Categoria:** Race Condition
- **Problema:** O useEffect de auto-save dispara sempre que `messages` muda e `isStreaming` é false. O estado inicial inclui `[WELCOME_MESSAGE]` (length = 1). Como a condição é `messages.length > 1`, o save não dispara na montagem — **mas** dispara imediatamente após a primeira resposta do modelo (quando `isStreaming` transiciona para false). Se o usuário navegar para outra rota durante o streaming, o cleanup aborta a chamada mas o useEffect de auto-save ainda dispara com a mensagem vazia (que foi adicionada no fluxo).
- **Evidência:**
  ```typescript
  // Linha 102-103 — dispara quando isStreaming vira false
  useEffect(() => {
    if (isStreaming) return;
    if (messages.length > 1) {
      // ... save session
    }
  }, [messages, currentSessionId, user, isStreaming]);
  ```
  Quando o streaming é abortado, o finally block remove a mensagem vazia (linha 267-273) e depois seta `isStreaming = false` (linha 281). Isso dispara o useEffect que salva a sessão sem a resposta — comportamento correto. **Porém**, entre a remoção da mensagem vazia e o set de `isStreaming`, há um batch do React que pode causar uma renderização intermediária com `isStreaming = false` e a mensagem vazia ainda presente.
- **Impacto:** Em caso de abort rápido (usário envia nova mensagem imediatamente), pode salvar uma sessão com mensagem vazia do modelo no Firestore/IndexedDB. Baixa probabilidade, impacto limitado a dados.
- **Correção:** Adicionar guard para verificar se a última mensagem tem texto não-vazio antes de salvar, ou usar `useRef` para rastrear se a sessão precisa de save.

---

### [P1] WARNING — Duplicate audio generation: App.tsx e StudioPage instanciam useAudioGenerator separadamente

- **Arquivo:** `src/App.tsx:167`, `src/pages/StudioPage.tsx:51`, `src/pages/VideoPage.tsx:49`
- **Confidence:** 83/100
- **Categoria:** Bug (Design)
- **Problema:** `useAudioGenerator()` é chamado em **3 componentes diferentes** (App, StudioPage, VideoPage). Cada chamada cria um estado independente. App.tsx usa o hook para gerar áudio a partir da ActionBar global, enquanto StudioPage o usa para gerar a partir do Inspector. Quando ambos estão montados (estúdio ativo), são duas instâncias com estado separado — `isGenerating`, `audioUrl`, `scenes`, etc. são independentes.
- **Evidência:**
  ```typescript
  // App.tsx:167 — instancia 1
  const { isGenerating, audioUrl, scenes, generateAudio, ... } = useAudioGenerator();

  // StudioPage.tsx:51 — instancia 2
  const { isGenerating, scenes, generateAudio } = useAudioGenerator();

  // VideoPage.tsx:49 — instancia 3 (para loadProjectData)
  const { audioUrl, scenes, audioSegments, projectId, loadProjectData } = useAudioGenerator();
  ```
- **Impacto:** Quando o usuário gera áudio pelo StudioPage, App.tsx não reflete `isGenerating = true` (não desabilita o botão global). A ActionBar global e os estados internos ficam dessincronizados. O design funciona porque StudioPage e App.tsx roteiam chamadas para a mesma lógica, mas os **estados visuais** (progress, loading) estão separados. VideoPage herda `audioUrl` e `scenes` de sua própria instância — que não recebe dados da geração do estúdio.
- **Correção:** Mover o estado de geração para Zustand store (padrão `videoRenderBridge`), ou levantar `useAudioGenerator` para um componente ancestral comum e passar via context.

---

### [P1] WARNING — `audio.addEventListener` leak em `loadProjectData` quando componente desmonta

- **Arquivo:** `src/hooks/useAudioGenerator.ts:175-191`
- **Confidence:** 82/100
- **Categoria:** Memory Leak
- **Problema:** Dentro de `loadProjectData`, quando a URL não é blob, um `Audio()` element é criado com listeners de `loadedmetadata` e `error`. Se o componente desmontar antes do evento disparar, os listeners nunca são removidos e o Audio element nunca é garbage collected. A limpeza desses listeners depende do evento disparar.
- **Evidência:**
  ```typescript
  // Linhas 175-191 — dentro de callback async, sem cleanup
  const audio = new Audio();
  const handleLoaded = () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setAudioDuration(audio.duration);
    }
    audio.removeEventListener('loadedmetadata', handleLoaded);
    audio.removeEventListener('error', handleError);
  };
  const handleError = () => {
    log.warn('Falha ao carregar metadados...');
    audio.removeEventListener('loadedmetadata', handleLoaded);
    audio.removeEventListener('error', handleError);
  };
  audio.addEventListener('loadedmetadata', handleLoaded);
  audio.addEventListener('error', handleError);
  audio.preload = 'metadata';
  audio.src = url;
  ```
- **Impacto:** Memory leak temporário — Audio element + listeners ficam presos até o evento disparar ou a tab fechar. Em roteamento rápido entre projetos na biblioteca, acumula Audio elements órfãos.
- **Correção:** Usar `AbortController` para associar o ciclo de vida, ou guardar a referência em um ref para limpar no unmount.

---

### [P2] SUGGESTION — Stale closure: `generateAudio` com `[]` deps captura estado inicial

- **Arquivo:** `src/hooks/useAudioGenerator.ts:210-632`
- **Confidence:** 80/100
- **Categoria:** Stale State
- **Problema:** `generateAudio` é memoizado com `useCallback(..., [])` — zero dependências. Na linha 279, ele lê `audioUrl`, `audioBlob`, `scenes`, `audioSegments` do estado React (closure). Esses valores são os do **primeiro render** (todos null/vazio), não os valores atuais quando `generateAudio` é chamado.
- **Evidência:**
  ```typescript
  // Linha 279 — lê estado diretamente dentro de callback com [] deps
  const previousState = { audioUrl, audioBlob, scenes, audioSegments };
  lastSuccessfulStateRef.current = previousState;
  ```
- **Impacto:** Quando o usuário gera um segundo áudio, `previousState` captura os valores do estado **inicial** (null), não o áudio anterior. A restauração após cancelamento usa `lastSuccessfulStateRef`, que foi preenchido com estado inicial — restaura para "nada" em vez do áudio anterior. **Na prática**, isso é parcialmente mitigado porque `lastSuccessfulStateRef` é atualizado no final de uma geração bem-sucedida (linhas 585-598), então o restore funciona para cancelamentos após a primeira geração. Mas se o usuário gera, cancela, e tenta novamente sem sucesso — o restore vai para null em vez do primeiro áudio.
- **Correção:** Usar refs para os valores de estado que precisam ser lidos dentro do callback estável, ou adicionar as dependências corretas ao `useCallback`.

---

### [P2] SUGGESTION — `generateImage` sem `useCallback` e sem cancelamento

- **Arquivo:** `src/hooks/useImageGenerator.ts:67-148`
- **Confidence:** 78/100
- **Categoria:** Error Handling
- **Problema:** `generateImage` é uma função async declarada diretamente no hook (sem `useCallback`). Cada render cria uma nova referência. Não há mecanismo de cancelamento — se o usuário navegar para outra rota durante a geração, o `setIsGenerating(false)` e `setError` executam em componente desmontado.
- **Impacto:** Warning de React no console + tentativa de atualizar estado desmontado. Sem crash real, mas inconsistente com o padrão de `useAudioGenerator` e `useAssistant` que ambos têm cleanup.
- **Correção:** Envolver com `useCallback`, adicionar `AbortController` ou flag de montagem (ref), limpar no unmount.

---

### [P2] SUGGESTION — `resetPassword` relança erro sem tratamento de CORS

- **Arquivo:** `src/contexts/AuthContext.tsx:133-142`
- **Confidence:** 75/100
- **Categoria:** Error Handling
- **Problema:** `resetPassword` é o único método de auth que faz `throw error` (linha 140), enquanto os outros (`login`, `signup`, `loginWithEmail`, `logout`) apenas setam `authError` no estado. Isso pode causar unhandled rejection se o chamador (LoginPage) não tiver try/catch.
- **Evidência:**
  ```typescript
  // Linha 133-142
  const resetPassword = useCallback(async (email: string) => {
    try {
      setAuthError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      log.error('Erro ao enviar email de reset', { error });
      setAuthError(getAuthErrorMessage(error));
      throw error;  // ← relança, diferente de login/signup/logout
    }
  }, []);
  ```
- **Impacto:** Se `LoginPage` chamar `resetPassword` sem try/catch, gera unhandled promise rejection. Verificando: LoginPage **tem** try/catch na chamada (linha 166), então não há bug em produção. Mas a inconsistência no padrão de error handling é confusa.
- **Correção:** Remover `throw error` ou documentar que `resetPassword` tem contrato diferente dos outros métodos.

---

## Descartados (Confidence < 80)

| Hipótese | Por que descartado |
|---|---|
| `useStudioStore.subscribe` sem unsubscribe | Zustand subscribe retorna cleanup function automaticamente gerenciado; store lives forever (singleton) |
| `AudioContext` event listeners leak | Cleanup correto no useEffect return (linhas 132-138) |
| Speed paint worker não terminated | `generateWithWorker` tem `finally { terminateStrokeWorker(worker) }` (linha 307-310) |
| `imageProcessing.ts` — reject sem error data | `img.onerror` lança Error com mensagem adequada (linha 289) — comportamento esperado |
| `withRetry` — último throw pode ser undefined | Linha 135: `throw lastError ?? new Error(...)` — tem fallback seguro |

---

## Recomendações Priorizadas

| # | Prioridade | Ação | Esforço |
|---|---|---|---|
| 1 | **P0** | Corrigir `${collectionGroup}` → `${collectionGroupName}` em `account-cleanup.ts:176` | 1 min |
| 2 | **P1** | Unificar `useAudioGenerator` em store Zustand ou context compartilhado (App/StudioPage/VideoPage) | Médio |
| 3 | **P1** | Guardar timer IDs de setTimeout de auto-dismiss em refs e limpar no unmount | Baixo |
| 4 | **P1** | Adicionar cleanup para Audio element em `loadProjectData` | Baixo |
| 5 | **P1** | Proteger auto-save do assistente contra mensagem vazia intermediária | Baixo |
| 6 | **P2** | Usar refs para estado lido dentro de `generateAudio` com deps `[]` | Médio |
| 7 | **P2** | Padronizar error handling de `resetPassword` com demais métodos de auth | Baixo |
| 8 | **P2** | Adicionar cancelamento em `useImageGenerator.generateImage` | Baixo |

---

## Métricas de Qualidade Observadas

| Aspecto | Nota | Observação |
|---|---|---|
| Error handling | **Bom** | `createErrorMapper` centralizado, `withRetry` reutilizável, mensagens pt-BR |
| Blob URL cleanup | **Bom** | Refs usados em `useImageGenerator`, `useVideoExporter`, parcial em `useAudioGenerator` |
| Memory leaks | **Regular** | Workers corrigidos, mas timeouts e Audio elements em `loadProjectData` vazam |
| Race conditions | **Bom** | Abort controllers em streaming, `streamActiveRef` para proteção, `cancelRef` em geração |
| Type safety | **Excelente** | Zero `any` encontrado, tipos explícitos em todo o código auditado |
| Dead code | **Nenhum** | `analyze dead_code` retornou limpo |
| Zustand stores | **Bom** | Padrão flat consistente, `useShallow` para seletores, subscribe manual para localStorage |
| Speed paint workers | **Excelente** | Worker cleanup em `finally`, fallback para main thread, cache LRU com eviction |
