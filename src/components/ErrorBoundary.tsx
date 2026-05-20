import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import Refresh from '@mui/icons-material/Refresh';
import { createLogger } from '../lib/logger';
import { glassPanelSx } from '../theme/surfaces';
import { ERROR_GLOW } from '../theme/tokens';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { useLocaleSafe } from '../features/i18n';

const log = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback customizado exibido quando ocorre erro. Se omitido, usa o fallback padrão. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary global para capturar erros de render e impedir
 * que um crash de componente derrube a SPA inteira.
 *
 * Reset automático por rota: ao trocar de página, o componente pai
 * deve passar um `key` diferente (ex: `key={location.pathname}`)
 * para forçar o React a recriar esta instância com estado limpo.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('Erro de render capturado', { error });
    log.error('Stack de componentes', { componentStack: info.componentStack });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Se houver fallback customizado, usá-lo em vez do fallback padrão
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return <ErrorBoundaryFallback onRetry={this.handleRetry} onReload={this.handleReload} />;
  }
}

interface ErrorBoundaryFallbackProps {
  onRetry: () => void;
  onReload: () => void;
}

export function ErrorBoundaryFallback({ onRetry, onReload }: ErrorBoundaryFallbackProps) {
  const { t } = useLocaleSafe();

  return (
    <Box
      sx={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '60dvh',
        p: 3,
      }}
    >
      <Paper
        sx={(theme) => ({
          ...glassPanelSx(theme),
          position: 'static',
          overflow: 'visible',
          maxWidth: 440,
          p: { xs: 4, sm: 5 },
          textAlign: 'center',
        })}
      >
        <Stack spacing={2.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(ERROR_GLOW, 0.3),
              boxShadow: `0 8px 32px ${ERROR_GLOW}`,
            }}
          >
            <ErrorOutlineOutlined
              sx={{ fontSize: 36, color: 'error.main' }}
              aria-hidden="true"
            />
          </Box>

          <Typography variant="h5" component="h1" sx={{ letterSpacing: '-0.025em' }}>
            {t('errorBoundary.title')}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {t('errorBoundary.description')}
          </Typography>

          <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              onClick={onRetry}
              startIcon={<Refresh />}
              sx={{ transition: 'background-color 0.2s ease, color 0.2s ease' }}
            >
              {t('errorBoundary.retryBtn')}
            </Button>
            <Button
              variant="contained"
              onClick={onReload}
              sx={{ transition: 'box-shadow 0.2s ease' }}
            >
              {t('errorBoundary.reloadBtn')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
