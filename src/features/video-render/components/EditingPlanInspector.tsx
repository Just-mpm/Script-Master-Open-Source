import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AutoFixHigh from '@mui/icons-material/AutoFixHigh';
import DeleteSweep from '@mui/icons-material/DeleteSweep';
import Image from '@mui/icons-material/Image';
import type { EditingPlan, EditingScene, TransitionType, CameraMovement, VisualEffect } from '../lib/editingPlan';
import { TRANSITION_PRESETS, CAMERA_MOVEMENTS } from '../lib/editingPlan';
import { glassSurfaceSx } from '../../../theme/surfaces';
import {
  GAP_COMPACT,
  GAP_DEFAULT,
  RADIUS_SM,
  RADIUS_CHIP,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  BRAND_PRIMARY_LIGHT,
  BRAND_SECONDARY_LIGHT,
  TEXT_SECONDARY,
  TEXT_DISABLED,
  APP_BORDER,
  WHITE_06,
  WHITE_08,
  WHITE_10,
  WHITE_12,
  WHITE_14,
  BLACK_32,
} from '../../../theme/tokens';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface EditingPlanInspectorProps {
  /** Plano de edição gerado (null se ainda não gerado) */
  editingPlan: EditingPlan | null;
  /** Cenas do studio com URLs de imagem para thumbnails */
  scenes: { imageUrl: string; timestamp: number }[];
  /** Callback para atualizar uma cena específica do plano */
  onUpdateScene: (index: number, updates: Partial<EditingScene>) => void;
  /** Callback para limpar o plano de edição */
  onClearPlan: () => void;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Labels legíveis em pt-BR para tipos de transição */
const TRANSITION_LABELS: Record<TransitionType, string> = {
  fade: 'Fade',
  'slide-left': 'Deslizar →',
  'slide-right': '← Deslizar',
  'slide-up': 'Deslizar ↑',
  zoom: 'Zoom',
  cut: 'Corte',
  dissolve: 'Dissolve',
  wipe: 'Cortina',
};

/** Labels legíveis em pt-BR para movimentos de câmera */
const CAMERA_LABELS: Record<CameraMovement, string> = {
  static: 'Parada',
  'pan-left': 'Pan ←',
  'pan-right': 'Pan →',
  'tilt-up': 'Tilt ↑',
  'tilt-down': 'Tilt ↓',
  'zoom-in': 'Zoom +',
  'zoom-out': 'Zoom -',
  'ken-burns': 'Ken Burns',
};

/** Labels legíveis em pt-BR para efeitos visuais */
const EFFECT_LABELS: Record<VisualEffect, string> = {
  none: 'Nenhum',
  grayscale: 'P&B',
  sepia: 'Sépia',
  blur: 'Desfoque',
  vignette: 'Vinhetagem',
  'brightness-up': 'Brilho +',
  'contrast-up': 'Contraste +',
  saturate: 'Saturação +',
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function EditingPlanInspector({
  editingPlan,
  scenes,
  onUpdateScene,
  onClearPlan,
}: EditingPlanInspectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Estado vazio: plano ainda não gerado
  if (!editingPlan || editingPlan.length === 0) {
    return (
      <Box sx={(theme) => ({ ...glassSurfaceSx(theme), borderRadius: RADIUS_SM, p: { xs: 2.5, md: 3 } })}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: GAP_DEFAULT, mb: 1 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            bgcolor: alpha(BRAND_PRIMARY, 0.12),
          }}>
            <AutoFixHigh sx={{ fontSize: 18, color: BRAND_PRIMARY }} />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Plano de edição
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: TEXT_SECONDARY, ml: '52px' }}>
          Gere um plano de edição para personalizar transições e legendas.
        </Typography>
      </Box>
    );
  }

  const handleConfirmClear = (): void => {
    setConfirmOpen(false);
    onClearPlan();
  };

  const handleDialogClose = (): void => {
    setConfirmOpen(false);
  };

  return (
    <>
    <Box sx={(theme) => ({ ...glassSurfaceSx(theme), borderRadius: RADIUS_SM, overflow: 'hidden' })}>
      {/* Header clicável */}
      <Box
        onClick={() => setIsExpanded(prev => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label="Expandir ou recolher plano de edição"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(prev => !prev); } }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, md: 2.5 },
          py: { xs: 1.5, md: 2 },
          cursor: 'pointer',
          bgcolor: WHITE_06,
          borderBottom: isExpanded ? `1px solid ${APP_BORDER}` : 'none',
          '&:hover': { bgcolor: WHITE_08 },
          '&:focus-visible': { outline: `2px solid ${BRAND_PRIMARY}`, outlineOffset: -2 },
          userSelect: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: GAP_DEFAULT }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            bgcolor: alpha(BRAND_PRIMARY, 0.14),
          }}>
            <AutoFixHigh sx={{ fontSize: 16, color: BRAND_PRIMARY }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Plano de edição
            </Typography>
            <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
              {editingPlan.length} {editingPlan.length === 1 ? 'cena' : 'cenas'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: GAP_COMPACT }}>
          <Tooltip title="Limpar plano de edição">
            <span>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
                aria-label="Limpar plano de edição"
                sx={{ color: TEXT_SECONDARY }}
              >
                <DeleteSweep sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          {isExpanded
            ? <ExpandLess sx={{ fontSize: 20, color: TEXT_SECONDARY }} />
            : <ExpandMore sx={{ fontSize: 20, color: TEXT_SECONDARY }} />
          }
        </Box>
      </Box>

      {/* Lista de cenas colapsável */}
      <Collapse in={isExpanded} unmountOnExit>
        <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
          {editingPlan.map((planScene, index) => (
            <PlanSceneCard
              key={`${planScene.timestamp}-${index}`}
              planScene={planScene}
              index={index}
              thumbnailUrl={scenes[index]?.imageUrl}
              onUpdate={(updates) => onUpdateScene(index, updates)}
            />
          ))}
        </Box>
      </Collapse>
    </Box>

    {/* Dialog de confirmação para limpar o plano de edição */}
    <Dialog
      open={confirmOpen}
      onClose={(_event, reason) => {
        // Força escolha explícita — ignora clique no backdrop
        if (reason === 'backdropClick') return;
        setConfirmOpen(false);
      }}
      role="alertdialog"
      aria-labelledby="clear-plan-dialog-title"
      aria-describedby="clear-plan-dialog-description"
    >
      <DialogTitle id="clear-plan-dialog-title">
        Limpar plano de edição?
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="clear-plan-dialog-description">
          Esta ação é irreversível. Todas as transições, legendas e efeitos
          personalizados serão perdidos, incluindo as alterações feitas manualmente.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} autoFocus>
          Cancelar
        </Button>
        <Button onClick={handleConfirmClear} color="error" variant="contained">
          Limpar plano
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Card individual de cena no plano
// ---------------------------------------------------------------------------

