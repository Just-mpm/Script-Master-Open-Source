import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import { alpha, useTheme } from '@mui/material/styles';
import GraphicEq from '@mui/icons-material/GraphicEq';
import MovieFilter from '@mui/icons-material/MovieFilter';
import People from '@mui/icons-material/People';
import SpeedIcon from '@mui/icons-material/Speed';
import Language from '@mui/icons-material/Language';
import { VOICES } from '../lib/constants';
import { useVoicePreviews } from '../hooks/useVoicePreviews';
import type { SceneRatio, EmotionType } from '../features/studio/types';
import { EmotionSelector } from '../features/studio/components/EmotionSelector';
import { getInitialStudioConfig, saveStudioDefaults, clearStudioDefaults } from '../features/studio/store/studio.utils';
import { useStudioStore } from '../features/studio/store';
import { glassPanelSx, insetPanelSx } from '../theme/surfaces';
import { ICON_SIZE_MD, GAP_COMPACT, GAP_RELAXED } from '../theme/tokens';
import { useLocale } from '../features/i18n';
import { LOCALE_CONFIGS } from '../features/i18n/locales';
import type { Locale } from '../features/i18n/types';
import { StackedHeader } from './ui';
import { useCollapsibleSection } from '../hooks/useCollapsibleSection';
import { VoiceCard } from './VoiceCard';
import { createPaceOptions, createVisualFrameworkOptions, createSceneRatioOptions, createDensityOptions } from '../data/studioOptions';
import { useAuth } from '../contexts/AuthContext';
import { saveUserSettings } from '../lib/db';
import { createLogger } from '../lib/logger';
import { ProviderSettingsSection } from '../features/provider-settings';

// ─── Types ──────────────────────────────────────────────────

const log = createLogger('Configuracoes');

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  sectionId: string;
  summary?: React.ReactNode;
  children: React.ReactNode;
}

interface SettingsSnapshot {
  selectedVoice: string;
  speakerAName: string;
  speakerBName: string;
  speakerBVoice: string;
  audioProfile: string;
  scene: string;
  styleNotes: string;
  pace: string;
  generateScenes: boolean;
  sceneDensity: number;
  sceneRatio: SceneRatio;
  visualFramework: string;
  emotion: EmotionType;
  emotionIntensity: number;
  imageTextLanguage: Locale;
  isMultiSpeaker: boolean;
}

