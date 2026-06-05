import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Player } from '@remotion/player';
import type { Locale } from '../i18n';
import { useLocale } from '../i18n';
import { RADIUS_SM, SHADOW_IMAGE, WHITE_12 } from '../../theme/tokens';
import {
  MARKETING_DEMO_COMPOSITION,
  MARKETING_DEMO_MOBILE_COMPOSITION,
  type MarketingDemoCopy,
  MarketingDemoComposition,
  MarketingDemoMobileComposition,
} from './MarketingDemoComposition';

interface MarketingDemoPlayerProps {
  alt: string;
}

export function MarketingDemoPlayer({ alt }: MarketingDemoPlayerProps) {
  const theme = useTheme();
  const { locale } = useLocale();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const composition = isMobile ? MARKETING_DEMO_MOBILE_COMPOSITION : MARKETING_DEMO_COMPOSITION;
  const Component = isMobile ? MarketingDemoMobileComposition : MarketingDemoComposition;
  const copy = MARKETING_DEMO_COPY[locale];
  const qaFrame = getDemoQaFrame();

  if (prefersReducedMotion || isMobile) {
    return (
      <Box
        component="img"
        src="/projeto/estudio.png"
        alt={alt}
        loading="eager"
        sx={{
          ...heroFrameSx,
          aspectRatio: isMobile ? '4 / 5' : '16 / 9',
          objectFit: 'cover',
          objectPosition: 'center top',
        }}
      />
    );
  }

  return (
    <Box
      role="img"
      aria-label={alt}
      sx={{
        ...heroFrameSx,
        aspectRatio: isMobile ? '4 / 5' : '16 / 9',
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, rgba(91, 163, 208, 0.16), rgba(5, 8, 22, 0.94) 34%, rgba(247, 148, 30, 0.14))',
        boxShadow: {
          xs: '0 18px 40px rgba(2, 6, 23, 0.38), 0 0 34px rgba(46, 117, 182, 0.16)',
          md: `0 24px 60px ${SHADOW_IMAGE}, 0 0 38px rgba(46, 117, 182, 0.14)`,
        },
        '& > div': {
          borderRadius: 'inherit',
          overflow: 'hidden',
        },
      }}
    >
      <Player
        component={Component}
        inputProps={{ copy }}
        durationInFrames={composition.durationInFrames}
        fps={composition.fps}
        compositionWidth={composition.width}
        compositionHeight={composition.height}
        style={{ width: '100%', height: '100%' }}
        autoPlay={qaFrame === undefined}
        loop
        initialFrame={qaFrame}
        initiallyMuted
        controls={false}
        clickToPlay={false}
        spaceKeyToPlayOrPause={false}
        acknowledgeRemotionLicense
      />
    </Box>
  );
}

const heroFrameSx = {
  maxWidth: { xs: 356, sm: 520, md: 640 },
  width: '100%',
  border: `1px solid ${WHITE_12}`,
  borderRadius: RADIUS_SM,
  filter: 'drop-shadow(0 18px 36px rgba(46, 117, 182, 0.16))',
} as const;

function getDemoQaFrame(): number | undefined {
  if (typeof window === 'undefined') return undefined;

  const rawFrame = new URLSearchParams(window.location.search).get('demoFrame');
  if (rawFrame === null) return undefined;

  const frame = Number(rawFrame);
  return Number.isInteger(frame) && frame >= 0 ? frame : undefined;
}

const MARKETING_DEMO_COPY: Record<Locale, MarketingDemoCopy> = {
  'pt-BR': {
    scriptText: 'Transforme este roteiro em um vídeo curto com narração, cenas e legendas.',
    scriptLabel: 'ROTEIRO',
    studioLabel: 'Estúdio de criação',
    aiLabel: 'IA',
    activeLabel: 'ativa',
    statusTyping: 'Digitando roteiro',
    statusCreating: 'IA criando o fluxo',
    statusReady: 'Vídeo pronto',
    aiTitle: 'IA do Script Master',
    aiDescription: 'Lendo o roteiro e preparando voz, cenas e legendas.',
    tags: ['curto', 'natural', 'publicável'],
    workflowCards: [
      { label: 'Narração', detail: 'voz pronta' },
      { label: 'Cenas', detail: 'visuais sugeridos' },
      { label: 'Legendas', detail: 'sincronizadas' },
    ],
    previewCaption: 'Roteiro virando vídeo pronto',
    timelineLabel: 'VÍDEO PRONTO PARA EXPORTAR',
    finalTitle: 'Vídeo pronto para publicar.',
  },
  en: {
    scriptText: 'Turn this script into a short video with narration, scenes, and subtitles.',
    scriptLabel: 'SCRIPT',
    studioLabel: 'Creation studio',
    aiLabel: 'AI',
    activeLabel: 'active',
    statusTyping: 'Typing script',
    statusCreating: 'AI building the flow',
    statusReady: 'Video ready',
    aiTitle: 'Script Master AI',
    aiDescription: 'Reading the script and preparing voice, scenes, and subtitles.',
    tags: ['short', 'natural', 'ready'],
    workflowCards: [
      { label: 'Narration', detail: 'voice ready' },
      { label: 'Scenes', detail: 'visual ideas' },
      { label: 'Subtitles', detail: 'synced' },
    ],
    previewCaption: 'Script becoming a ready video',
    timelineLabel: 'VIDEO READY TO EXPORT',
    finalTitle: 'Video ready to publish.',
  },
  es: {
    scriptText: 'Convierte este guion en un vídeo corto con narración, escenas y subtítulos.',
    scriptLabel: 'GUION',
    studioLabel: 'Estudio de creación',
    aiLabel: 'IA',
    activeLabel: 'activa',
    statusTyping: 'Escribiendo guion',
    statusCreating: 'IA creando el flujo',
    statusReady: 'Vídeo listo',
    aiTitle: 'IA de Script Master',
    aiDescription: 'Leyendo el guion y preparando voz, escenas y subtítulos.',
    tags: ['corto', 'natural', 'listo'],
    workflowCards: [
      { label: 'Narración', detail: 'voz lista' },
      { label: 'Escenas', detail: 'ideas visuales' },
      { label: 'Subtítulos', detail: 'sincronizados' },
    ],
    previewCaption: 'Guion convertido en vídeo listo',
    timelineLabel: 'VÍDEO LISTO PARA EXPORTAR',
    finalTitle: 'Vídeo listo para publicar.',
  },
};
