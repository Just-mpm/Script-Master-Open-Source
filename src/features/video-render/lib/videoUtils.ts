import type { SceneRatio, StudioScene } from '../../studio/types';
import type { VideoExportQuality, VideoScene } from '../types';

/** Converte milissegundos para frames */
export function msToFrames(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/** Qualidade padrão de exportação de vídeo */
export const DEFAULT_EXPORT_QUALITY: VideoExportQuality = '1080p';

/** Converte frames para milissegundos */
export function framesToMs(frames: number, fps: number): number {
  return (frames / fps) * 1000;
}

/** Retorna resolução baseada no ratio da cena */
export function getResolutionFromRatio(ratio: SceneRatio): { width: number; height: number } {
  const resolutions: Record<SceneRatio, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
  };
  return resolutions[ratio] ?? resolutions['16:9'];
}

/** Retorna resolução customizada baseada na qualidade e ratio */
export function getResolutionFromQuality(
  ratio: SceneRatio,
  quality: VideoExportQuality,
): { width: number; height: number } {
  // Base: ratio determina a proporção, quality determina o "lado maior"
  const baseResolution: Record<VideoExportQuality, number> = {
    '720p': 1280,
    '1080p': 1920,
    '1440p': 2560,
    '4k': 3840,
  };

  const base = baseResolution[quality];

  switch (ratio) {
    case '16:9': return { width: base, height: Math.round(base * 9 / 16) };
    case '9:16': return { width: Math.round(base * 9 / 16), height: base };
    case '1:1': return { width: base, height: base };
    default: return { width: base, height: Math.round(base * 9 / 16) };
  }
}

/**
 * Estima tamanho do arquivo exportado em bytes.
 * Fórmula aproximada: duration * bitrate / 8.
 * Bitrate típico H264: 1080p ≈ 8Mbps, escalando linearmente com pixels.
 */
export function estimateFileSize(
  durationInSeconds: number,
  width: number,
  height: number,
  codec: string,
): number {
  // Bitrate base para 1080p H264 ≈ 8 Mbps (8_000_000 bits/s)
  const baseBitrate = 8_000_000;
  const basePixels = 1920 * 1080;
  const pixels = width * height;

  // Multiplicadores de bitrate por codec relativos ao H264
  const codecMultiplier: Record<string, number> = {
    vp8: 1.2,   // ~20% mais bitrate
    vp9: 0.6,   // ~40% menor
    h265: 0.5,  // ~50% menor
  };
  const multiplier = codecMultiplier[codec.toLowerCase()] ?? 1.0;

  const bitrate = (baseBitrate * (pixels / basePixels)) * multiplier;
  return Math.round((durationInSeconds * bitrate) / 8);
}

/**
 * Calcula duração em segundos a partir do tamanho do blob WAV.
 * Mono 16-bit: cada sample ocupa 2 bytes, logo bytes/seg = sampleRate * 2.
 * WAV tem header fixo de 44 bytes que precisa ser descontado.
 */
export function calculateDurationFromWav(wavByteLength: number, sampleRate = 24000): number {
  const dataBytes = wavByteLength - 44;
  const bytesPerSecond = sampleRate * 2;
  return Math.max(0, dataBytes / bytesPerSecond);
}

/**
 * Mapeia StudioScene[] para VideoScene[] calculando a duração em frames
 * de cada cena. A última cena se estende até o fim do áudio.
 */
export function mapScenesToVideoScenes(
  scenes: StudioScene[],
  totalDurationInFrames: number,
  fps: number,
): VideoScene[] {
  if (scenes.length === 0) return [];

  return scenes.map((scene, index) => {
    const currentStartSec = scene.timestamp;
    const nextStartSec = index < scenes.length - 1
      ? scenes[index + 1].timestamp
      : totalDurationInFrames / fps;
    const durationSec = Math.max(0, nextStartSec - currentStartSec);
    const sceneDurationInFrames = Math.max(1, Math.round(durationSec * fps));

    return { ...scene, durationInFrames: sceneDurationInFrames };
  });
}
