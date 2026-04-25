import React, { useEffect, useState } from 'react';
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
import { glassPanelSx, insetPanelSx } from '../theme/surfaces';
import { ICON_SIZE_SM, ICON_SIZE_MD, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, RADIUS_SM, RADIUS_XS, BRAND_PRIMARY_GLOW_SOFT } from '../theme/tokens';

const MAX_STYLE_NOTES = 500;

interface InspectorProps {
  isMultiSpeaker: boolean;
  setIsMultiSpeaker: (val: boolean) => void;
  speakerAName: string;
  setSpeakerAName: (val: string) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  speakerBName: string;
  setSpeakerBName: (val: string) => void;
  speakerBVoice: string;
  setSpeakerBVoice: (voice: string) => void;
  audioProfile: string;
  setAudioProfile: (profile: string) => void;
  scene: string;
  setScene: (scene: string) => void;
  pace: string;
  setPace: (pace: string) => void;
  styleNotes: string;
  setStyleNotes: (notes: string) => void;
  isGenerating: boolean;
  generateScenes: boolean;
  setGenerateScenes: (generate: boolean) => void;
  sceneDensity: number;
  setSceneDensity: (density: number) => void;
  sceneRatio: SceneRatio;
  setSceneRatio: (ratio: SceneRatio) => void;
  visualFramework: string;
  setVisualFramework: (framework: string) => void;
  referenceImage: string | null;
  setReferenceImage: (img: string | null) => void;
}

type VoiceTabValue = 'A' | 'B';

