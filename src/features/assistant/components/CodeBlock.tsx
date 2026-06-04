import { useCallback, useState, type ReactNode, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Check from '@mui/icons-material/Check';
import ContentCopy from '@mui/icons-material/ContentCopy';
import { alpha } from '@mui/material/styles';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLocale } from '../../../features/i18n';
import { BRAND_PRIMARY, RADIUS_XS, TEXT_DISABLED, TEXT_SECONDARY, BLACK_50 } from '../../../theme/tokens';

// Registro seletivo de linguagens — importa apenas as mais usadas para reduzir bundle
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('xml', markup);
SyntaxHighlighter.registerLanguage('svg', markup);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);
SyntaxHighlighter.registerLanguage('sql', sql);

interface CodeBlockProps {
  className?: string;
  children: ReactNode;
}

/** Estilo base do oneDark com overrides para integrar ao tema do app */
const syntaxTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: '1rem',
    fontSize: '0.8rem',
    lineHeight: 1.6,
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.8rem',
    lineHeight: 1.6,
  },
};

/**
 * Bloco de código customizado para ReactMarkdown.
 * Mostra header com linguagem + botão "Copiar" + syntax highlight com PrismLight.
 */
export function CodeBlock({ className, children }: CodeBlockProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const codeText = String(children).replace(/\n$/, '');
  const language = className?.replace('language-', '') ?? 'text';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = codeText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // Falha total — sem feedback negativo
      }
    }
  }, [codeText]);

  return (
    <Box sx={{ position: 'relative', borderRadius: RADIUS_XS, overflow: 'hidden' }}>
      {/* Header com linguagem + botão copiar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.5,
          bgcolor: '#2d313a',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            fontWeight: 600,
            color: TEXT_SECONDARY,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {language}
        </Typography>

        <Tooltip
          title={copied ? t('assistant.messages.codeCopied') : t('assistant.messages.codeCopy')}
          placement="top"
          open={copied}
          disableFocusListener
          disableHoverListener
          disableTouchListener
        >
          <IconButton
            onClick={handleCopy}
            size="small"
            aria-label={t('assistant.messages.codeCopyAria')}
            sx={{
              color: copied ? 'success.main' : TEXT_DISABLED,
              transition: 'color 0.2s ease',
              '&:hover': {
                color: BRAND_PRIMARY,
                bgcolor: alpha(BRAND_PRIMARY, 0.08),
              },
            }}
          >
            {copied
              ? <Check sx={{ fontSize: 14 }} />
              : <ContentCopy sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Código com syntax highlight */}
      <Box
        sx={{
          '& pre': {
            m: 0,
            borderRadius: 0,
          },
        }}
      >
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          showLineNumbers={codeText.split('\n').length > 5 }
          wrapLongLines
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: BLACK_50,
            padding: '1rem',
          }}
        >
          {codeText}
        </SyntaxHighlighter>
      </Box>
    </Box>
  );
}

/**
 * Wrapper para <pre> no ReactMarkdown.
 * Extrai o <code> filho e delega para CodeBlock.
 * Inline code continua com o comportamento padrão.
 */
export function PreBlock({ children }: { children?: ReactNode }) {
  // O children do <pre> é um único elemento <code>
  const codeElement = children as ReactElement<{
    className?: string;
    children?: ReactNode;
  }> | undefined;

  if (codeElement?.type === 'code' && codeElement.props) {
    return (
      <CodeBlock
        className={codeElement.props.className}
        children={codeElement.props.children}
      />
    );
  }

  // Fallback: renderiza <pre> padrão
  return <pre>{children}</pre>;
}
