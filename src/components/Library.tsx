import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import Album from '@mui/icons-material/Album';
import Check from '@mui/icons-material/Check';
import ChevronDown from '@mui/icons-material/ExpandMore';
import ChevronUp from '@mui/icons-material/ExpandLess';
import Delete from '@mui/icons-material/Delete';
import Download from '@mui/icons-material/Download';
import Edit from '@mui/icons-material/Edit';
import Folder from '@mui/icons-material/Folder';
import GraphicEq from '@mui/icons-material/GraphicEq';
import Close from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import Movie from '@mui/icons-material/Movie';
import Pause from '@mui/icons-material/Pause';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Search from '@mui/icons-material/Search';
import Brush from '@mui/icons-material/Brush';
import { useNavigate } from 'react-router-dom';
import {
  getProjects,
  deleteProject,
  updateProjectName,
  getProjectDetails,
  deleteGeneration,
  type Project,
  type AudioSource,
  type ProjectImage,
  type ProjectVideo,
} from '../lib/db';
import { useAudioIsPlaying, useAudioActiveId, useGlobalAudioActions } from '../contexts/AudioContext';
import { useLocale } from '../features/i18n';
import { useAuth } from '../contexts/AuthContext';
import { downloadFile } from '../lib/download';
import { createLogger } from '../lib/logger';
import { glassPanelSx, insetPanelSx, searchFieldSx } from '../theme/surfaces';
import { DeleteConfirmationDialog } from './video-library/DeleteConfirmationDialog';
import { StackedHeader } from './ui';
import { ICON_SIZE_SM, ICON_SIZE_MD, ICON_SIZE_LG, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, GAP_RELAXED, RADIUS_SM, EMPTY_WRAPPER_MAX_WIDTH, EMPTY_WRAPPER_PADDING_XS, EMPTY_WRAPPER_PADDING_MD, BRAND_GRADIENT } from '../theme/tokens';
import { prepareProjectImagesForSpeedPaint } from '../features/speed-paint/lib/projectQueueAdapter';
import { trackAnalyticsEvent } from '../lib/analytics';
import { useAnimationStore } from '../features/speed-paint/store/animationStore';

interface ProjectDataState {
  audios: AudioSource[];
  images: ProjectImage[];
  videos: ProjectVideo[];
}

const EMPTY_PROJECT_DATA: ProjectDataState = { audios: [], images: [], videos: [] };

const log = createLogger('Library');

