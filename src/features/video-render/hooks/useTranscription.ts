import { useState, useCallback, useRef, useEffect } from 'react';
import { canUseWhisperWeb, downloadWhisperModel, resampleTo16Khz, transcribe } from '@remotion/whisper-web';
import type { TranscriptionJson, TranscriptionItemWithTimestamp } from '@remotion/whisper-web';
import { msToFrames } from '../lib/videoUtils';
import { segmentScriptByCenes } from '../lib/subtitleUtils';
import { saveTranscription, loadTranscription } from '../../../lib/db/transcriptions';
import type { CaptionWord } from '../types';

/** Tipo do token palavra-a-palavra extraído da transcrição Whisper */
type WordLevelToken = TranscriptionItemWithTimestamp['tokens'][number];

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
}

/** Estado e ações do hook de transcrição */
export interface UseTranscriptionReturn {
  /** Legendas extraídas (null se ainda não transcreveu) */
  captions: CaptionWord[];
  /** Fonte da transcrição (null se ainda não transcreveu) */
  source: 'whisper' | 'proportional' | null;
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
  /** Inicia a transcrição do áudio */
  transcribeAudio: (params: TranscribeAudioParams) => Promise<void>;
  /** Cancela a transcrição em andamento */
  cancelTranscription: () => void;
  /** Limpa todos os dados de transcrição */
  clearTranscription: () => void;
}

/** Debounce em ms para persistência no IndexedDB */
const PERSIST_DEBOUNCE_MS = 500;

/** Modelo Whisper usado (tiny = ~40MB, bom o suficiente para legendas) */
const WHISPER_MODEL = 'tiny' as const;

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
 * Extrai WordLevelToken[] do resultado da transcrição Whisper.
 * Aplaina todos os tokens de todos os segmentos em uma única lista.
 */
function extractTokens(transcription: TranscriptionJson['transcription']): WordLevelToken[] {
  const tokens: WordLevelToken[] = [];
  for (const segment of transcription) {
    for (const token of segment.tokens) {
      if (token.text.trim() !== '') {
        tokens.push(token);
      }
    }
  }
  return tokens;
}

/**
 * Converte WordLevelToken[] do Whisper para CaptionWord[].
 * Offsets do Whisper estão em SEGUNDOS, convertidos para frames via msToFrames.
 */
