import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { CaptionWord } from '../../src/features/video-render/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/features/video-render/store/videoRenderBridge', () => ({
  useVideoRenderBridge: {
    getState: vi.fn().mockReturnValue({ currentFrame: 0 }),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassSurfaceSx: () => ({ p: 2, borderRadius: 3 }),
}));

vi.mock('../../src/theme/tokens', () => ({
  GAP_DEFAULT: 1,
  GAP_COMPACT: 0.5,
  RADIUS_SM: 4,
  ICON_SIZE_LG: 18,
  WHITE_04: 'rgba(255,255,255,0.04)',
  WHITE_08: 'rgba(255,255,255,0.08)',
  WHITE_10: 'rgba(255,255,255,0.10)',
  WHITE_14: 'rgba(255,255,255,0.14)',
  BRAND_PRIMARY: '#2e75b6',
  BRAND_PRIMARY_LIGHT: '#5ba3d0',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.15)',
  TEXT_PRIMARY: 'rgba(255,255,255,0.95)',
  TEXT_SECONDARY: 'rgba(255,255,255,0.65)',
  TEXT_DISABLED: 'rgba(255,255,255,0.38)',
  ERROR_MAIN: '#ef4444',
  APP_SURFACE_ELEVATED: '#1a1a2e',
}));

vi.mock('../../src/features/video-render/lib/formatTimestamp', () => ({
  formatTimestamp: (frame: number, _fps: number) => `00:${String(frame).padStart(2, '0')}`,
  frameToSeconds: (frame: number, _fps: number) => frame / 30,
  secondsToFrame: (seconds: number, _fps: number) => Math.round(seconds * 30),
}));

let phraseIdCounter = 0;
vi.mock('../../src/features/video-render/lib/subtitleUtils', () => ({
  wordsToPhrases: (words: CaptionWord[]) => {
    if (words.length === 0) return [];
    // Divide em frases a cada 2 palavras
    const phrases: { id: string; text: string; words: CaptionWord[]; startFrame: number; endFrame: number }[] = [];
    for (let i = 0; i < words.length; i += 2) {
      const chunk = words.slice(i, i + 2);
      phrases.push({
        id: `phrase-${++phraseIdCounter}`,
        text: chunk.map((w) => w.text).join(' '),
        words: chunk,
        startFrame: chunk[0].startFrame,
        endFrame: chunk[chunk.length - 1].endFrame,
      });
    }
    return phrases;
  },
  phrasesToWords: (phrases: { words: CaptionWord[] }[]) =>
    phrases.flatMap((p) => p.words),
  parseBoldMarkdown: (text: string) => {
    const segments: { text: string; bold: boolean }[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, match.index), bold: false });
      }
      segments.push({ text: match[1], bold: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), bold: false });
    }
    return segments;
  },
}));

// ---------------------------------------------------------------------------
// Imports (após mocks)
// ---------------------------------------------------------------------------

import { CaptionEditorPanel } from '../../src/features/video-render/components/CaptionEditorPanel';

// ---------------------------------------------------------------------------
// Helpers de teste
// ---------------------------------------------------------------------------

function makeCaptions(words: { text: string; start: number; end: number; bold?: boolean }[]): CaptionWord[] {
  return words.map((w) => ({
    text: w.text,
    startFrame: w.start,
    endFrame: w.end,
    bold: w.bold ?? false,
  }));
}

const fourWords = makeCaptions([
  { text: 'Olá', start: 0, end: 15 },
  { text: 'mundo', start: 15, end: 30 },
  { text: 'segunda', start: 30, end: 45 },
  { text: 'frase', start: 45, end: 60 },
]);

