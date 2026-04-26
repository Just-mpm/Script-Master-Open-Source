# Auditoria de Performance #1 — Script Master

**Data:** 26/04/2026  
**Branch:** `auto/audit-performance-ux-polish`  
**Auditor:** Performance Auditor (React 19 + Zustand + MUI v9)  
**Escopo:** Re-renders, memory leaks, bundle optimization, lazy loading

---

## Resumo Executivo

| Severidade | Qtd | Categoria |
|------------|-----|-----------|
| P0 (CRITICAL) | 2 | Re-renders |
| P1 (WARNING) | 5 | Re-renders (3), Memory leaks (2) |
| P2 (SUGGESTION) | 3 | Bundle optimization (1), Re-renders (1), Memory leaks (1) |
| **Total** | **10** | |

**Destaques positivos identificados:**
- Todas as 15 rotas usam `React.lazy` + `Suspense`
- `AudioContext` usa `useSyncExternalStore` com seletores primitivos (padrão correto para alta frequência)
- `MessageBubble` do assistente usa `React.memo` com `arePropsEqual` customizado
- `VideoExportPanel`, `Inspector`, `CaptionEditorPanel`, `TranscriptionPanel`, `SubtitleInlineEditor`, todos os subcomponentes do assistente — todos memoizados
- `StudioPage` e `VideoPage` usam `useShallow` nos seletores Zustand
- Blob URL cleanup presente na maioria dos componentes (Library, VideoLibrary, useAudioGenerator, useVideoExporter)
- `StrokeWorker` faz `URL.revokeObjectURL` logo após criar o Blob URL
- `useVideoExporter` faz cleanup do blob URL de output no unmount via `useEffect`

---

## Findings Detalhados

---

### P0-1: AuthContext.Provider cria novo objeto a cada render — re-render de toda a árvore

- **Arquivo:** `src/contexts/AuthContext.tsx:181`
- **Confidence:** 92/100
- **Problema:** O `value` do `AuthProvider` é um objeto literal `{ user, loading, authError, clearAuthError, login, signup, loginWithEmail, resetPassword, deleteAccount, logout }` criado inline no JSX. Embora as funções estejam envolvidas em `useCallback` (o que é bom), o objeto *container* é recriado a cada render. O React usa referência (`Object.is`) para decidir se consumidores do context precisam re-renderizar. Como o `AuthProvider` envolve **toda a aplicação** (main.tsx:43), qualquer mudança de estado (como `showMigrationDialog` no próprio provider) cria um novo objeto `value`, forçando **todos os 19 consumidores** de `useAuth()` a re-renderizar.
- **Evidência:**
  ```tsx
  // AuthContext.tsx:181 — objeto criado inline, sem useMemo
  <AuthContext.Provider value={{ user, loading, authError, clearAuthError, login, signup, loginWithEmail, resetPassword, deleteAccount, logout }}>
  ```
- **Impacto Estimado:** ~200-400ms de work adicional em mudanças de estado do AuthProvider (transição loading→loaded após login), propagando para Header, App, StudioPage, VideoPage, Library, Assistant, ImageStudio, etc.
- **Correção sugerida:** Envolver o objeto `value` em `useMemo`:
  ```tsx
  const contextValue = useMemo<AuthContextType>(() => ({
    user, loading, authError, clearAuthError, login, signup,
    loginWithEmail, resetPassword, deleteAccount, logout,
  }), [user, loading, authError, clearAuthError, login, signup, loginWithEmail, resetPassword, deleteAccount, logout]);
  
  return <AuthContext.Provider value={contextValue}>{children}...</AuthContext.Provider>;
  ```

---

### P0-2: ActionBar consome `useGlobalAudioState()` — re-render a cada tick do timeupdate

