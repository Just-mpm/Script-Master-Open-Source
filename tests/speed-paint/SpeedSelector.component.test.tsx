import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { SpeedSelector } from '../../src/features/speed-paint/components/SpeedSelector';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

describe('SpeedSelector', () => {
  const SPEEDS = [0.25, 0.5, 1, 2, 4, 8];

  it('renderiza todas as opções de velocidade', () => {
    render(<SpeedSelector label="Draw" value={1} onChange={vi.fn()} />, { wrapper: Wrapper });

    for (const speed of SPEEDS) {
      expect(screen.getByText(`${speed}x`)).toBeDefined();
    }
  });

  it('renderiza o label', () => {
    render(<SpeedSelector label="Draw" value={1} onChange={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByText('Draw')).toBeDefined();
  });

  it('chama onChange ao clicar em velocidade diferente', () => {
    const onChange = vi.fn();
    render(<SpeedSelector label="Paint" value={1} onChange={onChange} />, { wrapper: Wrapper });

    const btn4x = screen.getByText('4x');
    fireEvent.click(btn4x);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('chama onChange mesmo clicando na velocidade já selecionada', () => {
    const onChange = vi.fn();
    render(<SpeedSelector label="Draw" value={1} onChange={onChange} />, { wrapper: Wrapper });

    const btn1x = screen.getByText('1x');
    fireEvent.click(btn1x);

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('desabilita todos os botões quando disabled=true', () => {
    render(<SpeedSelector label="Draw" value={1} onChange={vi.fn()} disabled />, { wrapper: Wrapper });

    for (const speed of SPEEDS) {
      const btn = screen.getByText(`${speed}x`).closest('button');
      expect(btn?.disabled).toBe(true);
    }
  });

  it('habilita botões quando disabled=false ou omitido', () => {
    render(<SpeedSelector label="Draw" value={1} onChange={vi.fn()} />, { wrapper: Wrapper });

    const btn2x = screen.getByText('2x').closest('button');
    expect(btn2x?.disabled).toBe(false);
  });

  it('renderiza com variant="inline" por padrão', () => {
    const { container } = render(
      <SpeedSelector label="Draw" value={1} onChange={vi.fn()} />,
      { wrapper: Wrapper },
    );
    expect(container.querySelector('button')).not.toBeNull();
  });

  it('renderiza com variant="panel"', () => {
    const { container } = render(
      <SpeedSelector label="Paint" value={2} onChange={vi.fn()} variant="panel" />,
      { wrapper: Wrapper },
    );
    expect(container.querySelector('button')).not.toBeNull();
  });

  it('tem role="group" no container de botões', () => {
    render(<SpeedSelector label="Draw" value={1} onChange={vi.fn()} />, { wrapper: Wrapper });

    const group = screen.getByRole('group');
    expect(group).toBeDefined();
    // aria-label usa "Velocidade" com V maiúsculo (label já é capitalizado)
    expect(group.getAttribute('aria-label')).toContain('Velocidade');
  });

  it('tem aria-pressed correto no botão selecionado', () => {
    render(<SpeedSelector label="Draw" value={2} onChange={vi.fn()} />, { wrapper: Wrapper });

    const btn2x = screen.getByText('2x').closest('button');
    expect(btn2x?.getAttribute('aria-pressed')).toBe('true');

    const btn1x = screen.getByText('1x').closest('button');
    expect(btn1x?.getAttribute('aria-pressed')).toBe('false');
  });
});
