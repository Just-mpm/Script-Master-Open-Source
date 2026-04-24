/**
 * Formata frame em timestamp MM:SS.xx (2 casas decimais).
 *
 * Utilidade compartilhada entre componentes que exibem timing de vídeo
 * (CaptionEditorPanel, SubtitleOverlay, VideoExportPanel, etc.).
 */
export function formatTimestamp(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}
