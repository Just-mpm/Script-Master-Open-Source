import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Add from '@mui/icons-material/Add';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import OpenWith from '@mui/icons-material/OpenWith';
import Refresh from '@mui/icons-material/Refresh';
import Remove from '@mui/icons-material/Remove';
import Subtitles from '@mui/icons-material/Subtitles';
import Visibility from '@mui/icons-material/Visibility';
import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_LIGHT,
  BRAND_PRIMARY_DARK,
  CYAN_GLOW,
  CYAN_GLOW_SOFT,
  SUCCESS_MAIN,
  ERROR_MAIN,
  TEXT_SECONDARY,
  TEXT_DISABLED,
  APP_SURFACE,
  APP_BORDER,
  ACTION_SELECTED,
  WHITE_04,
  WHITE_05,
  WHITE_06,
  WHITE_08,
  WHITE_10,
  WHITE_14,
  WHITE_22,
  WHITE_50,
  BLACK_40,
  BLACK_50,
  BLACK_55,
  GLASS_BG,
  SHADOW_DEEP,
  RADIUS_CHIP,
} from '../../../theme/tokens';
import { getResolutionFromRatio } from '../lib/videoUtils';
import { DEFAULT_SUBTITLE_STYLE } from '../types';
import type { SubtitleStyle } from '../types';
import type { SceneRatio } from '../../studio/types';

// ---------------------------------------------------------------------------
// Hook: observador de dimensões do container (usado apenas durante edição)
// ---------------------------------------------------------------------------

function useContainerSize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!enabled) {
      setSize({ width: 0, height: 0 });
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Leitura inicial
    setSize({ width: container.clientWidth, height: container.clientHeight });

    // Observa redimensionamentos
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, enabled]);

  return size;
}
// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface SubtitleInlineEditorProps {
  /** Exibe o botão de edição e o overlay apenas quando há legendas */
  hasCaptions: boolean;
  /** Estilo atual das legendas (confirmado pelo pai) */
  subtitleStyle: SubtitleStyle;
  /** Callback chamado UMA VEZ ao confirmar — NÃO durante edição */
  onSubtitleStyleChange: (style: SubtitleStyle) => void;
  /** O VideoPreview (filho) que será envolvido pelo editor */
  children: React.ReactNode;
  /** Proporção da composição — necessária para calcular escala de drag e preview */
  ratio: SceneRatio;
  /** Ref para elemento DOM onde a toolbar deve ser renderizada via portal.
   *  Quando fornecido, a toolbar aparece fora do preview (fluxo normal).
   *  Quando omitido, a toolbar fica dentro do preview (comportamento atual). */
  toolbarPortal?: React.RefObject<HTMLDivElement | null>;
}

// ---------------------------------------------------------------------------
// Estilos compartilhados dos botões da toolbar
// ---------------------------------------------------------------------------

/** Estilo base dos IconButtons da toolbar (size, radius, transição) */
const TOOLBAR_ICON_BTN_BASE = {
  color: TEXT_SECONDARY,
  width: 28,
  height: 28,
  borderRadius: 2,
  transition: 'all 0.15s ease',
  '&:active': {
    transform: 'scale(0.88)',
  },
} as const;

// ---------------------------------------------------------------------------
// Limites
// ---------------------------------------------------------------------------

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 48;
const FONT_SIZE_STEP = 2;
const MIN_OPACITY = 0;
const MAX_OPACITY = 1;
const OPACITY_STEP = 0.05;
const MIN_VERTICAL_OFFSET = -300;
const MAX_VERTICAL_OFFSET = 300;
const DRAG_SNAP = 5; // Arredonda para múltiplos de 5

// ---------------------------------------------------------------------------
// Constantes do preview CSS
// ---------------------------------------------------------------------------

/** Padding base do SubtitleOverlay para position='bottom' */
const BASE_PADDING_BOTTOM = 40;

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/** Clamp numérico simples */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calcula o `bottom` em pixels de tela para o preview CSS.
 *
 * No Remotion: offsetPadding = BASE_PADDING_BOTTOM + verticalOffset
 * Isso é padding-bottom no espaço da composição (ex: 1920×1080).
 * No preview, convertemos para pixels de tela usando a escala do container.
 */
