import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import { getLocalizedMetrics } from '../../data/metrics';
import { useLocale } from '../../features/i18n';
import { APP_MAX_WIDTH, BRAND_GRADIENT, TEXT_SECONDARY, BRAND_PRIMARY_GLOW_SOFT } from '../../theme/tokens';
import { staggerContainer, fadeInUp, scaleIn, VIEWPORT_ONCE } from './animations';

export function MetricsSection() {
  const { locale, t } = useLocale();
  const metrics = getLocalizedMetrics(locale);

  return (
    <Box sx={{ pt: { xs: 8, md: 12 } }}>
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        {/* Título */}
        <Box
          component={motion.div}
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}
        >
          <Box component={motion.div} variants={fadeInUp}>
            <Typography
              variant="h3"
              component="h2"
              sx={{ mb: 1.5, letterSpacing: '-0.035em' }}
            >
              {t('landing.metrics.title')}
            </Typography>
          </Box>
          <Box component={motion.div} variants={fadeInUp}>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}
            >
              {t('landing.metrics.subtitle')}
            </Typography>
          </Box>
        </Box>

        {/* Grid de métricas */}
        <Grid container spacing={3}>
          {metrics.map((metric, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={metric.label}>
              <motion.div
                variants={{
                  ...scaleIn,
                  visible: {
                    ...scaleIn.visible,
                    transition: { delay: idx * 0.1 },
                  },
                }}
                initial="hidden"
                whileInView="visible"
                viewport={VIEWPORT_ONCE}
                style={{ height: '100%' }}
              >
                <Box
                  sx={(theme) => ({
                    p: { xs: 3, md: 4 },
                    height: '100%',
                    textAlign: 'center',
                    borderRadius: Number(theme.shape.borderRadius) * 2,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
                    boxShadow: `0 0 40px ${alpha(theme.palette.primary.main, 0.06)}`,
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 40px ${BRAND_PRIMARY_GLOW_SOFT}`,
                    },
                  })}
                >
                  <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
                    {/* Valor */}
                    <Typography
                      variant="h2"
                      component="p"
                      sx={{
                        fontWeight: 800,
                        background: BRAND_GRADIENT,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.04em',
                        lineHeight: 1.1,
                      }}
                    >
                      {metric.value}
                      {metric.suffix && (
                        <Typography
                          component="span"
                          variant="h4"
                          sx={{
                            background: BRAND_GRADIENT,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 700,
                            ml: 0.25,
                          }}
                        >
                          {metric.suffix}
                        </Typography>
                      )}
                    </Typography>

                    {/* Label */}
                    <Typography
                      variant="subtitle2"
                      sx={{ color: 'text.primary', fontWeight: 600 }}
                    >
                      {metric.label}
                    </Typography>

                    {/* Description */}
                    <Typography variant="caption" sx={{ color: TEXT_SECONDARY, lineHeight: 1.5 }}>
                      {metric.description}
                    </Typography>
                  </Stack>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
