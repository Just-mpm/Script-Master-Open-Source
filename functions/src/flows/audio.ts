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
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import { AudioInputSchema, AudioOutputSchema } from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  finishAiRequest,
  getCreditAvailabilitySnapshot,
  isRequestIdValid,
  startAiRequest,
  throwIfAiCancellationRequested,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';
import {
  CHUNK_LIMIT,
  PACE_INSTRUCTIONS,
  EMOTION_INSTRUCTIONS,
  EMOTION_TO_AUDIO_TAGS,
  PACE_TO_AUDIO_TAG,
  CONTINUITY_AUDIO_TAG,
  TTS_MAX_RETRIES,
  MIN_CHUNK_DURATION_SECONDS,
  MIN_TTS_PCM_BYTES,
} from '../genkit/constants.js';
import { buildChunkingInstruction, buildTtsInstruction } from '../genkit/utils/assistant-context.js';
import { splitTextProgrammatically, extractTrailingSentence, isTruncatedChunk } from '../genkit/utils/chunking.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import { createLogger } from '../genkit/utils/logger.js';

const log = createLogger('audio');

interface AudioSegment {
  text: string;
  startSec: number;
  endSec: number;
  chunkIndex: number;
}

/**
 * Chunk enriquecido com metadados de continuidade.
 * Usado para manter consistência de tom entre chunks.
 */
interface EnrichedChunk {
  text: string;
  isContinuation?: boolean;
  trailingSentence?: string;
}

/** Taxa de amostragem do áudio gerado (24kHz) */
const SAMPLE_RATE = 24000;

/** Modelo TTS usado no Genkit */
const TTS_MODEL = 'googleai/gemini-3.1-flash-tts-preview';

/** Modelo para chunking de scripts longos */
const CHUNKING_MODEL = 'googleai/gemini-3.1-flash-lite';

// ---------------------------------------------------------------------------
// Helpers de chunking
// ---------------------------------------------------------------------------

/**
 * Divide um script longo em chunks enriquecidos usando o Gemini para quebras inteligentes.
 * Retorna EnrichedChunk[] com metadados de continuidade (isContinuation, trailingSentence).
 * trailingSentence é sempre computado programaticamente via extractTrailingSentence().
 * Se o Gemini falhar, usa fallback programático com metadados básicos.
 */
async function chunkScript(script: string, limit: number): Promise<EnrichedChunk[]> {
  if (script.length <= limit) {
    return [{
      text: script,
      isContinuation: false,
      trailingSentence: extractTrailingSentence(script),
    }];
  }

  try {
    const response = await ai.generate({
      model: CHUNKING_MODEL,
      prompt: buildChunkingInstruction(script, limit),
      config: {
        temperature: 0,
      },
      output: {
        schema: z.array(z.object({
          text: z.string(),
          isContinuation: z.boolean().optional(),
        })),
      },
    });

    const items = response.output as Array<{ text: string; isContinuation?: boolean }> | undefined;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Resposta de chunking inválida ou vazia');
    }

    // Valida e re-divide chunks que excedam o limite
    const validated: EnrichedChunk[] = [];
    for (const item of items) {
      if (item.text.length > limit) {
        const subChunks = splitTextProgrammatically(item.text, limit);
        for (let j = 0; j < subChunks.length; j++) {
          validated.push({
            text: subChunks[j],
            isContinuation: j > 0 ? true : item.isContinuation,
            trailingSentence: extractTrailingSentence(subChunks[j]),
          });
        }
      } else {
        validated.push({
          text: item.text,
          isContinuation: item.isContinuation,
          trailingSentence: extractTrailingSentence(item.text),
        });
      }
    }

    return validated.filter((item) => item.text.trim().length > 0);
  } catch (err: unknown) {
    // Fallback programático quando o Gemini falha
    log.warn('Chunking via Gemini falhou, usando fallback programático', { error: String(err) });
    const fallbackChunks = splitTextProgrammatically(script, limit);
    return fallbackChunks.map((text, idx) => ({
      text,
      isContinuation: idx > 0,
      trailingSentence: extractTrailingSentence(text),
    }));
  }
}

