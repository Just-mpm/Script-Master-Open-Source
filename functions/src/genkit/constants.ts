// ---------------------------------------------------------------------------
// Constantes compartilhadas entre flows
// ---------------------------------------------------------------------------
//
// Centraliza constantes de voz, ritmo, emoção e limites para evitar
// duplicação entre assistant.ts, inline-assistant.ts, audio.ts e chunking.ts.
// ---------------------------------------------------------------------------

/** Vozes disponíveis no Gemini TTS */
export const VOICES: Array<{ id: string; name: string; style: string }> = [
  { id: 'Aoede', name: 'Aoede', style: 'Descontraída' },
  { id: 'Zephyr', name: 'Zephyr', style: 'Brilhante' },
  { id: 'Puck', name: 'Puck', style: 'Animada' },
  { id: 'Charon', name: 'Charon', style: 'Informativa' },
  { id: 'Kore', name: 'Kore', style: 'Firme' },
  { id: 'Fenrir', name: 'Fenrir', style: 'Entusiasmada' },
  { id: 'Leda', name: 'Leda', style: 'Jovem' },
  { id: 'Orus', name: 'Orus', style: 'Firme' },
  { id: 'Callirrhoe', name: 'Callirrhoe', style: 'Tranquila' },
  { id: 'Autonoe', name: 'Autonoe', style: 'Brilhante' },
  { id: 'Enceladus', name: 'Enceladus', style: 'Suave/Aérea' },
  { id: 'Iapetus', name: 'Iapetus', style: 'Clara' },
  { id: 'Umbriel', name: 'Umbriel', style: 'Tranquila' },
  { id: 'Algieba', name: 'Algieba', style: 'Suave' },
  { id: 'Despina', name: 'Despina', style: 'Suave' },
  { id: 'Erinome', name: 'Erinome', style: 'Clara' },
  { id: 'Algenib', name: 'Algenib', style: 'Rouca' },
  { id: 'Rasalgethi', name: 'Rasalgethi', style: 'Informativa' },
  { id: 'Laomedeia', name: 'Laomedeia', style: 'Animada' },
  { id: 'Achernar', name: 'Achernar', style: 'Macia' },
  { id: 'Alnilam', name: 'Alnilam', style: 'Firme' },
  { id: 'Schedar', name: 'Schedar', style: 'Equilibrada' },
  { id: 'Gacrux', name: 'Gacrux', style: 'Madura' },
  { id: 'Pulcherrima', name: 'Pulcherrima', style: 'Direta' },
  { id: 'Achird', name: 'Achird', style: 'Amigável' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi', style: 'Casual' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', style: 'Gentil' },
  { id: 'Sadachbia', name: 'Sadachbia', style: 'Vibrante' },
  { id: 'Sadaltager', name: 'Sadaltager', style: 'Especialista' },
  { id: 'Sulafat', name: 'Sulafat', style: 'Acolhedora' },
];

/** Descrições de ritmo para o prompt do sistema (inglês, idioma recomendado) */
export const PACE_DESCRIPTIONS: Record<string, string> = {
  very_slow: 'Very slow and deliberate',
  slow: 'Slow and relaxed',
  normal: 'Normal',
  fast: 'Fast and energetic',
  very_fast: 'Very fast and rapid',
};

/** Instruções de ritmo (pace) — inglês (idioma recomendado para prompts TTS) */
export const PACE_INSTRUCTIONS: Record<string, string> = {
  'very_slow': 'Speak at a very slow, deliberate pace consistently.',
  'slow': 'Speak at a slow, relaxed pace consistently.',
  'normal': '',
  'fast': 'Speak at a fast, energetic pace consistently.',
  'very_fast': 'Speak at a very fast, rapid pace consistently.',
};

/** Instruções de emoção — inglês (idioma recomendado para prompts TTS) */
export const EMOTION_INSTRUCTIONS: Record<string, string> = {
  'neutral': '',
  'happy': 'Happy and enthusiastic tone, like sharing good news.',
  'sad': 'Melancholic and contemplative tone, with reflective pauses.',
  'angry': 'Firm and irritated tone, with emphasis on key words.',
  'calm': 'Serene and reassuring tone, with a steady pace.',
  'energetic': 'Vibrant and dynamic tone, with varied intonation.',
  'dramatic': 'Intense and dramatic tone, with volume and pace variation.',
  'friendly': 'Warm and welcoming tone, like a conversation between friends.',
};

/** Limite de caracteres por chunk para TTS */
export const CHUNK_LIMIT = 500;

/**
 * Mapeamento de emoção para Audio Tags inline.
 *
 * O Gemini TTS interpreta linguagem natural — não há lista fixa de tags.
 * Tags como [softly], [warmly], [calmly] são válidas porque o modelo
 * entende descritores em inglês.
 *
 * Referência: https://ai.google.dev/gemini-api/docs/speech-generation#transcript-tags
 * "There is no exhaustive list on what tags do and don't work"
 */
export const EMOTION_TO_AUDIO_TAGS: Record<string, string> = {
  'neutral': '',
  'happy': '[excitedly]',
  'sad': '[softly]',
  'angry': '[firmly]',
  'calm': '[calmly]',
  'energetic': '[energetically]',
  'dramatic': '[dramatically]',
  'friendly': '[warmly]',
};

/**
 * Mapeamento de ritmo (pace) para Audio Tags inline.
 *
 * O Gemini TTS interpreta linguagem natural — tags como [slowly] e [quickly]
 * são válidas e produzem resultado diferente de [very slow] e [very fast].
 *
 * Referência: https://ai.google.dev/gemini-api/docs/speech-generation#transcript-tags
 * "There is no exhaustive list on what tags do and don't work"
 */
export const PACE_TO_AUDIO_TAG: Record<string, string> = {
  'very_slow': '[very slow]',
  'slow': '[slowly]',
  'normal': '',
  'fast': '[quickly]',
  'very_fast': '[very fast]',
};

/**
 * Tag de continuidade — DESABILITADA.
 *
 * Tags inline como [continuing] não são documentadas pelo Gemini TTS
 * e podem confundir o modelo. A continuidade é garantida por:
 * 1. continuityContext textual: "(Part 2 of 5 — maintain the same tone)"
 * 2. sampleContext: última frase do chunk anterior como âncora
 */
export const CONTINUITY_AUDIO_TAG = '';

/**
 * Número máximo de tentativas para gerar áudio de um chunk.
 * O Gemini TTS ocasionalmente retorna text tokens em vez de audio tokens (erro 500).
 * Retry automático mitiga esse comportamento aleatório.
 */
export const TTS_MAX_RETRIES = 2;

/**
 * Duração mínima esperada (em segundos) para um chunk de áudio gerado.
 * Chunks com duração abaixo disso provavelmente tiveram problema na geração.
 */
export const MIN_CHUNK_DURATION_SECONDS = 1.5;

/**
 * Tamanho mínimo de um chunk (em caracteres) para evitar qualidade degradada.
 * Chunks muito curtos (< 80 chars) tendem a ter prosódia ruim no TTS.
 */
export const MIN_CHUNK_SIZE = 80;

/**
 * Tamanho mínimo (em bytes) dos dados PCM brutos de um chunk TTS.
 * Chunks abaixo disso provavelmente são corrompidos ou incompletos
 * (ex: Gemini retornou text tokens em vez de audio tokens).
 */
export const MIN_TTS_PCM_BYTES = 1024;
