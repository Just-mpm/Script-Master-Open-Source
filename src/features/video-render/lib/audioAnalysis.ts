/**
 * Análise de áudio para o plano de edição.
 * Usa Web Audio API para detectar picos de energia, silêncios e transições de volume.
 * Dados servem como contexto para a IA sugerir cortes em momentos sonoros relevantes.
 */

/** Ponto de interesse detectado no áudio */
export interface AudioAnalysisPoint {
  /** Tempo em segundos */
  time: number;
  /** Tipo de evento */
  type: 'peak' | 'silence' | 'volume-rise' | 'volume-drop';
  /** Intensidade relativa (0-1) */
  intensity: number;
}

/** Resultado da análise completa */
export interface AudioAnalysisResult {
  /** Pontos de interesse ordenados por tempo */
  points: AudioAnalysisPoint[];
  /** Nível médio de energia (0-1) */
  averageEnergy: number;
  /** Duração total em segundos */
  duration: number;
  /** Trecho formatado para inclusão no prompt da IA */
  toPromptText: string;
}

/** Verifica se OfflineAudioContext está disponível no runtime */
function isOfflineAudioAvailable(): boolean {
  return typeof OfflineAudioContext !== 'undefined';
}

/**
 * Analisa um ArrayBuffer de áudio WAV e retorna pontos de interesse.
 * Processa em janelas de ~50ms.
 *
 * Se o OfflineAudioContext não estiver disponível (browser antigo/SSR),
 * retorna resultado vazio sem erro.
 */
export async function analyzeAudioForEditing(
  audioData: ArrayBuffer,
  sampleRate = 24000,
): Promise<AudioAnalysisResult> {
  const emptyResult: AudioAnalysisResult = {
    points: [],
    averageEnergy: 0,
    duration: 0,
    toPromptText: '',
  };

  if (!isOfflineAudioAvailable()) {
    return emptyResult;
  }

  try {
    // Decodifica o buffer de áudio via OfflineAudioContext
    const numSamples = Math.floor(audioData.byteLength / 2); // 16-bit PCM
    const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);
    const audioBuffer = await offlineCtx.decodeAudioData(audioData.slice(0));
    const channelData = audioBuffer.getChannelData(0);

    return computeEnergyAnalysis(channelData, audioBuffer.sampleRate);
  } catch (err) {
    // Falha na decodificação (formato inválido, dados truncados, etc.)
    // Retorna resultado vazio — a geração do plano continua sem análise
    console.warn('[audioAnalysis] Falha na decodificação do áudio, continuando sem análise:', err);
    return emptyResult;
  }
}

// ─── Cálculo de energia por janela ────────────────────────────────

interface EnergyWindow {
  time: number;
  energy: number;
}

/** Thresholds de detecção */
const PEAK_THRESHOLD = 0.7;
const SILENCE_THRESHOLD = 0.05;
const TRANSITION_THRESHOLD = 0.3;

/** Distância mínima em segundos entre eventos do mesmo tipo */
const PEAK_MIN_DISTANCE = 0.3;
const SILENCE_MIN_DISTANCE = 0.5;
const TRANSITION_MIN_DISTANCE = 0.5;

/** Número máximo de pontos incluídos no prompt */
const MAX_PROMPT_POINTS = 20;

/**
 * Calcula RMS por janela (~50ms) e detecta picos, silêncios e transições.
 * Função pura, sem dependência de Web Audio API.
 */
