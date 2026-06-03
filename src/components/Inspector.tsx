import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import Close from '@mui/icons-material/Close';
import GraphicEq from '@mui/icons-material/GraphicEq';
import Image from '@mui/icons-material/Image';
import People from '@mui/icons-material/People';
import Settings from '@mui/icons-material/Settings';
import Warning from '@mui/icons-material/Warning';
import { VOICES } from '../lib/constants';
import { useVoicePreviews } from '../hooks/useVoicePreviews';
import { useStudioStore } from '../features/studio/store';
import { EmotionSelector } from '../features/studio/components/EmotionSelector';
import type { EmotionType } from '../features/studio/types';
import { useShallow } from 'zustand/react/shallow';
import { insetPanelSx } from '../theme/surfaces';
import { ICON_SIZE_SM, ICON_SIZE_MD, GAP_DEFAULT, GAP_MEDIUM } from '../theme/tokens';
import { createLogger } from '../lib/logger';
import { useLocale } from '../features/i18n';
import type { Locale } from '../features/i18n/types';
import { VoiceCard } from './VoiceCard';
import { StackedHeader } from './ui';
import { createPaceOptions, createVisualFrameworkOptions, createSceneRatioOptions, createDensityOptions } from '../data/studioOptions';

const log = createLogger('Inspector');

const MAX_STYLE_NOTES = 500;

/** Escapa caracteres especiais HTML para evitar Self-XSS via dangerouslySetInnerHTML */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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

function compactSummary(text: string, maxLength = 28): string {
  const normalized = text.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export const Inspector = React.memo(function Inspector({ isGenerating }: InspectorProps) {
  const theme = useTheme();
  const { t } = useLocale();

  // Opcoes compartilhadas via studioOptions
  const paceOptions = useMemo(() => createPaceOptions(t), [t]);
  const visualFrameworkOptions = useMemo(() => createVisualFrameworkOptions(t), [t]);
  const sceneRatioOptions = useMemo(() => createSceneRatioOptions(t), [t]);
  const densityOptions = useMemo(() => createDensityOptions(t), [t]);

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
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Limpa timer de warning de imagem ao desmontar
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    };
  }, []);

  const isVoiceOpen = !isVoiceCollapsed;
  const isDirectionOpen = !isDirectionCollapsed;
  const activeSpeakerName = activeVoiceTab === 'A' ? speakerAName : speakerBName;
  const selectedPrimaryVoice = useMemo(
    () => VOICES.find((voice) => voice.id === selectedVoice)?.name ?? selectedVoice,
    [selectedVoice],
  );
  const selectedSecondaryVoice = useMemo(
    () => VOICES.find((voice) => voice.id === speakerBVoice)?.name ?? speakerBVoice,
    [speakerBVoice],
  );
  const paceLabel = useMemo(
    () => paceOptions.find((option) => option.value === pace)?.label ?? pace,
    [pace, paceOptions],
  );
  const ratioLabel = useMemo(
    () => sceneRatioOptions.find((option) => option.value === sceneRatio)?.label ?? sceneRatio,
    [sceneRatio, sceneRatioOptions],
  );
  const densityLabel = useMemo(
    () => densityOptions.find((option) => option.value === sceneDensity)?.label ?? `${sceneDensity}`,
    [densityOptions, sceneDensity],
  );
  const voiceSummaryItems = useMemo(() => {
    const items = [selectedPrimaryVoice];

    if (isMultiSpeaker) {
      items.push(t('studio.inspector.summary.podcast'));
      items.push(`${compactSummary(speakerAName || 'A')} + ${compactSummary(speakerBName || 'B')}`);
      items.push(`${selectedPrimaryVoice} / ${selectedSecondaryVoice}`);
    }

    return items;
  }, [isMultiSpeaker, selectedPrimaryVoice, selectedSecondaryVoice, speakerAName, speakerBName, t]);
  const directionSummaryItems = useMemo(() => {
    const items = [paceLabel];

    if (audioProfile.trim()) {
      items.push(compactSummary(audioProfile));
    }

    if (generateScenes) {
      items.push(t('studio.inspector.summary.scenesOn'));
      items.push(compactSummary(ratioLabel, 26));
      items.push(compactSummary(densityLabel, 22));
    } else {
      items.push(t('studio.inspector.summary.scenesOff'));
    }

    return items;
  }, [audioProfile, densityLabel, generateScenes, paceLabel, ratioLabel, t]);

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
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      warningTimerRef.current = setTimeout(() => {
        setReferenceImageWarning(null);
        warningTimerRef.current = null;
      }, 5000);
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
      <StackedHeader
        variant="glass"
        collapsible
        expanded={isVoiceOpen}
        onToggle={() => setIsVoiceCollapsed((prev) => !prev)}
        collapseId={voiceSectionId}
        icon={<GraphicEq sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('studio.inspector.voiceSection.title')}
        description={t('studio.inspector.voiceSection.description')}
        summary={voiceSummaryItems.map((item) => (
          <Chip
            key={item}
            label={item}
            size="small"
            variant="outlined"
            sx={{
              bgcolor: alpha(theme.palette.common.white, 0.03),
              borderColor: alpha(theme.palette.common.white, 0.08),
            }}
          />
        ))}
        control={
          <Chip
            label={t('studio.inspector.voiceSection.optionsCount', { count: VOICES.length })}
            size="small"
            variant="outlined"
          />
        }
      >
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
              <span dangerouslySetInnerHTML={{ __html: t('studio.inspector.podcast.editorHint', { name: escapeHtml(activeSpeakerName) || `Voz ${activeVoiceTab}` }) }} />
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
                <VoiceCard
                  voice={voice}
                  isSelected={isActiveVoice}
                  onSelect={(voiceId) => (activeVoiceTab === 'A' ? setSelectedVoice(voiceId) : setSpeakerBVoice(voiceId))}
                  isPlaying={isPlaying}
                  hasError={hasError}
                  onPlayPreview={playPreview}
                  previewVoiceLabel={t('studio.inspector.voiceSelection.previewVoice', { voice: voice.name })}
                  previewErrorLabel={t('studio.inspector.voiceSelection.previewError')}
                  disabled={isGenerating}
                />
              </Grid>
            );
          })}
        </Grid>
      </StackedHeader>

      <StackedHeader
        variant="glass"
        collapsible
        expanded={isDirectionOpen}
        onToggle={() => setIsDirectionCollapsed((prev) => !prev)}
        collapseId={directionSectionId}
        icon={<Settings sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('studio.inspector.directionSection.title')}
        description={t('studio.inspector.directionSection.description')}
        summary={directionSummaryItems.map((item) => (
          <Chip
            key={item}
            label={item}
            size="small"
            variant="outlined"
            sx={{
              bgcolor: alpha(theme.palette.common.white, 0.03),
              borderColor: alpha(theme.palette.common.white, 0.08),
            }}
          />
        ))}
      >
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
                    <StackedHeader
                      variant="alert"
                      severity="warning"
                      title={t('common.warning')}
                      description={referenceImageWarning}
                      onClose={() => setReferenceImageWarning(null)}
                      slotProps={{ root: { sx: { borderRadius: 2 } } }}
                    />
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
      </StackedHeader>
    </Stack>
  );
});

