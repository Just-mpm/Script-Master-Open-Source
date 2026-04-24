import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
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

/** Seção individual dos termos de uso */
interface LegalSection {
  id: string;
  title: string;
  content: string;
}

// ── Constantes de dados ───────────────────────────────────────────────

const PAGE_TITLE = 'Termos de Uso';
const LAST_UPDATE = '24 de abril de 2026';

/** Seções dos termos — separação de dados (SRP) facilita manutenção e tradução */
const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    id: 'aceitacao',
    title: '1. Aceitação dos Termos',
    content:
      'Ao acessar e utilizar o Script Master ("Serviço"), você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize o Serviço. Estes termos constituem um acordo legal entre você ("Usuário") e a Koda AI Studio ("Empresa").',
  },
  {
    id: 'descricao',
    title: '2. Descrição do Serviço',
    content:
      'O Script Master é uma plataforma que permite a transformação de roteiros em áudio profissional utilizando tecnologia de inteligência artificial. O Serviço inclui funcionalidades de geração de voz por IA (TTS), criação de imagens, renderização de vídeo e assistente conversacional. O Serviço é fornecido "como está" (as is) e pode ser modificado ou descontinuado a qualquer momento.',
  },
  {
    id: 'conta',
    title: '3. Conta do Usuário',
    content:
      'Para acessar funcionalidades completas do Serviço, você precisa criar uma conta. Você é responsável por manter a confidencialidade de suas credenciais de acesso. Deve fornecer informações verdadeiras, precisas e completas durante o registro. Você deve ter pelo menos 18 anos para criar uma conta. A Empresa reserva-se o direito de suspender ou encerrar contas que violem estes termos.',
  },
  {
    id: 'uso-permitido',
    title: '4. Uso Permitido',
    content:
      'Você concorda em usar o Serviço apenas para fins lícitos e de acordo com estes Termos. Você não deve: (a) usar o Serviço de forma que viole qualquer lei ou regulamento aplicável; (b) tentar obter acesso não autorizado a qualquer parte do Serviço; (c) usar o Serviço para transmitir qualquer material que seja ofensivo, difamatório ou ilegal; (d) interferir ou interromper o funcionamento do Serviço; (e) usar o Serviço para fins de concorrência desleal ou para prejudicar a Empresa.',
  },
  {
    id: 'conteudo-usuario',
    title: '5. Conteúdo do Usuário',
    content:
      'Você mantém todos os direitos sobre o conteúdo que cria no Serviço. Ao usar o Serviço, você concede à Empresa uma licença limitada para processar seu conteúdo para fins de prestação do Serviço. Você é responsável por garantir que seu conteúdo não viola direitos de terceiros. A Empresa pode armazenar seu conteúdo para fornecer o Serviço, conforme detalhado em nossa Política de Privacidade.',
  },
  {
    id: 'limitacao',
    title: '6. Limitação de Responsabilidade',
    content:
      'A Empresa não será responsável por quaisquer danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso ou incapacidade de uso do Serviço. A responsabilidade total da Empresa não excederá o valor pago por você nos últimos 12 meses. O Serviço é fornecido sem garantias de qualquer tipo, expressas ou implícitas.',
  },
  {
    id: 'propriedade',
    title: '7. Propriedade Intelectual',
    content:
      'Todo o conteúdo do Serviço, incluindo mas não limitado a software, design, logotipos, ícones, textos e gráficos, é propriedade da Empresa ou de seus licenciadores e é protegido pelas leis de propriedade intelectual. O conteúdo gerado por IA através do Serviço é de propriedade do Usuário, sujeito aos limites do plano escolhido.',
  },
  {
    id: 'modificacoes',
    title: '8. Modificações nos Termos',
    content:
      'A Empresa reserva-se o direito de modificar estes Termos a qualquer momento. Modificações significativas serão comunicadas por email ou notificação no Serviço. O uso continuado do Serviço após a publicação de modificações constitui aceitação dos novos termos. A data da "última atualização" no topo desta página indica quando os termos foram revisados pela última vez.',
  },
  {
    id: 'encerramento',
    title: '9. Encerramento',
    content:
      'Você pode encerrar sua conta a qualquer momento entrando em contato com a Empresa. A Empresa pode suspender ou encerrar seu acesso ao Serviço a qualquer momento, sem aviso prévio, por violação destes Termos ou por qualquer outro motivo. Após o encerramento, seu conteúdo será mantido por 30 dias e depois excluído permanentemente, conforme nossa Política de Privacidade.',
  },
  {
    id: 'disposicoes',
    title: '10. Disposições Gerais',
    content:
      'Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será submetida ao foro da comarca de Salvador, Bahia. Se qualquer disposição destes Termos for considerada inválida ou inexequível, as disposições restantes permanecerão em pleno vigor e efeito. A falha da Empresa em exercer qualquer direito previsto nestes Termos não constituirá renúncia a tal direito.',
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

      <Box component="nav" aria-label="Sumário dos termos" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {TERMS_SECTIONS.map((section) => (
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
              pl: 1,
              borderLeft: `2px solid ${APP_BORDER}`,
              transition: 'color 0.2s, border-color 0.2s',
              cursor: 'pointer',
              '&:hover': {
                color: BRAND_PRIMARY,
                borderLeftColor: BRAND_PRIMARY,
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

export default function TermsPage(): ReactNode {
  const theme = useTheme();

  const seo = getPageSeo({
    title: 'Termos de Uso',
    description: 'Termos de uso do Script Master. Leia antes de utilizar o serviço.',
    path: '/termos',
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
              mb: 1,
            }}
          >
            {PAGE_TITLE}
          </Typography>

          <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
            Última atualização: {LAST_UPDATE}
          </Typography>
        </Box>

        {/* Sumário clicável */}
        <TableOfContents />

        {/* Seções dos termos */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(4),
          }}
        >
          {TERMS_SECTIONS.map((section) => (
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
