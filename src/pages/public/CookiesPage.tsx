import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import {
  BRAND_PRIMARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  APP_BORDER,
} from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Seção individual da política de cookies */
interface LegalSection {
  id: string;
  title: string;
  content: string;
}

// ── Constantes de dados ───────────────────────────────────────────────

const PAGE_TITLE = 'Política de Cookies';
const LAST_UPDATE = '24 de abril de 2026';

/** Seções da política — separação de dados (SRP) facilita manutenção e tradução */
const COOKIES_SECTIONS: readonly LegalSection[] = [
  {
    id: 'o-que-sao',
    title: '1. O que são Cookies',
    content:
      'Cookies são pequenos arquivos de texto armazenados no seu dispositivo (computador, tablet ou smartphone) quando você visita um site. Eles permitem que o site reconheça seu dispositivo e armazene informações sobre suas preferências ou ações anteriores. Cookies são amplamente utilizados para fazer os sites funcionarem de forma mais eficiente e fornecer informações aos proprietários do site.',
  },
  {
    id: 'cookies-usamos',
    title: '2. Cookies que Usamos',
    content:
      'O Script Master utiliza os seguintes tipos de cookies: Cookies essenciais: necessários para o funcionamento básico do Serviço. Incluem cookies de autenticação (Firebase Auth) e preferências do usuário. Sem eles, o Serviço não funciona corretamente. Cookies de funcionalidade: permitem lembrar suas preferências (voz favorita, configurações do estúdio) e fornecer funcionalidades aprimoradas. Cookies de análise: coletam informações anônimas sobre como você usa o Serviço, ajudando a entender o uso e melhorar a experiência. Cookies de Service Worker: permitem funcionalidades offline, como acesso a áudios já gerados.',
  },
  {
    id: 'cookies-terceiros',
    title: '3. Cookies de Terceiros',
    content:
      'Alguns cookies são definidos por serviços de terceiros que aparecem em nossas páginas: Google Firebase: utilizado para autenticação, armazenamento de dados e análise. Google Analytics (futuro): pode ser utilizado para análise de tráfego e comportamento dos usuários. Não utilizamos cookies de publicidade ou redes sociais de rastreamento. Não integramos pixels de rastreamento de terceiros.',
  },
  {
    id: 'gerenciamento',
    title: '4. Gerenciamento de Cookies',
    content:
      'Você pode gerenciar ou desabilitar cookies nas configurações do seu navegador. Note que a desabilitação de cookies pode afetar a funcionalidade do Serviço. Para gerenciar cookies: No Chrome: Configurações > Privacidade e segurança > Cookies. No Firefox: Opções > Privacidade e segurança > Cookies. No Safari: Preferências > Privacidade > Cookies. No Edge: Configurações > Cookies e permissões de site. Cookies essenciais não podem ser desabilitados, pois são necessários para o funcionamento do Serviço.',
  },
  {
    id: 'alteracoes',
    title: '5. Alterações nesta Política',
    content:
      'Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças nos cookies que utilizamos ou por razões operacionais, legais ou regulatórias. Recomendamos que você visite esta página regularmente para se manter informado sobre o uso de cookies. A data de "última atualização" no topo indica quando esta política foi revisada pela última vez.',
  },
  {
    id: 'contato',
    title: '6. Contato',
    content:
      'Se você tiver dúvidas sobre nossa política de cookies, entre em contato: Email: contato@scriptmaster.app. Responderemos em até 15 dias úteis.',
  },
] as const;

// ── Subcomponentes ────────────────────────────────────────────────────

/**
 * Sumário clicável — navegação âncora para cada seção.
 * Separado do layout principal (SRP) para manter responsabilidades distintas.
 */
function TableOfContents(): ReactNode {
  const handleClick = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box sx={(theme) => ({ ...glassPanelSx(theme), p: 3, mb: 5 })}>
      <Typography
        variant="h6"
        component="h3"
        sx={{ mb: 2, fontWeight: 600, color: TEXT_PRIMARY }}
      >
        Sumário
      </Typography>

      <Box component="nav" aria-label="Sumário da política de cookies" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {COOKIES_SECTIONS.map((section) => (
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

// ── Página principal ─────────────────────────────────────────────────

export default function CookiesPage(): ReactNode {
  const theme = useTheme();

  const seo = getPageSeo({
    title: 'Política de Cookies',
    description: 'Política de cookies do Script Master. Saiba quais cookies utilizamos e por quê.',
    path: '/cookies',
  });

  return (
    <>
      <Helmet {...seo} />
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
            {PAGE_TITLE}
          </Typography>

          <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.5 }}>
            Última atualização: {LAST_UPDATE}
          </Typography>
        </Box>

        {/* Sumário clicável */}
        <TableOfContents />

        {/* Seções da política */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(4),
          }}
        >
          {COOKIES_SECTIONS.map((section) => (
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
          © {new Date().getFullYear()} Koda AI Studio. Todos os direitos reservados.
        </Typography>
      </Container>
    </PageLayout>
    </>
  );
}
