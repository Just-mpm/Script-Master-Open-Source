import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Mic from '@mui/icons-material/Mic';
import { Link as RouterLink } from 'react-router-dom';
import {
  APP_MAX_WIDTH,
  APP_BORDER,
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  ICON_SIZE_MD,
  TEXT_SECONDARY,
} from '../../theme/tokens';

interface FooterLinkGroup {
  title: string;
  links: { label: string; href: string }[];
}

const FOOTER_GROUPS: FooterLinkGroup[] = [
  {
    title: 'Produto',
    links: [
      { label: 'Funcionalidades', href: '/funcionalidades' },
      { label: 'Preços', href: '/precos' },
      { label: 'Perguntas Frequentes', href: '/perguntas-frequentes' },
      { label: 'Novidades', href: '/novidades' },
      { label: 'Status', href: '/status' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre', href: '/sobre' },
      { label: 'Contato', href: '/contato' },
      { label: 'E-mail', href: 'mailto:contato@scriptmaster.app' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Termos de Uso', href: '/termos' },
      { label: 'Privacidade', href: '/privacidade' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
];

export function PublicFooter() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: `1px solid ${APP_BORDER}`,
        mt: 'auto',
        pt: { xs: 6, md: 8 },
        pb: { xs: 4, md: 6 },
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
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'common.white',
                  background: BRAND_GRADIENT,
                  boxShadow: `0 12px 28px ${BRAND_PRIMARY_GLOW}`,
                }}
              >
                <Mic sx={{ fontSize: ICON_SIZE_MD }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Script Master
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: TEXT_SECONDARY, maxWidth: 320 }}>
              Transforme roteiros em arte com IA. Áudio, vídeo e imagens profissionais gerados por Gemini.
            </Typography>
          </Box>

          {/* Grupos de links */}
          {FOOTER_GROUPS.map((group) => (
            <Box key={group.title} sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                {group.title}
              </Typography>
              <Stack spacing={0.75}>
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    component={RouterLink}
                    to={link.href}
                    variant="body2"
                    sx={{
                      color: TEXT_SECONDARY,
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      '&:hover': { color: 'text.primary' },
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
          <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
            &copy; {new Date().getFullYear()} Script Master. Todos os direitos reservados.
          </Typography>
          <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
            Feito com IA e Gemini
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
