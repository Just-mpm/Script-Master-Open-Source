import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import GraphicEq from '@mui/icons-material/GraphicEq';
import MovieFilter from '@mui/icons-material/MovieFilter';
import People from '@mui/icons-material/People';
import SpeedIcon from '@mui/icons-material/Speed';
import { VOICES } from '../lib/constants';
import { useVoicePreviews } from '../hooks/useVoicePreviews';
import type { SceneRatio, EmotionType } from '../features/studio/types';
import { EmotionSelector } from '../features/studio/components/EmotionSelector';
import { getInitialStudioConfig, saveStudioDefaults, clearStudioDefaults } from '../features/studio/store/studio.utils';
import { useStudioStore } from '../features/studio/store';
import { glassPanelSx, insetPanelSx } from '../theme/surfaces';
import { ICON_SIZE_MD, GAP_COMPACT, GAP_DEFAULT } from '../theme/tokens';
import { useLocale } from '../features/i18n';
import { LOCALE_CONFIGS } from '../features/i18n/locales';
import type { Locale } from '../features/i18n/types';
import { VoiceCard } from './VoiceCard';
import { createPaceOptions, createVisualFrameworkOptions, createSceneRatioOptions, createDensityOptions } from '../data/studioOptions';

// ─── Types ──────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  sectionId: string;
  children: React.ReactNode;
}

// ─── Section Colapsavel ─────────────────────────────────────

function CollapsibleSection({ icon, title, description, sectionId, children }: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Paper elevation={0} sx={glassPanelSx}>
      <ButtonBase
        component="button"
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls={sectionId}
        sx={{
          width: '100%',
          px: { xs: 2.5, md: 3 },
          py: 2,
          textAlign: 'left',
          borderRadius: { xs: 3, md: 4 },
          transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
        }}
      >
        <Stack direction="row" sx={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack spacing={GAP_COMPACT}>
            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
              {icon}
              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                {title}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {description}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
            {!isExpanded ? <ExpandMore sx={{ fontSize: ICON_SIZE_MD }} /> : <ExpandLess sx={{ fontSize: ICON_SIZE_MD }} />}
          </Stack>
        </Stack>
      </ButtonBase>

      <Collapse in={isExpanded} timeout="auto" id={sectionId}>
        <Stack spacing={2} sx={{ px: { xs: 2.5, md: 3 }, pb: { xs: 2.5, md: 3 } }}>
          <Paper elevation={0} sx={(t) => ({ ...insetPanelSx(t), p: 2 })}>
            <Stack spacing={2}>
              {children}
            </Stack>
          </Paper>
        </Stack>
      </Collapse>
    </Paper>
  );
}

// ─── Componente Principal ────────────────────────────────────

