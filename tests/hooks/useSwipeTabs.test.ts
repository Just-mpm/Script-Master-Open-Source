/**
 * Testes unitários para useSwipeTabs.
 *
 * Cobre:
 * - Troca de aba via swipe (esquerda/direita)
 * - Threshold de distancia e velocidade
 * - Ignorar gestos em elementos interativos
 * - Limites de aba (primeira/ultima)
 * - Variants de animacao
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeTabs } from '../../src/hooks/useSwipeTabs';

/** Cria um PanInfo simulado */
function createPanInfo(overrides: Partial<{ offsetX: number; velocityX: number }> = {}) {
  const { offsetX = 0, velocityX = 0 } = overrides;
  return {
    point: { x: 0, y: 0 },
    delta: { x: offsetX, y: 0 },
    offset: { x: offsetX, y: 0 },
    velocity: { x: velocityX, y: 0 },
  };
}

/** Cria um evento de drag simulado */
function createDragEvent(targetOverrides?: Partial<HTMLElement>) {
  const target = document.createElement('div');
  if (targetOverrides) {
    Object.assign(target, targetOverrides);
  }
  return { target } as unknown as MouseEvent;
}

describe('useSwipeTabs', () => {
  let setActiveTab: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActiveTab = vi.fn();
  });

  describe('handleDragEnd - troca de aba', () => {
    it('vai para a proxima aba ao arrastar para a esquerda (distancia)', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const info = createPanInfo({ offsetX: -80 });
      const event = createDragEvent();

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).toHaveBeenCalledWith(1);
    });

    it('vai para a aba anterior ao arrastar para a direita (distancia)', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 1, tabCount: 2, setActiveTab }),
      );

      const info = createPanInfo({ offsetX: 80 });
      const event = createDragEvent();

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).toHaveBeenCalledWith(0);
    });

    it('troca via velocidade mesmo com distancia pequena', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 3, setActiveTab }),
      );

      // Distancia pequena (-20px) mas velocidade alta (-500px/s)
      const info = createPanInfo({ offsetX: -20, velocityX: -500 });
      const event = createDragEvent();

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).toHaveBeenCalledWith(1);
    });

    it('nao troca se distancia e velocidade forem insuficientes', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const info = createPanInfo({ offsetX: -20, velocityX: -100 });
      const event = createDragEvent();

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).not.toHaveBeenCalled();
    });
  });

  describe('handleDragEnd - limites', () => {
    it('nao vai alem da ultima aba', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 1, tabCount: 2, setActiveTab }),
      );

      // Swipe para esquerda na ultima aba
      const info = createPanInfo({ offsetX: -100 });
      const event = createDragEvent();

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).not.toHaveBeenCalled();
    });

    it('nao vai antes da primeira aba', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      // Swipe para direita na primeira aba
      const info = createPanInfo({ offsetX: 100 });
      const event = createDragEvent();

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).not.toHaveBeenCalled();
    });
  });

  describe('handleDragEnd - elementos interativos', () => {
    it('ignora swipe originado em input', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const input = document.createElement('input');
      document.body.appendChild(input);
      const event = { target: input } as unknown as MouseEvent;
      const info = createPanInfo({ offsetX: -100 });

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('ignora swipe originado em button', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const button = document.createElement('button');
      document.body.appendChild(button);
      const event = { target: button } as unknown as MouseEvent;
      const info = createPanInfo({ offsetX: -100 });

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).not.toHaveBeenCalled();
      document.body.removeChild(button);
    });

    it('ignora swipe originado em [role="tab"]', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const tab = document.createElement('div');
      tab.setAttribute('role', 'tab');
      document.body.appendChild(tab);
      const event = { target: tab } as unknown as MouseEvent;
      const info = createPanInfo({ offsetX: -100 });

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).not.toHaveBeenCalled();
      document.body.removeChild(tab);
    });

    it('ignora swipe originado em elemento dentro de .MuiSlider-root', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const container = document.createElement('div');
      container.className = 'MuiSlider-root';
      const inner = document.createElement('span');
      container.appendChild(inner);
      document.body.appendChild(container);
      const event = { target: inner } as unknown as MouseEvent;
      const info = createPanInfo({ offsetX: -100 });

      act(() => {
        result.current.handleDragEnd(event, info as unknown as import('motion/react').PanInfo);
      });

      expect(setActiveTab).not.toHaveBeenCalled();
      document.body.removeChild(container);
    });
  });

  describe('valores de retorno', () => {
    it('retorna constraintRef como ref', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      expect(result.current.constraintRef).toBeDefined();
      expect(result.current.constraintRef.current).toBeNull();
    });

    it('retorna dragElastic como numero', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      expect(typeof result.current.dragElastic).toBe('number');
      expect(result.current.dragElastic).toBeGreaterThan(0);
      expect(result.current.dragElastic).toBeLessThanOrEqual(1);
    });

    it('retorna swipeVariants com enter, center e exit', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const { swipeVariants } = result.current;
      expect(swipeVariants).toHaveProperty('enter');
      expect(swipeVariants).toHaveProperty('center');
      expect(swipeVariants).toHaveProperty('exit');
    });

    it('retorna handleDragEnd como funcao', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      expect(typeof result.current.handleDragEnd).toBe('function');
    });
  });

  describe('swipeVariants - direcao', () => {
    it('enter com direction positivo desloca para direita', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const enterVariant = result.current.swipeVariants.enter as (dir: number) => object;
      const props = enterVariant(1);
      expect(props).toHaveProperty('x', '50%');
      expect(props).toHaveProperty('opacity', 0);
    });

    it('enter com direction negativo desloca para esquerda', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const enterVariant = result.current.swipeVariants.enter as (dir: number) => object;
      const props = enterVariant(-1);
      expect(props).toHaveProperty('x', '-50%');
    });

    it('exit com direction positivo desloca para esquerda', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const exitVariant = result.current.swipeVariants.exit as (dir: number) => object;
      const props = exitVariant(1);
      expect(props).toHaveProperty('x', '-50%');
    });

    it('exit com direction negativo desloca para direita', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const exitVariant = result.current.swipeVariants.exit as (dir: number) => object;
      const props = exitVariant(-1);
      expect(props).toHaveProperty('x', '50%');
    });

    it('center tem x=0 e opacity=1', () => {
      const { result } = renderHook(() =>
        useSwipeTabs({ activeTab: 0, tabCount: 2, setActiveTab }),
      );

      const center = result.current.swipeVariants.center as object;
      expect(center).toHaveProperty('x', 0);
      expect(center).toHaveProperty('opacity', 1);
    });
  });

  describe('reatividade', () => {
    it('handleDragEnd usa o activeTab atual', () => {
      const { result, rerender } = renderHook(
        ({ activeTab }) =>
          useSwipeTabs({ activeTab, tabCount: 3, setActiveTab }),
        { initialProps: { activeTab: 0 } },
      );

      // Na aba 0, swipe esquerdo deve ir para 1
      act(() => {
        result.current.handleDragEnd(
          createDragEvent() as unknown as MouseEvent,
          createPanInfo({ offsetX: -80 }) as unknown as import('motion/react').PanInfo,
        );
      });
      expect(setActiveTab).toHaveBeenCalledWith(1);

      // Atualiza para aba 1
      rerender({ activeTab: 1 });
      setActiveTab.mockClear();

      // Na aba 1, swipe esquerdo deve ir para 2
      act(() => {
        result.current.handleDragEnd(
          createDragEvent() as unknown as MouseEvent,
          createPanInfo({ offsetX: -80 }) as unknown as import('motion/react').PanInfo,
        );
      });
      expect(setActiveTab).toHaveBeenCalledWith(2);
    });
  });
});
