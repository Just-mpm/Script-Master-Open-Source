import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageSeo } from '../../lib/seo';
import { LegalPageTemplate } from '../../components/public/LegalPageTemplate';
import type { LegalSection } from '../../components/public/LegalPageTemplate';

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

// ── Página principal ─────────────────────────────────────────────────

export default function TermsPage(): ReactNode {
  const seo = getPageSeo({
    title: 'Termos de Uso',
    description: 'Termos de uso do Script Master. Leia antes de utilizar o serviço.',
    path: '/termos',
  });

  return (
    <>
      <Helmet {...seo} />
      <LegalPageTemplate
        title={PAGE_TITLE}
        lastUpdated={LAST_UPDATE}
        sections={TERMS_SECTIONS}
        tocAriaLabel="Sumário dos termos"
      />
    </>
  );
}
