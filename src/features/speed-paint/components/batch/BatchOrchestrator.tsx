import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import { useAnimationStore } from '../../store/animationStore';
import { generateStrokesFromImage } from '../../lib/imageProcessing';
import type { SpeedPaintRenderMode, VetorialPreset } from '../../types/vetorial';
import { createLogger } from '../../../../lib/logger';
import { useLocale } from '../../../i18n';
import {
  ERROR_MAIN,
  BRAND_GRADIENT, RADIUS_SM } from '../../../../theme/tokens';
import { glassPanelSx } from '../../../../theme/surfaces';

const log = createLogger('BatchOrchestrator');

/**
 * Orquestrador invisível que processa imagens da fila automaticamente.
 * Gerencia o pipeline: imagem pendente -> geração de strokes.
 * A reprodução é controlada pelo Remotion Player (auto-play ao detectar job completed).
 */
export function BatchOrchestrator() {
  const { t } = useLocale();
  // v0.135.3 (S5 da auditoria): seletor granular `s.job.status` em vez de
  // `s.job` (objeto inteiro). O `setJob({progress: 0.5})` é chamado a cada
  // tick (~30×/s durante processamento) e cria nova referência do objeto
  // `job` (`{...state.job, progress: 0.5}`). Antes, o `useStore(s => s.job)`
  // via `Object.is` re-renderizava o `BatchOrchestrator` inteiro a cada tick
  // — o componente retorna `null` ou um `<Box>` com props estáticas, então
  // a re-renderização era puro desperdício de reconciliação.
  // Agora, só re-renderiza quando `status` muda (idle → processing →
  // completed → failed) — o callback de progresso muta o store, mas o
  // seletor `s.job.status` retorna o mesmo primitivo.
  const jobStatus = useAnimationStore((s) => s.job.status);
  const queue = useAnimationStore((s) => s.queue);
  const currentIndex = useAnimationStore((s) => s.currentIndex);
  const batchMode = useAnimationStore((s) => s.batchMode);
  const setJob = useAnimationStore((s) => s.setJob);
  const setCurrentIndex = useAnimationStore((s) => s.setCurrentIndex);
  const setBatchMode = useAnimationStore((s) => s.setBatchMode);
  const setQueue = useAnimationStore((s) => s.setQueue);
  // NOTA (v0.135.2 / W3 da auditoria): `canvasColor` (e qualquer outra
  // preferência que não deve disparar re-mount do effect) é lido via
  // `getState()` no momento do processamento, NÃO via subscription +
  // deps. Incluir nas deps faria o cleanup do useEffect abortar o
  // processamento em curso SEM reiniciar (o corpo só reinicia com novo
  // `currentImgId`), deixando o job eternamente em `'processing'`.

  const currentImageIdRef = useRef<string | null>(null);
  // W5: ref para detectar quando a fila foi limpa durante processamento
  const processingIdRef = useRef<string | null>(null);
  const skipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // `currentImg` é o item atualmente em processamento. Mantemos o id estável
  // nas deps do effect abaixo (em vez do objeto inteiro) para que updates
  // internos do store — como `setQueue` mudando o status do item para
  // 'processing' — não cancelem o processamento em andamento. A leitura de
  // `dataUrl` é feita via `getState()` para evitar closure stale.
  const currentImg = queue[currentIndex];
  const currentImgId = currentImg?.id ?? null;

  useEffect(() => {
    if (batchMode === 'watch' && queue.length > 0) return;

    currentImageIdRef.current = null;
    processingIdRef.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = null;
    }
  }, [batchMode, queue.length]);

  // Pipeline de processamento: detecta nova imagem na fila e gera strokes
  useEffect(() => {
    if (batchMode !== 'watch' || queue.length === 0) return;

    // Fim da fila — volta ao estado idle
    if (!currentImgId) {
      setBatchMode('idle');
      return;
    }

    // Processa apenas imagens novas (evita re-processar a mesma)
    if (currentImageIdRef.current !== currentImgId) {
      currentImageIdRef.current = currentImgId;

      // Marca o ID do item sendo processado para checagem de cancelamento
      const processId = currentImgId;
      processingIdRef.current = processId;
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Lê o dataUrl via getState() para evitar closure stale — o item da fila
      // é recriado pelo `setQueue` abaixo (status → 'processing'), então a
      // referência capturada pode estar desatualizada antes do efeito rodar.
      const currentItem = useAnimationStore.getState().queue.find((q) => q.id === processId);
      const dataUrl = currentItem?.dataUrl;
      if (!dataUrl) {
        log.warn('Item da fila desapareceu antes do processamento iniciar', { id: processId });
        return;
      }

      setJob({
        id: processId,
        inputImage: dataUrl,
        status: 'processing',
        progress: 0,
      });
      setQueue((prev) => prev.map((item) => (
        item.id === processId
          ? { ...item, status: 'processing' }
          : item
      )));

      // Lê `renderMode` + `vetorialPreset` da store via `getState()` para evitar
      // closure stale — o usuário pode trocar o modo/preset durante o
      // processamento do item atual (MDE-04: retrocompat + race protection).
      // O `processingIdRef` em escopo de módulo garante que apenas o item
      // atual aplica o resultado; trocar modo/preset não interrompe o job
      // vigente (CT-F47).
      // v0.133.1: cada item da fila pode ter seu próprio `renderMode`/
      // `vetorialPreset` (`QueuedImage.renderMode?`). Quando ausente, herda
      // do global da store — retrocompatível com filas antigas.
      const globalStore = useAnimationStore.getState();
      const itemRenderMode: SpeedPaintRenderMode =
        currentItem.renderMode ?? globalStore.renderMode;
      const itemVetorialPreset: VetorialPreset | undefined =
        currentItem.vetorialPreset ??
        (itemRenderMode === 'vetorial' ? globalStore.vetorialPreset : undefined);
      // v0.135.1 (W-1 da auditoria rodada 7): propaga `vetorialSortOrder`
      // para o preview do batch, mantendo paridade com o export
      // (`SpeedPaintPage.startBatchRender` → `runBatchRender`).
      // Sem isso, o preview watch cai na ordem natural (varredura raster)
      // enquanto o record exporta na ordem do seletor — divergência
      // silenciosa que reproduzia a classe de bug do W-B da rodada 6.
      const itemVetorialSortOrder =
        currentItem.vetorialSortOrder ??
        (itemRenderMode === 'vetorial' ? globalStore.vetorialSortOrder : undefined);

      generateStrokesFromImage(dataUrl, (p) => {
        if (processingIdRef.current !== processId) return;
        setJob({ progress: p });
      }, {
        signal: abortController.signal,
        renderMode: itemRenderMode,
        vetorialPreset: itemRenderMode === 'vetorial' ? itemVetorialPreset : undefined,
        vetorialSortOrder:
          itemRenderMode === 'vetorial' ? itemVetorialSortOrder : undefined,
        // v0.135.2 (F2): propaga canvasColor do store global.
      // Lido via `getState()` no momento da chamada (não via subscription)
      // para não virar dep do useEffect — ver nota acima sobre W3.
        canvasColor: globalStore.canvasColor,
      }).then((animation) => {
        // Se a fila foi limpa durante o processamento, ignora o resultado
        if (processingIdRef.current !== processId) return;
        // Marca job como concluído — o SpeedPaintPlayer detecta e auto-play
        setJob({ id: processId, status: 'completed', animation, progress: 0 });
        setQueue((prev) => prev.map((item) => (
          item.id === processId
            ? { ...item, status: 'completed' }
            : item
        )));
      }).catch((err) => {
        if (abortController.signal.aborted) return;
        // Se a fila foi limpa durante o processamento, ignora o erro
        if (processingIdRef.current !== processId) return;
        log.error('Falha ao processar imagem em lote', { error: err });
        setJob({ id: processId, status: 'failed' });
        setQueue((prev) => prev.map((item) => (
          item.id === processId
            ? { ...item, status: 'failed' }
            : item
        )));

        // Auto-skip após 2 segundos — usa getState() para evitar closure stale
        if (skipTimeoutRef.current) {
          clearTimeout(skipTimeoutRef.current);
        }
        skipTimeoutRef.current = setTimeout(() => {
          setCurrentIndex(useAnimationStore.getState().currentIndex + 1);
          skipTimeoutRef.current = null;
        }, 2000);
      });
    }

    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current);
        skipTimeoutRef.current = null;
      }
    };
  }, [batchMode, currentIndex, currentImgId, queue.length, setJob, setCurrentIndex, setBatchMode, setQueue]);

  if (jobStatus === 'failed' && batchMode !== 'idle') {
    const nextInQueue = currentIndex + 1 < queue.length;
    return (
      <Box
        sx={(theme) => ({
          ...glassPanelSx(theme),
          width: '100%',
          maxWidth: 672,
          mx: 'auto',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          border: `1px solid ${alpha(ERROR_MAIN, 0.3)}`,
          borderRadius: RADIUS_SM,
        })}
        role="alert"
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: BRAND_GRADIENT,
            opacity: 0.2,
            mb: 1.5,
          }}
        >
          <ErrorOutlineOutlined sx={{ fontSize: 40, color: ERROR_MAIN }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: 0, mb: 0.5 }}>
          {t('speedPaint.batchProcessingFailed')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {nextInQueue
            ? t('speedPaint.batchSkippingNext')
            : t('speedPaint.batchSkippingRest')}
        </Typography>
      </Box>
    );
  }

  return null;
}
