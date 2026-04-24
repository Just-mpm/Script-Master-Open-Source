import { describe, it, expect } from 'vitest';
import { formatTimestamp, frameToSeconds, secondsToFrame } from '../../src/features/video-render/lib/formatTimestamp';

describe('formatTimestamp', () => {
  it('formata frame 0 como 00:00.00', () => {
    expect(formatTimestamp(0, 30)).toBe('00:00.00');
  });

  it('formata frame exato de 1 segundo', () => {
    expect(formatTimestamp(30, 30)).toBe('00:01.00');
  });

  it('formata frame fracionário (meio segundo)', () => {
    // 15 frames a 30fps = 0.5s → 00:00.50
    expect(formatTimestamp(15, 30)).toBe('00:00.50');
  });

  it('formata frames que geram minutos inteiros', () => {
    // 60 * 30 = 1800 frames = 60s = 1 minuto
    expect(formatTimestamp(1800, 30)).toBe('01:00.00');
  });

  it('formata minuto com segundos fracionários', () => {
    // 90 * 30 = 2700 frames = 90s = 1:30
    expect(formatTimestamp(2700, 30)).toBe('01:30.00');
  });

  it('formata com fps diferente (24fps)', () => {
    // 24 frames a 24fps = 1s
    expect(formatTimestamp(24, 24)).toBe('00:01.00');
  });

  it('respeita casas decimais — padStart com 5 chars', () => {
    // 1 frame a 30fps = 0.0333...s → "00:00.03"
    expect(formatTimestamp(1, 30)).toBe('00:00.03');
  });

  it('formata timestamp longo (10 minutos)', () => {
    // 600 * 30 = 18000 frames = 600s = 10min
    expect(formatTimestamp(18000, 30)).toBe('10:00.00');
  });

  it('lida com fps baixo (1fps)', () => {
    // 90 frames a 1fps = 90s = 1:30
    expect(formatTimestamp(90, 1)).toBe('01:30.00');
  });
});

describe('frameToSeconds', () => {
  it('converte frame 0 para 0 segundos', () => {
    expect(frameToSeconds(0, 30)).toBe(0);
  });

  it('converte 30 frames em 1 segundo a 30fps', () => {
    expect(frameToSeconds(30, 30)).toBe(1);
  });

  it('converte 337 frames em segundos fracionados a 30fps', () => {
    const result = frameToSeconds(337, 30);
    expect(result).toBeCloseTo(11.233, 2);
  });
});

describe('secondsToFrame', () => {
  it('converte 0 segundos para frame 0', () => {
    expect(secondsToFrame(0, 30)).toBe(0);
  });

  it('converte 1 segundo para 30 frames a 30fps', () => {
    expect(secondsToFrame(1, 30)).toBe(30);
  });

  it('arredonda para o frame mais próximo', () => {
    // 11.23 * 30 = 336.9 → Math.round(336.9) = 337
    expect(secondsToFrame(11.23, 30)).toBe(337);
  });
});
