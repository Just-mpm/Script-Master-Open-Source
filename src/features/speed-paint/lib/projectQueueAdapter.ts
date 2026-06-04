import type { ProjectImage } from '../../../lib/db';
import type { QueuedImage } from '../types';
import { createLogger } from '../../../lib/logger';

const log = createLogger('speed-paint-queue');

export interface ProjectQueuePreparationResult {
  queue: QueuedImage[];
  failedCount: number;
}

function buildLibraryFileName(projectName: string, index: number): string {
  const sanitizedProjectName = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const baseName = sanitizedProjectName || 'projeto';
  return `${baseName}-cena-${index + 1 }.png`;
}

async function fetchProjectImageBlob(image: ProjectImage): Promise<Blob> {
  if (image.imageBlob) {
    return image.imageBlob;
  }

  if (!image.imageUrl) {
    throw new Error('Imagem sem blob ou URL disponível.');
  }

  const response = await fetch(image.imageUrl);
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem: ${response.status}`);
  }

  return await response.blob();
}

export async function prepareProjectImagesForSpeedPaint(
  projectName: string,
  images: ProjectImage[],
): Promise<ProjectQueuePreparationResult> {
  const sortedImages = [...images].sort((firstImage, secondImage) => firstImage.timestamp - secondImage.timestamp);

  const queueEntries = await Promise.all(
    sortedImages.map(async (image, index) => {
      try {
        const blob = await fetchProjectImageBlob(image);
        const objectUrl = URL.createObjectURL(blob);

        return {
          queueItem: {
            id: image.id,
            dataUrl: objectUrl,
            filename: buildLibraryFileName(projectName, index),
            status: 'pending',
            shouldRevokeObjectUrl: true,
          } satisfies QueuedImage,
          failed: false,
        };
      } catch (err: unknown) {
        log.warn('Falha ao processar imagem para fila de speed paint', { error: String(err) });
        return {
          queueItem: null,
          failed: true,
        };
      }
    }),
  );

  const queue = queueEntries.flatMap((entry) => (entry.queueItem ? [entry.queueItem] : []));
  const failedCount = queueEntries.filter((entry) => entry.failed).length;

  return { queue, failedCount };
}
