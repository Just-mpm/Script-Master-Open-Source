import type { SceneRatio, StudioScene } from '../../studio/types';
import type { VideoScene } from '../types';

/** Converte milissegundos para frames */
export function msToFrames(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/** Converte frames para milissegundos */
export function framesToMs(frames: number, fps: number): number {
  return (frames / fps) * 1000;
}

/** Converte frames para segundos */
export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
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
