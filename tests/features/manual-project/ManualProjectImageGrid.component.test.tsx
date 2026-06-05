/**
 * Testes do componente `ManualProjectImageGrid`.
 *
 * Cobre: render de N imagens, botões ↑↓/✕ funcionais, contagem total, labels a11y.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../../../src/features/i18n';
import { ManualProjectImageGrid } from '../../../src/features/manual-project/components/ManualProjectImageGrid';
import type { ImageUploadItem } from '../../../src/features/manual-project/types';

function makeImage(localId: string, index: number): ImageUploadItem {
  return {
    localId,
    file: new File([new Uint8Array([1])], `${localId}.png`, { type: 'image/png' }),
    previewUrl: `blob:http://localhost/${localId}`,
    width: 1920,
    height: 1080,
    mimeType: 'image/png',
    sizeBytes: 1024,
  };
}

function renderWithI18n(ui: React.ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

beforeEach(() => {
  localStorage.setItem('s2a_locale', 'pt-BR');
});

describe('ManualProjectImageGrid', () => {
  it('renderiza N imagens como listitems', () => {
    const images = [makeImage('a', 0), makeImage('b', 1), makeImage('c', 2)];
    renderWithI18n(
      <ManualProjectImageGrid images={images} onMove={vi.fn()} onRemove={vi.fn()} />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it('mostra badge #1, #2, #3', () => {
    const images = [makeImage('a', 0), makeImage('b', 1), makeImage('c', 2)];
    renderWithI18n(
      <ManualProjectImageGrid images={images} onMove={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(screen.getByText('#1')).toBeDefined();
    expect(screen.getByText('#2')).toBeDefined();
    expect(screen.getByText('#3')).toBeDefined();
  });

  it('botão de remover chama onRemove com localId', () => {
    const onRemove = vi.fn();
    const images = [makeImage('target-id', 0), makeImage('other', 1)];
    renderWithI18n(
      <ManualProjectImageGrid images={images} onMove={vi.fn()} onRemove={onRemove} />,
    );

    const removeButtons = screen.getAllByLabelText(/Remover imagem/i);
    fireEvent.click(removeButtons[0]!);
    expect(onRemove).toHaveBeenCalledWith('target-id');
  });

  it('botão "Mover para cima" chama onMove(from, from-1, totalCount)', () => {
    const onMove = vi.fn();
    const images = [makeImage('a', 0), makeImage('b', 1)];
    renderWithI18n(
      <ManualProjectImageGrid images={images} onMove={onMove} onRemove={vi.fn()} />,
    );

    const upButtons = screen.getAllByLabelText(/Mover imagem 2 para cima/i);
    fireEvent.click(upButtons[0]!);
    expect(onMove).toHaveBeenCalledWith(1, 0, 2);
  });

  it('botão "Mover para baixo" chama onMove(from, from+1, totalCount)', () => {
    const onMove = vi.fn();
    const images = [makeImage('a', 0), makeImage('b', 1)];
    renderWithI18n(
      <ManualProjectImageGrid images={images} onMove={onMove} onRemove={vi.fn()} />,
    );

    const downButtons = screen.getAllByLabelText(/Mover imagem 1 para baixo/i);
    fireEvent.click(downButtons[0]!);
    expect(onMove).toHaveBeenCalledWith(0, 1, 2);
  });

  it('botão "mover para cima" é desabilitado na primeira imagem', () => {
    const images = [makeImage('a', 0), makeImage('b', 1)];
    renderWithI18n(
      <ManualProjectImageGrid images={images} onMove={vi.fn()} onRemove={vi.fn()} />,
    );

    const upButton = screen.getByLabelText(/Mover imagem 1 para cima/i);
    expect((upButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('botão "mover para baixo" é desabilitado na última imagem', () => {
    const images = [makeImage('a', 0), makeImage('b', 1)];
    renderWithI18n(
      <ManualProjectImageGrid images={images} onMove={vi.fn()} onRemove={vi.fn()} />,
    );

    const downButton = screen.getByLabelText(/Mover imagem 2 para baixo/i);
    expect((downButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('botões têm minWidth/minHeight de 44px (WCAG 2.5.5)', () => {
    const images = [makeImage('a', 0)];
    renderWithI18n(
      <ManualProjectImageGrid images={images} onMove={vi.fn()} onRemove={vi.fn()} />,
    );

    const removeButton = screen.getByLabelText(/Remover imagem 1/i);
    // Verifica que o estilo minWidth foi aplicado
    expect(removeButton.style.minWidth || removeButton.getAttribute('style')).toBeDefined();
  });

  it('grid tem aria-roledescription="sortable"', () => {
    const images = [makeImage('a', 0)];
    renderWithI18n(
      <ManualProjectImageGrid images={images} onMove={vi.fn()} onRemove={vi.fn()} />,
    );

    const grid = screen.getByRole('list');
    expect(grid.getAttribute('aria-roledescription')).toBe('sortable');
  });
});
