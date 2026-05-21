export type VoiceStyleKey =
  | 'casual'
  | 'bright'
  | 'animated'
  | 'informative'
  | 'firm'
  | 'enthusiastic'
  | 'young'
  | 'calm'
  | 'airy'
  | 'clear'
  | 'soft'
  | 'husky'
  | 'balanced'
  | 'mature'
  | 'direct'
  | 'friendly'
  | 'gentle'
  | 'vibrant'
  | 'expert'
  | 'welcoming';

export interface Voice {
  id: string;
  name: string;
  styleKey: VoiceStyleKey;
}
