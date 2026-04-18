import { Voice } from './types';

export const MAX_CHARS = 50000;
export const CHUNK_LIMIT = 850;

export const VOICES: Voice[] = [
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

export const PACE_INSTRUCTIONS: Record<string, string> = {
  'very_slow': 'Fale em um ritmo muito lento e deliberado consistentemente.',
  'slow': 'Fale em um ritmo lento e relaxado consistentemente.',
  'normal': '',
  'fast': 'Fale em um ritmo rápido e energético consistentemente.',
  'very_fast': 'Fale em um ritmo muito rápido e veloz consistentemente.'
};
