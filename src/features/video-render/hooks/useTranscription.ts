import { useState, useCallback, useRef, useEffect } from 'react';
import { canUseWhisperWeb, downloadWhisperModel, resampleTo16Khz, transcribe, toCaptions } from '@remotion/whisper-web';
import { createLogger } from '../../../lib/logger';
import { createTikTokStyleCaptions } from '@remotion/captions';
import type { Caption } from '@remotion/captions';
import type { TranscriptionJson } from '@remotion/whisper-web';
import { msToFrames } from '../lib/videoUtils';
import { segmentScriptByCenes, alignScriptToSegments, parseBoldMarkdown, splitIntoWordsWithTiming } from '../lib/subtitleUtils';
import { saveTranscription, loadTranscription } from '../../../lib/db/transcriptions';
import { loadAudioSegments } from '../../../lib/db/audio-segments';
import { hashScript } from '../../../lib/crypto-utils';
import type { CaptionWord, CaptionSource } from '../types';
import type { AudioSegment } from '../../../lib/db/types';

const log = createLogger('useTranscription');

/** Parâmetros para iniciar a transcrição */
export interface TranscribeAudioParams {
  /** URL do áudio (blob ou Storage) */
  audioUrl: string;
  /** Roteiro completo do projeto */
  script: string;
  /** Cenas com timestamps em segundos */
  scenes: { timestamp: number }[];
  /** Duração total em frames */
  totalDurationFrames: number;
  /** Frames por segundo */
  fps: number;
  /** Segmentos de áudio com timing real (do useAudioGenerator) */
  audioSegments?: AudioSegment[];
}

/** Estado e ações do hook de transcrição */
export interface UseTranscriptionReturn {
  /** Legendas extraídas (null se ainda não transcreveu) */
  captions: CaptionWord[];
  /** Fonte da transcrição (null se ainda não transcreveu) */
  source: CaptionSource | null;
  /** Indica se está transcrevendo */
  isTranscribing: boolean;
  /** Progresso da transcrição (0-100) */
  transcriptionProgress: number;
  /** Texto descritivo do status atual */
  transcriptionStatusText: string;
  /** Mensagem de erro (null se não houver) */
  error: string | null;
  /** null = verificação pendente, true/false = resultado */
  whisperSupported: boolean | null;
  /** Hash do roteiro quando as legendas foram geradas (staleness detection) */
  scriptHash: string | null;
  /** Se o roteiro mudou desde a última geração de legendas */
  isStale: boolean;
  /** Inicia a transcrição do áudio */
  transcribeAudio: (params: TranscribeAudioParams) => Promise<void>;
  /** Cancela a transcrição em andamento */
  cancelTranscription: () => void;
  /** Limpa todos os dados de transcrição */
  clearTranscription: () => void;
  /** Atualiza as legendas manualmente (marca source como 'manual') */
  updateCaptions: (captions: CaptionWord[]) => void;
}

/** Debounce em ms para persistência no IndexedDB */
const PERSIST_DEBOUNCE_MS = 500;

/** Modelo Whisper usado (base = ~75MB, melhor precisão que tiny para legendas) */
const WHISPER_MODEL = 'base' as const;

/** Mapeia faixas de progresso do hook para os callbacks do whisper-web */
const PROGRESS_RANGES = {
  /** Resampling do áudio para 16kHz */
  resampleEnd: 5,
  /** Download do modelo Whisper */
  downloadStart: 5,
  downloadEnd: 30,
  /** Transcrição propriamente dita */
  transcribeStart: 30,
  transcribeEnd: 90,
  /** Pós-processamento (conversão tokens → CaptionWord) */
  finalizeEnd: 100,
} as const;

/**
 * Filtro defensivo para captions do Whisper.
 * Rejeita tokens que contenham caracteres não-textuais: colchetes, underscores,
 * parênteses, <>, etc. Só aceita tokens compostos por letras, espaços,
 * pontuação comum e números (para casos como "2024" ou "R$").
 */
const INVALID_TOKEN = /[[\]<_{}\]\\]/;

/**
 * Aceita só tokens válidos: têm pelo menos uma letra E não têm caracteres de formatação.
 */
