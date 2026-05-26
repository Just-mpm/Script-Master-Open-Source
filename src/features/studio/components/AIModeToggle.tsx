import { useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale } from '../../i18n';
import { alpha, useTheme } from '@mui/material/styles';
import { BRAND_PRIMARY_GLOW } from '../../../theme/tokens';

interface AIModeToggleProps {
  /** Quando true, o modo IA está ativo (aguardando seleção) */
  isActive: boolean;
  /** Callback para alternar o modo IA */
  onToggle: (active: boolean) => void;
  /** Função para verificar se há texto selecionado no momento */
  getHasSelection: () => boolean;
  /** Callback para forçar abertura do popover quando há seleção */
  onActivateWithSelection: () => void;
  disabled?: boolean;
}

/**
 * Botão de ativação do modo IA com orb animado multicamadas.
 *
 * Comportamento:
 * - Clique no botão sem seleção: ativa modo "aguardando" (orb pulsa)
 * - Clique no botão com seleção: abre popover direto
 * - Seleção enquanto modo ativo: abre popover
 * - Clique fora ou Escape: desativa modo
 */
export function AIModeToggle({
  isActive,
  onToggle,
  getHasSelection,
  onActivateWithSelection,
  disabled,
}: AIModeToggleProps) {
  const { t } = useLocale();
  const theme = useTheme();

  const handleClick = useCallback(() => {
    if (disabled) return;

    if (isActive) {
      onToggle(false);
    } else if (getHasSelection()) {
      onToggle(true);
      onActivateWithSelection();
    } else {
      onToggle(true);
    }
  }, [isActive, getHasSelection, disabled, onToggle, onActivateWithSelection]);

  // Tooltip dinâmico: diferente quando ativo (instrui a selecionar texto)
  const tooltipTitle = isActive
    ? t('studio.scriptEditor.aiMode.tooltipActive')
    : t('studio.scriptEditor.aiMode.activate');

  return (
    <Tooltip title={tooltipTitle} arrow placement="top">
      <Box
        component={motion.button}
        onClick={handleClick}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.04 }}
        whileTap={{ scale: disabled ? 1 : 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.6 }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderRadius: 3,
          minWidth: 0,
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          backgroundColor: isActive
            ? alpha(BRAND_PRIMARY_GLOW, 0.18)
            : alpha(theme.palette.common.white, 0.04),
          outline: '1px solid',
          outlineColor: isActive
            ? alpha(BRAND_PRIMARY_GLOW, 0.4)
            : alpha(theme.palette.common.white, 0.06),
          outlineOffset: '-1px',
          transition: 'background-color 0.25s ease, outline-color 0.25s ease',
          opacity: disabled ? 0.4 : 1,
          '&:hover': {
            backgroundColor: isActive
              ? alpha(BRAND_PRIMARY_GLOW, 0.26)
              : alpha(theme.palette.common.white, 0.08),
            outlineColor: isActive
              ? alpha(BRAND_PRIMARY_GLOW, 0.55)
              : alpha(theme.palette.common.white, 0.12),
          },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: '2px',
          },
        }}
      >
        <Orb isActive={isActive} />

        <Typography
          variant="caption"
          sx={{
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'primary.light' : 'text.secondary',
            whiteSpace: 'nowrap',
            display: { xs: 'none', sm: 'inline' },
            letterSpacing: '0.04em',
            transition: 'color 0.25s ease, font-weight 0.2s ease',
            userSelect: 'none',
          }}
        >
          {t('studio.scriptEditor.aiMode.buttonLabel')}
        </Typography>
      </Box>
    </Tooltip>
  );
}

/**
 * Orb multicamadas com efeito "lava lamp" via blur + contrast.
 *
 * Arquitetura:
 * - Container externo com `filter: blur() contrast()` para fundir os blobs
 * - 2 gradientes cônicos rotacionando em velocidades diferentes
 * - Centro escuro sólido para profundidade
 * - Glow externo pulsante quando ativo
 */
function Orb({ isActive }: { isActive: boolean }) {
  const orbSize = 28;
  const coreSize = 14;

  return (
    <Box
      sx={{
        width: orbSize,
        height: orbSize,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Container de blobs com filter para efeito lava lamp */}
      <Box
        sx={{
          position: 'absolute',
          inset: -2,
          filter: isActive ? 'blur(4px) contrast(1.4)' : 'blur(5px) contrast(1.1)',
          transition: 'filter 0.4s ease',
          overflow: 'hidden',
          borderRadius: '50%',
        }}
      >
        {/* Camada 1: gradiente cônico principal (rotação rápida quando ativo) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: isActive ? 3 : 12,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: isActive
              ? `conic-gradient(from 0deg,
                  #818cf8 0deg,
                  #c084fc 72deg,
                  #f472b6 144deg,
                  #fb923c 216deg,
                  #818cf8 288deg,
                  #818cf8 360deg)`
              : `conic-gradient(from 0deg,
                  #6366f1 0deg,
                  #8b5cf6 120deg,
                  #6366f1 240deg,
                  #6366f1 360deg)`,
          }}
        />

        {/* Camada 2: gradiente secundário em contra-rotação (só quando ativo) */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7, rotate: -360 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.3 },
                rotate: { duration: 5, repeat: Infinity, ease: 'linear' },
              }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                background: `conic-gradient(from 180deg,
                  #f472b6 0deg,
                  #818cf8 120deg,
                  #c084fc 240deg,
                  #f472b6 360deg)`,
              }}
            />
          )}
        </AnimatePresence>
      </Box>

      {/* Centro escuro — cria profundidade e "abre" o orb */}
      <Box
        sx={{
          width: coreSize,
          height: coreSize,
          borderRadius: '50%',
          backgroundColor: 'background.paper',
          position: 'relative',
          zIndex: 2,
          boxShadow: isActive
            ? `inset 0 0 4px ${alpha('#818cf8', 0.3)}, 0 0 8px ${alpha('#818cf8', 0.5)}`
            : `inset 0 0 3px ${alpha('#0a0a0f', 0.6)}`,
          transition: 'box-shadow 0.4s ease',
        }}
      />

      {/* Glow externo pulsante (apenas quando ativo) */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              boxShadow: `0 0 16px 3px ${alpha('#818cf8', 0.35)}`,
              animation: 'orbPulse 2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes orbPulse {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.08);
          }
        }
      `}</style>
    </Box>
  );
}
