import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Check from '@mui/icons-material/Check';
import Search from '@mui/icons-material/Search';
import PhotoLibrary from '@mui/icons-material/PhotoLibrary';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { useLocale } from '../../../features/i18n';
import { glassPanelSx, searchFieldSx } from '../../../theme/surfaces';
import { RADIUS_SM, ICON_SIZE_SM, ICON_SIZE_MD, GAP_COMPACT } from '../../../theme/tokens';
import type { StockImage, StockSearchParams } from '../../../lib/stockMedia';
import { searchStockImages } from '../../../lib/stockMedia';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface StockMediaPickerProps {
  onSelect: (image: StockImage) => void;
  orientation?: 'landscape' | 'portrait' | 'square';
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function StockMediaPicker({ onSelect, orientation }: StockMediaPickerProps) {
  const theme = useTheme();
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery && !hasSearched) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const params: StockSearchParams = {
        query: trimmedQuery,
        orientation,
        page: 1,
        perPage: 12,
      };

      const images = await searchStockImages(params);
      setResults(images);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, orientation, hasSearched]);

  const handleSelect = useCallback((image: StockImage) => {
    setSelectedId(image.id);
    onSelect(image);
  }, [onSelect]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void handleSearch();
    }
  }, [handleSearch]);

  return (
    <Box sx={(currentTheme): SystemStyleObject<Theme> => ({ ...glassPanelSx(currentTheme), p: 2.5 })}>
      <Stack spacing={2}>
        {/* Header */}
        <Stack spacing={GAP_COMPACT}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <PhotoLibrary sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio.stockMedia.title')}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t('studio.stockMedia.description')}
          </Typography>
        </Stack>

        {/* Campo de busca */}
        <TextField
          fullWidth
          size="small"
          placeholder={t('studio.stockMedia.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={searchFieldSx}
          slotProps={{
            input: {
              endAdornment: (
                <IconButton
                  size="small"
                  onClick={() => void handleSearch()}
                  disabled={isSearching}
                  aria-label={t('studio.stockMedia.searchAriaLabel')}
                >
                  <Search sx={{ fontSize: ICON_SIZE_MD }} />
                </IconButton>
              ),
            },
          }}
        />

        {/* Resultados */}
        {isSearching ? (
          <Grid container spacing={1}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid key={index} size={{ xs: 4, sm: 3 }}>
                <Skeleton variant="rounded" animation="wave" sx={{ aspectRatio: '1 / 1', borderRadius: RADIUS_SM }} />
              </Grid>
            ))}
          </Grid>
        ) : hasSearched && results.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('studio.stockMedia.noResults')}
            </Typography>
          </Box>
        ) : hasSearched ? (
          <Grid container spacing={1}>
            {results.map((image) => {
              const isSelected = selectedId === image.id;

              return (
                <Grid key={image.id} size={{ xs: 4, sm: 3 }}>
                  <Card
                    elevation={0}
                    onClick={() => handleSelect(image)}
                    role="button"
                    tabIndex={0}
                    aria-label={t('studio.stockMedia.selectImage', { alt: image.alt })}
                    aria-pressed={isSelected}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(image); }}
                    sx={(currentTheme): SystemStyleObject<Theme> => ({
                      borderRadius: RADIUS_SM,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      outline: 'none',
                      border: isSelected
                        ? `2px solid ${currentTheme.palette.primary.main}`
                        : `2px solid transparent`,
                      boxShadow: isSelected
                        ? `0 0 0 3px ${alpha(currentTheme.palette.primary.main, 0.3)}`
                        : 'none',
                      transition: currentTheme.transitions.create(['border-color', 'box-shadow', 'transform'], { duration: 150 }),
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: `0 8px 24px ${alpha(currentTheme.palette.common.black, 0.3)}`,
                      },
                      '&:focus-visible': {
                        border: `2px solid ${currentTheme.palette.primary.main}`,
                        boxShadow: `0 0 0 3px ${alpha(currentTheme.palette.primary.main, 0.3)}`,
                      },
                    })}
                  >
                    <Box
                      component="img"
                      src={image.thumbnailUrl}
                      alt={image.alt}
                      loading="lazy"
                      sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
                    />
                    {isSelected && (
                      <Box sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        display: 'grid',
                        placeItems: 'center',
                      }}>
                        <Check sx={{ fontSize: ICON_SIZE_SM, color: 'common.white' }} />
                      </Box>
                    )}
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('studio.stockMedia.emptyState')}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
