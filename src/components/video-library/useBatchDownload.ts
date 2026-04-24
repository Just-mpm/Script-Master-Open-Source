import { useCallback, useRef, useState } from 'react';
import type React from 'react';
import { downloadFile } from '../../lib/download';
import { createLogger } from '../../lib/logger';
import type { VideoLibraryItem } from './types';

const log = createLogger('VideoLibrary:download');

/** Hook dedicado à lógica de download em sequência com progresso */
export function useBatchDownload() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloadingRef = useRef(false);

  const handleDownloadSequence = useCallback(async (
    e: React.MouseEvent,
    item: VideoLibraryItem,
  ) => {
    e.stopPropagation();
    if (downloadingRef.current) return;
    downloadingRef.current = true;

    setDownloadingId(item.id);
    const safeName = item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    try {
      // 1. Download Audio
      if (item.audioUrl) {
        await downloadFile(item.audioUrl, `${safeName}-audio.wav`);
      }

      // 2. Download Images
      if (item.scenes && item.scenes.length > 0) {
        for (let i = 0; i < item.scenes.length; i++) {
          // Small delay to prevent browser block
          await new Promise(r => setTimeout(r, 400));
          const sceneFilename = `${safeName}-cena-${String(i + 1).padStart(2, '0')}.png`;
          await downloadFile(item.scenes[i].imageUrl, sceneFilename);
        }
      }
    } catch (err) {
      log.error('Falha no download em sequência', { error: err });
      setDownloadError('Ocorreu um erro durante o download. Tente novamente.');
    } finally {
      downloadingRef.current = false;
      setDownloadingId(null);
    }
  }, []);

  return {
    downloadingId,
    downloadError,
    setDownloadError,
    handleDownloadSequence,
  };
}
