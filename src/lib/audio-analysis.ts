/**
 * Detecção de silêncio no áudio para refinamento de timestamps de cena.
 *
 * Usa Web Audio API para decodificar WAV e analisar amplitude RMS,
 * identificando regiões de silêncio que marcam transições de cena.
 */

/** Parâmetros configuráveis para a detecção de silêncio */
interface SilenceDetectionParams {
  /** Tamanho da janela de análise em milissegundos (padrão: 20ms) */
  windowSizeMs: number;
  /** Threshold de RMS abaixo do qual é considerado silêncio (padrão: 0.01) */
  rmsThreshold: number;
  /** Duração mínima de silêncio em ms para considerar como transição (padrão: 400ms) */
  minSilenceDurationMs: number;
  /** Duração mínima entre cenas em ms (padrão: 2000ms) */
  minSceneDurationMs: number;
  /** Número máximo de iterações de calibração do threshold */
  maxCalibrationIterations: number;
}

const DEFAULT_PARAMS: SilenceDetectionParams = {
  windowSizeMs: 20,
  rmsThreshold: 0.01,
  minSilenceDurationMs: 400,
  minSceneDurationMs: 2000,
  maxCalibrationIterations: 3,
};

/**
 * Calcula o RMS (Root Mean Square) de uma janela de amostras de áudio.
 */
function calculateRms(samples: Float32Array, start: number, end: number): number {
  let sumSquares = 0;
  const count = end - start;
  for (let i = start; i < end; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / count);
}

/**
 * Detecta regiões de silêncio em dados de canal de áudio (Float32Array).
 *
 * Retorna array de timestamps em segundos correspondentes ao INÍCIO
 * de cada região de fala após um silêncio detectado.
 */
function findSilenceRegions(
  channelData: Float32Array,
  sampleRate: number,
  params: SilenceDetectionParams,
): number[] {
  const windowSizeSamples = Math.floor((params.windowSizeMs / 1000) * sampleRate);
  const minSilenceSamples = Math.floor((params.minSilenceDurationMs / 1000) * sampleRate);
  const minSceneSamples = Math.floor((params.minSceneDurationMs / 1000) * sampleRate);

  // Calcula RMS para cada janela
  const rmsValues: number[] = [];
  for (let offset = 0; offset < channelData.length; offset += windowSizeSamples) {
    const end = Math.min(offset + windowSizeSamples, channelData.length);
    const rms = calculateRms(channelData, offset, end);
    rmsValues.push(rms);
  }

  // Detecta regiões onde RMS < threshold
  const silencePerWindow = rmsValues.map(rms => rms < params.rmsThreshold);

  // Encontra regiões contíguas de silêncio e converte para timestamps
  const boundaries: number[] = [];
  let silenceStartWindow = -1;
  let lastBoundarySample = -minSceneSamples; // Garante que a primeira cena é permitida

  for (let w = 0; w < silencePerWindow.length; w++) {
    if (silencePerWindow[w]) {
      // Início ou continuação de silêncio
      if (silenceStartWindow === -1) {
        silenceStartWindow = w;
      }
    } else {
      // Fim do silêncio — verifica se duração é suficiente
      if (silenceStartWindow !== -1) {
        const silenceStartSample = silenceStartWindow * windowSizeSamples;
        const silenceEndSample = w * windowSizeSamples;
        const silenceDuration = silenceEndSample - silenceStartSample;

        if (silenceDuration >= minSilenceSamples) {
          // O boundary é o início da fala (saída do silêncio)
          const boundarySample = silenceEndSample;
          const boundarySec = boundarySample / sampleRate;

          // Verifica distância mínima da última cena
          if (boundarySample - lastBoundarySample >= minSceneSamples) {
            boundaries.push(boundarySec);
            lastBoundarySample = boundarySample;
          }
        }

        silenceStartWindow = -1;
      }
    }
  }

  return boundaries;
}

/**
 * Detecta transições de cena no áudio baseado em regiões de silêncio.
 *
 * Algoritmo:
 * 1. Decodifica o blob WAV em AudioBuffer via decodeAudioData()
 * 2. Extrai channel data (Float32Array, valores -1.0 a 1.0)
 * 3. Divide em janelas de ~20ms
 * 4. Calcula RMS de cada janela
 * 5. Detecta regiões onde RMS < threshold por >= minSilenceDuration
 * 6. Retorna array de timestamps (início de cada região de fala após silêncio)
 *
 * @param audioBlob - Blob do áudio WAV completo
 * @param targetSceneCount - Número desejado de cenas (usado para calibrar threshold)
 * @returns Array de timestamps em segundos onde começam novas cenas
 */
export async function detectSceneBoundaries(
  audioBlob: Blob,
  targetSceneCount: number,
): Promise<number[]> {
  // Decodifica o blob WAV em AudioBuffer
  const audioContext = new AudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Extrai dados do primeiro canal (mono)
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Libera recursos do AudioContext após decodificação
  void audioContext.close();

  // Calibra o threshold para se aproximar do targetSceneCount
  const expectedBoundaries = Math.max(0, targetSceneCount - 1);
  let threshold = DEFAULT_PARAMS.rmsThreshold;
  let boundaries: number[] = [];

  for (let iteration = 0; iteration < DEFAULT_PARAMS.maxCalibrationIterations; iteration++) {
    const params: SilenceDetectionParams = { ...DEFAULT_PARAMS, rmsThreshold: threshold };
    boundaries = findSilenceRegions(channelData, sampleRate, params);

    if (expectedBoundaries <= 0) break;

    const diff = boundaries.length - expectedBoundaries;

    // Dentro de ±1 do esperado — bom o suficiente
    if (Math.abs(diff) <= 1) break;

    // Muitos silêncios detectados → subir threshold; poucos → baixar
    if (diff > 0) {
      threshold *= 1.5;
    } else {
      threshold *= 0.7;
    }

    // Limites de segurança para evitar threshold extremo
    threshold = Math.max(0.001, Math.min(0.5, threshold));
  }

  // A primeira cena SEMPRE começa no timestamp 0
  // (boundaries contém apenas as transições, que são as cenas 2, 3, ...)
  // Retorna com 0 incluído para representar o início da primeira cena
  if (boundaries.length > 0) {
    return [0, ...boundaries];
  }

  // Nenhum silêncio detectado — retorna apenas o início
  return [0];
}
