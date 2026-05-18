# Auditoria

## Escopo da revisão

- Arquivos lidos por completo: `src/pages/SpeedPaintPage.tsx`, `src/features/speed-paint/components/batch/BatchOrchestrator.tsx`, `src/features/speed-paint/lib/imageProcessing.ts`, `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx`, `src/features/video-render/components/export/ExportResultActions.tsx`, `src/features/speed-paint/components/batch/QueueStaging.tsx`, `src/features/speed-paint/components/upload/ImageUpload.tsx`, `src/features/speed-paint/components/SpeedPaintExportPanel.tsx`, `src/features/speed-paint/store/animationStore.ts`, `src/features/video-render/hooks/useCodecSupport.ts`, `src/lib/download.ts`, `src/features/speed-paint/types.ts`
- Testes lidos: `tests/speed-paint/useSpeedPaintExporter.unit.test.tsx`, `tests/speed-paint/BatchOrchestrator.component.test.tsx`, `tests/pages/SpeedPaintPage.component.test.tsx`
- Focos cobertos: regressões reais, estado assíncrono, cancelamento, integração entre `BatchOrchestrator`, `imageProcessing`, `useSpeedPaintExporter`, `SpeedPaintPage` e `ExportResultActions`
- Validação documental: NotebookLM `React Docs` e `Remotion Docs`

## Veredito

`Ajustes recomendados`

## Achados priorizados

### [WARNING] Limpar ou trocar a fila não cancela o processamento pesado já iniciado no modo watch

- **Arquivo:** `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:77`
- **Confidence:** 97/100
- **Categoria:** Race Condition
- **Problema:** O `BatchOrchestrator` invalida o resultado antigo com `processingIdRef`, mas não aborta a execução real de `generateStrokesFromImage`.
- **Evidência:**
  ```ts
  generateStrokesFromImage(currentImg.dataUrl, (p) => {
    setJob({ progress: p });
  }).then(...)
  ```
  Em `src/features/speed-paint/lib/imageProcessing.ts:290-332`, a função já suporta `AbortSignal` e interrompe worker/timeouts no abort.
- **Impacto:** Ao limpar a fila ou substituí-la no meio do processamento, o usuário deixa de ver o resultado antigo, mas CPU/memória continuam sendo consumidos até o fim. Em imagens grandes ou várias trocas seguidas, isso mantém trabalho obsoleto competindo com o fluxo atual.
- **Sugestão:** Criar um `AbortController` por item no `BatchOrchestrator` e abortar no cleanup, na troca de item e ao sair de `watch`.

### [WARNING] Reset do exporter não limpa o erro de compatibilidade e pode deixar o painel de lote “preso”

- **Arquivo:** `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx:261`
- **Confidence:** 95/100
- **Categoria:** Bug
- **Problema:** `reset()` só reseta o state local do exporter, mas o efeito de sincronização volta a copiar `supportError` de `useCodecSupport`, que nunca é limpo.
- **Evidência:**
  ```ts
  useEffect(() => {
    setState(prev => ({
      ...prev,
      error: prev.isRendering ? prev.error : (codecSupport.supportError ?? prev.error),
    }));
  }, [codecSupport.canRender, codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer, codecSupport.supportError]);
  ```
  ```ts
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);
  ```
  `useCodecSupport` expõe `resetSupport()` em `src/features/video-render/hooks/useCodecSupport.ts:282-297`, mas ele não é usado. Em `src/pages/SpeedPaintPage.tsx:209-213`, qualquer `error` mantém `showBatchExportPanel` ativo.
- **Impacto:** Se o preflight marcar o navegador como incompatível, ações como “Voltar para a fila” ou “Limpar fila” podem não devolver a tela ao estado limpo esperado, porque o erro reaparece no próximo render.
- **Sugestão:** No `reset()` do exporter, limpar também o estado de suporte (`resetSupport`) ou parar de reidratar `error` automaticamente quando o usuário já descartou o estado.

### [WARNING] O vídeo final em lote ignora o status da fila e volta a incluir itens que já falharam no preview

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:167`
- **Confidence:** 90/100
- **Categoria:** Bug
- **Problema:** O modo `record` exporta todos os itens de `queue`, embora `QueuedImage` já tenha status (`pending | processing | completed | failed`) e esse status não seja atualizado nem filtrado no fluxo.
- **Evidência:**
  ```ts
  void speedPaintExporter.startBatchRender({
    items: queue.map((item) => ({
      imageSource: item.dataUrl,
    })),
  });
  ```
  `QueuedImage` define `status` em `src/features/speed-paint/types.ts:26-30`. `ImageUpload` inicializa tudo como `pending` em `src/features/speed-paint/components/upload/ImageUpload.tsx:36-40`, mas `BatchOrchestrator` só altera `job`, não a fila, em `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:70-88`.
- **Impacto:** Um item que acabou de falhar no preview continua elegível para “Gerar vídeo final da fila”. Como o lote usa o mesmo `generateStrokesFromImage`, o usuário pode reenfileirar silenciosamente a mesma falha no vídeo final.
- **Sugestão:** Persistir o status por item na fila e, no `record`, exportar apenas os itens aprovados ou pedir confirmação explícita quando houver falhas anteriores.

## O que parece saudável

- A separação entre `onReset` e `onClear` em `ExportResultActions` resolveu bem a ambiguidade entre “voltar” e “limpar” no sucesso.
- A invalidação por `renderIdRef` em `useSpeedPaintExporter` reduz bem a chance de render antigo corromper o estado atual.
- O cancelamento dentro de `imageProcessing` está bem encaminhado: worker e fallback em main thread já sabem reagir a `AbortSignal`.
- Os testes novos cobrem partes importantes do fluxo: cancelamento do lote, limpeza de fila após erro e a nova UI de retorno/limpeza.
- As melhorias de i18n/a11y da fila ficaram consistentes com o uso de `useLocale` e labels específicos por ação.

## Limites da revisão

- Revisão estática apenas: não executei navegador, build, lint, typecheck nem testes.
- Não validei comportamento visual final do vídeo exportado em um navegador real.
- O achado sobre reuso de itens falhados assume que preview e exportação devem compartilhar a noção de “item aprovado”, o que é coerente com o tipo `QueuedImage.status`, mas não há contrato formal no repositório dizendo isso explicitamente.

## Próximo passo recomendado

`run` ou correção manual focada primeiro em cancelamento real do `BatchOrchestrator` e no reset completo do `useSpeedPaintExporter`.
