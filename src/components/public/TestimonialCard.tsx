import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import type { Testimonial } from '../../data/testimonials';
import { glassPanelSx } from '../../theme/surfaces';
import { TEXT_SECONDARY, BRAND_SECONDARY, BRAND_PRIMARY_GLOW_SOFT } from '../../theme/tokens';
import { fadeInUp, VIEWPORT_ONCE, SPRING_SMOOTH } from './animations';

interface TestimonialCardProps {
  readonly testimonial: Testimonial;
  readonly index: number;
}

export function TestimonialCard({ testimonial, index }: TestimonialCardProps) {
  return (
    <motion.div
      variants={{
        ...fadeInUp,
        visible: {
          ...fadeInUp.visible,
          transition: { ...SPRING_SMOOTH, delay: index * 0.1 },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      style={{ height: '100%' }}
    >
      <Paper
        variant="outlined"
        sx={(theme) => ({
          ...glassPanelSx(theme),
          p: { xs: 3, md: 3.5 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.25)}`,
          },
        })}
      >
        <Stack spacing={2} sx={{ flex: 1 }}>
          {/* Aspas decorativas + rating */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <FormatQuoteIcon
              sx={{
                fontSize: 32,
                color: BRAND_SECONDARY,
                opacity: 0.6,
              }}
              aria-hidden="true"
            />
            <Rating
              value={testimonial.rating}
              precision={0.5}
              size="small"
              readOnly
              sx={{
                '& .MuiRating-iconFilled': { color: BRAND_SECONDARY },
                '& .MuiRating-iconEmpty': { color: 'action.disabled' },
              }}
            />
          </Box>

          {/* Citação */}
          <Typography
            variant="body2"
            sx={{ color: TEXT_SECONDARY, lineHeight: 1.75, flex: 1, fontStyle: 'italic' }}
          >
            &ldquo;{testimonial.text}&rdquo;
          </Typography>

          {/* Autor */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pt: 0.5 }}>
            <Avatar
              sx={(theme) => ({
                width: 40,
                height: 40,
                bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                fontSize: '0.875rem',
                fontWeight: 600,
                boxShadow: `0 4px 12px ${BRAND_PRIMARY_GLOW_SOFT}`,
              })}
              alt={testimonial.name}
            >
              {testimonial.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" component="p" sx={{ lineHeight: 1.3, fontWeight: 600 }}>
                {testimonial.name}
              </Typography>
              <Typography variant="caption" sx={{ color: TEXT_SECONDARY, lineHeight: 1.4 }}>
                {testimonial.role} · {testimonial.company}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>
    </motion.div>
  );
}