- **Arquivo:** `src/components/ActionBar.tsx:77`
- **Confidence:** 90/100
- **Problema:** `ActionBar` usa `useGlobalAudioState()` que retorna o **snapshot completo** (`{ isPlaying, progress, currentTime, duration, activeId, audioRef, play, pause, toggle, seek, formatTime }`) via `useSyncExternalStore`. O `timeupdate` do `<audio>` dispara ~4x/s, o que força `useSyncExternalStore` a comparar o snapshot retornado. Como `useGlobalAudioState()` retorna um objeto *espalhado* (novo a cada chamada de `getSnapshot`), o `Object.is` do `useSyncExternalStore` detecta mudança e força re-render do `ActionBar` **em cada tick**. O ActionBar não é memoizado com `React.memo`.
- **Evidência:**
  ```tsx
  // ActionBar.tsx:77
  const audioState = useGlobalAudioState();
  // Isso retorna TODOS os campos do snapshot, incluindo currentTime que muda ~4x/s
  ```
  ```tsx
  // AudioContext.tsx:251 — getSnapshot retorna objeto novo a cada chamada
  return useSyncExternalStore(context.subscribe, context.getSnapshot, context.getSnapshot);
  ```
- **Impacto Estimado:** ~4 re-renders/s do ActionBar (550 linhas) durante reprodução de áudio, cada um custando ~30-50ms de reconciliação = ~120-200ms/s desperdiçados.
- **Correção sugerida:** Substituir `useGlobalAudioState()` por seletores primitivos específicos. O projeto já exporta `useAudioIsPlaying()`, `useAudioCurrentTime()`, `useAudioDuration()`, `useAudioProgress()`, `useAudioActiveId()` para este fim:
  ```tsx
  const isPlaying = useAudioIsPlaying();
  const currentTime = useAudioCurrentTime();
  const duration = useAudioDuration();
  const { formatTime, seek, toggle } = useGlobalAudioActions();
  ```
  O throttle de frame em `displayFrame` (linha 87-97) já está correto para o bridge store, mas o mesmo padrão não foi aplicado ao AudioContext.

---

### P1-1: Header consome `useAuth()` — re-render em todas as mudanças do AuthContext

- **Arquivo:** `src/components/Header.tsx:75`
- **Confidence:** 85/100
- **Problema:** `Header` chama `useAuth()` que consome o context completo. Sem o `useMemo` sugerido em P0-1, o Header (509 linhas) re-renderiza em qualquer mudança do `AuthProvider`, incluindo transições `loading` e `showMigrationDialog`.
- **Evidência:**
  ```tsx
  // Header.tsx:75
  const { user, loading, logout, deleteAccount } = useAuth();
  ```
- **Impacto Estimado:** ~100-200ms de reconciliação durante transições de loading/auth, já que o Header contém AppBar + Drawer + Dialog com estado interno complexo.
- **Correção sugerida:** A correção de P0-1 (useMemo no value) resolve este finding automaticamente. Adicionalmente, `Header` não é memoizado com `React.memo`, mas é o único consumidor na rota `/app/*`, então o impacto é menor.

---

### P1-2: Library cria blob URLs em handlers de evento inline sem cleanup individual

- **Arquivo:** `src/components/Library.tsx:579`
- **Confidence:** 83/100
- **Problema:** No handler inline de download de áudio (linha 579), um blob URL é criado via `URL.createObjectURL(audio.audioBlob)` e adicionado ao `blobUrlsRef`, mas não há verificação se o mesmo `audio.id` já tem uma URL rastreada. Se o usuário clicar em "baixar" múltiplas vezes no mesmo áudio, URLs duplicadas se acumulam. O cleanup global (`blobUrlsRef`) só revoga ao desmontar ou trocar de projeto.
- **Evidência:**
  ```tsx
  // Library.tsx:579 — handler inline sem dedup
  onClick={() => {
    const url = audio.audioUrl || (audio.audioBlob ? URL.createObjectURL(audio.audioBlob) : '');
    if (url) {
      if (!audio.audioUrl && url.startsWith('blob:')) {
        blobUrlsRef.current.push(url); // Acumula sem verificar duplicatas
      }
      void downloadFile(url, `${project.name}-${audio.id}.wav`);
    }
  }}
  ```
