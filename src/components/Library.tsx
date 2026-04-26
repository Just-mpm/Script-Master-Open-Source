import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import { useAuth } from '../contexts/AuthContext';
import { downloadFile } from '../lib/download';
import { createLogger } from '../lib/logger';
import { glassPanelSx, insetPanelSx } from '../theme/surfaces';
import { ICON_SIZE_SM, ICON_SIZE_MD, ICON_SIZE_LG, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, GAP_RELAXED, RADIUS_SM, EMPTY_WRAPPER_MAX_WIDTH, EMPTY_WRAPPER_PADDING_XS, EMPTY_WRAPPER_PADDING_MD, BRAND_GRADIENT } from '../theme/tokens';

interface ProjectDataState {
  audios: AudioSource[];
  images: ProjectImage[];
}

const EMPTY_PROJECT_DATA: ProjectDataState = { audios: [], images: [] };

const log = createLogger('Library');

export function Library() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<ProjectDataState>(EMPTY_PROJECT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [audioToDelete, setAudioToDelete] = useState<string | null>(null);
  const [deletingAudio, setDeletingAudio] = useState(false);

  const isPlaying = useAudioIsPlaying();
  const activeId = useAudioActiveId();
  const { play, toggle } = useGlobalAudioActions();

  // Rastreia blob URLs criados para limpeza ao desmontar/trocar projeto
  const blobUrlsRef = useRef<string[]>([]);

  const cleanupBlobUrls = () => {
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = [];
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
      setError('Não foi possível carregar sua biblioteca. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user]);

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
      setDetailError('Não foi possível carregar os detalhes do projeto. Verifique sua conexão e tente novamente.');
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
      blobUrlsRef.current.push(url);
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

  // W8: Registra blob URLs criados pelo useMemo para cleanup, revogando URLs anteriores
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
    }
    // Acumula apenas as novas
    for (const url of blobUrls) {
      if (!blobUrlsRef.current.includes(url)) {
        blobUrlsRef.current.push(url);
      }
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
      cleanupBlobUrls();
      await loadProjects();
    } catch (err) {
      log.error('Falha ao excluir projeto', { error: err });
      setDeleteError('Não foi possível excluir o projeto. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (editName.trim()) {
      await updateProjectName(id, editName.trim(), user?.uid);
      await loadProjects();
    }

    setEditingId(null);
  };

  const confirmDeleteAudio = async () => {
    if (!audioToDelete) return;

    setDeletingAudio(true);
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
            Biblioteca
          </Typography>
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
            <Folder sx={{ fontSize: ICON_SIZE_LG, color: 'primary.main' }} />
            <Typography variant="h4">Projetos salvos</Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
            Um painel mais claro para revisar ativos do projeto, renomear versões, retomar áudio e baixar cenas sem excesso de ruído visual.
          </Typography>
        </Stack>

        <Stack spacing={GAP_DEFAULT} sx={{ alignItems: 'flex-end' }}>
          <Chip label={`${filteredProjects.length} projeto${filteredProjects.length === 1 ? '' : 's'}`} variant="outlined" />
          {projects.length > 0 && (
            <TextField
              type="search"
              size="small"
              placeholder="Buscar projeto..."
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
                          aria-label="Limpar busca"
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
                '& .MuiOutlinedInput-root': {
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                  },
                  '&:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.16)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2E75B6',
                      borderWidth: 2,
                    },
                    boxShadow: '0 0 0 3px rgba(46, 117, 182, 0.15)',
                  },
                },
              }}
            />
          )}
        </Stack>
      </Stack>

      {!user ? (
        <Alert variant="outlined" severity="info">
          Sem login, a biblioteca usa armazenamento local deste navegador. Entre com sua conta para sincronizar projetos na nuvem.
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
              Tentar novamente
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
            <Typography variant="h5">Sua biblioteca ainda está vazia</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH }}>
              Quando você salvar áudios e cenas do estúdio, os projetos aparecem aqui com acesso rápido a downloads e histórico visual.
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
            <Typography variant="h5">Nenhum projeto encontrado</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH }}>
              Nenhum projeto corresponde a &ldquo;{searchQuery}&rdquo;. Tente outro termo de busca.
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
                                      <IconButton color="success" onClick={() => void saveEdit(project.id)} aria-label="Salvar nome do projeto">
                                        <Check sx={{ fontSize: ICON_SIZE_MD }} />
                                      </IconButton>
                                      <IconButton onClick={() => setEditingId(null)} aria-label="Cancelar edição do nome">
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
                            <Tooltip title="Renomear projeto">
                              <IconButton
                                onClick={() => {
                                  setEditingId(project.id);
                                  setEditName(project.name);
                                }}
                                aria-label="Renomear projeto"
                              >
                                <Edit sx={{ fontSize: ICON_SIZE_MD }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}

                        <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          <Chip icon={<GraphicEq sx={{ fontSize: ICON_SIZE_SM }} />} label="Áudio" size="small" variant="outlined" />
                          <Chip icon={<ImageIcon sx={{ fontSize: ICON_SIZE_SM }} />} label="Cenas" size="small" variant="outlined" />
                          <Chip label={new Date(project.createdAt).toLocaleString()} size="small" />
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                          onClick={() => void handleExpandProject(project.id)}
                          variant={isExpanded ? 'contained' : 'outlined'}
                            startIcon={isExpanded ? <ChevronUp sx={{ fontSize: ICON_SIZE_MD }} /> : <ChevronDown sx={{ fontSize: ICON_SIZE_MD }} />}
                        >
                          {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                        </Button>

                        <Button
                          onClick={() => setItemToDelete(project.id)}
                          color="error"
                          variant="outlined"
                            startIcon={<Delete sx={{ fontSize: ICON_SIZE_MD }} />}
                        >
                          Excluir
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
                                  Versões de áudio
                                </Typography>

                                {detailError ? (
                                  <Alert
                                    variant="outlined"
                                    severity="error"
                                    action={
                                      <Button color="inherit" size="small" onClick={() => void handleExpandProject(project.id)}>
                                        Tentar novamente
                                      </Button>
                                    }
                                  >
                                    {detailError}
                                  </Alert>
                                ) : projectData.audios.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Nenhum áudio encontrado neste projeto.
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
                                              <Typography variant="subtitle2">Versão {new Date(audio.createdAt).toLocaleTimeString()}</Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {new Date(audio.createdAt).toLocaleDateString()}
                                              </Typography>
                                            </Stack>

                                            <Stack direction="row" spacing={GAP_COMPACT}>
                                              <Tooltip title={isPlaying && isCurrent ? 'Pausar áudio' : 'Reproduzir áudio'}>
                                                <span>
                                                  <IconButton
                                                    onClick={() => handlePlay(audio)}
                                                    color={isCurrent ? 'secondary' : 'primary'}
                                                    aria-label={isPlaying && isCurrent ? 'Pausar áudio' : 'Reproduzir áudio'}
                                                  >
                                                    {isPlaying && isCurrent ? <Pause sx={{ fontSize: ICON_SIZE_LG }} /> : <PlayArrow sx={{ fontSize: ICON_SIZE_LG }} />}
                                                  </IconButton>
                                                </span>
                                              </Tooltip>

                                              <Tooltip title="Baixar áudio">
                                                <span>
                                                  <IconButton
                                                    onClick={() => {
                                                      const url = audio.audioUrl || (audio.audioBlob ? URL.createObjectURL(audio.audioBlob) : '');
                                                      if (url) {
                                                        if (!audio.audioUrl && url.startsWith('blob:')) {
                                                          blobUrlsRef.current.push(url);
                                                        }
                                                        void downloadFile(url, `${project.name}-${audio.id}.wav`);
                                                      }
                                                    }}
                                                    aria-label="Baixar áudio"
                                                  >
                                                    <Download sx={{ fontSize: ICON_SIZE_MD }} />
                                                  </IconButton>
                                                </span>
                                              </Tooltip>

                                              <Tooltip title="Excluir áudio">
                                                <span>
                                                  <IconButton
                                                    onClick={() => setAudioToDelete(audio.id)}
                                                    color="error"
                                                    aria-label="Excluir áudio"
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
                                  Cenas geradas
                                </Typography>

                                {detailError ? (
                                  <Alert
                                    variant="outlined"
                                    severity="error"
                                    action={
                                      <Button color="inherit" size="small" onClick={() => void handleExpandProject(project.id)}>
                                        Tentar novamente
                                      </Button>
                                    }
                                  >
                                    {detailError}
                                  </Alert>
                                ) : projectData.images.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Nenhuma imagem encontrada neste projeto.
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
                                              alt={`Cena ${index + 1}`}
                                              loading="lazy"
                                              sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
                                            />
                                            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ p: 1.25, alignItems: 'center', justifyContent: 'space-between' }}>
                                              <Typography variant="caption" color="text.secondary">
                                                Cena {index + 1}
                                              </Typography>
                                              <IconButton
                                                onClick={() => {
                                                  if (img.resolvedUrl) {
                                                    void downloadFile(img.resolvedUrl, `${project.name}-cena-${index + 1}.png`);
                                                  }
                                                }}
                                                aria-label={`Baixar cena ${index + 1}`}
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
                              Roteiro original
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

      <Dialog
        open={Boolean(itemToDelete)}
        onClose={deleting ? undefined : () => setItemToDelete(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="delete-project-title"
        aria-describedby="delete-project-description"
        slotProps={{
          paper: {
            sx: (theme) => ({
              ...glassPanelSx(theme),
              borderRadius: RADIUS_SM,
              backgroundImage: 'none',
            }),
          },
        }}
      >
        <DialogTitle id="delete-project-title">
          {deleting ? 'Excluindo projeto...' : 'Excluir projeto?'}
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-project-description" variant="body2" color="text.secondary">
            Esta ação remove permanentemente o projeto, seus áudios e suas imagens associadas.
          </Typography>
          {deleteError && (
            <Alert variant="outlined" severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setItemToDelete(null); setDeleteError(null); }} color="inherit" disabled={deleting}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmDelete()} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Excluindo...' : 'Excluir projeto'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(audioToDelete)}
        onClose={deletingAudio ? undefined : () => setAudioToDelete(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="delete-audio-title"
        slotProps={{
          paper: {
            sx: (theme) => ({
              ...glassPanelSx(theme),
              borderRadius: RADIUS_SM,
              backgroundImage: 'none',
            }),
          },
        }}
      >
        <DialogTitle id="delete-audio-title">
          {deletingAudio ? 'Excluindo áudio...' : 'Excluir versão de áudio?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta ação remove permanentemente esta versão de áudio e suas cenas associadas do Storage.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAudioToDelete(null)} color="inherit" disabled={deletingAudio}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmDeleteAudio()} color="error" variant="contained" disabled={deletingAudio}>
            {deletingAudio ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
