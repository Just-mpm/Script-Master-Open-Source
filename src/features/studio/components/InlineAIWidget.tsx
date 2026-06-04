import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import Fade from '@mui/material/Fade';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useInlineAssistant } from '../../../hooks/useInlineAssistant';
import { useLocale } from '../../i18n';
import { CreditBlockedMessage } from '../../../components/CreditBlockedMessage';
import { BRAND_PRIMARY, BRAND_PRIMARY_GLOW, RADIUS_SM, RADIUS_XS } from '../../../theme/tokens';
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Interface de Virtual Element exigida pelo MUI Popover (anchorEl pode ser um objeto fake)
interface VirtualElement {
  getBoundingClientRect: () => DOMRect;
  nodeType: number;
}

interface PendingDiff {
  startIndex: number;
  oldLength: number;
  newLength: number;
  oldText: string;
  newText: string;
}

interface InlineAIWidgetProps {
  script: string;
  setScript: (newScript: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  /** Indica se o botão AIModeToggle está ativo (modo aguardando seleção) */
  aiModeActive?: boolean;
  /** Callback para desativar o modo AI (quando usuário clica fora ou Escape) */
  onAIModeDeactivate?: () => void;
  /** Callback para o InlineAIWidget informar que pode abrir na posição do cursor */
  onRegisterForceOpen?: (fn: () => void) => void;
}

export function InlineAIWidget({
  script,
  setScript,
  textareaRef,
  disabled,
  aiModeActive = false,
  onAIModeDeactivate,
  onRegisterForceOpen,
}: InlineAIWidgetProps) {
  const { t } = useLocale();
  const { isProcessing, rewrite, stopProcessing, creditsExhausted } = useInlineAssistant();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Guarda se há texto selecionado (start/end no value do textarea)
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  // Virtual Element: objeto fake que o MUI usa para ancorar o Popover em coordenadas absolutas
  const [popoverAnchor, setPopoverAnchor] = useState<VirtualElement | null>(null);

  // Estado do Diff
  const [pendingDiff, setPendingDiff] = useState<PendingDiff | null>(null);

  // Input de comando
  const [instruction, setInstruction] = useState('');

  // Refs para valores que o listener de selectionchange precisa acessar
  // sem causar re-renders do effect
  const popoverAnchorRef = useRef<VirtualElement | null>(null);
  const aiModeActiveRef = useRef(aiModeActive);

  // Sincroniza refs com state
  useEffect(() => {
    popoverAnchorRef.current = popoverAnchor;
  }, [popoverAnchor]);

  useEffect(() => {
    aiModeActiveRef.current = aiModeActive;
  }, [aiModeActive]);

  /**
   * Força a abertura do popover na posição atual do cursor do textarea.
   * Chamado pelo AIModeToggle quando o botão é clicado.
   *
   * Se houver texto selecionado (3+ chars), abre o popover imediatamente.
   * Se não houver seleção suficiente, apenas foca o textarea (o selectionchange listener
   * abrirá o popover quando o usuário selecionar 3+ caracteres).
   */
  const forceOpenAtCursor = useCallback(() => {
    const el = textareaRef.current;
    if (!el || disabled) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectionLength = end - start;

    // Foca o textarea para que o usuário possa selecionar texto
    el.focus();

    if (selectionLength >= 3) {
      // Já tem seleção suficiente: abre o popover imediatamente
      const rect = el.getBoundingClientRect();
      const virtualElement: VirtualElement = {
        nodeType: 1,
        getBoundingClientRect: () => ({
          top: rect.top + rect.height * 0.3,
          left: rect.left + rect.width / 2,
          bottom: rect.top + rect.height * 0.3,
          right: rect.left + rect.width / 2,
          width: 0,
          height: 0,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height * 0.3,
          toJSON: () => ({}),
        }),
      };
      setSelectionRange({ start, end });
      setPopoverAnchor(virtualElement);
    }
    // Se não tem seleção suficiente, o selectionchange listener cuidará de abrir quando selecionar 3+ chars
  }, [textareaRef, disabled]);

  const handleClose = useCallback(() => {
    if (isProcessing) {
      stopProcessing();
    }
    setPopoverAnchor(null);
    setSelectionRange(null);
    setInstruction('');
    // Notifica o AIModeToggle que o modo AI foi desativado
    if (aiModeActive && onAIModeDeactivate) {
      onAIModeDeactivate();
    }
  }, [isProcessing, stopProcessing, aiModeActive, onAIModeDeactivate]);

  // Expõe forceOpenAtCursor para o pai via onRegisterForceOpen
  useEffect(() => {
    if (onRegisterForceOpen) {
      onRegisterForceOpen(forceOpenAtCursor);
    }
  }, [onRegisterForceOpen, forceOpenAtCursor]);

  // Cria um VirtualElement a partir das coordenadas reais da seleção no textarea.
  // Suporta tanto MouseEvent quanto TouchEvent para funcionar em Mobile e Desktop.
  const createVirtualElementFromMouse = useCallback((e: MouseEvent | TouchEvent): VirtualElement => {
    let clientX = 0;
    let clientY = 0;

    if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const rect = {
      top: clientY,
      left: clientX,
      bottom: clientY,
      right: clientX,
      width: 0,
      height: 0,
      x: clientX,
      y: clientY,
      toJSON: () => ({}),
    } as DOMRect;

    return {
      nodeType: 1,
      getBoundingClientRect: () => rect,
    };
  }, []);

  // Observa seleções no textarea via mouseup (para capturar coords do mouse)
  // e selectionchange (para sincronizar o range com o estado)
  // Quando aiModeActive=true, seleção com 3+ caracteres abre o popover automaticamente
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || disabled || pendingDiff) return;

