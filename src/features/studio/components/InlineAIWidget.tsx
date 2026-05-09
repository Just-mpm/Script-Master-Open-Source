import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useInlineAssistant } from '../../../hooks/useInlineAssistant';
import { useLocale } from '../../i18n';
import { BRAND_PRIMARY_GLOW } from '../../../theme/tokens';
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
}

export function InlineAIWidget({ script, setScript, textareaRef, disabled }: InlineAIWidgetProps) {
  const { t } = useLocale();
  const { isProcessing, rewrite } = useInlineAssistant();
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

  const handleClose = useCallback(() => {
    setPopoverAnchor(null);
    setSelectionRange(null);
    setInstruction('');
  }, []);

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
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || disabled || pendingDiff) return;

    const handleInputEnd = (e: MouseEvent | TouchEvent) => {
      // Aguarda um tick para que selectionStart/End sejam atualizados pelo browser
      window.setTimeout(() => {
        const start = el.selectionStart;
        const end = el.selectionEnd;

        // Se houver qualquer texto selecionado (>0), permite ancoragem
        if (start !== end && end - start > 0) {
          setSelectionRange({ start, end });
          setPopoverAnchor(createVirtualElementFromMouse(e));
        }
      }, 0);
    };

    const handleSelectionChange = () => {
      if (document.activeElement !== el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      // Se a seleção foi apagada por ação de teclado, fecha o botão
      if (start === end) {
        handleClose();
      }
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

  return (
    <>
      {/* Popover de Input da IA — ancorado via Virtual Element nas coordenadas do mouse */}
      <Popover
        open={isPopoverOpen}
        anchorEl={popoverAnchor as unknown as HTMLElement}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
        marginThreshold={16}
        slotProps={{
          paper: {
            elevation: 0,
            sx: (theme) => ({
              mt: 1,
              p: 0.5,
              width: 360,
              maxWidth: '90vw',
              borderRadius: 4,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(24px)',
              boxShadow: `0 16px 48px ${alpha(theme.palette.common.black, 0.6)}`,
              border: '1px solid',
              borderColor: alpha(BRAND_PRIMARY_GLOW, 0.2),
            }),
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', px: 1.5, py: 1.5, gap: 1.5 }}>
            <AutoAwesomeIcon sx={{ mt: 0.25, color: 'primary.main', fontSize: 20 }} />
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
                lineHeight: 1.5,
                color: 'text.primary',
                '& input::placeholder, & textarea::placeholder': {
                  color: 'text.secondary',
                  opacity: 0.7
                },
              }}
            />
          </Box>

          <Stack
            direction="row"
            sx={{ 
              px: 1, pb: 0.5, pt: 0,
              justifyContent: isMobile ? 'flex-end' : 'space-between',
              alignItems: 'center'
            }}
          >
            {!isMobile && (
              <Box sx={{ fontSize: '0.65rem', color: 'text.disabled', px: 1 }}>
                <span style={{ fontWeight: 600 }}>Enter</span> p/ enviar • <span style={{ fontWeight: 600 }}>Shift+Enter</span> p/ pular linha
              </Box>
            )}

            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                onClick={handleClose}
                disabled={isProcessing}
                sx={{
                  minWidth: 0,
                  borderRadius: 6,
                  px: 1.5,
                  py: 0.5,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                Cancelar
              </Button>
              <Button
                size="small"
                variant={instruction.trim() ? "contained" : "text"}
                onClick={() => void handleSubmit()}
                disabled={!instruction.trim() || isProcessing}
                startIcon={isProcessing ? <CircularProgress size={14} color="inherit" /> : null}
                sx={(theme) => ({
                  minWidth: 0,
                  borderRadius: 6,
                  px: 2,
                  py: 0.5,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  ...(instruction.trim() && {
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                  }),
                  ...(!instruction.trim() && {
                    color: 'text.disabled',
                  }),
                })}
              >
                {isProcessing ? t('studio.scriptEditor.inlineAI.processing') : 'Gerar'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Popover>

      {/* Balão de Diff Premium (Floating Action Pill) */}
      {pendingDiff && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={(theme) => ({
            alignItems: 'center',
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1400,
            bgcolor: alpha(theme.palette.background.paper, 0.75),
            backdropFilter: 'blur(16px)',
            p: 0.5,
            pr: 1,
            borderRadius: 8,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`,
            border: '1px solid',
            borderColor: alpha(BRAND_PRIMARY_GLOW, 0.3),
            animation: 'slideUpPill 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '@keyframes slideUpPill': {
              from: { opacity: 0, transform: 'translate(-50%, 16px)' },
              to: { opacity: 1, transform: 'translate(-50%, 0)' },
            },
          })}
        >
          <Box sx={{ pl: 1.5, pr: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <AutoAwesomeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Box sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.primary', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              Sugestão Aplicada
            </Box>
          </Box>

          <Box sx={{ width: '1px', height: 16, bgcolor: 'divider', mx: 0.5 }} />

          <Button
            size="small"
            onClick={handleKeep}
            sx={(theme) => ({
              minWidth: 0,
              borderRadius: 6,
              px: 1.5,
              py: 0.5,
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: theme.palette.success.light || '#4ade80',
              '&:hover': { bgcolor: alpha(theme.palette.success.main || '#4ade80', 0.1) }
            })}
          >
            {t('studio.scriptEditor.inlineAI.keepButton')}
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={handleRevert}
            sx={{
              minWidth: 0,
              borderRadius: 6,
              px: 1.5,
              py: 0.5,
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover', color: 'error.light' }
            }}
          >
            {t('studio.scriptEditor.inlineAI.revertButton')}
          </Button>
        </Stack>
      )}
    </>
  );
}