const PACE_OPTIONS = [
  { value: 'very_slow', label: 'Muito Lento' },
  { value: 'slow', label: 'Lento' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Rápido' },
  { value: 'very_fast', label: 'Muito Rápido' },
] as const;

const VISUAL_FRAMEWORK_OPTIONS = [
  { value: 'general', label: 'Cenário padrão (arte guiada pelo roteiro)' },
  { value: 'whiteboard', label: 'Whiteboard Master (desenho com legendas)' },
] as const;

const SCENE_RATIO_OPTIONS: Array<{ value: SceneRatio; label: string }> = [
  { value: '16:9', label: 'YouTube (16:9 horizontal)' },
  { value: '9:16', label: 'Shorts/TikTok (9:16 vertical)' },
  { value: '1:1', label: 'Instagram (1:1 quadrado)' },
];

const DENSITY_OPTIONS = [
  { value: 15, label: 'Muito rápido (15s)' },
  { value: 30, label: 'Dinâmico (30s)' },
  { value: 60, label: 'Lento (1 min)' },
  { value: 120, label: 'Muito lento (2 min)' },
] as const;

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

export const Inspector = React.memo(function Inspector({
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
  isGenerating,
  generateScenes,
  setGenerateScenes,
  sceneDensity,
  setSceneDensity,
  sceneRatio,
  setSceneRatio,
  visualFramework,
  setVisualFramework,
  referenceImage,
  setReferenceImage
}: InspectorProps) {
  const theme = useTheme();
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState(true);
  const [isDirectionCollapsed, setIsDirectionCollapsed] = useState(true);
  const [activeVoiceTab, setActiveVoiceTab] = useState<VoiceTabValue>('A');
  const voiceSectionId = 'inspector-voice-section';
  const directionSectionId = 'inspector-direction-section';

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

  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
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
      aria-label="Configurações de voz e direção"
    >
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
                  Voz do locutor
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Escolha a assinatura vocal e organize vozes para narração ou podcast.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
              <Chip label={`${VOICES.length} opções`} size="small" variant="outlined" />
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
                    <Typography variant="subtitle2">Modo Podcast (2 vozes)</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Permite que dois locutores interajam em um único roteiro.
                  </Typography>
                </Stack>

                <Switch
                  checked={isMultiSpeaker}
                  onChange={(event) => setIsMultiSpeaker(event.target.checked)}
                  disabled={isGenerating}
                  slotProps={{ input: { id: 'podcast-mode-switch', name: 'podcast-mode', 'aria-label': 'Ativar modo podcast com duas vozes' } }}
                />
              </Stack>
            </Paper>

            {isMultiSpeaker && (
              <Paper elevation={0} sx={(currentTheme): SystemStyleObject<Theme> => ({ ...insetPanelSx(currentTheme), p: 1.25 })}>
                <Tabs
                  value={activeVoiceTab}
                  onChange={(_event, value: VoiceTabValue) => setActiveVoiceTab(value)}
                  aria-label="Abas de seleção de voz por locutor"
                  variant="fullWidth"
                  sx={{ mb: 1.5 }}
                >
                  <Tab label="Voz A" value="A" {...voiceTabProps('A')} />
                  <Tab label="Voz B" value="B" {...voiceTabProps('B')} />
                </Tabs>

                <VoiceTabPanel value="A" activeValue={activeVoiceTab}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nome no roteiro"
                    value={speakerAName}
                    onChange={(event) => setSpeakerAName(event.target.value)}
                    disabled={isGenerating}
                    placeholder="Ex: Voz A"
                    error={isMultiSpeaker && speakerAName.trim() === ''}
                    helperText={isMultiSpeaker && speakerAName.trim() === '' ? 'O nome do Locutor A é obrigatório no modo podcast' : 'Use exatamente o nome que aparece antes da fala no roteiro.'}
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
                    label="Nome no roteiro"
                    value={speakerBName}
                    onChange={(event) => setSpeakerBName(event.target.value)}
                    disabled={isGenerating}
                    placeholder="Ex: Voz B"
                    helperText="Use exatamente o nome que aparece antes da fala no roteiro."
                  />
                </VoiceTabPanel>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25, px: 0.5 }}>
                  No editor, escreva “{activeSpeakerName || `Voz ${activeVoiceTab}`}” antes da fala desta pessoa.
                </Typography>
              </Paper>
            )}

            <Grid container spacing={1.5} role="listbox" aria-label="Seleção de voz">
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

                      <Tooltip title={hasError ? 'Erro ao reproduzir preview' : `Ouvir amostra da voz ${voice.name}`}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              playPreview(voice.id);
                            }}
                            disabled={isGenerating}
                            aria-label={hasError ? 'Erro ao reproduzir preview' : `Ouvir amostra da voz ${voice.name}`}
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
                  Direção de arte
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Defina personagem, atmosfera e regras visuais para guiar a geração.
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
              label="Personagem"
              value={audioProfile}
              onChange={(event) => setAudioProfile(event.target.value)}
              disabled={isGenerating}
              placeholder='Ex: "Jaz R., The Morning Hype"'
              helperText={!audioProfile ? 'Defina o personagem principal do roteiro' : undefined}
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              label="Ambiente"
              value={scene}
              onChange={(event) => setScene(event.target.value)}
              disabled={isGenerating}
              placeholder='Ex: "Estúdio de rádio, 10 PM. Caótico."'
              helperText={!scene ? 'Descreva o cenário ou ambiente da cena' : undefined}
            />

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth disabled={isGenerating}>
                  <InputLabel id="pace-select-label">Ritmo</InputLabel>
                  <Select
                    labelId="pace-select-label"
                    id="pace-select"
                    label="Ritmo"
                    value={pace}
                    onChange={(event) => setPace(event.target.value)}
                  >
                    {PACE_OPTIONS.map((option) => (
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
                  label="Sotaque"
                  value={styleNotes}
                  onChange={(event) => {
                    if (event.target.value.length <= MAX_STYLE_NOTES) {
                      setStyleNotes(event.target.value);
                    }
                  }}
                  disabled={isGenerating}
                  placeholder='Ex: "Paulista"'
                  error={styleNotes.length === MAX_STYLE_NOTES}
                  helperText={styleNotes.length === MAX_STYLE_NOTES
                    ? `Limite de ${MAX_STYLE_NOTES} caracteres atingido`
                    : !styleNotes
                      ? 'Ex: Paulista, Mineiro, Carrioca'
                      : `${styleNotes.length}/${MAX_STYLE_NOTES}`}
                />
              </Grid>
            </Grid>

            <Paper elevation={0} sx={(currentTheme): SystemStyleObject<Theme> => ({ ...insetPanelSx(currentTheme), p: 2 })}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack spacing={0.5}>
                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                      <Image sx={{ fontSize: ICON_SIZE_SM, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle2">Gerar cenas visuais</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Transforma o áudio em uma sequência visual coerente para vídeo.
                    </Typography>
                  </Stack>

                  <Switch
                    checked={generateScenes}
                    onChange={(event) => setGenerateScenes(event.target.checked)}
                    disabled={isGenerating}
                    slotProps={{ input: { id: 'generate-scenes-switch', name: 'generate-scenes', 'aria-label': 'Ativar geração de cenas visuais' } }}
                  />
                </Stack>

                <Collapse in={generateScenes} timeout="auto" unmountOnExit>
                  <Stack spacing={1.75}>
                    <FormControl fullWidth disabled={isGenerating}>
                      <InputLabel id="framework-select-label">Identidade visual do canal</InputLabel>
                      <Select
                        labelId="framework-select-label"
                        id="framework-select"
                        label="Identidade visual do canal"
                        value={visualFramework}
                        onChange={(event) => setVisualFramework(event.target.value)}
                      >
                        {VISUAL_FRAMEWORK_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth disabled={isGenerating}>
                          <InputLabel id="ratio-select-label">Formato</InputLabel>
                          <Select
                            labelId="ratio-select-label"
                            id="ratio-select"
                            label="Formato"
                            value={sceneRatio}
                            onChange={(event) => handleSceneRatioChange(event.target.value)}
                          >
                            {SCENE_RATIO_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth disabled={isGenerating}>
                          <InputLabel id="density-select-label">Frequência</InputLabel>
                          <Select
                            labelId="density-select-label"
                            id="density-select"
                            label="Frequência"
                            value={String(sceneDensity)}
                            onChange={(event) => setSceneDensity(Number(event.target.value))}
                          >
                            {DENSITY_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={String(option.value)}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                  <Stack spacing={GAP_MEDIUM}>
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
                          {referenceImage ? 'Imagem selecionada (trocar)' : 'Anexar imagem de personagem/cenário'}
                          <input hidden type="file" accept="image/*" onChange={handleReferenceImageUpload} />
                        </Button>

                        {referenceImage && (
                          <Tooltip title="Remover imagem de referência">
                            <span>
                              <IconButton
                                onClick={() => setReferenceImage(null)}
                                disabled={isGenerating}
                                color="error"
                                aria-label="Remover imagem de referência"
                                sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.3)}` }}
                              >
                                 <Close sx={{ fontSize: ICON_SIZE_MD }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Isso ajuda a IA a manter personagens ou arte consistentes entre as cenas.
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

