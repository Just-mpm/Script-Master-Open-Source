import React, { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import GraphicEq from '@mui/icons-material/GraphicEq';
import Image from '@mui/icons-material/Image';
import Pause from '@mui/icons-material/Pause';
import People from '@mui/icons-material/People';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Settings from '@mui/icons-material/Settings';
import Warning from '@mui/icons-material/Warning';
import { VOICES } from '../lib/constants';
import { useVoicePreviews } from '../hooks/useVoicePreviews';
import type { SceneRatio } from '../features/studio/types';
import { useStudioStore } from '../features/studio/store';
import { TemplateSelector } from '../features/studio/components/TemplateSelector';
import { EmotionSelector } from '../features/studio/components/EmotionSelector';
import type { EmotionType } from '../features/studio/types';
import { useShallow } from 'zustand/react/shallow';
import { glassPanelSx, insetPanelSx } from '../theme/surfaces';
import { ICON_SIZE_SM, ICON_SIZE_MD, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, RADIUS_SM, RADIUS_XS, BRAND_PRIMARY_GLOW_SOFT } from '../theme/tokens';
import { createLogger } from '../lib/logger';
import { useLocale } from '../features/i18n';
import type { Locale } from '../features/i18n/types';

const log = createLogger('Inspector');

const MAX_STYLE_NOTES = 500;

/** Props do Inspector — apenas `isGenerating` vem do pai; o restante é lido do store */
interface InspectorProps {
  isGenerating: boolean;
}

type VoiceTabValue = 'A' | 'B';

function voiceTabProps(tab: VoiceTabValue) {
  return {
    id: `voice-tab-${tab}`,
    'aria-controls': `voice-panel-${tab}`,
  };
}

function VoiceTabPanel({
  value,
  activeValue,
  children,
}: {
  value: VoiceTabValue;
  activeValue: VoiceTabValue;
  children: React.ReactNode;
}) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== activeValue}
      id={`voice-panel-${value}`}
      aria-labelledby={`voice-tab-${value}`}
    >
      {value === activeValue ? children : null}
    </Box>
  );
}

