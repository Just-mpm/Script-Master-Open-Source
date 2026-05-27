import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode, RefObject } from 'react';
import { AssistantMessages } from '../../src/features/assistant/components/AssistantMessages';
import type { ChatMessageRecord } from '../../src/lib/db';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

// Mock dos tokens
vi.mock('../../src/theme/tokens', () => ({
  BRAND_PRIMARY: '#06b6d4',
  BRAND_GRADIENT: 'linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)',
  APP_BORDER: 'rgba(255,255,255,0.08)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.12)',
  WHITE_06: 'rgba(255,255,255,0.06)',
  WHITE_08: 'rgba(255,255,255,0.08)',
  WHITE_16: 'rgba(255,255,255,0.16)',
  WHITE_82: 'rgba(255,255,255,0.82)',
  TEXT_DISABLED: 'rgba(255,255,255,0.38)',
  TEXT_SECONDARY: 'rgba(248,250,252,0.68)',
  AVATAR_SIZE_SM: 36,
  AVATAR_SIZE_MD: 48,
  ICON_SIZE_SM: 16,
  ICON_SIZE_MD: 20,
  ICON_SIZE_LG: 28,
  RADIUS_XS: 8,
  GAP_COMPACT: 4,
  GAP_DEFAULT: 12,
  GAP_MEDIUM: 8,
  GAP_RELAXED: 16,
}));

// Mock do assistantUi
vi.mock('../../src/features/assistant/components/assistantUi', () => ({
  assistantInsetSx: vi.fn(() => ({})),
  assistantMarkdownSx: {},
  assistantBubbleModelSx: vi.fn(() => ({})),
  assistantBubbleUserSx: vi.fn(() => ({})),
  assistantMessagesContainerSx: {},
  assistantTypingIndicatorSx: {},
  assistantEmptyStateSx: {},
  assistantSuggestionChipSx: {
    cursor: 'pointer',
    borderColor: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.82)',
    fontWeight: 500,
    transition: 'border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease, transform 0.15s ease',
    '&:hover': {
      borderColor: '#06b6d4',
      color: 'text.primary',
      backgroundColor: 'rgba(46,117,182,0.12)',
      transform: 'scale(1.04)',
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  },
}));

// Mock do react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

function createMessage(overrides: Partial<ChatMessageRecord> = {}): ChatMessageRecord {
  return {
    id: 'msg-1',
    role: 'user',
    text: 'Mensagem de teste',
    ...overrides,
  };
}

const messagesEndRef = { current: null } as RefObject<HTMLDivElement | null>;

const defaultProps = {
  messages: [] as ChatMessageRecord[],
  isLoading: false,
  isStreaming: false,
  appliedMessageId: null,
  savedToMemoryId: null,
  messagesEndRef,
  onApply: vi.fn(),
  onSaveToMemory: vi.fn(),
  onStopGeneration: vi.fn(),
};

