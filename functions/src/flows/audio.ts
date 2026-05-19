// ---------------------------------------------------------------------------
// Flow de geração de áudio — TTS com Gemini via Genkit
// ---------------------------------------------------------------------------
//
// Substitui a lógica client-side do useAudioGenerator.ts.
//
// Pipeline:
//   1. Valida autenticação (isSignedIn + App Check)
//   2. Reserva créditos via withCreditMetering() helper
//   3. Divide roteiro em chunks (Gemini ou fallback programático)
//   4. Gera áudio PCM para cada chunk (gemini-2.5-flash-preview-tts)
//   5. Concatena PCM, cria header WAV (24kHz mono 16-bit)
//   6. Se WAV > 8MB: faz upload para Firebase Storage e retorna URL signed
//      Se WAV ≤ 8MB: retorna base64 diretamente na resposta
//   7. Confirma ou reverte créditos conforme resultado
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//   - Região: southamerica-east1
// ---------------------------------------------------------------------------

import { z } from 'genkit';
import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';
import { ai } from '../genkit/genkit.js';
import { AudioInputSchema, AudioOutputSchema } from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  isRequestIdValid,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';
import { CHUNK_LIMIT, PACE_INSTRUCTIONS, EMOTION_INSTRUCTIONS } from '../genkit/constants.js';
import { splitTextProgrammatically } from '../genkit/utils/chunking.js';

/** Taxa de amostragem do áudio gerado (24kHz) */
const SAMPLE_RATE = 24000;

/** Modelo TTS usado no Genkit */
const TTS_MODEL = 'googleai/gemini-3.1-flash-tts-preview';

/** Modelo para chunking de scripts longos */
const CHUNKING_MODEL = 'googleai/gemini-2.5-flash-lite';

// ---------------------------------------------------------------------------
// Helpers de chunking
// ---------------------------------------------------------------------------

/**
 * Divide um script longo em chunks usando o Gemini para quebras inteligentes.
 * Se o Gemini falhar, usa fallback programático.
 */
async function chunkScript(script: string, limit: number): Promise<string[]> {
  if (script.length <= limit) {
    return [script];
  }

  const chunkingPrompt = [
    `Divida o seguinte roteiro em partes sequenciais.`,
    `É CRÍTICO que cada parte tenha no MÁXIMO ${limit} caracteres.`,
    'Faça as quebras em pausas lógicas (pontos finais, fim de parágrafo).',
    'NÃO altere, adicione ou remova nenhuma palavra do texto original, apenas divida-o.',
    '',
    `Roteiro:\n${script}`,
  ].join('\n');

  try {
    const response = await ai.generate({
      model: CHUNKING_MODEL,
      prompt: chunkingPrompt,
      output: {
        schema: z.array(z.string()),
      },
    });

    const chunks = response.output as string[] | undefined;
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      throw new Error('Resposta de chunking inválida ou vazia');
    }

    // Garante que nenhum chunk individual exceda o limite
    const validatedChunks: string[] = [];
    for (const c of chunks) {
      if (c.length > limit) {
        validatedChunks.push(...splitTextProgrammatically(c, limit));
      } else {
        validatedChunks.push(c);
      }
    }

    return validatedChunks.filter((c) => c.trim().length > 0);
  } catch {
    // Fallback programático quando o Gemini falha
    console.warn('[audio] Chunking via Gemini falhou, usando fallback programático');
    return splitTextProgrammatically(script, limit);
  }
}

// ---------------------------------------------------------------------------
// Helpers de áudio (WAV)
// ---------------------------------------------------------------------------

/**
 * Cria um buffer WAV a partir de dados PCM brutos.
 * Formato: 24kHz mono 16-bit PCM.
 * Réplica da lógica de createWavBlob do frontend, adaptada para Node.js/Buffer.
 */
function createWavBuffer(pcmData: Buffer, sampleRate: number): Buffer {
  const dataLength = pcmData.length;
  const header = Buffer.alloc(44);

  // RIFF header
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8, 'ascii');

  // fmt subchunk
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(1, 22); // NumChannels (1 = mono)
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  header.writeUInt16LE(2, 32); // BlockAlign (NumChannels * BitsPerSample/8)
  header.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmData]);
}

/**
 * Extrai os dados PCM do Data URL retornado pelo Genkit.
 * O Genkit retorna o áudio como Data URL (data:audio/wav;base64,... ou data:;base64,...).
 */
