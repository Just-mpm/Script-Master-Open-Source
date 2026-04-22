import React, { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import AccessTime from '@mui/icons-material/AccessTime';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Close from '@mui/icons-material/Close';
import Download from '@mui/icons-material/Download';
import FolderOpen from '@mui/icons-material/FolderOpen';
import Movie from '@mui/icons-material/Movie';
import PlayArrow from '@mui/icons-material/PlayArrow';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getProjectsDetailsMap, getGenerations } from '../lib/db';
import type { Project } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { downloadFile } from '../lib/download';
import { createLogger } from '../lib/logger';
import { glassPanelSx } from '../theme/surfaces';
import { ICON_SIZE_SM, ICON_SIZE_MD, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, GAP_RELAXED, RADIUS_SM, EMPTY_WRAPPER_PADDING_XS, EMPTY_WRAPPER_PADDING_MD, RADIUS_CHIP } from '../theme/tokens';

const log = createLogger('VideoLibrary');

interface VideoLibraryScene {
  imageUrl: string;
  timestamp: number;
}

interface VideoLibraryItem extends Project {
  thumbnail?: string;
  isGeneration?: boolean;
  audioUrl?: string;
  scenes?: VideoLibraryScene[];
}

interface VideoLibraryProps {
  onSelect: (projectId: string, audioUrl: string, scenes: { imageUrl: string; timestamp: number }[], script: string) => void;
  activeProjectId?: string | null;
}

function MetadataPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: GAP_COMPACT,
        px: 1,
        py: 0.5,
        borderRadius: RADIUS_CHIP,
        backgroundColor: alpha(theme.palette.common.white, 0.05),
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
      })}
    >
      {icon}
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export function VideoLibrary({ onSelect, activeProjectId }: VideoLibraryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<VideoLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const blobUrlsRef = useRef<Set<string>>(new Set());

  const createTrackedBlobUrl = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeAllBlobUrls = useCallback(() => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current.clear();
  }, []);

  useEffect(() => revokeAllBlobUrls, [revokeAllBlobUrls]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    revokeAllBlobUrls();
    try {
      const [projectsData, generationsData] = await Promise.all([
        getProjects(user?.uid),
        getGenerations(user?.uid),
      ]);
      const projectDetailsMap = await getProjectsDetailsMap(user?.uid);

      const unified: VideoLibraryItem[] = [
        ...projectsData.map((p) => ({ ...p, isGeneration: false })),
        ...generationsData.filter((g) => g.scenes && g.scenes.length > 0).map((g) => ({
          id: g.id,
          name: g.name,
          script: g.script,
          createdAt: g.createdAt,
          userId: g.userId,
          isGeneration: true,
          audioUrl: g.audioUrl,
          scenes: g.scenes,
          settings: {
            selectedVoice: g.voice,
            pace: 'normal',
            styleNotes: '',
            isMultiSpeaker: false,
            speakerAName: '',
            speakerBName: '',
            speakerBVoice: '',
            audioProfile: '',
            scene: '',
            sceneDensity: 15,
            sceneRatio: '16:9',
          },
        })),
      ];

      const sorted = unified.sort((a, b) => b.createdAt - a.createdAt);

      const finalItems = await Promise.all(sorted.map(async (item) => {
        if (item.isGeneration) {
          return {
            ...item,
            thumbnail: item.scenes?.[0]?.imageUrl,
          };
        }
        try {
          const details = projectDetailsMap[item.id];
          if (!details) {
            return item;
          }
          return {
            ...item,
            thumbnail: details.images[0]?.imageUrl || (details.images[0]?.imageBlob ? createTrackedBlobUrl(details.images[0].imageBlob) : undefined),
            audioUrl: details.audios[0]?.audioUrl || (details.audios[0]?.audioBlob ? createTrackedBlobUrl(details.audios[0].audioBlob) : ''),
            scenes: details.images.map((img) => ({ imageUrl: img.imageUrl || (img.imageBlob ? createTrackedBlobUrl(img.imageBlob) : ''), timestamp: img.timestamp })),
          };
        } catch {
          return item;
        }
      }));

      setProjects(finalItems);
    } catch (error) {
      log.error('Falha ao carregar galeria de vídeos', { error });
      setError('Não foi possível carregar a galeria. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user, revokeAllBlobUrls, createTrackedBlobUrl]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleDownloadSequence = async (e: React.MouseEvent, item: VideoLibraryItem) => {
    e.stopPropagation();
    if (downloadingId) return;
    
    setDownloadingId(item.id);
    const safeName = item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    try {
      // 1. Download Audio
      if (item.audioUrl) {
          await downloadFile(item.audioUrl, `${safeName}-audio.wav`);
      }

      // 2. Download Images
      if (item.scenes && item.scenes.length > 0) {
        for (let i = 0; i < item.scenes.length; i++) {
          // Small delay to prevent browser block
          await new Promise(r => setTimeout(r, 400));
          const sceneFilename = `${safeName}-cena-${String(i + 1).padStart(2, '0')}.png`;
          await downloadFile(item.scenes[i].imageUrl, sceneFilename);
        }
      }
    } catch (err) {
      log.error('Falha no download em sequência', { error: err });
      setDownloadError('Ocorreu um erro durante o download. Tente novamente.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSelect = async (item: VideoLibraryItem) => {
    if (item.audioUrl && item.scenes) {
      onSelect(item.id, item.audioUrl, item.scenes, item.script);
    }
  };

  if (loading) {
    return (
      <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1.5 }}>
        {[1, 2, 3].map((index) => (
          <Stack key={index} spacing={GAP_MEDIUM} sx={{ minWidth: 260 }}>
            <Skeleton variant="rounded" animation="wave" width={260} height={146} />
            <Skeleton variant="text" animation="wave" sx={{ fontSize: '1rem' }} />
            <Skeleton variant="text" animation="wave" width="75%" />
          </Stack>
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert
        variant="outlined"
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => { void loadProjects(); }}>
            Tentar novamente
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (projects.length === 0) {
    return (
      <Paper elevation={0} sx={(theme): SystemStyleObject<Theme> => ({ ...glassPanelSx(theme), p: { xs: EMPTY_WRAPPER_PADDING_XS, md: EMPTY_WRAPPER_PADDING_MD } })}>
        <Stack spacing={GAP_DEFAULT} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <FolderOpen sx={{ fontSize: 24, opacity: 0.35 }} />
          <Stack spacing={GAP_COMPACT}>
            <Typography variant="h6">Sua galeria ainda está vazia</Typography>
            <Typography variant="body2" color="text.secondary">
              Assim que você gerar projetos com áudio e cenas, eles aparecerão aqui para revisão e download.
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/')}
            sx={{ mt: 0.5 }}
          >
            Ir para o Estúdio
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={GAP_RELAXED}>
      <Stack direction="row" spacing={GAP_MEDIUM} sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
          <Movie sx={{ fontSize: ICON_SIZE_MD }} />
          <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.2em' }}>
            Sua galeria
          </Typography>
        </Stack>

        <Chip label={`${projects.length} itens`} size="small" variant="outlined" />
      </Stack>

      <Box sx={{ overflowX: 'auto', pb: 1.5, mx: -0.5, px: 0.5 }}>
        <Stack direction="row" spacing={2} useFlexGap sx={{ minWidth: 'max-content', pr: 0.5 }}>
          {projects.map((project) => {
            const isActive = activeProjectId === project.id;
            const canSelect = Boolean(project.audioUrl && project.scenes);

            return (
              <motion.div key={project.id} whileHover={{ y: -4 }} style={{ minWidth: 260, maxWidth: 260 }}>
                <Card
                  sx={(theme): SystemStyleObject<Theme> => ({
                    position: 'relative',
                    height: '100%',
                    overflow: 'hidden',
                    borderRadius: RADIUS_SM,
                    border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.6) : alpha(theme.palette.common.white, 0.08)}`,
                    backgroundColor: alpha(theme.palette.background.paper, 0.82),
                    backgroundImage: 'none',
                    boxShadow: isActive
                      ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.32)}, 0 24px 60px ${alpha(theme.palette.primary.main, 0.18)}`
                      : `0 20px 48px ${alpha(theme.palette.common.black, 0.22)}`,
                    backdropFilter: 'blur(18px)',
                  })}
                >
                  <CardActionArea onClick={() => handleSelect(project)} disabled={!canSelect} sx={{ height: '100%', alignItems: 'stretch' }}>
                    <Box sx={{ position: 'relative', aspectRatio: '16 / 9', backgroundColor: 'action.hover', overflow: 'hidden' }}>
                      {project.thumbnail ? (
                        <Box
                          component="img"
                          src={project.thumbnail}
                          alt={project.name}
                          referrerPolicy="no-referrer"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.5s ease',
                            '.MuiCardActionArea-root:hover &': {
                              transform: 'scale(1.06)',
                            },
                          }}
                        />
                      ) : (
                        <Stack sx={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                          <Movie sx={{ fontSize: 32, opacity: 0.25 }} />
                        </Stack>
                      )}

                      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 20%, rgba(0,0,0,0.66) 100%)' }} />

                      <Chip
                        label={project.isGeneration ? 'Geração' : 'Projeto'}
                        size="small"
                        color={project.isGeneration ? 'primary' : 'default'}
                        sx={{ position: 'absolute', top: 12, left: 12 }}
                      />

                      <Box
                        sx={(theme) => ({
                          position: 'absolute',
                          right: 12,
                          bottom: 12,
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          backgroundColor: isActive ? theme.palette.primary.main : alpha(theme.palette.common.black, 0.44),
                          color: isActive ? theme.palette.primary.contrastText : theme.palette.common.white,
                          border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                        })}
                      >
                         <PlayArrow sx={{ fontSize: ICON_SIZE_MD }} />
                      </Box>
                    </Box>

                    <CardContent sx={{ p: 2 }}>
                      <Stack spacing={GAP_MEDIUM}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isActive ? 'primary.main' : 'text.primary' }} noWrap>
                          {project.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            minHeight: 40,
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                            overflow: 'hidden',
                            fontStyle: 'italic',
                          }}
                        >
                          “{project.script}”
                        </Typography>

                        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                          <MetadataPill icon={<CalendarMonth sx={{ fontSize: ICON_SIZE_SM }} />} label={new Date(project.createdAt).toLocaleDateString()} />
                          <MetadataPill icon={<AccessTime sx={{ fontSize: ICON_SIZE_SM }} />} label={new Date(project.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </CardActionArea>

                  <Tooltip title="Sincronizar e baixar todos os arquivos">
                    <span>
                      <IconButton
                        onClick={(event) => handleDownloadSequence(event, project)}
                        disabled={downloadingId === project.id}
                        aria-label={`Baixar arquivos do projeto ${project.name}`}
                      sx={(theme): SystemStyleObject<Theme> => ({
                        position: 'absolute',
                        top: 10,
                        right: 10,
                          zIndex: 2,
                          width: 34,
                          height: 34,
                          backgroundColor: downloadingId === project.id
                            ? theme.palette.primary.main
                            : alpha(theme.palette.common.black, 0.42),
                          color: theme.palette.common.white,
                          backdropFilter: 'blur(12px)',
                          '&:hover': {
                            backgroundColor: downloadingId === project.id
                              ? theme.palette.primary.dark
                              : alpha(theme.palette.primary.main, 0.72),
                          },
                      })}
                      >
                        {downloadingId === project.id ? <CircularProgress size={18} color="inherit" /> : <Download sx={{ fontSize: ICON_SIZE_MD }} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Card>
              </motion.div>
            );
          })}
        </Stack>
      </Box>

      <Snackbar
        open={Boolean(downloadError)}
        autoHideDuration={6000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setDownloadError(null);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setDownloadError(null)}
          action={
            <IconButton color="inherit" size="small" aria-label="Fechar mensagem de erro" onClick={() => setDownloadError(null)}>
              <Close sx={{ fontSize: ICON_SIZE_SM }} />
            </IconButton>
          }
          sx={{ width: '100%', alignItems: 'center', minWidth: { xs: 'min(92vw, 320px)', sm: 360 } }}
        >
          {downloadError}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
