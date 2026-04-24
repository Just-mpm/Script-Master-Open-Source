import { describe, it, expect } from 'vitest';
import {
  msToFrames,
  framesToMs,
  framesToSeconds,
  getResolutionFromRatio,
  calculateDurationFromWav,
  mapScenesToVideoScenes,
} from '../../src/features/video-render/lib/videoUtils';
import type { StudioScene } from '../../src/features/studio/types';

describe('videoUtils', () => {
  describe('msToFrames', () => {
    it('converte 1000ms a 30fps para 30 frames', () => {
      expect(msToFrames(1000, 30)).toBe(30);
    });

    it('arredonda para o inteiro mais próximo', () => {
      expect(msToFrames(500, 30)).toBe(15); // 500/1000*30 = 15
    });

    it('converte 0ms para 0 frames', () => {
      expect(msToFrames(0, 30)).toBe(0);
    });

    it('converte fração de milissegundo', () => {
      expect(msToFrames(33, 30)).toBe(1); // 0.033 * 30 = 0.99 → round = 1
    });
  });

  describe('framesToMs', () => {
    it('converte 30 frames a 30fps para 1000ms', () => {
      expect(framesToMs(30, 30)).toBe(1000);
    });

    it('converte 0 frames para 0ms', () => {
      expect(framesToMs(0, 30)).toBe(0);
    });

    it('retorna valor fracionário (não arredonda)', () => {
      expect(framesToMs(1, 30)).toBeCloseTo(33.333, 2);
    });
  });

  describe('framesToSeconds', () => {
    it('converte 30 frames a 30fps para 1 segundo', () => {
      expect(framesToSeconds(30, 30)).toBe(1);
    });

    it('converte 90 frames a 30fps para 3 segundos', () => {
      expect(framesToSeconds(90, 30)).toBe(3);
    });

    it('retorna 0 para 0 frames', () => {
      expect(framesToSeconds(0, 30)).toBe(0);
    });
  });

  describe('getResolutionFromRatio', () => {
    it('retorna 1920x1080 para 16:9', () => {
      expect(getResolutionFromRatio('16:9')).toEqual({ width: 1920, height: 1080 });
    });

    it('retorna 1080x1920 para 9:16', () => {
      expect(getResolutionFromRatio('9:16')).toEqual({ width: 1080, height: 1920 });
    });

    it('retorna 1080x1080 para 1:1', () => {
      expect(getResolutionFromRatio('1:1')).toEqual({ width: 1080, height: 1080 });
    });

    it('fallback para 16:9 com ratio inválido via as unknown', () => {
      // TypeScript impede, mas em runtime aceita string inválida
      const result = getResolutionFromRatio('4:3' as '16:9');
      expect(result).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe('calculateDurationFromWav', () => {
    it('calcula duração correta para WAV mono 16-bit 24kHz', () => {
      // 24000 samples/s * 2 bytes/sample = 48000 bytes/s de dados
      // 1 segundo de áudio = 48000 + 44 (header) = 48044 bytes
      expect(calculateDurationFromWav(48044, 24000)).toBe(1);
    });

    it('calcula duração para 2 segundos', () => {
      // 2s * 48000 bytes/s + 44 = 96044
      expect(calculateDurationFromWav(96044, 24000)).toBe(2);
    });

    it('retorna 0 para WAV menor que header (44 bytes)', () => {
      // dataBytes = 44 - 44 = 0 → max(0, 0/x) = 0
      expect(calculateDurationFromWav(44, 24000)).toBe(0);
    });

    it('retorna 0 para WAV vazio (0 bytes)', () => {
      // dataBytes = 0 - 44 = -44 → max(0, -44/x) = 0
      expect(calculateDurationFromWav(0, 24000)).toBe(0);
    });

    it('usa sampleRate padrão 24000 quando não informado', () => {
      expect(calculateDurationFromWav(48044)).toBe(1);
    });

    it('usa sampleRate customizado (48000)', () => {
      // 48000 * 2 = 96000 bytes/s, 1s = 96000 + 44 = 96044
      expect(calculateDurationFromWav(96044, 48000)).toBe(1);
    });
  });

  describe('mapScenesToVideoScenes', () => {
    const makeScene = (timestamp: number): StudioScene => ({
      imageUrl: `https://example.com/img-${timestamp}.png`,
      timestamp,
    });

    it('retorna array vazio para scenes vazio', () => {
      expect(mapScenesToVideoScenes([], 900, 30)).toEqual([]);
    });

    it('mapeia cena única com duração até o fim do áudio', () => {
      const scenes = [makeScene(0)];
      const result = mapScenesToVideoScenes(scenes, 300, 30); // 10s
      expect(result).toHaveLength(1);
      expect(result[0].durationInFrames).toBe(300);
      expect(result[0].imageUrl).toBe(scenes[0].imageUrl);
    });

    it('calcula duração entre timestamps de cenas adjacentes', () => {
      const scenes = [makeScene(0), makeScene(5)];
      // Cena 0: 0→5s = 150 frames
      // Cena 1: 5→10s = 150 frames
      const result = mapScenesToVideoScenes(scenes, 300, 30);
      expect(result).toHaveLength(2);
      expect(result[0].durationInFrames).toBe(150);
      expect(result[1].durationInFrames).toBe(150);
    });

    it('última cena se estende até totalDurationInFrames', () => {
      const scenes = [makeScene(0), makeScene(8)];
      const result = mapScenesToVideoScenes(scenes, 300, 30); // 10s total
      // Cena 1: 8s → 10s = 2s = 60 frames
      expect(result[1].durationInFrames).toBe(60);
    });

    it('garante duração mínima de 1 frame', () => {
      // Duas cenas com timestamps idênticos — duração 0 → clamp para 1
      const scenes = [makeScene(5), makeScene(5)];
      const result = mapScenesToVideoScenes(scenes, 300, 30);
      expect(result[0].durationInFrames).toBe(1);
    });

    it('preserva propriedades extras de StudioScene', () => {
      const scene: StudioScene = {
        imageUrl: 'https://example.com/img.png',
        timestamp: 0,
        prompt: 'Cena de teste',
      };
      const result = mapScenesToVideoScenes([scene], 300, 30);
      expect(result[0].prompt).toBe('Cena de teste');
    });
  });
});