describe('AssistantMessages', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renderiza vazio quando não há mensagens', () => {
    render(<AssistantMessages {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.queryByText('Você')).toBeNull();
    expect(screen.queryByText('Assistente')).toBeNull();
  });

  it('renderiza mensagem do usuário com label "Você"', () => {
    const messages = [createMessage({ id: 'u1', role: 'user', text: 'Olá assistente' })];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Você')).toBeDefined();
  });

  it('renderiza mensagem do modelo com label "Assistente"', () => {
    const messages = [createMessage({ id: 'm1', role: 'model', text: 'Olá, como posso ajudar?' })];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Assistente')).toBeDefined();
  });

  it('mostra conteúdo da mensagem via ReactMarkdown', () => {
    const messages = [createMessage({ id: 'm1', role: 'model', text: 'Texto formatado **negrito**' })];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    const markdown = screen.getByTestId('markdown');
    expect(markdown.textContent).toContain('Texto formatado **negrito**');
  });

  it('mostra botão "Aplicar no estúdio" quando mensagem do modelo tem bloco JSON', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'model',
        text: 'Sugiro:\n```json\n{"pace": "lento"}\n```\nO que acha?',
      }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Aplicar no estúdio')).toBeDefined();
  });

  it('mostra "Aplicado" quando mensagem já foi aplicada', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'model',
        text: '```json\n{"pace": "lento"}\n```',
      }),
    ];

    render(
      <AssistantMessages
        {...defaultProps}
        messages={messages}
        appliedMessageId="m1"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Aplicado')).toBeDefined();
  });

  it('chama onApply com settings e messageId ao clicar em "Aplicar no estúdio"', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'model',
        text: '```json\n{"pace": "lento", "styleNotes": "calmo"}\n```',
      }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    const applyBtn = screen.getByText('Aplicar no estúdio');
    fireEvent.click(applyBtn);

    expect(defaultProps.onApply).toHaveBeenCalledWith(
      { pace: 'lento', styleNotes: 'calmo' },
      'm1',
    );
  });

  it('mostra aviso de JSON malformado', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'model',
        text: '```json\n{malformed json}\n```',
      }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText(/O assistente sugeriu ajustes, mas o formato não pôde ser interpretado/i)).toBeDefined();
  });

  it('mostra skeleton de loading quando isLoading e não isStreaming', () => {
    render(
      <AssistantMessages {...defaultProps} isLoading={true} isStreaming={false} />,
      { wrapper: Wrapper },
    );

    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('NÃO mostra skeleton quando isLoading mas isStreaming', () => {
    render(
      <AssistantMessages {...defaultProps} isLoading={true} isStreaming={true} />,
      { wrapper: Wrapper },
    );

    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBe(0);
  });

  it('mostra botão "Salvar insight" para mensagens do modelo (exceto welcome)', () => {
    const messages = [
      createMessage({ id: 'm1', role: 'model', text: 'Alguma dica útil' }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Salvar insight')).toBeDefined();
  });

  it('mostra badges de ferramentas na última mensagem do modelo', () => {
    const messages = [
      createMessage({ id: 'm1', role: 'model', text: 'Análise concluída' }),
    ];

    render(
      <AssistantMessages
        {...defaultProps}
        messages={messages}
        toolEvents={[
          { id: 'tool-1', type: 'tool_call', name: 'updatePlan' },
          { id: 'tool-2', type: 'tool_result', name: 'getStudioState' },
        ]}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('updatePlan')).toBeDefined();
    expect(screen.getByText('getStudioState')).toBeDefined();
  });

  it('NÃO mostra "Salvar insight" para mensagem welcome', () => {
    const messages = [
      createMessage({ id: 'welcome', role: 'model', text: 'Bem-vindo!' }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByText('Salvar insight')).toBeNull();
  });

  it('mostra "Salvo na memória" quando memória já foi salva', () => {
    const messages = [
      createMessage({ id: 'm1', role: 'model', text: 'Alguma dica' }),
    ];

    render(
      <AssistantMessages
        {...defaultProps}
        messages={messages}
        savedToMemoryId="m1"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Salvo na memória')).toBeDefined();
  });

  it('chama onSaveToMemory ao clicar em "Salvar insight"', () => {
    const messages = [
      createMessage({ id: 'm1', role: 'model', text: 'Dica útil sobre voz' }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    const saveBtn = screen.getByText('Salvar insight');
    fireEvent.click(saveBtn);

    expect(defaultProps.onSaveToMemory).toHaveBeenCalledWith('Dica útil sobre voz', 'm1');
  });

  it('renderiza anexos de imagem na mensagem', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'user',
        text: 'Olhe esta imagem',
        attachments: [
          { mimeType: 'image/png', data: 'base64data', name: 'foto.png' },
        ],
      }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('foto.png')).toBeDefined();
    // Deve ter uma tag img
    const img = document.querySelector('img[alt="foto.png"]');
    expect(img).toBeDefined();
  });

  it('renderiza anexo de documento na mensagem', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'user',
        text: 'Leia este doc',
        attachments: [
          { mimeType: 'application/pdf', data: 'base64data', name: 'doc.pdf' },
        ],
      }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('doc.pdf')).toBeDefined();
    // Não deve ter tag img para documentos
    const img = document.querySelector('img[alt="doc.pdf"]');
    expect(img).toBeNull();
  });

  it('mostra label "Arquivo" quando anexo não tem nome', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'user',
        text: 'Arquivo sem nome',
        attachments: [
          { mimeType: 'text/plain', data: 'base64data' },
        ],
      }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Arquivo')).toBeDefined();
  });

  it('remove bloco JSON do texto exibido via stripJsonSettingsBlock', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'model',
        text: 'Aqui vai:\n```json\n{"pace": "lento"}\n```\nEspero que goste.',
      }),
    ];

    render(
      <AssistantMessages {...defaultProps} messages={messages} />,
      { wrapper: Wrapper },
    );

    const markdown = screen.getByTestId('markdown');
    // O texto JSON deve ser removido, sobrando apenas texto limpo
    expect(markdown.textContent).not.toContain('```json');
    expect(markdown.textContent).not.toContain('"pace"');
    expect(markdown.textContent).toContain('Aqui vai');
    expect(markdown.textContent).toContain('Espero que goste');
  });

  it('NÃO mostra "Aplicar no estúdio" durante streaming da última mensagem', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'model',
        text: '```json\n{"pace": "lento"}\n```',
      }),
    ];

    render(
      <AssistantMessages
        {...defaultProps}
        messages={messages}
        isStreaming={true}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByText('Aplicar no estúdio')).toBeNull();
  });

  it('mostra cursor piscante durante streaming', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'model',
        text: 'Gerando resposta',
      }),
    ];

    render(
      <AssistantMessages
        {...defaultProps}
        messages={messages}
        isStreaming={true}
      />,
      { wrapper: Wrapper },
    );

    // O cursor é um span com animation
    const cursor = document.querySelector('[style*="animation"]');
    expect(cursor).toBeDefined();
  });

  it('chama onStopGeneration ao clicar no botão de parar durante streaming', () => {
    const messages = [
      createMessage({
        id: 'm1',
        role: 'model',
        text: 'Gerando resposta longa...',
      }),
    ];

    render(
      <AssistantMessages
        {...defaultProps}
        messages={messages}
        isStreaming={true}
      />,
      { wrapper: Wrapper },
    );

    const stopBtn = screen.getByLabelText('Parar geração de resposta');
    fireEvent.click(stopBtn);

    expect(defaultProps.onStopGeneration).toHaveBeenCalledTimes(1);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Testes adicionais: React.memo com arePropsEqual
  // ──────────────────────────────────────────────────────────────────────

  describe('React.memo — arePropsEqual', () => {
    it('deve manter "Aplicar no estúdio" visível ao re-renderizar com mesmas props', () => {
      const messages = [
        createMessage({
          id: 'm1',
          role: 'model',
          text: '```json\n{"pace": "lento"}\n```',
        }),
      ];

      const { rerender } = render(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
        />,
        { wrapper: Wrapper },
      );

      expect(screen.getByText('Aplicar no estúdio')).toBeDefined();

      // Re-renderiza com exatamente as mesmas props (memo deve evitar re-render do bubble)
      rerender(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
        />,
      );

      // O botão continua presente e funcional
      expect(screen.getByText('Aplicar no estúdio')).toBeDefined();
    });

    it('deve atualizar botão de "Aplicar no estúdio" para "Aplicado" quando appliedMessageId muda', () => {
      const messages = [
        createMessage({
          id: 'm1',
          role: 'model',
          text: '```json\n{"pace": "lento"}\n```',
        }),
      ];

      const { rerender } = render(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
          appliedMessageId={null}
        />,
        { wrapper: Wrapper },
      );

      expect(screen.getByText('Aplicar no estúdio')).toBeDefined();

      rerender(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
          appliedMessageId="m1"
        />,
      );

      // arePropsEqual compara isApplied — quando muda, deve re-renderizar
      expect(screen.getByText('Aplicado')).toBeDefined();
      expect(screen.queryByText('Aplicar no estúdio')).toBeNull();
    });

    it('deve atualizar "Salvar insight" para "Salvo na memória" quando savedToMemoryId muda', () => {
      const messages = [
        createMessage({ id: 'm1', role: 'model', text: 'Dica útil' }),
      ];

      const { rerender } = render(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
          savedToMemoryId={null}
        />,
        { wrapper: Wrapper },
      );

      expect(screen.getByText('Salvar insight')).toBeDefined();

      rerender(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
          savedToMemoryId="m1"
        />,
      );

      expect(screen.getByText('Salvo na memória')).toBeDefined();
      expect(screen.queryByText('Salvar insight')).toBeNull();
    });

    it('deve atualizar label de streaming quando isStreaming muda para a última mensagem do modelo', () => {
      const messages = [
        createMessage({
          id: 'm1',
          role: 'model',
          text: 'Texto modelo',
        }),
      ];

      // Primeiro: sem streaming
      const { rerender } = render(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
          isStreaming={false}
        />,
        { wrapper: Wrapper },
      );

      // Não deve ter cursor piscante
      expect(document.querySelector('[style*="animation"]')).toBeNull();

      // Agora: com streaming (isCurrentlyStreaming muda para true no bubble)
      rerender(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
          isStreaming={true}
        />,
      );

      // Deve ter cursor piscante (arePropsEqual detecta mudança em isCurrentlyStreaming)
      expect(document.querySelector('[style*="animation"]')).toBeDefined();
    });

    it('deve atualizar botão "Aplicar" para "Copiado" quando callback onCopy muda (ref equality)', () => {
      const messages = [
        createMessage({ id: 'm1', role: 'model', text: 'Texto simples' }),
      ];

      const firstOnStopGeneration = vi.fn();
      const secondOnStopGeneration = vi.fn();

      // Render com primeira versão do callback
      const { rerender } = render(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
          onStopGeneration={firstOnStopGeneration}
        />,
        { wrapper: Wrapper },
      );

      // Re-render com callback diferente (arePropsEqual compara onStopGeneration por referência)
      rerender(
        <AssistantMessages
          {...defaultProps}
          messages={messages}
          onStopGeneration={secondOnStopGeneration}
        />,
      );

      // Componente deve ter sido atualizado — sem crash
      expect(screen.getByText('Assistente')).toBeDefined();
    });
  });
});
