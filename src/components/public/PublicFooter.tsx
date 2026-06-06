import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';
import { useLocale } from '../../features/i18n';
import {
  APP_MAX_WIDTH,
  APP_BORDER,
  BRAND_PRIMARY_GLOW,
  TEXT_SECONDARY,
} from '../../theme/tokens';
import logos from '../../assets/logos';
import { openAnalyticsConsentDialog } from '../app/AnalyticsConsentPrompt';

export function PublicFooter() {
  const { t } = useLocale();

  /** Grupos de links com labels traduzidos via i18n */
  const footerGroups = [
    {
      title: t('footer.productGroup'),
      links: [
        { label: t('footer.links.features'), href: '/funcionalidades' },
        { label: t('footer.links.openSource'), href: '/open-source' },
        { label: t('footer.links.faq'), href: '/perguntas-frequentes' },
        { label: 'GitHub', href: 'https://github.com/Just-mpm/Script-Master-Open-Source', external: true },
      ],
    },
    {
      title: t('footer.companyGroup'),
      links: [
        { label: t('footer.links.about'), href: '/sobre' },
        { label: t('footer.links.contact'), href: '/contato' },
        { label: t('footer.links.email'), href: 'mailto:contato@scriptmaster.app' },
      ],
    },
    {
      title: t('footer.legalGroup'),
      links: [
        { label: t('footer.links.terms'), href: '/termos' },
        { label: t('footer.links.privacy'), href: '/privacidade' },
        { label: t('footer.links.cookies'), href: '/cookies' },
      ],
    },
  ];

  return (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        mt: 'auto',
        pt: { xs: 6, md: 8 },
        pb: { xs: 4, md: 6 },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${BRAND_PRIMARY_GLOW} 50%, transparent 100%)`,
        },
        borderTop: `1px solid ${APP_BORDER}`,
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 8 }}
          sx={{ mb: { xs: 4, md: 6 } }}
        >
          {/* Logo + descrição */}
          <Box sx={{ flex: { md: 1.5 }, minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', mb: 1.5 }}
            >
              <Box
                component="img"
                src={logos.mark.transparent}
                alt=""
                aria-hidden="true"
                sx={{ width: 32, height: 32, objectFit: 'contain' }}
              />
              <Typography variant="subtitle2" component="p" sx={{ fontWeight: 700 }}>
                Script Master
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: TEXT_SECONDARY, maxWidth: 320, lineHeight: 1.7 }}>
              {t('footer.description')}
            </Typography>
          </Box>

          {/* Grupos de links */}
          {footerGroups.map((group) => (
            <Box key={group.title} sx={{ flex: 1 }}>
              <Typography variant="subtitle2" component="p" sx={{ mb: 1.5, fontWeight: 700, fontSize: '0.8125rem', letterSpacing: '0.02em' }}>
                {group.title}
              </Typography>
              <Stack spacing={0.75}>
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    {...('external' in link && link.external
                      ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' }
                      : { component: RouterLink, to: link.href })}
                    variant="body2"
                    sx={{
                      color: TEXT_SECONDARY,
                      textDecoration: 'none',
                      transition: 'color 0.2s ease, padding-left 0.2s ease',
                      '&:hover': { color: 'text.primary', pl: 0.5 },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ borderColor: APP_BORDER, mb: 3 }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="caption" sx={{ color: TEXT_SECONDARY, letterSpacing: '0.01em' }}>
            &copy; {new Date().getFullYear()} {t('footer.copyright')}
          </Typography>
          <Typography variant="caption" sx={{ color: TEXT_SECONDARY, letterSpacing: '0.01em' }}>
            {t('footer.madeWith')}
          </Typography>
          <Button size="small" color="inherit" onClick={openAnalyticsConsentDialog}>
            {t('footer.links.manageCookies')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
