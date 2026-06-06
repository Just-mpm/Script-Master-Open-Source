import { LegalSection } from '../../components/public/LegalPageTemplate';

export interface LegalPageData {
  title: string;
  description: string;
  lastUpdated: string;
  tocAriaLabel: string;
  sections: readonly LegalSection[];
}

export const TERMS_DATA: Record<'pt-BR' | 'en' | 'es', LegalPageData> = {
  'pt-BR': {
    title: 'Termos de Uso',
    description: 'Termos de uso do Script Master. Leia antes de utilizar o serviço.',
    lastUpdated: '24 de abril de 2026',
    tocAriaLabel: 'Sumário dos termos',
    sections: [
      {
        id: 'aceitacao',
        title: '1. Aceitação dos Termos',
        content: 'Ao acessar e utilizar o Script Master ("Serviço"), você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize o Serviço. Estes termos constituem um acordo legal entre você ("Usuário") e a Koda AI Studio ("Empresa").',
      },
      {
        id: 'descricao',
        title: '2. Descrição do Serviço',
        content: 'O Script Master é uma plataforma que permite a transformação de roteiros em áudio profissional utilizando tecnologia de inteligência artificial. O Serviço inclui funcionalidades de geração de voz por IA (TTS), criação de imagens, renderização de vídeo e assistente conversacional. O Serviço é fornecido "como está" (as is) e pode ser modificado ou descontinuado a qualquer momento.',
      },
      {
        id: 'conta',
        title: '3. Conta do Usuário',
        content: 'Para acessar funcionalidades completas do Serviço, você precisa criar uma conta. Você é responsável por manter a confidencialidade de suas credenciais de acesso. Deve fornecer informações verdadeiras, precisas e completas durante o registro. Você deve ter pelo menos 18 anos para criar uma conta. A Empresa reserva-se o direito de suspender ou encerrar contas que violem estes termos.',
      },
      {
        id: 'uso-permitido',
        title: '4. Uso Permitido',
        content: 'Você concorda em usar o Serviço apenas para fins lícitos e de acordo com estes Termos. Você não deve: (a) usar o Serviço de forma que viole qualquer lei ou regulamento aplicável; (b) tentar obter acesso não autorizado a qualquer parte do Serviço; (c) usar o Serviço para transmitir qualquer material que seja ofensivo, difamatório ou ilegal; (d) interferir ou interromper o funcionamento do Serviço; (e) usar o Serviço para fins de concorrência desleal ou para prejudicar a Empresa.',
      },
      {
        id: 'conteudo-usuario',
        title: '5. Conteúdo do Usuário',
        content: 'Você mantém todos os direitos sobre o conteúdo que cria no Serviço. Ao usar o Serviço, você concede à Empresa uma licença limitada para processar seu conteúdo para fins de prestação do Serviço. Você é responsável por garantir que seu conteúdo não viola direitos de terceiros. A Empresa pode armazenar seu conteúdo para fornecer o Serviço, conforme detalhado em nossa Política de Privacidade.',
      },
      {
        id: 'limitacao',
        title: '6. Limitação de Responsabilidade',
        content: 'A Empresa não será responsável por quaisquer danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso ou incapacidade de uso do Serviço. A responsabilidade total da Empresa não excederá o equivalente a cem dólares (USD 100) ou o valor que você efetivamente pagou ao Google pelo uso da API Gemini nos últimos 12 meses, o que for menor. O Serviço é fornecido sem garantias de qualquer tipo, expressas ou implícitas.',
      },
      {
        id: 'propriedade',
        title: '7. Propriedade Intelectual',
        content: 'Todo o conteúdo do Serviço, incluindo mas não limitado a software, design, logotipos, ícones, textos e gráficos, é propriedade da Empresa ou de seus licenciadores e é protegido pelas leis de propriedade intelectual. O conteúdo gerado por IA através do Serviço é de propriedade do Usuário.',
      },
      {
        id: 'modificacoes',
        title: '8. Modificações nos Termos',
        content: 'A Empresa reserva-se o direito de modificar estes Termos a qualquer momento. Modificações significativas serão comunicadas por email ou notificação no Serviço. O uso continuado do Serviço após a publicação de modificações constitui aceitação dos novos termos. A data da "última atualização" no topo desta página indica quando os termos foram revisados pela última vez.',
      },
      {
        id: 'encerramento',
        title: '9. Encerramento',
        content: 'Você pode encerrar sua conta a qualquer momento entrando em contato com a Empresa. A Empresa pode suspender ou encerrar seu acesso ao Serviço a qualquer momento, sem aviso prévio, por violação destes Termos ou por qualquer outro motivo. Após o encerramento, seu conteúdo será mantido por 30 dias e depois excluído permanentemente, conforme nossa Política de Privacidade.',
      },
      {
        id: 'disposicoes',
        title: '10. Disposições Gerais',
        content: 'Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será submetida ao foro da comarca de Salvador, Bahia. Se qualquer disposição destes Termos foi considerada inválida ou inexequível, as disposições restantes permanecerão em pleno vigor e efeito. A falha da Empresa em exercer qualquer direito previsto nestes Termos não constituirá renúncia a tal direito.',
      },
    ],
  },
  'en': {
    title: 'Terms of Use',
    description: 'Terms of use of Script Master. Please read before using the service.',
    lastUpdated: 'April 24, 2026',
    tocAriaLabel: 'Summary of terms',
    sections: [
      {
        id: 'aceitacao',
        title: '1. Acceptance of Terms',
        content: 'By accessing and using Script Master ("Service"), you agree to these Terms of Use. If you do not agree to any part of these terms, do not use the Service. These terms constitute a legal agreement between you ("User") and Koda AI Studio ("Company").',
      },
      {
        id: 'descricao',
        title: '2. Description of Service',
        content: 'Script Master is a platform that allows the transformation of scripts into professional audio using artificial intelligence technology. The Service includes AI voice generation (TTS), image creation, video rendering, and a conversational assistant. The Service is provided "as is" and can be modified or discontinued at any time.',
      },
      {
        id: 'conta',
        title: '3. User Account',
        content: 'To access the full features of the Service, you need to create an account. You are responsible for maintaining the confidentiality of your access credentials. You must provide true, accurate, and complete information during registration. You must be at least 18 years old to create an account. The Company reserves the right to suspend or terminate accounts that violate these terms.',
      },
      {
        id: 'uso-permitido',
        title: '4. Permitted Use',
        content: 'You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not: (a) use the Service in a way that violates any applicable law or regulation; (b) attempt to gain unauthorized access to any part of the Service; (c) use the Service to transmit any material that is offensive, defamatory, or illegal; (d) interfere with or disrupt the operation of the Service; (e) use the Service for unfair competition or to harm the Company.',
      },
      {
        id: 'conteudo-usuario',
        title: '5. User Content',
        content: 'You retain all rights to the content you create on the Service. By using the Service, you grant the Company a limited license to process your content for the purpose of providing the Service. You are responsible for ensuring that your content does not violate the rights of third parties. The Company may store your content to provide the Service, as detailed in our Privacy Policy.',
      },
      {
        id: 'limitacao',
        title: '6. Limitation of Liability',
        content: 'The Company will not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use the Service. The total liability of the Company shall not exceed the equivalent of one hundred US dollars (USD 100) or the amount you actually paid to Google for Gemini API usage in the last 12 months, whichever is less. The Service is provided without warranties of any kind, express or implied.',
      },
      {
        id: 'propriedade',
        title: '7. Intellectual Property',
        content: 'All content on the Service, including but not limited to software, design, logos, icons, texts, and graphics, is the property of the Company or its licensors and is protected by intellectual property laws. Content generated by AI through the Service is owned by the User.',
      },
      {
        id: 'modificacoes',
        title: '8. Modifications to Terms',
        content: 'The Company reserves the right to modify these Terms at any time. Significant changes will be communicated by email or notification on the Service. Continued use of the Service after changes are published constitutes acceptance of the new terms. The "last updated" date at the top of this page indicates when the terms were last revised.',
      },
      {
        id: 'encerramento',
        title: '9. Termination',
        content: 'You can terminate your account at any time by contacting the Company. The Company may suspend or terminate your access to the Service at any time, without prior notice, for violating these Terms or for any other reason. Upon termination, your content will be kept for 30 days and then permanently deleted, in accordance with our Privacy Policy.',
      },
      {
        id: 'disposicoes',
        title: '10. General Provisions',
        content: 'These Terms are governed by the laws of the Federative Republic of Brazil. Any dispute will be submitted to the court of the district of Salvador, Bahia. If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect. The failure of the Company to exercise any right provided in these Terms will not constitute a waiver of such right.',
      },
    ],
  },
  'es': {
    title: 'Términos de Uso',
    description: 'Términos de uso de Script Master. Lea antes de utilizar el servicio.',
    lastUpdated: '24 de abril de 2026',
    tocAriaLabel: 'Índice de los términos',
    sections: [
      {
        id: 'aceitacao',
        title: '1. Aceptación de los Términos',
        content: 'Al acceder y utilizar Script Master ("Servicio"), usted acepta estos Términos de uso. Si no está de acuerdo con alguna parte de estos términos, no utilice el Servicio. Estos términos constituyen un acuerdo legal entre usted ("Usuario") y Koda AI Studio ("Empresa").',
      },
      {
        id: 'descricao',
        title: '2. Descripción del Servicio',
        content: 'Script Master es una plataforma que permite transformar guiones en audio profesional utilizando tecnología de inteligencia artificial. El Servicio incluye funciones de generación de voz por IA (TTS), creación de imágenes, renderización de video y asistente conversacional. El Servicio se proporciona "tal cual" (as is) y puede modificarse o suspenderse en cualquier momento.',
      },
      {
        id: 'conta',
        title: '3. Cuenta de Usuario',
        content: 'Para acceder a las funciones completas del Servicio, debe crear una cuenta. Usted es responsable de mantener la confidencialidad de sus credenciales de acceso. Debe proporcionar información verdadera, precisa y completa durante el registro. Debe tener al menos 18 años para crear una cuenta. La Empresa se reserva el derecho de suspender o cancelar cuentas que violen estos términos.',
      },
      {
        id: 'uso-permitido',
        title: '4. Uso Permitido',
        content: 'Usted acepta usar el Servicio solo para fines lícitos y de acuerdo con estos Términos. No debe: (a) usar el Servicio de manera que viole cualquier ley o regulación aplicable; (b) intentar obtener acceso no autorizado a cualquier parte del Servicio; (c) usar el Servicio para transmitir cualquier material que sea ofensivo, difamatorio o ilegal; (d) interferir o interrumpir el funcionamiento del Servicio; (e) usar el Servicio para fines de competencia desleal o para dañar a la Empresa.',
      },
      {
        id: 'conteudo-usuario',
        title: '5. Contenido del Usuario',
        content: 'Usted conserva todos los derechos sobre el contenido que crea en el Servicio. Al utilizar el Servicio, concede a la Empresa una licencia limitada para procesar su contenido con el fin de proporcionar el Servicio. Usted es responsable de garantizar que su contenido no viole los derechos de terceros. La Empresa puede almacenar su contenido para proporcionar el Servicio, como se detalla en nuestra Política de privacidad.',
      },
      {
        id: 'limitacao',
        title: '6. Limitación de Responsabilidad',
        content: 'La Empresa no será responsable de ningún daño indirecto, incidental, especial o consecuente que surja del uso o la imposibilidad de usar el Servicio. La responsabilidad total de la Empresa no excederá el equivalente a cien dólares (USD 100) o el monto que usted haya pagado efectivamente a Google por el uso de la API de Gemini en los últimos 12 meses, lo que sea menor. El Servicio se proporciona sin garantías de ningún tipo, expresas o implícitas.',
      },
      {
        id: 'propriedade',
        title: '7. Propiedad Intelectual',
        content: 'Todo el contenido del Servicio, incluyendo pero no limitado a software, diseño, logotipos, iconos, textos y gráficos, es propiedad de la Empresa o de sus licenciantes y está protegido por las leyes de propiedad intelectual. El contenido generado por IA a través del Servicio es propiedad del Usuario.',
      },
      {
        id: 'modificacoes',
        title: '8. Modificaciones a los Términos',
        content: 'La Empresa se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones significativas se comunicarán por correo electrónico o mediante una notificación en el Servicio. El uso continuado del Servicio después de la publicación de las modificaciones constituye la aceptación de los nuevos términos. La fecha de "última actualización" en la parte superior de esta página indica cuándo se revisaron los términos por última vez.',
      },
      {
        id: 'encerramento',
        title: '9. Rescisión',
        content: 'Puede cancelar su cuenta en cualquier momento poniéndose en contacto con la Empresa. La Empresa puede suspender o cancelar su acceso al Servicio en cualquier momento, sin previo aviso, por violar estos Términos o por cualquier otro motivo. Tras la cancelación, su contenido se conservará durante 30 dias y luego se eliminará de forma permanente, de acuerdo con nuestra Política de privacidad.',
      },
      {
        id: 'disposicoes',
        title: '10. Disposiciones Generales',
        content: 'Estos Términos se rigen por las leyes de la República Federativa del Brasil. Cualquier disputa se someterá a los tribunales del distrito de Salvador, Bahía. Si alguna disposición de estos Términos se considera inválida o inaplicable, las disposiciones restantes permanecerán en pleno vigor y efecto. El hecho de que la Empresa no ejerza cualquier derecho previsto en estos Términos no constituirá una renuncia a tal derecho.',
      },
    ],
  },
};

