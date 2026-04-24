/**
 * Extrai um frame de preview de um blob de vídeo.
 * Cria um elemento <video> oculto, busca o frame em 2 segundos,
 * desenha em <canvas> e retorna data URL.
 *
 * NOTA: Atualmente não utilizado porque `getProjectsDetailsMap` não inclui
 * vídeos na sua estrutura de retorno ({ audios, images }). Quando vídeos
 * forem adicionados ao bulk fetch, esta função pode ser integrada.
 */
export async function extractVideoThumbnail(videoBlob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';

    const url = URL.createObjectURL(videoBlob);
    video.src = url;

    // Timeout de 10s para evitar pendurar indefinidamente (blob corrompido)
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10_000);

    const cleanup = (): void => {
      clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.removeEventListener('stalled', onStalled);
      URL.revokeObjectURL(url);
    };

    const onLoadedData = (): void => {
      // Seek para 2 segundos (ou 25% da duração se menor)
      video.currentTime = Math.min(2, video.duration * 0.25);
    };

    const onSeeked = (): void => {
      const canvas = document.createElement('canvas');
      const scale = 320 / video.videoWidth; // Thumbnail de ~320px
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);

      const ctx = canvas.getContext('2d');
      cleanup();
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(null);
      }
    };

    const onError = (): void => {
      cleanup();
      resolve(null);
    };

    const onStalled = (): void => {
      // Se o vídeo travar no carregamento, cancela após um tempo adicional
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 5_000);
    };

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.addEventListener('stalled', onStalled);
  });
}
