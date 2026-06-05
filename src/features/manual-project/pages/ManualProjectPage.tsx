/**
 * Página do wizard de Projeto Manual.
 *
 * Renderiza o `ManualProjectForm` dentro do layout padrão /app/**.
 * Inclui SEO via `DocumentHead` (noindex, autenticada).
 */

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddCircle from '@mui/icons-material/AddCircle';
import { useLocale } from '../../i18n';
import { DocumentHead } from '../../../components/DocumentHead';
import { getPageSeo } from '../../../lib/seo';
import { ManualProjectForm } from '../components/ManualProjectForm';
import { APP_MAX_WIDTH, GAP_DEFAULT, GAP_RELAXED } from '../../../theme/tokens';

export function ManualProjectPage() {
  const { t, locale } = useLocale();

  const seo = getPageSeo({
    title: t('manualProject.meta.title'),
    description: t('manualProject.meta.description'),
    path: '/app/projeto/novo',
    locale,
  });

  return (
    <>
      <DocumentHead {...seo} />
      <Stack
        spacing={GAP_RELAXED}
        sx={{
          maxWidth: APP_MAX_WIDTH,
          mx: 'auto',
          py: { xs: 2, md: 3 },
        }}
      >
        {/* Cabeçalho da página */}
        <Stack spacing={GAP_DEFAULT}>
          <Typography variant="overline" sx={{ color: 'primary.light', fontWeight: 700, letterSpacing: '0.18em' }}>
            {t('manualProject.meta.eyebrow')}
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <AddCircle sx={{ fontSize: 36, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              {t('manualProject.meta.title')}
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
            {t('manualProject.meta.description')}
          </Typography>
        </Stack>

        {/* Indicador de passos */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {t('manualProject.steps.name')}
          </Typography>
          <Box sx={{ width: 24, height: 1, bgcolor: 'divider' }} />
          <Typography variant="caption" color="text.secondary">
            {t('manualProject.steps.audio')}
          </Typography>
          <Box sx={{ width: 24, height: 1, bgcolor: 'divider' }} />
          <Typography variant="caption" color="text.secondary">
            {t('manualProject.steps.images')}
          </Typography>
        </Stack>

        {/* Wizard */}
        <ManualProjectForm />
      </Stack>
    </>
  );
}
