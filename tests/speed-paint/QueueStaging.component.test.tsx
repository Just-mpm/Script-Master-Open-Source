import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueueStaging } from '../../src/features/speed-paint/components/batch/QueueStaging';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';
import type { QueuedImage } from '../../src/features/speed-paint/types';

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

describe('QueueStaging', () => {
  beforeEach(() => {
    useAnimationStore.getState().clearQueue();
  });

  it('retorna null quando queue está vazia', () => {
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

    // MUI Typography renderiza o texto inteiro, mas getByText com string exata
    // pode falhar se houver quebra de nó. Usamos getByText com função matcher.
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

    // Usa aria-label com a função matcher para encontrar o botão correto
    const removeBtn = screen.getByLabelText('Remover foto1.png');
    fireEvent.click(removeBtn);

    const queue = useAnimationStore.getState().queue;
    expect(queue).toHaveLength(2);
    expect(queue.find((q) => q.id === '1')).toBeUndefined();
    expect(queue[0].id).toBe('2');
    expect(queue[1].id).toBe('3');
  });
});
