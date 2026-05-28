import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import Tune from '@mui/icons-material/Tune';
import type { AssistantStudioUpdate } from '../types';
import type { StudioSettingsPatch } from '../../studio/types';
import { assistantInsetSx } from './assistantUi';
import { useLocale } from '../../i18n';
import { BRAND_PRIMARY, GAP_COMPACT, RADIUS_XS, TEXT_SECONDARY } from '../../../theme/tokens';

/** Mapeamento de chaves de settings para chaves i18n de labels */
const SETTINGS_LABEL_KEYS: Record<keyof StudioSettingsPatch, string> = {
  script: 'studio.header.scriptTab',
  selectedVoice: 'configuracoes.voiceLabel',
  isMultiSpeaker: 'configuracoes.multiSpeakerLabel',
  speakerAName: 'configuracoes.personaNameLabel',
  speakerBName: 'configuracoes.speakerBNameLabel',
  speakerBVoice: 'configuracoes.speakerBVoiceLabel',
  audioProfile: 'configuracoes.profileLabel',
  scene: 'configuracoes.sceneLabel',
  pace: 'configuracoes.paceLabel',
  styleNotes: 'configuracoes.styleNotesLabel',
  generateScenes: 'configuracoes.generateScenesLabel',
  sceneDensity: 'configuracoes.sceneDensityLabel',
  sceneRatio: 'configuracoes.sceneRatioLabel',
  visualFramework: 'configuracoes.visualFrameworkLabel',
  emotion: 'configuracoes.emotionLabel',
  emotionIntensity: 'studio.emotion.intensity',
  imageTextLanguage: 'configuracoes.imageTextLanguageLabel',
};

/** Formata um valor de setting para exibição amigável */
function formatSettingValue(key: string, value: unknown, t: (key: string) => string): string {
  if (typeof value === 'boolean') return value ? t('common.confirm') : t('common.cancel');
  if (key === 'emotion') return t(`studio.emotion.options.${String(value)}`) ?? String(value);
  if (key === 'imageTextLanguage') return String(value).toUpperCase();
  if (typeof value === 'number') return String(value);
  return String(value);
}

interface SettingsPreviewCardProps {
  pendingSettings: AssistantStudioUpdate;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * Card compacto que exibe preview dos settings pendentes antes de aplicar.
 * Extraído de Assistant.tsx para reduzir verbosidade e permitir refinamento visual.
 */
export function SettingsPreviewCard({ pendingSettings, onApply, onDismiss }: SettingsPreviewCardProps) {
  const { t } = useLocale();

  /** Gera lista de { label, value } para preview dos settings pendentes */
  const settingsPreview = useMemo(() => {
    return Object.entries(pendingSettings.settings)
      .filter(([key, value]) => key in SETTINGS_LABEL_KEYS && value !== undefined && value !== null && value !== '')
      .map(([key, value]) => ({
        label: t(SETTINGS_LABEL_KEYS[key as keyof StudioSettingsPatch]),
        value: formatSettingValue(key, value, t),
      }));
  }, [pendingSettings.settings, t]);

  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, pb: 0.75 }}>
      <Box
        sx={(theme) => ({
          ...assistantInsetSx(theme),
          p: { xs: 1, md: 1.5 },
          borderColor: alpha(BRAND_PRIMARY, 0.24),
        })}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
          <Tune sx={{ fontSize: 16, color: BRAND_PRIMARY }} />
          <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontWeight: 700 }}>
            {pendingSettings.summary}
          </Typography>
        </Stack>

        {settingsPreview.length > 0 ? (
          <Stack
            direction="row"
            useFlexGap
            sx={{
              flexWrap: 'wrap',
              gap: 0.5,
              mb: 1,
            }}
          >
            {settingsPreview.map(({ label, value }) => (
              <Chip
                key={label}
                label={
                  <Typography variant="caption" sx={{ fontSize: '0.675rem', lineHeight: 1.2 }}>
                    <Box component="span" sx={{ color: TEXT_SECONDARY }}>{label}:</Box>{' '}
                    <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{value}</Box>
                  </Typography>
                }
                size="small"
                variant="outlined"
                sx={{
                  height: 'auto',
                  '& .MuiChip-label': {
                    px: 0.75,
                    py: 0.25,
                  },
                  borderColor: alpha(BRAND_PRIMARY, 0.2),
                  borderRadius: RADIUS_XS,
                }}
              />
            ))}
          </Stack>
        ) : null}

        <Stack direction="row" spacing={GAP_COMPACT} sx={{ justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="contained"
            onClick={onApply}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: RADIUS_XS,
              px: 1.5,
              py: 0.25,
              minWidth: 0,
            }}
          >
            {t('assistant.messages.applyToStudio')}
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={onDismiss}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              borderRadius: RADIUS_XS,
              px: 1.5,
              py: 0.25,
              minWidth: 0,
              color: TEXT_SECONDARY,
            }}
          >
            {t('assistant.messages.ignore')}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
