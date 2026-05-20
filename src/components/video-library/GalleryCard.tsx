import { memo } from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import Box from '@mui/material/Box';
import AccessTime from '@mui/icons-material/AccessTime';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Delete from '@mui/icons-material/Delete';
import Download from '@mui/icons-material/Download';
import Movie from '@mui/icons-material/Movie';
import PlayArrow from '@mui/icons-material/PlayArrow';
import * as m from 'motion/react-m';
import { ICON_SIZE_SM, ICON_SIZE_MD, GAP_MEDIUM, RADIUS_SM, BLACK_66 } from '../../theme/tokens';
import type { VideoLibraryItem } from './types';
import { MetadataPill } from './MetadataPill';
import { useLocale } from '../../features/i18n';

interface GalleryCardProps {
  project: VideoLibraryItem;
  isActive: boolean;
  downloadingId: string | null;
  onSelect: (item: VideoLibraryItem) => void;
  onDownload: (e: React.MouseEvent, item: VideoLibraryItem) => void;
  onDelete: (item: VideoLibraryItem) => void;
}

/** Card individual de vídeo na galeria com thumbnail, metadata e ações */
export const GalleryCard = memo(function GalleryCard({
  project,
  isActive,
  downloadingId,
  onSelect,
  onDownload,
  onDelete,
}: GalleryCardProps) {
  const { t } = useLocale();
  const canSelect = Boolean(project.audioUrl && project.scenes);
  const isDownloading = downloadingId === project.id;

  return (
    <m.div key={project.id} whileHover={{ y: -4 }} style={{ minWidth: 260, maxWidth: 260 }}>
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
          transition: theme.transitions.create(['border-color', 'box-shadow'], { duration: 200 }),
          '&:hover': {
            borderColor: isActive ? alpha(theme.palette.primary.main, 0.7) : alpha(theme.palette.common.white, 0.14),
            boxShadow: isActive
              ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.38)}, 0 28px 64px ${alpha(theme.palette.primary.main, 0.22)}`
              : `0 24px 56px ${alpha(theme.palette.common.black, 0.3)}`,
            '& .gallery-thumb-gradient': {
              background: 'linear-gradient(180deg, transparent 10%, rgba(0, 0, 0, 0.78) 100%)',
            },
          },
        })}
      >
        <CardActionArea onClick={() => onSelect(project)} disabled={!canSelect} sx={{ height: '100%', alignItems: 'stretch' }}>
          <Box sx={{ position: 'relative', aspectRatio: '16 / 9', backgroundColor: 'action.hover', overflow: 'hidden' }}>
            {project.thumbnail ? (
              <Box
                component="img"
                src={project.thumbnail}
                alt={project.name}
                loading="lazy"
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

            <Box
              className="gallery-thumb-gradient"
              sx={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(180deg, transparent 20%, ${BLACK_66} 100%)`,
                transition: 'background 0.3s ease',
              }}
            />

            <Chip
              label={project.isGeneration ? t('library.generation') : t('library.project')}
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
                transition: 'transform 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  backgroundColor: isActive ? theme.palette.primary.dark : alpha(theme.palette.common.black, 0.64),
                },
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
                "{project.script}"
              </Typography>

              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <MetadataPill icon={<CalendarMonth sx={{ fontSize: ICON_SIZE_SM }} />} label={new Date(project.createdAt).toLocaleDateString()} />
                <MetadataPill icon={<AccessTime sx={{ fontSize: ICON_SIZE_SM }} />} label={new Date(project.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
              </Stack>
            </Stack>
          </CardContent>
        </CardActionArea>

        <Tooltip title="Sincronizar e baixar todos os arquivos" describeChild>
          <span>
            <IconButton
              onClick={(event) => onDownload(event, project)}
              disabled={isDownloading}
              aria-label={`Baixar arquivos do projeto ${project.name}`}
              sx={(theme): SystemStyleObject<Theme> => ({
                position: 'absolute',
                top: 10,
                right: 10,
                  zIndex: 2,
                width: 34,
                height: 34,
                backgroundColor: isDownloading
                  ? theme.palette.primary.main
                  : alpha(theme.palette.common.black, 0.42),
                color: theme.palette.common.white,
                backdropFilter: 'blur(12px)',
                transition: 'background-color 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  backgroundColor: isDownloading
                    ? theme.palette.primary.dark
                    : alpha(theme.palette.primary.main, 0.72),
                  transform: 'scale(1.08)',
                },
            })}
            >
              {isDownloading ? <CircularProgress size={18} color="inherit" /> : <Download sx={{ fontSize: ICON_SIZE_MD }} />}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Excluir item da galeria" describeChild>
          <span>
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                onDelete(project);
              }}
              aria-label={`Excluir ${project.name} da galeria`}
              sx={(theme): SystemStyleObject<Theme> => ({
                position: 'absolute',
                top: 10,
                right: 48,
                zIndex: 2,
                width: 34,
                height: 34,
                backgroundColor: alpha(theme.palette.common.black, 0.42),
                color: theme.palette.common.white,
                backdropFilter: 'blur(12px)',
                transition: 'background-color 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.72),
                  transform: 'scale(1.08)',
                },
              })}
            >
              <Delete sx={{ fontSize: ICON_SIZE_MD }} />
            </IconButton>
          </span>
        </Tooltip>
      </Card>
    </m.div>
  );
});