// ---------------------------------------------------------------------------
// Helpers de áudio (WAV)
// ---------------------------------------------------------------------------

// ⚠️ DUPLICADO: Esta lógica também existe em src/lib/audio.ts (createWavBlob).
// Qualquer mudança no formato WAV deve ser sincronizada entre ambos.
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
/**
 * Extrai bytes PCM de uma Data URL de áudio.
 *
 * O Gemini TTS retorna Data URLs com MIME type multi-parâmetro:
 *   data:audio/l16; rate=24000; channels=1;base64,AAA...
 *
 * O separador entre header e payload é SEMPRE a primeira vírgula.
 */
function extractPcmFromDataUrl(dataUrl: string): Buffer {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Data URL inválida: vírgula separadora não encontrada');
  }
  const base64Data = dataUrl.substring(commaIndex + 1);
  return Buffer.from(base64Data, 'base64');
}

/**
 * Detecta se um buffer PCM contém apenas silêncio (zeros).
 *
 * O Gemini TTS às vezes retorna 1.8 MB de zeros com finishReason: stop.
 * Esta função verifica se há algum conteúdo real no áudio.
 *
 * @param pcm - Buffer PCM 16-bit mono
 * @param threshold - Fração mínima de samples não-zero (default 1%)
 * @returns true se o áudio é considerado silêncio
 */
