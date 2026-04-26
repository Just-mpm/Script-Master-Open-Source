import Mic from '@mui/icons-material/Mic';
import PlayCircle from '@mui/icons-material/PlayCircle';
import ImageIcon from '@mui/icons-material/Image';
import AutoAwesome from '@mui/icons-material/AutoAwesome';

export const AUTH_BENEFITS = [
  { icon: Mic, title: 'Voz com IA', description: 'Roteiros em áudio profissional com Gemini TTS' },
  { icon: PlayCircle, title: 'Vídeo Automático', description: 'Renderização client-side com legendas' },
  { icon: ImageIcon, title: 'Imagens', description: 'Geração com 8 aspect ratios e referência' },
  { icon: AutoAwesome, title: 'Assistente IA', description: 'Chat com memória e integração ao estúdio' },
] as const;
