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

    const failedItems: string[] = [];
    const totalSteps = 1 + (item.scenes?.length ?? 0); // audio + scenes

    // 1. Download Audio (try/catch individual)
    if (item.audioUrl) {
      try {
        await downloadFile(item.audioUrl, `${safeName}-audio.wav`);
      } catch (err) {
        log.error('Falha no download do áudio', { error: err, name: safeName });
        failedItems.push('áudio');
      }
    }

    // 2. Download Images (uma por uma, com try/catch individual)
    if (item.scenes && item.scenes.length > 0) {
      for (let i = 0; i < item.scenes.length; i++) {
        try {
          // Small delay to prevent browser block
          await new Promise<void>(r => setTimeout(r, 400));
          const sceneFilename = `${safeName}-cena-${String(i + 1).padStart(2, '0')}.png`;
          await downloadFile(item.scenes[i].imageUrl, sceneFilename);
        } catch (err) {
          log.error('Falha no download da cena', { error: err, sceneIndex: i + 1 });
          failedItems.push(`cena ${i + 1}`);
        }
      }
    }

    // Report results
    if (failedItems.length > 0) {
      setDownloadError(
        `${failedItems.length} de ${totalSteps} itens falharam: ${failedItems.join(', ')}. Os demais foram baixados.`
      );
    } else {
      setDownloadError(null);
    }

    downloadingRef.current = false;
    setDownloadingId(null);
  }, []);

  return {
    downloadingId,
    downloadError,
    setDownloadError,
    handleDownloadSequence,
  };
}
