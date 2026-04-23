import { useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import EditOutlined from '@mui/icons-material/EditOutlined';
import CallSplitOutlined from '@mui/icons-material/CallSplitOutlined';
import MergeOutlined from '@mui/icons-material/MergeOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import ClosedCaptionOutlined from '@mui/icons-material/ClosedCaptionOutlined';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { glassSurfaceSx } from '../../../theme/surfaces';
import {
  GAP_DEFAULT,
  RADIUS_SM,
  ICON_SIZE_LG,
  WHITE_08,
  WHITE_14,
  BRAND_PRIMARY,
  CYAN_GLOW_SOFT,
  TEXT_SECONDARY,
} from '../../../theme/tokens';
import type { CaptionWord } from '../types';

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
  /** Frame atual do player (para highlight da frase ativa) */
  currentFrame?: number;
}

/** Frase agrupada para exibição no editor */
interface CaptionPhrase {
  words: CaptionWord[];
  startFrame: number;
  endFrame: number;
  text: string;
  index: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formata frame em MM:SS */
function formatTimestamp(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Agrupa CaptionWord[] em frases usando pontuação final ou limite de ~12 palavras.
 * Mesma lógica do SubtitleOverlay.
 */
function groupCaptionWordsIntoPhrases(words: CaptionWord[]): CaptionPhrase[] {
  if (words.length === 0) return [];

  const phrases: CaptionWord[][] = [];
  let current: CaptionWord[] = [];

  for (const word of words) {
    current.push(word);
    const isEndOfSentence = /[.!?]$/.test(word.text);
    if (isEndOfSentence || current.length >= 12) {
      phrases.push(current);
      current = [];
    }
  }

  if (current.length > 0) phrases.push(current);

  return phrases.map((group, index) => ({
    words: group,
    startFrame: group[0].startFrame,
    endFrame: group[group.length - 1].endFrame,
    text: group.map(w => w.text).join(' '),
    index,
  }));
}

/**
 * Parseia bold markdown (ex: "palavra **negrito** normal") em CaptionWord[].
 * Distribui o timing uniformemente pelo número de novas palavras.
 */
function parseEditedTextToWords(
  text: string,
  startFrame: number,
  endFrame: number,
): CaptionWord[] {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  const allWords: { text: string; bold: boolean }[] = [];

  for (const segment of segments) {
    if (!segment) continue;
    const isBold = segment.startsWith('**') && segment.endsWith('**');
    const clean = isBold ? segment.slice(2, -2) : segment;
    const words = clean.match(/\S+/g);
    if (words) {
      for (const w of words) {
        allWords.push({ text: w, bold: isBold });
      }
    }
  }

  if (allWords.length === 0) return [];

  // Distribui timing uniformemente
  const duration = endFrame - startFrame;
  const framePerWord = duration / allWords.length;

  return allWords.map((w, i) => ({
    text: w.text,
    startFrame: Math.round(startFrame + i * framePerWord),
    endFrame: Math.round(startFrame + (i + 1) * framePerWord),
    bold: w.bold,
  }));
}

// ---------------------------------------------------------------------------
// Componente de frase individual
// ---------------------------------------------------------------------------

interface PhraseRowProps {
  phrase: CaptionPhrase;
  isActive: boolean;
  isEditing: boolean;
  canMerge: boolean;
  canSplit: boolean;
  fps: number;
  editValue: string;
  onEditChange: (value: string) => void;
  onSeek: (frame: number) => void;
  onStartEdit: () => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onSplit: () => void;
  onMerge: () => void;
}

function PhraseRow({
  phrase,
  isActive,
  isEditing,
  canMerge,
  canSplit,
  fps,
  editValue,
  onEditChange,
  onSeek,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onSplit,
  onMerge,
}: PhraseRowProps) {
  const wordCount = phrase.words.length;

  return (
    <Box
      onClick={() => onSeek(phrase.startFrame)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: GAP_DEFAULT,
        p: 1.5,
        borderRadius: RADIUS_SM,
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        borderLeft: isActive ? `3px solid ${BRAND_PRIMARY}` : '3px solid transparent',
        backgroundColor: isActive
          ? CYAN_GLOW_SOFT
          : 'transparent',
        '&:hover': {
          backgroundColor: isActive
            ? CYAN_GLOW_SOFT
            : WHITE_08,
        },
      }}
    >
      {/* Timestamp */}
      <Chip
        label={`${formatTimestamp(phrase.startFrame, fps)} - ${formatTimestamp(phrase.endFrame, fps)}`}
        size="small"
        variant="outlined"
        onClick={(e) => { e.stopPropagation(); onSeek(phrase.startFrame); }}
        sx={{
          flexShrink: 0,
          fontSize: '0.7rem',
          fontFamily: 'JetBrains Mono, monospace',
          height: 24,
          borderColor: WHITE_14,
          color: TEXT_SECONDARY,
        }}
      />

      {/* Conteúdo da frase */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <TextField
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onConfirmEdit();
              }
              if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
            onClick={(e) => e.stopPropagation()}
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
              color: isActive ? 'text.primary' : 'text.secondary',
            }}
          >
            {phrase.words.map((w, i) => (
              <span key={i} style={{ fontWeight: w.bold ? 700 : 400 }}>
                {i > 0 ? ' ' : ''}{w.text}
              </span>
            ))}
          </Typography>
        )}

        <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
          {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
        </Typography>
      </Box>

      {/* Ações */}
      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
        {isEditing ? (
          <>
            <Tooltip title="Confirmar (Enter)">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onConfirmEdit(); }}
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
            <Tooltip title="Editar frase">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
              >
                <EditOutlined sx={{ fontSize: ICON_SIZE_LG }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dividir frase">
              <span>
                <IconButton
                  size="small"
                  disabled={!canSplit}
                  onClick={(e) => { e.stopPropagation(); onSplit(); }}
                >
                  <CallSplitOutlined sx={{ fontSize: ICON_SIZE_LG }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Mesclar com próxima">
              <span>
                <IconButton
                  size="small"
                  disabled={!canMerge}
                  onClick={(e) => { e.stopPropagation(); onMerge(); }}
                >
                  <MergeOutlined sx={{ fontSize: ICON_SIZE_LG }} />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function CaptionEditorPanel({
  captions,
  onUpdateCaptions,
  fps,
  onSeekToFrame,
  currentFrame,
}: CaptionEditorPanelProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Agrupa captions em frases (memoizado)
  const phrases = useMemo(
    () => groupCaptionWordsIntoPhrases(captions),
    [captions],
  );

  const hasCaptions = captions.length > 0;

  // ─── Ações ───────────────────────────────────────────────

  const handleSeek = useCallback((frame: number) => {
    onSeekToFrame?.(frame);
  }, [onSeekToFrame]);

  const handleStartEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setEditValue(phrases[index].text);
  }, [phrases]);

  const handleConfirmEdit = useCallback(() => {
    if (editingIndex === null) return;

    const phrase = phrases[editingIndex];
    const newWords = parseEditedTextToWords(
      editValue.trim(),
      phrase.startFrame,
      phrase.endFrame,
    );

    if (newWords.length === 0) {
      setEditingIndex(null);
      return;
    }

    // Substitui as palavras da frase editada, mantendo as outras intactas
    const allWordsBefore = phrases.slice(0, editingIndex).flatMap(p => p.words);
    const allWordsAfter = phrases.slice(editingIndex + 1).flatMap(p => p.words);
    onUpdateCaptions([...allWordsBefore, ...newWords, ...allWordsAfter]);

    setEditingIndex(null);
  }, [editingIndex, editValue, phrases, onUpdateCaptions]);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
  }, []);

  const handleSplit = useCallback((index: number) => {
    const phrase = phrases[index];
    if (phrase.words.length < 2) return;

    const midIndex = Math.ceil(phrase.words.length / 2);
    const firstHalf = phrase.words.slice(0, midIndex);
    const secondHalf = phrase.words.slice(midIndex);

    // A segunda metade começa no frame médio entre as duas
    const splitFrame = Math.round(
      (firstHalf[firstHalf.length - 1].endFrame + secondHalf[0].startFrame) / 2,
    );

    // Ajusta timing: primeira metade termina em splitFrame, segunda começa em splitFrame
    const adjustedFirst = firstHalf.map((w, i) => ({
      ...w,
      endFrame: i < firstHalf.length - 1
        ? w.endFrame
        : Math.max(w.startFrame + 1, splitFrame),
    }));

    const adjustedSecond = secondHalf.map((w, i) => ({
      ...w,
      startFrame: i === 0 ? splitFrame : w.startFrame,
      endFrame: phrase.endFrame,
    }));

    // Substitui as palavras da frase original pelas duas metades
    const allWordsBefore = phrases.slice(0, index).flatMap(p => p.words);
    const allWordsAfter = phrases.slice(index + 1).flatMap(p => p.words);
    onUpdateCaptions([...allWordsBefore, ...adjustedFirst, ...adjustedSecond, ...allWordsAfter]);
  }, [phrases, onUpdateCaptions]);

  const handleMerge = useCallback((index: number) => {
    if (index >= phrases.length - 1) return;

    const current = phrases[index];
    const next = phrases[index + 1];

    // Concatena palavras mantendo timing contínuo
    const mergedWords = [
      ...current.words,
      ...next.words,
    ];

    // Substitui as duas frases pela mesclada
    const allWordsBefore = phrases.slice(0, index).flatMap(p => p.words);
    const allWordsAfter = phrases.slice(index + 2).flatMap(p => p.words);
    onUpdateCaptions([...allWordsBefore, ...mergedWords, ...allWordsAfter]);
  }, [phrases, onUpdateCaptions]);

  // Recalcula phrases com as edições (para índices corretos)
  // Usa o phrases memoizado e as ações operam sobre ele

  return (
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
          <ClosedCaptionOutlined sx={{ fontSize: 22, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Editor de legendas
          </Typography>
          <Chip
            label="Manual"
            size="small"
            variant="outlined"
            sx={{ ml: 'auto', fontSize: '0.7rem', borderColor: WHITE_14, color: TEXT_SECONDARY }}
          />
        </Stack>

        <Divider sx={{ mb: 2, borderColor: WHITE_14 }} />

        {/* Lista de frases */}
        <Stack
          spacing={0.5}
          sx={{
            maxHeight: 420,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 3,
              backgroundColor: WHITE_08,
            },
          }}
        >
          {phrases.map((phrase, index) => {
            const isActive = currentFrame !== undefined
              && currentFrame >= phrase.startFrame
              && currentFrame < phrase.endFrame;

            return (
              <PhraseRow
                key={`${phrase.index}-${phrase.startFrame}`}
                phrase={phrase}
                isActive={isActive}
                isEditing={editingIndex === index}
                canMerge={index < phrases.length - 1}
                canSplit={phrase.words.length >= 2}
                fps={fps}
                editValue={editValue}
                onEditChange={setEditValue}
                onSeek={handleSeek}
                onStartEdit={() => handleStartEdit(index)}
                onConfirmEdit={handleConfirmEdit}
                onCancelEdit={handleCancelEdit}
                onSplit={() => handleSplit(index)}
                onMerge={() => handleMerge(index)}
              />
            );
          })}
        </Stack>

        {/* Rodapé informativo */}
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: TEXT_SECONDARY }}>
          {captions.length} palavras em {phrases.length} {phrases.length === 1 ? 'frase' : 'frases'}
          {' '}&middot;{' '}
          Clique em uma frase para pular no vídeo. Use **negrito** para destacar palavras.
        </Typography>
      </Box>
    </Collapse>
  );
}