function calculatePreviewBottom(
  verticalOffset: number,
  compositionHeight: number,
  displayHeight: number,
): number {
  if (displayHeight <= 0 || compositionHeight <= 0) return 0;
  const offsetPadding = BASE_PADDING_BOTTOM + verticalOffset;
  const scale = displayHeight / compositionHeight;
  return Math.max(0, offsetPadding * scale);
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function SubtitleInlineEditor({
  hasCaptions,
  subtitleStyle,
  onSubtitleStyleChange,
  children,
  ratio,
  toolbarPortal,
}: SubtitleInlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  // State local durante edição — ZERO impacto no Remotion Player
  const [editingStyle, setEditingStyle] = useState<SubtitleStyle>(subtitleStyle);

  // Refs para drag — não usam state para evitar re-renders durante o arrasto
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  // Cleanup dos listeners de drag para evitar memory leak ao desmontar
  const dragCleanupRef = useRef<(() => void) | null>(null);

  // Limpa listeners de drag pendurados ao desmontar
  useEffect(() => {
    return () => { dragCleanupRef.current?.(); };
  }, []);

  // Altura da composição (ex: 1080 para 16:9)
  const compositionHeight = getResolutionFromRatio(ratio).height;
  const compositionWidth = getResolutionFromRatio(ratio).width;

  // Sincroniza editingStyle se subtitleStyle mudar externamente (edge case)
  useEffect(() => {
    if (!isEditing) {
      setEditingStyle(subtitleStyle);
    }
  }, [subtitleStyle, isEditing]);

  // --- Modo edição ---

  const enterEditMode = useCallback(() => {
    setEditingStyle({ ...subtitleStyle });
    setIsEditing(true);
  }, [subtitleStyle]);

  const handleConfirm = useCallback(() => {
    onSubtitleStyleChange(editingStyle);
    setIsEditing(false);
  }, [editingStyle, onSubtitleStyleChange]);

  const handleCancel = useCallback(() => {
    // Não chama onSubtitleStyleChange — o estilo do pai nunca foi modificado
    setIsEditing(false);
  }, []);

  const handleReset = useCallback(() => {
    setEditingStyle({ ...DEFAULT_SUBTITLE_STYLE });
  }, []);

  // --- Fonte size (atualiza state local) ---

  const handleFontDecrease = useCallback(() => {
    setEditingStyle((prev) => ({
      ...prev,
      fontSize: clamp(prev.fontSize - FONT_SIZE_STEP, MIN_FONT_SIZE, MAX_FONT_SIZE),
    }));
  }, []);

  const handleFontIncrease = useCallback(() => {
    setEditingStyle((prev) => ({
      ...prev,
      fontSize: clamp(prev.fontSize + FONT_SIZE_STEP, MIN_FONT_SIZE, MAX_FONT_SIZE),
    }));
  }, []);

  // --- Opacity (atualiza state local) ---

  const handleOpacityChange = useCallback(
    (_: Event, value: number | number[]) => {
      setEditingStyle((prev) => ({
        ...prev,
        backgroundOpacity: value as number,
      }));
    },
    [],
  );

  // --- Offset vertical via slider (acessibilidade — alternativa ao drag) ---

  const handleVerticalOffsetChange = useCallback(
    (_: Event, value: number | number[]) => {
      setEditingStyle((prev) => ({
        ...prev,
        verticalOffset: value as number,
      }));
    },
    [],
  );

  // --- Drag vertical (atualiza state local) ---

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      dragStartY.current = e.clientY;
      // Lê o offset atual do editingStyle (mais recente possível via ref)
      dragStartOffset.current = editingStyle.verticalOffset;

      const handleDragMove = (moveEvent: MouseEvent): void => {
        if (!isDragging.current) return;

        const container = containerRef.current;
        if (!container) return;

        // Escala de pixels de tela → espaço da composição
        const scaleY = compositionHeight / container.clientHeight;
        // Inverte Y porque screen Y é de cima pra baixo, mas offset positivo = legenda sobe
        const deltaOffset = -(moveEvent.clientY - dragStartY.current) * scaleY;
        const raw = dragStartOffset.current + deltaOffset;
        // Arredonda para múltiplos de 5 para precisão e suavidade
        const snapped = Math.round(raw / DRAG_SNAP) * DRAG_SNAP;
        const clamped = clamp(snapped, MIN_VERTICAL_OFFSET, MAX_VERTICAL_OFFSET);

        setEditingStyle((prev) => ({ ...prev, verticalOffset: clamped }));
      };

      const handleDragEnd = (): void => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        dragCleanupRef.current = null;
      };

      // Armazena cleanup para uso no unmount (memory leak prevention)
      const cleanup = (): void => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        dragCleanupRef.current = null;
      };
      dragCleanupRef.current = cleanup;

      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    },
    [compositionHeight, editingStyle.verticalOffset],
  );

  // --- Atalho Escape ---

  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, handleCancel]);

  // --- Cálculos do preview CSS (dimensões via ResizeObserver, não refs) ---

  const containerSize = useContainerSize(containerRef, isEditing);
  const scale = containerSize.width > 0 ? containerSize.width / compositionWidth : 1;
  const previewBottom = calculatePreviewBottom(
    editingStyle.verticalOffset,
    compositionHeight,
    containerSize.height,
  );

  // --- State do hint de drag (desaparece após 2s ou no primeiro drag) ---

  const [showDragHint, setShowDragHint] = useState(false);
  const dragHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mostra o hint ao entrar no modo edição
  useEffect(() => {
    if (isEditing) {
      setShowDragHint(true);
      dragHintTimerRef.current = setTimeout(() => {
        setShowDragHint(false);
      }, 2000);
    }
    return () => {
      if (dragHintTimerRef.current) {
        clearTimeout(dragHintTimerRef.current);
      }
    };
  }, [isEditing]);

  // Oculta o hint no primeiro drag
  const dismissDragHint = useCallback(() => {
    setShowDragHint(false);
    if (dragHintTimerRef.current) {
      clearTimeout(dragHintTimerRef.current);
    }
  }, []);

  // --- Renderização ---

  // Determina se a toolbar deve sair do preview via portal
  const usePortal = Boolean(toolbarPortal?.current);

  // Sem captions → renderiza apenas o preview sem overlay
  if (!hasCaptions) {
    return <>{children}</>;
  }

  // --- JSX da toolbar (reutilizado com posicionamento condicional) ---
  const toolbarJsx = (
    <Box
      sx={{
        // Quando portal: fluxo normal, centrada horizontalmente
        // Quando dentro do overlay: absoluta no topo do preview
        ...(usePortal
          ? {
              justifyContent: 'center',
              py: 1.5,
            }
          : {
              position: 'absolute' as const,
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
            }),
        zIndex: usePortal ? 'auto' : 12,
        // Estilos comuns da toolbar
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        // Glass consistente com o tema do app
        backgroundColor: GLASS_BG,
        backgroundImage: `linear-gradient(180deg, ${WHITE_04} 0%, ${WHITE_05} 100%)`,
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderRadius: 4,
        border: `1px solid ${APP_BORDER}`,
        boxShadow: `0 12px 40px ${SHADOW_DEEP}, 0 0 0 1px rgba(0, 0, 0, 0.2)`,
        // No portal, precisa de pointerEvents próprio (não herda do overlay)
        pointerEvents: usePortal ? 'auto' : undefined,
      }}
    >
      {/* ── Grupo: Tamanho da fonte ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <Tooltip title="Diminuir tamanho" placement="top" arrow describeChild>
          <IconButton
            size="small"
            aria-label="Diminuir tamanho da fonte"
            onClick={handleFontDecrease}
            sx={{
              ...TOOLBAR_ICON_BTN_BASE,
              '&:hover': {
                color: BRAND_PRIMARY_LIGHT,
                backgroundColor: ACTION_SELECTED,
              },
            }}
          >
            <Remove sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>

        {/* Chip com o valor do fontSize */}
        <Chip
          label={`${editingStyle.fontSize}`}
          size="small"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
            fontWeight: 500,
            height: 22,
            minWidth: 38,
            color: TEXT_SECONDARY,
            backgroundColor: WHITE_05,
            border: `1px solid ${WHITE_08}`,
            userSelect: 'none',
          }}
        />

        <Tooltip title="Aumentar tamanho" placement="top" arrow describeChild>
          <IconButton
            size="small"
            aria-label="Aumentar tamanho da fonte"
            onClick={handleFontIncrease}
            sx={{
              ...TOOLBAR_ICON_BTN_BASE,
              '&:hover': {
                color: BRAND_PRIMARY_LIGHT,
                backgroundColor: ACTION_SELECTED,
              },
            }}
          >
            <Add sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Divider */}
      <Divider
        orientation="vertical"
        flexItem
        sx={{ borderColor: WHITE_14, mx: 0.25 }}
      />

      {/* ── Grupo: Opacidade do fundo ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            color: TEXT_DISABLED,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          Fundo
        </Typography>
        <Slider
          value={editingStyle.backgroundOpacity}
          onChange={handleOpacityChange}
          min={MIN_OPACITY}
          max={MAX_OPACITY}
          step={OPACITY_STEP}
          size="small"
          aria-label="Opacidade do fundo da legenda"
          sx={{
            width: 72,
            color: BRAND_PRIMARY,
            p: '4px 0',
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12,
              transition: 'box-shadow 0.15s ease',
              '&:hover, &.Mui-focusVisible': {
                boxShadow: `0 0 0 4px ${CYAN_GLOW_SOFT}`,
              },
            },
            '& .MuiSlider-rail': {
              backgroundColor: WHITE_10,
            },
            '& .MuiSlider-track': {
              border: 'none',
            },
          }}
        />
      </Box>

      {/* Divider */}
      <Divider
        orientation="vertical"
        flexItem
        sx={{ borderColor: WHITE_14, mx: 0.25 }}
      />

      {/* ── Grupo: Posição vertical — alternativa acessível ao drag ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            color: TEXT_DISABLED,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          Posição
        </Typography>
        <Slider
          value={editingStyle.verticalOffset}
          onChange={handleVerticalOffsetChange}
          min={MIN_VERTICAL_OFFSET}
          max={MAX_VERTICAL_OFFSET}
          step={DRAG_SNAP}
          size="small"
          aria-label="Posição vertical da legenda"
          sx={{
            width: 80,
            color: BRAND_PRIMARY,
            p: '4px 0',
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12,
              transition: 'box-shadow 0.15s ease',
              '&:hover, &.Mui-focusVisible': {
                boxShadow: `0 0 0 4px ${CYAN_GLOW_SOFT}`,
              },
            },
            '& .MuiSlider-rail': {
              backgroundColor: WHITE_10,
            },
            '& .MuiSlider-track': {
              border: 'none',
            },
          }}
        />
      </Box>

      {/* Divider */}
      <Divider
        orientation="vertical"
        flexItem
        sx={{ borderColor: WHITE_14, mx: 0.25 }}
      />

      {/* ── Grupo: Ações ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        {/* Lembrete visual de drag */}
        <Tooltip title="Arraste sobre o vídeo para mover" placement="top" arrow>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              color: TEXT_DISABLED,
              cursor: 'default',
              transition: 'color 0.15s ease',
            }}
          >
            <OpenWith sx={{ fontSize: 14 }} />
          </Box>
        </Tooltip>

        {/* Reset */}
        <Tooltip title="Restaurar padrão" placement="top" arrow describeChild>
          <IconButton
            size="small"
            aria-label="Restaurar estilo padrão"
            onClick={handleReset}
            sx={{
              ...TOOLBAR_ICON_BTN_BASE,
              transition: 'all 0.2s ease',
              '&:hover': {
                color: WHITE_50,
                backgroundColor: WHITE_06,
                // Micro-rotação ao hover
                '& .MuiSvgIcon-root': {
                  transform: 'rotate(-45deg)',
                },
              },
              '& .MuiSvgIcon-root': {
                transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              },
            }}
          >
            <Refresh sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>

        {/* Confirmar */}
        <Tooltip title="Confirmar" placement="top" arrow describeChild>
          <IconButton
            size="small"
            aria-label="Confirmar alterações"
            onClick={handleConfirm}
            sx={{
              color: SUCCESS_MAIN,
              width: 28,
              height: 28,
              borderRadius: 2,
              backgroundColor: `rgba(16, 185, 129, 0.08)`,
              border: `1px solid rgba(16, 185, 129, 0.18)`,
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: `rgba(16, 185, 129, 0.16)`,
                borderColor: `rgba(16, 185, 129, 0.32)`,
                boxShadow: `0 0 12px rgba(16, 185, 129, 0.2)`,
              },
              '&:active': {
                transform: 'scale(0.88)',
              },
            }}
          >
            <Check sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>

        {/* Cancelar */}
        <Tooltip title="Cancelar (Esc)" placement="top" arrow describeChild>
          <IconButton
            size="small"
            aria-label="Cancelar alterações"
            onClick={handleCancel}
            sx={{
              color: ERROR_MAIN,
              width: 28,
              height: 28,
              borderRadius: 2,
              backgroundColor: `rgba(239, 68, 68, 0.06)`,
              border: `1px solid rgba(239, 68, 68, 0.14)`,
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: `rgba(239, 68, 68, 0.14)`,
                borderColor: `rgba(239, 68, 68, 0.28)`,
                boxShadow: `0 0 12px rgba(239, 68, 68, 0.15)`,
              },
              '&:active': {
                transform: 'scale(0.88)',
              },
            }}
          >
            <Close sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  // Toolbar com animação Fade — renderizada via portal ou inline
  const toolbarWithFade = (
    <Fade in={isEditing} timeout={300}>
      {toolbarJsx}
    </Fade>
  );

  // Renderiza via portal (fora do preview) ou inline (dentro do overlay)
  const portalTarget = toolbarPortal?.current;
  const toolbarElement = usePortal && portalTarget
    ? createPortal(toolbarWithFade, portalTarget)
    : toolbarWithFade;

  return (
    <Box ref={containerRef} sx={{ position: 'relative', lineHeight: 0 }}>
      {children}

      {/* ── Botão "Editar legenda" — visível quando NÃO está editando ── */}
      <Fade in={!isEditing} timeout={200}>
        <Tooltip title="Personalizar posição e estilo da legenda" placement="left" arrow>
          <IconButton
            aria-label="Personalizar legenda"
            onClick={(e) => {
              e.stopPropagation();
              enterEditMode();
            }}
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: 10,
              width: 42,
              height: 42,
              // Fundo glass com brand accent
              backgroundColor: GLASS_BG,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${APP_BORDER}`,
              color: BRAND_PRIMARY,
              // Glow sutil para chamar atenção
              boxShadow: `0 0 16px ${CYAN_GLOW_SOFT}, 0 4px 12px ${BLACK_40}`,
              // Animação de pulso sutil
              animation: 'subtitle-edit-pulse 2.4s ease-in-out infinite',
              '@keyframes subtitle-edit-pulse': {
                '0%, 100%': {
                  boxShadow: `0 0 16px ${CYAN_GLOW_SOFT}, 0 4px 12px ${BLACK_40}`,
                },
                '50%': {
                  boxShadow: `0 0 24px ${CYAN_GLOW}, 0 4px 16px ${BLACK_50}`,
                },
              },
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: APP_SURFACE,
                color: BRAND_PRIMARY_LIGHT,
                boxShadow: `0 0 28px ${CYAN_GLOW}, 0 6px 20px ${BLACK_50}`,
                borderColor: BRAND_PRIMARY_DARK,
              },
              '&:active': {
                transform: 'scale(0.92)',
              },
            }}
          >
            <Subtitles sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>
      </Fade>

      {/* ── Preview CSS da legenda — visível apenas durante edição ── */}
      <Fade in={isEditing} timeout={350}>
        <Box
          sx={{
            position: 'absolute',
            bottom: `${previewBottom}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9,
            pointerEvents: 'none',
            maxWidth: '90%',
            width: 'fit-content',
          }}
        >
          <div
            style={{
              fontSize: `${editingStyle.fontSize * scale}px`,
              fontWeight: 600,
              lineHeight: 1.6,
              textAlign: 'center',
              color: '#ffffff',
              userSelect: 'none',
              padding: `${editingStyle.paddingY * scale}px ${editingStyle.paddingX * scale}px`,
              borderRadius: `${editingStyle.borderRadius * scale}px`,
              backgroundColor: `rgba(0, 0, 0, ${editingStyle.backgroundOpacity})`,
              boxShadow: `0 0 ${40 * scale}px ${20 * scale}px rgba(0, 0, 0, ${editingStyle.backgroundOpacity * 0.8})`,
              // Outline sutil com glow cyan em vez de dashed
              border: `1.5px solid ${CYAN_GLOW_SOFT}`,
              outline: `1px solid rgba(34, 211, 238, 0.15)`,
              outlineOffset: '3px',
              // Transição suave
              transition: 'border-color 0.2s ease, outline-color 0.2s ease',
            }}
          >
            Editar o estilo das legendas
          </div>
          {/* Label "Preview" sobre a legenda */}
          <Box
            sx={{
              position: 'absolute',
              top: -(8 * scale) - 18,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: `${RADIUS_CHIP}px`,
              backgroundColor: BLACK_55,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${WHITE_08}`,
            }}
          >
            <Visibility sx={{ fontSize: 12, color: TEXT_SECONDARY }} />
            <Typography
              variant="caption"
              sx={{
                color: TEXT_SECONDARY,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Preview
            </Typography>
          </Box>
        </Box>
      </Fade>

      {/* ── Overlay de drag — visível quando está editando (SEM a toolbar) ── */}
      <Fade in={isEditing} timeout={300}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 8,
            // overlay não bloqueia interação — apenas a área de drag interna
            pointerEvents: 'none',
          }}
        >
          {/* Área de drag sobre todo o preview */}
          <Box
            onMouseDown={(e) => {
              dismissDragHint();
              handleDragStart(e);
            }}
            sx={{
              position: 'absolute',
              inset: 0,
              cursor: 'grab',
              // Apenas esta área captura eventos de mouse (restante do overlay é pass-through)
              pointerEvents: 'auto',
              // Border sutil com cantos arredondados
              borderRadius: 'inherit',
              border: `1.5px solid ${WHITE_10}`,
              transition: 'border-color 0.2s ease, cursor 0.15s ease',
              '&:hover': {
                borderColor: WHITE_22,
              },
              '&:active': {
                cursor: 'grabbing',
                borderColor: BRAND_PRIMARY_DARK,
              },
            }}
          />

          {/* Hint de drag — aparece brevemente ao entrar no modo edição */}
          <Fade in={showDragHint} timeout={400}>
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: `${RADIUS_CHIP}px`,
                backgroundColor: `rgba(0, 0, 0, 0.72)`,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${APP_BORDER}`,
                boxShadow: `0 4px 16px rgba(0, 0, 0, 0.4)`,
                zIndex: 9,
                pointerEvents: 'none',
              }}
            >
              <OpenWith sx={{ fontSize: 16, color: BRAND_PRIMARY }} />
              <Typography
                variant="caption"
                sx={{
                  color: TEXT_SECONDARY,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 11,
                  letterSpacing: '0.3px',
                }}
              >
                Arraste para mover a legenda
              </Typography>
            </Box>
          </Fade>
        </Box>
      </Fade>

      {/* ── Toolbar — via portal (fora do preview) ou inline (fallback) ── */}
      {toolbarElement}
    </Box>
  );
}