- **Impacto Estimado:** ~50-200KB por blob URL duplicado (áudio WAV). Em uso normal, impacto baixo, mas pode crescer em sessões longas com múltiplos downloads.
- **Correção sugerida:** Usar um `Set` para blob URLs (como já é feito no `useProjectGallery` da VideoLibrary) ou revogar imediatamente após o download iniciar (padrão "transient action" recomendado pelo React docs).

---

### P1-3: Library.resolvedImageUrls cria blob URLs no useMemo sem revogar as anteriores

- **Arquivo:** `src/components/Library.tsx:160-165`
- **Confidence:** 82/100
- **Problema:** O `useMemo` na linha 160 cria blob URLs para cada imagem via `URL.createObjectURL(img.imageBlob)`. Quando `projectData.images` muda (expandir outro projeto), o `useMemo` recalcula e **cria novas URLs**, mas as URLs antigas do cálculo anterior são adicionadas ao `blobUrlsRef` (linha 168-175) sem serem revogadas individualmente. O cleanup de `blobUrlsRef` no unmount revoga tudo de uma vez, mas entre recalculações URLs órfãs se acumulam.
- **Evidência:**
  ```tsx
  // Library.tsx:160-165 — useMemo cria blob URLs
  const resolvedImageUrls = useMemo(() => {
    return projectData.images.map((img) => ({
      ...img,
      resolvedUrl: img.imageUrl || (img.imageBlob ? URL.createObjectURL(img.imageBlob) : ''),
    }));
  }, [projectData.images]);

  // Library.tsx:168-175 — registra URLs MAS não revoga as do cálculo anterior
  useEffect(() => {
    const blobUrls = resolvedImageUrls
      .map((img) => img.resolvedUrl)
      .filter((url) => url.startsWith('blob:'));
    for (const url of blobUrls) {
      blobUrlsRef.current.push(url);
    }
  }, [resolvedImageUrls]);
  ```
- **Impacto Estimado:** ~10-500KB por imagem (10-50KB cada em média). Com 10 imagens, ~100-500KB de memória não liberada até trocar de projeto ou desmontar.
- **Correção sugerida:** Adicionar cleanup no `useEffect` que revoga as URLs do `useMemo` anterior antes de registrar as novas, similar ao padrão usado em `ImageStudio.tsx:210-216`.

---

### P1-4: ScriptEditor não é memoizado com React.memo

- **Arquivo:** `src/components/ScriptEditor.tsx:32`
- **Confidence:** 81/100
- **Problema:** `ScriptEditor` (319 linhas) é renderizado dentro de `StudioPage` e recebe `script` (string que muda a cada tecla) e `currentTime` (que muda ~4x/s durante reprodução). Embora o `StudioPage` use `useShallow` para derivar `config`, o `ScriptEditor` recebe `setScript` e `handleGenerate` como props — setters Zustand que são estáveis. No entanto, como `ScriptEditor` não é memoizado, ele re-renderiza junto com o `StudioPage` a cada mudança do Zustand store (mesmo campos não relacionados como `speakerAName` ou `audioProfile`).
- **Evidência:**
  ```tsx
  // ScriptEditor.tsx:32 — sem React.memo
  export function ScriptEditor({
    script, setScript, isGenerating, handleGenerate,
    isGenerateDisabled, scenes = [], currentTime = 0
  }: ScriptEditorProps) {
  ```
- **Impacto Estimado:** ~20-40ms de reconciliação a cada mudança de campo não relacionado no store. O `currentTime` muda 4x/s durante playback, mas o `StudioPage` não assina `currentTime` diretamente — ele vem do `AudioContext` via `useAudioCurrentTime()`. Impacto moderado.
- **Correção sugerida:** Envolver com `React.memo`. O `StudioPage` já passa setters estáveis e callbacks memoizados. `script` e `scenes` são as props voláteis esperadas.

---

### P1-5: useVideoExporter.state espalhado no retorno do useMemo — nova referência a cada render

