/**
 * Player de áudio com botão play/pause e display de duração.
 *
 * Usa o elemento <audio> nativo do HTML5 — leve e acessível.
 * Não tem dependência de estado externo — recebe URL + duração via props.
 */

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Pause from '@mui/icons-material/Pause';
import PlayArrow from '@mui/icons-material/PlayArrow';
import GraphicEq from '@mui/icons-material/GraphicEq';

interface ManualProjectAudioPreviewProps {
  src: string;
  durationSec: number;
  sizeBytes: number;
  fileName: string;
  onReplace: () => void;
  onRemove: () => void;
  /** Função para gerar texto de tempo a partir de segundos (i18n) */
  formatDuration: (seconds: number) => string;
  /** Função para gerar texto de tamanho a partir de bytes (i18n) */
  formatSize: (bytes: number) => string;
  /** Função para gerar aria-label do botão play/pause */
  playAriaLabel: string;
  pauseAriaLabel: string;
  replaceLabel: string;
  removeLabel: string;
}

export function ManualProjectAudioPreview({
  src,
  durationSec,
  sizeBytes,
  fileName,
  onReplace,
  onRemove,
  formatDuration,
  formatSize,
  playAriaLabel,
  pauseAriaLabel,
  replaceLabel,
  removeLabel,
}: ManualProjectAudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      void audio.pause();
    } else {
      void audio.play();
    }
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={(theme) => ({
        alignItems: { xs: 'stretch', sm: 'center' },
        p: 2,
        borderRadius: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
      })}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <IconButton
        onClick={togglePlay}
        color="primary"
        aria-label={isPlaying ? pauseAriaLabel : playAriaLabel}
        sx={{ flexShrink: 0 }}
      >
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <GraphicEq color="primary" fontSize="small" />
          <Typography variant="subtitle2" noWrap>
            {fileName}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {formatDuration(durationSec)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatSize(sizeBytes)}
          </Typography>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1}>
        <IconButton
          onClick={onReplace}
          color="primary"
          aria-label={replaceLabel}
          size="small"
        >
          <Typography variant="caption" sx={{ px: 1 }}>
            {replaceLabel}
          </Typography>
        </IconButton>
        <IconButton
          onClick={onRemove}
          color="error"
          aria-label={removeLabel}
          size="small"
        >
          <Typography variant="caption" sx={{ px: 1 }}>
            {removeLabel}
          </Typography>
        </IconButton>
      </Stack>
    </Stack>
  );
}
