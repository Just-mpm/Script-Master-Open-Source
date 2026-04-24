import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Collapse from '@mui/material/Collapse';
import Fade from '@mui/material/Fade';
import Box from '@mui/material/Box';

import { getResolutionFromRatio } from '../lib/videoUtils';
import { DEFAULT_SUBTITLE_STYLE } from '../types';
import type { SubtitleStyle, SubtitlePosition } from '../types';
import type { SceneRatio } from '../../studio/types';

import { clamp, calculatePreviewBottom } from './subtitle-editor/utils';
import { DRAG_SNAP, BASE_PADDING_BOTTOM, FONT_SIZE_STEP, MIN_FONT_SIZE, MAX_FONT_SIZE } from './subtitle-editor/constants';
import { EditorToolbar } from './subtitle-editor/EditorToolbar';
import { EditorButton } from './subtitle-editor/EditorButton';
import { SubtitlePreview } from './subtitle-editor/SubtitlePreview';
import { DragOverlay } from './subtitle-editor/DragOverlay';

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
  /** Posição vertical da legenda (default: 'bottom') */
  subtitlePosition?: SubtitlePosition;
  /** Callback quando a posição vertical muda */
  onSubtitlePositionChange?: (value: SubtitlePosition) => void;
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
  subtitlePosition = 'bottom',
  onSubtitlePositionChange,
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

  // Limites dinâmicos com margem de 10% em relação ao fundo e ao topo
  const margin = Math.round(compositionHeight * 0.1);
  const minOffset = margin - BASE_PADDING_BOTTOM;
  const maxOffset = compositionHeight - margin - BASE_PADDING_BOTTOM;
  const limitsRef = useRef({ min: minOffset, max: maxOffset });
  useEffect(() => {
    limitsRef.current = { min: minOffset, max: maxOffset };
  }, [minOffset, maxOffset]);

  // Sincroniza editingStyle se subtitleStyle mudar externamente (edge case)
  useEffect(() => {
    if (!isEditing) {
      setEditingStyle(subtitleStyle);
    }
  }, [subtitleStyle, isEditing]);

  // --- Modo edição ---

  const enterEditMode = useCallback(() => {
    setEditingStyle({
      ...subtitleStyle,
      verticalOffset: clamp(subtitleStyle.verticalOffset, limitsRef.current.min, limitsRef.current.max),
    });
    setIsEditing(true);
  }, [subtitleStyle]);

  const handleConfirm = useCallback(() => {
    onSubtitleStyleChange(editingStyle);
    setIsEditing(false);
  }, [editingStyle, onSubtitleStyleChange]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleReset = useCallback(() => {
    setEditingStyle({ ...DEFAULT_SUBTITLE_STYLE });
  }, []);

  // --- Posição vertical (alteração imediata — sem precisar confirmar) ---

  const handlePositionChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, value: string | null) => {
      if (value !== null && onSubtitlePositionChange) {
        onSubtitlePositionChange(value as SubtitlePosition);
      }
    },
    [onSubtitlePositionChange],
  );

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
        verticalOffset: clamp(value as number, limitsRef.current.min, limitsRef.current.max),
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
      dragStartOffset.current = editingStyle.verticalOffset;

      const handleDragMove = (moveEvent: MouseEvent): void => {
        if (!isDragging.current) return;

        const container = containerRef.current;
        if (!container) return;

        const scaleY = compositionHeight / container.clientHeight;
        const deltaOffset = -(moveEvent.clientY - dragStartY.current) * scaleY;
        const raw = dragStartOffset.current + deltaOffset;
        const snapped = Math.round(raw / DRAG_SNAP) * DRAG_SNAP;
        const clamped = clamp(snapped, limitsRef.current.min, limitsRef.current.max);

        setEditingStyle((prev) => ({ ...prev, verticalOffset: clamped }));
      };

      const handleDragEnd = (): void => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        dragCleanupRef.current = null;
      };

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

  // --- Cálculos do preview CSS ---

  const containerSize = useContainerSize(containerRef, isEditing);
  const scale = containerSize.width > 0 ? containerSize.width / compositionWidth : 1;
  const previewBottom = calculatePreviewBottom(
    editingStyle.verticalOffset,
    compositionHeight,
    containerSize.height,
  );

  // --- State do hint de drag ---

  const [showDragHint, setShowDragHint] = useState(false);
  const dragHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const dismissDragHint = useCallback(() => {
    setShowDragHint(false);
    if (dragHintTimerRef.current) {
      clearTimeout(dragHintTimerRef.current);
    }
  }, []);

  // --- Renderização ---

  const usePortal = Boolean(toolbarPortal?.current);

  // Sem captions → renderiza apenas o preview sem overlay
  if (!hasCaptions) {
    return <>{children}</>;
  }

  // Toolbar com animação — Collapse no portal ou Fade no overlay
  const toolbar = (
    <EditorToolbar
      editingStyle={editingStyle}
      subtitlePosition={subtitlePosition}
      minOffset={minOffset}
      maxOffset={maxOffset}
      usePortal={usePortal}
      onFontDecrease={handleFontDecrease}
      onFontIncrease={handleFontIncrease}
      onPositionChange={handlePositionChange}
      onOpacityChange={handleOpacityChange}
      onVerticalOffsetChange={handleVerticalOffsetChange}
      onReset={handleReset}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  const toolbarAnimated = usePortal
    ? <Collapse in={isEditing} timeout={300}>{toolbar}</Collapse>
    : <Fade in={isEditing} timeout={300}>{toolbar}</Fade>;

  // Renderiza via portal ou inline
  const portalTarget = toolbarPortal?.current;
  const toolbarElement = usePortal && portalTarget
    ? createPortal(toolbarAnimated, portalTarget)
    : toolbarAnimated;

  return (
    <Box ref={containerRef} sx={{ position: 'relative', lineHeight: 0 }}>
      {children}

      {/* Botão "Editar legenda" */}
      <EditorButton visible={!isEditing} onClick={enterEditMode} />

      {/* Preview CSS da legenda */}
      <SubtitlePreview
        editingStyle={editingStyle}
        scale={scale}
        previewBottom={previewBottom}
        visible={isEditing}
      />

      {/* Overlay de drag */}
      <DragOverlay
        visible={isEditing}
        showDragHint={showDragHint}
        onDragStart={handleDragStart}
        onDragHintDismiss={dismissDragHint}
      />

      {/* Toolbar — via portal ou inline */}
      {toolbarElement}
    </Box>
  );
}

// Re-exportar subcomponentes para consumo externo se necessário
export { EditorToolbar } from './subtitle-editor/EditorToolbar';
export { EditorButton } from './subtitle-editor/EditorButton';
export { FontSizeControls } from './subtitle-editor/FontSizeControls';
export { PositionToggle } from './subtitle-editor/PositionToggle';
export { StyleSlider } from './subtitle-editor/StyleSlider';
export { SubtitlePreview } from './subtitle-editor/SubtitlePreview';
export { DragOverlay } from './subtitle-editor/DragOverlay';
export { clamp, calculatePreviewBottom } from './subtitle-editor/utils';
