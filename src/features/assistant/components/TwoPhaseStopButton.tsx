import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, keyframes } from '@mui/material/styles';
import Stop from '@mui/icons-material/Stop';
import { ICON_SIZE_MD } from '../../../theme/tokens';
import { useLocale } from '../../i18n';

const fadeKeyframes = keyframes`
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
`;

const TIMEOUT_MS = 4000;

interface TwoPhaseStopButtonProps {
  onStop: () => void;
}

/**
 * Botão de parar com two-phase cancellation.
 * Primeiro clique mostra "Clique novamente para interromper".
 * Segundo clique dentro de 4s executa o cancelamento.
 */
export function TwoPhaseStopButton({ onStop }: TwoPhaseStopButtonProps) {
  const { t } = useLocale();
  const [phase, setPhase] = useState<'idle' | 'confirm'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    if (phase === 'idle') {
      setPhase('confirm');
      timeoutRef.current = setTimeout(() => {
        setPhase('idle');
      }, TIMEOUT_MS);
    } else {
      // Segundo clique — executa cancelamento
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setPhase('idle');
      onStop();
    }
  }, [phase, onStop]);

  // Cleanup timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (phase === 'confirm') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          animation: `${fadeKeyframes} 150ms ease-out`,
        }}
      >
        <IconButton
          onClick={handleClick}
          size="small"
          aria-label={t('assistant.stop.confirmAria')}
          sx={{
            color: 'error.main',
            bgcolor: alpha('#ef5350', 0.08),
            '&:hover': { bgcolor: alpha('#ef5350', 0.16) },
            transition: 'all 150ms ease',
          }}
        >
          <Stop sx={{ fontSize: ICON_SIZE_MD }} />
        </IconButton>
        <Typography
          variant="caption"
          sx={{
            color: 'error.main',
            fontWeight: 600,
            fontSize: '0.65rem',
            whiteSpace: 'nowrap',
          }}
        >
          {t('assistant.stop.confirmText')}
        </Typography>
      </Box>
    );
  }

  return (
    <Tooltip title={t('assistant.stop.tooltip')}>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-label={t('assistant.stop.aria')}
        sx={{
          color: 'error.main',
          '&:hover': { backgroundColor: alpha('#ef5350', 0.08) },
        }}
      >
        <Stop sx={{ fontSize: ICON_SIZE_MD }} />
      </IconButton>
    </Tooltip>
  );
}
