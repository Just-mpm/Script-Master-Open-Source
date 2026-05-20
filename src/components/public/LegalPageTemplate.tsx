import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { PageLayout } from './PageLayout';
import { useLocale } from '../../features/i18n';
import {
  BRAND_PRIMARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  APP_BORDER,
} from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Seção individual de conteúdo legal (reaproveitável entre Terms/Privacy/Cookies) */
export interface LegalSection {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

/** Props do template de página legal */
interface LegalPageTemplateProps {
  title: string;
  lastUpdated?: string;
  sections: readonly LegalSection[];
  tocAriaLabel?: string;
}

// ── Subcomponentes ────────────────────────────────────────────────────

/**
 * Sumário clicável — navegação âncora para cada seção.
 * Usa scrollIntoView com link suave, hover pattern com border-left.
 */
function TableOfContents({
  sections,
  ariaLabel,
}: {
  readonly sections: readonly LegalSection[];
  readonly ariaLabel?: string;
}): ReactNode {
  const { t } = useLocale();
  const handleClick = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box sx={(theme) => ({ ...glassPanelSx(theme), p: 3, mb: 5 })}>
      <Typography
        variant="h6"
        component="h2"
        sx={{ mb: 2, fontWeight: 600, color: TEXT_PRIMARY }}
      >
        {t('legal.tocTitle')}
      </Typography>

      <Box
        component="nav"
        aria-label={ariaLabel}
        sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
      >
        {sections.map((section) => (
          <Typography
            key={section.id}
            component="a"
            href={`#${section.id}`}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              handleClick(section.id);
            }}
            sx={{
              color: TEXT_SECONDARY,
              textDecoration: 'none',
              fontSize: '0.95rem',
              pl: 1.5,
              py: 0.5,
              borderLeft: `2px solid ${APP_BORDER}`,
              borderRadius: '0 4px 4px 0',
              transition: 'color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
              cursor: 'pointer',
              '&:hover': {
                color: BRAND_PRIMARY,
                borderLeftColor: BRAND_PRIMARY,
                backgroundColor: alpha(BRAND_PRIMARY, 0.04),
              },
            }}
          >
            {section.title}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────

/**
 * Template compartilhado para páginas legais (Termos, Privacidade, Cookies).
 * Elimina duplicação de layout, TableOfContents e footer entre as 3 páginas.
 */
export function LegalPageTemplate({
  title,
  lastUpdated,
  sections,
  tocAriaLabel,
}: LegalPageTemplateProps): ReactNode {
  const theme = useTheme();
  const { t } = useLocale();

  return (
    <PageLayout>
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Cabeçalho */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              color: TEXT_PRIMARY,
              mb: 1.5,
              letterSpacing: '-0.035em',
            }}
          >
            {title}
          </Typography>

          {lastUpdated && (
            <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.5 }}>
              {t('legal.lastUpdated', { date: lastUpdated })}
            </Typography>
          )}
        </Box>

        {/* Sumário clicável */}
        <TableOfContents sections={sections} ariaLabel={tocAriaLabel} />

        {/* Seções */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(4),
          }}
        >
          {sections.map((section) => (
            <Box key={section.id}>
              <Typography
                id={section.id}
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: TEXT_PRIMARY,
                  mb: 2,
                  scrollMarginTop: theme.spacing(10),
                }}
              >
                {section.title}
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: TEXT_SECONDARY,
                  lineHeight: 1.8,
                }}
              >
                {section.content}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: theme.spacing(6), borderColor: APP_BORDER }} />

        {/* Rodapé legal */}
        <Typography
          variant="body2"
          sx={{
            color: TEXT_SECONDARY,
            textAlign: 'center',
            mb: 4,
          }}
        >
          {t('legal.copyright', { year: String(new Date().getFullYear()) })}
        </Typography>
      </Container>
    </PageLayout>
  );
}
