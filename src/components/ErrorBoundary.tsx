import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import Refresh from '@mui/icons-material/Refresh';
import { createLogger } from '../lib/logger';
import {
  APP_BORDER,
  WHITE_05,
  WHITE_015,
  SHADOW_DEEP,
  ERROR_GLOW,
} from '../theme/tokens';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

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
          sx={{
            maxWidth: 440,
            p: { xs: 4, sm: 5 },
            textAlign: 'center',
            borderRadius: { xs: 3, md: 4 },
            border: `1px solid ${APP_BORDER}`,
            backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
            backdropFilter: { xs: 'blur(14px)', md: 'blur(22px)' },
            boxShadow: `0 24px 80px ${alpha(SHADOW_DEEP, 0.55)}`,
          }}
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
              Algo deu errado
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Ocorreu um erro inesperado ao renderizar esta página.
              Tente recarregar para continuar.
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                onClick={this.handleRetry}
                startIcon={<Refresh />}
                sx={{ transition: 'background-color 0.2s ease, color 0.2s ease' }}
              >
                Tentar novamente
              </Button>
              <Button
                variant="contained"
                onClick={this.handleReload}
                sx={{ transition: 'box-shadow 0.2s ease' }}
              >
                Recarregar página
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }
}
