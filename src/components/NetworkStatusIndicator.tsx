import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import WifiOff from '@mui/icons-material/WifiOff';
import { ICON_SIZE_SM, GAP_COMPACT, ERROR_BG_MEDIUM } from '../theme/tokens';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Indicador discreto de status de conexão.
 * Aparece apenas quando o usuário está offline — chip no Header.
 */
export function NetworkStatusIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <Tooltip title="Você está offline. Algumas funções podem não estar disponíveis.">
      <Typography
        component="span"
        role="status"
        aria-live="polite"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: GAP_COMPACT,
          px: 1.5,
          py: 0.5,
          borderRadius: 6,
          bgcolor: ERROR_BG_MEDIUM,
          color: 'error.main',
          fontSize: '0.75rem',
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          cursor: 'default',
        }}
      >
        <WifiOff
          sx={{ fontSize: ICON_SIZE_SM, animation: 'pulse 2s ease-in-out infinite' }}
          aria-hidden="true"
        />
        Offline
      </Typography>
    </Tooltip>
  );
}
