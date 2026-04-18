/**
 * Script para gerar previews de voz WAV e salvar em public/voice-previews/.
 *
 * Uso: bun run generate-previews
 *
 * O script lê VITE_GEMINI_API_KEY do .env.local ou do ambiente.
 * Cada preview gera ~1s de audio. A cada chamada da API, aguarda 5s
 * para respeitar rate limits do Gemini TTS.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Tipos ---

interface Voice {
  id: string;
  name: string;
  style: string;
}

// --- Vozes (espelho de src/lib/constants.ts) ---

const VOICES: Voice[] = [
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

// --- Constantes ---

const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTE_RATE = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
const BLOCK_ALIGN = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
const DELAY_BETWEEN_REQUESTS_MS = 5000;

// --- Helpers ---

function loadApiKey(): string {
  // Prioridade: env do sistema > .env.local > .env
  if (process.env.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }

  const envLocalPath = join(projectRoot(), '.env.local');
  if (existsSync(envLocalPath)) {
    const content = readFileSync(envLocalPath, 'utf-8');
    const match = content.match(/^VITE_GEMINI_API_KEY=(.+)$/m);
    if (match?.[1]) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  throw new Error(
    'VITE_GEMINI_API_KEY não encontrada. Defina no .env.local ou no ambiente.'
  );
}

function projectRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function outputDir(): string {
  return join(projectRoot(), 'public', 'voice-previews');
}

function extractPcmFromData(data: Uint8Array): Uint8Array {
  // Verifica se já tem header WAV
  if (
    data.length >= 44 &&
    data[0] === 82 && data[1] === 73 && data[2] === 70 && data[3] === 70 &&
    data[8] === 87 && data[9] === 65 && data[10] === 86 && data[11] === 69
  ) {
    // Procura chunk 'data'
    let offset = 12;
    while (offset < data.length - 8) {
      const chunkId = String.fromCharCode(
        data[offset], data[offset + 1], data[offset + 2], data[offset + 3]
      );
      const chunkSize =
        data[offset + 4] |
        (data[offset + 5] << 8) |
        (data[offset + 6] << 16) |
        (data[offset + 7] << 24);

      if (chunkId === 'data') {
        return data.slice(offset + 8, offset + 8 + chunkSize);
      }
      offset += 8 + chunkSize;
    }
    return data.slice(44);
  }

  return data;
}

function createWavBuffer(pcmData: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  const writeString = (v: DataView, off: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(off + i, str.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, BYTE_RATE, true);
  view.setUint16(32, BLOCK_ALIGN, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmData, 44);

  return buffer;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// --- Lógica principal ---

async function generatePreview(
  apiKey: string,
  voiceId: string,
  voiceName: string
): Promise<boolean> {
  const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = await import('@google/genai');

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Esta é uma demonstração da voz ${voiceName}.`;

  // Vozes oficiais suportadas pelo Gemini TTS
  const officialVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
  const targetVoiceId = officialVoices.includes(voiceId)
    ? voiceId
    : officialVoices[Math.abs(voiceId.length % officialVoices.length)];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: targetVoiceId },
          },
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    const base64Audio = audioPart?.inlineData?.data;

    if (!base64Audio) {
      const reason = response.promptFeedback?.blockReason;
      console.error(`  [FALHA] ${voiceId}: sem audio retornado${reason ? ` (${reason})` : ''}`);
      return false;
    }

    const rawBytes = base64ToUint8Array(base64Audio);
    const pcmData = extractPcmFromData(rawBytes);
    const wavBuffer = createWavBuffer(pcmData);

    const outPath = join(outputDir(), `${voiceId}.wav`);
    writeFileSync(outPath, Buffer.from(wavBuffer));

    const sizeKB = Math.round(wavBuffer.byteLength / 1024);
    console.log(`  [OK] ${voiceId}.wav (${sizeKB} KB)`);
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [ERRO] ${voiceId}: ${message}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('=== Gerador de Previews de Voz ===\n');
  console.log(`Destino: ${outputDir()}/\n`);

  const apiKey = loadApiKey();

  if (!existsSync(outputDir())) {
    mkdirSync(outputDir(), { recursive: true });
  }

  let successes = 0;
  let failures = 0;

  for (let i = 0; i < VOICES.length; i++) {
    const voice = VOICES[i];
    console.log(`[${i + 1}/${VOICES.length}] Gerando ${voice.name}...`);

    const ok = await generatePreview(apiKey, voice.id, voice.name);
    if (ok) {
      successes++;
    } else {
      failures++;
    }

    if (i < VOICES.length - 1) {
      console.log(`  Aguardando ${DELAY_BETWEEN_REQUESTS_MS / 1000}s (rate limit)...`);
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  console.log('\n=== Resultado ===');
  console.log(`Sucesso: ${successes}/${VOICES.length}`);
  if (failures > 0) {
    console.log(`Falhas: ${failures}/${VOICES.length}`);
  }
  console.log(`\nArquivos salvos em: ${outputDir()}/`);
}

main().catch((err: unknown) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