interface PlanSceneCardProps {
  planScene: EditingScene;
  index: number;
  thumbnailUrl?: string;
  onUpdate: (updates: Partial<EditingScene>) => void;
}

function PlanSceneCard({ planScene, index, thumbnailUrl, onUpdate }: PlanSceneCardProps) {
  const timestampFormatted = formatTimestamp(planScene.timestamp);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: GAP_DEFAULT,
        px: { xs: 2, md: 2.5 },
        py: { xs: 1.5, md: 2 },
        borderBottom: `1px solid ${APP_BORDER}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Thumbnail ou ícone */}
      <Box sx={{
        flexShrink: 0,
        width: 64,
        height: 40,
        borderRadius: RADIUS_CHIP,
        overflow: 'hidden',
        bgcolor: BLACK_32,
        display: 'grid',
        placeItems: 'center',
      }}>
        {thumbnailUrl
          ? (
            <Box
              component="img"
              src={thumbnailUrl}
              alt={`Cena ${index + 1}`}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )
          : <Image sx={{ fontSize: 20, color: TEXT_DISABLED }} />}
      </Box>

      {/* Conteúdo */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Header: número + timestamp */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: GAP_COMPACT, mb: GAP_COMPACT }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: BRAND_PRIMARY }}>
            Cena {index + 1}
          </Typography>
          <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontFamily: 'JetBrains Mono, monospace' }}>
            {timestampFormatted}
          </Typography>
        </Box>

        {/* Chips de transição, câmera e efeitos */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: GAP_COMPACT }}>
          <Chip
            label={TRANSITION_LABELS[planScene.transition]}
            size="small"
            sx={transitionChipSx(planScene.transition)}
          />
          {planScene.camera && planScene.camera !== 'static' && (
            <Chip
              label={`Cam: ${CAMERA_LABELS[planScene.camera]}`}
              size="small"
              variant="outlined"
              sx={cameraChipSx}
            />
          )}
          {planScene.effects?.filter(e => e !== 'none').map(effect => (
            <Chip
              key={effect}
              label={EFFECT_LABELS[effect]}
              size="small"
              variant="outlined"
              sx={effectChipSx}
            />
          ))}
        </Box>

        {/* Prompt resumido */}
        {planScene.prompt && (
          <Typography variant="caption" sx={{ color: TEXT_SECONDARY, display: 'block', mb: GAP_COMPACT, lineHeight: 1.4 }} noWrap>
            {planScene.prompt}
          </Typography>
        )}

        {/* Campos editáveis */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: GAP_DEFAULT, alignItems: 'center' }}>
          {/* Dropdown de transição */}
          <Box sx={{ minWidth: 120 }}>
            <Typography variant="caption" sx={{ color: TEXT_DISABLED, display: 'block', mb: 0.25 }}>
              Transição
            </Typography>
            <Select
              size="small"
              value={planScene.transition}
              onChange={(e) => onUpdate({ transition: e.target.value as TransitionType })}
              sx={selectSx}
              aria-label={`Transição da cena ${index + 1}`}
            >
              {(Object.keys(TRANSITION_PRESETS) as TransitionType[]).map(type => (
                <MenuItem key={type} value={type} dense>
                  {TRANSITION_LABELS[type]}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Dropdown de câmera */}
          <Box sx={{ minWidth: 120 }}>
            <Typography variant="caption" sx={{ color: TEXT_DISABLED, display: 'block', mb: 0.25 }}>
              Câmera
            </Typography>
            <Select
              size="small"
              value={planScene.camera ?? 'static'}
              onChange={(e) => onUpdate({ camera: e.target.value as CameraMovement })}
              sx={selectSx}
              aria-label={`Movimento de câmera da cena ${index + 1}`}
            >
              {(Object.keys(CAMERA_MOVEMENTS) as CameraMovement[]).map(type => (
                <MenuItem key={type} value={type} dense>
                  {CAMERA_LABELS[type]}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Campo de legenda editável */}
          <Box sx={{ flex: 1, minWidth: 160 }}>
            <Typography variant="caption" sx={{ color: TEXT_DISABLED, display: 'block', mb: 0.25 }}>
              Legenda
            </Typography>
            <TextField
              size="small"
              placeholder="Sem legenda"
              value={planScene.subtitle ?? ''}
              onChange={(e) => onUpdate({ subtitle: e.target.value || undefined })}
              sx={textFieldSx}
              slotProps={{ input: { 'aria-label': `Legenda da cena ${index + 1}` } }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/** Formata timestamp em segundos para mm:ss */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Estilos inline (SX)
// ---------------------------------------------------------------------------

const selectSx = {
  fontSize: 13,
  '& .MuiSelect-select': { py: 0.5, px: 1.5 },
  bgcolor: WHITE_06,
  borderRadius: RADIUS_CHIP,
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: WHITE_14 },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND_PRIMARY },
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    fontSize: 13,
    bgcolor: WHITE_06,
    borderRadius: RADIUS_CHIP,
    '& fieldset': { borderColor: WHITE_12 },
    '&:hover fieldset': { borderColor: WHITE_14 },
    '&.Mui-focused fieldset': { borderColor: BRAND_PRIMARY },
  },
};

function transitionChipSx(type: TransitionType) {
  const isCyan = ['fade', 'dissolve'].includes(type);
  const isPurple = ['slide-left', 'slide-right', 'slide-up', 'wipe'].includes(type);

  return {
    fontSize: 11,
    fontWeight: 600,
    height: 22,
    bgcolor: isCyan
      ? alpha(BRAND_PRIMARY, 0.14)
      : isPurple
        ? alpha(BRAND_SECONDARY, 0.14)
        : WHITE_10,
    color: isCyan
      ? BRAND_PRIMARY_LIGHT
      : isPurple
        ? BRAND_SECONDARY_LIGHT
        : TEXT_SECONDARY,
    border: 'none',
  };
}

const cameraChipSx = {
  fontSize: 11,
  fontWeight: 600,
  height: 22,
  bgcolor: alpha(BRAND_PRIMARY, 0.08),
  color: BRAND_PRIMARY_LIGHT,
  borderColor: alpha(BRAND_PRIMARY, 0.2),
};

const effectChipSx = {
  fontSize: 11,
  fontWeight: 600,
  height: 22,
  bgcolor: alpha(BRAND_SECONDARY, 0.08),
  color: BRAND_SECONDARY_LIGHT,
  borderColor: alpha(BRAND_SECONDARY, 0.2),
};