function isSilentPcm(pcm: Buffer, threshold = 0.01): boolean {
  if (pcm.length < 2) return true;

  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const noiseFloor = 100; // ~-54 dBFS para 16-bit
  let nonZeroCount = 0;

  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > noiseFloor) {
      nonZeroCount++;
    }
  }

  return nonZeroCount / samples.length < threshold;
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const audio = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
    // Timeout longo pois roteiros com muitos chunks (+50) exigem múltiplas
    // chamadas TTS ao Gemini, cada uma podendo levar vários segundos.
    timeoutSeconds: 3600,
  },
  ai.defineFlow(
    {
      name: 'audio',
      inputSchema: AudioInputSchema,
      outputSchema: AudioOutputSchema,
    },
    async (input, flowContext) => {
      const uid = getCallableUidOrThrow(flowContext);

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
      const creditSnapshot = await getCreditAvailabilitySnapshot(db, uid);
      let requestStarted = false;
      let creditMeter: Awaited<ReturnType<typeof withCreditMetering>> | null = null;
      let creditsSettled = false;

      try {
        await startAiRequest(db, uid, requestId, 'audio');
        requestStarted = true;

        if (
          input.preflight &&
          !creditSnapshot.unlimitedCredits &&
          input.preflight.unlimited === false &&
          creditSnapshot.availableCredits < input.preflight.totalPlanned &&
          input.preflight.availableCredits >= input.preflight.totalPlanned
        ) {
          throw new HttpsError(
            'failed-precondition',
            'Seu saldo mudou depois da prévia. Revise a geração antes de continuar.',
            {
              code: 'CREDITS_CHANGED_AFTER_PREFLIGHT',
              currentAvailableCredits: creditSnapshot.availableCredits,
              expectedAvailableCredits: input.preflight.availableCredits,
              plannedTotalCredits: input.preflight.totalPlanned,
            },
          );
        }

        await throwIfAiCancellationRequested(db, uid, requestId);

        // ------------------------------------------------------------------
        // 1. Reserva créditos via helper withCreditMetering()
        //
        // Usa o helper manual em vez do middleware porque o fluxo de áudio
        // tem múltiplas chamadas internas a ai.generate() (chunking + TTS
        // por chunk) que NÃO devem disparar metering individual.
        // ------------------------------------------------------------------
        creditMeter = await withCreditMetering(
          db,
          uid,
          requestId,
          'audio',
          { script: input.script },
        );

        // ------------------------------------------------------------------
        // 2. Divide o script em chunks enriquecidos
        // ------------------------------------------------------------------
        let enrichedChunks: EnrichedChunk[];
        try {
          enrichedChunks = await chunkScript(input.script, CHUNK_LIMIT);
        } catch (chunkErr) {
          log.error('Falha no chunking', { error: chunkErr instanceof Error ? chunkErr.message : 'desconhecido' });
          await creditMeter.revert('CHUNKING_FAILED');
          creditsSettled = true;
          throw new HttpsError(
            'internal',
            'Falha ao dividir o roteiro em partes. Tente novamente.',
          );
        }
        await throwIfAiCancellationRequested(db, uid, requestId);

        // Validação de chunks (Fase 1.4) — log de chunks potencialmente truncados
        for (let v = 0; v < enrichedChunks.length; v++) {
          if (isTruncatedChunk(enrichedChunks[v].text) && v < enrichedChunks.length - 1) {
            log.warn(
              `Chunk ${v + 1}/${enrichedChunks.length} parece truncado ` +
              '(não termina com pontuação). Prosseguindo com geração.',
            );
          }
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

      // Instrução de emoção (textual, para Director's Notes)
      const emotionInstructionText = EMOTION_INSTRUCTIONS[emotion] ?? '';
      const emotionInstruction = emotion !== 'neutral' && emotionInstructionText
        ? `* ${emotionInstructionText} Intensidade: ${(emotionIntensity * 100).toFixed(0)}%.`
        : '';

      // Audio tags globais (Fase 3.1) — emoção e ritmo mapeados para tags inline
      const globalEmotionTag = EMOTION_TO_AUDIO_TAGS[emotion] ?? '';
      const globalPaceTag = PACE_TO_AUDIO_TAG[pace] ?? '';

      // Nome do locutor para Audio Profile estruturado (Fase 5.2)
      const speakerName = isMultiSpeaker
        ? (multiSpeakerConfig?.speakerAName || 'Speaker A')
        : undefined;

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
        // 5. Gera áudio para cada chunk (com retry e continuidade enriquecida)
        // ------------------------------------------------------------------
        const pcmBuffers: Buffer[] = [];
        const generatedSegments: AudioSegment[] = [];
        let totalPcmLength = 0;
        let currentStartSec = 0;

        for (let i = 0; i < enrichedChunks.length; i++) {
          await throwIfAiCancellationRequested(db, uid, requestId);
          const enrichedChunk = enrichedChunks[i];
          const chunkText = enrichedChunk.text;

        // ------------------------------------------------------------------
        // Continuidade (enxuta, em inglês — idioma recomendado)
        // ------------------------------------------------------------------
        let continuityContext = '';
        let sampleContext: string | undefined;

        if (i > 0) {
          const prevChunk = enrichedChunks[i - 1];

          // Nota curta de continuidade (em vez do bloco verboso anterior)
          continuityContext = `(Part ${i + 1} of ${enrichedChunks.length} — maintain the same tone and delivery)`;

          // Sample Context — última frase do chunk anterior como âncora (sem "não fale")
          sampleContext = prevChunk.trailingSentence;
        }

        // Audio tag para este chunk específico
        const chunkEmotionTag = i > 0 && enrichedChunk.isContinuation
          ? CONTINUITY_AUDIO_TAG
          : globalEmotionTag;

        // Contexto de múltiplos locutores (em inglês)
        const multiCtx = isMultiSpeaker
          ? `Multi-speaker:\nThis transcript is a dialogue. Speak "${multiSpeakerConfig?.speakerAName || 'Speaker A'}" lines with Voice A and "${multiSpeakerConfig?.speakerBName || 'Speaker B'}" lines with Voice B.`
          : '';

        // Monta o prompt completo com todas as melhorias
        const finalPrompt = buildTtsInstruction({
          continuityContext,
          multiSpeakerContext: multiCtx,
          audioProfile: audioProfile ?? '',
          scene: scene ?? '',
          emotionInstruction,
          directionNotes: combinedNotes,
          chunk: chunkText,
          emotionAudioTag: chunkEmotionTag || undefined,
          paceAudioTag: globalPaceTag || undefined,
          sampleContext,
          speakerName,
        });

        // ------------------------------------------------------------------
        // Retry automático (Fase 4.1)
        // O Gemini TTS ocasionalmente retorna text tokens em vez de audio tokens
        // (erro 500), áudio quase vazio (PCM muito curto) ou silêncio puro.
        // Retry até TTS_MAX_RETRIES vezes antes de falhar.
        // ------------------------------------------------------------------
        let pcmBuffer: Buffer | null = null;

        for (let attempt = 0; attempt <= TTS_MAX_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              log.info(`Retry ${attempt}/${TTS_MAX_RETRIES} para chunk ${i + 1}/${enrichedChunks.length}`);
              // Exponential backoff com jitter (500ms base, máx 5s)
              const backoffMs = Math.min(500 * Math.pow(2, attempt) + Math.random() * 500, 5000);
              await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }

            await throwIfAiCancellationRequested(db, uid, requestId);

            const response = await ai.generate({
              model: TTS_MODEL,
              prompt: finalPrompt,
              config: {
                speechConfig,
                responseModalities: ['AUDIO'],
              } as Record<string, unknown>,
            });
            await throwIfAiCancellationRequested(db, uid, requestId);

            const mediaUrl = response.media?.url;
            if (!mediaUrl) {
              throw new Error('Resposta TTS sem dados de áudio (media.url ausente — possível text token return)');
            }

            pcmBuffer = extractPcmFromDataUrl(mediaUrl);

            // Validação de PCM mínima — DENTRO do retry loop
            // Se o PCM for muito curto (< 1024 bytes), o modelo retornou áudio
            // vazio/corrompido. Retry com backoff em vez de falhar imediatamente.
            if (pcmBuffer.length < MIN_TTS_PCM_BYTES) {
              const isLastAttempt = attempt === TTS_MAX_RETRIES;
              log.warn(
                `Chunk ${i + 1}/${enrichedChunks.length} com PCM muito curto: ` +
                `${pcmBuffer.length} bytes (tentativa ${attempt + 1}/${TTS_MAX_RETRIES + 1})` +
                (isLastAttempt ? ' — esgotadas as tentativas' : ' — retentando...'),
              );

              if (isLastAttempt) break;
              pcmBuffer = null;
              continue;
            }

            // Detecção de silêncio puro — o Gemini TTS às vezes retorna
            // 1.8 MB de zeros com finishReason: stop (known issue)
            if (isSilentPcm(pcmBuffer)) {
              const isLastAttempt = attempt === TTS_MAX_RETRIES;
              log.warn(
                `Chunk ${i + 1}/${enrichedChunks.length} retornou áudio silencioso: ` +
                `${pcmBuffer.length} bytes de zeros (tentativa ${attempt + 1}/${TTS_MAX_RETRIES + 1})` +
                (isLastAttempt ? ' — esgotadas as tentativas' : ' — retentando...'),
              );

              if (isLastAttempt) break;
              pcmBuffer = null;
              continue;
            }

            // Validação de duração mínima (apenas warning, não bloqueia)
            const durationSec = pcmBuffer.length / (SAMPLE_RATE * 2);
            if (durationSec < MIN_CHUNK_DURATION_SECONDS && chunkText.length > 100) {
              log.warn(
                `Chunk ${i + 1} com duração suspeita: ${durationSec.toFixed(1)}s ` +
                `(texto: ${chunkText.length} chars). Prosseguindo.`,
              );
            }

            break; // Sucesso — sai do loop de retry
          } catch (retryErr) {
            // Propaga cancelamento do usuário imediatamente (sem retry)
            if (retryErr instanceof HttpsError && retryErr.code === 'cancelled') {
              throw retryErr;
            }

            const errMsg = retryErr instanceof Error ? retryErr.message : 'Erro desconhecido';
            log.error(
              `Falha no chunk ${i + 1}/${enrichedChunks.length} ` +
              `(tentativa ${attempt + 1}/${TTS_MAX_RETRIES + 1}): ${errMsg}`,
            );
          }
        }

        if (!pcmBuffer || pcmBuffer.length < MIN_TTS_PCM_BYTES) {
          // Todas as tentativas falharam — sem dados, PCM curto ou corrompido
          await creditMeter.revert('TTS_CHUNK_FAILED');
          creditsSettled = true;

          throw new HttpsError(
            'internal',
            `Falha ao gerar áudio (parte ${i + 1} de ${enrichedChunks.length}) após ${TTS_MAX_RETRIES + 1} tentativas. Tente novamente.`,
          );
        }

        // Detecção de silêncio puro APÓS o retry loop — o Gemini TTS pode
        // retornar silêncio em TODAS as tentativas. Se passou desapercebido
        // (isLastAttempt = true + break), rejeitamos aqui.
        if (isSilentPcm(pcmBuffer)) {
          await creditMeter.revert('TTS_SILENT_AUDIO');
          creditsSettled = true;

          throw new HttpsError(
            'internal',
            `Chunk ${i + 1}/${enrichedChunks.length} gerou áudio silencioso após ${TTS_MAX_RETRIES + 1} tentativas. Tente novamente.`,
          );
        }

        pcmBuffers.push(pcmBuffer);
        totalPcmLength += pcmBuffer.length;

        const chunkDurationSec = pcmBuffer.length / (SAMPLE_RATE * 2);
        generatedSegments.push({
          text: chunkText,
          startSec: currentStartSec,
          endSec: currentStartSec + chunkDurationSec,
          chunkIndex: i,
        });
        currentStartSec += chunkDurationSec;
        }

        // ------------------------------------------------------------------
        // 6. Concatena PCM e cria WAV
        // ------------------------------------------------------------------
        const combinedPcm = Buffer.concat(pcmBuffers);
        const wavBuffer = createWavBuffer(combinedPcm, SAMPLE_RATE);
        await throwIfAiCancellationRequested(db, uid, requestId);

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
          log.info('Áudio grande — upload para Storage', {
            path: storagePath,
            sizeMB: (wavBuffer.length / 1024 / 1024).toFixed(1),
          });
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
        creditsSettled = true;
        await finishAiRequest(db, uid, requestId, 'completed').catch((finishError: unknown) => {
          log.error('Falha ao finalizar ai_request com sucesso', {
            error: finishError instanceof Error ? finishError.message : 'desconhecido',
          });
        });

        log.info('Geração concluída', {
          uid,
          chunks: enrichedChunks.length,
          durationSec: durationInSeconds.toFixed(1),
          pcmBytes: totalPcmLength,
          credits: finalCredits,
          viaStorage: audioUrl ? 'sim' : 'não',
        });

        return {
          audioBase64,
          audioUrl,
          mimeType: 'audio/wav',
          durationInSeconds: Math.round(durationInSeconds * 100) / 100,
          chunks: enrichedChunks.length,
          segments: generatedSegments,
        };
      } catch (error) {
        const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

        if (creditMeter && !creditsSettled) {
          await creditMeter.revert(errorCode);
        }

        if (requestStarted) {
          await finishAiRequest(
            db,
            uid,
            requestId,
            error instanceof HttpsError && error.code === 'cancelled' ? 'cancelled' : 'failed',
            errorCode,
          ).catch((finishError: unknown) => {
            log.error('Falha ao finalizar ai_request com erro', {
              error: finishError instanceof Error ? finishError.message : 'desconhecido',
            });
          });
        }

        throw error;
      }
    },
  ),
);
