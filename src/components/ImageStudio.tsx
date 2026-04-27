import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import Check from '@mui/icons-material/Check';
import ChevronDown from '@mui/icons-material/ExpandMore';
import ChevronUp from '@mui/icons-material/ExpandLess';
import CloudUpload from '@mui/icons-material/CloudUpload';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Download from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import Save from '@mui/icons-material/Save';
import Stop from '@mui/icons-material/Stop';
import Sparkles from '@mui/icons-material/AutoAwesome';
import { useImageGenerator } from '../hooks/useImageGenerator';
import { deleteImageGeneration, getImageGenerations, saveImageGeneration, type SavedImage } from '../lib/db';
import { downloadFile } from '../lib/download';
import { createLogger } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { glassPanelSx, insetPanelSx, searchFieldSx } from '../theme/surfaces';
import { DeleteConfirmationDialog } from './video-library/DeleteConfirmationDialog';
import { SHADOW_IMAGE, ICON_SIZE_SM, ICON_SIZE_MD, ICON_SIZE_LG, GAP_DEFAULT, GAP_MEDIUM, GAP_COMPACT, RADIUS_SM, EMPTY_ICON_SIZE, EMPTY_WRAPPER_MAX_WIDTH, BRAND_GRADIENT } from '../theme/tokens';

const log = createLogger('ImageStudio');

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Quadrado (1:1)' },
  { id: '16:9', label: 'Paisagem (16:9)' },
  { id: '9:16', label: 'Retrato (9:16)' },
  { id: '4:3', label: 'Clássico (4:3)' },
  { id: '3:4', label: 'Retrato clássico (3:4)' },
  { id: '3:2', label: 'Foto (3:2)' },
  { id: '2:3', label: 'Foto retrato (2:3)' },
  { id: '21:9', label: 'Cinemático (21:9)' },
] as const;

