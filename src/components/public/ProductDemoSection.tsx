import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import MicIcon from '@mui/icons-material/Mic';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ImageIcon from '@mui/icons-material/Image';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Link } from 'react-router-dom';
import { APP_MAX_WIDTH, BRAND_GRADIENT, TEXT_SECONDARY, BRAND_SECONDARY, BRAND_PRIMARY_GLOW_SOFT, APP_BORDER, RADIUS_XS } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import { fadeInUp, scaleIn, VIEWPORT_ONCE } from './animations';
import { useLocale } from '../../features/i18n';

export function ProductDemoSection() {
  const { t } = useLocale();

  /** Item da barra de ferramentas do mock */
  const mockToolbar: readonly { readonly icon: typeof MicIcon; readonly label: string; readonly active: boolean }[] = [
    { icon: MicIcon, label: t('landing.demo.toolbar.audio'), active: true },
    { icon: PlayArrowIcon, label: t('landing.demo.toolbar.video'), active: false },
    { icon: ImageIcon, label: t('landing.demo.toolbar.images'), active: false },
    { icon: AutoAwesomeIcon, label: t('landing.demo.toolbar.assistant'), active: false },
  ];

  /** Linhas mock do editor de roteiro */
  const mockScriptLines: readonly string[] = [
    t('landing.demo.scriptLines.0'),
    t('landing.demo.scriptLines.1'),
    t('landing.demo.scriptLines.2'),
    t('landing.demo.scriptLines.3'),
  ];
  return (
    <Box sx={{ pt: { xs: 8, md: 12 } }}>
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        {/* Título */}
        <Box
          component={motion.div}
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}
        >
          <Typography
            variant="h3"
            component="h2"
            sx={{ mb: 1.5, letterSpacing: '-0.035em' }}
          >
            {t('landing.demo.title')}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}
          >
            {t('landing.demo.subtitle')}
          </Typography>
        </Box>

        {/* Mock do estúdio */}
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
        >
          <Paper
            variant="outlined"
            elevation={0}
            sx={(theme) => ({
              ...glassPanelSx(theme),
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              boxShadow: `0 24px 80px ${alpha(theme.palette.common.black, 0.4)}, 0 0 60px ${BRAND_PRIMARY_GLOW_SOFT}`,
            })}
          >
            {/* Header do app mock */}
            <Box
              sx={(theme) => ({
                px: 2,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderBottom: `1px solid ${APP_BORDER}`,
                bgcolor: alpha(theme.palette.common.black, 0.2),
              })}
            >
              {/* Dots */}
              <Stack direction="row" spacing={0.75}>
                {[BRAND_SECONDARY, '#f59e0b', '#10b981'].map((color, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: color,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" sx={{ color: TEXT_SECONDARY, ml: 1 }}>
                Script Master — AI Studio
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', minHeight: { xs: 240, sm: 320, md: 380 } }}>
              {/* Sidebar — Toolbar mock */}
              <Box
                sx={(theme) => ({
                  width: { xs: 60, sm: 72 },
                  flexShrink: 0,
                  borderRight: `1px solid ${APP_BORDER}`,
                  py: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: alpha(theme.palette.common.black, 0.15),
                })}
              >
                {mockToolbar.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Stack
                      key={item.label}
                      spacing={0.5}
                      sx={(theme) => ({
                        alignItems: 'center',
                        px: 1,
                        py: 1,
                        borderRadius: 1.5,
                        bgcolor: item.active ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                        color: item.active ? 'primary.main' : 'text.secondary',
                      })}
                    >
                      <Icon sx={{ fontSize: 20 }} aria-hidden="true" />
                      <Typography
                        variant="caption"
                        sx={{ fontSize: '0.65rem', lineHeight: 1, fontWeight: item.active ? 600 : 400 }}
                      >
                        {item.label}
                      </Typography>
                    </Stack>
                  );
                })}
              </Box>

              {/* Main content — Editor mock */}
              <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Título do roteiro */}
                <Typography
                  variant="h6"
                  component="p"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'text.primary',
                  }}
                >
                  {t('landing.demo.scriptTitle')}
                </Typography>

                {/* Linhas do editor */}
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 1.5,
                    opacity: 0.85,
                  }}
                >
                  {mockScriptLines.map((line, i) => (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{
                        color: i === 0 ? 'text.primary' : TEXT_SECONDARY,
                        fontFamily: '"Georgia", serif',
                        lineHeight: 1.8,
                        pl: 1,
                        borderLeft: i === 0
                          ? `2px solid ${BRAND_SECONDARY}`
                          : '2px solid transparent',
                        transition: 'border-color 0.3s ease',
                      }}
                    >
                      {line}
                    </Typography>
                  ))}
                </Box>

                {/* Barra de ação inferior */}
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    pt: 2,
                    borderTop: `1px solid ${APP_BORDER}`,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
                    {t('landing.demo.statsLine', { lines: 4, chars: 150 })}
                  </Typography>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.75,
                      borderRadius: RADIUS_XS,
                      background: BRAND_GRADIENT,
                      color: 'common.white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {t('landing.demo.generateButton')}
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Paper>
        </motion.div>

        {/* CTA abaixo do mock */}
        <Box
          component={motion.div}
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          sx={{ textAlign: 'center', mt: { xs: 4, md: 6 } }}
        >
          <Button
            component={Link}
            to="/cadastro"
            variant="contained"
            size="large"
            sx={(theme) => ({
              px: 5,
              py: 1.5,
              borderRadius: 3.5,
              background: BRAND_GRADIENT,
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: `0 8px 32px ${BRAND_PRIMARY_GLOW_SOFT}`,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.secondary.main})`,
                transform: 'translateY(-2px)',
                boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.35)}`,
              },
            })}
          >
            {t('landing.demo.tryFree')}
          </Button>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: TEXT_SECONDARY }}>
            {t('landing.demo.noCreditCard')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