const VALID_WORD = /[a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/;

/**
 * Mescla fragmentos de palavras consecutivos no Caption[].
 * O Whisper frequentemente divide palavras em sílabas (ex: "tra" + "vi" + "seiro").
 * Detecta isso quando um token NÃO começa com espaço — significa que é continuação
 * do token anterior.
 */
function mergeWordFragments(captions: Caption[]): Caption[] {
  if (captions.length === 0) return [];

  const merged: Caption[] = [];
  let i = 0;

  while (i < captions.length) {
    const current = captions[i];

    // Verifica se os próximos tokens são fragmentos (não começam com espaço)
    let j = i + 1;
    while (j < captions.length && !captions[j].text.startsWith(' ')) {
      j++;
    }

    if (j > i + 1) {
      // Mescla: junta textos e usa startMs do primeiro + endMs do último
      const text = captions
        .slice(i, j)
        .map((c) => c.text)
        .join('');
      merged.push({
        text,
        startMs: current.startMs,
        endMs: captions[j - 1].endMs,
        timestampMs: null,
        confidence: null,
      });
    } else {
      merged.push(current);
    }

    i = j;
  }

  return merged;
}

/**
 * Pós-processa captions do Whisper usando pipeline nativo do Remotion:
 * 1. toCaptions() mapeia tokens para Caption[] (startMs/endMs)
 * 2. Filtra tokens inválidos (só aceita palavras com letras reais)
 * 3. Mescla fragmentos de palavras (sílabas do Whisper → palavras completas)
 * 4. createTikTokStyleCaptions() agrupa palavras em frases para exibição
 * 5. Converte para CaptionWord[] com frames
 *
 * @deprecated Mantida para backward compat. Use processWhisperAlignedCaptions no fluxo principal.
 */
export function processWhisperCaptions(
  transcription: TranscriptionJson['transcription'],
  fps: number,
): CaptionWord[] {
  // Passo 1: toCaptions converte para Caption[] com startMs/endMs
  const { captions: rawCaptions } = toCaptions({ whisperWebOutput: transcription });

  // Passo 2: filtra tokens inválidos — aceita só palavras com letras reais
  const cleaned = rawCaptions.filter(
    (c) => VALID_WORD.test(c.text) && !INVALID_TOKEN.test(c.text),
  );

  if (cleaned.length === 0) return [];

  // Passo 3: mescla fragmentos de palavras (sílabas → palavras completas)
  const merged = mergeWordFragments(cleaned);

  // Passo 4: agrupa em frases para exibição (estilo TikTok)
  // combineTokensWithinMilliseconds controla quando separar frases
  const { pages } = createTikTokStyleCaptions({
    captions: merged,
    combineTokensWithinMilliseconds: 200,
  });

  // Passo 5: converte páginas para CaptionWord[] com frames
  const words: CaptionWord[] = [];
  for (const page of pages) {
    for (const token of page.tokens) {
      words.push({
        text: token.text.trim(),
        startFrame: msToFrames(token.fromMs, fps),
        endFrame: msToFrames(token.toMs, fps),
        bold: false,
      });
    }
  }

  return words;
}

/**
 * Pós-processa captions do Whisper usando TIMING como referência,
 * mas aplicando o TEXTO DO ROTEIRO (não do Whisper).
 *
 * Algoritmo:
 * 1. Whisper retorna N tokens com timestamps
 * 2. Agrupa tokens em frases via createTikTokStyleCaptions (silêncio > 200ms)
 * 3. Parseia bold do roteiro completo
 * 4. Extrai todas as palavras do roteiro com flag de bold
 * 5. Distribui as palavras do roteiro proporcionalmente nos intervalos das frases do Whisper
 * 6. Usa splitIntoWordsWithTiming dentro de cada frase para respeitar pausas de pontuação
 */
function processWhisperAlignedCaptions(
  transcription: TranscriptionJson['transcription'],
  script: string,
  fps: number,
): CaptionWord[] {
  // Passo 1-2: Pipeline Whisper → frases com timestamps
  const { captions: rawCaptions } = toCaptions({ whisperWebOutput: transcription });
  const cleaned = rawCaptions.filter(
    (c) => VALID_WORD.test(c.text) && !INVALID_TOKEN.test(c.text),
  );
  if (cleaned.length === 0) return [];

  const merged = mergeWordFragments(cleaned);
  const { pages } = createTikTokStyleCaptions({
    captions: merged,
    combineTokensWithinMilliseconds: 200,
  });
  if (pages.length === 0) return [];

  // Passo 3: Parsear bold do roteiro completo
  const boldSegments = parseBoldMarkdown(script);

  // Passo 4: Extrair todas as palavras do roteiro com flag de bold
  interface ScriptWord { text: string; bold: boolean }
  const scriptWords: ScriptWord[] = [];
  for (const seg of boldSegments) {
    const segWords = seg.text.match(/\S+/g) ?? [];
    for (const w of segWords) {
      scriptWords.push({ text: w, bold: seg.bold });
    }
  }

  if (scriptWords.length === 0) return [];

  // Passo 5: Contar palavras totais do Whisper por frase
  const phraseWordCounts = pages.map((page) => page.tokens.length);
  const totalWhisperWords = phraseWordCounts.reduce((sum, c) => sum + c, 0);
  if (totalWhisperWords === 0) return [];

  // Passo 6: Distribuir palavras do roteiro proporcionalmente nas frases do Whisper
  const allWords: CaptionWord[] = [];
  let scriptWordIdx = 0;

  for (let p = 0; p < pages.length; p++) {
    const page = pages[p];
    const phraseStartMs = page.tokens[0].fromMs;
    const phraseEndMs = page.tokens[page.tokens.length - 1].toMs;
    const startFrame = msToFrames(phraseStartMs, fps);
    const endFrame = msToFrames(phraseEndMs, fps);

    if (startFrame >= endFrame) continue;

    // Calcula quantas palavras do roteiro esta frase recebe (proporcional)
    const ratio = phraseWordCounts[p] / totalWhisperWords;
    const wordsForPhrase = p === pages.length - 1
      ? scriptWords.length - scriptWordIdx // última frase recebe o resto
      : Math.round(ratio * scriptWords.length);

    // Extrai o texto do roteiro para esta frase (preservando bold)
    const phraseText = scriptWords
      .slice(scriptWordIdx, scriptWordIdx + wordsForPhrase)
      .map((w) => w.text)
      .join(' ');

    if (phraseText.trim().length > 0) {
      // Usa splitIntoWordsWithTiming para respeitar pausas de pontuação e bold
      const phraseCaptionWords = splitIntoWordsWithTiming(phraseText, startFrame, endFrame, fps);
      allWords.push(...phraseCaptionWords);
    }

    scriptWordIdx += wordsForPhrase;
  }

  // Absorve frames residuais na última palavra
  if (allWords.length > 0) {
    const lastPhrase = pages[pages.length - 1];
    const lastFrame = msToFrames(lastPhrase.tokens[lastPhrase.tokens.length - 1].toMs, fps);
    allWords[allWords.length - 1].endFrame = Math.max(
      allWords[allWords.length - 1].endFrame,
      lastFrame,
    );
  }

  return allWords;
}

/**
 * Hook de transcrição de áudio com Whisper Web e fallback proporcional.
 * Segue o mesmo padrão de useEditingPlan: progress/statusText/error/cancel/persist.
 *
 * Fluxo:
 * 1. Whisper disponível → transcrição real com timestamps por palavra
 * 2. Whisper indisponível ou falha → legenda proporcional baseada no roteiro
 *
 * @param projectId - ID do projeto para persistência (null desativa)
 * @param script - Roteiro atual para detecção de staleness (opcional)
 * @param userId - ID do usuário autenticado para dual storage (opcional)
 */
export function useTranscription(
  projectId?: string | null,
  script?: string,
  userId?: string,
): UseTranscriptionReturn {
  const [captions, setCaptions] = useState<CaptionWord[]>([]);
  const [source, setSource] = useState<CaptionSource | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionStatusText, setTranscriptionStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [whisperSupported, setWhisperSupported] = useState<boolean | null>(null);
  const [scriptHash, setScriptHash] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const cancelRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Persistência com debounce ─────────────────────────────────

  useEffect(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }

    // Só persiste se houver captions, source, projectId e scriptHash
    if (captions.length === 0 || !source || !projectId || !scriptHash) return;

    persistTimerRef.current = setTimeout(() => {
      void saveTranscription(projectId, {
        words: captions,
        source,
        scriptHash,
      });
      persistTimerRef.current = null;
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [captions, source, projectId, scriptHash]);

  // ─── Carrega transcrição salva + verifica suporte Whisper ─────

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        // Carrega transcrição persistida (paralelo à verificação de suporte)
        const storedPromise = projectId
          ? loadTranscription(projectId)
          : Promise.resolve(null);

        // Verifica suporte Whisper em paralelo
        const whisperPromise = canUseWhisperWeb(WHISPER_MODEL)
          .then(result => result.supported)
          .catch(() => false);

        const [stored, supported] = await Promise.all([storedPromise, whisperPromise]);

        if (cancelled) return;

        setWhisperSupported(supported);

        if (stored) {
          setCaptions(stored.result.words);
          setSource(stored.result.source);
          setScriptHash(stored.result.scriptHash ?? null);
        }
      } catch (err) {
        log.warn('Erro ao carregar dados de transcrição', { error: err });
      }
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  // ─── Detecção de staleness: reavalia quando script muda ──────

  useEffect(() => {
    if (!script || script.length === 0 || !scriptHash) {
      setIsStale(false);
      return;
    }

    void hashScript(script).then((currentHash) => {
      setIsStale(currentHash !== scriptHash);
    });
  }, [script, scriptHash]);

  // ─── Transcrição ──────────────────────────────────────────────

  const transcribeAudio = useCallback(
    async (params: TranscribeAudioParams): Promise<void> => {
      cancelRef.current = false;
      setIsTranscribing(true);
      setTranscriptionProgress(0);
      setTranscriptionStatusText('Preparando transcrição...');
      setError(null);
      setIsStale(false);

      try {
        let words: CaptionWord[];
        let transcriptionSource: CaptionSource;

        // ─── Fonte 1: Segmentos TTS (timing real, sem Whisper) ──
        const segments = params.audioSegments && params.audioSegments.length > 0
          ? params.audioSegments
          : null;

        // Tenta carregar segmentos salvos se não foram fornecidos diretamente
        let resolvedSegments = segments;
        if (!resolvedSegments && projectId) {
          try {
            resolvedSegments = await loadAudioSegments(projectId, userId) ?? null;
          } catch {
            // Falha ao carregar segmentos — segue para Whisper/fallback
          }
        }

        if (resolvedSegments && resolvedSegments.length > 0) {
          // Timing real do TTS — Whisper NÃO é necessário
          setTranscriptionStatusText('Alinhando roteiro ao áudio...');
          setTranscriptionProgress(10);

          if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

          words = alignScriptToSegments(
            params.script,
            resolvedSegments,
            params.totalDurationFrames,
            params.fps,
          );
          transcriptionSource = 'segment-timing';

          setTranscriptionProgress(PROGRESS_RANGES.finalizeEnd);
        } else if (whisperSupported) {
          // ─── Fonte 2: Whisper com texto do roteiro (whisper-aligned) ──
          try {
            // Etapa 1: Resampling para 16kHz (0-5%)
            setTranscriptionStatusText('Preparando áudio...');
            setTranscriptionProgress(0);

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            const audioResponse = await fetch(params.audioUrl);
            if (!audioResponse.ok) {
              throw new Error(`Falha ao baixar áudio (HTTP ${audioResponse.status})`);
            }
            const audioBlob = await audioResponse.blob();

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            const waveform = await resampleTo16Khz({
              file: audioBlob,
              onProgress: (p: number) => {
                setTranscriptionProgress(p * PROGRESS_RANGES.resampleEnd);
              },
            });

            // Etapa 2: Download do modelo (5-30%)
            setTranscriptionStatusText('Baixando modelo Whisper (~75 MB)...');
            setTranscriptionProgress(PROGRESS_RANGES.downloadStart);

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            await downloadWhisperModel({
              model: WHISPER_MODEL,
              onProgress: (p) => {
                const mapped = PROGRESS_RANGES.downloadStart
                  + p.progress * (PROGRESS_RANGES.downloadEnd - PROGRESS_RANGES.downloadStart);
                setTranscriptionProgress(mapped);
              },
            });

            // Etapa 3: Transcrição (30-90%)
            setTranscriptionStatusText('Transcrevendo áudio...');
            setTranscriptionProgress(PROGRESS_RANGES.transcribeStart);

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            const result = await transcribe({
              channelWaveform: waveform,
              model: WHISPER_MODEL,
              language: 'pt',
              onProgress: (p: number) => {
                const mapped = PROGRESS_RANGES.transcribeStart
                  + p * (PROGRESS_RANGES.transcribeEnd - PROGRESS_RANGES.transcribeStart);
                setTranscriptionProgress(mapped);
              },
            });

            // Etapa 4: Pós-processamento (90-100%) — texto do roteiro, timing do Whisper
            setTranscriptionStatusText('Processando legendas...');
            setTranscriptionProgress(PROGRESS_RANGES.transcribeEnd);

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            words = processWhisperAlignedCaptions(result.transcription, params.script, params.fps);
            transcriptionSource = 'whisper-aligned';
          } catch (whisperErr) {
            // Falha no Whisper → fallback proporcional
            if (whisperErr instanceof Error && whisperErr.message.includes('cancelada pelo usuário')) {
              setTranscriptionStatusText('Transcrição cancelada.');
              return;
            }

            log.warn('Whisper falhou, usando fallback proporcional', { error: whisperErr });
            words = segmentScriptByCenes(
              params.script,
              params.scenes,
              params.totalDurationFrames,
              params.fps,
            );
            transcriptionSource = 'proportional';
          }
        } else {
          // ─── Fonte 3: Fallback proporcional direto ────────────
          setTranscriptionStatusText('Gerando legendas por estimativa...');
          setTranscriptionProgress(0);

          if (cancelRef.current) {
            setTranscriptionStatusText('Transcrição cancelada.');
            return;
          }

          words = segmentScriptByCenes(
            params.script,
            params.scenes,
            params.totalDurationFrames,
            params.fps,
          );
          transcriptionSource = 'proportional';
        }

        // Finalização
        setCaptions(words);
        setSource(transcriptionSource);
        setTranscriptionProgress(PROGRESS_RANGES.finalizeEnd);
        setTranscriptionStatusText('Concluído!');

        // Calcula e salva o hash do roteiro para staleness detection
        const hash = await hashScript(params.script);
        setScriptHash(hash);
      } catch (err) {
        if (err instanceof Error && err.message.includes('cancelada pelo usuário')) {
          setTranscriptionStatusText('Transcrição cancelada.');
          return;
        }

        log.error('Erro na transcrição', { error: err });
        const msg = err instanceof Error ? err.message : '';
        const lower = msg.toLowerCase();

        if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('cors')) {
          setError('Não foi possível baixar o áudio. Verifique a conexão ou tente exportar o projeto novamente.');
        } else if (lower.includes('quota') || lower.includes('429')) {
          setError('Limite de uso atingido. Aguarde alguns minutos e tente novamente.');
        } else {
          setError('Não foi possível transcrever o áudio. Tente novamente.');
        }
      } finally {
        setIsTranscribing(false);
      }
    },
    [whisperSupported, projectId, userId],
  );

  // ─── Utilitários ──────────────────────────────────────────────

  const clearTranscription = useCallback(() => {
    setCaptions([]);
    setSource(null);
    setTranscriptionProgress(0);
    setTranscriptionStatusText('');
    setError(null);
    setIsTranscribing(false);
    setScriptHash(null);
    setIsStale(false);
  }, []);

  const cancelTranscription = useCallback(() => {
    cancelRef.current = true;
  }, []);

  /** Atualiza as legendas manualmente — marca source como 'manual' */
  const updateCaptions = useCallback((newCaptions: CaptionWord[]) => {
    setCaptions(newCaptions);
    setSource('manual');
  }, []);

  return {
    captions,
    source,
    isTranscribing,
    transcriptionProgress,
    transcriptionStatusText,
    error,
    whisperSupported,
    scriptHash,
    isStale,
    transcribeAudio,
    cancelTranscription,
    clearTranscription,
    updateCaptions,
  };
}
