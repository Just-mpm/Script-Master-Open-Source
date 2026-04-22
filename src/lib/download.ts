import { logger } from './logger';

function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadFile(url: string, filename: string): Promise<void> {
  if (!url) {
    throw new Error('URL de download ausente.');
  }

  if (url.startsWith('blob:') || url.startsWith('data:')) {
    triggerDownload(url, filename);
    return;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Falha no download: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    try {
      triggerDownload(blobUrl, filename);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    logger.error('Falha ao baixar arquivo diretamente, usando fallback do navegador', { error });
    triggerDownload(url, filename);
  }
}
