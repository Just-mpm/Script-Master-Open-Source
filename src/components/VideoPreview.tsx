import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import MovieCreation from '@mui/icons-material/MovieCreation';
import { motion, AnimatePresence } from 'motion/react';
import { glassPanelSx } from '../theme/surfaces';
import { RADIUS_SM, GAP_COMPACT } from '../theme/tokens';

interface VideoPreviewProps {
  scenes: { imageUrl: string; timestamp: number }[];
  currentTime: number;
  script: string;
}

export function VideoPreview({ scenes, currentTime, script }: VideoPreviewProps) {
  const currentScene = useMemo(() => {
    if (!scenes || scenes.length === 0) return null;
    let active = scenes[0];
    for (const scene of scenes) {
      if (scene.timestamp <= currentTime) {
        active = scene;
      } else {
        break;
      }
    }
    return active;
  }, [scenes, currentTime]);

  const scriptExcerpt = useMemo(() => {
    const normalizedScript = script.replace(/\s+/g, ' ').trim();

    if (normalizedScript.length <= 140) {
      return normalizedScript;
    }

    return `${normalizedScript.slice(0, 140)}…`;
  }, [script]);

  if (!scenes || scenes.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={(theme): SystemStyleObject<Theme> => ({
          ...glassPanelSx(theme),
          aspectRatio: '16 / 9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 4 },
        })}
      >
        <Stack spacing={2} sx={{ maxWidth: 420, alignItems: 'center', textAlign: 'center' }}>
          <Box
            sx={(theme) => ({
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: alpha(theme.palette.common.white, 0.06),
              border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            })}
          >
            <MovieCreation sx={{ fontSize: 32, opacity: 0.35 }} />
          </Box>
          <Stack spacing={GAP_COMPACT}>
            <Typography variant="h6">Preview de vídeo aguardando cenas</Typography>
            <Typography variant="body2" color="text.secondary">
              Gere um conteúdo com cenas visuais para acompanhar a narrativa aqui com transições e contexto.
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={(theme): SystemStyleObject<Theme> => ({
        ...glassPanelSx(theme),
        aspectRatio: '16 / 9',
        backgroundColor: theme.palette.common.black,
      })}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentScene?.imageUrl}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${currentScene?.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0.12) 30%, rgba(0, 0, 0, 0.74) 100%)',
            }}
          />
        </motion.div>
      </AnimatePresence>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          position: 'absolute',
          top: { xs: 16, md: 20 },
          left: { xs: 16, md: 20 },
          right: { xs: 16, md: 20 },
          zIndex: 2,
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}
      >
        <Chip label="Preview de vídeo" color="primary" />
        <Chip label={`${scenes.length} ${scenes.length === 1 ? 'cena' : 'cenas'}`} variant="outlined" sx={{ backdropFilter: 'blur(8px)' }} />
      </Stack>

      <Box sx={{ position: 'absolute', left: { xs: 16, md: 20 }, right: { xs: 16, md: 20 }, bottom: { xs: 16, md: 20 }, zIndex: 2 }}>
        <Paper
          elevation={0}
          sx={(theme): SystemStyleObject<Theme> => ({
            p: { xs: 2, md: 2.5 },
            borderRadius: RADIUS_SM,
            backgroundColor: alpha(theme.palette.common.black, 0.34),
            border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
            backdropFilter: 'blur(14px)',
            backgroundImage: 'none',
          })}
        >
          <Stack spacing={GAP_COMPACT}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Sequência visual em andamento
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {scriptExcerpt || 'As cenas acompanham o tempo atual da reprodução para você revisar o ritmo do vídeo.'}
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Paper>
  );
}
