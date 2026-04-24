import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Add from '@mui/icons-material/Add';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import ClosedCaptionOutlined from '@mui/icons-material/ClosedCaptionOutlined';
import UndoOutlined from '@mui/icons-material/UndoOutlined';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { glassSurfaceSx } from '../../../theme/surfaces';
import {
  GAP_DEFAULT,
  GAP_COMPACT,
  RADIUS_SM,
  ICON_SIZE_LG,
  WHITE_04,
  WHITE_08,
  WHITE_10,
  WHITE_14,
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_DISABLED,
  ERROR_MAIN,
  APP_SURFACE_ELEVATED,
} from '../../../theme/tokens';
import { wordsToPhrases, phrasesToWords, parseBoldMarkdown } from '../lib/subtitleUtils';
import type { CaptionWord, CaptionPhrase } from '../types';
import { formatTimestamp, frameToSeconds, secondsToFrame } from '../lib/formatTimestamp';
import { useVideoRenderBridge } from '../store/videoRenderBridge';

// ---------------------------------------------------------------------------
// Constantes (F13 — números mágicos extraídos)
// ---------------------------------------------------------------------------

/** Altura máxima da lista scrollável de frases */
const PHRASE_LIST_MAX_HEIGHT = 420;

/** Altura do botão de adicionar frase entre frases */
const ADD_BUTTON_HEIGHT = 32;

/** Duração da transição de hover em segundos */
const HOVER_TRANSITION_DURATION = '0.2s';

/** Tamanho do ícone "+" no AddPhraseButton */
const ADD_ICON_SIZE = 18;

/** Tamanho do ícone do cabeçalho do painel */
const HEADER_ICON_SIZE = 22;

