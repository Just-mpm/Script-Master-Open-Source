import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueueStaging } from '../../src/features/speed-paint/components/batch/QueueStaging';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';
import type { QueuedImage } from '../../src/features/speed-paint/types';

// ---------------------------------------------------------------------------
// Mocks do @dnd-kit — capturamos onDragEnd para simular reordenação
// ---------------------------------------------------------------------------
// NOTA: Os hooks useSortable, DragDropProvider e DragOverlay são totalmente
// mockados. Os testes validam a integração entre o nosso componente e a
// callback onDragEnd, mas não testam o comportamento real de drag-and-drop
// do @dnd-kit (renderização visual, animações, a11y). Para testar o
// comportamento real, seria necessário um teste de integração com
// @testing-library/user-event simulando mouse events.

// Formato do evento onDragEnd do @dnd-kit/react v0.4.0
interface DndDragEndEvent {
  canceled: boolean;
  operation: {
    source: {
      id: string;
      initialIndex: number;
      index: number;
    };
    target?: { id: string };
  };
}

let capturedOnDragEnd: ((event: DndDragEndEvent) => void) | undefined;

vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children, onDragEnd }: { children: ReactNode; onDragEnd?: (event: DndDragEndEvent) => void }) => {
    capturedOnDragEnd = onDragEnd;
    return <>{children}</>;
  },
  DragOverlay: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: ({ id }: { id: string }) => ({
    ref: () => {},
    handleRef: () => {},
    isDragging: false,
    isDropTarget: false,
  }),
  isSortable: (source: unknown) => Boolean(source && typeof source === 'object' && 'initialIndex' in source),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

const sampleQueue: QueuedImage[] = [
  { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'foto1.png', status: 'pending' },
  { id: '2', dataUrl: 'data:image/png;base64,def', filename: 'foto2.jpg', status: 'pending' },
  { id: '3', dataUrl: 'data:image/png;base64,ghi', filename: 'foto3.webp', status: 'pending' },
];

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('QueueStaging', () => {
  beforeEach(() => {
    useAnimationStore.getState().clearQueue();
    capturedOnDragEnd = undefined;
  });

  it('retorna null quando queue está vazio', () => {
    const { container } = render(<QueueStaging />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('renderiza "Fila de Produção" quando há itens', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    expect(screen.getByText('Fila de Produção')).toBeDefined();
  });

  it('mostra contagem de itens na fila', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    const body2 = screen.getByText((text) =>
      text.includes('3') && text.includes('imagem(ns) na fila'),
    );
    expect(body2).toBeDefined();
  });

  it('renderiza cada imagem da fila', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    expect(screen.getByAltText('foto1.png')).toBeDefined();
    expect(screen.getByAltText('foto2.jpg')).toBeDefined();
    expect(screen.getByAltText('foto3.webp')).toBeDefined();
  });

  it('mostra número de ordem para cada imagem', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    expect(screen.getByText('#1')).toBeDefined();
    expect(screen.getByText('#2')).toBeDefined();
    expect(screen.getByText('#3')).toBeDefined();
  });

  it('mostra nome do arquivo em cada card', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    expect(screen.getByText('foto1.png')).toBeDefined();
    expect(screen.getByText('foto2.jpg')).toBeDefined();
  });

  it('tem botão "Apenas Assistir"', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    expect(screen.getByText('Apenas Assistir')).toBeDefined();
  });

  it('tem botão "Gravar Tudo Automático"', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    expect(screen.getByText('Gravar Tudo Automático')).toBeDefined();
  });

  it('tem botão "Cancelar Fila"', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    expect(screen.getByText('Cancelar Fila')).toBeDefined();
  });

  it('"Apenas Assistir" muda batchMode para watch', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText('Apenas Assistir'));
    expect(useAnimationStore.getState().batchMode).toBe('watch');
  });

  it('"Gravar Tudo Automático" muda batchMode para record', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText('Gravar Tudo Automático'));
    expect(useAnimationStore.getState().batchMode).toBe('record');
  });

  it('"Cancelar Fila" limpa queue e reseta estado', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    useAnimationStore.getState().setBatchMode('watch');
    render(<QueueStaging />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText('Cancelar Fila'));
    expect(useAnimationStore.getState().queue).toEqual([]);
    expect(useAnimationStore.getState().batchMode).toBe('idle');
  });

  it('remove imagem individual filtra da queue', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    render(<QueueStaging />, { wrapper: Wrapper });

    const removeBtn = screen.getByLabelText('Remover foto1.png');
    fireEvent.click(removeBtn);

    const queue = useAnimationStore.getState().queue;
    expect(queue).toHaveLength(2);
    expect(queue.find((q) => q.id === '1')).toBeUndefined();
    expect(queue[0].id).toBe('2');
    expect(queue[1].id).toBe('3');
  });

  it('chama reorderQueue ao finalizar drag com índices corretos', () => {
    useAnimationStore.getState().setQueue(sampleQueue);
    const reorderSpy = vi.spyOn(useAnimationStore.getState(), 'reorderQueue');
    render(<QueueStaging />, { wrapper: Wrapper });

    expect(capturedOnDragEnd).toBeDefined();

    // Simula arrastar o primeiro item (índice 0) para a posição do terceiro (índice 2)
    // Formato do evento @dnd-kit/react v0.4.0
    capturedOnDragEnd!({
      canceled: false,
      operation: {
        source: {
          id: '1',
          initialIndex: 0,
          index: 2,
        },
        target: { id: '3' },
      },
    });

    expect(reorderSpy).toHaveBeenCalledTimes(1);
    expect(reorderSpy).toHaveBeenCalledWith(0, 2);
    reorderSpy.mockRestore();
  });
});
