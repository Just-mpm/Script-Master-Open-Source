import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { alpha } from '@mui/material/styles';
import { glassPanelSx } from '../../theme/surfaces';
import type { ButtonProps } from '@mui/material/Button';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  SUCCESS_MAIN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_DISABLED,
  APP_BORDER,
  SHADOW_DEEP,
} from '../../theme/tokens';

// ── Constantes de layout ──────────────────────────────────────

/** Padding interno do card (xs / md) */
const CARD_PADDING = { xs: 3, md: 4 } as const;

/** Tamanho da fonte do preço */
const PRICE_FONT_SIZE = '2.25rem';

/** Font-family mono para o preço */
const PRICE_FONT_FAMILY = '"JetBrains Mono", monospace';

/** Gap entre os itens da lista de features */
const FEATURE_LIST_GAP = 1.5;

// ── Tipos ─────────────────────────────────────────────────────

interface PricingFeature {
  text: string;
  included: boolean;
}

/**
 * Mapeia a variante semântica do PricingCard para variant + color do MUI Button.
 * - 'primary'   → contained + primary
 * - 'secondary' → contained + secondary
 * - 'outlined'  → outlined + primary
 */
type PricingCtaVariant = 'primary' | 'secondary' | 'outlined';

/** Resolve variant + color a partir da variante semântica */
function resolveButtonStyle(
  ctaVariant: PricingCtaVariant,
  recommended: boolean,
): Pick<ButtonProps, 'variant' | 'color'> {
  if (recommended) {
    return { variant: 'contained', color: 'secondary' };
  }
  switch (ctaVariant) {
    case 'primary':
      return { variant: 'contained', color: 'primary' };
    case 'secondary':
      return { variant: 'contained', color: 'secondary' };
    case 'outlined':
      return { variant: 'outlined', color: 'primary' };
  }
}

interface PricingCardProps {
  name: string;
  price: string;
  priceSubtitle?: string;
  description: string;
  features: PricingFeature[];
  recommended?: boolean;
  ctaLabel: string;
  ctaVariant?: PricingCtaVariant;
  onCtaClick?: () => void;
}

// ── Subcomponentes ────────────────────────────────────────────

/** Linha individual da lista de features */
function FeatureItem({ feature }: { feature: PricingFeature }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      {feature.included ? (
        <CheckCircleIcon
          sx={{ fontSize: 20, color: SUCCESS_MAIN, mt: 0.3, flexShrink: 0 }}
          aria-hidden="true"
        />
      ) : (
        <CancelIcon
          sx={{ fontSize: 20, color: TEXT_DISABLED, mt: 0.3, flexShrink: 0 }}
          aria-hidden="true"
        />
      )}
      <Typography
        variant="body2"
        sx={{
          color: feature.included ? TEXT_PRIMARY : TEXT_DISABLED,
          lineHeight: 1.5,
        }}
      >
        {feature.text}
      </Typography>
    </Stack>
  );
}

// ── Componente principal ──────────────────────────────────────

export function PricingCard({
  name,
  price,
  priceSubtitle,
  description,
  features,
  recommended = false,
  ctaLabel,
  ctaVariant = 'outlined',
  onCtaClick,
}: PricingCardProps) {
  const buttonStyle = resolveButtonStyle(ctaVariant, recommended);

  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        ...glassPanelSx(theme),
        p: CARD_PADDING,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 32px 96px ${alpha(SHADOW_DEEP, recommended ? 0.7 : 0.45)}`,
        },

        // Borda gradiente para variante recommended (mesma técnica do FeatureCard highlighted)
        ...(recommended && {
          borderColor: 'transparent',
          backgroundImage: `linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper}), ${BRAND_GRADIENT}`,
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          border: '2px solid transparent',
          boxShadow: `0 8px 32px ${BRAND_PRIMARY_GLOW}`,
        }),
      })}
    >
      <Stack spacing={3} sx={{ flex: 1 }}>
        {/* Cabeçalho — nome + badge */}
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 700 }}>
              {name}
            </Typography>
            {recommended && (
              <Chip
                label="Popular"
                size="small"
                sx={(theme) => ({
                  bgcolor: `${alpha(theme.palette.secondary.main, 0.15)}`,
                  color: theme.palette.secondary.main,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                })}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
            {description}
          </Typography>
        </Stack>

        {/* Preço */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography
            variant="h4"
            component="p"
            sx={{
              fontFamily: PRICE_FONT_FAMILY,
              fontSize: PRICE_FONT_SIZE,
              fontWeight: 700,
              color: TEXT_PRIMARY,
              lineHeight: 1,
            }}
          >
            {price}
          </Typography>
          {priceSubtitle && (
            <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
              {priceSubtitle}
            </Typography>
          )}
        </Box>

        <Divider sx={{ borderColor: APP_BORDER }} />

        {/* Lista de features */}
        <Stack
          component="ul"
          spacing={FEATURE_LIST_GAP}
          sx={{
            flex: 1,
            listStyle: 'none',
            m: 0,
            p: 0,
          }}
          role="list"
          aria-label={`Funcionalidades do plano ${name}`}
        >
          {features.map((feature, index) => (
            <Box component="li" key={index}>
              <FeatureItem feature={feature} />
            </Box>
          ))}
        </Stack>

        {/* Botão CTA */}
        <Button
          variant={buttonStyle.variant}
          color={buttonStyle.color}
          size="large"
          fullWidth
          onClick={onCtaClick}
          aria-label={ctaLabel}
          sx={{
            mt: 1,
            py: 1.5,
            fontWeight: 600,
            ...(recommended && {
              boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW}`,
            }),
          }}
        >
          {ctaLabel}
        </Button>
      </Stack>
    </Paper>
  );
}


