import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PageLayout } from '../../../src/components/public/PageLayout';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

vi.mock('../../../src/components/public/PublicHeader', () => ({
  PublicHeader: () => <header data-testid="public-header">Header</header>,
}));

vi.mock('../../../src/components/public/PublicFooter', () => ({
  PublicFooter: () => <footer data-testid="public-footer">Footer</footer>,
}));

vi.mock('../../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
}));

describe('PageLayout', () => {
  it('renderiza o PublicHeader', () => {
    render(
      <PageLayout>
        <p>Conteúdo</p>
      </PageLayout>,
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId('public-header')).toBeDefined();
  });

  it('renderiza o PublicFooter', () => {
    render(
      <PageLayout>
        <p>Conteúdo</p>
      </PageLayout>,
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId('public-footer')).toBeDefined();
  });

  it('renderiza os children dentro da main', () => {
    render(
      <PageLayout>
        <p>Conteúdo de teste</p>
      </PageLayout>,
      { wrapper: Wrapper }
    );
    expect(screen.getByText('Conteúdo de teste')).toBeDefined();
    expect(screen.getByRole('main')).toBeDefined();
  });

  it('main tem id="main-content" para skip-to-content', () => {
    render(
      <PageLayout>
        <p>Conteúdo</p>
      </PageLayout>,
      { wrapper: Wrapper }
    );
    expect(screen.getByRole('main').id).toBe('main-content');
  });

  it('renderiza link skip-to-content "Pular para o conteúdo"', () => {
    render(
      <PageLayout>
        <p>Conteúdo</p>
      </PageLayout>,
      { wrapper: Wrapper }
    );
    const skipLink = screen.getByText('Pular para o conteúdo');
    expect(skipLink).toBeDefined();
    const anchor = skipLink.closest('a');
    expect(anchor?.getAttribute('href')).toBe('#main-content');
  });
});
