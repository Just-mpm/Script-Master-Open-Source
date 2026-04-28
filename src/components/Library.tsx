import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import Alert from '@mui/material/Alert';
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
import Pause from '@mui/icons-material/Pause';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Search from '@mui/icons-material/Search';
import {
  getProjects,
  deleteProject,
  updateProjectName,
  getProjectDetails,
  deleteGeneration,
  type Project,
  type AudioSource,
  type ProjectImage,
} from '../lib/db';
import { useAudioIsPlaying, useAudioActiveId, useGlobalAudioActions } from '../contexts/AudioContext';
import { useLocale } from '../features/i18n';
import { useAuth } from '../contexts/AuthContext';
import { downloadFile } from '../lib/download';
import { createLogger } from '../lib/logger';
import { glassPanelSx, insetPanelSx, searchFieldSx } from '../theme/surfaces';
import { DeleteConfirmationDialog } from './video-library/DeleteConfirmationDialog';
import { ICON_SIZE_SM, ICON_SIZE_MD, ICON_SIZE_LG, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, GAP_RELAXED, RADIUS_SM, EMPTY_WRAPPER_MAX_WIDTH, EMPTY_WRAPPER_PADDING_XS, EMPTY_WRAPPER_PADDING_MD, BRAND_GRADIENT } from '../theme/tokens';

interface ProjectDataState {
  audios: AudioSource[];
  images: ProjectImage[];
}

const EMPTY_PROJECT_DATA: ProjectDataState = { audios: [], images: [] };

const log = createLogger('Library');

export function Library() {
  const { t } = useLocale();
  const { user } = useAuth();
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
  const [renameError, setRenameError] = useState<string | null>(null);

  const isPlaying = useAudioIsPlaying();
  const activeId = useAudioActiveId();
  const { play, toggle } = useGlobalAudioActions();

  // Rastreia blob URLs criados para limpeza ao desmontar/trocar projeto
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const cleanupBlobUrls = () => {
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = new Set();
  };

  // Cleanup ao desmontar
  useEffect(() => cleanupBlobUrls, []);

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
      const { audios, images } = await getProjectDetails(projectId, user?.uid);
      setProjectData({ audios, images });
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

  // Registra blob URLs criados pelo useMemo para cleanup, revogando URLs anteriores
  useEffect(() => {
    const blobUrls = resolvedImageUrls
      .map((img) => img.resolvedUrl)
      .filter((url) => url.startsWith('blob:'));
    // Revoga URLs anteriores que não estão mais no set atual
    const previousUrls = new Set(blobUrlsRef.current);
    for (const url of blobUrls) {
      previousUrls.delete(url);
    }
    for (const url of previousUrls) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(url);
    }
    // Acumula apenas as novas
    for (const url of blobUrls) {
      blobUrlsRef.current.add(url);
    }
  }, [resolvedImageUrls]);

  // Filtra projetos por nome com base na busca
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return projects;
    }
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  const confirmDelete = async () => {
    if (!itemToDelete) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProject(itemToDelete, user?.uid);
      setItemToDelete(null);
      setProjectNameToDelete(null);
      cleanupBlobUrls();
      // Separar refresh da exclusão — W8: projeto já foi excluído
      try {
        await loadProjects();
      } catch {
        // Falha no refresh não invalida a exclusão
        setDeleteSuccess(true);
        window.setTimeout(() => setDeleteSuccess(false), 5000);
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
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}>
            {t('library.title')}
          </Typography>
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
            <Folder sx={{ fontSize: ICON_SIZE_LG, color: 'primary.main' }} />
            <Typography variant="h4">{t('library.savedProjects')}</Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
            {t('library.description')}
          </Typography>
        </Stack>

        <Stack spacing={GAP_DEFAULT} sx={{ alignItems: 'flex-end' }}>
          <Chip label={t('library.projectCount', { count: filteredProjects.length, plural: filteredProjects.length === 1 ? '' : 's' })} variant="outlined" />
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
        <Alert variant="outlined" severity="info">
          {t('library.offlineHint')}
        </Alert>
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
        <Alert
          variant="outlined"
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadProjects()}>
              {t('common.tryAgain')}
            </Button>
          }
        >
          {error}
        </Alert>
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
            <Typography variant="h5">{t('library.emptyTitle')}</Typography>
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
            <Typography variant="h5">{t('library.noResultsTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH }}>
              {t('library.noResultsDescription', { query: searchQuery })}
            </Typography>
          </Stack>
        </Card>
      ) : (
        <Stack spacing={2}>
          {filteredProjects.map((project: Project) => {
            const isExpanded = expandedProjectId === project.id;

            return (
              <Card key={project.id} elevation={0} sx={(theme): SystemStyleObject<Theme> => ({
                ...glassPanelSx(theme),
                overflow: 'hidden',
                transition: theme.transitions.create(['border-color', 'box-shadow'], { duration: 200 }),
                '&:hover': {
                  borderColor: alpha(theme.palette.primary.main, 0.2),
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

                        <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          <Chip icon={<GraphicEq sx={{ fontSize: ICON_SIZE_SM }} />} label={t('library.audio')} size="small" variant="outlined" />
                          <Chip icon={<ImageIcon sx={{ fontSize: ICON_SIZE_SM }} />} label={t('library.scenes')} size="small" variant="outlined" />
                          <Chip label={new Date(project.createdAt).toLocaleString()} size="small" />
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                          onClick={() => void handleExpandProject(project.id)}
                          variant={isExpanded ? 'contained' : 'outlined'}
                            startIcon={isExpanded ? <ChevronUp sx={{ fontSize: ICON_SIZE_MD }} /> : <ChevronDown sx={{ fontSize: ICON_SIZE_MD }} />}
                        >
                          {isExpanded ? t('library.hideDetails') : t('library.showDetails')}
                        </Button>

                        <Button
                          onClick={() => { setItemToDelete(project.id); setProjectNameToDelete(project.name); }}
                          color="error"
                          variant="outlined"
                            startIcon={<Delete sx={{ fontSize: ICON_SIZE_MD }} />}
                        >
                          {t('library.delete')}
                        </Button>
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
                                  <Alert
                                    variant="outlined"
                                    severity="error"
                                    action={
                                      <Button color="inherit" size="small" onClick={() => void handleExpandProject(project.id)}>
                                        {t('common.tryAgain')}
                                      </Button>
                                    }
                                  >
                                    {detailError}
                                  </Alert>
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
                                  <Alert
                                    variant="outlined"
                                    severity="error"
                                    action={
                                      <Button color="inherit" size="small" onClick={() => void handleExpandProject(project.id)}>
                                        {t('common.tryAgain')}
                                      </Button>
                                    }
                                  >
                                    {detailError}
                                  </Alert>
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
                          <Stack spacing={1}>
                            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.16em' }}>
                              {t('library.originalScript')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                              {project.script}
                            </Typography>
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
        <Alert
          severity="success"
          variant="outlined"
          action={
            <Button color="inherit" size="small" onClick={() => void loadProjects()}>
              {t('library.updateList')}
            </Button>
          }
          sx={{ mt: 1 }}
        >
          {t('library.deleteSuccess')}
        </Alert>
      )}
    </Stack>
  );
}
