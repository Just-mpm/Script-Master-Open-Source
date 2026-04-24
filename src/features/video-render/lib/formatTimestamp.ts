/**
 * Formata frame em timestamp MM:SS.xx (2 casas decimais).
 *
 * Utilidade compartilhada entre componentes que exibem timing de vídeo
 * (CaptionEditorPanel, SubtitleOverlay, VideoExportPanel, etc.).
 */
/** Converte frame para segundos (função pura) */
export function frameToSeconds(frame: number, fps: number): number {
  return frame / fps;
}

/** Converte segundos para frames (arredonda para inteiro mais próximo) */
export function secondsToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

export function formatTimestamp(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}