export const PRIVACY_DATA: Record<'pt-BR' | 'en' | 'es', LegalPageData> = {
  'pt-BR': {
    title: 'Política de Privacidade',
    description: 'Política de privacidade do Script Master. Saiba como tratamos seus dados conforme a LGPD.',
    lastUpdated: '1 de junho de 2026',
    tocAriaLabel: 'Sumário da política de privacidade',
    sections: [
      {
        id: 'introducao',
        title: '1. Introdução',
        content: 'A Koda AI Studio ("Empresa") está comprometida com a proteção da privacidade dos usuários do Script Master ("Serviço"). Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e o Regulamento Geral sobre a Proteção de Dados (GDPR).',
      },
      {
        id: 'dados-coletamos',
        title: '2. Dados que Coletamos',
        content: 'Dados fornecidos por você: nome e email associados à sua conta Google. Dados gerados pelo uso: roteiros, áudios, imagens, vídeos e conversas criados no Serviço. Dados técnicos: endereço IP, tipo de navegador, sistema operacional, páginas visitadas e tempo de uso. Dados de preferências: configurações do estúdio, vozes favoritas e preferências de interface. Não coletamos dados financeiros — o Serviço é open source e gratuito.',
      },
      {
        id: 'como-usamos',
        title: '3. Como Usamos seus Dados',
        content: 'Prestar e melhorar o Serviço: processar suas solicitações de geração de áudio, imagem e vídeo. Personalizar sua experiência: lembrar preferências e configurações. Comunicar-se com você: enviar notificações importantes sobre o Serviço. Garantir a segurança: detectar e prevenir atividades fraudulentas ou não autorizadas. Análise e melhorias: entender como o Serviço é usado para desenvolver novas funcionalidades. Cumprir obrigações legais: atender requisitos legais e regulatórios.',
      },
      {
        id: 'compartilhamento',
        title: '4. Compartilhamento de Dados',
        content: 'Seus dados pessoais não são vendidos a terceiros. Podemos compartilhar dados com: Google Cloud (Firebase): para autenticação, armazenamento de dados e infraestrutura. Provedores de IA (Google Gemini): para processar solicitações de geração de conteúdo. Autoridades legais: quando exigido por lei ou para proteger nossos direitos. Em todos os casos, os provedores estão sujeitos a acordos de confidencialidade e proteção de dados.',
      },
      {
        id: 'cookies',
        title: '5. Cookies',
        content: 'Usamos cookies técnicos essenciais para o funcionamento do Serviço. Cookies de autenticação mantêm sua sessão ativa e cookies de preferências armazenam suas configurações. Com seu consentimento explícito, o Firebase Analytics coleta métricas de uso com identificador pseudônimo quando você está autenticado. Não enviamos roteiros, prompts, nomes ou emails ao Analytics. Para mais detalhes, consulte nossa Política de Cookies.',
      },
      {
        id: 'direitos-lgpd',
        title: '6. Seus Direitos (LGPD)',
        content: 'De acordo com a LGPD, você tem os seguintes direitos: Confirmação e acesso: saber quais dados possuímos sobre você. Correção: solicitar a correção de dados incompletos ou desatualizados. Anonimização, bloqueio ou eliminação: solicitar o tratamento adequado de dados desnecessários. Portabilidade: receber seus dados em formato estruturado. Eliminação: solicitar a exclusão de dados tratados com base no seu consentimento. Informação sobre compartilhamento: saber com quais entidades seus dados foram compartilhados. Revogação do consentimento: retirar seu consentimento a qualquer momento. Para exercer seus direitos, entre em contato pelo email contato@scriptmaster.app.',
      },
      {
        id: 'retencao',
        title: '7. Retenção de Dados',
        content: 'Seus dados são retidos pelo tempo necessário para prestar o Serviço e cumprir obrigações legais. Dados de conta: mantidos enquanto sua conta estiver ativa. Dados de uso (roteiros, áudios, etc.): mantidos enquanto sua conta estiver ativa ou até exclusão manual. Dados técnicos: retidos por até 90 dias para fins de análise. Após o encerramento da conta: seus dados são mantidos por 30 dias (período de carência para reativação) e depois excluídos permanentemente.',
      },
      {
        id: 'seguranca',
        title: '8. Segurança',
        content: 'Implementamos medidas técnicas e organizacionais para proteger seus dados: Criptografia em trânsito (HTTPS/TLS) e em repouso (criptografia do Firebase). Controle de acesso baseado em funções (RBAC). Monitoramento contínuo de atividades suspeitas. Backup automático com redundância geográfica. Auditorias regulares de segurança. Apesar de nossos esforços, nenhum sistema é 100% seguro. Em caso de incidente de segurança, notificaremos os afetados e a Autoridade Nacional de Proteção de Dados (ANPD) conforme exigido pela LGPD.',
      },
      {
        id: 'mudancas',
        title: '9. Mudanças nesta Política',
        content: 'Podemos atualizar esta Política de Privacidade periodicamente. Mudanças significativas serão comunicadas por email ou notificação no Serviço. A data de "última atualização" no topo desta página indica quando a política foi revisada pela última vez. Recomendamos que você revise esta política regularmente.',
      },
      {
        id: 'contato',
        title: '10. Contato',
        content: 'Para questões relacionadas à privacidade e proteção de dados, entre em contato: Email: contato@scriptmaster.app. Resposta em até 15 dias úteis, conforme exigido pela LGPD. Para solicitar a exclusão de sua conta, visite a página de contato ou envie um email diretamente.',
      },
    ],
  },
  'en': {
    title: 'Privacy Policy',
    description: 'Privacy policy of Script Master. Learn how we handle your data in accordance with the LGPD and GDPR.',
    lastUpdated: 'June 1, 2026',
    tocAriaLabel: 'Summary of privacy policy',
    sections: [
      {
        id: 'introducao',
        title: '1. Introduction',
        content: 'Koda AI Studio ("Company") is committed to protecting the privacy of Script Master ("Service") users. This Privacy Policy explains how we collect, use, store, and protect your personal data, in compliance with the General Data Protection Law (LGPD - Law No. 13,709/2018) and the General Data Protection Regulation (GDPR).',
      },
      {
        id: 'dados-coletamos',
        title: '2. Data We Collect',
        content: 'Data provided by you: name and email associated with your Google account. Data generated by use: scripts, audio files, images, videos, and chat conversations created in the Service. Technical data: IP address, browser type, operating system, pages visited, and time of use. Preferences data: studio configurations, favorite voices, and interface preferences. We do not collect financial data — the Service is open source and free.',
      },
      {
        id: 'como-usamos',
        title: '3. How We Use Your Data',
        content: 'Provide and improve the Service: process your requests for generating audio, image, and video. Personalize your experience: remember preferences and configurations. Communicate with you: send important notifications about the Service. Ensure security: detect and prevent fraudulent or unauthorized activities. Analysis and improvements: understand how the Service is used to develop new features. Comply with legal obligations: meet legal and regulatory requirements.',
      },
      {
        id: 'compartilhamento',
        title: '4. Data Sharing',
        content: 'Your personal data is not sold to third parties. We may share data with: Google Cloud (Firebase): for authentication, data storage, and infrastructure. AI Providers (Google Gemini): to process content generation requests. Legal authorities: when required by law or to protect our rights. In all cases, providers are subject to confidentiality and data protection agreements.',
      },
      {
        id: 'cookies',
        title: '5. Cookies',
        content: 'We use technical cookies essential for the operation of the Service. Authentication cookies keep your session active and preference cookies store your settings. With your explicit consent, Firebase Analytics collects usage metrics with a pseudonymous identifier when you are signed in. We do not send scripts, prompts, names, or emails to Analytics. For more details, consult our Cookies Policy.',
      },
      {
        id: 'direitos-lgpd',
        title: '6. Your Rights (LGPD)',
        content: 'In accordance with the LGPD, you have the following rights: Confirmation and access: know what data we hold about you. Correction: request the correction of incomplete or outdated data. Anonymization, blocking, or elimination: request appropriate treatment of unnecessary data. Portability: receive your data in a structured format. Elimination: request the deletion of data processed based on your consent. Sharing information: know with which entities your data was shared. Revocation of consent: withdraw your consent at any time. To exercise your rights, contact us at contato@scriptmaster.app.',
      },
      {
        id: 'retencao',
        title: '7. Data Retention',
        content: 'Your data is retained for the time necessary to provide the Service and comply with legal obligations. Account data: kept while your account is active. Usage data (scripts, audio, etc.): kept while your account is active or until manual deletion. Technical data: retained for up to 90 days for analysis. After account closure: your data is kept for 30 days (grace period for reactivation) and then permanently deleted.',
      },
      {
        id: 'seguranca',
        title: '8. Security',
        content: 'We implement technical and organizational measures to protect your data: Encryption in transit (HTTPS/TLS) and at rest (Firebase encryption). Role-based access control (RBAC). Continuous monitoring of suspicious activities. Automatic backup with geographic redundancy. Regular security audits. Despite our efforts, no system is 100% secure. In the event of a security incident, we will notify those affected and the National Data Protection Authority (ANPD) as required by the LGPD.',
      },
      {
        id: 'mudancas',
        title: '9. Changes to This Policy',
        content: 'We may update this Privacy Policy periodically. Significant changes will be communicated by email or notification on the Service. The "last updated" date at the top of this page indicates when the policy was last revised. We recommend that you review this policy regularly.',
      },
      {
        id: 'contato',
        title: '10. Contact',
        content: 'For issues related to privacy and data protection, contact: Email: contato@scriptmaster.app. Response within 15 business days, as required by the LGPD. To request deletion of your account, visit the contact page or send an email directly.',
      },
    ],
  },
  'es': {
    title: 'Política de Privacidad',
    description: 'Política de privacidad de Script Master. Conozca cómo tratamos sus datos de acuerdo con la LGPD y el GDPR.',
    lastUpdated: '1 de junio de 2026',
    tocAriaLabel: 'Índice de la política de privacidad',
    sections: [
      {
        id: 'introducao',
        title: '1. Introducción',
        content: 'Koda AI Studio ("Empresa") se compromete a proteger la privacidad de los usuarios de Script Master ("Servicio"). Esta Política de privacidad explica cómo recopilamos, usamos, almacenamos y protegemos sus datos personales, de conformidad con la Ley General de Protección de Datos (LGPD - Ley N° 13.709/2018) y el Reglamento General de Protección de Datos (GDPR).',
      },
      {
        id: 'dados-coletamos',
        title: '2. Datos que Recopilamos',
        content: 'Datos proporcionados por usted: nombre y correo electrónico asociados con su cuenta de Google. Datos generados por el uso: guiones, audios, imágenes, videos y conversaciones creados en el Servicio. Datos técnicos: dirección IP, tipo de navegador, sistema operativo, páginas visitadas y tiempo de uso. Datos de preferencias: configuraciones del estudio, voces favoritas y preferencias de interfaz. No recopilamos datos financieros — el Servicio es open source y gratuito.',
      },
      {
        id: 'como-usamos',
        title: '3. Cómo Usamos sus Datos',
        content: 'Proporcionar y mejorar el Servicio: procesar sus solicitudes de generación de audio, imagen y video. Personalizar su experiencia: recordar preferencias y configuraciones. Comunicarnos con usted: enviar notificaciones importantes sobre el Servicio. Garantizar la seguridad: detectar y prevenir actividades fraudulentas o no autorizadas. Análisis y mejoras: comprender cómo se utiliza el Servicio para desarrollar nuevas funciones. Cumplir con las obligaciones legales: cumplir con los requisitos legales y regulatorios.',
      },
      {
        id: 'compartilhamento',
        title: '4. Compartir Datos',
        content: 'Sus datos personales no se venden a terceros. Podemos compartir datos con: Google Cloud (Firebase): para autenticación, almacenamiento de datos e infraestructura. Proveedores de IA (Google Gemini): para procesar solicitudes de generación de contenido. Autoridades legales: cuando lo requiera la ley o para proteger nuestros derechos. En todos los casos, los proveedores están sujetos a acuerdos de confidencialidad y protección de datos.',
      },
      {
        id: 'cookies',
        title: '5. Cookies',
        content: 'Utilizamos cookies técnicas esenciales para el funcionamiento del Servicio. Las cookies de autenticación mantienen tu sesión activa y las cookies de preferencias almacenan tu configuración. Con tu consentimiento explícito, Firebase Analytics recopila métricas de uso con un identificador seudónimo cuando inicias sesión. No enviamos guiones, prompts, nombres ni emails a Analytics. Para más detalles, consulta nuestra Política de cookies.',
      },
      {
        id: 'direitos-lgpd',
        title: '6. Sus Derechos (LGPD)',
        content: 'De acuerdo con la LGPD, usted tiene los siguientes derechos: Confirmación y acceso: saber qué datos tenemos sobre usted. Corrección: solicitar la corrección de datos incompletos o desactualizados. Anonimización, bloqueo o eliminación: solicitar el tratamiento adecuado de datos innecesarios. Portabilidad: recibir sus datos en un formato estructurado. Eliminación: solicitar la eliminación de los datos procesados en función de su consentimiento. Información sobre compartir: saber con qué entidades se compartieron sus datos. Revocación del consentimiento: retirar su consentimiento en cualquier momento. Para ejercer sus derechos, contáctenos en contato@scriptmaster.app.',
      },
      {
        id: 'retencao',
        title: '7. Retención de Datos',
        content: 'Sus datos se conservan durante el tiempo necesario para proporcionar el Servicio y cumplir con las obligaciones legales. Datos de la cuenta: se conservan mientras su cuenta esté activa. Datos de uso (guiones, audios, etc.): se conservan mientras su cuenta esté activa o hasta que se eliminen manualmente. Datos técnicos: se conservan hasta por 90 días para fines de análisis. Después del cierre de la cuenta: sus datos se conservan durante 30 días (período de gracia para la reactivación) y luego se eliminan de forma permanente.',
      },
      {
        id: 'seguranca',
        title: '8. Seguridad',
        content: 'Implementamos medidas técnicas y organizativas para proteger sus datos: Cifrado en tránsito (HTTPS/TLS) y en reposo (cifrado de Firebase). Control de acceso basado en roles (RBAC). Monitoreo continuo de actividades sospechosas. Copia de seguridad automática con redundancia geográfica. Auditorías de seguridad periódicas. A pesar de nuestros esfuerzos, ningún sistema es 100% seguro. En caso de un incidente de seguridad, notificaremos a los afectados y a la Autoridad Nacional de Protección de Datos (ANPD) según lo exige la LGPD.',
      },
      {
        id: 'mudancas',
        title: '9. Cambios en Esta Política',
        content: 'Podemos actualizar esta Política de privacidad periódicamente. Las modificaciones significativas se comunicarán por correo electrónico o mediante una notificación en el Servicio. La fecha de "última actualización" en la parte superior de esta página indica cuándo se revisó la política por última vez. Le recomendamos que revise esta política con regularidad.',
      },
      {
        id: 'contato',
        title: '10. Contacto',
        content: 'Para asuntos relacionados con la privacidad y la protección de datos, comuníquese con: Correo electrónico: contato@scriptmaster.app. Respuesta dentro de los 15 días hábiles, según lo exige la LGPD. Para solicitar la eliminación de su cuenta, visite la página de contacto o envíe un correo electrónico directamente.',
      },
    ],
  },
};

