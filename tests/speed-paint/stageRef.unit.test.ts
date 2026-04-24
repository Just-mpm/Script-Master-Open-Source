import { describe, it, expect, beforeEach } from 'vitest';
import type Konva from 'konva';
import { setStageRef, getStageRef } from '../../src/features/speed-paint/lib/stageRef';

describe('stageRef', () => {
  beforeEach(() => {
    // Limpa o ref antes de cada teste
    setStageRef(null);
  });

  it('getStageRef retorna null quando não foi definido', () => {
    expect(getStageRef()).toBeNull();
  });

  it('setStageRef e getStageRef armazenam e recuperam o mesmo ref', () => {
    const mockStage = { _mock: true } as unknown as Konva.Stage;
    setStageRef(mockStage);
    expect(getStageRef()).toBe(mockStage);
  });

  it('setStageRef(null) limpa o ref', () => {
    const mockStage = { _mock: true } as unknown as Konva.Stage;
    setStageRef(mockStage);
    expect(getStageRef()).toBe(mockStage);

    setStageRef(null);
    expect(getStageRef()).toBeNull();
  });

  it('setStageRef sobrescreve ref anterior', () => {
    const mockStage1 = { id: 1 } as unknown as Konva.Stage;
    const mockStage2 = { id: 2 } as unknown as Konva.Stage;

    setStageRef(mockStage1);
    expect(getStageRef()).toBe(mockStage1);

    setStageRef(mockStage2);
    expect(getStageRef()).toBe(mockStage2);
    expect(getStageRef()).not.toBe(mockStage1);
  });
});
