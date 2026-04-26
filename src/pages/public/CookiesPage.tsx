import type { ReactNode } from 'react';
import { DocumentHead } from '../../components/DocumentHead';
import { getPageSeo } from '../../lib/seo';
import { LegalPageTemplate } from '../../components/public/LegalPageTemplate';
import type { LegalSection } from '../../components/public/LegalPageTemplate';

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

// ── Página principal ─────────────────────────────────────────────────

export default function CookiesPage(): ReactNode {
  const seo = getPageSeo({
    title: 'Política de Cookies',
    description: 'Política de cookies do Script Master. Saiba quais cookies utilizamos e por quê.',
    path: '/cookies',
  });

  return (
    <>
      <DocumentHead {...seo} />
      <LegalPageTemplate
        title={PAGE_TITLE}
        lastUpdated={LAST_UPDATE}
        sections={COOKIES_SECTIONS}
        tocAriaLabel="Sumário da política de cookies"
      />
    </>
  );
}