/** Duração mínima de uma frase nova em frames */
const MIN_PHRASE_DURATION_FRAMES = 1;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface CaptionEditorPanelProps {
  /** Legendas com timestamps */
  captions: CaptionWord[];
  /** Callback para atualizar as legendas no hook */
  onUpdateCaptions: (captions: CaptionWord[]) => void;
  /** Frames por segundo */
  fps: number;
  /** Função para pular o player para um frame específico */
  onSeekToFrame?: (frame: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parseia bold markdown (ex: "palavra **negrito** normal") em CaptionWord[].
 * Distribui o timing proporcionalmente pelo comprimento dos caracteres (F11).
 * Reutiliza parseBoldMarkdown de subtitleUtils para evitar duplicação (F3).
 */
function parseEditedTextToWords(
  text: string,
  startFrame: number,
  endFrame: number,
): CaptionWord[] {
  const segments = parseBoldMarkdown(text);
  const allWords: { text: string; bold: boolean }[] = [];

  for (const segment of segments) {
    const words = segment.text.match(/\S+/g);
    if (words) {
      for (const w of words) {
        allWords.push({ text: w, bold: segment.bold });
      }
    }
  }

  if (allWords.length === 0) return [];

  // Distribui timing proporcional ao número de caracteres (F11)
  const duration = endFrame - startFrame;
  const totalChars = allWords.reduce((sum, w) => sum + w.text.length, 0);
  let currentFrame = startFrame;

  return allWords.map((w, i) => {
    const proportion = totalChars > 0 ? w.text.length / totalChars : 1 / allWords.length;
    const wordFrames = Math.max(MIN_PHRASE_DURATION_FRAMES, Math.round(proportion * duration));
    const wordStart = currentFrame;

    // Última palavra absorve frames residuais
    if (i === allWords.length - 1) {
      currentFrame = endFrame;
    } else {
      currentFrame += wordFrames;
    }

    return {
      text: w.text,
      startFrame: wordStart,
      endFrame: currentFrame,
      bold: w.bold,
    };
  });
}

// ---------------------------------------------------------------------------
// PhraseCard — card individual de uma frase
// ---------------------------------------------------------------------------

interface PhraseCardProps {
  phrase: CaptionPhrase;
  isActive: boolean;
  isEditing: boolean;
  isTimingExpanded: boolean;
  fps: number;
  editValue: string;
  startFrameEdit: number;
  endFrameEdit: number;
  onSeek: (frame: number) => void;
  onStartEdit: () => void;
  onEditChange: (value: string) => void;
  onConfirmEdit: (text: string) => void;
  onCancelEdit: () => void;
  onToggleTiming: () => void;
  onTimingChange: (start: number, end: number) => void;
  onTimingBlur: () => void;
  onDelete: () => void;
}

const PhraseCard = React.memo(function PhraseCard({
  phrase,
  isActive,
  isEditing,
  isTimingExpanded,
  fps,
  editValue,
  startFrameEdit,
  endFrameEdit,
  onSeek,
  onStartEdit,
  onEditChange,
  onConfirmEdit,
  onCancelEdit,
  onToggleTiming,
  onTimingChange,
  onTimingBlur,
  onDelete,
}: PhraseCardProps) {
  const wordCount = phrase.words.length;
  const hasTimingError = startFrameEdit >= endFrameEdit;

  // Handler de teclado para seek no card (F4)
  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSeek(phrase.startFrame);
    }
  }, [onSeek, phrase.startFrame]);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSeek(phrase.startFrame)}
      onKeyDown={handleCardKeyDown}
      aria-label={`Frase: ${phrase.text || '(vazia)'}, ${formatTimestamp(phrase.startFrame, fps)} a ${formatTimestamp(phrase.endFrame, fps)}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: GAP_DEFAULT,
        p: 1.5,
        borderRadius: RADIUS_SM,
        cursor: 'pointer',
        transition: `all ${HOVER_TRANSITION_DURATION} cubic-bezier(0.4, 0, 0.2, 1)`,
        borderLeft: `3px solid ${isActive ? BRAND_PRIMARY : 'transparent'}`,
        backgroundColor: isActive ? BRAND_PRIMARY_GLOW_SOFT : 'transparent',
        '&:hover': {
          backgroundColor: isActive ? BRAND_PRIMARY_GLOW_SOFT : WHITE_08,
          borderColor: isActive ? BRAND_PRIMARY : WHITE_14,
          borderLeftColor: isActive ? BRAND_PRIMARY : WHITE_14,
        },
        '&:focus-visible': {
          outline: `2px solid ${BRAND_PRIMARY}`,
          outlineOffset: -2,
        },
        ...(isEditing && {
          boxShadow: `inset 0 0 0 1px ${BRAND_PRIMARY_GLOW_SOFT}, 0 2px 16px rgba(46, 117, 182, 0.08)`,
          backgroundColor: WHITE_04,
        }),
      }}
    >
      {/* PhraseHeader: timestamp + ações */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: GAP_DEFAULT }}>
        <Chip
          label={`${formatTimestamp(phrase.startFrame, fps)} - ${formatTimestamp(phrase.endFrame, fps)}`}
          size="small"
          variant="outlined"
          onClick={(e) => { e.stopPropagation(); onSeek(phrase.startFrame); }}
          sx={{
            flexShrink: 0,
            fontSize: '0.75rem',
            fontFamily: 'JetBrains Mono, monospace',
            height: 24,
            borderColor: WHITE_14,
            color: TEXT_SECONDARY,
          }}
        />

        {/* Espaçador */}
        <Box sx={{ flex: 1 }} />

        {/* Ações */}
        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
          {isEditing ? (
            <>
              <Tooltip title="Confirmar (Enter)">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onConfirmEdit(editValue); }}
                  sx={{ color: 'success.main' }}
                >
                  <CheckOutlined sx={{ fontSize: ICON_SIZE_LG }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancelar (Esc)">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                >
                  <CloseOutlined sx={{ fontSize: ICON_SIZE_LG }} />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Editar timing">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onToggleTiming(); }}
                  sx={{
                    transform: isTimingExpanded ? 'rotate(180deg)' : 'none',
                    transition: `transform ${HOVER_TRANSITION_DURATION} ease`,
                  }}
                >
                  <ExpandMoreOutlined sx={{ fontSize: ICON_SIZE_LG }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Editar texto">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
                >
                  <EditOutlined sx={{ fontSize: ICON_SIZE_LG }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Apagar frase">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  sx={{ color: TEXT_DISABLED, '&:hover': { color: ERROR_MAIN } }}
                >
                  <DeleteOutlineOutlined sx={{ fontSize: ICON_SIZE_LG }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      </Box>

      {/* PhraseContent: texto ou TextField */}
      {/* aria-live anuncia mudanças de estado para leitores de tela (F16) */}
      <Box onClick={(e) => e.stopPropagation()} aria-live="polite">
        {isEditing ? (
          <TextField
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onConfirmEdit((e.target as HTMLTextAreaElement).value);
              }
              if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
            size="small"
            fullWidth
            multiline
            maxRows={3}
            autoFocus
            aria-label="Editar texto da frase"
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '0.8125rem',
                py: 0.5,
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderRadius: RADIUS_SM,
                borderColor: BRAND_PRIMARY,
              },
            }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: isActive ? TEXT_PRIMARY : 'text.secondary',
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {phrase.words.map((w, i) => (
              <span key={i} style={{ fontWeight: w.bold ? 700 : 400 }}>
                {i > 0 ? ' ' : ''}{w.text}
              </span>
            ))}
          </Typography>
        )}
      </Box>

      {/* Contagem de palavras */}
      {!isEditing && phrase.words.length > 0 && (
        <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
          {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
        </Typography>
      )}

      {/* PhraseTimingEditor (Collapse) */}
      <Collapse in={isTimingExpanded}>
        <Divider sx={{ borderColor: WHITE_04, mb: 1 }} />
        <Stack spacing={GAP_COMPACT}>
          {/* Campo Início (F5 — aria-labelledby) */}
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
            <Typography id={`timing-start-${phrase.id}`} variant="caption" sx={{ color: TEXT_SECONDARY, minWidth: 48 }}>
              Início:
            </Typography>
            <TextField
              type="number"
              size="small"
              value={parseFloat(frameToSeconds(startFrameEdit, fps).toFixed(2))}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isNaN(val)) onTimingChange(secondsToFrame(val, fps), endFrameEdit);
              }}
              onBlur={onTimingBlur}
              onClick={(e) => e.stopPropagation()}
              aria-labelledby={`timing-start-${phrase.id}`}
              slotProps={{ htmlInput: { min: 0, step: 0.01, style: { fontSize: '0.75rem' } } }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.75rem',
                  height: 32,
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderRadius: RADIUS_SM,
                  borderColor: hasTimingError ? ERROR_MAIN : WHITE_14,
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: TEXT_SECONDARY,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.7rem',
                minWidth: 60,
              }}
            >
              ({formatTimestamp(startFrameEdit, fps)})
            </Typography>
          </Stack>

          {/* Campo Fim (F5 — aria-labelledby) */}
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
            <Typography id={`timing-end-${phrase.id}`} variant="caption" sx={{ color: TEXT_SECONDARY, minWidth: 48 }}>
              Fim:
            </Typography>
            <TextField
              type="number"
              size="small"
              value={parseFloat(frameToSeconds(endFrameEdit, fps).toFixed(2))}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isNaN(val)) onTimingChange(startFrameEdit, secondsToFrame(val, fps));
              }}
              onBlur={onTimingBlur}
              onClick={(e) => e.stopPropagation()}
              aria-labelledby={`timing-end-${phrase.id}`}
              slotProps={{ htmlInput: { min: 0, step: 0.01, style: { fontSize: '0.75rem' } } }}
              error={hasTimingError}
              helperText={hasTimingError ? 'Início deve ser menor que fim' : undefined}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.75rem',
                  height: 32,
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderRadius: RADIUS_SM,
                  borderColor: hasTimingError ? ERROR_MAIN : WHITE_14,
                },
                '& .MuiFormHelperText-root': {
                  fontSize: '0.65rem',
                  mx: 0,
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: TEXT_SECONDARY,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.7rem',
                minWidth: 60,
              }}
            >
              ({formatTimestamp(endFrameEdit, fps)})
            </Typography>
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Só re-renderiza se props que afetam a saída mudarem
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isTimingExpanded === nextProps.isTimingExpanded &&
    prevProps.phrase.id === nextProps.phrase.id &&
    prevProps.phrase.startFrame === nextProps.phrase.startFrame &&
    prevProps.phrase.endFrame === nextProps.phrase.endFrame &&
    prevProps.phrase.text === nextProps.phrase.text &&
    prevProps.fps === nextProps.fps &&
    prevProps.editValue === nextProps.editValue &&
    prevProps.startFrameEdit === nextProps.startFrameEdit &&
    prevProps.endFrameEdit === nextProps.endFrameEdit
  );
});

// ---------------------------------------------------------------------------
// AddPhraseButton — divisor com botão "+" entre frases
// ---------------------------------------------------------------------------

interface AddPhraseButtonProps {
  onClick: () => void;
}

const AddPhraseButton = React.memo(function AddPhraseButton({ onClick }: AddPhraseButtonProps) {
  // Handler de teclado para acessibilidade (F2)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  }, [onClick]);

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label="Adicionar nova frase"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: ADD_BUTTON_HEIGHT,
        cursor: 'pointer',
        borderTop: `1px solid ${WHITE_04}`,
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        color: TEXT_DISABLED,
        '&:hover': {
          borderTopColor: WHITE_10,
          backgroundColor: WHITE_08,
          color: TEXT_SECONDARY,
        },
        '&:focus-visible': {
          outline: `2px solid ${BRAND_PRIMARY}`,
          outlineOffset: -2,
        },
      }}
    >
      <Add sx={{ fontSize: ADD_ICON_SIZE, color: 'inherit', transition: 'color 0.15s ease' }} />
    </Box>
  );
});

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function CaptionEditorPanel({
  captions,
  onUpdateCaptions,
  fps,
  onSeekToFrame,
}: CaptionEditorPanelProps) {
  // ─── Estado local ────────────────────────────────────────

  const [phrases, setPhrases] = useState<CaptionPhrase[]>(() => wordsToPhrases(captions));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedTimingId, setExpandedTimingId] = useState<string | null>(null);
  const [timingEdits, setTimingEdits] = useState<Record<string, { start: number; end: number }>>({});
  const [deletedPhrase, setDeletedPhrase] = useState<{ phrase: CaptionPhrase; index: number } | null>(null);

  // Sincroniza quando captions mudam externamente (ex: nova transcrição)
  // F1: reseta todos os estados de edição para evitar refs stale
  useEffect(() => {
    setPhrases(wordsToPhrases(captions));
    setEditingId(null);
    setExpandedTimingId(null);
    setTimingEdits({});
    setEditValue('');
    setDeletedPhrase(null);
  }, [captions]);

  // Tracking via subscription — só re-renderiza quando a frase ativa muda
  // (evita re-renders 30x/s causados pelo requestAnimationFrame do player)
  const phrasesRef = useRef(phrases);

  // Mantém ref atualizada sem causar re-render (padrão React recomendado)
  useEffect(() => {
    phrasesRef.current = phrases;
  }, [phrases]);

  const [activePhraseId, setActivePhraseId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = useVideoRenderBridge.subscribe((state) => {
      const frame = state.currentFrame;
      const newActive = phrasesRef.current.find(
        (p) => frame >= p.startFrame && frame < p.endFrame,
      )?.id ?? null;
      setActivePhraseId((prev) => (prev !== newActive ? newActive : prev));
    });
    return unsub;
  }, []);

  // Ref para auto-scroll da frase ativa
  const activePhraseRef = useRef<HTMLDivElement>(null);

  const hasCaptions = captions.length > 0;

  // Contagem total de palavras (memoizado — phrases muda raramente)
  const totalWords = useMemo(
    () => phrases.reduce((sum, p) => sum + p.words.length, 0),
    [phrases],
  );

  // ─── Helpers ─────────────────────────────────────────────

  /** Atualiza estado local E propaga mudança para o pai */
  const updateAndSync = useCallback((newPhrases: CaptionPhrase[]) => {
    setPhrases(newPhrases);
    onUpdateCaptions(phrasesToWords(newPhrases));
  }, [onUpdateCaptions]);

  // ─── Handlers ────────────────────────────────────────────

  const handleSeek = useCallback((frame: number) => {
    onSeekToFrame?.(frame);
  }, [onSeekToFrame]);

  // Edição de texto
  const handleStartEdit = useCallback((phrase: CaptionPhrase) => {
    setEditingId(phrase.id);
    setEditValue(phrase.text);
  }, []);

  const handleConfirmEdit = useCallback((newText: string) => {
    if (!editingId || !newText.trim()) {
      setEditingId(null);
      return;
    }

    setPhrases((prev) => {
      const newPhrases = prev.map((p) => {
        if (p.id !== editingId) return p;
        const trimmed = newText.trim();
        const newWords = parseEditedTextToWords(trimmed, p.startFrame, p.endFrame);
        if (newWords.length === 0) return p;
        return { ...p, words: newWords, text: trimmed };
      });
      onUpdateCaptions(phrasesToWords(newPhrases));
      return newPhrases;
    });
    setEditingId(null);
  }, [editingId, onUpdateCaptions]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  // Edição de timing
  const handleToggleTiming = useCallback((phrase: CaptionPhrase) => {
    setExpandedTimingId((prev) => (prev === phrase.id ? null : phrase.id));
    setTimingEdits((prev) => ({
      ...prev,
      [phrase.id]: { start: phrase.startFrame, end: phrase.endFrame },
    }));
  }, []);

  const handleTimingChange = useCallback((phraseId: string, start: number, end: number) => {
    setTimingEdits((prev) => ({ ...prev, [phraseId]: { start, end } }));
  }, []);

  const handleTimingBlur = useCallback((phraseId: string) => {
    setPhrases((prev) => {
      const edits = timingEdits[phraseId];
      if (!edits || edits.start >= edits.end) return prev;

      const newPhrases = prev.map((p) => {
        if (p.id !== phraseId) return p;
        const duration = edits.end - edits.start;
        const framePerWord = p.words.length > 0 ? duration / p.words.length : 0;
        const newWords = p.words.map((w, i) => ({
          ...w,
          startFrame: Math.round(edits.start + i * framePerWord),
          endFrame: Math.round(edits.start + (i + 1) * framePerWord),
        }));
        return { ...p, words: newWords, startFrame: edits.start, endFrame: edits.end };
      });
      onUpdateCaptions(phrasesToWords(newPhrases));
      return newPhrases;
    });

    // F10: limpa entry de timingEdits após aplicar mudanças
    setTimingEdits((prev) => {
      const next = { ...prev };
      delete next[phraseId];
      return next;
    });

    // F15: colapsa timing editor após aplicar (comportamento consistente com edição de texto)
    setExpandedTimingId(null);
  }, [timingEdits, onUpdateCaptions]);

  // Apagar frase (com undo via Snackbar)
  const handleDelete = useCallback((phrase: CaptionPhrase) => {
    const index = phrases.findIndex((p) => p.id === phrase.id);
    const newPhrases = phrases.filter((p) => p.id !== phrase.id);
    updateAndSync(newPhrases);
    setDeletedPhrase({ phrase, index });
  }, [phrases, updateAndSync]);

  const handleUndoDelete = useCallback(() => {
    if (!deletedPhrase) return;
    const { phrase, index } = deletedPhrase;
    const newPhrases = [...phrases];
    newPhrases.splice(index, 0, phrase);
    updateAndSync(newPhrases);
    setDeletedPhrase(null);
  }, [deletedPhrase, phrases, updateAndSync]);

  // Adicionar nova frase entre frases
  const handleAddPhrase = useCallback((insertIndex: number) => {
    // Calcula timing: midpoint entre a frase anterior e a próxima
    const prevEnd = insertIndex > 0 ? phrases[insertIndex - 1].endFrame : 0;
    const nextStart = insertIndex < phrases.length ? phrases[insertIndex].startFrame : prevEnd + 30;

    // F7: garante duração mínima de 1 frame para evitar frase de duração zero
    const startFrame = Math.round((prevEnd + nextStart) / 2);
    const endFrame = Math.max(startFrame + MIN_PHRASE_DURATION_FRAMES, nextStart);

    const newPhrase: CaptionPhrase = {
      id: crypto.randomUUID(),
      text: '',
      words: [],
      startFrame,
      endFrame,
    };

    const newPhrases = [...phrases];
    newPhrases.splice(insertIndex, 0, newPhrase);
    setPhrases(newPhrases);
    setEditingId(newPhrase.id);
    setEditValue('');
  }, [phrases]);

  // ─── Ctrl+Z para undo de exclusão (F8) ──────────────────

  useEffect(() => {
    if (deletedPhrase === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndoDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletedPhrase, handleUndoDelete]);

  // ─── Auto-scroll para frase ativa ────────────────────────
  useEffect(() => {
    if (!activePhraseRef.current || !activePhraseId) return;
    activePhraseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activePhraseId]);

  // ─── Render ──────────────────────────────────────────────

  return (
    <>
      <Collapse in={hasCaptions} unmountOnExit>
        <Box
          sx={(theme): SystemStyleObject<Theme> => ({
            ...glassSurfaceSx(theme),
            p: { xs: 2.5, md: 3 },
            borderRadius: { xs: 3, md: 4 },
          })}
        >
          {/* Cabeçalho */}
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', mb: 2 }}>
            <ClosedCaptionOutlined sx={{ fontSize: HEADER_ICON_SIZE, color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Editor de legendas
            </Typography>
            <Chip
              label={`${phrases.length} ${phrases.length === 1 ? 'frase' : 'frases'}`}
              size="small"
              variant="outlined"
              sx={{ ml: 'auto', fontSize: '0.7rem', borderColor: WHITE_14, color: TEXT_SECONDARY }}
            />
          </Stack>

          <Divider sx={{ mb: 2, borderColor: WHITE_14 }} />

          {/* Lista scrollável de frases */}
          <Stack
            spacing={0}
            sx={{
              maxHeight: PHRASE_LIST_MAX_HEIGHT,
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                borderRadius: 2,
                backgroundColor: WHITE_08,
              },
            }}
          >
            {phrases.map((phrase, index) => {
              const isActive = phrase.id === activePhraseId;
              const isEditing = phrase.id === editingId;
              const isTimingExpanded = phrase.id === expandedTimingId;
              const edits = timingEdits[phrase.id] ?? { start: phrase.startFrame, end: phrase.endFrame };

              return (
                <Box key={phrase.id}>
                  <div ref={isActive ? activePhraseRef : undefined}>
                    <PhraseCard
                      phrase={phrase}
                      isActive={isActive}
                      isEditing={isEditing}
                      isTimingExpanded={isTimingExpanded}
                      fps={fps}
                      editValue={editValue}
                      startFrameEdit={edits.start}
                      endFrameEdit={edits.end}
                      onSeek={handleSeek}
                      onStartEdit={() => handleStartEdit(phrase)}
                      onEditChange={setEditValue}
                      onConfirmEdit={handleConfirmEdit}
                      onCancelEdit={handleCancelEdit}
                      onToggleTiming={() => handleToggleTiming(phrase)}
                      onTimingChange={(start, end) => handleTimingChange(phrase.id, start, end)}
                      onTimingBlur={() => handleTimingBlur(phrase.id)}
                      onDelete={() => handleDelete(phrase)}
                    />
                  </div>
                  {/* Botão de adicionar frase entre frases */}
                  <AddPhraseButton onClick={() => handleAddPhrase(index + 1)} />
                </Box>
              );
            })}
          </Stack>

          {/* Rodapé informativo */}
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: TEXT_SECONDARY }}>
            {totalWords} palavras em {phrases.length} {phrases.length === 1 ? 'frase' : 'frases'}
            {' '}&middot;{' '}
            Clique em uma frase para pular no vídeo. Use **negrito** para destacar palavras.
          </Typography>
        </Box>
      </Collapse>

      {/* Snackbar de undo para exclusão */}
      <Snackbar
        open={deletedPhrase !== null}
        autoHideDuration={6000}
        onClose={() => setDeletedPhrase(null)}
        message="Frase removida"
        action={
          <IconButton
            size="small"
            aria-label="Desfazer exclusão"
            onClick={handleUndoDelete}
            sx={{ color: BRAND_PRIMARY }}
          >
            <UndoOutlined sx={{ fontSize: ICON_SIZE_LG }} />
          </IconButton>
        }
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: APP_SURFACE_ELEVATED,
            borderRadius: RADIUS_SM,
            border: `1px solid ${WHITE_14}`,
            color: 'text.primary',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </>
  );
}