export const Inspector = React.memo(function Inspector({ isGenerating }: InspectorProps) {
  const theme = useTheme();
  const { t } = useLocale();

  const paceOptions = [
    { value: 'very_slow', label: t('studio.inspector.paceOptions.very_slow') },
    { value: 'slow', label: t('studio.inspector.paceOptions.slow') },
    { value: 'normal', label: t('studio.inspector.paceOptions.normal') },
    { value: 'fast', label: t('studio.inspector.paceOptions.fast') },
    { value: 'very_fast', label: t('studio.inspector.paceOptions.very_fast') },
  ];

  const visualFrameworkOptions = [
    { value: 'general', label: t('studio.inspector.visualFramework.general') },
    { value: 'whiteboard', label: t('studio.inspector.visualFramework.whiteboard') },
  ];

  const sceneRatioOptions: Array<{ value: SceneRatio; label: string }> = [
    { value: '16:9', label: t('studio.inspector.sceneRatio.16:9') },
    { value: '9:16', label: t('studio.inspector.sceneRatio.9:16') },
    { value: '1:1', label: t('studio.inspector.sceneRatio.1:1') },
  ];

  const densityOptions = [
    { value: 15, label: t('studio.inspector.sceneDensity.15') },
    { value: 30, label: t('studio.inspector.sceneDensity.30') },
    { value: 60, label: t('studio.inspector.sceneDensity.60') },
    { value: 120, label: t('studio.inspector.sceneDensity.120') },
  ];

  const imageTextLanguageOptions: Array<{ value: Locale; label: string }> = [
    { value: 'pt-BR', label: t('studio.inspector.sceneFields.imageTextLanguage.pt-BR') },
    { value: 'en', label: t('studio.inspector.sceneFields.imageTextLanguage.en') },
    { value: 'es', label: t('studio.inspector.sceneFields.imageTextLanguage.es') },
  ];

  // Estado de config do store (Zustand) — useShallow evita re-renders desnecessários
  const {
    isMultiSpeaker,
    setIsMultiSpeaker,
    speakerAName,
    setSpeakerAName,
    selectedVoice,
    setSelectedVoice,
    speakerBName,
    setSpeakerBName,
    speakerBVoice,
    setSpeakerBVoice,
    audioProfile,
    setAudioProfile,
    scene,
    setScene,
    pace,
    setPace,
    styleNotes,
    setStyleNotes,
    generateScenes,
    setGenerateScenes,
    sceneDensity,
    setSceneDensity,
    sceneRatio,
    setSceneRatio,
    visualFramework,
    setVisualFramework,
    referenceImage,
    setReferenceImage,
    emotion,
    setEmotion,
    emotionIntensity,
    setEmotionIntensity,
    imageTextLanguage,
    setImageTextLanguage,
  } = useStudioStore(useShallow((s) => ({
    isMultiSpeaker: s.isMultiSpeaker,
    setIsMultiSpeaker: s.setIsMultiSpeaker,
    speakerAName: s.speakerAName,
    setSpeakerAName: s.setSpeakerAName,
    selectedVoice: s.selectedVoice,
    setSelectedVoice: s.setSelectedVoice,
    speakerBName: s.speakerBName,
    setSpeakerBName: s.setSpeakerBName,
    speakerBVoice: s.speakerBVoice,
    setSpeakerBVoice: s.setSpeakerBVoice,
    audioProfile: s.audioProfile,
    setAudioProfile: s.setAudioProfile,
    scene: s.scene,
    setScene: s.setScene,
    pace: s.pace,
    setPace: s.setPace,
    styleNotes: s.styleNotes,
    setStyleNotes: s.setStyleNotes,
    generateScenes: s.generateScenes,
    setGenerateScenes: s.setGenerateScenes,
    sceneDensity: s.sceneDensity,
    setSceneDensity: s.setSceneDensity,
    sceneRatio: s.sceneRatio,
    setSceneRatio: s.setSceneRatio,
    visualFramework: s.visualFramework,
    setVisualFramework: s.setVisualFramework,
    referenceImage: s.referenceImage,
    setReferenceImage: s.setReferenceImage,
    emotion: s.emotion,
    setEmotion: s.setEmotion,
    emotionIntensity: s.emotionIntensity,
    setEmotionIntensity: s.setEmotionIntensity,
    imageTextLanguage: s.imageTextLanguage,
    setImageTextLanguage: s.setImageTextLanguage,
  })));
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState(true);
  const [isDirectionCollapsed, setIsDirectionCollapsed] = useState(true);
  const [activeVoiceTab, setActiveVoiceTab] = useState<VoiceTabValue>('A');
  const voiceSectionId = 'inspector-voice-section';
  const directionSectionId = 'inspector-direction-section';
  const [referenceImageWarning, setReferenceImageWarning] = useState<string | null>(null);

  const handleSceneRatioChange = (value: string) => {
    if (value === '16:9' || value === '9:16' || value === '1:1') {
      setSceneRatio(value);
    }
  };

  const {
    playingId,
    errorId,
    playPreview,
    clearError,
  } = useVoicePreviews();

  // Limpa erro de preview após 3 segundos para não travar o ícone indefinidamente
  useEffect(() => {
    if (!errorId) return;
    const timer = window.setTimeout(clearError, 3000);
    return () => window.clearTimeout(timer);
  }, [errorId, clearError]);

  const isVoiceOpen = !isVoiceCollapsed;
  const isDirectionOpen = !isDirectionCollapsed;
  const activeSpeakerName = activeVoiceTab === 'A' ? speakerAName : speakerBName;

  const handleEmotionChange = useCallback(
    (newEmotion: EmotionType, newIntensity: number) => {
      setEmotion(newEmotion);
      setEmotionIntensity(newIntensity);
    },
    [setEmotion, setEmotionIntensity],
  );

  const MAX_REFERENCE_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_REFERENCE_IMAGE_SIZE) {
      log.warn('Imagem de referência excede o limite de 10MB', { size: file.size, name: file.name });
      setReferenceImageWarning(t('studio.inspector.referenceImage.tooLarge'));
      window.setTimeout(() => setReferenceImageWarning(null), 5000);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setReferenceImageWarning(t('studio.inspector.referenceImage.readError'));
    };
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      setReferenceImage(result);
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <Stack
      component="aside"
      spacing={{ xs: 2, lg: 3 }}
      role="complementary"
      aria-label={t('studio.inspector.ariaLabel')}
      id="inspector-panel"
    >
      <TemplateSelector />

      <Paper elevation={0} sx={glassPanelSx}>
        <ButtonBase
          component="button"
          type="button"
           onClick={() => {
             setIsVoiceCollapsed((previous) => !previous);
           }}
           aria-expanded={isVoiceOpen}
          aria-controls={voiceSectionId}
          sx={{
            width: '100%',
            px: { xs: 2.5, md: 3 },
            py: 2,
            textAlign: 'left',
            borderRadius: { xs: 3, md: 4 },
            transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            },
          }}
        >
          <Stack direction="row" sx={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack spacing={GAP_COMPACT}>
              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                <GraphicEq sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />
                <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                  {t('studio.inspector.voiceSection.title')}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {t('studio.inspector.voiceSection.description')}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
              <Chip label={t('studio.inspector.voiceSection.optionsCount', { count: VOICES.length })} size="small" variant="outlined" />
              {!isVoiceOpen ? <ExpandMore sx={{ fontSize: ICON_SIZE_MD }} /> : <ExpandLess sx={{ fontSize: ICON_SIZE_MD }} />}
            </Stack>
          </Stack>
        </ButtonBase>

        <Collapse in={isVoiceOpen} timeout="auto" id={voiceSectionId}>
          <Stack spacing={2} sx={{ px: { xs: 2.5, md: 3 }, pb: { xs: 2.5, md: 3 } }}>
            <Paper elevation={0} sx={(currentTheme): SystemStyleObject<Theme> => ({ ...insetPanelSx(currentTheme), p: 2 })}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                    <People sx={{ fontSize: ICON_SIZE_SM, color: theme.palette.primary.main }} />
                    <Typography variant="subtitle2">{t('studio.inspector.podcast.title')}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {t('studio.inspector.podcast.description')}
                  </Typography>
                </Stack>

                <Switch
                  checked={isMultiSpeaker}
                  onChange={(event) => setIsMultiSpeaker(event.target.checked)}
                  disabled={isGenerating}
                  slotProps={{ input: { id: 'podcast-mode-switch', name: 'podcast-mode', 'aria-label': t('studio.inspector.podcast.ariaLabel') } }}
                />
              </Stack>
            </Paper>

            {isMultiSpeaker && (
              <Paper elevation={0} sx={(currentTheme): SystemStyleObject<Theme> => ({ ...insetPanelSx(currentTheme), p: 1.25 })}>
                <Tabs
                  value={activeVoiceTab}
                  onChange={(_event, value: VoiceTabValue) => setActiveVoiceTab(value)}
                  aria-label={t('studio.inspector.scenes.voiceTabsAriaLabel')}
                  variant="fullWidth"
                  sx={{ mb: 1.5 }}
                >
                  <Tab label={t('studio.inspector.podcast.voiceATab')} value="A" {...voiceTabProps('A')} />
                  <Tab label={t('studio.inspector.podcast.voiceBTab')} value="B" {...voiceTabProps('B')} />
                </Tabs>

                <VoiceTabPanel value="A" activeValue={activeVoiceTab}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('studio.inspector.podcast.nameLabel')}
                    value={speakerAName}
                    onChange={(event) => setSpeakerAName(event.target.value)}
                    disabled={isGenerating}
                    placeholder={t('studio.inspector.podcast.namePlaceholder')}
                    error={isMultiSpeaker && speakerAName.trim() === ''}
                    helperText={isMultiSpeaker && speakerAName.trim() === '' ? t('studio.inspector.podcast.nameRequired') : t('studio.inspector.podcast.nameHelper')}
                    slotProps={{
                      input: {
                        ...(isMultiSpeaker && speakerAName.trim() === '' ? {
                          startAdornment: (
                            <InputAdornment position="start" sx={{ mr: 0.5 }}>
                              <Warning sx={{ fontSize: ICON_SIZE_SM, color: 'error.main' }} />
                            </InputAdornment>
                          ),
                        } : {}),
                      },
                    }}
                  />
                </VoiceTabPanel>

                <VoiceTabPanel value="B" activeValue={activeVoiceTab}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('studio.inspector.podcast.nameLabel')}
                    value={speakerBName}
                    onChange={(event) => setSpeakerBName(event.target.value)}
                    disabled={isGenerating}
                    placeholder={t('studio.inspector.podcast.namePlaceholderB')}
                    helperText={t('studio.inspector.podcast.nameHelper')}
                  />
                </VoiceTabPanel>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25, px: 0.5 }}>
                  <span dangerouslySetInnerHTML={{ __html: t('studio.inspector.podcast.editorHint', { name: activeSpeakerName || `Voz ${activeVoiceTab}` }) }} />
                </Typography>
              </Paper>
            )}

            <Grid container spacing={1.5} role="listbox" aria-label={t('studio.inspector.voiceSelection.ariaLabel')}>
              {VOICES.map((voice) => {
                const isActiveVoice = activeVoiceTab === 'A' ? selectedVoice === voice.id : speakerBVoice === voice.id;
                const isPlaying = playingId === voice.id;
                const hasError = errorId === voice.id;

                return (
                  <Grid key={voice.id} size={{ xs: 12, sm: 6 }}>
                    <Paper
                      elevation={0}
                      variant="outlined"
                      sx={(currentTheme): SystemStyleObject<Theme> => ({
                        position: 'relative',
                        height: '100%',
                        overflow: 'hidden',
                        borderRadius: RADIUS_SM,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderColor: isActiveVoice
                          ? alpha(currentTheme.palette.primary.main, 0.55)
                          : alpha(currentTheme.palette.common.white, 0.08),
                        backgroundColor: isActiveVoice
                          ? alpha(currentTheme.palette.primary.main, 0.12)
                          : alpha(currentTheme.palette.background.default, 0.28),
                        boxShadow: isActiveVoice
                          ? `0 0 0 1px ${alpha(currentTheme.palette.primary.main, 0.35)}, 0 18px 45px ${alpha(currentTheme.palette.primary.main, 0.16)}`
                          : 'none',
                        transform: 'translateY(0)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          borderColor: isActiveVoice
                            ? alpha(currentTheme.palette.primary.main, 0.65)
                            : alpha(currentTheme.palette.common.white, 0.14),
                          backgroundColor: isActiveVoice
                            ? alpha(currentTheme.palette.primary.main, 0.16)
                            : alpha(currentTheme.palette.background.default, 0.38),
                          boxShadow: isActiveVoice
                            ? `0 0 0 1px ${alpha(currentTheme.palette.primary.main, 0.45)}, 0 22px 54px ${alpha(currentTheme.palette.primary.main, 0.22)}`
                            : `0 0 0 1px ${alpha(currentTheme.palette.common.white, 0.06)}, 0 8px 24px rgba(0, 0, 0, 0.2)`,
                        },
                      })}
                    >
                      <ButtonBase
                        onClick={() => (activeVoiceTab === 'A' ? setSelectedVoice(voice.id) : setSpeakerBVoice(voice.id))}
                        disabled={isGenerating}
                        role="option"
                        aria-selected={isActiveVoice}
                        sx={{
                          width: '100%',
                          height: '100%',
                          alignItems: 'stretch',
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                          px: 1.75,
                          py: 1.5,
                          pr: 6,
                        }}
                      >
                        <Stack spacing={GAP_COMPACT} sx={{ width: '100%' }}>
                          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2" color={isActiveVoice ? 'primary.main' : 'text.primary'}>
                              {voice.name}
                            </Typography>
                             {isActiveVoice && <CheckCircle sx={{ fontSize: ICON_SIZE_SM, color: theme.palette.primary.main }} aria-hidden="true" />}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {voice.style}
                          </Typography>
                        </Stack>
                      </ButtonBase>

                      <Tooltip title={hasError ? t('studio.inspector.voiceSelection.previewError') : t('studio.inspector.voiceSelection.previewVoice', { voice: voice.name })}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              playPreview(voice.id);
                            }}
                            disabled={isGenerating}
                            aria-label={hasError ? t('studio.inspector.voiceSelection.previewError') : t('studio.inspector.voiceSelection.previewVoice', { voice: voice.name })}
                            sx={(currentTheme) => ({
                              position: 'absolute',
                              right: 8,
                              bottom: 8,
                              borderRadius: RADIUS_XS,
                              border: `1px solid ${hasError
                                ? alpha(currentTheme.palette.error.main, 0.4)
                                : alpha(currentTheme.palette.common.white, 0.08)}`,
                              backgroundColor: isPlaying
                                ? currentTheme.palette.primary.main
                                : hasError
                                  ? alpha(currentTheme.palette.error.main, 0.12)
                                  : alpha(currentTheme.palette.background.paper, 0.6),
          color: isPlaying ? currentTheme.palette.primary.contrastText
            : hasError
              ? currentTheme.palette.error.main
              : currentTheme.palette.text.secondary,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: isPlaying
              ? currentTheme.palette.primary.dark
              : hasError
                ? alpha(currentTheme.palette.error.main, 0.2)
                : alpha(currentTheme.palette.primary.main, 0.16),
            boxShadow: !isPlaying && !hasError
              ? `0 6px 20px ${BRAND_PRIMARY_GLOW_SOFT}`
              : 'none',
          },
        })}
                          >
                            {isPlaying
                              ? <Pause sx={{ fontSize: ICON_SIZE_SM }} />
                              : hasError
                                ? <ErrorOutlineOutlined sx={{ fontSize: ICON_SIZE_SM }} />
                                : <PlayArrow sx={{ fontSize: ICON_SIZE_SM }} />
                            }
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

          </Stack>
        </Collapse>
      </Paper>

      <Paper elevation={0} sx={glassPanelSx}>
        <ButtonBase
          component="button"
          type="button"
           onClick={() => {
             setIsDirectionCollapsed((previous) => !previous);
           }}
           aria-expanded={isDirectionOpen}
          aria-controls={directionSectionId}
           sx={{
              width: '100%',
              px: { xs: 2.5, md: 3 },
              py: 2,
              textAlign: 'left',
              borderRadius: { xs: 3, md: 4 },
              transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
              },
            }}
         >
           <Stack direction="row" sx={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
             <Stack spacing={GAP_COMPACT}>
               <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                 <Settings sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />
                 <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                   {t('studio.inspector.directionSection.title')}
                 </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {t('studio.inspector.directionSection.description')}
              </Typography>
            </Stack>

            {isDirectionOpen ? <ExpandLess sx={{ fontSize: ICON_SIZE_MD }} /> : <ExpandMore sx={{ fontSize: ICON_SIZE_MD }} />}
          </Stack>
        </ButtonBase>

        {/* Collapse verificado: id={directionSectionId} conectado ao aria-controls do botão, sem overflow cortando conteúdo */}
        <Collapse in={isDirectionOpen} timeout="auto" id={directionSectionId}>
          <Stack spacing={2} sx={{ px: { xs: 2.5, md: 3 }, pb: { xs: 2.5, md: 3 } }}>
            <TextField
              fullWidth
              label={t('studio.inspector.directionFields.characterLabel')}
              value={audioProfile}
              onChange={(event) => setAudioProfile(event.target.value)}
              disabled={isGenerating}
              placeholder={t('studio.inspector.directionFields.characterPlaceholder')}
              helperText={!audioProfile ? t('studio.inspector.directionFields.characterHelper') : undefined}
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              label={t('studio.inspector.directionFields.environmentLabel')}
              value={scene}
              onChange={(event) => setScene(event.target.value)}
              disabled={isGenerating}
              placeholder={t('studio.inspector.directionFields.environmentPlaceholder')}
              helperText={!scene ? t('studio.inspector.directionFields.environmentHelper') : undefined}
            />

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth disabled={isGenerating}>
                  <InputLabel id="pace-select-label">{t('studio.inspector.directionFields.paceLabel')}</InputLabel>
                  <Select
                    labelId="pace-select-label"
                    id="pace-select"
                    label={t('studio.inspector.directionFields.paceLabel')}
                    value={pace}
                    onChange={(event) => setPace(event.target.value)}
                  >
                    {paceOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t('studio.inspector.directionFields.accentLabel')}
                  value={styleNotes}
                  onChange={(event) => {
                    if (event.target.value.length <= MAX_STYLE_NOTES) {
                      setStyleNotes(event.target.value);
                    }
                  }}
                  disabled={isGenerating}
                  placeholder={t('studio.inspector.directionFields.accentPlaceholder')}
                  error={styleNotes.length === MAX_STYLE_NOTES}
                  helperText={styleNotes.length === MAX_STYLE_NOTES
                    ? t('studio.inspector.directionFields.accentLimitReached', { limit: MAX_STYLE_NOTES })
                    : !styleNotes
                      ? t('studio.inspector.directionFields.accentHelper')
                      : t('studio.inspector.directionFields.accentCounter', { current: styleNotes.length, limit: MAX_STYLE_NOTES })}
                />
              </Grid>
              </Grid>

              <EmotionSelector
                value={emotion}
                intensity={emotionIntensity}
                onChange={handleEmotionChange}
                disabled={isGenerating}
              />

            <Paper elevation={0} sx={(currentTheme): SystemStyleObject<Theme> => ({ ...insetPanelSx(currentTheme), p: 2 })}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack spacing={0.5}>
                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                      <Image sx={{ fontSize: ICON_SIZE_SM, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle2">{t('studio.inspector.scenes.title')}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {t('studio.inspector.scenes.description')}
                    </Typography>
                  </Stack>

                  <Switch
                    checked={generateScenes}
                    onChange={(event) => setGenerateScenes(event.target.checked)}
                    disabled={isGenerating}
                    slotProps={{ input: { id: 'generate-scenes-switch', name: 'generate-scenes', 'aria-label': t('studio.inspector.scenes.ariaLabel') } }}
                  />
                </Stack>

                <Collapse in={generateScenes} timeout="auto" unmountOnExit>
                  <Stack spacing={1.75}>
                    <FormControl fullWidth disabled={isGenerating}>
                      <InputLabel id="framework-select-label">{t('studio.inspector.sceneFields.visualIdentityLabel')}</InputLabel>
                      <Select
                        labelId="framework-select-label"
                        id="framework-select"
                        label={t('studio.inspector.sceneFields.visualIdentityLabel')}
                        value={visualFramework}
                        onChange={(event) => setVisualFramework(event.target.value)}
                      >
                        {visualFrameworkOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth disabled={isGenerating}>
                      <InputLabel id="image-text-lang-label">{t('studio.inspector.sceneFields.imageTextLanguage.label')}</InputLabel>
                      <Select
                        labelId="image-text-lang-label"
                        id="image-text-lang-select"
                        label={t('studio.inspector.sceneFields.imageTextLanguage.label')}
                        value={imageTextLanguage}
                        onChange={(event) => setImageTextLanguage(event.target.value as Locale)}
                      >
                        {imageTextLanguageOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth disabled={isGenerating}>
                          <InputLabel id="ratio-select-label">{t('studio.inspector.sceneFields.formatLabel')}</InputLabel>
                          <Select
                            labelId="ratio-select-label"
                            id="ratio-select"
                            label={t('studio.inspector.sceneFields.formatLabel')}
                            value={sceneRatio}
                            onChange={(event) => handleSceneRatioChange(event.target.value)}
                          >
                            {sceneRatioOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth disabled={isGenerating}>
                          <InputLabel id="density-select-label">{t('studio.inspector.sceneFields.frequencyLabel')}</InputLabel>
                          <Select
                            labelId="density-select-label"
                            id="density-select"
                            label={t('studio.inspector.sceneFields.frequencyLabel')}
                            value={String(sceneDensity)}
                            onChange={(event) => setSceneDensity(Number(event.target.value))}
                          >
                            {densityOptions.map((option) => (
                              <MenuItem key={option.value} value={String(option.value)}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                  <Stack spacing={GAP_MEDIUM}>
                    {referenceImageWarning ? (
                      <Alert severity="warning" sx={{ borderRadius: 2 }} onClose={() => setReferenceImageWarning(null)}>
                        {referenceImageWarning}
                      </Alert>
                    ) : null}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={GAP_MEDIUM}
                        sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
                      >
                        <Button
                          component="label"
                          variant={referenceImage ? 'contained' : 'outlined'}
                          startIcon={<Image sx={{ fontSize: ICON_SIZE_SM }} />}
                          disabled={isGenerating}
                          sx={{
                            flex: 1,
                            minHeight: 44,
                            borderStyle: referenceImage ? 'solid' : 'dashed',
                            justifyContent: 'center',
                          }}
                        >
                          {referenceImage ? t('studio.inspector.sceneFields.imageSelected') : t('studio.inspector.sceneFields.attachImage')}
                          <input hidden type="file" accept="image/*" onChange={handleReferenceImageUpload} />
                        </Button>

                        {referenceImage && (
                          <Tooltip title={t('studio.inspector.sceneFields.removeRefTooltip')}>
                            <span>
                              <IconButton
                                onClick={() => setReferenceImage(null)}
                                disabled={isGenerating}
                                color="error"
                                aria-label={t('studio.inspector.sceneFields.removeRefAriaLabel')}
                                sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.3)}` }}
                              >
                                 <Close sx={{ fontSize: ICON_SIZE_MD }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        {t('studio.inspector.sceneFields.refHelper')}
                      </Typography>
                    </Stack>
                  </Stack>
                </Collapse>
              </Stack>
            </Paper>
          </Stack>
        </Collapse>
      </Paper>
    </Stack>
  );
});

