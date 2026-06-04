import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, keyframes } from '@mui/material/styles';
import { BRAND_PRIMARY, TEXT_SECONDARY } from '../../../theme/tokens';

const shimmerKeyframes = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const dotsKeyframes = keyframes`
  0% { opacity: 0.2; }
  20% { opacity: 0.4; }
  40% { opacity: 0.6; }
  60% { opacity: 0.8; }
  80% { opacity: 1; }
  100% { opacity: 0.2; }
`;

interface ThinkingShimmerProps {
  text?: string;
}

/**
 * Efeito shimmer para estado "Pensando".
 * Substitui o Skeleton wave por um feedback mais sofisticado.
 */
export function ThinkingShimmer({ text }: ThinkingShimmerProps) {
  const displayText = text ?? 'Pensando';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
      }}
    >
      {/* Ícone de pensamento com pulse */}
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${BRAND_PRIMARY}, ${alpha(BRAND_PRIMARY, 0.4)})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: `${shimmerKeyframes} 2s ease-in-out infinite`,
          backgroundSize: '200% 100%',
        }}
      >
        <Typography sx={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>
          ✦
        </Typography>
      </Box>

      {/* Texto com shimmer */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          background: `linear-gradient(90deg, ${TEXT_SECONDARY} 0%, ${alpha(BRAND_PRIMARY, 0.6)} 50%, ${TEXT_SECONDARY} 100%)`,
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: `${shimmerKeyframes} 2s ease-in-out infinite`,
          letterSpacing: '0.02em',
        }}
      >
        {displayText}
      </Typography>

      {/* Pontos animados */}
      <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              bgcolor: BRAND_PRIMARY,
              animation: `${dotsKeyframes} 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.2 }s`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