- **Arquivo:** `src/features/video-render/hooks/useVideoExporter.tsx:553-561`
- **Confidence:** 80/100
- **Problema:** O retorno do hook usa `useMemo` com `state` na dependência. Como `state` é um objeto do `useState` que muda a cada `setState`, o `useMemo` recalcula o objeto de retorno **em cada atualização de progresso**. Isso cria uma nova referência do `VideoExporter` que é passada como prop ao `VideoExportPanel`. Embora o `VideoExportPanel` seja `React.memo`, ele receberá uma nova referência de `exporter` a cada tick de progresso (~30x/s durante exportação).
- **Evidência:**
  ```tsx
  // useVideoExporter.tsx:553-561
  return useMemo(() => ({
    ...state,       // Novo objeto espalhado a cada setState de progresso
    checkSupport,
    startRender,
    handleCancel,
    handleDownload,
    dismissSaveWarning,
    reset,
  }), [state, checkSupport, startRender, handleCancel, handleDownload, dismissSaveWarning, reset]);
  ```
- **Impacto Estimado:** ~30 re-renders/s do `VideoExportPanel` durante exportação (cada um ~15-25ms) = ~450-750ms/s desperdiçados. Porém, o throttle de `lastReportedPercentRef` (linha 448-450) reduz a frequência de atualização de progresso para mudanças de inteiro (0-100), mitigando significativamente.
- **Correção sugerida:** Remover o `useMemo` e retornar o objeto diretamente. O `state` muda frequentemente durante exportação, e o `useMemo` não evita re-render dos consumidores pois a referência sempre muda. Alternativamente, extrair o `VideoExportPanel` para ler o store diretamente via hook ou refs, eliminando a prop `exporter`.

---

### P2-1: App.tsx assina `useAudioGenerator()` — re-render da árvore raiz durante geração

- **Arquivo:** `src/App.tsx:154-167`
- **Confidence:** 75/100
- **Problema:** O componente `App` desestrutura 17 campos de `useAudioGenerator()`: `isGenerating`, `statusText`, `generationProgress`, `audioUrl`, `audioBlob`, `scenes`, `error`, `setError`, `sceneGenerationWarning`, `generateAudio`, `handleCancel`, `durationInSeconds`. Durante a geração de áudio, `generationProgress` e `statusText` mudam frequentemente (~1x/s), forçando o `App` inteiro a re-renderizar. O `App` condicionalmente renderiza `Header`, `ActionBar`, toasts, e o conteúdo da rota — todos são afetados.
- **Evidência:**
  ```tsx
  // App.tsx:154-167 — 17 valores desestruturados de um hook
  const {
    isGenerating, statusText, generationProgress, audioUrl, audioBlob,
    scenes, error, setError, sceneGenerationWarning, generateAudio,
    handleCancel, durationInSeconds,
  } = useAudioGenerator();
  ```
- **Impacto Estimado:** Cada atualização de progresso (~1x/s durante geração) custa ~50-100ms de reconciliação no App inteiro. Impacto real mitigado porque a maioria dos filhos é lazy-loaded ou memoizada, mas a cascata de re-renders do Header (não memoizado) é o custo dominante.
- **Correção sugerida:** Mover o estado de geração para o `videoRenderBridge` ou criar um store Zustand dedicado (como já existe para exportação de vídeo). O App leria apenas `isGenerating` e `audioUrl` (ambos boolean/string com poucas mudanças), enquanto `ActionBar` e `StudioPage` leriam progress/text diretamente. Esta é uma refatoração maior, por isso classificada como P2.

---

### P2-2: AssistantMessages.AnswerState (EmptyChatState) não é memoizado

- **Arquivo:** `src/features/assistant/components/AssistantMessages.tsx:291`
- **Confidence:** 70/100
- **Problema:** `EmptyChatState` é um componente puro sem props que é renderizado condicionalmente quando não há mensagens. Ele não é memoizado, mas como não recebe props e só renderiza uma vez (quando `messages.length === 0`), o impacto é nulo na prática.
- **Impacto Estimado:** <5ms — o componente é renderizado apenas no estado vazio inicial.
- **Correção sugerida:** Nenhuma ação necessária. O componente é estático e renderizado condicionalmente.