    const handleInputEnd = (e: MouseEvent | TouchEvent) => {
      // Aguarda um tick para que selectionStart/End sejam atualizados pelo browser
      window.setTimeout(() => {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selectionLength = end - start;

        // Exige mínimo de 3 caracteres para abrir o popover
        if (selectionLength >= 3) {
          setSelectionRange({ start, end });
          setPopoverAnchor(createVirtualElementFromMouse(e));
        }
      }, 0);
    };

    const handleSelectionChange = () => {
      if (document.activeElement !== el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;

      // Se a seleção foi desfeita E o popover estava aberto, fecha tudo
      if (start === end && popoverAnchorRef.current) {
        handleClose();
      }
      // NÃO abre o popover aqui — isso fica para o mouseup/touchend
      // que dispara quando o usuário termina de selecionar
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape ou digitação normal fecha o botão (mas não se o popover de input estiver aberto)
      if (e.key === 'Escape') handleClose();
    };

    el.addEventListener('mouseup', handleInputEnd);
    el.addEventListener('touchend', handleInputEnd);
    document.addEventListener('selectionchange', handleSelectionChange);
    el.addEventListener('keydown', handleKeyDown);
    return () => {
      el.removeEventListener('mouseup', handleInputEnd);
      el.removeEventListener('touchend', handleInputEnd);
      document.removeEventListener('selectionchange', handleSelectionChange);
      el.removeEventListener('keydown', handleKeyDown);
    };
  }, [textareaRef, disabled, pendingDiff, handleClose, createVirtualElementFromMouse]);

  const handleSubmit = async () => {
    if (!selectionRange || !instruction.trim()) return;

    const selectedText = script.substring(selectionRange.start, selectionRange.end);
    const newText = await rewrite(selectedText, instruction, script);

    if (newText) {
      setPendingDiff({
        startIndex: selectionRange.start,
        oldLength: selectedText.length,
        newLength: newText.length,
        oldText: selectedText,
        newText: newText,
      });
      const updatedScript =
        script.substring(0, selectionRange.start) +
        newText +
        script.substring(selectionRange.end);
      setScript(updatedScript);

      // Mantém o texto gerado selecionado nativamente no textarea para o usuário visualizar o diff
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            selectionRange.start,
            selectionRange.start + newText.length
          );
        }
      });
    }

    // Fecha o popover de input após gerar
    setPopoverAnchor(null);
    setSelectionRange(null);
    setInstruction('');
  };

  const handleKeep = () => {
    setPendingDiff(null);
    if (textareaRef.current) {
      // Remove a seleção ao aceitar
      textareaRef.current.setSelectionRange(
        textareaRef.current.selectionEnd,
        textareaRef.current.selectionEnd
      );
      textareaRef.current.focus();
    }
  };

  const handleRevert = () => {
    if (!pendingDiff) return;
    const reverted =
      script.substring(0, pendingDiff.startIndex) +
      pendingDiff.oldText +
      script.substring(pendingDiff.startIndex + pendingDiff.newLength);
    setScript(reverted);
    setPendingDiff(null);

    // Restaura a seleção do texto original
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          pendingDiff.startIndex,
          pendingDiff.startIndex + pendingDiff.oldText.length
        );
      }
    });
  };

  // Garante que se o textarea perder o foco e depois voltar, e houver pendingDiff, a seleção é mantida
  useEffect(() => {
    if (!pendingDiff || !textareaRef.current) return;
    const el = textareaRef.current;

    const handleFocus = () => {
      if (pendingDiff) {
        el.setSelectionRange(
          pendingDiff.startIndex,
          pendingDiff.startIndex + pendingDiff.newLength
        );
      }
    };

    el.addEventListener('focus', handleFocus);
    return () => el.removeEventListener('focus', handleFocus);
  }, [pendingDiff, textareaRef]);

  // Verifica se o popover de input está aberto (para não fechar ao clicar no botão)
  const isPopoverOpen = Boolean(popoverAnchor) && Boolean(selectionRange);

  // Tecla de atalho para submit (⌘ no Mac, Ctrl no resto)
  const submitKey = navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl';

  return (
    <>
      <CreditBlockedMessage show={creditsExhausted} />

      {/* Popover de Input da IA — ancorado via Virtual Element nas coordenadas do mouse */}
      <Popover
        open={isPopoverOpen}
        anchorEl={popoverAnchor as unknown as HTMLElement }
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
        marginThreshold={16}
        slots={{ transition: Fade }}
        slotProps={{
          transition: { timeout: 200 },
          paper: {
            elevation: 0,
            sx: (theme) => ({
              mt: 1,
              p: 0,
              width: 380,
              maxWidth: '92vw',
              borderRadius: RADIUS_SM,
              overflow: 'hidden',
              bgcolor: alpha(theme.palette.background.paper, 0.82),
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.55)}, 0 0 0 1px ${alpha(BRAND_PRIMARY_GLOW, 0.15)}`,
              border: '1px solid',
              borderColor: alpha(theme.palette.common.white, 0.08),
              ...theme.applyStyles('dark', {
                backgroundImage: 'none',
              }),
            }),
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header: ícone + input */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', px: 2, pt: 2, pb: 1.5, gap: 1.5 }}>
            <Box
              sx={{
                mt: 0.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${alpha(BRAND_PRIMARY, 0.2)} 0%, ${alpha('#818cf8', 0.2)} 100%)`,
                flexShrink: 0,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 14, color: 'primary.light' }} />
            </Box>
            <InputBase
              autoFocus
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder={t('studio.scriptEditor.inlineAI.inputPlaceholder')}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                  e.preventDefault();
                  void handleSubmit();
                }
                if (e.key === 'Escape') handleClose();
              }}
              sx={{
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'text.primary',
                '& textarea': {
                  py: 0.25,
                },
                '& textarea::placeholder': {
                  color: 'text.disabled',
                  opacity: 1,
                },
              }}
            />
          </Box>

          {/* Footer: keyboard hints + botões de ação */}
          <Stack
            direction="row"
            sx={{
              px: 1.5,
              pb: 1.5,
              pt: 0.5,
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid',
              borderColor: alpha(theme.palette.common.white, 0.06),
              mt: 0.5,
            }}
          >
            {/* Keyboard hints (desktop only) */}
            {!isMobile && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pl: 0.5 }}>
                <KbdHint>{submitKey} ↵</KbdHint>
                <Box sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
                  {t('studio.scriptEditor.inlineAI.keyboardHintSubmit')}
                </Box>
                <Box sx={{ width: 1, height: 10, bgcolor: 'divider', mx: 0.25 }} />
                <KbdHint>⇧ ↵</KbdHint>
                <Box sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
                  {t('studio.scriptEditor.inlineAI.keyboardHintNewline')}
                </Box>
              </Stack>
            )}

            <Stack direction="row" spacing={0.75} sx={{ ml: isMobile ? 'auto' : 0 }}>
              <Button
                size="small"
                onClick={handleClose}
                sx={{
                  minWidth: 0,
                  borderRadius: RADIUS_XS,
                  px: 1.5,
                  py: 0.625,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.white, 0.06),
                  },
                }}
              >
                {isProcessing ? t('common.stop') : t('common.cancelEsc').replace(' (Esc)', '')}
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => void handleSubmit()}
                disabled={!instruction.trim() || isProcessing }
                startIcon={isProcessing ? <CircularProgress size={14} color="inherit" /> : null }
                sx={(theme) => ({
                  minWidth: 0,
                  borderRadius: RADIUS_XS,
                  px: 2,
                  py: 0.625,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.light, 0.9)} 100%)`,
                  boxShadow: instruction.trim()
                    ? `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`
                    : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                  '&:disabled': {
                    backgroundImage: 'none',
                    bgcolor: alpha(theme.palette.common.white, 0.06),
                    color: 'text.disabled',
                    boxShadow: 'none',
                  },
                })}
              >
                {isProcessing
                  ? t('studio.scriptEditor.inlineAI.processing')
                  : t('studio.scriptEditor.inlineAI.generateButton')}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Popover>

      {/* Balão de Diff — Floating Action Pill com spring animation */}
      <AnimatePresence>
        {pendingDiff && (
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 28,
              mass: 0.8,
              opacity: { duration: 0.2 },
            }}
            sx={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1400,
            }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              sx={(theme) => ({
                alignItems: 'center',
                bgcolor: alpha(theme.palette.background.paper, 0.82),
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                p: 0.5,
                pr: 0.75,
                borderRadius: RADIUS_SM,
                boxShadow: `0 12px 40px ${alpha(theme.palette.common.black, 0.45)}, 0 0 0 1px ${alpha(BRAND_PRIMARY_GLOW, 0.2)}`,
                border: '1px solid',
                borderColor: alpha(theme.palette.common.white, 0.08),
              })}
            >
              {/* Label com ícone */}
              <Box sx={{ pl: 1.25, pr: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <AutoAwesomeIcon sx={{ fontSize: 15, color: 'primary.light' }} />
                <Box
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('studio.scriptEditor.inlineAI.suggestionApplied')}
                </Box>
              </Box>

              {/* Divider */}
              <Box sx={{ width: '1px', height: 18, bgcolor: 'divider', mx: 0.25 }} />

              {/* Botão Manter */}
              <Button
                size="small"
                onClick={handleKeep}
                startIcon={<CheckIcon sx={{ fontSize: 15 }} />}
                sx={(theme) => ({
                  minWidth: 0,
                  borderRadius: RADIUS_XS,
                  px: 1.25,
                  py: 0.5,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: theme.palette.success.main,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                  },
                })}
              >
                {t('studio.scriptEditor.inlineAI.keepButton')}
              </Button>

              {/* Botão Reverter */}
              <Button
                size="small"
                color="inherit"
                onClick={handleRevert}
                startIcon={<CloseIcon sx={{ fontSize: 15 }} />}
                sx={{
                  minWidth: 0,
                  borderRadius: RADIUS_XS,
                  px: 1.25,
                  py: 0.5,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'error.light',
                  },
                }}
              >
                {t('studio.scriptEditor.inlineAI.revertButton')}
              </Button>
            </Stack>
          </Box>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Componente inline para estilizar teclas de atalho como <kbd>.
 */
function KbdHint({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="kbd"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        px: 0.625,
        py: 0.25,
        borderRadius: 1,
        border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        bgcolor: alpha(theme.palette.common.white, 0.04),
        fontSize: '0.65rem',
        fontFamily: 'monospace',
        fontWeight: 600,
        color: 'text.disabled',
        lineHeight: 1.4,
        letterSpacing: '0.02em',
      })}
    >
      {children}
    </Box>
  );
}