function extractPcmFromDataUrl(dataUrl: string): Buffer {
  // Remove o prefixo do Data URL para obter apenas o base64
  const base64Data = dataUrl.replace(/^data:[^;]*;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const audio = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    enforceAppCheck: true,
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'audio',
      inputSchema: AudioInputSchema,
      outputSchema: AudioOutputSchema,
    },
    async (input) => {
      const auth = ai.currentContext()?.auth;
      const uid = auth?.uid;

      if (!uid) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado');
      }

      // Guard do beta aberto — bloqueia acesso quando beta fechado
      if (process.env.OPEN_BETA_ENABLED !== 'true') {
        throw new HttpsError('unavailable', 'O beta aberto está temporariamente desabilitado. Tente novamente em breve.');
      }

      const db = getFirestore();

      // Valida requestId enviado pelo cliente (deve ser UUID v4)
      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }
      const requestId = input.requestId ?? randomUUID();

      // ------------------------------------------------------------------
      // 1. Reserva créditos via helper withCreditMetering()
      //
      // Usa o helper manual em vez do middleware porque o fluxo de áudio
      // tem múltiplas chamadas internas a ai.generate() (chunking + TTS
      // por chunk) que NÃO devem disparar metering individual.
      // ------------------------------------------------------------------
      const creditMeter = await withCreditMetering(
        db,
        uid,
        requestId,
        'audio',
        { script: input.script },
      );

      // ------------------------------------------------------------------
      // 2. Divide o script em chunks
      // ------------------------------------------------------------------
      let chunks: string[];
      try {
        chunks = await chunkScript(input.script, CHUNK_LIMIT);
      } catch (chunkErr) {
        console.error(`[audio] Falha no chunking: ${chunkErr instanceof Error ? chunkErr.message : 'desconhecido'}`);
        await creditMeter.revert('CHUNKING_FAILED');
        throw new HttpsError(
          'internal',
          'Falha ao dividir o roteiro em partes. Tente novamente.',
        );
      }

      // ------------------------------------------------------------------
      // 3. Prepara o prompt base (instruções comuns)
      // ------------------------------------------------------------------
      const {
        voiceConfig,
        isMultiSpeaker = false,
        multiSpeakerConfig,
        audioProfile,
        scene,
        styleNotes,
      } = input;

      const pace = voiceConfig.pace ?? 'normal';
      const emotion = voiceConfig.emotion ?? 'neutral';
      const emotionIntensity = voiceConfig.emotionIntensity ?? 0.5;

      const paceNote = PACE_INSTRUCTIONS[pace] ?? '';
      const combinedNotes = [styleNotes, paceNote].filter(Boolean).join('\n* ');

      // Instrução de emoção
      const emotionInstructionText = EMOTION_INSTRUCTIONS[emotion] ?? '';
      const emotionInstruction = emotion !== 'neutral' && emotionInstructionText
        ? `### TOM EMOCIONAL\n* ${emotionInstructionText} Intensidade: ${(emotionIntensity * 100).toFixed(0)}%.`
        : '';

      // ------------------------------------------------------------------
      // 4. Configura speechConfig (single ou multi-speaker)
      // ------------------------------------------------------------------
      const speechConfig = isMultiSpeaker
        ? {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: multiSpeakerConfig?.speakerAName || 'Speaker A',
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceConfig.voiceId },
                  },
                },
                {
                  speaker: multiSpeakerConfig?.speakerBName || 'Speaker B',
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: multiSpeakerConfig?.speakerBVoice || 'Puck',
                    },
                  },
                },
              ],
            },
          }
        : {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceConfig.voiceId },
            },
          };

      // ------------------------------------------------------------------
      // 5. Gera áudio para cada chunk
      // ------------------------------------------------------------------
      const pcmBuffers: Buffer[] = [];
      let totalPcmLength = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Contexto de continuidade para chunks após o primeiro
        const continuityContext = i > 0
          ? `[CRÍTICO] TAKES CONTÍNUOS: Você está renderizando a parte ${i + 1} de um único roteiro. MANTENHA estritamente o mesmo tom, humor, energia, velocidade e volume da parte anterior. Evite entonações de início ou fim de frase onde não houver pontuação.`
          : '';

        // Contexto de múltiplos locutores
        const multiCtx = isMultiSpeaker
          ? `## MÚLTIPLOS LOCUTORES\nAtenção: a transcrição é um diálogo. Fale o texto de "${multiSpeakerConfig?.speakerAName || 'Speaker A'}" com a Voz A e o texto de "${multiSpeakerConfig?.speakerBName || 'Speaker B'}" com a Voz B.`
          : '';

        // Monta o prompt completo (instruções + transcrição)
        const finalPrompt = [
          'Gere a fala para a seguinte transcrição, interpretando a persona e as notas de direção fornecidas. NÃO leia o perfil, a cena ou as notas em voz alta. APENAS fale a transcrição.',
          continuityContext,
          multiCtx,
          audioProfile ? `# PERFIL DE ÁUDIO: ${audioProfile}` : '',
          scene ? `## A CENA: ${scene}` : '',
          emotionInstruction,
          combinedNotes ? `### NOTAS DE DIREÇÃO\n* ${combinedNotes}` : '',
          `#### TRANSCRIÇÃO\n${chunk}`,
        ].filter(Boolean).join('\n\n');

        try {
          const response = await ai.generate({
            model: TTS_MODEL,
            prompt: finalPrompt,
            config: {
              speechConfig,
            } as Record<string, unknown>,
          });

          const mediaUrl = response.media?.url;
          if (!mediaUrl) {
            throw new Error('Resposta TTS sem dados de áudio (media.url ausente)');
          }

          const pcmBuffer = extractPcmFromDataUrl(mediaUrl);
          pcmBuffers.push(pcmBuffer);
          totalPcmLength += pcmBuffer.length;

        } catch (chunkErr) {
          const errorMessage = chunkErr instanceof Error ? chunkErr.message : 'Erro desconhecido';
          console.error(`[audio] Falha no chunk ${i + 1}/${chunks.length}: ${errorMessage}`);

          // Reverte créditos em caso de falha
          await creditMeter.revert('TTS_CHUNK_FAILED');

          throw new HttpsError(
            'internal',
            `Falha ao gerar áudio (parte ${i + 1} de ${chunks.length}). Tente novamente.`,
          );
        }
      }

      // ------------------------------------------------------------------
      // 6. Concatena PCM e cria WAV
      // ------------------------------------------------------------------
      const combinedPcm = Buffer.concat(pcmBuffers);
      const wavBuffer = createWavBuffer(combinedPcm, SAMPLE_RATE);

      // Calcula duração: PCM 24kHz 16-bit mono = 48000 bytes por segundo
      const durationInSeconds = totalPcmLength / (SAMPLE_RATE * 2); // 2 bytes por amostra (16-bit)

      // ------------------------------------------------------------------
      // 7. Decide entre base64 (resposta direta) ou Storage (URL signed)
      //
      // httpsCallable do Firebase Functions tem limite de ~10MB de resposta.
      // Áudio base64 WAV 24kHz de 5 minutos ≈ 19MB. Para evitar quebrar,
      // fazemos upload para Storage e retornamos uma URL signed.
      // ------------------------------------------------------------------
      const LARGE_AUDIO_THRESHOLD = 8 * 1024 * 1024; // 8MB seguro (< 10MB limite)
      let audioBase64: string | undefined;
      let audioUrl: string | undefined;

      if (wavBuffer.length > LARGE_AUDIO_THRESHOLD) {
        const bucket = getStorage().bucket();
        const storagePath = `users/${uid}/audio/${requestId}.wav`;
        const file = bucket.file(storagePath);

        await file.save(wavBuffer, {
          metadata: { contentType: 'audio/wav' },
          resumable: false,
        });

        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 1000 * 60 * 60 * 24, // 24 horas
        });

        audioUrl = signedUrl;
        console.log(
          `[audio] Áudio grande — upload para Storage: ` +
          `path=${storagePath} size=${(wavBuffer.length / 1024 / 1024).toFixed(1)}MB`,
        );
      } else {
        audioBase64 = wavBuffer.toString('base64');
      }

      // ------------------------------------------------------------------
      // 8. Confirma créditos com o custo real
      // ------------------------------------------------------------------
      const finalCredits = calculateCreditCost({
        operationType: 'audio',
        inputChars: input.script.length,
      });

      await creditMeter.confirm({
        finalCredits,
        outputSize: totalPcmLength,
        model: TTS_MODEL,
      });

      console.log(
        `[audio] Geração concluída: uid=${uid} chunks=${chunks.length} ` +
        `duração=${durationInSeconds.toFixed(1)}s pcm=${totalPcmLength}bytes ` +
        `créditos=${finalCredits} viaStorage=${audioUrl ? 'sim' : 'não'}`,
      );

      return {
        audioBase64,
        audioUrl,
        mimeType: 'audio/wav',
        durationInSeconds: Math.round(durationInSeconds * 100) / 100,
        chunks: chunks.length,
      };
    },
  ),
);
