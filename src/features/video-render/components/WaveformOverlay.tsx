import { useMemo } from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import {
  useAudioData,
  visualizeAudioWaveform,
  createSmoothSvgPath,
} from '@remotion/media-utils';
import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_LIGHT,
  WHITE_14,
  WHITE_22,
} from '../../../theme/tokens';

// ─── Tipos ──────────────────────────────────────────────────

/** Ponto 2D compatível com createSmoothSvgPath — definido localmente para evitar import de caminho interno */
interface Point {
  x: number;
  y: number;
}

interface WaveformOverlayProps {
  /** URL do áudio (blob: ou URL remota) — null desabilita o overlay */
  audioUrl: string | null;
  /** Início da cena em segundos */
  sceneStartTime: number;
  /** Fim da cena em segundos */
  sceneEndTime: number;
  /** Frame atual do Remotion (geralmente useCurrentFrame()) */
  frame: number;
  /** Frames por segundo do vídeo */
  fps: number;
  /** Opacidade geral do waveform (default: 0.3) */
  opacity?: number;
}

// ─── Constantes de renderização ─────────────────────────────

/** Largura lógica do viewBox SVG */
const SVG_WIDTH = 2000;

/** Altura lógica do viewBox SVG */
const SVG_HEIGHT = 120;

/** Margem vertical dentro do viewBox para não cortar os picos */
const SVG_PADDING_Y = 10;

/** Altura útil para o waveform (descontando padding) */
const WAVEFORM_HEIGHT = SVG_HEIGHT - SVG_PADDING_Y * 2;

/** Número de amostras extraídas do áudio por frame (resolução horizontal) */
const NUMBER_OF_SAMPLES = 120;

/** Janela de tempo em segundos ao redor do frame atual para visualização */
const WINDOW_IN_SECONDS = 0.4;

/** Largura do indicador de progresso em pixels SVG */
const PROGRESS_LINE_WIDTH = 3;

/** Opacidade do indicador de progresso */
const PROGRESS_LINE_OPACITY = 0.9;

// ─── Helpers ────────────────────────────────────────────────

/**
 * Converte o array de amplitudes (0-1) do visualizeAudioWaveform
 * em pontos { x, y } compatíveis com createSmoothSvgPath.
 * O waveform é espelhado no eixo Y para crescer para cima.
 */
function waveformToPoints(amplitudes: number[]): Point[] {
  return amplitudes.map((amplitude, index) => {
    const x = (index / amplitudes.length) * SVG_WIDTH;
    // Espelha: amplitude 0 = base inferior, amplitude 1 = topo
    const y = SVG_HEIGHT - SVG_PADDING_Y - amplitude * WAVEFORM_HEIGHT;
    return { x, y };
  });
}

/**
 * Calcula o timestamp em segundos do frame atual dentro da cena.
 * Retorna null se o frame estiver fora do range da cena.
 */
function getSceneTime(
  frame: number,
  fps: number,
  sceneStartTime: number,
  sceneEndTime: number,
): number | null {
  const timeInSeconds = frame / fps;
  if (timeInSeconds < sceneStartTime || timeInSeconds > sceneEndTime) return null;
  return timeInSeconds - sceneStartTime;
}

// ─── Componente principal ───────────────────────────────────

/**
 * Overlay de waveform de áudio sincronizado com o frame atual.
 *
 * Renderiza uma visualização SVG de waveform na parte inferior do vídeo,
 * com um indicador de progresso que avança conforme a cena toca.
 *
 * Usa @remotion/media-utils:
 * - useAudioData() para carregar e cachear os dados do áudio
 * - visualizeAudioWaveform() para extrair amplitudes por frame
 * - createSmoothSvgPath() para gerar curvas SVG suaves
 *
 * Fallback: se useAudioData() retornar null (blob URL não suportada
 * ou erro de fetch), renderiza indicador de progresso sem waveform.
 */