function computeEnergyAnalysis(channelData: Float32Array, sampleRate: number): AudioAnalysisResult {
  // Tamanho da janela de análise (~50ms) e step de 50% para overlap
  const windowSize = Math.round(sampleRate * 0.05);
  const hopSize = Math.round(windowSize / 2);

  // Calcula RMS por janela
  const energyLevels: EnergyWindow[] = [];
  for (let i = 0; i <= channelData.length - windowSize; i += hopSize) {
    let sumSquares = 0;
    for (let j = i; j < i + windowSize; j++) {
      sumSquares += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    energyLevels.push({ time: i / sampleRate, energy: rms });
  }

  if (energyLevels.length === 0) {
    const duration = channelData.length / sampleRate;
    return { points: [], averageEnergy: 0, duration, toPromptText: '' };
  }

  // Normaliza RMS para 0-1
  const maxRms = Math.max(...energyLevels.map(e => e.energy), 0.001);
  const normalized: EnergyWindow[] = energyLevels.map(e => ({
    time: e.time,
    energy: e.energy / maxRms,
  }));

  // Energia média
  const averageEnergy = normalized.reduce((sum, e) => sum + e.energy, 0) / normalized.length;

  // Detecta pontos de interesse
  const points = detectPoints(normalized);

  const duration = channelData.length / sampleRate;
  const toPromptText = buildPromptText(points, averageEnergy);

  return { points, averageEnergy, duration, toPromptText };
}

/**
 * Percorre as janelas normalizadas detectando picos, silêncios e transições.
 * Aplica distância mínima entre eventos do mesmo tipo para evitar cluster.
 */
function detectPoints(windows: EnergyWindow[]): AudioAnalysisPoint[] {
  const points: AudioAnalysisPoint[] = [];

  // Rastreamento do último evento de cada tipo para controle de distância
  const lastOccurrence: Partial<Record<AudioAnalysisPoint['type'], number>> = {};

  for (let i = 1; i < windows.length; i++) {
    const prev = windows[i - 1];
    const curr = windows[i];
    const diff = curr.energy - prev.energy;

    // Pico de energia: cruza o threshold de cima
    if (curr.energy > PEAK_THRESHOLD && prev.energy <= PEAK_THRESHOLD) {
      if (canAddPoint(lastOccurrence, 'peak', curr.time, PEAK_MIN_DISTANCE)) {
        points.push({ time: curr.time, type: 'peak', intensity: curr.energy });
        lastOccurrence['peak'] = curr.time;
      }
    }

    // Silêncio: cruza o threshold de baixo
    if (curr.energy < SILENCE_THRESHOLD && prev.energy >= SILENCE_THRESHOLD) {
      if (canAddPoint(lastOccurrence, 'silence', curr.time, SILENCE_MIN_DISTANCE)) {
        points.push({ time: curr.time, type: 'silence', intensity: curr.energy });
        lastOccurrence['silence'] = curr.time;
      }
    }

    // Subida brusca de volume
    if (diff > TRANSITION_THRESHOLD && prev.energy < 0.5) {
      if (canAddPoint(lastOccurrence, 'volume-rise', curr.time, TRANSITION_MIN_DISTANCE)) {
        points.push({ time: curr.time, type: 'volume-rise', intensity: diff });
        lastOccurrence['volume-rise'] = curr.time;
      }
    }

    // Queda brusca de volume
    if (diff < -TRANSITION_THRESHOLD && curr.energy < 0.5) {
      if (canAddPoint(lastOccurrence, 'volume-drop', curr.time, TRANSITION_MIN_DISTANCE)) {
        points.push({ time: curr.time, type: 'volume-drop', intensity: Math.abs(diff) });
        lastOccurrence['volume-drop'] = curr.time;
      }
    }
  }

  // Já estão em ordem crescente de tempo (iteração sequencial)
  return points;
}

/**
 * Verifica se o tempo mínimo desde o último evento do mesmo tipo foi respeitado.
 */
function canAddPoint(
  lastOccurrence: Partial<Record<AudioAnalysisPoint['type'], number>>,
  type: AudioAnalysisPoint['type'],
  time: number,
  minDistance: number,
): boolean {
  const last = lastOccurrence[type];
  return last === undefined || (time - last) > minDistance;
}

// ─── Formatação para prompt ───────────────────────────────────────

const POINT_LABELS: Record<AudioAnalysisPoint['type'], string> = {
  peak: 'Pico de energia',
  silence: 'Silencio',
  'volume-rise': 'Subida de volume',
  'volume-drop': 'Queda de volume',
};

function buildPromptText(points: AudioAnalysisPoint[], averageEnergy: number): string {
  if (points.length === 0) {
    return `Analise de audio: energia media ${(averageEnergy * 100).toFixed(0)}%. Sem eventos marcantes detectados.`;
  }

  const lines = [
    `Analise de audio: energia media ${(averageEnergy * 100).toFixed(0)}%`,
    `Eventos detectados (${points.length}):`,
  ];

  // Pega os pontos mais relevantes e ordena por tempo
  const topPoints = [...points]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, MAX_PROMPT_POINTS)
    .sort((a, b) => a.time - b.time);

  for (const point of topPoints) {
    const label = POINT_LABELS[point.type];
    const time = formatTime(point.time);
    lines.push(`  ${time} — ${label} (${(point.intensity * 100).toFixed(0)}%)`);
  }

  lines.push('');
  lines.push('Use esses dados para alinhar transicoes e cortes com momentos de impacto sonoro.');

  return lines.join('\n');
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(1);
  return `${min}:${sec.padStart(4, '0')}`;
}