function compactSummary(text: string, maxLength = 28): string {
  const normalized = text.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

// ─── Section Colapsavel ─────────────────────────────────────

function CollapsibleSection({ icon, title, description, sectionId, summary, children }: SectionProps) {
  const { expanded, onToggle } = useCollapsibleSection(true);

  return (
    <StackedHeader
      variant="glass"
      collapsible
      expanded={expanded}
      onToggle={onToggle}
      collapseId={sectionId}
      icon={icon}
      title={title}
      description={description}
      summary={summary}
      summaryAlwaysVisible
    >
      <Paper elevation={0} sx={(t) => ({ ...insetPanelSx(t), p: 2 })}>
        <Stack spacing={2}>
          {children}
        </Stack>
      </Paper>
    </StackedHeader>
  );
}

// ─── Componente Principal ────────────────────────────────────

export function Configuracoes() {
  const theme = useTheme();
  const { t, locale, setLocale } = useLocale();
  const { user } = useAuth();
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

  const currentSnapshot = useMemo<SettingsSnapshot>(() => ({
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
  }), [
    audioProfile,
    emotion,
    emotionIntensity,
    generateScenes,
    imageTextLanguage,
    isMultiSpeaker,
    pace,
    scene,
    sceneDensity,
    sceneRatio,
    speakerAName,
    speakerBName,
    speakerBVoice,
    styleNotes,
    visualFramework,
    voice,
  ]);

  const [savedSnapshot, setSavedSnapshot] = useState<SettingsSnapshot>(() => currentSnapshot);

  const selectedVoiceOption = useMemo(
    () => VOICES.find((item) => item.id === voice) ?? VOICES[0],
    [voice],
  );
  const speakerBVoiceOption = useMemo(
    () => VOICES.find((item) => item.id === speakerBVoice) ?? VOICES[0],
    [speakerBVoice],
  );
  const paceLabel = useMemo(
    () => paceOptions.find((item) => item.value === pace)?.label ?? pace,
    [pace, paceOptions],
  );
  const densityLabel = useMemo(
    () => densityOptions.find((item) => item.value === sceneDensity)?.label ?? String(sceneDensity),
    [densityOptions, sceneDensity],
  );
  const ratioLabel = useMemo(
    () => sceneRatioOptions.find((item) => item.value === sceneRatio)?.label ?? sceneRatio,
    [sceneRatio, sceneRatioOptions],
  );
  const visualFrameworkLabel = useMemo(
    () => visualFrameworkOptions.find((item) => item.value === visualFramework)?.label ?? visualFramework,
    [visualFramework, visualFrameworkOptions],
  );
  const imageLanguageLabel = useMemo(
    () => localeOptions.find((item) => item.value === imageTextLanguage)?.label ?? imageTextLanguage,
    [imageTextLanguage, localeOptions],
  );
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(currentSnapshot) !== JSON.stringify(savedSnapshot),
    [currentSnapshot, savedSnapshot],
  );

  const voiceSummary = useMemo(() => [
    selectedVoiceOption.name,
    t(`common.voiceStyles.${selectedVoiceOption.styleKey}`),
  ], [selectedVoiceOption.name, selectedVoiceOption.styleKey, t]);

  const personaSummary = useMemo(() => {
    const items = [paceLabel, emotionIntensity > 0 ? t(`studio.emotion.options.${emotion}`) : ''];
    if (speakerAName.trim()) {
      items.unshift(compactSummary(speakerAName, 22));
    }
    if (audioProfile.trim()) {
      items.push(compactSummary(audioProfile, 24));
    }
    return items.filter(Boolean);
  }, [audioProfile, emotion, emotionIntensity, paceLabel, speakerAName, t]);

  const scenesSummary = useMemo(() => {
    if (!generateScenes) {
      return [t('configuracoes.summary.scenesOff')];
    }
    return [densityLabel, ratioLabel, compactSummary(visualFrameworkLabel, 30), compactSummary(imageLanguageLabel, 24)];
  }, [densityLabel, generateScenes, imageLanguageLabel, ratioLabel, t, visualFrameworkLabel]);

  const multiSpeakerSummary = useMemo(() => {
    if (!isMultiSpeaker) {
      return [t('configuracoes.summary.multiSpeakerOff')];
    }
    return [
      t('configuracoes.summary.multiSpeakerOn'),
      speakerBName.trim() ? compactSummary(speakerBName, 18) : t('configuracoes.summary.secondSpeakerDefault'),
      speakerBVoiceOption.name,
    ];
  }, [isMultiSpeaker, speakerBName, speakerBVoiceOption.name, t]);

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
    setSavedSnapshot(currentSnapshot);

    // Salva imediatamente no Firestore (se logado)
    if (user) {
      saveUserSettings(
        '',
        user.uid,
        undefined,
        {
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
        },
      ).then(() => {
        setToast(t('configuracoes.saved'));
      }).catch((err: unknown) => {
        log.error('Falha ao salvar configurações no Firestore', { error: err });
        // localStorage salvou com sucesso — mostra toast mesmo assim
        setToast(t('configuracoes.saved'));
      });
    } else {
      setToast(t('configuracoes.saved'));
    }

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  }, [audioProfile, currentSnapshot, emotion, emotionIntensity, generateScenes, imageTextLanguage, isMultiSpeaker, pace, scene, sceneDensity, sceneRatio, speakerAName, speakerBName, speakerBVoice, styleNotes, t, user, visualFramework, voice]);

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
      setSavedSnapshot({
        selectedVoice: fresh.selectedVoice,
        speakerAName: fresh.speakerAName,
        speakerBName: fresh.speakerBName,
        speakerBVoice: fresh.speakerBVoice,
        audioProfile: fresh.audioProfile,
        scene: fresh.scene,
        styleNotes: fresh.styleNotes,
        pace: fresh.pace,
        generateScenes: fresh.generateScenes,
        sceneDensity: fresh.sceneDensity,
        sceneRatio: fresh.sceneRatio,
        visualFramework: fresh.visualFramework,
        emotion: fresh.emotion,
        emotionIntensity: fresh.emotionIntensity,
        imageTextLanguage: fresh.imageTextLanguage,
        isMultiSpeaker: fresh.isMultiSpeaker,
      });

    // Persistir valores default no Firestore (se logado) para evitar
    // que a próxima carga restaure os valores antigos do Firestore
    if (user) {
      saveUserSettings(
        '',
        user.uid,
        undefined,
        {
          selectedVoice: fresh.selectedVoice,
          isMultiSpeaker: fresh.isMultiSpeaker,
          speakerAName: fresh.speakerAName,
          speakerBName: fresh.speakerBName,
          speakerBVoice: fresh.speakerBVoice,
          audioProfile: fresh.audioProfile,
          scene: fresh.scene,
          styleNotes: fresh.styleNotes,
          pace: fresh.pace,
          generateScenes: fresh.generateScenes,
          sceneDensity: fresh.sceneDensity,
          sceneRatio: fresh.sceneRatio,
          visualFramework: fresh.visualFramework,
          emotion: fresh.emotion,
          emotionIntensity: fresh.emotionIntensity,
          imageTextLanguage: fresh.imageTextLanguage,
        },
      ).catch((err: unknown) => {
        log.error('Falha ao resetar configurações no Firestore', { error: err });
      });
    }
  }, [user]);

  return (
    <Stack spacing={GAP_RELAXED}>
      <Stack spacing={GAP_COMPACT}>
        <Typography variant="h1" sx={{ fontWeight: 700, fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
          {t('configuracoes.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('configuracoes.subtitle')}
        </Typography>
      </Stack>

      <Collapse in={hasUnsavedChanges} timeout={300}>
      <Paper
        elevation={0}
        sx={(currentTheme) => ({
          ...glassPanelSx(currentTheme),
          px: { xs: 2.5, md: 3 },
          py: 2.5,
          borderColor: alpha(currentTheme.palette.primary.main, 0.18),
          background: `linear-gradient(135deg, ${alpha(currentTheme.palette.primary.main, 0.12)} 0%, ${alpha(currentTheme.palette.background.paper, 0.82)} 100%)`,
        })}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('configuracoes.summary.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760 }}>
            {t('configuracoes.summary.description')}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Chip
              size="small"
              color={hasUnsavedChanges ? 'warning' : 'success'}
              label={hasUnsavedChanges ? t('configuracoes.summary.pending') : t('configuracoes.summary.synced')}
            />
            <Chip
              size="small"
              variant="outlined"
              label={user ? t('configuracoes.summary.cloud') : t('configuracoes.summary.local')}
            />
            <Chip size="small" variant="outlined" label={t('configuracoes.summary.sections')} />
          </Stack>
        </Stack>
      </Paper>
      </Collapse>

      {/* -- Seção BYOK (API Gemini) -- */}
      <ProviderSettingsSection />

      {/* -- Secao Voz -- */}
      <CollapsibleSection
        icon={<GraphicEq sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('configuracoes.sectionVoice')}
        description={t('configuracoes.voiceLabel')}
        sectionId="config-voice"
        summary={voiceSummary.map((item) => (
          <Chip key={item} size="small" variant="outlined" label={item} />
        ))}
      >
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {t('configuracoes.voiceLabel')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('configuracoes.voiceHint')}
        </Typography>
        <Box
          sx={{
            maxHeight: { xs: 'none', lg: 560 },
            overflowY: { xs: 'visible', lg: 'auto' },
            pr: { xs: 0, lg: 1 },
          }}
        >
          <Grid container spacing={1.5} role="listbox" aria-label={t('configuracoes.voiceLabel')}>
            {VOICES.map((v) => (
              <Grid key={v.id} size={{ xs: 12, sm: 6 }}>
                <VoiceCard
                  voice={v}
                  isSelected={voice === v.id }
                  onSelect={setVoice}
                  isPlaying={playingId === v.id }
                  hasError={errorId === v.id }
                  onPlayPreview={playPreview}
                  previewVoiceLabel={t('studio.inspector.voiceSelection.previewVoice', { voice: v.name })}
                  previewErrorLabel={t('studio.inspector.voiceSelection.previewError')}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </CollapsibleSection>

      {/* -- Secao Persona e Direcao -- */}
      <CollapsibleSection
        icon={<SpeedIcon sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('configuracoes.sectionPersona')}
        description={t('configuracoes.personaNameLabel')}
        sectionId="config-persona"
        summary={personaSummary.map((item) => (
          <Chip key={item} size="small" variant="outlined" label={item} />
        ))}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              label={t('configuracoes.personaNameLabel')}
              value={speakerAName}
              onChange={(e) => setSpeakerAName(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="config-pace-label">{t('configuracoes.paceLabel')}</InputLabel>
              <Select labelId="config-pace-label" value={pace} label={t('configuracoes.paceLabel')} onChange={(e) => setPace(e.target.value)}>
                {paceOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              label={t('configuracoes.profileLabel')}
              value={audioProfile}
              onChange={(e) => setAudioProfile(e.target.value)}
              placeholder={t('studio.inspector.directionFields.characterPlaceholder')}
              helperText={!audioProfile ? t('studio.inspector.directionFields.characterHelper') : undefined }
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              label={t('configuracoes.sceneLabel')}
              value={scene}
              onChange={(e) => setScene(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label={t('configuracoes.styleNotesLabel')}
              value={styleNotes}
              onChange={(e) => setStyleNotes(e.target.value)}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
        <EmotionSelector value={emotion} intensity={emotionIntensity} onChange={handleEmotionChange} />
      </CollapsibleSection>

      {/* -- Secao Cenas e Imagens -- */}
      <CollapsibleSection
        icon={<MovieFilter sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('configuracoes.sectionScenes')}
        description={t('configuracoes.generateScenesLabel')}
        sectionId="config-scenes"
        summary={scenesSummary.map((item) => (
          <Chip key={item} size="small" variant="outlined" label={item} />
        ))}
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
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="config-density-label">{t('configuracoes.sceneDensityLabel')}</InputLabel>
              <Select labelId="config-density-label" value={sceneDensity} label={t('configuracoes.sceneDensityLabel')} onChange={(e) => setSceneDensity(Number(e.target.value))}>
                {densityOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="config-ratio-label">{t('configuracoes.sceneRatioLabel')}</InputLabel>
              <Select labelId="config-ratio-label" value={sceneRatio} label={t('configuracoes.sceneRatioLabel')} onChange={(e) => setSceneRatio(e.target.value as SceneRatio)}>
                {sceneRatioOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="config-framework-label">{t('configuracoes.visualFrameworkLabel')}</InputLabel>
              <Select labelId="config-framework-label" value={visualFramework} label={t('configuracoes.visualFrameworkLabel')} onChange={(e) => setVisualFramework(e.target.value)}>
                {visualFrameworkOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="config-language-label">{t('configuracoes.imageTextLanguageLabel')}</InputLabel>
              <Select labelId="config-language-label" value={imageTextLanguage} label={t('configuracoes.imageTextLanguageLabel')} onChange={(e) => setImageTextLanguage(e.target.value as Locale)}>
                {localeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CollapsibleSection>

      {/* -- Secao Multi-locutor -- */}
      <CollapsibleSection
        icon={<People sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('configuracoes.sectionMultiSpeaker')}
        description={t('configuracoes.multiSpeakerLabel')}
        sectionId="config-multispeaker"
        summary={multiSpeakerSummary.map((item) => (
          <Chip key={item} size="small" variant="outlined" label={item} />
        ))}
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
                    isSelected={speakerBVoice === v.id }
                    onSelect={setSpeakerBVoice}
                    isPlaying={playingId === v.id }
                    hasError={errorId === v.id }
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

      {/* -- Secao Idioma da Interface -- */}
      <CollapsibleSection
        icon={<Language sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
        title={t('configuracoes.sectionLanguage')}
        description={t('configuracoes.languageDescription')}
        sectionId="config-language"
        summary={
          <Chip
            size="small"
            variant="outlined"
            label={localeOptions.find((o) => o.value === locale)?.label ?? locale }
          />
        }
      >
        <FormControl fullWidth size="small">
          <InputLabel id="config-interface-locale-label">{t('configuracoes.interfaceLocaleLabel')}</InputLabel>
          <Select
            labelId="config-interface-locale-label"
            value={locale}
            label={t('configuracoes.interfaceLocaleLabel')}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {localeOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </CollapsibleSection>

      {/* -- Botoes de acao -- */}
      <Paper
        elevation={0}
        sx={(currentTheme) => ({
          ...glassPanelSx(currentTheme),
          position: 'sticky',
          bottom: 16,
          zIndex: 12,
          px: { xs: 2, md: 2.5 },
          py: 1.5,
          borderColor: alpha(currentTheme.palette.common.white, 0.12),
          backgroundColor: alpha(currentTheme.palette.background.paper, 0.88),
          backdropFilter: 'blur(18px)',
        })}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { xs: 'stretch', lg: 'center' }, justifyContent: 'space-between' }}
          useFlexGap
        >
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
              <Chip
                size="small"
                color={hasUnsavedChanges ? 'warning' : 'success'}
                label={hasUnsavedChanges ? t('configuracoes.summary.pending') : t('configuracoes.summary.synced')}
              />
              <Typography variant="body2" color="text.secondary">
                {t('configuracoes.footerHint')}
              </Typography>
            </Stack>
            {toast ? (
              <StackedHeader
                variant="alert"
                severity="success"
                title={t('common.success')}
                description={toast}
                onClose={() => setToast(null)}
                slotProps={{ root: { sx: { py: 0 } } }}
              />
            ) : null }
            {resetConfirmOpen ? (
              <StackedHeader
                variant="alert"
                severity="warning"
                title={t('common.warning')}
                description={t('configuracoes.resetConfirm')}
                action={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" color="inherit" onClick={() => setResetConfirmOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button size="small" color="warning" variant="contained" onClick={handleReset}>
                      {t('configuracoes.reset')}
                    </Button>
                  </Stack>
                }
                actionPlacement="stack"
                actionAlign="end"
              />
            ) : null }
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexShrink: 0 }}>
            {!resetConfirmOpen ? (
              <Button
                variant="outlined"
                color="warning"
                onClick={() => setResetConfirmOpen(true)}
              >
                {t('configuracoes.reset')}
              </Button>
            ) : null }
            <Button variant="contained" onClick={handleSave}>
              {t('configuracoes.save')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
