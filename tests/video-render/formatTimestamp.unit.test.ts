import { describe, it, expect } from 'vitest';
import { formatTimestamp } from '../../src/features/video-render/lib/formatTimestamp';

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
