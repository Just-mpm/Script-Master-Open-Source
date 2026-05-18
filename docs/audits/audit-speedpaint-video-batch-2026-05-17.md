# Auditoria

## Escopo da revisão

- Arquivos lidos por completo: `src/pages/SpeedPaintPage.tsx`, `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx`, `src/features/video-render/components/SpeedPaintScene.tsx`, `src/features/speed-paint/components/batch/QueueStaging.tsx`, `src/features/speed-paint/components/batch/BatchOrchestrator.tsx`, `src/features/video-render/hooks/useVideoExporter.tsx`, `src/features/speed-paint/store/animationStore.ts`, `src/features/video-render/components/VideoComposition.tsx`, `src/features/video-render/lib/speedPaintRenderer.ts`, `src/features/speed-paint/components/SpeedPaintExportPanel.tsx`, `src/lib/download.ts`, `src/features/video-render/hooks/useCodecSupport.ts`, `src/features/speed-paint/components/upload/ImageUpload.tsx`.
- Testes lidos: `tests/speed-paint/useSpeedPaintExporter.unit.test.tsx`, `tests/speed-paint/BatchOrchestrator.component.test.tsx`, `tests/speed-paint/QueueStaging.component.test.tsx`, `tests/pages/SpeedPaintPage.component.test.tsx`, `tests/video-render/useVideoExporter-speedpaint.unit.test.tsx`.
- Focos cobertos: bugs, regressões, estados inconsistentes, exportação em lote para vídeo único, tipagem, efeitos colaterais e cobertura de testes.
- Validação documental: NotebookLM `Remotion Docs` para confirmar a dependência de WebCodecs/browser support na exportação client-side. A conclusão sobre a necessidade do preflight no lote é uma inferência apoiada no contrato já usado pelo próprio código (`useCodecSupport` + `checkSupport`).

## Veredito

`Ajustes recomendados`

## Achados priorizados

### [WARNING] Modo "Gerar Vídeo Final da Fila" reprocessa imagens que já falharam e derruba a exportação inteira

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:157`
- **Confidence:** 97/100
- **Categoria:** Bug
- **Problema:** O fluxo de lote em `record` monta a exportação a partir de toda a `queue`, inclusive itens que o `BatchOrchestrator` já marcou como falhos e deveria pular.
- **Evidência:**
  ```ts
  void speedPaintExporter.startBatchRender({
    items: queue.map((item) => ({
      imageSource: item.dataUrl,
    })),
  });
  ```
  Em `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:69-78`, falhas entram em `status: 'failed'` e o índice avança após 2s. Já em `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx:476-497`, `startBatchRender()` reexecuta `generateStrokesFromImage()` para cada item e aborta todo o lote se qualquer imagem lançar erro.
- **Impacto:** Basta uma imagem inválida ou problemática para o modo de vídeo único falhar por completo, mesmo depois de a UI sinalizar que a fila seguiria para a próxima imagem. Na prática, o comportamento de “auto-skip” não vale para `record`.
- **Sugestão:** No lote final, exportar apenas os itens que passaram no pré-processamento ou fazer `startBatchRender()` degradar por item, no mesmo estilo de `useVideoExporter` com `speedPaintWarnings`.

### [WARNING] O auto-skip após falha deixa um `setTimeout` solto e pode corromper a próxima fila

- **Arquivo:** `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:75`
- **Confidence:** 96/100
- **Categoria:** Race Condition
- **Problema:** O avanço automático após erro não é cancelado quando a fila é limpa, substituída ou quando o componente desmonta.
- **Evidência:**
  ```ts
  setTimeout(() => {
    setCurrentIndex(useAnimationStore.getState().currentIndex + 1);
  }, 2000);
  ```
  Ao mesmo tempo, `src/features/speed-paint/components/upload/ImageUpload.tsx:36-41` reinicia a fila com `setCurrentIndex(0)` e `setBatchMode('idle')`, mas não limpa esse timer pendente.
- **Impacto:** Se o usuário cancelar a fila ou enviar novas imagens antes dos 2 segundos, o timer antigo ainda dispara e muda `currentIndex` na fila nova. O resultado prático é começar o próximo lote do índice errado e pular a primeira imagem sem intenção do usuário.
- **Sugestão:** Guardar o id do timeout em `ref` e limpar em cleanup, em mudanças de fila e antes de agendar um novo auto-skip.

### [WARNING] A exportação em lote ignora o preflight de compatibilidade e só falha depois de processar tudo

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:157`
- **Confidence:** 91/100
- **Categoria:** UX
- **Problema:** O caminho de vídeo único da fila chama `startBatchRender()` diretamente, sem passar pelo `checkSupport()` que protege a exportação manual.
- **Evidência:**
  ```ts
  // SpeedPaintExportPanel
  useEffect(() => {
    void checkSupportRef.current(resolution.width, resolution.height);
  }, [resolution.width, resolution.height]);

  const isExportable = Boolean(imageSource) && exporter.canRender === true;
  ```
  Já no lote:
  ```ts
  setState({
    ...INITIAL_STATE,
    canRender: true,
    isRendering: true,
    renderStatusText: 'Preparando exportação do lote...',
  });
  ```
  `src/features/video-render/hooks/useCodecSupport.ts:85-167` mostra que a exportação client-side depende de WebCodecs e pode marcar `canRender: false` quando o navegador não suporta a combinação pedida.