function tokensToCaptionWords(tokens: WordLevelToken[], fps: number): CaptionWord[] {
  return tokens.map(token => ({
    text: token.text.trim(),
    startFrame: msToFrames(token.offsets.from * 1000, fps),
    endFrame: msToFrames(token.offsets.to * 1000, fps),
    bold: false,
  }));
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
 */
export function useTranscription(projectId?: string | null): UseTranscriptionReturn {
  const [captions, setCaptions] = useState<CaptionWord[]>([]);
  const [source, setSource] = useState<'whisper' | 'proportional' | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionStatusText, setTranscriptionStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [whisperSupported, setWhisperSupported] = useState<boolean | null>(null);

  const cancelRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Persistência com debounce ─────────────────────────────────

  useEffect(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }

    // Só persiste se houver captions, source e projectId
    if (captions.length === 0 || !source || !projectId) return;

    persistTimerRef.current = setTimeout(() => {
      void saveTranscription(projectId, { words: captions, source });
      persistTimerRef.current = null;
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [captions, source, projectId]);

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
          .catch(() => false); // Falha na verificação = não suportado

        const [stored, supported] = await Promise.all([storedPromise, whisperPromise]);

        if (cancelled) return;

        setWhisperSupported(supported);

        if (stored) {
          setCaptions(stored.result.words);
          setSource(stored.result.source);
        }
      } catch (err) {
        console.warn('[useTranscription] Erro ao carregar dados:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  // ─── Transcrição ──────────────────────────────────────────────

  const transcribeAudio = useCallback(
    async (params: TranscribeAudioParams): Promise<void> => {
      cancelRef.current = false;
      setIsTranscribing(true);
      setTranscriptionProgress(0);
      setTranscriptionStatusText('Preparando transcrição...');
      setError(null);

      try {
        let words: CaptionWord[];
        let transcriptionSource: 'whisper' | 'proportional';

        if (whisperSupported) {
          try {
            // ─── Etapa 1: Resampling para 16kHz (0-5%) ──────────
            setTranscriptionStatusText('Preparando áudio...');
            setTranscriptionProgress(0);

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            const audioResponse = await fetch(params.audioUrl);
            if (!audioResponse.ok) {
              throw new Error(`Falha ao baixar áudio (HTTP ${audioResponse.status})`);
            }
            const audioBlob = await audioResponse.blob();

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            // Resampling para 16kHz (progresso 0-5%)
            const waveform = await resampleTo16Khz({
              file: audioBlob,
              onProgress: (p: number) => {
                // p vai de 0 a 1, mapeia para 0-5%
                setTranscriptionProgress(p * PROGRESS_RANGES.resampleEnd);
              },
            });

            // ─── Etapa 2: Download do modelo (5-30%) ────────────
            setTranscriptionStatusText('Baixando modelo Whisper...');
            setTranscriptionProgress(PROGRESS_RANGES.downloadStart);

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            await downloadWhisperModel({
              model: WHISPER_MODEL,
              onProgress: (p) => {
                // p.progress vai de 0 a 1, mapeia para 5-30%
                const mapped = PROGRESS_RANGES.downloadStart
                  + p.progress * (PROGRESS_RANGES.downloadEnd - PROGRESS_RANGES.downloadStart);
                setTranscriptionProgress(mapped);
              },
            });

            // ─── Etapa 3: Transcrição (30-90%) ──────────────────
            setTranscriptionStatusText('Transcrevendo áudio...');
            setTranscriptionProgress(PROGRESS_RANGES.transcribeStart);

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            const result = await transcribe({
              channelWaveform: waveform,
              model: WHISPER_MODEL,
              language: 'pt',
              onProgress: (p: number) => {
                // p vai de 0 a 1, mapeia para 30-90%
                const mapped = PROGRESS_RANGES.transcribeStart
                  + p * (PROGRESS_RANGES.transcribeEnd - PROGRESS_RANGES.transcribeStart);
                setTranscriptionProgress(mapped);
              },
            });

            // ─── Etapa 4: Pós-processamento (90-100%) ───────────
            setTranscriptionStatusText('Processando legendas...');
            setTranscriptionProgress(PROGRESS_RANGES.transcribeEnd);

            if (cancelRef.current) throw new Error('Transcrição cancelada pelo usuário.');

            const tokens = extractTokens(result.transcription);
            words = tokensToCaptionWords(tokens, params.fps);
            transcriptionSource = 'whisper';
          } catch (whisperErr) {
            // Falha no Whisper → fallback proporcional
            if (whisperErr instanceof Error && whisperErr.message.includes('cancelada pelo usuário')) {
              setTranscriptionStatusText('Transcrição cancelada.');
              return;
            }

            console.warn('[useTranscription] Whisper falhou, usando fallback proporcional:', whisperErr);
            words = segmentScriptByCenes(
              params.script,
              params.scenes,
              params.totalDurationFrames,
              params.fps,
            );
            transcriptionSource = 'proportional';
          }
        } else {
          // ─── Fallback proporcional direto ────────────────────
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
      } catch (err) {
        if (err instanceof Error && err.message.includes('cancelada pelo usuário')) {
          setTranscriptionStatusText('Transcrição cancelada.');
          return;
        }

        console.error('[useTranscription] Erro na transcrição:', err);
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
    [whisperSupported],
  );

  // ─── Utilitários ──────────────────────────────────────────────

  const clearTranscription = useCallback(() => {
    setCaptions([]);
    setSource(null);
    setTranscriptionProgress(0);
    setTranscriptionStatusText('');
    setError(null);
    setIsTranscribing(false);
  }, []);

  const cancelTranscription = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return {
    captions,
    source,
    isTranscribing,
    transcriptionProgress,
    transcriptionStatusText,
    error,
    whisperSupported,
    transcribeAudio,
    cancelTranscription,
    clearTranscription,
  };
}