export const COOKIES_DATA: Record<'pt-BR' | 'en' | 'es', LegalPageData> = {
  'pt-BR': {
    title: 'Política de Cookies',
    description: 'Política de cookies do Script Master. Saiba quais cookies utilizamos e por quê.',
    lastUpdated: '1 de junho de 2026',
    tocAriaLabel: 'Sumário da política de cookies',
    sections: [
      {
        id: 'o-que-sao',
        title: '1. O que são Cookies',
        content: 'Cookies são pequenos arquivos de texto armazenados no seu dispositivo (computador, tablet ou smartphone) quando você visita um site. Eles permitem que o site reconheça seu dispositivo e armazene informações sobre suas preferências ou ações anteriores. Cookies são amplamente utilizados para fazer os sites funcionarem de forma mais eficiente e fornecer informações aos proprietários do site.',
      },
      {
        id: 'cookies-usamos',
        title: '2. Cookies que Usamos',
        content: 'O Script Master utiliza os seguintes tipos de cookies: Cookies essenciais: necessários para o funcionamento básico do Serviço. Incluem cookies de autenticação (Firebase Auth) e preferências do usuário. Sem eles, o Serviço não funciona corretamente. Cookies de funcionalidade: permitem lembrar suas preferências (voz favorita, configurações do estúdio) e fornecer funcionalidades aprimoradas. Cookies de análise: coletam informações pseudônimas sobre como você usa o Serviço, ajudando a entender o uso e melhorar a experiência. Cookies de Service Worker: permitem funcionalidades offline, como acesso a áudios já gerados.',
      },
      {
        id: 'cookies-terceiros',
        title: '3. Cookies de Terceiros',
        content: 'Alguns cookies são definidos por serviços de terceiros que aparecem em nossas páginas: Google Firebase é utilizado para autenticação, armazenamento de dados e métricas de uso. O Firebase Analytics só é ativado após seu consentimento e usa um identificador pseudônimo quando você está autenticado. Não enviamos roteiros, prompts, nomes ou emails ao Analytics. Não utilizamos cookies de publicidade ou pixels de rastreamento de redes sociais.',
      },
      {
        id: 'gerenciamento',
        title: '4. Gerenciamento de Cookies',
        content: 'Você pode ativar ou revogar cookies analíticos a qualquer momento pelo controle "Gerenciar cookies" no Serviço. Também pode desabilitar cookies nas configurações do navegador. Cookies essenciais não podem ser desabilitados pelo Serviço, pois são necessários para o funcionamento básico.',
      },
      {
        id: 'alteracoes',
        title: '5. Alterações nesta Política',
        content: 'Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças nos cookies que utilizamos ou por razões operacionais, legais ou regulatórias. Recomendamos que você visite esta página regularmente para se manter informado sobre o uso de cookies. A data de "última atualização" no topo indica quando esta política foi revisada pela última vez.',
      },
      {
        id: 'contato',
        title: '6. Contato',
        content: 'Se você tiver dúvidas sobre nossa política de cookies, entre em contato: Email: contato@scriptmaster.app. Responderemos em até 15 dias úteis.',
      },
    ],
  },
  'en': {
    title: 'Cookies Policy',
    description: 'Cookies policy of Script Master. Learn what cookies we use and why.',
    lastUpdated: 'June 1, 2026',
    tocAriaLabel: 'Summary of cookies policy',
    sections: [
      {
        id: 'o-que-sao',
        title: '1. What Are Cookies',
        content: 'Cookies are small text files stored on your device (computer, tablet, or smartphone) when you visit a website. They allow the website to recognize your device and store information about your preferences or past actions. Cookies are widely used to make websites work more efficiently and provide information to website owners.',
      },
      {
        id: 'cookies-usamos',
        title: '2. Cookies We Use',
        content: 'Script Master uses the following types of cookies: Essential cookies: necessary for the basic operation of the Service. These include authentication cookies (Firebase Auth) and user preferences. Without them, the Service does not function properly. Functionality cookies: allow remembering your preferences (favorite voice, studio settings) and providing enhanced features. Analytics cookies: collect pseudonymous information about how you use the Service, helping to understand usage and improve experience. Service Worker cookies: allow offline features, such as access to already generated audios.',
      },
      {
        id: 'cookies-terceiros',
        title: '3. Third-Party Cookies',
        content: 'Some cookies are set by third-party services that appear on our pages: Google Firebase is used for authentication, data storage, and usage metrics. Firebase Analytics is only enabled after your consent and uses a pseudonymous identifier when you are signed in. We do not send scripts, prompts, names, or emails to Analytics. We do not use advertising cookies or social media tracking pixels.',
      },
      {
        id: 'gerenciamento',
        title: '4. Managing Cookies',
        content: 'You can enable or revoke analytics cookies at any time through the "Manage cookies" control in the Service. You can also disable cookies in your browser settings. Essential cookies cannot be disabled by the Service because they are required for basic operation.',
      },
      {
        id: 'alteracoes',
        title: '5. Changes to This Policy',
        content: 'We may update this Cookies Policy periodically to reflect changes in the cookies we use or for operational, legal, or regulatory reasons. We recommend that you visit this page regularly to stay informed about cookie usage. The "last updated" date at the top indicates when this policy was last revised.',
      },
      {
        id: 'contato',
        title: '6. Contact',
        content: 'If you have questions about our cookies policy, contact: Email: contato@scriptmaster.app. We will respond within 15 business days.',
      },
    ],
  },
  'es': {
    title: 'Política de Cookies',
    description: 'Política de cookies de Script Master. Conozca qué cookies utilizamos y por qué.',
    lastUpdated: '1 de junio de 2026',
    tocAriaLabel: 'Índice de la política de cookies',
    sections: [
      {
        id: 'o-que-sao',
        title: '1. Qué son las Cookies',
        content: 'Las cookies son pequeños archivos de texto que se almacenan en su dispositivo (computadora, tableta o teléfono inteligente) cuando visita un sitio web. Permiten que el sitio web reconozca su dispositivo y almacene información sobre sus preferencias o acciones anteriores. Las cookies se utilizan ampliamente para hacer que los sitios web funcionen de manera más eficiente y proporcionar información a los propietarios del sitio.',
      },
      {
        id: 'cookies-usamos',
        title: '2. Cookies que Utilizamos',
        content: 'Script Master utiliza los siguientes tipos de cookies: Cookies esenciales: necesarias para el funcionamiento básico del Servicio. Incluyen cookies de autenticación (Firebase Auth) y preferencias de usuario. Sin ellas, el Servicio no funciona correctamente. Cookies de funcionalidad: permiten recordar sus preferencias (voz favorita, configuración del estudio) y proporcionar funciones mejoradas. Cookies de análisis: recopilan información seudónima sobre cómo utiliza el Servicio, lo que ayuda a comprender el uso y mejorar la experiencia. Cookies de Service Worker: permiten funciones sin conexión, como el acceso a audios ya generados.',
      },
      {
        id: 'cookies-terceiros',
        title: '3. Cookies de Terceros',
        content: 'Algunas cookies las establecen servicios de terceros que aparecen en nuestras páginas: Google Firebase se utiliza para autenticación, almacenamiento de datos y métricas de uso. Firebase Analytics solo se activa después de tu consentimiento y utiliza un identificador seudónimo cuando inicias sesión. No enviamos guiones, prompts, nombres ni emails a Analytics. No utilizamos cookies publicitarias ni píxeles de seguimiento de redes sociales.',
      },
      {
        id: 'gerenciamento',
        title: '4. Gestión de Cookies',
        content: 'Puedes activar o revocar las cookies analíticas en cualquier momento mediante el control "Gestionar cookies" del Servicio. También puedes desactivar cookies en la configuración del navegador. Las cookies esenciales no se pueden desactivar desde el Servicio porque son necesarias para el funcionamiento básico.',
      },
      {
        id: 'alteracoes',
        title: '5. Cambios en Esta Política',
        content: 'Podemos actualizar esta Política de cookies periódicamente para refleir los cambios en las cookies que utilizamos o por razones operativas, legales o reguladoras. Le recomendamos que visite esta página con regularidad para mantenerse informado sobre el uso de las cookies. La fecha de "última actualización" en la parte superior indica cuándo se revisó esta política por última vez.',
      },
      {
        id: 'contato',
        title: '6. Contacto',
        content: 'Si tiene preguntas sobre nuestra política de cookies, contáctenos en: Correo electrónico: contato@scriptmaster.app. Responderemos en un plazo de 15 días hábiles.',
      },
    ],
  },
};