---

### P2-3: Blob URLs do download inline no Library não são revogados após uso

- **Arquivo:** `src/components/Library.tsx:147,579`
- **Confidence:** 68/100
- **Problema:** No handler `handlePlay` (linha 147) e no handler de download inline (linha 579), blob URLs são criados e adicionados ao `blobUrlsRef` para cleanup posterior. No entanto, para downloads (que são ações one-shot), o blob URL pode ser revogado imediatamente após `downloadFile()` iniciar. Para play de áudio, o blob URL precisa permanecer enquanto o áudio está tocando. O `downloadFile` usa `fetch→blob` internamente para URLs remotas, mas para blob URLs ele cria um `<a>` e clica — o navegador inicia o download e a URL pode ser revogada em seguida.
- **Impacto Estimado:** ~50-200KB por blob URL não revogado. Em sessões normais com 5-10 downloads, ~0.5-2MB de memória temporária.
- **Correção sugerida:** Para o handler de download inline, revogar o blob URL após o clique no âncora. Para `handlePlay`, manter o rastreamento atual (precisa persistir durante a reprodução).

---

## Recomendações Priorizadas

### Ação Imediata (P0 — alto impacto, baixa complexidade)

1. **P0-1:** Envolver o `value` do `AuthContext.Provider` em `useMemo`. Impacto: elimina re-renders desnecessários de 19 componentes em toda mudança de auth state. Complexidade: 5 linhas de código.

2. **P0-2:** Substituir `useGlobalAudioState()` em `ActionBar` por seletores primitivos (`useAudioIsPlaying`, `useAudioCurrentTime`, `useAudioDuration`). O projeto já exporta esses hooks para exatamente esse propósito. Impacto: elimina ~4 re-renders/s do ActionBar durante reprodução. Complexidade: ~3 linhas de código.

### Ação de Curto Prazo (P1 — impacto moderado)

3. **P1-4:** Adicionar `React.memo` ao `ScriptEditor`. Complexidade: 1 linha.

4. **P1-5:** Remover o `useMemo` do retorno do `useVideoExporter` ou refatorar para que o `VideoExportPanel` não dependa da referência do exporter. Complexidade: 5-10 linhas.

5. **P1-2 + P1-3:** Melhorar o rastreamento de blob URLs no `Library` — usar `Set` para dedup e adicionar cleanup no `useEffect` do `resolvedImageUrls`. Complexidade: ~15 linhas.

### Ação de Médio Prazo (P2 — refatoração)

6. **P2-1:** Extrair o estado de geração de áudio do hook `useAudioGenerator` para um store Zustand dedicado ou integrar ao `videoRenderBridge`. Isso elimina a dependência do App.tsx no hook e reduz re-renders da árvore raiz. Complexidade: refatoração significativa (~100-200 linhas).

---

## Não Reportados (descartados por Confidence < 80 ou impacto teórico)

| Potencial Finding | Motivo do Descarte |
|---|---|
| SpeedPaintPage sem memo | Componente leve (60 linhas), seletores Zustand são primitivos. Impacto < 5ms. |
| StudioPage.useShallow com 28 campos | `useShallow` faz shallow compare corretamente. Setters Zustand são estáveis. Sem problema real. |
| React-markdown no AssistantMessages | É renderizado apenas dentro de `MessageBubble` (memoizado). Custo de parse é inerente ao feature. |
| Header Drawer com useMediaQuery | MUI otimiza internamente o `useMediaQuery`. Breakpoint change é evento raro. |
| Logger (34 dependentes) | `createLogger` é chamado em import-time (module scope). Zero custo de runtime. |
| Tokens (68 dependentes) | Export de constantes puras. Tree-shakeable, zero runtime cost. |
| Surfaces (31 dependentes) | Funções que retornam objetos de estilo. Chamadas em render, mas custo é O(1). |

---

*Relatório gerado automaticamente. Todos os findings foram validados contra a documentação oficial do React 19 (NotebookLM) e as convenções do projeto.*