function buildScriptPreview(script: string, maxLength = 180): string {
  const normalized = script
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function Library() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<ProjectDataState>(EMPTY_PROJECT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [projectNameToDelete, setProjectNameToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [audioToDelete, setAudioToDelete] = useState<string | null>(null);
  const [deletingAudio, setDeletingAudio] = useState(false);
  const [audioDeleteError, setAudioDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const deleteSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [speedPaintError, setSpeedPaintError] = useState<string | null>(null);
  const [speedPaintInfo, setSpeedPaintInfo] = useState<string | null>(null);
  const [preparingSpeedPaintProjectId, setPreparingSpeedPaintProjectId] = useState<string | null>(null);

  const isPlaying = useAudioIsPlaying();
  const activeId = useAudioActiveId();
  const { play, toggle } = useGlobalAudioActions();

  // Rastreia blob URLs criados para limpeza ao desmontar/trocar projeto
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const mediaBlobUrlsRef = useRef<Set<string>>(new Set());

  const cleanupBlobUrls = () => {
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = new Set();

    for (const url of mediaBlobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    mediaBlobUrlsRef.current = new Set();
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      cleanupBlobUrls();
      // Limpa timer de deleteSuccess ao desmontar
      if (deleteSuccessTimerRef.current) {
        clearTimeout(deleteSuccessTimerRef.current);
        deleteSuccessTimerRef.current = null;
      }
    };
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects(user?.uid);
      setProjects(data);
    } catch (error) {
      log.error('Falha ao carregar biblioteca', { error });
      setError(t('library.loadError'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleExpandProject = async (projectId: string) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
      setProjectData(EMPTY_PROJECT_DATA);
      setDetailError(null);
      cleanupBlobUrls();
      return;
    }

    // Revoga URLs do projeto anterior antes de carregar o novo
    cleanupBlobUrls();
    setExpandedProjectId(projectId);
    setDetailLoading(true);
    setDetailError(null);
    setProjectData(EMPTY_PROJECT_DATA);
    try {
      const { audios, images, videos } = await getProjectDetails(projectId, user?.uid);
      setProjectData({ audios, images, videos });
    } catch (err) {
      log.error('Falha ao carregar detalhes do projeto', { error: err });
      setDetailError(t('library.detailError'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePlay = (audio: AudioSource) => {
    if (activeId === audio.id) {
      toggle(audio.id);
      return;
    }

    const url = audio.audioUrl || (audio.audioBlob ? URL.createObjectURL(audio.audioBlob) : '');

    // Registra blob URL criado para cleanup ao desmontar
    if (!audio.audioUrl && url.startsWith('blob:')) {
      blobUrlsRef.current.add(url);
    }

    if (url) {
      play(url, audio.id);
    }
  };

  // Pré-processa URLs de imagem (blob ou remota) uma vez por mudança de projectData
  const resolvedImageUrls = useMemo(() => {
    return projectData.images.map((img) => ({
      ...img,
      resolvedUrl: img.imageUrl || (img.imageBlob ? URL.createObjectURL(img.imageBlob) : ''),
    }));
  }, [projectData.images]);

  const resolvedVideos = useMemo(() => {
    return projectData.videos.map((video) => ({
      ...video,
      resolvedUrl: video.videoUrl || (video.videoBlob ? URL.createObjectURL(video.videoBlob) : ''),
    }));
  }, [projectData.videos]);

  // Registra blob URLs derivados do projeto atual e revoga apenas mídias substituídas.
  useEffect(() => {
    const currentMediaBlobUrls = [
      ...resolvedImageUrls.map((img) => img.resolvedUrl),
      ...resolvedVideos.map((video) => video.resolvedUrl),
    ]
      .filter((url) => url.startsWith('blob:'));

    const previousUrls = new Set(mediaBlobUrlsRef.current);
    for (const url of currentMediaBlobUrls) {
      previousUrls.delete(url);
    }
    for (const url of previousUrls) {
      URL.revokeObjectURL(url);
      mediaBlobUrlsRef.current.delete(url);
    }

    for (const url of currentMediaBlobUrls) {
      mediaBlobUrlsRef.current.add(url);
    }
  }, [resolvedImageUrls, resolvedVideos]);

  const formatVideoDuration = useCallback((durationInSeconds: number): string => {
    const totalSeconds = Math.max(0, Math.round(durationInSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, []);

  // Filtra projetos por nome com base na busca
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return projects;
    }
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  const loadLibraryQueue = useAnimationStore((state) => state.loadLibraryQueue);
  const isPreparingAnySpeedPaint = preparingSpeedPaintProjectId != null;

  const shouldRefetchExpandedProject = useCallback((projectId: string): boolean => {
    if (expandedProjectId !== projectId) {
      return true;
    }

    return detailError != null || projectData.images.length === 0;
  }, [detailError, expandedProjectId, projectData.images.length]);

  const handleOpenInSpeedPaint = useCallback(async (project: Project) => {
    if (preparingSpeedPaintProjectId) {
      return;
    }

    setSpeedPaintError(null);
    setSpeedPaintInfo(null);
    setPreparingSpeedPaintProjectId(project.id);

    try {
      const images = shouldRefetchExpandedProject(project.id)
        ? (await getProjectDetails(project.id, user?.uid)).images
        : projectData.images;

      if (images.length === 0) {
        setSpeedPaintError(t('library.speedPaintNoImages'));
        return;
      }

      const { queue, failedCount } = await prepareProjectImagesForSpeedPaint(project.name, images);

      if (queue.length === 0) {
        setSpeedPaintError(t('library.speedPaintPrepareError'));
        return;
      }

      const speedPaintNotice = failedCount > 0
        ? t('library.speedPaintPartialWarning', {
          ready: queue.length,
          failed: failedCount,
        })
        : null;

      loadLibraryQueue(queue, project.name, speedPaintNotice);
      trackAnalyticsEvent('library_opened_in_speed_paint', { scene_count: queue.length });

      startTransition(() => {
        navigate('/app/pintura-rapida');
      });
    } catch (error) {
      log.error('Falha ao preparar projeto para Speed Paint', { error });
      setSpeedPaintError(t('library.speedPaintPrepareError'));
    } finally {
      setPreparingSpeedPaintProjectId(null);
    }
  }, [loadLibraryQueue, navigate, preparingSpeedPaintProjectId, projectData.images, shouldRefetchExpandedProject, t, user]);

  const confirmDelete = async () => {
    if (!itemToDelete) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProject(itemToDelete, user?.uid);
      trackAnalyticsEvent('library_project_deleted', {});
      setItemToDelete(null);
      setProjectNameToDelete(null);
      cleanupBlobUrls();
      // Separar refresh da exclusão — W8: projeto já foi excluído
      try {
        await loadProjects();
      } catch {
        // Falha no refresh não invalida a exclusão
        setDeleteSuccess(true);
        if (deleteSuccessTimerRef.current) clearTimeout(deleteSuccessTimerRef.current);
        deleteSuccessTimerRef.current = setTimeout(() => {
          setDeleteSuccess(false);
          deleteSuccessTimerRef.current = null;
        }, 5000);
      }
    } catch (err) {
      log.error('Falha ao excluir projeto', { error: err });
      setDeleteError(t('library.deleteProjectError'));
    } finally {
      setDeleting(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }

    setRenameError(null);
    try {
      await updateProjectName(id, editName.trim(), user?.uid);
      await loadProjects();
      setEditingId(null);
    } catch (err) {
      log.error('Falha ao renomear projeto', { error: err });
      setRenameError(t('library.renameError'));
    }
  };

  const confirmDeleteAudio = async () => {
    if (!audioToDelete) return;

    setDeletingAudio(true);
    setAudioDeleteError(null);
    try {
      await deleteGeneration(audioToDelete, user?.uid);
      setAudioToDelete(null);
      // Atualiza lista local removendo o áudio excluído
      setProjectData((prev) => ({
        ...prev,
        audios: prev.audios.filter((a) => a.id !== audioToDelete),
      }));
    } catch (err) {
      log.error('Falha ao excluir áudio', { error: err });
      setAudioDeleteError(t('library.deleteAudioError'));
    } finally {
      setDeletingAudio(false);
    }
  };

  return (
    <Stack spacing={GAP_RELAXED}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={GAP_MEDIUM}
        sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={GAP_COMPACT}>
          <Typography variant="overline" sx={{ color: 'primary.light', fontWeight: 700, letterSpacing: '0.18em' }}>
            {t('library.title')}
          </Typography>
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
            <Folder sx={{ fontSize: ICON_SIZE_LG, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">{t('library.savedProjects')}</Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
            {t('library.description')}
          </Typography>
        </Stack>

        <Stack spacing={GAP_DEFAULT} sx={{ alignItems: 'flex-end' }}>
          {filteredProjects.length > 0 ? (
            <Chip label={t('library.projectCount', { count: filteredProjects.length, plural: filteredProjects.length === 1 ? '' : 's' })} variant="outlined" />
          ) : (
            <Chip label={t('library.projectCountEmpty')} variant="outlined" sx={{ borderColor: 'primary.main', color: 'primary.light' }} />
          )}
          {projects.length > 0 && (
            <TextField
              type="search"
              size="small"
              placeholder={t('library.searchPlaceholder')}
              value={searchQuery}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: ICON_SIZE_SM, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  ...(searchQuery ? {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchQuery('')}
                          aria-label={t('library.clearSearchAria')}
                          sx={{ mr: -0.5 }}
                        >
                          <Close sx={{ fontSize: ICON_SIZE_SM }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  } : {}),
                },
              }}
              sx={{
                minWidth: 220,
                ...searchFieldSx,
              }}
            />
          )}
        </Stack>
      </Stack>

      {!user ? (
        <StackedHeader
          variant="alert"
          severity="info"
          alertVariant="outlined"
          title={t('common.info')}
          description={t('library.offlineHint')}
        />
      ) : null}

      {speedPaintError ? (
        <StackedHeader
          variant="alert"
          severity="error"
          alertVariant="outlined"
          title={t('common.error')}
          description={speedPaintError}
          onClose={() => setSpeedPaintError(null)}
        />
      ) : null}

      {speedPaintInfo ? (
        <StackedHeader
          variant="alert"
          severity="warning"
          alertVariant="outlined"
          title={t('common.warning')}
          description={speedPaintInfo}
          onClose={() => setSpeedPaintInfo(null)}
        />
      ) : null}

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12 }}>
              <Card elevation={0} sx={(theme): SystemStyleObject<Theme> => ({ ...glassPanelSx(theme), p: 2 })}>
                <Stack spacing={2}>
                  <Skeleton variant="text" animation="wave" width="36%" height={34} />
                  <Skeleton variant="text" animation="wave" width="22%" />
                  <Skeleton variant="rounded" animation="wave" height={48} />
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <StackedHeader
          variant="alert"
          severity="error"
          alertVariant="outlined"
          title={t('common.error')}
          description={error}
          action={
            <Button color="inherit" size="small" onClick={() => void loadProjects()}>
              {t('common.tryAgain')}
            </Button>
          }
        />
      ) : projects.length === 0 ? (
        <Card elevation={0} sx={(theme): SystemStyleObject<Theme> => ({ ...glassPanelSx(theme), p: { xs: EMPTY_WRAPPER_PADDING_XS, md: EMPTY_WRAPPER_PADDING_MD }, textAlign: 'center' })}>
            <Stack spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
            <Box sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: BRAND_GRADIENT,
              opacity: 0.2,
              mb: 0.5,
            }}>
              <Album sx={{ fontSize: 28, color: 'common.white' }} />
            </Box>
            <Typography variant="h5" component="h2">{t('library.emptyTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH }}>
              {t('library.emptyDescription')}
            </Typography>
          </Stack>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card elevation={0} sx={(theme): SystemStyleObject<Theme> => ({ ...glassPanelSx(theme), p: { xs: EMPTY_WRAPPER_PADDING_XS, md: EMPTY_WRAPPER_PADDING_MD }, textAlign: 'center' })}>
            <Stack spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
            <Box sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: BRAND_GRADIENT,
              opacity: 0.2,
              mb: 0.5,
            }}>
              <Search sx={{ fontSize: 28, color: 'common.white' }} />
            </Box>
            <Typography variant="h5" component="h2">{t('library.noResultsTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH }}>
              {t('library.noResultsDescription', { query: searchQuery })}
            </Typography>
          </Stack>
        </Card>
      ) : (
        <Stack spacing={2}>
          {filteredProjects.map((project: Project) => {
            const isExpanded = expandedProjectId === project.id;
            const isPreparingSpeedPaint = preparingSpeedPaintProjectId === project.id;
            const projectPreview = buildScriptPreview(project.script);

            return (
              <Card key={project.id} elevation={0} variant="outlined" sx={(theme): SystemStyleObject<Theme> => ({
                ...glassPanelSx(theme),
                overflow: 'hidden',
                borderColor: alpha(theme.palette.common.white, 0.08),
                transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], { duration: 200 }),
                '&:hover': {
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 24px 80px ${alpha(theme.palette.common.black, 0.55)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.06)}`,
                },
              })}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <Stack spacing={GAP_RELAXED}>
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={2}
                      sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
                    >
                      <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
                        {editingId === project.id ? (
                          <TextField
                            value={editName}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setEditName(event.target.value)}
                            autoFocus
                            size="small"
                            error={Boolean(renameError)}
                            helperText={renameError}
                            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                              if (event.key === 'Enter') {
                                void saveEdit(project.id);
                              }
                            }}
                            slotProps={{
                              input: {
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Stack direction="row" spacing={0.5}>
                                       <IconButton color="success" onClick={() => void saveEdit(project.id)} aria-label={t('library.saveName')}>
                                        <Check sx={{ fontSize: ICON_SIZE_MD }} />
                                      </IconButton>
                                      <IconButton onClick={() => setEditingId(null)} aria-label={t('library.cancelRename')}>
                                        <Close sx={{ fontSize: ICON_SIZE_MD }} />
                                      </IconButton>
                                    </Stack>
                                  </InputAdornment>
                                ),
                              },
                            }}
                          />
                        ) : (
                          <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                            <Typography variant="h5" sx={{ minWidth: 0 }} noWrap>
                              {project.name}
                            </Typography>
                            <Tooltip title={t('library.renameProject')}>
                              <IconButton
                                onClick={() => {
                                  setEditingId(project.id);
                                  setEditName(project.name);
                                }}
                                aria-label={t('library.renameProjectAria')}
                              >
                                <Edit sx={{ fontSize: ICON_SIZE_MD }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}

                        {editingId !== project.id ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 760,
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: isExpanded ? 3 : 2,
                              overflow: 'hidden',
                              lineHeight: 1.65,
                            }}
                          >
                            {projectPreview || t('library.scriptPreviewFallback')}
                          </Typography>
                        ) : null}

                        <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          <Chip icon={<GraphicEq sx={{ fontSize: ICON_SIZE_SM }} />} label={t('library.audio')} size="small" variant="outlined" />
                          <Chip icon={<ImageIcon sx={{ fontSize: ICON_SIZE_SM }} />} label={t('library.scenes')} size="small" variant="outlined" />
                          <Chip icon={<Movie sx={{ fontSize: ICON_SIZE_SM }} />} label={t('library.video')} size="small" variant="outlined" />
                          <Chip label={new Date(project.createdAt).toLocaleString()} size="small" variant="outlined" />
                        </Stack>
                      </Stack>

                      <Stack
                        spacing={1}
                        sx={{
                          width: { xs: '100%', md: 'auto' },
                          alignItems: { xs: 'stretch', md: 'flex-end' },
                          maxWidth: { md: 440 },
                        }}
                      >
                        <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: { md: 'flex-end' } }}>
                          <Button
                            onClick={() => void handleExpandProject(project.id)}
                            variant={isExpanded ? 'contained' : 'outlined'}
                            startIcon={isExpanded ? <ChevronUp sx={{ fontSize: ICON_SIZE_MD }} /> : <ChevronDown sx={{ fontSize: ICON_SIZE_MD }} />}
                          >
                            {isExpanded ? t('library.hideDetails') : t('library.showDetails')}
                          </Button>

                          <Tooltip title={t('library.speedPaintHint')}>
                            <span>
                              <Button
                                onClick={() => void handleOpenInSpeedPaint(project)}
                                variant="contained"
                                color="secondary"
                                disabled={isPreparingAnySpeedPaint || detailLoading}
                                loading={isPreparingSpeedPaint}
                                loadingPosition="start"
                                startIcon={!isPreparingSpeedPaint ? <Brush sx={{ fontSize: ICON_SIZE_MD }} /> : undefined}
                              >
                                {isPreparingSpeedPaint
                                  ? t('library.speedPaintPreparing')
                                  : t('library.openInSpeedPaint')}
                              </Button>
                            </span>
                          </Tooltip>

                          <Button
                            onClick={() => { setItemToDelete(project.id); setProjectNameToDelete(project.name); }}
                            color="error"
                            variant="outlined"
                            startIcon={<Delete sx={{ fontSize: ICON_SIZE_MD }} />}
                          >
                            {t('library.delete')}
                          </Button>
                        </Stack>

                        <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: { md: 'flex-end' } }}>
                          <Chip size="small" variant="outlined" color="secondary" label={t('library.speedPaintQueueChip')} />
                          {isExpanded ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={t('library.audioCount', {
                                count: projectData.audios.length,
                                plural: projectData.audios.length === 1 ? '' : 's',
                              })}
                            />
                          ) : null}
                          {isExpanded ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={t('library.sceneCount', {
                                count: projectData.images.length,
                                plural: projectData.images.length === 1 ? '' : 's',
                              })}
                            />
                          ) : null}
                          {isExpanded ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={t('library.videoCount', {
                                count: projectData.videos.length,
                                plural: projectData.videos.length === 1 ? '' : 's',
                              })}
                            />
                          ) : null}
                        </Stack>
                      </Stack>
                    </Stack>

                    {isExpanded ? (
                      <Stack spacing={GAP_RELAXED}>
                        {detailLoading ? (
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, lg: 5 }}>
                              <Box sx={(theme): SystemStyleObject<Theme> => ({ ...insetPanelSx(theme), p: 2, height: '100%' })}>
                                <Stack spacing={1.5}>
                                  <Skeleton variant="text" animation="wave" width="40%" height={20} />
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} variant="rounded" animation="wave" height={48} />
                                  ))}
                                </Stack>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, lg: 7 }}>
                              <Box sx={(theme): SystemStyleObject<Theme> => ({ ...insetPanelSx(theme), p: 2, height: '100%' })}>
                                <Stack spacing={1.5}>
                                  <Skeleton variant="text" animation="wave" width="32%" height={20} />
                                  <Skeleton variant="rounded" animation="wave" height={120} />
                                </Stack>
                              </Box>
                            </Grid>
                          </Grid>
                        ) : (
                          <>
                          <Grid container spacing={2}>
                          <Grid size={{ xs: 12, lg: 5 }}>
                            <Box sx={(theme): SystemStyleObject<Theme> => ({ ...insetPanelSx(theme), p: 2, height: '100%' })}>
                              <Stack spacing={1.5}>
                                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}>
                                  {t('library.audioVersions')}
                                </Typography>

                                {detailError ? (
                                  <StackedHeader
                                    variant="alert"
                                    severity="error"
                                    alertVariant="outlined"
                                    title={t('common.error')}
                                    description={detailError}
                                    action={
                                      <Button color="inherit" size="small" onClick={() => void handleExpandProject(project.id)}>
                                        {t('common.tryAgain')}
                                      </Button>
                                    }
                                  />
                                ) : projectData.audios.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    {t('library.noAudio')}
                                  </Typography>
                                ) : (
                                  <Stack spacing={GAP_MEDIUM}>
                                    {projectData.audios.map((audio: AudioSource) => {
                                      const isCurrent = activeId === audio.id;

                                      return (
                                        <Card
                                          key={audio.id}
                                          elevation={0}
                                          sx={(theme): SystemStyleObject<Theme> => ({
                                            p: 1.5,
                                              borderRadius: RADIUS_SM,
                                            bgcolor: alpha(theme.palette.common.white, 0.03),
                                            border: '1px solid transparent',
                                            transition: theme.transitions.create(['background-color', 'border-color'], { duration: 150 }),
                                            '&:hover': {
                                              bgcolor: alpha(theme.palette.common.white, 0.06),
                                              borderColor: alpha(theme.palette.common.white, 0.08),
                                            },
                                          })}
                                        >
                                            <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                                              <Typography variant="subtitle2">{t('library.version', { time: new Date(audio.createdAt).toLocaleTimeString() })}</Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {new Date(audio.createdAt).toLocaleDateString()}
                                              </Typography>
                                            </Stack>

                                            <Stack direction="row" spacing={GAP_COMPACT}>
                                              <Tooltip title={isPlaying && isCurrent ? t('library.pauseAudio') : t('library.playAudio')}>
                                                <span>
                                                  <IconButton
                                                    onClick={() => handlePlay(audio)}
                                                    color={isCurrent ? 'secondary' : 'primary'}
                                                    aria-label={isPlaying && isCurrent ? t('library.pauseAudio') : t('library.playAudio')}
                                                  >
                                                    {isPlaying && isCurrent ? <Pause sx={{ fontSize: ICON_SIZE_LG }} /> : <PlayArrow sx={{ fontSize: ICON_SIZE_LG }} />}
                                                  </IconButton>
                                                </span>
                                              </Tooltip>

                                              <Tooltip title={t('library.downloadAudio')}>
                                                <span>
                                                  <IconButton
                                                    onClick={() => {
                                                      const url = audio.audioUrl || (audio.audioBlob ? URL.createObjectURL(audio.audioBlob) : '');
                                                      if (url) {
                                                         const isBlob = !audio.audioUrl && url.startsWith('blob:');
                                                         if (isBlob) {
                                                            blobUrlsRef.current.add(url);
                                                          }
                                                         void downloadFile(url, `${project.name}-${audio.id}.wav`).then(() => {
                                                           if (isBlob) { URL.revokeObjectURL(url); blobUrlsRef.current.delete(url); }
                                                         });
                                                      }
                                                    }}
                                                    aria-label={t('library.downloadAudioAria')}
                                                  >
                                                    <Download sx={{ fontSize: ICON_SIZE_MD }} />
                                                  </IconButton>
                                                </span>
                                              </Tooltip>

                                              <Tooltip title={t('library.deleteAudio')}>
                                                <span>
                                                  <IconButton
                                                    onClick={() => setAudioToDelete(audio.id)}
                                                    color="error"
                                                    aria-label={t('library.deleteAudioAria')}
                                                  >
                                                    <Delete sx={{ fontSize: ICON_SIZE_MD }} />
                                                  </IconButton>
                                                </span>
                                              </Tooltip>
                                            </Stack>
                                          </Stack>
                                        </Card>
                                      );
                                    })}
                                  </Stack>
                                )}
                              </Stack>
                            </Box>
                          </Grid>

                          <Grid size={{ xs: 12, lg: 7 }}>
                            <Box sx={(theme): SystemStyleObject<Theme> => ({ ...insetPanelSx(theme), p: 2, height: '100%' })}>
                              <Stack spacing={1.5}>
                                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}>
                                  {t('library.generatedScenes')}
                                </Typography>

                                {detailError ? (
                                  <StackedHeader
                                    variant="alert"
                                    severity="error"
                                    alertVariant="outlined"
                                    title={t('common.error')}
                                    description={detailError}
                                    action={
                                      <Button color="inherit" size="small" onClick={() => void handleExpandProject(project.id)}>
                                        {t('common.tryAgain')}
                                      </Button>
                                    }
                                  />
                                ) : projectData.images.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    {t('library.noImages')}
                                  </Typography>
                                ) : (
                                  <Grid container spacing={1.5}>
                                    {resolvedImageUrls.map((img, index: number) => {

                                      return (
                                        <Grid key={img.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                          <Card
                                            elevation={0}
                                            sx={(theme): SystemStyleObject<Theme> => ({
                                            borderRadius: RADIUS_SM,
                                              overflow: 'hidden',
                                              bgcolor: alpha(theme.palette.common.white, 0.03),
                                              transition: theme.transitions.create(['box-shadow', 'transform'], { duration: 200 }),
                                              '&:hover': {
                                                boxShadow: `0 12px 36px ${alpha(theme.palette.common.black, 0.36)}`,
                                                transform: 'translateY(-2px)',
                                              },
                                            })}
                                          >
                                            <Box
                                              component="img"
                                              src={img.resolvedUrl}
                                              alt={t('library.scene', { number: index + 1 })}
                                              loading="lazy"
                                              sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
                                            />
                                            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ p: 1.25, alignItems: 'center', justifyContent: 'space-between' }}>
                                              <Typography variant="caption" color="text.secondary">
                                                {t('library.scene', { number: index + 1 })}
                                              </Typography>
                                              <IconButton
                                                onClick={() => {
                                                  if (img.resolvedUrl) {
                                                    void downloadFile(img.resolvedUrl, `${project.name}-cena-${index + 1}.png`);
                                                  }
                                                }}
                                                aria-label={t('library.downloadSceneAria', { number: index + 1 })}
                                              >
                                                <Download sx={{ fontSize: ICON_SIZE_MD }} />
                                              </IconButton>
                                            </Stack>
                                          </Card>
                                        </Grid>
                                      );
                                    })}
                                  </Grid>
                                )}
                              </Stack>
                            </Box>
                          </Grid>
                        </Grid>

                        <Box sx={(theme): SystemStyleObject<Theme> => ({ ...insetPanelSx(theme), p: 2 })}>
                          <Stack spacing={1.5}>
                            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}>
                              {t('library.savedVideos')}
                            </Typography>

                            {detailError ? (
                              <StackedHeader
                                variant="alert"
                                severity="error"
                                alertVariant="outlined"
                                title={t('common.error')}
                                description={detailError}
                                action={
                                  <Button color="inherit" size="small" onClick={() => void handleExpandProject(project.id)}>
                                    {t('common.tryAgain')}
                                  </Button>
                                }
                              />
                            ) : resolvedVideos.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                {t('library.noVideos')}
                              </Typography>
                            ) : (
                              <Grid container spacing={1.5}>
                                {resolvedVideos.map((video, index) => (
                                  <Grid key={video.id} size={{ xs: 12, md: 6, xl: 4 }}>
                                    <Card
                                      elevation={0}
                                      sx={(theme): SystemStyleObject<Theme> => ({
                                        borderRadius: RADIUS_SM,
                                        overflow: 'hidden',
                                        bgcolor: alpha(theme.palette.common.white, 0.03),
                                        transition: theme.transitions.create(['box-shadow', 'transform'], { duration: 200 }),
                                        '&:hover': {
                                          boxShadow: `0 12px 36px ${alpha(theme.palette.common.black, 0.36)}`,
                                          transform: 'translateY(-2px)',
                                        },
                                      })}
                                    >
                                      {video.resolvedUrl ? (
                                        <Box
                                          component="video"
                                          src={video.resolvedUrl}
                                          controls
                                          preload="metadata"
                                          sx={{ width: '100%', aspectRatio: '16 / 9', bgcolor: 'common.black' }}
                                        />
                                      ) : (
                                        <Stack
                                          spacing={1}
                                          sx={{
                                            width: '100%',
                                            aspectRatio: '16 / 9',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: alpha('#000', 0.22),
                                          }}
                                        >
                                          <Movie sx={{ fontSize: 32, color: 'text.secondary' }} />
                                          <Typography variant="caption" color="text.secondary">
                                            {t('library.video')}
                                          </Typography>
                                        </Stack>
                                      )}

                                      <Stack spacing={1.25} sx={{ p: 1.5 }}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                          <Typography variant="subtitle2">
                                            {t('library.version', { time: new Date(video.createdAt).toLocaleTimeString() })}
                                          </Typography>
                                          <Chip
                                            size="small"
                                            variant="outlined"
                                            label={t('library.videoItem', { number: index + 1 })}
                                          />
                                        </Stack>

                                        <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                          <Chip size="small" variant="outlined" label={video.format.toUpperCase()} />
                                          <Chip size="small" variant="outlined" label={`${video.width}x${video.height}`} />
                                          <Chip size="small" variant="outlined" label={formatVideoDuration(video.durationInSeconds)} />
                                        </Stack>

                                        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                          <Typography variant="caption" color="text.secondary">
                                            {new Date(video.createdAt).toLocaleDateString()}
                                          </Typography>
                                          <Tooltip title={t('library.downloadVideo')}>
                                            <span>
                                              <IconButton
                                                onClick={() => {
                                                  if (video.resolvedUrl) {
                                                    void downloadFile(
                                                      video.resolvedUrl,
                                                      `${project.name}-video-${index + 1}.${video.format}`,
                                                    );
                                                  }
                                                }}
                                                aria-label={t('library.downloadVideoAria')}
                                              >
                                                <Download sx={{ fontSize: ICON_SIZE_MD }} />
                                              </IconButton>
                                            </span>
                                          </Tooltip>
                                        </Stack>
                                      </Stack>
                                    </Card>
                                  </Grid>
                                ))}
                              </Grid>
                            )}
                          </Stack>
                        </Box>

                        <Box sx={(theme): SystemStyleObject<Theme> => ({ ...insetPanelSx(theme), p: 2 })}>
                          <Stack spacing={1}>
                            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.16em' }}>
                              {t('library.originalScript')}
                            </Typography>
                            <Box
                              sx={{
                                maxHeight: 320,
                                overflowY: 'auto',
                                pr: 1,
                              }}
                            >
                              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
                                {project.script}
                              </Typography>
                            </Box>
                         </Stack>
                         </Box>
                         </>
                         )}
                       </Stack>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Dialog de confirmação de exclusão de projeto */}
      <DeleteConfirmationDialog
        open={Boolean(itemToDelete)}
        itemName={projectNameToDelete}
        deletingItem={deleting}
        deleteError={deleteError}
        titleIdleLabel={t('library.deleteProjectTitle')}
        loadingLabel={t('library.deleteProjectLoading')}
        confirmLabel={t('library.deleteProjectConfirm')}
        description={t('library.deleteProjectDescription')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => { setItemToDelete(null); setProjectNameToDelete(null); setDeleteError(null); }}
      />

      {/* Dialog de confirmação de exclusão de áudio */}
      <DeleteConfirmationDialog
        open={Boolean(audioToDelete)}
        itemName={audioToDelete ?? null}
        deletingItem={deletingAudio}
        deleteError={audioDeleteError}
        titleIdleLabel={t('library.deleteAudioTitle')}
        loadingLabel={t('library.deleteAudioLoading')}
        confirmLabel={t('library.deleteAudioConfirm')}
        description={t('library.deleteAudioDescription')}
        onConfirm={() => void confirmDeleteAudio()}
        onCancel={() => { setAudioToDelete(null); setAudioDeleteError(null); }}
      />

      {/* Snackbar de sucesso quando exclusão OK mas refresh falhou */}
      {deleteSuccess && (
        <StackedHeader
          variant="alert"
          severity="success"
          alertVariant="outlined"
          title={t('common.success')}
          description={t('library.deleteSuccess')}
          action={
            <Button color="inherit" size="small" onClick={() => void loadProjects()}>
              {t('library.updateList')}
            </Button>
          }
          slotProps={{ root: { sx: { mt: 1 } } }}
        />
      )}
    </Stack>
  );
}
