import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import Close from '@mui/icons-material/Close';
import FolderOpen from '@mui/icons-material/FolderOpen';
import Movie from '@mui/icons-material/Movie';
import Search from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'motion/react';
import { glassPanelSx } from '../theme/surfaces';
import { ICON_SIZE_SM, ICON_SIZE_MD, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, GAP_RELAXED, EMPTY_WRAPPER_PADDING_XS, EMPTY_WRAPPER_PADDING_MD, BRAND_GRADIENT } from '../theme/tokens';
import { GalleryCard } from './video-library/GalleryCard';
import { DeleteConfirmationDialog } from './video-library/DeleteConfirmationDialog';
import { useProjectGallery } from './video-library/useProjectGallery';
import { useBatchDownload } from './video-library/useBatchDownload';
import type { VideoLibraryProps } from './video-library/types';
import { useLocale } from '../features/i18n';

// Re-export para compatibilidade com consumidores existentes
export type { VideoLibraryItem, VideoLibraryProps, SortOrder } from './video-library/types';

/**
 * Galeria horizontal de vídeos exportados.
 * Orquestra busca, filtro, seleção, download em lote e exclusão.
 */
export function VideoLibrary({ onSelect, activeProjectId }: VideoLibraryProps) {
  const { t } = useLocale();
  const navigate = useNavigate();

  const {
    loading,
    error,
    filteredProjects,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    itemToDelete,
    deletingItem,
    deleteError,
    setItemToDelete,
    confirmDeleteItem,
    handleSelect,
    reload,
  } = useProjectGallery(onSelect);

  const {
    downloadingId,
    downloadError,
    setDownloadError,
    handleDownloadSequence,
  } = useBatchDownload();

  // --- Estados de carregamento, erro e vazio ---

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
          <Button color="inherit" size="small" onClick={() => { void reload(); }}>
            {t('common.tryAgain')}
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (filteredProjects.length === 0 && !searchQuery.trim()) {
    return (
      <Paper elevation={0} sx={(theme): SystemStyleObject<Theme> => ({ ...glassPanelSx(theme), p: { xs: EMPTY_WRAPPER_PADDING_XS, md: EMPTY_WRAPPER_PADDING_MD } })}>
        <Stack spacing={GAP_DEFAULT} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Box sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: BRAND_GRADIENT,
            opacity: 0.2,
            mb: 0.5,
          }}>
            <FolderOpen sx={{ fontSize: 24, color: 'common.white' }} />
          </Box>
          <Stack spacing={GAP_COMPACT}>
            <Typography variant="h6">{t('library.emptyTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('library.emptyDescription')}
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/app/estudio')}
            sx={{ mt: 0.5 }}
          >
            {t('video.preview.goToStudio')}
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (filteredProjects.length === 0 && searchQuery.trim()) {
    return (
      <Paper elevation={0} sx={(theme): SystemStyleObject<Theme> => ({ ...glassPanelSx(theme), p: { xs: EMPTY_WRAPPER_PADDING_XS, md: EMPTY_WRAPPER_PADDING_MD } })}>
        <Stack spacing={GAP_DEFAULT} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Box sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: BRAND_GRADIENT,
            opacity: 0.2,
            mb: 0.5,
          }}>
            <Search sx={{ fontSize: 24, color: 'common.white' }} />
          </Box>
          <Stack spacing={GAP_COMPACT}>
            <Typography variant="h6">{t('library.noResultsTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('library.noResultsDescription', { query: searchQuery })}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  // --- Galeria principal ---

  return (
    <Stack spacing={GAP_RELAXED}>
      {/* Toolbar: título, busca e ordenação */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={GAP_MEDIUM}
        sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
          <Movie sx={{ fontSize: ICON_SIZE_MD }} />
          <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.2em' }}>
            {t('library.title')}
          </Typography>
          <Chip
            label={filteredProjects.length > 0
              ? t('library.projectCount', {
                count: filteredProjects.length,
                plural: filteredProjects.length === 1 ? '' : 's',
              })
              : t('library.projectCountEmpty')}
            size="small"
            variant="outlined"
          />
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={GAP_DEFAULT}
          sx={{ alignItems: { xs: 'stretch', sm: 'center' }, width: { xs: '100%', md: 'auto' } }}
        >
          <TextField
            size="small"
            placeholder={t('library.searchPlaceholder')}
            aria-label={t('library.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: ICON_SIZE_SM, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              width: { xs: '100%', sm: 240 },
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

          <Tooltip title={sortOrder === 'recent' ? t('library.sortOldestFirst') : t('library.sortNewestFirst')}>
            <IconButton
              size="small"
              aria-label={sortOrder === 'recent' ? t('library.sortOldestFirst') : t('library.sortNewestFirst')}
              onClick={() => setSortOrder((prev) => prev === 'recent' ? 'oldest' : 'recent')}
              sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}
            >
              {sortOrder === 'recent'
                ? <ArrowDownward sx={{ fontSize: ICON_SIZE_MD }} />
                : <ArrowUpward sx={{ fontSize: ICON_SIZE_MD }} />
              }
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Lista horizontal de cards */}
      <LazyMotion features={domAnimation} strict>
        <Box sx={{ overflowX: 'auto', pb: 1.5, mx: -0.5, px: 0.5, scrollSnapType: 'x proximity' }}>
          <Stack direction="row" spacing={2} useFlexGap sx={{ minWidth: 'max-content', pr: 0.5 }}>
            {filteredProjects.map((project) => (
              <GalleryCard
                key={project.id}
                project={project}
                isActive={activeProjectId === project.id}
                downloadingId={downloadingId}
                onSelect={handleSelect}
                onDownload={handleDownloadSequence}
                onDelete={setItemToDelete}
              />
            ))}
          </Stack>
        </Box>
      </LazyMotion>

      {/* Dialog de exclusão */}
      <DeleteConfirmationDialog
        open={Boolean(itemToDelete)}
        itemName={itemToDelete?.name ?? null}
        deletingItem={deletingItem}
        deleteError={deleteError}
        onConfirm={confirmDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Snackbar de erro de download */}
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
            <IconButton color="inherit" size="small" aria-label={t('common.closeError')} onClick={() => setDownloadError(null)}>
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