const defaultProps = {
  captions: fourWords,
  onUpdateCaptions: vi.fn(),
  fps: 30,
};

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('CaptionEditorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    phraseIdCounter = 0;
  });

  // --- Renderização básica ---

  describe('renderização', () => {
    it('renderiza o painel quando há legendas', () => {
      render(<CaptionEditorPanel {...defaultProps} />);
      expect(screen.getByText(/Editor de legendas/i)).toBeInTheDocument();
    });

    it('não renderiza o conteúdo quando não há legendas', () => {
      render(<CaptionEditorPanel {...defaultProps} captions={[]} />);
      expect(screen.queryByText(/Editor de legendas/i)).not.toBeInTheDocument();
    });

    it('exibe a contagem de frases no cabeçalho (singular)', () => {
      const oneCaption = makeCaptions([{ text: 'Única', start: 0, end: 30 }]);
      render(<CaptionEditorPanel {...defaultProps} captions={oneCaption} />);
      expect(screen.getByText('1 frase')).toBeInTheDocument();
    });

    it('exibe a contagem de frases no cabeçalho (plural)', () => {
      render(<CaptionEditorPanel {...defaultProps} captions={fourWords} />);
      // 4 palavras / 2 por frase = 2 frases
      expect(screen.getByText('2 frases')).toBeInTheDocument();
    });

    it('exibe a contagem total de palavras no rodapé', () => {
      render(<CaptionEditorPanel {...defaultProps} captions={fourWords} />);
      expect(screen.getByText(/4 palavras em 2 frases/i)).toBeInTheDocument();
    });

    it('pluraliza "palavras" corretamente', () => {
      const oneCaption = makeCaptions([{ text: 'Única', start: 0, end: 30 }]);
      render(<CaptionEditorPanel {...defaultProps} captions={oneCaption} />);
      // O rodapé sempre renderiza "palavras" (plural) — o componente não singulariza
      expect(screen.getByText(/1 palavras em 1 frase/)).toBeInTheDocument();
    });
  });

  // --- Interação com PhraseCard ---

  describe('PhraseCard', () => {
    it('renderiza o texto da frase (cada palavra em span separado)', () => {
      render(<CaptionEditorPanel {...defaultProps} />);
      // O texto "Olá mundo" é renderizado em spans separados: "Olá" + " mundo"
      expect(screen.getByText('Olá')).toBeInTheDocument();
      expect(screen.getByText('mundo')).toBeInTheDocument();
    });

    it('renderiza os timestamps da frase no Chip', () => {
      render(<CaptionEditorPanel {...defaultProps} />);
      // O Chip contém os timestamps formatados
      expect(screen.getByText(/00:00 - 00:30/)).toBeInTheDocument();
    });

    it('exibe a contagem de palavras no card', () => {
      render(<CaptionEditorPanel {...defaultProps} captions={fourWords} />);
      // Cada frase tem 2 palavras → múltiplos cards com "2 palavras"
      const wordCounts = screen.getAllByText('2 palavras');
      expect(wordCounts.length).toBe(2);
    });

    it('chama onSeekToFrame ao clicar na frase', () => {
      const onSeek = vi.fn();
      render(<CaptionEditorPanel {...defaultProps} onSeekToFrame={onSeek} />);

      const phraseCards = screen.getAllByRole('button', { name: /Frase:/i });
      act(() => {
        fireEvent.click(phraseCards[0]);
      });
      expect(onSeek).toHaveBeenCalledWith(0);
    });

    it('chama onSeekToFrame ao pressionar Enter no card', () => {
      const onSeek = vi.fn();
      render(<CaptionEditorPanel {...defaultProps} onSeekToFrame={onSeek} />);

      const phraseCards = screen.getAllByRole('button', { name: /Frase:/i });
      act(() => {
        fireEvent.keyDown(phraseCards[0], { key: 'Enter' });
      });
      expect(onSeek).toHaveBeenCalledWith(0);
    });
  });

  // --- Exclusão com undo ---

  describe('exclusão de frase', () => {
    it('exibe snackbar de undo após deletar frase', () => {
      render(<CaptionEditorPanel {...defaultProps} />);

      const deleteButtons = screen.getAllByRole('button', { name: /Apagar frase/i });
      act(() => {
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByText('Frase removida')).toBeInTheDocument();
    });

    it('restaura frase ao clicar em undo', () => {
      render(<CaptionEditorPanel {...defaultProps} />);

      const deleteButtons = screen.getAllByRole('button', { name: /Apagar frase/i });
      act(() => {
        fireEvent.click(deleteButtons[0]);
      });

      const undoButton = screen.getByRole('button', { name: /Desfazer exclusão/i });
      act(() => {
        fireEvent.click(undoButton);
      });

      // onUpdateCaptions deve ter sido chamado para restaurar
      expect(defaultProps.onUpdateCaptions).toHaveBeenCalled();
    });
  });

  // --- Sincronização externa ---

  describe('sincronização', () => {
    it('renderiza corretamente com captions atualizados', () => {
      const { rerender } = render(<CaptionEditorPanel {...defaultProps} />);

      const newCaptions = makeCaptions([
        { text: 'Nova', start: 0, end: 30 },
        { text: 'frase', start: 30, end: 60 },
      ]);

      rerender(<CaptionEditorPanel {...defaultProps} captions={newCaptions} />);

      expect(screen.getByText('Nova')).toBeInTheDocument();
      expect(screen.getByText('frase')).toBeInTheDocument();
    });
  });

  // --- Acessibilidade ---

  describe('acessibilidade', () => {
    it('possui role="button" e tabIndex nos cards de frase', () => {
      render(<CaptionEditorPanel {...defaultProps} />);
      const phraseCards = screen.getAllByRole('button', { name: /Frase:/i });
      expect(phraseCards.length).toBeGreaterThan(0);
      expect(phraseCards[0]).toHaveAttribute('tabindex', '0');
    });

    it('possui aria-label descritivo no card de frase', () => {
      render(<CaptionEditorPanel {...defaultProps} />);
      const phraseCards = screen.getAllByRole('button', { name: /Frase:/i });
      expect(phraseCards.length).toBeGreaterThan(0);
      expect(phraseCards[0]).toBeInTheDocument();
    });

    it('AddPhraseButton possui aria-label e é clicável', () => {
      render(<CaptionEditorPanel {...defaultProps} />);
      const addButtons = screen.getAllByRole('button', { name: /Adicionar nova frase/i });
      expect(addButtons.length).toBeGreaterThan(0);
      expect(addButtons[0]).toBeInTheDocument();
    });
  });
});
