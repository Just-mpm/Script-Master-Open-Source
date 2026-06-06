import type { Locale } from '../features/i18n/types';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Item individual de FAQ sobre BYOK */
export interface ByokFaqItem {
  readonly question: string;
  readonly answer: string;
}

// ── Strings localizadas ───────────────────────────────────────────────

/** Strings do FAQ sobre BYOK e open source por idioma */
const byokFaqStrings = {
  'pt-BR': {
    faq0Question: 'O que é BYOK?',
    faq0Answer:
      'BYOK (Bring Your Own Key) significa que você usa sua própria chave de API do Gemini para rodar as gerações. O Script Master não cobra nada nem intermedeia o consumo da API.',
    faq1Question: 'Como consigo minha chave de API do Gemini?',
    faq1Answer:
      'Acesse Google AI Studio (aistudio.google.com), faça login com sua conta Google e gere uma chave de API. A chave é configurada uma única vez dentro do app.',
    faq2Question: 'O Script Master é realmente gratuito?',
    faq2Answer:
      'Sim. O app é open source e gratuito. As chamadas de IA usam a sua chave Gemini e ficam vinculadas à sua própria conta Google.',
    faq3Question: 'É seguro usar minha chave de API no app?',
    faq3Answer:
      'Sua chave fica salva apenas neste dispositivo, no IndexedDB do navegador. Ela não é gravada no Firestore nem no bundle do frontend; é enviada por HTTPS ao backend somente durante testes e gerações para chamar o Gemini em seu nome.',
    faq4Question: 'Como acompanho o uso do Gemini?',
    faq4Answer:
      'Acompanhe uso, limites e eventuais cobranças diretamente no Google AI Studio e na sua conta Google. O Script Master não altera nem intermedeia essas regras.',
    faq5Question: 'Posso contribuir com o projeto?',
    faq5Answer:
      'Sim! O Script Master é open source. Você pode contribuir com código, reportar bugs, sugerir funcionalidades e melhorar a documentação. Acesse o repositório para começar: https://github.com/Just-mpm/Script-Master-Open-Source',
  },
  en: {
    faq0Question: 'What is BYOK?',
    faq0Answer:
      'BYOK (Bring Your Own Key) means you use your own Gemini API key to run generations. Script Master does not charge or intermediate API consumption.',
    faq1Question: 'How do I get my Gemini API key?',
    faq1Answer:
      'Go to Google AI Studio (aistudio.google.com), sign in with your Google account, and generate an API key. The key is configured once inside the app.',
    faq2Question: 'Is Script Master really free?',
    faq2Answer:
      'Yes. The app is open source and free. AI calls use your Gemini key and remain tied to your own Google account.',
    faq3Question: 'Is it safe to use my API key in the app?',
    faq3Answer:
      'Your key is stored only on this device, in the browser IndexedDB. It is not written to Firestore or bundled into the frontend; it is sent over HTTPS to the backend only during tests and generations to call Gemini on your behalf.',
    faq4Question: 'How do I track Gemini usage?',
    faq4Answer:
      'Track usage, limits, and any Google-side charges directly in Google AI Studio and your Google account. Script Master does not change or intermediate those rules.',
    faq5Question: 'Can I contribute to the project?',
    faq5Answer:
      'Yes! Script Master is open source. You can contribute code, report bugs, suggest features, and improve documentation. Check the repository to get started: https://github.com/Just-mpm/Script-Master-Open-Source',
  },
  es: {
    faq0Question: '¿Qué es BYOK?',
    faq0Answer:
      'BYOK (Bring Your Own Key) significa que usas tu propia clave de API de Gemini para ejecutar las generaciones. Script Master no cobra ni intermedia el consumo de la API.',
    faq1Question: '¿Cómo consigo mi clave de API de Gemini?',
    faq1Answer:
      'Accede a Google AI Studio (aistudio.google.com), inicia sesión con tu cuenta de Google y genera una clave de API. La clave se configura una única vez dentro de la app.',
    faq2Question: '¿Script Master es realmente gratuito?',
    faq2Answer:
      'Sí. La app es open source y gratuita. Las llamadas de IA usan tu clave Gemini y quedan vinculadas a tu propia cuenta de Google.',
    faq3Question: '¿Es seguro usar mi clave de API en la app?',
    faq3Answer:
      'Tu clave se guarda solo en este dispositivo, en el IndexedDB del navegador. No se escribe en Firestore ni se incluye en el bundle del frontend; se envía por HTTPS al backend solo durante pruebas y generaciones para llamar a Gemini en tu nombre.',
    faq4Question: '¿Cómo acompaño el uso de Gemini?',
    faq4Answer:
      'Acompaña el uso, los límites y cualquier cobro del lado de Google directamente en Google AI Studio y en tu cuenta de Google. Script Master no cambia ni intermedia esas reglas.',
    faq5Question: '¿Puedo contribuir al proyecto?',
    faq5Answer:
      '¡Sí! Script Master es open source. Puedes contribuir con código, reportar bugs, sugerir funcionalidades y mejorar la documentación. Accede al repositorio para empezar: https://github.com/Just-mpm/Script-Master-Open-Source',
  },
} as const;

type ByokFaqStrings = (typeof byokFaqStrings)[Locale];

// ── Builder ───────────────────────────────────────────────────────────

/** Monta o array de FAQ a partir das strings localizadas */
function buildByokFaq(strings: ByokFaqStrings): ByokFaqItem[] {
  return [
    { question: strings.faq0Question, answer: strings.faq0Answer },
    { question: strings.faq1Question, answer: strings.faq1Answer },
    { question: strings.faq2Question, answer: strings.faq2Answer },
    { question: strings.faq3Question, answer: strings.faq3Answer },
    { question: strings.faq4Question, answer: strings.faq4Answer },
    { question: strings.faq5Question, answer: strings.faq5Answer },
  ];
}

// ── Função locale-aware ───────────────────────────────────────────────

/**
 * Retorna as perguntas frequentes sobre BYOK e open source no idioma solicitado.
 * Fallback para pt-BR se o locale não for reconhecido.
 */
export function getLocalizedByokFaq(locale: Locale): ByokFaqItem[] {
  const strings = byokFaqStrings[locale] ?? byokFaqStrings['pt-BR'];
  return buildByokFaq(strings);
}

// ── Dados (backward compat) ──────────────────────────────────────────

/**
 * Perguntas frequentes sobre BYOK e open source — fonte única (usado em OpenSourcePage e FaqPage).
 * Manter aqui evita duplicação e garante consistência entre as duas páginas.
 */
export const BYOK_FAQ_ITEMS: readonly ByokFaqItem[] = getLocalizedByokFaq('pt-BR');
