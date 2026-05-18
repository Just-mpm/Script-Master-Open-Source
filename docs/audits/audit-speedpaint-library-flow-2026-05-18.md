# Auditoria

## Escopo da revisão

- Mudanças locais ligadas ao novo fluxo da biblioteca para o Speed Paint sem áudio.
- Arquivos lidos por completo ou em contexto suficiente: `src/components/Library.tsx`, `src/features/speed-paint/lib/projectQueueAdapter.ts`, `src/features/speed-paint/store/animationStore.ts`, `src/features/speed-paint/types.ts`, `src/pages/SpeedPaintPage.tsx`, `src/features/speed-paint/components/batch/BatchOrchestrator.tsx`, `src/features/speed-paint/components/batch/QueueStaging.tsx`, `src/features/speed-paint/components/upload/ImageUpload.tsx`, `tests/components/Library.component.test.tsx`, `tests/pages/SpeedPaintPage.component.test.tsx`, `tests/speed-paint/animationStore.unit.test.ts`, `tests/speed-paint/projectQueueAdapter.unit.test.ts`, locais adicionados em `src/features/i18n/locales/*`.
- Focos cobertos: bugs, regressão funcional, limpeza de `blob:` URLs, consistência de estado entre rotas/store, UX em edge cases e lacunas de testes.
- Ferramentas usadas: `Analyze AITool Changes`, `File Context`, `Impact Analysis`, leitura direta do código e validação no NotebookLM (`React Docs`, `React Router Docs`, `Zustand Docs`).

## Veredito

**Ajustes recomendados**

## Achados priorizados

### [WARNING] Projeto expandido entra em estado falso de “sem imagens” depois de erro ao carregar detalhes

- **Arquivo:** `src/components/Library.tsx:137`
- **Confidence:** 95/100
- **Categoria:** Bug
- **Problema:** Se o usuário expandir um projeto e o `getProjectDetails()` falhar, a biblioteca mantém `expandedProjectId` apontando para esse projeto, zera `projectData` e depois o botão “Usar no Speed Paint” reaproveita esse estado vazio sem refazer o fetch.
- **Evidência:**
```ts
setExpandedProjectId(projectId);
setProjectData(EMPTY_PROJECT_DATA);
try {
  const { audios, images } = await getProjectDetails(projectId, user?.uid);
  setProjectData({ audios, images });
} catch (err) {
  setDetailError(t('library.detailError'));
}
```

```ts
const images = expandedProjectId === project.id
  ? projectData.images
  : (await getProjectDetails(project.id, user?.uid)).images;

if (images.length === 0) {
  setSpeedPaintError(t('library.speedPaintNoImages'));
  return;
}
```
- **Impacto:** Um erro transitório na carga dos detalhes passa a bloquear o fluxo para o Speed Paint naquele projeto expandido, mesmo que existam imagens válidas. Na prática, o usuário recebe um erro enganoso e não ganha nova tentativa automática.
- **Sugestão:** Não reutilizar `projectData.images` quando o detalhe atual está em erro ou ainda não foi carregado com sucesso; nesses casos, refaça `getProjectDetails()` antes de concluir que o projeto está sem imagens.

### [WARNING] Aviso de preparação parcial se perde na troca imediata de rota

- **Arquivo:** `src/components/Library.tsx:246`
- **Confidence:** 96/100
- **Categoria:** UX
- **Problema:** Quando parte das imagens falha no preparo, o componente grava o aviso em estado local da `Library`, mas navega logo em seguida para `/app/pintura-rapida`, desmontando a tela que mostraria esse `Alert`.
- **Evidência:**
```ts
loadLibraryQueue(queue, project.name);

if (failedCount > 0) {
  setSpeedPaintInfo(t('library.speedPaintPartialWarning', {
    ready: queue.length,
    failed: failedCount,
  }));
}

startTransition(() => {
  navigate('/app/pintura-rapida');
});
```
- **Impacto:** Imagens descartadas no preparo viram uma perda silenciosa. O usuário chega ao Speed Paint com menos itens na fila, mas sem contexto de que parte do projeto ficou de fora.
- **Sugestão:** Transportar esse feedback para a rota de destino, por exemplo via estado de navegação/store/toast global, para que o aviso continue visível depois da troca de página.

### [SUGGESTION] Cobertura de testes não protege os edge cases onde o fluxo novo mais falha

- **Arquivo:** `tests/components/Library.component.test.tsx:282`
- **Confidence:** 91/100
- **Categoria:** Architecture
- **Problema:** Os testes novos cobrem sucesso e falha total de preparo, mas não cobrem o retry após `detailError`, o aviso de sucesso parcial com navegação, nem a revogação de `blob:` URLs quando `loadLibraryQueue()` substitui uma fila anterior.
- **Evidência:**
```ts
it('envia imagens do projeto para o Speed Paint e navega para a rota correta', async () => { ... })
it('mostra erro ao tentar enviar para o Speed Paint sem imagens válidas', async () => { ... })
```

```ts
it('carrega fila pronta com metadados de origem', () => {
  useAnimationStore.getState().loadLibraryQueue(queue, 'Projeto Biblioteca');
  expect(state.queueSource).toBe('library');
})
```
- **Impacto:** As duas regressões acima passam com a suíte atual, e o caminho mais sensível de limpeza entre filas ficou sem alarme automatizado caso volte a vazar `blob:` URL no futuro.
- **Sugestão:** Acrescentar testes para: falha de `getProjectDetails()` seguida de novo clique no mesmo projeto, `failedCount > 0` com preservação do feedback na rota de destino e substituição de fila anterior via `loadLibraryQueue()` com `URL.revokeObjectURL`.

## O que parece saudável

- A store ganhou limpeza explícita de `blob:` URLs em `clearQueue()`, `removeFromQueue()` e na troca de fila por `loadLibraryQueue()`.
- O adapter novo ordena imagens por `timestamp` e transforma URLs remotas em `blob:` local antes de entrar no Speed Paint, o que reduz dependência de fetch tardio durante o fluxo de animação.
- `SpeedPaintPage` passou a expor contexto de origem da fila (`queueSource` / `queueSourceProjectName`) sem misturar isso com o processamento do lote.
- Os testes já validam parte importante do fluxo novo: origem da fila na página, resumo de itens elegíveis/falhos no batch e limpeza básica de URLs temporárias no store.

## Limites da revisão

- Revisão apenas estática: não rodei `bun run test`, `bun run typecheck`, build, nem navegação real no navegador.
- Não validei comportamento visual ou timing real de toasts/alerts em runtime.
- A análise de `blob:` URLs foi feita por leitura do código; não medi consumo de memória em execução.

## Próximo passo recomendado

**fixer** para corrigir os dois fluxos de UX/estado e, em seguida, **test** para fechar a cobertura desses edge cases.
