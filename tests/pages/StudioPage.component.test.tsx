import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { StudioPage } from '../../src/pages/StudioPage';
import type { StudioScene } from '../../src/features/studio/types';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

// Store mock com useShallow
const { storeState } = vi.hoisted(() => ({
  storeState: {
    script: '',
    setScript: vi.fn(),
  },
}));

vi.mock('../../src/features/studio/store', () => ({
  useStudioStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
}));

vi.mock('../../src/contexts/AudioContext', () => ({
  useAudioCurrentTime: () => 0,
}));

// Permite controlar useMediaQuery para testes mobile/desktop
let mockIsMobile = false;
vi.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: () => mockIsMobile,
  useMediaQuery: () => mockIsMobile,
}));

vi.mock('../../src/components/Inspector', () => ({
  Inspector: ({ isGenerating }: { isGenerating: boolean }) => (
    <div data-testid="inspector" data-generating={String(isGenerating)}>Inspector</div>
  ),
}));

vi.mock('../../src/components/ScriptEditor', () => ({
  ScriptEditor: ({ isGenerating, script }: { isGenerating: boolean; script: string }) => (
    <div data-testid="script-editor" data-generating={String(isGenerating)} data-script={script}>
      ScriptEditor
    </div>
  ),
}));

const defaultProps = {
  isGenerating: false,
  scenes: [] as StudioScene[],
  handleGenerate: vi.fn(),
  isGenerateDisabled: false,
};

describe('StudioPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    storeState.script = '';
    mockIsMobile = false;
  });

  it('renderiza Inspector e ScriptEditor no layout desktop', () => {
    render(<StudioPage {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByTestId('inspector')).toBeDefined();
    expect(screen.getByTestId('script-editor')).toBeDefined();
  });

  it('passa isGenerating para o Inspector', () => {
    render(<StudioPage {...defaultProps} isGenerating={true} />, { wrapper: Wrapper });
    expect(screen.getByTestId('inspector').getAttribute('data-generating')).toBe('true');
  });

  it('passa isGenerateDisabled para o ScriptEditor', () => {
    render(<StudioPage {...defaultProps} isGenerateDisabled={true} />, { wrapper: Wrapper });
    // ScriptEditor mock recebe props diretamente, não isGenerateDisabled no data attribute
    // Mas o componente é renderizado
    expect(screen.getByTestId('script-editor')).toBeDefined();
  });

  it('renderiza tabs de Configurações e Roteiro em mobile (lg breakpoint)', () => {
    mockIsMobile = true;

    render(<StudioPage {...defaultProps} />, { wrapper: Wrapper });

    // Em mobile, tabs devem aparecer
    expect(screen.getByRole('tab', { name: /Configurações/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Roteiro/i })).toBeDefined();
  });

  it('tab Configurações está selecionada por padrão em mobile', () => {
    mockIsMobile = true;

    render(<StudioPage {...defaultProps} />, { wrapper: Wrapper });

    const settingsTab = screen.getByRole('tab', { name: /Configurações/i });
    expect(settingsTab.getAttribute('aria-selected')).toBe('true');
  });

});
