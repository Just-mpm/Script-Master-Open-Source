import { useState, useEffect, useCallback, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import { alpha, keyframes } from '@mui/material/styles';
import { useLocale } from '../../../features/i18n';
import { BRAND_PRIMARY, SHADOW_DEEP } from '../../../theme/tokens';

const pulseAnimation = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
`;

interface ScrollToBottomFabProps {
  /** Ref do container scrollável (o Box com overflowY: auto) */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Quando true, mostra badge animado de "streaming" */
  isStreaming?: boolean;
}

/** Margem em px para considerar "no final" do scroll */
const BOTTOM_THRESHOLD = 100;

/**
 * FAB que aparece quando o usuário scrolla para cima no chat.
 * Faz scroll suave até o final ao ser clicado.
 * Usa ResizeObserver + scroll listener para detectar mudanças de conteúdo.
 */
export function ScrollToBottomFab({ containerRef, isStreaming }: ScrollToBottomFabProps) {
  const { t } = useLocale();
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkIfAtBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < BOTTOM_THRESHOLD);
    };

    // Scroll listener
    container.addEventListener('scroll', checkIfAtBottom, { passive: true });

    // ResizeObserver — detecta quando conteúdo cresce (streaming, novas mensagens)
    const resizeObserver = new ResizeObserver(checkIfAtBottom);
    resizeObserver.observe(container);

    // Verifica estado inicial
    checkIfAtBottom();

    return () => {
      container.removeEventListener('scroll', checkIfAtBottom);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  const handleClick = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [containerRef]);

  return (
    <Zoom in={!isAtBottom}>
        <Box sx={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'flex-end', pr: 2, zIndex: 3 }}>
          <Fab
            size="small"
            onClick={handleClick}
            aria-label={t('assistant.messages.scrollToBottom')}
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: `0 4px 16px ${alpha(SHADOW_DEEP, 0.2)}`,
              '&:hover': {
                bgcolor: 'background.paper',
                boxShadow: `0 6px 24px ${alpha(SHADOW_DEEP, 0.3)}`,
              },
            }}
          >
            <KeyboardArrowDown />
            {isStreaming ? (
              <Box
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: BRAND_PRIMARY,
                  animation: `${pulseAnimation} 1.2s ease-in-out infinite`,
                }}
              />
            ) : null}
          </Fab>
        </Box>
    </Zoom>
  );
}
