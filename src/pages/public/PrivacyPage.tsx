import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageSeo } from '../../lib/seo';
import { LegalPageTemplate } from '../../components/public/LegalPageTemplate';
import type { LegalSection } from '../../components/public/LegalPageTemplate';

// ── Constantes de dados ───────────────────────────────────────────────

const PAGE_TITLE = 'Política de Privacidade';
const LAST_UPDATE = '24 de abril de 2026';

/** Seções da política de privacidade — SRP: dados separados do layout */
const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    id: 'introducao',
    title: '1. Introdução',
    content:
      'A Koda AI Studio ("Empresa") está comprometida com a proteção da privacidade dos usuários do Script Master ("Serviço"). Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e o Regulamento Geral sobre a Proteção de Dados (GDPR).',
  },
  {
    id: 'dados-coletamos',
    title: '2. Dados que Coletamos',
    content:
      'Dados fornecidos por você: nome e email associados à sua conta Google. Dados gerados pelo uso: roteiros, áudios, imagens, vídeos e conversas criados no Serviço. Dados técnicos: endereço IP, tipo de navegador, sistema operacional, páginas visitadas e tempo de uso. Dados de preferências: configurações do estúdio, vozes favoritas e preferências de interface. Não coletamos dados financeiros diretamente — o processamento de pagamentos é feito por provedores terceirizados certificados PCI-DSS.',
  },
  {
    id: 'como-usamos',
    title: '3. Como Usamos seus Dados',
    content:
      'Prestar e melhorar o Serviço: processar suas solicitações de geração de áudio, imagem e vídeo. Personalizar sua experiência: lembrar preferências e configurações. Comunicar-se com você: enviar notificações importantes sobre o Serviço. Garantir a segurança: detectar e prevenir atividades fraudulentas ou não autorizadas. Análise e melhorias: entender como o Serviço é usado para desenvolver novas funcionalidades. Cumprir obrigações legais: atender requisitos legais e regulatórios.',
  },
  {
    id: 'compartilhamento',
    title: '4. Compartilhamento de Dados',
    content:
      'Seus dados pessoais não são vendidos a terceiros. Podemos compartilhar dados com: Google Cloud (Firebase): para autenticação, armazenamento de dados e infraestrutura. Provedores de IA (Google Gemini): para processar solicitações de geração de conteúdo. Provedores de pagamento: para processar transações financeiras, quando aplicável. Autoridades legais: quando exigido por lei ou para proteger nossos direitos. Em todos os casos, os provedores estão sujeitos a acordos de confidencialidade e proteção de dados.',
  },
  {
    id: 'cookies',
    title: '5. Cookies',
    content:
      'Usamos cookies técnicos essenciais para o funcionamento do Serviço. Cookies de autenticação: mantêm sua sessão ativa (Firebase Auth). Cookies de preferências: armazenam suas configurações de interface. Service Worker: permite funcionalidades offline para conteúdo já acessado. Não utilizamos cookies de publicidade ou rastreamento de terceiros. Para mais detalhes, consulte nossa Política de Cookies.',
  },
  {
    id: 'direitos-lgpd',
    title: '6. Seus Direitos (LGPD)',
    content:
      'De acordo com a LGPD, você tem os seguintes direitos: Confirmação e acesso: saber quais dados possuímos sobre você. Correção: solicitar a correção de dados incompletos ou desatualizados. Anonimização, bloqueio ou eliminação: solicitar o tratamento adequado de dados desnecessários. Portabilidade: receber seus dados em formato estruturado. Eliminação: solicitar a exclusão de dados tratados com base no seu consentimento. Informação sobre compartilhamento: saber com quais entidades seus dados foram compartilhados. Revogação do consentimento: retirar seu consentimento a qualquer momento. Para exercer seus direitos, entre em contato pelo email contato@scriptmaster.app.',
  },
  {
    id: 'retencao',
    title: '7. Retenção de Dados',
    content:
      'Seus dados são retidos pelo tempo necessário para prestar o Serviço e cumprir obrigações legais. Dados de conta: mantidos enquanto sua conta estiver ativa. Dados de uso (roteiros, áudios, etc.): mantidos enquanto sua conta estiver ativa ou até exclusão manual. Dados técnicos: retidos por até 90 dias para fins de análise. Após o encerramento da conta: seus dados são mantidos por 30 dias (período de carência para reativação) e depois excluídos permanentemente.',
  },
  {
    id: 'seguranca',
    title: '8. Segurança',
    content:
      'Implementamos medidas técnicas e organizacionais para proteger seus dados: Criptografia em trânsito (HTTPS/TLS) e em repouso (criptografia do Firebase). Controle de acesso baseado em funções (RBAC). Monitoramento contínuo de atividades suspeitas. Backup automático com redundância geográfica. Auditorias regulares de segurança. Apesar de nossos esforços, nenhum sistema é 100% seguro. Em caso de incidente de segurança, notificaremos os afetados e a Autoridade Nacional de Proteção de Dados (ANPD) conforme exigido pela LGPD.',
  },
  {
    id: 'mudancas',
    title: '9. Mudanças nesta Política',
    content:
      'Podemos atualizar esta Política de Privacidade periodicamente. Mudanças significativas serão comunicadas por email ou notificação no Serviço. A data de "última atualização" no topo desta página indica quando a política foi revisada pela última vez. Recomendamos que você revise esta política regularmente.',
  },
  {
    id: 'contato',
    title: '10. Contato',
    content:
      'Para questões relacionadas à privacidade e proteção de dados, entre em contato: Email: contato@scriptmaster.app. Resposta em até 15 dias úteis, conforme exigido pela LGPD. Para solicitar a exclusão de sua conta, visite a página de contato ou envie um email diretamente.',
  },
] as const;

// ── Componente principal ──────────────────────────────────────────────

export default function PrivacyPage(): ReactNode {
  const seo = getPageSeo({
    title: 'Política de Privacidade',
    description: 'Política de privacidade do Script Master. Saiba como tratamos seus dados conforme a LGPD.',
    path: '/privacidade',
  });

  return (
    <>
      <Helmet {...seo} />
      <LegalPageTemplate
        title={PAGE_TITLE}
        lastUpdated={LAST_UPDATE}
        sections={PRIVACY_SECTIONS}
        tocAriaLabel="Sumário da política de privacidade"
      />
    </>
  );
}
