import { Voice } from './types';

export const MAX_CHARS = 50000;
export const CHUNK_LIMIT = 500;

export const VOICES: Voice[] = [
  { id: 'Aoede', name: 'Aoede', styleKey: 'casual' },
  { id: 'Zephyr', name: 'Zephyr', styleKey: 'bright' },
  { id: 'Puck', name: 'Puck', styleKey: 'animated' },
  { id: 'Charon', name: 'Charon', styleKey: 'informative' },
  { id: 'Kore', name: 'Kore', styleKey: 'firm' },
  { id: 'Fenrir', name: 'Fenrir', styleKey: 'enthusiastic' },
  { id: 'Leda', name: 'Leda', styleKey: 'young' },
  { id: 'Orus', name: 'Orus', styleKey: 'firm' },
  { id: 'Callirrhoe', name: 'Callirrhoe', styleKey: 'calm' },
  { id: 'Autonoe', name: 'Autonoe', styleKey: 'bright' },
  { id: 'Enceladus', name: 'Enceladus', styleKey: 'airy' },
  { id: 'Iapetus', name: 'Iapetus', styleKey: 'clear' },
  { id: 'Umbriel', name: 'Umbriel', styleKey: 'calm' },
  { id: 'Algieba', name: 'Algieba', styleKey: 'soft' },
  { id: 'Despina', name: 'Despina', styleKey: 'soft' },
  { id: 'Erinome', name: 'Erinome', styleKey: 'clear' },
  { id: 'Algenib', name: 'Algenib', styleKey: 'husky' },
  { id: 'Rasalgethi', name: 'Rasalgethi', styleKey: 'informative' },
  { id: 'Laomedeia', name: 'Laomedeia', styleKey: 'animated' },
  { id: 'Achernar', name: 'Achernar', styleKey: 'soft' },
  { id: 'Alnilam', name: 'Alnilam', styleKey: 'firm' },
  { id: 'Schedar', name: 'Schedar', styleKey: 'balanced' },
  { id: 'Gacrux', name: 'Gacrux', styleKey: 'mature' },
  { id: 'Pulcherrima', name: 'Pulcherrima', styleKey: 'direct' },
  { id: 'Achird', name: 'Achird', styleKey: 'friendly' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi', styleKey: 'casual' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', styleKey: 'gentle' },
  { id: 'Sadachbia', name: 'Sadachbia', styleKey: 'vibrant' },
  { id: 'Sadaltager', name: 'Sadaltager', styleKey: 'expert' },
  { id: 'Sulafat', name: 'Sulafat', styleKey: 'welcoming' },
];

export const PACE_INSTRUCTIONS: Record<string, string> = {
  'very_slow': 'Fale em um ritmo muito lento e deliberado consistentemente.',
  'slow': 'Fale em um ritmo lento e relaxado consistentemente.',
  'normal': '',
  'fast': 'Fale em um ritmo rápido e energético consistentemente.',
  'very_fast': 'Fale em um ritmo muito rápido e veloz consistentemente.'
};