export function WaveformOverlay({
  audioUrl,
  sceneStartTime,
  sceneEndTime,
  frame,
  fps,
  opacity = 0.3,
}: WaveformOverlayProps) {
  // ── Carrega dados de áudio via hook do Remotion ──
  const audioData = useAudioData(audioUrl ?? '');

  // ── Calcula tempo relativo dentro da cena ──
  const sceneTime = getSceneTime(frame, fps, sceneStartTime, sceneEndTime);

  // ── Duração da cena em segundos ──
  const sceneDuration = sceneEndTime - sceneStartTime;

  // ── Progresso da cena (0 a 1) ──
  const progress = sceneTime !== null && sceneDuration > 0
    ? Math.min(1, sceneTime / sceneDuration)
    : 0;

  // ── Extrai waveform para o frame atual (memoizado por frame) ──
  const svgPath = useMemo(() => {
    if (!audioData || sceneTime === null) return null;

    try {
      const amplitudes = visualizeAudioWaveform({
        audioData,
        frame,
        fps,
        windowInSeconds: WINDOW_IN_SECONDS,
        numberOfSamples: NUMBER_OF_SAMPLES,
        normalize: true,
      });

      const points = waveformToPoints(amplitudes);
      return createSmoothSvgPath({ points });
    } catch {
      // Fallback silencioso: se o visualization falhar, retorna null
      return null;
    }
  }, [audioData, frame, fps, sceneTime]);

  // ── Fade de entrada/saída do overlay ──
  const sceneDurationFrames = sceneDuration * fps;
  const fadeFrames = Math.min(10, Math.floor(sceneDurationFrames / 4));

  const overlayOpacity = sceneTime !== null
    ? interpolate(
        sceneTime * fps,
        [0, fadeFrames, sceneDurationFrames - fadeFrames, sceneDurationFrames],
        [0, opacity, opacity, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 0;

  // ── Posição X do indicador de progresso ──
  const progressX = progress * SVG_WIDTH;

  // ── Não renderiza se não há áudio ou fora da cena ──
  if (!audioUrl || overlayOpacity <= 0) return null;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: overlayOpacity,
        zIndex: 5,
      }}
    >
      {/* Container SVG ancorado na parte inferior */}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '80px',
        }}
      >
        {/* Gradiente vertical para o waveform — brilho na base */}
        <defs>
          <linearGradient id="waveformGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_PRIMARY} stopOpacity="0.4" />
            <stop offset="100%" stopColor={BRAND_PRIMARY} stopOpacity="0.9" />
          </linearGradient>

          {/* Gradiente de fade lateral — esquerda */}
          <linearGradient id="fadeLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BRAND_PRIMARY} stopOpacity="0" />
            <stop offset="100%" stopColor={BRAND_PRIMARY} stopOpacity="1" />
          </linearGradient>

          {/* Gradiente de fade lateral — direita */}
          <linearGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BRAND_PRIMARY} stopOpacity="1" />
            <stop offset="100%" stopColor={BRAND_PRIMARY} stopOpacity="0" />
          </linearGradient>

          {/* Mask para fade nas bordas do waveform */}
          <mask id="waveformFadeMask">
            <rect x="0" y="0" width={SVG_WIDTH * 0.1} height={SVG_HEIGHT} fill="url(#fadeLeft)" />
            <rect x={SVG_WIDTH * 0.1} y="0" width={SVG_WIDTH * 0.8} height={SVG_HEIGHT} fill="white" />
            <rect x={SVG_WIDTH * 0.9} y="0" width={SVG_WIDTH * 0.1} height={SVG_HEIGHT} fill="url(#fadeRight)" />
          </mask>
        </defs>

        {/* Linha base (zero amplitude) */}
        <line
          x1={0}
          y1={SVG_HEIGHT - SVG_PADDING_Y}
          x2={SVG_WIDTH}
          y2={SVG_HEIGHT - SVG_PADDING_Y}
          stroke={WHITE_14}
          strokeWidth={1}
        />

        {/* Path do waveform principal com gradiente e mask de fade */}
        {svgPath && (
          <path
            d={svgPath}
            fill="none"
            stroke="url(#waveformGradient)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            mask="url(#waveformFadeMask)"
          />
        )}

        {/* Barra de fundo do progresso */}
        <rect
          x={0}
          y={0}
          width={progressX}
          height={SVG_HEIGHT}
          fill={BRAND_PRIMARY}
          opacity={0.08}
        />

        {/* Indicador de progresso (linha vertical) */}
        <line
          x1={progressX}
          y1={SVG_PADDING_Y}
          x2={progressX}
          y2={SVG_HEIGHT - SVG_PADDING_Y}
          stroke={BRAND_PRIMARY_LIGHT}
          strokeWidth={PROGRESS_LINE_WIDTH}
          strokeLinecap="round"
          opacity={PROGRESS_LINE_OPACITY}
        />

        {/* Glow no indicador de progresso */}
        <line
          x1={progressX}
          y1={SVG_PADDING_Y}
          x2={progressX}
          y2={SVG_HEIGHT - SVG_PADDING_Y}
          stroke={BRAND_PRIMARY_LIGHT}
          strokeWidth={PROGRESS_LINE_WIDTH + 6}
          strokeLinecap="round"
          opacity={0.2}
          style={{
            filter: 'blur(4px)',
          }}
        />

        {/* Ponto luminoso no topo do indicador */}
        <circle
          cx={progressX}
          cy={SVG_PADDING_Y}
          r={4}
          fill={WHITE_22}
        />
        <circle
          cx={progressX}
          cy={SVG_PADDING_Y}
          r={2}
          fill={BRAND_PRIMARY_LIGHT}
        />
      </svg>
    </AbsoluteFill>
  );
}
