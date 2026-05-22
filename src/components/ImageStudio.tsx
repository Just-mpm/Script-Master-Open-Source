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
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
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
import Refresh from '@mui/icons-material/Refresh';
import Save from '@mui/icons-material/Save';
import Stop from '@mui/icons-material/Stop';
import Sparkles from '@mui/icons-material/AutoAwesome';
import { useImageGenerator } from '../hooks/useImageGenerator';
import { deleteImageGeneration, getImageGenerations, saveImageGeneration, type SavedImage } from '../lib/db';
import { downloadFile } from '../lib/download';
import { createLogger } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../features/i18n';
import { glassPanelSx, insetPanelSx, searchFieldSx } from '../theme/surfaces';
import { DeleteConfirmationDialog } from './video-library/DeleteConfirmationDialog';
import { CreditBlockedMessage } from './CreditBlockedMessage';
import { StockMediaPicker } from '../features/studio/components/StockMediaPicker';
import type { StockImage } from '../lib/stockMedia';
import { downloadStockImage } from '../lib/stockMedia';
import { SHADOW_IMAGE, ICON_SIZE_SM, ICON_SIZE_MD, ICON_SIZE_LG, GAP_DEFAULT, GAP_MEDIUM, GAP_COMPACT, RADIUS_SM, EMPTY_ICON_SIZE, EMPTY_WRAPPER_MAX_WIDTH, BRAND_GRADIENT } from '../theme/tokens';

const log = createLogger('ImageStudio');

/** IDs dos aspect ratios (constante fora do componente para evitar recriação de objetos com useMemo) */
const ASPECT_RATIO_IDS = [
  '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9',
] as const;

/** Mapeia ID para chave i18n correspondente */
const ASPECT_RATIO_KEYS: Record<string, string> = {
  '1:1': 'imageStudioRatios.square',
  '16:9': 'imageStudioRatios.landscape',
  '9:16': 'imageStudioRatios.portrait',
  '4:3': 'imageStudioRatios.horizontal',
  '3:4': 'imageStudioRatios.vertical',
  '3:2': 'imageStudioRatios.wide',
  '2:3': 'imageStudioRatios.ultraTall',
  '21:9': 'imageStudioRatios.ultraWide',
};