- **Impacto:** Em navegadores sem suporte, o usuário pode esperar pela geração das animações do lote inteiro para só então receber erro de exportação. Isso aumenta tempo perdido e deixa o fluxo inconsistente com o botão de exportação individual, que já bloqueia antes.
- **Sugestão:** Rodar o mesmo `checkSupport()` antes de entrar no lote e impedir `record` quando `canRender !== true`.

### [SUGGESTION] A nova cobertura de testes não protege os cenários que realmente quebram o lote

- **Arquivo:** `tests/speed-paint/useSpeedPaintExporter.unit.test.tsx:53`
- **Confidence:** 99/100
- **Categoria:** Architecture
- **Problema:** Os testes novos cobrem o caminho feliz do vídeo único, mas não exercitam os cenários de falha que mais afetam esse fluxo.
- **Evidência:**
  - `tests/speed-paint/useSpeedPaintExporter.unit.test.tsx:99-121` verifica apenas que o lote gera um vídeo único com sucesso.
  - `tests/speed-paint/BatchOrchestrator.component.test.tsx:133-210` valida a UI de erro, mas não verifica limpeza do `setTimeout` nem interação com uma fila nova.
  - `tests/pages/SpeedPaintPage.component.test.tsx:119-213` não cobre o efeito que dispara `startBatchRender()` nem o tratamento de `error`/`outputUrl` no modo `record`.
- **Impacto:** As duas regressões acima conseguem passar facilmente porque o suite atual não simula falha de item no modo `record`, cancelamento entre filas nem navegador incompatível para exportação do lote.
- **Sugestão:** Adicionar casos para: item falho dentro de `record`, cleanup do timer após `clearQueue()`/novo upload e bloqueio do lote quando `canRender` for `false`.

## O que parece saudável

- `useVideoExporter` corrigiu a preservação de `speedPaintWarnings` com acumulação local e já ganhou teste dedicado.
- `BatchOrchestrator` agora grava `job.id`, o que melhora o rastreamento do item ativo.
- O novo `useSpeedPaintExporter` separa bem exportação única e exportação em lote, com progresso dedicado e cancelamento por `AbortController`.

## Limites da revisão

- Revisão estática apenas: não rodei build, typecheck, lint, Vitest nem teste em navegador.
- Não validei comportamento visual real do drag-and-drop nem do download automático bloqueado por políticas do navegador.
- A confirmação documental do ponto de compatibilidade veio do material do Remotion sobre renderização client-side depender de WebCodecs; a necessidade de aplicar esse preflight também no lote foi inferida a partir do contrato existente no próprio código.

## Próximo passo recomendado

`fixer`
