import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from 'react-router-dom';
import { getLocalizedUseCases } from '../../data/useCases';
import { useLocale } from '../../features/i18n';
import { APP_MAX_WIDTH, TEXT_SECONDARY, BRAND_SECONDARY, RADIUS_XS } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import { staggerContainer, fadeInUp, VIEWPORT_ONCE, SPRING_SMOOTH } from './animations';

export function UseCasesSection() {
  const { locale, t } = useLocale();
  const useCases = getLocalizedUseCases(locale);

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
              sx={{ mb: 1.5, letterSpacing: 0 }}
            >
              {t('landing.useCases.title')}
            </Typography>
          </Box>
          <Box component={motion.div} variants={fadeInUp}>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', maxWidth: 540, mx: 'auto', lineHeight: 1.7 }}
            >
              {t('landing.useCases.subtitle')}
            </Typography>
          </Box>
        </Box>

        {/* Grid de casos de uso */}
        <Grid container spacing={3}>
          {useCases.map((useCase, idx) => {
            const Icon = useCase.icon;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={useCase.title}>
                <motion.div
                  variants={{
                    ...fadeInUp,
                    visible: {
                      ...fadeInUp.visible,
                      transition: { ...SPRING_SMOOTH, delay: idx * 0.08 },
                    },
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT_ONCE}
                  style={{ height: '100%' }}
                >
                  <Paper
                    variant="outlined"
                    component={Link}
                    to={`/funcionalidades#${useCase.anchor}`}
                    sx={(theme) => ({
                      ...glassPanelSx(theme),
                      p: { xs: 3, md: 3.5 },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      textDecoration: 'none',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.25)}`,
                        borderColor: alpha(BRAND_SECONDARY, 0.3),
                      },
                    })}
                  >
                    <Stack spacing={2} sx={{ flex: 1 }}>
                      {/* Ícone */}
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: RADIUS_XS,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'action.hover',
                          color: 'primary.main',
                          transition: 'transform 0.3s ease',
                        }}
                      >
                        <Icon sx={{ fontSize: 24 }} aria-hidden="true" />
                      </Box>

                      <Typography variant="h6" component="h3" sx={{ letterSpacing: 0 }}>
                        {useCase.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{ color: TEXT_SECONDARY, lineHeight: 1.7, flex: 1 }}
                      >
                        {useCase.description}
                      </Typography>

                      {/* Link visual */}
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Typography
                          variant="caption"
                          sx={{ color: BRAND_SECONDARY, fontWeight: 600 }}
                        >
                          {t('landing.useCases.learnMore')}
                        </Typography>
                        <ArrowForwardIcon
                          sx={{ fontSize: 14, color: BRAND_SECONDARY }}
                          aria-hidden="true"
                        />
                      </Stack>
                    </Stack>
                  </Paper>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