export function Configuracoes() {
  const theme = useTheme();
  const { t } = useLocale();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const {
    playingId,
    errorId,
    playPreview,
  } = useVoicePreviews();

  const initial = useMemo(() => getInitialStudioConfig(), []);

  const [voice, setVoice] = useState(initial.selectedVoice);
  const [speakerAName, setSpeakerAName] = useState(initial.speakerAName);
  const [audioProfile, setAudioProfile] = useState(initial.audioProfile);
  const [scene, setScene] = useState(initial.scene);
  const [styleNotes, setStyleNotes] = useState(initial.styleNotes);
  const [pace, setPace] = useState(initial.pace);
  const [generateScenes, setGenerateScenes] = useState(initial.generateScenes);
  const [sceneDensity, setSceneDensity] = useState(initial.sceneDensity);
  const [sceneRatio, setSceneRatio] = useState<SceneRatio>(initial.sceneRatio);
  const [visualFramework, setVisualFramework] = useState(initial.visualFramework);
  const [emotion, setEmotion] = useState<EmotionType>(initial.emotion);
  const [emotionIntensity, setEmotionIntensity] = useState(initial.emotionIntensity);
  const [imageTextLanguage, setImageTextLanguage] = useState<Locale>(initial.imageTextLanguage);
  const [isMultiSpeaker, setIsMultiSpeaker] = useState(initial.isMultiSpeaker);
  const [speakerBName, setSpeakerBName] = useState(initial.speakerBName);
  const [speakerBVoice, setSpeakerBVoice] = useState(initial.speakerBVoice);

  // Opcoes compartilhadas via studioOptions
  const paceOptions = useMemo(() => createPaceOptions(t), [t]);
  const visualFrameworkOptions = useMemo(() => createVisualFrameworkOptions(t), [t]);
  const sceneRatioOptions = useMemo(() => createSceneRatioOptions(t), [t]);
  const densityOptions = useMemo(() => createDensityOptions(t), [t]);

  const localeOptions: Array<{ value: Locale; label: string }> = LOCALE_CONFIGS.map((c) => ({
    value: c.code,
    label: `${c.flag} ${c.label}`,
  }));

  const handleEmotionChange = useCallback((newEmotion: EmotionType, newIntensity: number) => {
    setEmotion(newEmotion);
    setEmotionIntensity(newIntensity);
  }, []);

  const handleSave = useCallback(() => {
    saveStudioDefaults({
      selectedVoice: voice,
      speakerAName,
      speakerBName,
      speakerBVoice,
      audioProfile,
      scene,
      styleNotes,
      pace,
      generateScenes,
      sceneDensity,
      sceneRatio,
      visualFramework,
      emotion,
      emotionIntensity,
      imageTextLanguage,
      isMultiSpeaker,
    });
    setToast(t('configuracoes.saved'));
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  }, [voice, speakerAName, speakerBName, speakerBVoice, audioProfile, scene, styleNotes, pace, generateScenes, sceneDensity, sceneRatio, visualFramework, emotion, emotionIntensity, imageTextLanguage, isMultiSpeaker, t]);

  // Limpa timer de toast ao desmontar
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  const handleReset = useCallback(() => {
    clearStudioDefaults();
    useStudioStore.getState().reset();
    setResetConfirmOpen(false);

    const fresh = getInitialStudioConfig();
    setVoice(fresh.selectedVoice);
    setSpeakerAName(fresh.speakerAName);
    setAudioProfile(fresh.audioProfile);
    setScene(fresh.scene);
    setStyleNotes(fresh.styleNotes);
    setPace(fresh.pace);
    setGenerateScenes(fresh.generateScenes);
    setSceneDensity(fresh.sceneDensity);
    setSceneRatio(fresh.sceneRatio);
    setVisualFramework(fresh.visualFramework);
    setEmotion(fresh.emotion);
    setEmotionIntensity(fresh.emotionIntensity);
    setImageTextLanguage(fresh.imageTextLanguage);
    setIsMultiSpeaker(fresh.isMultiSpeaker);
    setSpeakerBName(fresh.speakerBName);
    setSpeakerBVoice(fresh.speakerBVoice);
  }, []);

  return (
    <Stack spacing={3}>
      <Stack spacing={GAP_COMPACT}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('configuracoes.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('configuracoes.subtitle')}
        </Typography>
      </Stack>

      {toast && (
        <Alert severity="success" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      )}

      {/* -- Secao Voz -- */}
      <CollapsibleSection
        icon={<GraphicEq sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('configuracoes.sectionVoice')}
        description={t('configuracoes.voiceLabel')}
        sectionId="config-voice"
      >
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {t('configuracoes.voiceLabel')}
        </Typography>
        <Grid container spacing={1.5} role="listbox" aria-label={t('configuracoes.voiceLabel')}>
          {VOICES.map((v) => (
            <Grid key={v.id} size={{ xs: 12, sm: 6 }}>
              <VoiceCard
                voice={v}
                isSelected={voice === v.id}
                onSelect={setVoice}
                isPlaying={playingId === v.id}
                hasError={errorId === v.id}
                onPlayPreview={playPreview}
                previewVoiceLabel={t('studio.inspector.voiceSelection.previewVoice', { voice: v.name })}
                previewErrorLabel={t('studio.inspector.voiceSelection.previewError')}
              />
            </Grid>
          ))}
        </Grid>
      </CollapsibleSection>

      {/* -- Secao Persona e Direcao -- */}
      <CollapsibleSection
        icon={<SpeedIcon sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('configuracoes.sectionPersona')}
        description={t('configuracoes.personaNameLabel')}
        sectionId="config-persona"
      >
        <TextField
          fullWidth size="small"
          label={t('configuracoes.personaNameLabel')}
          value={speakerAName}
          onChange={(e) => setSpeakerAName(e.target.value)}
        />
        {/* WARNING-2/3: TextField livre em vez de Select fixo -- consistente com Inspector */}
        <TextField
          fullWidth size="small"
          label={t('configuracoes.profileLabel')}
          value={audioProfile}
          onChange={(e) => setAudioProfile(e.target.value)}
          placeholder={t('studio.inspector.directionFields.characterPlaceholder')}
          helperText={!audioProfile ? t('studio.inspector.directionFields.characterHelper') : undefined}
        />
        <TextField
          fullWidth size="small"
          label={t('configuracoes.sceneLabel')}
          value={scene}
          onChange={(e) => setScene(e.target.value)}
        />
        <TextField
          fullWidth size="small"
          label={t('configuracoes.styleNotesLabel')}
          value={styleNotes}
          onChange={(e) => setStyleNotes(e.target.value)}
          multiline rows={2}
        />
        <FormControl fullWidth size="small">
          <InputLabel>{t('configuracoes.paceLabel')}</InputLabel>
          <Select value={pace} label={t('configuracoes.paceLabel')} onChange={(e) => setPace(e.target.value)}>
            {paceOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        <EmotionSelector value={emotion} intensity={emotionIntensity} onChange={handleEmotionChange} />
      </CollapsibleSection>

      {/* -- Secao Cenas e Imagens -- */}
      <CollapsibleSection
        icon={<MovieFilter sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('configuracoes.sectionScenes')}
        description={t('configuracoes.generateScenesLabel')}
        sectionId="config-scenes"
      >
        {/* WARNING-1: aria-label adicionado ao Switch */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2">{t('configuracoes.generateScenesLabel')}</Typography>
          <Switch
            checked={generateScenes}
            onChange={(e) => setGenerateScenes(e.target.checked)}
            slotProps={{ input: { 'aria-label': t('configuracoes.generateScenesLabel') } }}
          />
        </Stack>
        <FormControl fullWidth size="small">
          <InputLabel>{t('configuracoes.sceneDensityLabel')}</InputLabel>
          <Select value={sceneDensity} label={t('configuracoes.sceneDensityLabel')} onChange={(e) => setSceneDensity(Number(e.target.value))}>
            {densityOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>{t('configuracoes.sceneRatioLabel')}</InputLabel>
          <Select value={sceneRatio} label={t('configuracoes.sceneRatioLabel')} onChange={(e) => setSceneRatio(e.target.value as SceneRatio)}>
            {sceneRatioOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>{t('configuracoes.visualFrameworkLabel')}</InputLabel>
          <Select value={visualFramework} label={t('configuracoes.visualFrameworkLabel')} onChange={(e) => setVisualFramework(e.target.value)}>
            {visualFrameworkOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>{t('configuracoes.imageTextLanguageLabel')}</InputLabel>
          <Select value={imageTextLanguage} label={t('configuracoes.imageTextLanguageLabel')} onChange={(e) => setImageTextLanguage(e.target.value as Locale)}>
            {localeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
      </CollapsibleSection>

      {/* -- Secao Multi-locutor -- */}
      <CollapsibleSection
        icon={<People sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('configuracoes.sectionMultiSpeaker')}
        description={t('configuracoes.multiSpeakerLabel')}
        sectionId="config-multispeaker"
      >
        {/* WARNING-1: aria-label adicionado ao Switch */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2">{t('configuracoes.multiSpeakerLabel')}</Typography>
          <Switch
            checked={isMultiSpeaker}
            onChange={(e) => setIsMultiSpeaker(e.target.checked)}
            slotProps={{ input: { 'aria-label': t('configuracoes.multiSpeakerLabel') } }}
          />
        </Stack>
        {isMultiSpeaker && (
          <>
            <Divider />
            <TextField
              fullWidth size="small"
              label={t('configuracoes.speakerBNameLabel')}
              value={speakerBName}
              onChange={(e) => setSpeakerBName(e.target.value)}
            />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {t('configuracoes.speakerBVoiceLabel')}
            </Typography>
            <Grid container spacing={1.5} role="listbox" aria-label={t('configuracoes.speakerBVoiceLabel')}>
              {VOICES.map((v) => (
                <Grid key={v.id} size={{ xs: 12, sm: 6 }}>
                  <VoiceCard
                    voice={v}
                    isSelected={speakerBVoice === v.id}
                    onSelect={setSpeakerBVoice}
                    isPlaying={playingId === v.id}
                    hasError={errorId === v.id}
                    onPlayPreview={playPreview}
                    previewVoiceLabel={t('studio.inspector.voiceSelection.previewVoice', { voice: v.name })}
                    previewErrorLabel={t('studio.inspector.voiceSelection.previewError')}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </CollapsibleSection>

      {/* -- Botoes de acao -- */}
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', pt: 1 }}>
        {resetConfirmOpen ? (
          <Alert
            severity="warning"
            action={
              <Stack direction="row" spacing={1}>
                {/* WARNING-4: "Cancelar" substituido por t('common.cancel') */}
                <Button size="small" color="inherit" onClick={() => setResetConfirmOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button size="small" color="warning" variant="contained" onClick={handleReset}>
                  {t('configuracoes.reset')}
                </Button>
              </Stack>
            }
          >
            {t('configuracoes.resetConfirm')}
          </Alert>
        ) : (
          <Button
            variant="outlined"
            color="warning"
            onClick={() => setResetConfirmOpen(true)}
          >
            {t('configuracoes.reset')}
          </Button>
        )}
        <Button variant="contained" onClick={handleSave}>
          {t('configuracoes.save')}
        </Button>
      </Stack>
    </Stack>
  );
}
