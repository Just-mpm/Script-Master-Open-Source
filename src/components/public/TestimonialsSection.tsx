import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { motion } from 'motion/react';
import { getLocalizedTestimonials } from '../../data/testimonials';
import { useLocale } from '../../features/i18n';
import { APP_MAX_WIDTH } from '../../theme/tokens';
import { staggerContainer, fadeInUp, VIEWPORT_ONCE } from './animations';
import { TestimonialCard } from './TestimonialCard';

export function TestimonialsSection() {
  const { locale, t } = useLocale();
  const testimonials = getLocalizedTestimonials(locale);

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
              {t('landing.testimonials.title')}
            </Typography>
          </Box>
          <Box component={motion.div} variants={fadeInUp}>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', maxWidth: 540, mx: 'auto', lineHeight: 1.7 }}
            >
              {t('landing.testimonials.subtitle')}
            </Typography>
          </Box>
        </Box>

        {/* Grid de testimonials */}
        <Grid container spacing={3}>
          {testimonials.map((testimonial, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={testimonial.id}>
              <TestimonialCard testimonial={testimonial} index={idx} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
