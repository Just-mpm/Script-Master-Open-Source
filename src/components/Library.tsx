import { useCallback, useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
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
import {
  getProjects,
  deleteProject,
  updateProjectName,
  getProjectAudios,
  getProjectImages,
  type Project,
  type AudioSource,
  type ProjectImage,
} from '../lib/db';
import { useGlobalAudioState } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { downloadFile } from '../lib/download';
import { glassPanelSx, insetPanelSx } from '../theme/surfaces';

interface ProjectDataState {
  audios: AudioSource[];
  images: ProjectImage[];
}

const EMPTY_PROJECT_DATA: ProjectDataState = { audios: [], images: [] };

export function Library() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<ProjectDataState>(EMPTY_PROJECT_DATA);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { isPlaying, activeId, play, toggle } = useGlobalAudioState();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjects(user?.uid);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load library:', error);
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
      return;
    }

    setExpandedProjectId(projectId);
    try {
      const [audios, images] = await Promise.all([
        getProjectAudios(projectId, user?.uid),
        getProjectImages(projectId, user?.uid),
      ]);
      setProjectData({ audios, images });
    } catch (err) {
      console.error('Error loading project details:', err);
    }
  };

  const handlePlay = (audio: AudioSource) => {
    if (activeId === audio.id) {
      toggle(audio.id);
      return;
    }

    const url = audio.audioUrl || (audio.audioBlob ? URL.createObjectURL(audio.audioBlob) : '');

    if (url) {
      play(url, audio.id);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) {
      return;
    }

    await deleteProject(itemToDelete, user?.uid);
    setItemToDelete(null);
    await loadProjects();
  };

  const saveEdit = async (id: string) => {
    if (editName.trim()) {
      await updateProjectName(id, editName.trim(), user?.uid);
      await loadProjects();
    }

    setEditingId(null);
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.75}>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}>
            Biblioteca
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Folder sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="h4">Projetos salvos</Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
            Um painel mais claro para revisar ativos do projeto, renomear versões, retomar áudio e baixar cenas sem excesso de ruído visual.
          </Typography>
        </Stack>

        <Chip label={`${projects.length} projeto${projects.length === 1 ? '' : 's'}`} variant="outlined" />
      </Stack>

      {!user ? (
        <Alert variant="outlined" severity="info">
          Sem login, a biblioteca usa armazenamento local deste navegador. Entre com sua conta para sincronizar projetos na nuvem.
        </Alert>
      ) : null}

      {loading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12 }}>
              <Card elevation={0} sx={(theme): SystemStyleObject<Theme> => ({ ...glassPanelSx(theme), p: 2.5 })}>
                <Stack spacing={2}>
                  <Skeleton variant="text" animation="wave" width="36%" height={34} />
                  <Skeleton variant="text" animation="wave" width="22%" />
                  <Skeleton variant="rounded" animation="wave" height={48} />
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : projects.length === 0 ? (
        <Card elevation={0} sx={(theme): SystemStyleObject<Theme> => ({ ...glassPanelSx(theme), p: { xs: 3, md: 5 }, textAlign: 'center' })}>
            <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
            <Album sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="h6">Sua biblioteca ainda está vazia</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
              Quando você salvar áudios e cenas do estúdio, os projetos aparecem aqui com acesso rápido a downloads e histórico visual.
            </Typography>
          </Stack>
        </Card>
      ) : (
        <Stack spacing={2}>
          {projects.map((project: Project) => {
            const isExpanded = expandedProjectId === project.id;

            return (
              <Card key={project.id} elevation={0} sx={(theme): SystemStyleObject<Theme> => ({ ...glassPanelSx(theme), overflow: 'hidden' })}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2.5}>
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
                                        <Check sx={{ fontSize: 16 }} />
                                      </IconButton>
                                      <IconButton onClick={() => setEditingId(null)} aria-label="Cancelar edição do nome">
                                        <Close sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Stack>
                                  </InputAdornment>
                                ),
                              },
                            }}
                          />
                        ) : (
                          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ minWidth: 0 }} noWrap>
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
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}

                        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          <Chip icon={<GraphicEq sx={{ fontSize: 14 }} />} label="Áudio" size="small" variant="outlined" />
                          <Chip icon={<ImageIcon sx={{ fontSize: 14 }} />} label="Cenas" size="small" variant="outlined" />
                          <Chip label={new Date(project.createdAt).toLocaleString()} size="small" />
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                          onClick={() => void handleExpandProject(project.id)}
                          variant={isExpanded ? 'contained' : 'outlined'}
                            startIcon={isExpanded ? <ChevronUp sx={{ fontSize: 16 }} /> : <ChevronDown sx={{ fontSize: 16 }} />}
                        >
                          {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                        </Button>

                        <Button
                          onClick={() => setItemToDelete(project.id)}
                          color="error"
                          variant="outlined"
                            startIcon={<Delete sx={{ fontSize: 16 }} />}
                        >
                          Excluir
                        </Button>
                      </Stack>
                    </Stack>

                    {isExpanded ? (
                      <Stack spacing={3}>
                        <Grid container spacing={2.5}>
                          <Grid size={{ xs: 12, lg: 5 }}>
                            <Box sx={(theme): SystemStyleObject<Theme> => ({ ...insetPanelSx(theme), p: 2.25, height: '100%' })}>
                              <Stack spacing={1.5}>
                                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}>
                                  Versões de áudio
                                </Typography>

                                {projectData.audios.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Nenhum áudio encontrado neste projeto.
                                  </Typography>
                                ) : (
                                  <Stack spacing={1.25}>
                                    {projectData.audios.map((audio: AudioSource) => {
                                      const isCurrent = activeId === audio.id;

                                      return (
                                        <Card
                                          key={audio.id}
                                          elevation={0}
                                          sx={(theme): SystemStyleObject<Theme> => ({
                                            p: 1.5,
                                            borderRadius: 3,
                                            bgcolor: alpha(theme.palette.common.white, 0.03),
                                          })}
                                        >
                                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                                              <Typography variant="subtitle2">Versão {new Date(audio.createdAt).toLocaleTimeString()}</Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {new Date(audio.createdAt).toLocaleDateString()}
                                              </Typography>
                                            </Stack>

                                            <Stack direction="row" spacing={0.75}>
                                              <IconButton
                                                onClick={() => handlePlay(audio)}
                                                color={isCurrent ? 'secondary' : 'primary'}
                                                aria-label={isPlaying && isCurrent ? 'Pausar áudio' : 'Reproduzir áudio'}
                                              >
                                                {isPlaying && isCurrent ? <Pause sx={{ fontSize: 18 }} /> : <PlayArrow sx={{ fontSize: 18 }} />}
                                              </IconButton>

                                              <IconButton
                                                onClick={() => {
                                                  const url = audio.audioUrl || (audio.audioBlob ? URL.createObjectURL(audio.audioBlob) : '');
                                                  if (url) {
                                                    void downloadFile(url, `${project.name}-${audio.id}.wav`);
                                                  }
                                                }}
                                                aria-label="Baixar áudio"
                                              >
                                                <Download sx={{ fontSize: 16 }} />
                                              </IconButton>
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
                            <Box sx={(theme): SystemStyleObject<Theme> => ({ ...insetPanelSx(theme), p: 2.25, height: '100%' })}>
                              <Stack spacing={1.5}>
                                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}>
                                  Cenas geradas
                                </Typography>

                                {projectData.images.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Nenhuma imagem encontrada neste projeto.
                                  </Typography>
                                ) : (
                                  <Grid container spacing={1.5}>
                                    {projectData.images.map((img: ProjectImage, index: number) => {
                                      const imageSrc = img.imageUrl || (img.imageBlob ? URL.createObjectURL(img.imageBlob) : '');

                                      return (
                                        <Grid key={img.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                          <Card
                                            elevation={0}
                                            sx={(theme): SystemStyleObject<Theme> => ({
                                              borderRadius: 3,
                                              overflow: 'hidden',
                                              bgcolor: alpha(theme.palette.common.white, 0.03),
                                            })}
                                          >
                                            <Box
                                              component="img"
                                              src={imageSrc}
                                              alt={`Cena ${index + 1}`}
                                              loading="lazy"
                                              sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
                                            />
                                            <Stack direction="row" spacing={1} sx={{ p: 1.25, alignItems: 'center', justifyContent: 'space-between' }}>
                                              <Typography variant="caption" color="text.secondary">
                                                Cena {index + 1}
                                              </Typography>
                                              <IconButton
                                                onClick={() => {
                                                  if (imageSrc) {
                                                    void downloadFile(imageSrc, `${project.name}-cena-${index + 1}.png`);
                                                  }
                                                }}
                                                aria-label={`Baixar cena ${index + 1}`}
                                              >
                                                <Download sx={{ fontSize: 16 }} />
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

                        <Box sx={(theme): SystemStyleObject<Theme> => ({ ...insetPanelSx(theme), p: 2.25 })}>
                          <Stack spacing={1}>
                            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.16em' }}>
                              Roteiro original
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                              {project.script}
                            </Typography>
                          </Stack>
                        </Box>
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
        onClose={() => setItemToDelete(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="delete-project-title"
        aria-describedby="delete-project-description"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
            },
          },
        }}
      >
        <DialogTitle id="delete-project-title">Excluir projeto?</DialogTitle>
        <DialogContent>
          <Typography id="delete-project-description" variant="body2" color="text.secondary">
            Esta ação remove permanentemente o projeto, seus áudios e suas imagens associadas.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setItemToDelete(null)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={() => void confirmDelete()} color="error" variant="contained">
            Excluir projeto
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
