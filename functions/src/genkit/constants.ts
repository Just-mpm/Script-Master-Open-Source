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

/** Descrições de ritmo para o prompt do sistema */
export const PACE_DESCRIPTIONS: Record<string, string> = {
  very_slow: 'Muito lento e deliberado',
  slow: 'Lento e relaxado',
  normal: 'Normal',
  fast: 'Rápido e energético',
  very_fast: 'Muito rápido e veloz',
};

/** Instruções de ritmo (pace) — mapeadas para texto no prompt de TTS */
export const PACE_INSTRUCTIONS: Record<string, string> = {
  'very_slow': 'Fale em um ritmo muito lento e deliberado consistentemente.',
  'slow': 'Fale em um ritmo lento e relaxado consistentemente.',
  'normal': '',
  'fast': 'Fale em um ritmo rápido e energético consistentemente.',
  'very_fast': 'Fale em um ritmo muito rápido e veloz consistentemente.',
};

/** Instruções de emoção — mapeadas para texto no prompt de TTS */
export const EMOTION_INSTRUCTIONS: Record<string, string> = {
  'neutral': '',
  'happy': 'Tom alegre e entusiasmado, como quem compartilha boas notícias.',
  'sad': 'Tom melancólico e contemplativo, com pausas reflexivas.',
  'angry': 'Tom firme e irritado, com ênfase em palavras-chave.',
  'calm': 'Tom sereno e tranquilizador, com ritmo pausado.',
  'energetic': 'Tom vibrante e dinâmico, com muita energia e entonação variada.',
  'dramatic': 'Tom intenso e dramático, com variações de volume e ritmo.',
  'friendly': 'Tom acolhedor e caloroso, como uma conversa entre amigos.',
};

/** Limite de caracteres por chunk para TTS */
export const CHUNK_LIMIT = 500;