export function ImageStudio() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const { user } = useAuth();
  const { t } = useLocale();

  // Memoiza labels localizados dos aspect ratios
  const aspectRatios = useMemo(
    () => ASPECT_RATIO_IDS.map((id) => ({ id, label: t(ASPECT_RATIO_KEYS[id]) })),
    [t],
  );
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<SavedImage | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [imageDeleteError, setImageDeleteError] = useState<string | null>(null);

  // Aba ativa: 'ai' para geração com IA, 'stock' para mídia stock
  const [activeTab, setActiveTab] = useState<'ai' | 'stock'>('ai');

  // Imagem stock selecionada (blob URL para preview)
  const [stockImageBlobUrl, setStockImageBlobUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isGenerating, imageUrl, imageBlob, error, setError, generateImage, handleCancel, creditsExhausted } = useImageGenerator();

  // Carrega imagens salvas na biblioteca
  const loadSavedImages = useCallback(async () => {
    setImagesLoading(true);
    setImagesError(null);
    try {
      const images = await getImageGenerations(user?.uid);
      setSavedImages(images);
    } catch (loadError) {
      log.error('Falha ao carregar imagens salvas', { error: loadError });
      setImagesError(t('imageStudio.loadError'));
    } finally {
      setImagesLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void loadSavedImages();
  }, [loadSavedImages]);

  // Cleanup de blob URL ao desmontar (Fix P2-2)
  useEffect(() => {
    return () => {
      if (referencePreview) URL.revokeObjectURL(referencePreview);
      if (stockImageBlobUrl) URL.revokeObjectURL(stockImageBlobUrl);
    };
  }, [referencePreview, stockImageBlobUrl]);

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

  const handleStockImageSelect = useCallback(async (stockImage: StockImage) => {
    // Revoga blob URL anterior
    if (stockImageBlobUrl) {
      URL.revokeObjectURL(stockImageBlobUrl);
    }

    try {
      const blob = await downloadStockImage(stockImage);
      const blobUrl = URL.createObjectURL(blob);
      setStockImageBlobUrl(blobUrl);
      setIsSaved(false);
      log.info('Imagem stock selecionada', { id: stockImage.id, alt: stockImage.alt });
    } catch (downloadError) {
      log.error('Erro ao baixar imagem stock', { error: downloadError });
    }
  }, [stockImageBlobUrl]);

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
    const downloadUrl = imageUrl || stockImageBlobUrl;
    if (!downloadUrl) {
      return;
    }

    // Reutiliza utilitário centralizado de download (bp #3)
    downloadFile(downloadUrl, `imagem-gerada-${Date.now()}.png`);
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
      setSuccessMsg(user ? t('imageStudio.savedCloud') : t('imageStudio.savedLocal'));
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setSuccessMsg(null);
        successTimerRef.current = null;
      }, 3000);
      // Atualiza a galeria após salvar
      void loadSavedImages();
    } catch (saveError) {
      log.error('Erro ao salvar na biblioteca', { error: saveError });
      setError(t('imageStudio.saveError'));
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
      setImageDeleteError(t('imageStudio.deleteError'));
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
      // Limpa timer de successMsg ao desmontar
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
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
                  {t('imageStudio.sidebarTitle')}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t('imageStudio.sidebarDescription')}
              </Typography>
            </Stack>
          </Button>

          <Collapse in={isSidebarOpen} timeout="auto">
            <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
                <Box sx={(currentTheme): SystemStyleObject<Theme> => ({ ...insetPanelSx(currentTheme), p: 2 })}>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="image-studio-ratio">{t('imageStudio.ratioLabel')}</InputLabel>
                    <Select
                      labelId="image-studio-ratio"
                      value={aspectRatio}
                      label={t('imageStudio.ratioLabel')}
                      onChange={(event) => setAspectRatio(event.target.value)}
                      disabled={isGenerating}
                    >
                      {aspectRatios.map((ratio) => (
                        <MenuItem key={ratio.id} value={ratio.id}>
                          {ratio.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Stack spacing={1}>
                    {/* subtitle2 é adequado aqui: label dentro de subseção Collapse, abaixo do overline do painel. Promover para subtitle1 criaria inconsistência hierárquica. */}
                    <Typography variant="subtitle2">{t('imageStudio.referenceTitle')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('imageStudio.referenceDescription')}
                    </Typography>

                    {referencePreview ? (
                      <Card elevation={0} sx={{ borderRadius: RADIUS_SM, overflow: 'hidden', position: 'relative' }}>
                        <Box component="img" src={referencePreview} alt={t('imageStudio.referenceAlt')} sx={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
                        <Tooltip title={t('imageStudio.removeReference')}>
                          <IconButton
                            onClick={clearReference}
                            aria-label={t('imageStudio.removeReferenceAria')}
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
                        {t('imageStudio.uploadReference')}
                      </Button>
                    )}
                  </Stack>

                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" hidden />

                  <Alert variant="outlined" severity="info">
                    {t('imageStudio.promptTip')}
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
                  <Typography variant="h4" component="h1">{t('imageStudio.pageTitle')}</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
                    {t('imageStudio.pageDescription')}
                  </Typography>
                </Stack>

                <Chip icon={<ImageIcon sx={{ fontSize: ICON_SIZE_MD }} />} label={aspectRatio} color="primary" variant="outlined" />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
                <Tabs
                  value={activeTab}
                  onChange={(_event, newValue: 'ai' | 'stock') => setActiveTab(newValue)}
                  sx={{
                    minHeight: 36,
                    '& .MuiTabs-indicator': { borderRadius: '3px 3px 0 0' },
                  }}
                >
                  <Tab
                    icon={<Sparkles sx={{ fontSize: ICON_SIZE_SM }} />}
                    iconPosition="start"
                    label={t('imageStudio.tabAI')}
                    value="ai"
                    sx={{ minHeight: 36, textTransform: 'none', fontWeight: 500 }}
                  />
                  <Tab
                    icon={<ImageIcon sx={{ fontSize: ICON_SIZE_SM }} />}
                    iconPosition="start"
                    label={t('imageStudio.tabStock')}
                    value="stock"
                    sx={{ minHeight: 36, textTransform: 'none', fontWeight: 500 }}
                  />
                </Tabs>
              </Stack>

              {activeTab === 'ai' && (
                <>
                  <TextField
                    multiline
                    minRows={5}
                    maxRows={10}
                    fullWidth
                    label={t('imageStudio.promptLabel')}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={t('imageStudio.promptPlaceholder')}
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
                        {t('imageStudio.stopGeneration')}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || creditsExhausted}
                        variant="contained"
                        size="large"
                        startIcon={<Sparkles sx={{ fontSize: ICON_SIZE_MD }} />}
                      >
                        {t('imageStudio.generateImage')}
                      </Button>
                    )}
                  </Stack>
                </>
              )}

              {activeTab === 'stock' && (
                <StockMediaPicker onSelect={handleStockImageSelect} />
              )}

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
                ) : (imageUrl || stockImageBlobUrl) ? (
                  <Stack spacing={2} sx={{ width: '100%', height: '100%' }}>
                    <Box
                      component="img"
                      src={imageUrl || stockImageBlobUrl || ''}
                      alt={stockImageBlobUrl ? t('imageStudio.stockAlt') : t('imageStudio.generatedAlt')}
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
                        {stockImageBlobUrl
                          ? t('imageStudio.stockReady')
                          : t('imageStudio.resultReady')}
                      </Typography>

                      <Stack direction="row" spacing={GAP_MEDIUM} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        {stockImageBlobUrl && (
                          <Button
                            onClick={handleDownload}
                            variant="contained"
                            color="secondary"
                            startIcon={<Download sx={{ fontSize: ICON_SIZE_MD }} />}
                          >
                            {t('imageStudio.downloadImage')}
                          </Button>
                        )}
                        {!stockImageBlobUrl && (
                          <>
                            <Button
                              onClick={() => void handleSaveToLibrary()}
                              disabled={isSaved}
                              variant={isSaved ? 'contained' : 'outlined'}
                              color={isSaved ? 'success' : 'primary'}
                              startIcon={isSaved ? <Check sx={{ fontSize: ICON_SIZE_MD }} /> : <Save sx={{ fontSize: ICON_SIZE_MD }} />}
                            >
                              {isSaved ? t('imageStudio.savedToLibrary') : t('imageStudio.saveToLibrary')}
                            </Button>

                            <Button onClick={handleDownload} variant="contained" color="secondary" startIcon={<Download sx={{ fontSize: ICON_SIZE_MD }} />}>
                              {t('imageStudio.downloadImage')}
                            </Button>
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={1} sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH, alignItems: 'center', textAlign: 'center' }}>
                    <ImageIcon sx={{ fontSize: EMPTY_ICON_SIZE, color: theme.palette.text.disabled }} />
                    <Typography variant="h5">{t('imageStudio.emptyTitle')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('imageStudio.emptyDescription')}
                    </Typography>
                  </Stack>
                )}
              </Box>

              {creditsExhausted ? <CreditBlockedMessage show={true} /> : null}
              {error && !creditsExhausted ? <Alert variant="outlined" severity="error">{error}</Alert> : null}
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
                    {t('imageStudio.savedImages')}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t('imageStudio.savedImagesDescription')}
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
                    {t('imageStudio.noSavedImages')}
                  </Typography>
                </Box>
              ) : imagesError ? (
                <Alert
                  variant="outlined"
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={() => void loadSavedImages()}>
                      {t('common.tryAgain')}
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
                                aria-label={t('imageStudio.downloadAria', { name: img.name })}
                              >
                                <Download sx={{ fontSize: ICON_SIZE_SM }} />
                              </IconButton>
                            )}
                            <Tooltip title={t('imageStudio.deleteImage')}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setImageToDelete(img)}
                                aria-label={t('imageStudio.deleteAria', { name: img.name })}
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
      titleIdleLabel={t('imageStudio.deleteTitle')}
      loadingLabel={t('imageStudio.deleteLoading')}
      confirmLabel={t('imageStudio.deleteConfirm')}
      description={t('imageStudio.deleteDescription')}
      onConfirm={() => void handleDeleteImage()}
      onCancel={() => { setImageToDelete(null); setImageDeleteError(null); }}
    />

    {/* Snackbar: erro de galeria quando sidebar está colapsado (mobile) */}
    <Snackbar
      open={Boolean(imagesError) && isSidebarCollapsed}
      autoHideDuration={8000}
      onClose={() => setImagesError(null)}
      message={imagesError}
      action={
        <Button
          color="inherit"
          size="small"
          startIcon={<Refresh sx={{ fontSize: 18 }} />}
          onClick={() => void loadSavedImages()}
        >
          {t('common.tryAgain')}
        </Button>
      }
    />
    </>
  );
}
