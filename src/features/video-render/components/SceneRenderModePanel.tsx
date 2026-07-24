/**
 * v0.133.1: Painel para escolher o modo de renderização (Clássico/Desenho)
 * POR CENA no preview do vídeo.
 *
 * Mostra as cenas geradas pelo Gemini como cards com:
 * - miniatura da imagem
 * - timestamp (seg)
 * - botão toggle do modo (Clássico ↔ Desenho)
 *
 * O usuário pode misturar Clássico e Desenho num mesmo vídeo. Cenas sem
 * `renderMode` próprio herdam o global (`VideoExportPanel`).
 *
 * Persistência: o componente apenas consome e atualiza o
 * `useAudioGeneratorStore.scenes`. Cada item do array `SceneItem` ganha
 * `renderMode?` / `vetorialPreset?` opcionais.
 */

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import FormatPaintIcon from '@mui/icons-material/FormatPaintOutlined';
import GestureIcon from '@mui/icons-material/GestureOutlined';
import { StackedHeader } from '../../../components/ui';
import { useLocale } from '../../i18n';
import { useAudioGeneratorStore, type SceneItem } from '../../studio/store';
import {
  GAP_COMPACT,
  GAP_MEDIUM,
  RADIUS_XS,
  BRAND_PRIMARY,
  WHITE_06,
  WHITE_14,
} from '../../../theme/tokens';
import { glassSurfaceSx } from '../../../theme/surfaces';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SceneRenderModePanelProps {
  /** Cenas a exibir. Se ausente, lê do store global. */
  scenes?: SceneItem[];
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function SceneRenderModePanel({ scenes: scenesProp }: SceneRenderModePanelProps) {
  const { t } = useLocale();
  const scenesStore = useAudioGeneratorStore((s) => s.scenes);
  const setScenes = useAudioGeneratorStore((s) => s.setScenes);
  const scenes = scenesProp ?? scenesStore;

  /**
   * v0.133.1: cicla o `renderMode` da cena entre `undefined` (herda global),
   * `'mask'` (Clássico) e `'vetorial'` (Desenho). 3 estados para simplicidade.
   * Ordem do ciclo: undefined → 'mask' → 'vetorial' → undefined.
   */
  const handleCycleMode = (sceneImageUrl: string): void => {
    setScenes(
      scenes.map((s) => {
        if (s.imageUrl !== sceneImageUrl) return s;
        const current = s.renderMode;
        let next: SceneItem['renderMode'];
        if (current === undefined) next = 'mask';
        else if (current === 'mask') next = 'vetorial';
        else next = undefined; // volta a herdar
        return { ...s, renderMode: next };
      }),
    );
  };

  if (scenes.length === 0) return null;

  return (
    <Box sx={(theme) => ({ ...glassSurfaceSx(theme), borderRadius: RADIUS_XS + 1, p: 2 })}>
      <Stack spacing={GAP_MEDIUM}>
        <StackedHeader
          title={t('video.sceneRenderMode.title') ?? 'Modo por cena'}
          description={t('video.sceneRenderMode.subtitle') ?? 'Defina Clássico ou Desenho individualmente'}
          density="compact"
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 1.5,
          }}
        >
          {scenes.map((scene, index) => {
            const effectiveMode = scene.renderMode ?? 'inherit';
            const isVetorial = scene.renderMode === 'vetorial';
            const isMask = scene.renderMode === 'mask';
            const label = isVetorial
              ? t('video.sceneRenderMode.modeVetorial') ?? 'Desenho'
              : isMask
                ? t('video.sceneRenderMode.modeMask') ?? 'Clássico'
                : t('video.sceneRenderMode.modeInherit') ?? 'Global';
            return (
              <Box
                key={`${scene.imageUrl}-${index}`}
                sx={(theme) => ({
                  position: 'relative',
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  border: `1px solid ${isVetorial ? alpha(BRAND_PRIMARY, 0.5) : WHITE_06}`,
                  borderRadius: RADIUS_XS,
                  overflow: 'hidden',
                  aspectRatio: '16/9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Box
                  component="img"
                  src={scene.imageUrl}
                  alt={`Cena ${index + 1}`}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                />
                {/* Badge de número */}
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    bgcolor: alpha(theme.palette.common.black, 0.6),
                    color: 'common.white',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    px: 0.75,
                    py: 0.125,
                    borderRadius: 0.5,
                  })}
                >
                  #{index + 1}
                </Box>
                {/* Label do modo */}
                <Typography
                  variant="caption"
                  sx={(theme) => ({
                    position: 'absolute',
                    bottom: 4,
                    left: 4,
                    bgcolor: effectiveMode === 'inherit'
                      ? alpha(theme.palette.common.black, 0.6)
                      : isVetorial
                        ? alpha(BRAND_PRIMARY, 0.85)
                        : alpha(theme.palette.common.black, 0.7),
                    color: 'common.white',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    px: 0.75,
                    py: 0.125,
                    borderRadius: 0.5,
                  })}
                >
                  {label}
                </Typography>
                {/* Botão de toggle */}
                <Tooltip
                  title={t('video.sceneRenderMode.cycleModeAria', {
                    index: index + 1,
                    current: label,
                  }) ?? `Cena ${index + 1}: ${label} (clique para trocar)`}
                >
                  <IconButton
                    onClick={() => handleCycleMode(scene.imageUrl)}
                    size="small"
                    data-testid={`scene-mode-toggle-${index}`}
                    aria-label={t('video.sceneRenderMode.cycleModeAria', {
                      index: index + 1,
                      current: label,
                    }) ?? `Trocar modo da cena ${index + 1}`}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 26,
                      height: 26,
                      minHeight: 'unset',
                      minWidth: 'unset',
                      bgcolor: isVetorial
                        ? alpha(BRAND_PRIMARY, 0.85)
                        : alpha(WHITE_06, 0.85),
                      color: 'common.white',
                      border: `1px solid ${isVetorial ? BRAND_PRIMARY : WHITE_14}`,
                      '&:hover': {
                        bgcolor: isVetorial
                          ? BRAND_PRIMARY
                          : alpha(WHITE_14, 0.85),
                      },
                      '& .MuiSvgIcon-root': { fontSize: 14 },
                    }}
                  >
                    {effectiveMode === 'inherit' ? (
                      <FormatPaintIcon sx={{ opacity: 0.5 }} />
                    ) : isVetorial ? (
                      <GestureIcon />
                    ) : (
                      <FormatPaintIcon />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
        <Stack spacing={GAP_COMPACT}>
          <Typography variant="caption" color="text.secondary">
            {t('video.sceneRenderMode.legendMask') ?? 'Clássico = revelação por máscara'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('video.sceneRenderMode.legendVetorial') ?? 'Desenho = animação vetorial com paths SVG'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('video.sceneRenderMode.legendInherit') ?? 'Sem escolha = usa modo global do painel de exportação'}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}