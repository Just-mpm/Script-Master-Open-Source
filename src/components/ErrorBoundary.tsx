import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import Refresh from '@mui/icons-material/Refresh';
import { createLogger } from '../lib/logger';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

const log = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
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
          variant="outlined"
          sx={{
            maxWidth: 440,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <ErrorOutlineOutlined
              sx={{ fontSize: 48, color: 'error.main' }}
              aria-hidden="true"
            />

            <Typography variant="h5" component="h1">
              Algo deu errado
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Ocorreu um erro inesperado ao renderizar esta página.
              Tente recarregar para continuar.
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                onClick={this.handleRetry}
                startIcon={<Refresh />}
              >
                Tentar novamente
              </Button>
              <Button
                variant="contained"
                onClick={this.handleReload}
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