export function ImageStudio() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<SavedImage | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [imageDeleteError, setImageDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isGenerating, imageUrl, imageBlob, error, setError, generateImage, handleCancel } = useImageGenerator();

  // Carrega imagens salvas na biblioteca
  const loadSavedImages = useCallback(async () => {
    setImagesLoading(true);
    setImagesError(null);
    try {
      const images = await getImageGenerations(user?.uid);
      setSavedImages(images);
    } catch (loadError) {
      log.error('Falha ao carregar imagens salvas', { error: loadError });
      setImagesError('Não foi possível carregar as imagens salvas. Verifique sua conexão e tente novamente.');
    } finally {
      setImagesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadSavedImages();
  }, [loadSavedImages]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setReferenceImage(file);

    // Revoga blob URL anterior antes de criar um novo (tech #5)
    if (referencePreview) {
      URL.revokeObjectURL(referencePreview);
    }
    setReferencePreview(URL.createObjectURL(file));
  };

  const clearReference = () => {
    setReferenceImage(null);

    // Revoga blob URL de referência (tech #5)
    if (referencePreview) {
      URL.revokeObjectURL(referencePreview);
    }
    setReferencePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      return;
    }

    setIsSaved(false);
    void generateImage({
      prompt,
      aspectRatio,
      referenceImage: referenceImage || undefined,
    });
  };

  const handleDownload = () => {
    if (!imageUrl) {
      return;
    }

    // Reutiliza utilitário centralizado de download (bp #3)
    downloadFile(imageUrl, `imagem-gerada-${Date.now()}.png`);
  };

  const handleSaveToLibrary = async () => {
    if (!imageBlob || isSaved) {
      return;
    }

    try {
      const newItem = {
        id: crypto.randomUUID(),
        name: `Imagem - ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        imageBlob,
        prompt,
        aspectRatio,
      };

      await saveImageGeneration(newItem, user?.uid);
      setIsSaved(true);
      setSuccessMsg(user ? 'Imagem salva na nuvem com sucesso.' : 'Imagem salva na biblioteca local.');
      window.setTimeout(() => setSuccessMsg(null), 3000);
      // Atualiza a galeria após salvar
      void loadSavedImages();
    } catch (saveError) {
      log.error('Erro ao salvar na biblioteca', { error: saveError });
      setError('Erro ao salvar na biblioteca.');
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) {
      return;
    }

    setDeletingImage(true);
    setImageDeleteError(null);
    try {
      await deleteImageGeneration(imageToDelete.id, user?.uid);
      setImageToDelete(null);
      void loadSavedImages();
    } catch (deleteErr) {
      log.error('Erro ao excluir imagem', { error: deleteErr });
      setImageDeleteError('Erro ao excluir a imagem. Tente novamente.');
    } finally {
      setDeletingImage(false);
    }
  };

  const isSidebarOpen = isDesktop || !isSidebarCollapsed;

  // Memoiza blob URLs de imagens salvas para evitar criar novas referências a cada render
  const blobUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const img of savedImages) {
      if (img.imageBlob && !img.imageUrl) {
        map.set(img.id, URL.createObjectURL(img.imageBlob));
      }
    }
    return map;
  }, [savedImages]);

  // Revoga blob URLs quando o mapa é recalculado (cleanup de memória)
  useEffect(() => {
    return () => {
      for (const url of blobUrls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, [blobUrls]);

  return (
    <>
    <Grid container spacing={{ xs: 3, lg: 4 }}>
      <Grid size={{ xs: 12, lg: 4, xl: 3.5 }}>
          <Paper elevation={0} sx={glassPanelSx}>
          <Button
            onClick={() => {
              if (!isDesktop) {
                setIsSidebarCollapsed((previous) => !previous);
              }
            }}
            color="inherit"
            fullWidth
            sx={{ justifyContent: 'space-between', px: 3, py: 2, borderRadius: 0 }}
            endIcon={!isDesktop ? (isSidebarOpen ? <ChevronUp sx={{ fontSize: ICON_SIZE_LG }} /> : <ChevronDown sx={{ fontSize: ICON_SIZE_LG }} />) : undefined}
          >
            <Stack spacing={0.6} sx={{ textAlign: 'left' }}>
              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                <ImageIcon sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} />
                <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                  Estúdio de imagem
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Ajuste formato, referência visual e contexto antes de gerar.
              </Typography>
            </Stack>
          </Button>

          <Collapse in={isSidebarOpen} timeout="auto">
            <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
                <Box sx={(currentTheme): SystemStyleObject<Theme> => ({ ...insetPanelSx(currentTheme), p: 2 })}>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="image-studio-ratio">Proporção</InputLabel>
                    <Select
                      labelId="image-studio-ratio"
                      value={aspectRatio}
                      label="Proporção"
                      onChange={(event) => setAspectRatio(event.target.value)}
                      disabled={isGenerating}
                    >
                      {ASPECT_RATIOS.map((ratio) => (
                        <MenuItem key={ratio.id} value={ratio.id}>
                          {ratio.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Stack spacing={1}>
                    {/* subtitle2 é adequado aqui: label dentro de subseção Collapse, abaixo do overline do painel. Promover para subtitle1 criaria inconsistência hierárquica. */}
                    <Typography variant="subtitle2">Imagem de referência</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Útil para manter personagens, composição ou estilo visual entre gerações.
                    </Typography>

                    {referencePreview ? (
                      <Card elevation={0} sx={{ borderRadius: RADIUS_SM, overflow: 'hidden', position: 'relative' }}>
                        <Box component="img" src={referencePreview} alt="Imagem de referência" sx={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
                        <Tooltip title="Remover referência">
                          <IconButton
                            onClick={clearReference}
                            aria-label="Remover referência"
                          sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'background.default' }}
                          >
                            <Close sx={{ fontSize: ICON_SIZE_MD }} />
                          </IconButton>
                        </Tooltip>
                      </Card>
                    ) : (
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outlined"
                        startIcon={<CloudUpload sx={{ fontSize: ICON_SIZE_MD }} />}
                        sx={{
                          borderStyle: 'dashed',
                          minHeight: 56,
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                          color: 'text.secondary',
                          transition: 'border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease',
                          '&:hover': {
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            backgroundColor: 'rgba(46, 117, 182, 0.06)',
                            borderStyle: 'dashed',
                          },
                        }}
                      >
                        Enviar imagem de referência
                      </Button>
                    )}
                  </Stack>

                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" hidden />

                  <Alert variant="outlined" severity="info">
                    Quanto mais específico o prompt, melhor a hierarquia visual, a iluminação e a fidelidade do resultado.
                  </Alert>
                </Stack>
              </Box>
            </Stack>
          </Collapse>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 8, xl: 8.5 }}>
        <Stack spacing={2.5}>
          <Paper elevation={0} sx={(currentTheme): SystemStyleObject<Theme> => ({ ...glassPanelSx(currentTheme), p: { xs: 2.5, md: 3 }, minHeight: { xs: 'auto', lg: 'calc(100vh - 12rem)' } })}>
            <Stack spacing={2.5} sx={{ height: '100%' }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
              >
                <Stack spacing={0.75}>
                  <Typography variant="h4">Criação visual com mais clareza</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
                    Uma superfície mais limpa para escrever prompts, revisar resultados e salvar o que vale reaproveitar.
                  </Typography>
                </Stack>

                <Chip icon={<ImageIcon sx={{ fontSize: ICON_SIZE_MD }} />} label={aspectRatio} color="primary" variant="outlined" />
              </Stack>

              <TextField
                multiline
                minRows={5}
                maxRows={10}
                fullWidth
                label="Prompt da imagem"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Descreva a composição, o clima, a iluminação, o enquadramento e o estilo visual desejado."
                disabled={isGenerating}
                sx={searchFieldSx}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                {isGenerating ? (
                  <Button
                    onClick={handleCancel}
                    variant="outlined"
                    color="error"
                    size="large"
                    startIcon={<Stop sx={{ fontSize: ICON_SIZE_MD }} />}
                  >
                    Parar geração
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    variant="contained"
                    size="large"
                    startIcon={<Sparkles sx={{ fontSize: ICON_SIZE_MD }} />}
                  >
                    Gerar imagem
                  </Button>
                )}
              </Stack>

              <Box
                sx={(currentTheme) => ({
                  ...insetPanelSx(currentTheme),
                  flex: 1,
                  minHeight: { xs: 320, md: 420 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: { xs: 1.5, md: 2 },
                  overflow: 'hidden',
                })}
              >
                {isGenerating ? (
                  <Stack spacing={2} sx={{ width: '100%', maxWidth: 560, alignItems: 'center' }}>
                    <Skeleton variant="rounded" animation="wave" width="100%" height={320} />
                    <Skeleton variant="text" animation="wave" width="34%" />
                  </Stack>
                ) : imageUrl ? (
                  <Stack spacing={2} sx={{ width: '100%', height: '100%' }}>
                    <Box
                      component="img"
                      src={imageUrl}
                      alt="Imagem gerada"
                      sx={{
                        width: '100%',
                        maxHeight: { xs: 360, md: 520 },
                        objectFit: 'contain',
                        borderRadius: RADIUS_SM,
                        boxShadow: `0 30px 80px ${SHADOW_IMAGE}`,
                      }}
                    />

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Resultado pronto para download ou reaproveitamento na biblioteca.
                      </Typography>

                      <Stack direction="row" spacing={GAP_MEDIUM} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                          onClick={() => void handleSaveToLibrary()}
                          disabled={isSaved}
                          variant={isSaved ? 'contained' : 'outlined'}
                          color={isSaved ? 'success' : 'primary'}
                          startIcon={isSaved ? <Check sx={{ fontSize: ICON_SIZE_MD }} /> : <Save sx={{ fontSize: ICON_SIZE_MD }} />}
                        >
                          {isSaved ? 'Salvo na biblioteca' : 'Salvar na biblioteca'}
                        </Button>

                        <Button onClick={handleDownload} variant="contained" color="secondary" startIcon={<Download sx={{ fontSize: ICON_SIZE_MD }} />}>
                          Baixar imagem
                        </Button>
                      </Stack>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={1} sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH, alignItems: 'center', textAlign: 'center' }}>
                    <ImageIcon sx={{ fontSize: EMPTY_ICON_SIZE, color: theme.palette.text.disabled }} />
                    <Typography variant="h5">Sua prévia aparece aqui</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Escreva um prompt claro e, se quiser, anexe uma referência para orientar estilo, composição e consistência visual.
                    </Typography>
                  </Stack>
                )}
              </Box>

              {error ? <Alert variant="outlined" severity="error">{error}</Alert> : null}
              {successMsg ? <Alert variant="outlined" severity="success">{successMsg}</Alert> : null}
            </Stack>
          </Paper>

          {/* Galeria de imagens salvas */}
          <Paper elevation={0} sx={(currentTheme): SystemStyleObject<Theme> => ({ ...glassPanelSx(currentTheme), p: { xs: 2.5, md: 3 } })}>
            <Stack spacing={GAP_MEDIUM}>
              <Stack spacing={GAP_COMPACT}>
                <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                  <ImageIcon sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} />
                  <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                    Imagens salvas
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Suas imagens geradas anteriormente. Baixe ou exclua conforme necessário.
                </Typography>
              </Stack>

              {imagesLoading ? (
                <Grid container spacing={1.5}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Grid key={index} size={{ xs: 6, sm: 4, md: 3 }}>
                      <Skeleton variant="rounded" animation="wave" sx={{ aspectRatio: '1 / 1', borderRadius: RADIUS_SM }} />
                    </Grid>
                  ))}
                </Grid>
              ) : savedImages.length === 0 && !imagesError ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: BRAND_GRADIENT,
                    opacity: 0.2,
                    mx: 'auto',
                    mb: 1,
                  }}>
                    <ImageIcon sx={{ fontSize: 22, color: 'common.white' }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma imagem salva ainda. Gere e salve sua primeira imagem acima.
                  </Typography>
                </Box>
              ) : imagesError ? (
                <Alert
                  variant="outlined"
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={() => void loadSavedImages()}>
                      Tentar novamente
                    </Button>
                  }
                >
                  {imagesError}
                </Alert>
              ) : (
                <Grid container spacing={1.5}>
                  {savedImages.map((img) => (
                    <Grid key={img.id} size={{ xs: 6, sm: 4, md: 3 }}>
                      <Card
                        elevation={0}
                        sx={(currentTheme): SystemStyleObject<Theme> => ({
                          borderRadius: RADIUS_SM,
                          overflow: 'hidden',
                          position: 'relative',
                          transition: currentTheme.transitions.create(['box-shadow', 'transform'], { duration: 200 }),
                          '&:hover': {
                            boxShadow: `0 12px 36px ${alpha(currentTheme.palette.common.black, 0.36)}`,
                            transform: 'translateY(-2px)',
                            '& .gallery-img-overlay': { opacity: 1 },
                          },
                        })}
                      >
                        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                          <Box
                            component="img"
                            src={img.imageUrl || blobUrls.get(img.id) || ''}
                            alt={img.name}
                            loading="lazy"
                            sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                          />
                          <Box
                            className="gallery-img-overlay"
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.5) 100%)',
                              opacity: 0,
                              transition: 'opacity 0.25s ease',
                              pointerEvents: 'none',
                            }}
                          />
                        </Box>
                        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ p: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                          <Tooltip title={img.prompt || img.name}>
                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {img.name}
                            </Typography>
                          </Tooltip>
                          <Stack direction="row" spacing={GAP_COMPACT}>
                            {(img.imageUrl || blobUrls.get(img.id)) && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const url = img.imageUrl || blobUrls.get(img.id);
                                  if (url) downloadFile(url, `${img.name}.png`);
                                }}
                                aria-label={`Baixar ${img.name}`}
                              >
                                <Download sx={{ fontSize: ICON_SIZE_SM }} />
                              </IconButton>
                            )}
                            <Tooltip title="Excluir imagem">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setImageToDelete(img)}
                                aria-label={`Excluir ${img.name}`}
                              >
                                <Delete sx={{ fontSize: ICON_SIZE_SM }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Grid>
    </Grid>

    {/* Dialog de confirmação de exclusão */}
    <DeleteConfirmationDialog
      open={Boolean(imageToDelete)}
      itemName={imageToDelete?.name ?? null}
      deletingItem={deletingImage}
      deleteError={imageDeleteError}
      titleIdleLabel="Excluir imagem?"
      loadingLabel="Excluindo imagem..."
      confirmLabel="Excluir imagem"
      description="Esta ação remove permanentemente a imagem da biblioteca. A operação não pode ser desfeita."
      onConfirm={() => void handleDeleteImage()}
      onCancel={() => { setImageToDelete(null); setImageDeleteError(null); }}
    />
    </>
  );
}
