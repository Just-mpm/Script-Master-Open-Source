import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

import {
  TOOLBAR_CONTAINER_PORTAL_SX,
  TOOLBAR_CONTAINER_INLINE_SX,
  TOOLBAR_CONTAINER_SHARED_SX,
  TOOLBAR_DIVIDER_SX,
  MIN_OPACITY,
  MAX_OPACITY,
  OPACITY_STEP,
  DRAG_SNAP,
} from './constants';
import { FontSizeControls } from './FontSizeControls';
import { PositionToggle } from './PositionToggle';
import { StyleSlider } from './StyleSlider';
import { ToolbarActions } from './ToolbarActions';
import type { SubtitleStyle, SubtitlePosition } from '../../types';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface EditorToolbarProps {
  /** Estilo sendo editado (state local) */
  editingStyle: SubtitleStyle;
  /** Posição vertical da legenda */
  subtitlePosition: SubtitlePosition;
  /** Offset mínimo para slider vertical */
  minOffset: number;
  /** Offset máximo para slider vertical */
  maxOffset: number;
  /** Se true, a toolbar é renderizada via portal (layout fluxo normal) */
  usePortal: boolean;
  /** Callbacks */
  onFontDecrease: () => void;
  onFontIncrease: () => void;
  onPositionChange: (_: React.MouseEvent<HTMLElement>, value: string | null) => void;
  onOpacityChange: (_: Event, value: number | number[]) => void;
  onVerticalOffsetChange: (_: Event, value: number | number[]) => void;
  onReset: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Toolbar principal do editor de legendas — compõe todos os grupos de controles.
 */
export function EditorToolbar({
  editingStyle,
  subtitlePosition,
  minOffset,
  maxOffset,
  usePortal,
  onFontDecrease,
  onFontIncrease,
  onPositionChange,
  onOpacityChange,
  onVerticalOffsetChange,
  onReset,
  onConfirm,
  onCancel,
}: EditorToolbarProps) {
  return (
    <Box
      sx={{
        ...(usePortal ? TOOLBAR_CONTAINER_PORTAL_SX : TOOLBAR_CONTAINER_INLINE_SX),
        zIndex: usePortal ? 'auto' : 12,
        ...TOOLBAR_CONTAINER_SHARED_SX,
        pointerEvents: usePortal ? 'auto' : undefined,
      }}
    >
      {/* ── Grupo: Tamanho da fonte ── */}
      <FontSizeControls
        fontSize={editingStyle.fontSize}
        onDecrease={onFontDecrease}
        onIncrease={onFontIncrease}
      />

      <Divider orientation="vertical" flexItem sx={TOOLBAR_DIVIDER_SX} />

      {/* ── Grupo: Posição (bottom/center/top) ── */}
      <PositionToggle position={subtitlePosition} onChange={onPositionChange} />

      <Divider orientation="vertical" flexItem sx={TOOLBAR_DIVIDER_SX} />

      {/* ── Grupo: Opacidade do fundo ── */}
      <StyleSlider
        label="Fundo"
        value={editingStyle.backgroundOpacity}
        onChange={onOpacityChange}
        min={MIN_OPACITY}
        max={MAX_OPACITY}
        step={OPACITY_STEP}
        sliderWidth={72}
        ariaLabel="Opacidade do fundo da legenda"
      />

      <Divider orientation="vertical" flexItem sx={TOOLBAR_DIVIDER_SX} />

      {/* ── Grupo: Posição vertical — alternativa acessível ao drag ── */}
      <StyleSlider
        label="Posição"
        value={editingStyle.verticalOffset}
        onChange={onVerticalOffsetChange}
        min={minOffset}
        max={maxOffset}
        step={DRAG_SNAP}
        sliderWidth={80}
        ariaLabel="Posição vertical da legenda"
        id="subtitle-vertical-offset"
        isLabel
      />

      <Divider orientation="vertical" flexItem sx={TOOLBAR_DIVIDER_SX} />

      {/* ── Grupo: Ações ── */}
      <ToolbarActions onReset={onReset} onConfirm={onConfirm} onCancel={onCancel} />
    </Box>
  );
}
