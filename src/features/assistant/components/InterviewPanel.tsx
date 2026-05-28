import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Check from '@mui/icons-material/Check';
import Send from '@mui/icons-material/Send';
import type { InterviewDatum, InterviewQuestion } from '../types';
import { assistantInsetSx } from './assistantUi';
import { useLocale } from '../../i18n';
import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  APP_BORDER,
  ICON_SIZE_SM,
  TEXT_SECONDARY,
  RADIUS_XS,
  GAP_COMPACT,
  GAP_DEFAULT,
} from '../../../theme/tokens';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface InterviewPanelProps {
  interview: InterviewDatum;
  onAnswer: (answer: string, answers?: string[]) => void;
}

/** Estado de uma única pergunta */
interface QuestionState {
  selectedIndices: Set<number>;
  isCustomMode: boolean;
  customText: string;
}

function createQuestionState(): QuestionState {
  return { selectedIndices: new Set(), isCustomMode: false, customText: '' };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retorna as perguntas efetivas (array ou pergunta única) */
function getEffectiveQuestions(interview: InterviewDatum): InterviewQuestion[] {
  if (interview.questions && interview.questions.length > 0) {
    return interview.questions;
  }
  // Fallback: pergunta única
  return [{
    question: interview.question,
    options: interview.options,
    multiple: interview.multiple,
  }];
}

/** Constrói a resposta para uma pergunta */
function buildAnswerForQuestion(
  question: InterviewQuestion,
  state: QuestionState,
): string {
  if (state.isCustomMode && state.customText.trim()) {
    return state.customText.trim();
  }

  const options = question.options ?? [];
  const selected = Array.from(state.selectedIndices)
    .filter((i) => i < options.length)
    .map((i) => options[i].label);

  return selected.join(', ');
}

// ---------------------------------------------------------------------------
// Subcomponente: SingleQuestion
// ---------------------------------------------------------------------------

interface SingleQuestionProps {
  question: InterviewQuestion;
  state: QuestionState;
  onStateChange: (state: QuestionState) => void;
  focusKey: number;
}

function SingleQuestion({ question, state, onStateChange, focusKey }: SingleQuestionProps) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const options = useMemo(() => question.options ?? [], [question.options]);
  const isMultiple = question.multiple === true;
  const hasOptions = options.length > 0;
  const customOptionIndex = hasOptions ? options.length : -1;
  const totalItems = hasOptions ? options.length + 1 : 0;

  // Reseta foco quando a pergunta muda
  useEffect(() => {
    setFocusedIndex(0);
  }, [focusKey]);

  // Foca o container quando não está em modo custom
  useEffect(() => {
    if (!state.isCustomMode && containerRef.current) {
      containerRef.current.focus();
    }
  }, [state.isCustomMode, focusKey]);

  const updateState = useCallback((updates: Partial<QuestionState>) => {
    onStateChange({ ...state, ...updates });
  }, [state, onStateChange]);

  const handleOptionToggle = useCallback((index: number) => {
    const newSelected = new Set(state.selectedIndices);

    if (isMultiple) {
      // Toggle: adiciona ou remove
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      onStateChange({ ...state, selectedIndices: newSelected, isCustomMode: false, customText: '' });
    } else {
      // Single select: substitui
      onStateChange({ ...state, selectedIndices: new Set([index]), isCustomMode: false, customText: '' });
    }
  }, [state, isMultiple, onStateChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (state.isCustomMode) {
      if (event.key === 'Enter' && !event.shiftKey && state.customText.trim()) {
        event.preventDefault();
        // Em modo custom, seleciona o texto como resposta
        onStateChange({ ...state, selectedIndices: new Set() });
      } else if (event.key === 'Escape') {
        event.preventDefault();
        updateState({ isCustomMode: false, customText: '' });
      }
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % totalItems);
        break;
      case 'Enter':
        event.preventDefault();
        if (focusedIndex === customOptionIndex) {
          updateState({ isCustomMode: true });
        } else if (hasOptions) {
          handleOptionToggle(focusedIndex);
        }
        break;
      case ' ':
        // Space togglea o checkbox/radio no índice focado
        if (focusedIndex < options.length) {
          event.preventDefault();
          handleOptionToggle(focusedIndex);
        }
        break;
    }
  }, [state, focusedIndex, totalItems, customOptionIndex, hasOptions, options, updateState, onStateChange, handleOptionToggle]);

  const handleCustomClick = useCallback(() => {
    updateState({ isCustomMode: true });
  }, [updateState]);

  const handleCustomSubmit = useCallback(() => {
    if (state.customText.trim()) {
      onStateChange({ ...state, selectedIndices: new Set() });
    }
  }, [state, onStateChange]);

  // Renderiza campo custom quando não há opções ou em modo custom
  if (!hasOptions || state.isCustomMode) {
    return (
      <Stack spacing={GAP_COMPACT}>
        {state.isCustomMode && hasOptions ? (
          <Button
            size="small"
            startIcon={<ArrowBack sx={{ fontSize: ICON_SIZE_SM }} />}
            onClick={() => {
              updateState({ isCustomMode: false, customText: '' });
              containerRef.current?.focus();
            }}
            sx={{
              alignSelf: 'flex-start',
              color: TEXT_SECONDARY,
              textTransform: 'none',
              fontSize: '0.75rem',
              minWidth: 0,
              py: 0,
            }}
          >
            {t('assistant.interview.backToOptions')}
          </Button>
        ) : null}
        <Stack direction="row" spacing={1}>
          <TextField
            inputRef={(el) => {
              customInputRef.current = el;
              if (state.isCustomMode && el) {
                requestAnimationFrame(() => el.focus());
              }
            }}
            value={state.customText}
            onChange={(e) => updateState({ customText: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && state.customText.trim()) {
                e.preventDefault();
                handleCustomSubmit();
              }
            }}
            size="small"
            fullWidth
            placeholder={t('assistant.interview.placeholder')}
            aria-label={t('assistant.interview.placeholder')}
          />
          <Button
            variant="contained"
            onClick={handleCustomSubmit}
            disabled={!state.customText.trim()}
            sx={{ flexShrink: 0, minWidth: 40, px: 1.5 }}
          >
            <Send sx={{ fontSize: ICON_SIZE_SM }} />
          </Button>
        </Stack>
      </Stack>
    );
  }

  // Renderiza lista de opções
  return (
    <Stack
      spacing={0.5}
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role={isMultiple ? 'group' : 'radiogroup'}
      aria-label={question.question}
      sx={{
        outline: 'none',
        '&:focus-visible': {
          borderRadius: RADIUS_XS,
          boxShadow: `0 0 0 2px ${BRAND_PRIMARY_GLOW_SOFT}`,
        },
      }}
    >
      {options.map((option, index) => {
        const isSelected = state.selectedIndices.has(index);
        const isFocused = index === focusedIndex;

        return (
          <Box
            key={option.label}
            role={isMultiple ? 'checkbox' : 'radio'}
            aria-checked={isSelected}
            onClick={() => handleOptionToggle(index)}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              px: 1.25,
              py: 0.75,
              borderRadius: RADIUS_XS,
              cursor: 'pointer',
              border: `1px solid ${isSelected ? BRAND_PRIMARY : isFocused ? alpha(BRAND_PRIMARY, 0.4) : 'transparent'}`,
              bgcolor: isSelected ? alpha(BRAND_PRIMARY, 0.1) : isFocused ? alpha(BRAND_PRIMARY, 0.04) : 'transparent',
              transition: 'all 150ms ease',
              '&:hover': {
                bgcolor: alpha(BRAND_PRIMARY, 0.06),
                borderColor: alpha(BRAND_PRIMARY, 0.4),
              },
            }}
          >
            {isMultiple ? (
              <Checkbox
                checked={isSelected}
                size="small"
                slotProps={{ input: { 'aria-label': option.label } }}
                sx={{
                  p: 0,
                  mt: 0.25,
                  color: isSelected ? BRAND_PRIMARY : APP_BORDER,
                  '&.Mui-checked': { color: BRAND_PRIMARY },
                }}
              />
            ) : (
              <Radio
                checked={isSelected}
                size="small"
                slotProps={{ input: { 'aria-label': option.label } }}
                sx={{
                  p: 0,
                  mt: 0.25,
                  color: isSelected ? BRAND_PRIMARY : APP_BORDER,
                  '&.Mui-checked': { color: BRAND_PRIMARY },
                }}
              />
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
                {option.label}
              </Typography>
              {option.description ? (
                <Typography variant="caption" sx={{ color: TEXT_SECONDARY, lineHeight: 1.4 }}>
                  {option.description}
                </Typography>
              ) : null}
            </Box>
          </Box>
        );
      })}

      {/* Opção "Outra resposta" */}
      <Box
        role={isMultiple ? 'checkbox' : 'radio'}
        aria-checked={state.isCustomMode}
        onClick={handleCustomClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 0.75,
          borderRadius: RADIUS_XS,
          cursor: 'pointer',
          border: `1px solid ${customOptionIndex === focusedIndex ? BRAND_PRIMARY : 'transparent'}`,
          bgcolor: customOptionIndex === focusedIndex ? alpha(BRAND_PRIMARY, 0.04) : 'transparent',
          transition: 'all 150ms ease',
          '&:hover': {
            bgcolor: alpha(BRAND_PRIMARY, 0.06),
            borderColor: alpha(BRAND_PRIMARY, 0.4),
          },
        }}
      >
        {isMultiple ? (
          <Checkbox
            checked={false}
            size="small"
            slotProps={{ input: { 'aria-label': t('assistant.interview.otherAnswer') } }}
            sx={{ p: 0, color: APP_BORDER }}
          />
        ) : (
          <Radio
            checked={false}
            size="small"
            slotProps={{ input: { 'aria-label': t('assistant.interview.otherAnswer') } }}
            sx={{ p: 0, color: APP_BORDER }}
          />
        )}
        <Typography variant="body2" sx={{ fontWeight: 500, color: TEXT_SECONDARY, fontStyle: 'italic' }}>
          {t('assistant.interview.otherAnswer')}
        </Typography>
      </Box>

      {/* Dica de teclado */}
      <Typography
        variant="caption"
        sx={{ color: TEXT_SECONDARY, opacity: 0.6, mt: 0.5, fontSize: '0.65rem' }}
      >
        {isMultiple
          ? t('assistant.interview.keyboardHintMultiple')
          : t('assistant.interview.keyboardHint')}
      </Typography>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Componente principal: InterviewPanel
// ---------------------------------------------------------------------------

/**
 * Painel de entrevista com suporte a:
 * - Single-select (radio) e multi-select (checkboxes)
 * - Single-question e multi-question (tabs + confirmação em lote)
 * - Navegação por teclado (↑↓ + Enter/Space)
 * - "Outra resposta" como opção oculta
 */
export function InterviewPanel({ interview, onAnswer }: InterviewPanelProps) {
  const { t } = useLocale();
  const questions = useMemo(() => getEffectiveQuestions(interview), [interview]);
  const isMultiQuestion = questions.length > 1;

  // Estado de cada pergunta
  const [questionStates, setQuestionStates] = useState<QuestionState[]>(
    () => questions.map(() => createQuestionState()),
  );
  const [activeTab, setActiveTab] = useState(0);

  // Reseta quando a entrevista muda
  useEffect(() => {
    setQuestionStates(questions.map(() => createQuestionState()));
    setActiveTab(0);
  }, [interview.question, questions.length, questions]);

  const updateQuestionState = useCallback((index: number, state: QuestionState) => {
    setQuestionStates((prev) => {
      const next = [...prev];
      next[index] = state;
      return next;
    });
  }, []);

  // Verifica se uma pergunta tem resposta válida
  const isQuestionAnswered = useCallback((index: number): boolean => {
    const state = questionStates[index];
    const question = questions[index];
    if (!state || !question) return false;

    if (state.isCustomMode) {
      return state.customText.trim().length > 0;
    }

    return state.selectedIndices.size > 0;
  }, [questionStates, questions]);

  // Todas as perguntas respondidas?
  const allAnswered = useMemo(
    () => questions.every((_, i) => isQuestionAnswered(i)),
    [questions, isQuestionAnswered],
  );

  // Conta de respondidas
  const answeredCount = useMemo(
    () => questions.filter((_, i) => isQuestionAnswered(i)).length,
    [questions, isQuestionAnswered],
  );

  // Envia resposta (single ou multi)
  const handleSubmit = useCallback(() => {
    if (isMultiQuestion) {
      // Multi-question: envia array de respostas
      const answers = questions.map((q, i) => buildAnswerForQuestion(q, questionStates[i]));
      const primaryAnswer = answers[activeTab] ?? answers[0] ?? '';
      onAnswer(primaryAnswer, answers);
    } else {
      // Single-question: envia resposta única
      const answer = buildAnswerForQuestion(questions[0], questionStates[0]);
      onAnswer(answer);
    }
  }, [isMultiQuestion, questions, questionStates, activeTab, onAnswer]);

  // Single-question: envia imediatamente ao selecionar (apenas single-select, single-question)
  const handleSingleQuestionAnswer = useCallback((index: number, state: QuestionState) => {
    const question = questions[index];
    if (!question) return;

    updateQuestionState(index, state);

    // Envio imediato APENAS para single-question + single-select
    // Multi-select e multi-question exigem confirmação explícita
    if (!question.multiple && !isMultiQuestion && state.selectedIndices.size > 0) {
      const answer = buildAnswerForQuestion(question, state);
      if (answer) {
        onAnswer(answer);
      }
    }
  }, [questions, isMultiQuestion, updateQuestionState, onAnswer]);

  // Tab navigation para multi-question
  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleNextTab = useCallback(() => {
    if (activeTab < questions.length) {
      setActiveTab((prev) => prev + 1);
    }
  }, [activeTab, questions.length]);

  const handlePrevTab = useCallback(() => {
    if (activeTab > 0) {
      setActiveTab((prev) => prev - 1);
    }
  }, [activeTab]);

  // Renderiza aba de confirmação (última tab)
  const renderConfirmTab = () => (
    <Stack spacing={GAP_DEFAULT}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: TEXT_SECONDARY }}>
        {t('assistant.interview.confirmDescription')}
      </Typography>
      {questions.map((question, index) => {
        const answer = buildAnswerForQuestion(question, questionStates[index]);
        return (
          <Box
            key={index}
            sx={{
              px: 1.25,
              py: 1,
              borderRadius: RADIUS_XS,
              border: `1px solid ${APP_BORDER}`,
              bgcolor: (theme) => alpha(theme.palette.background.default, 0.34),
            }}
          >
            <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontWeight: 600 }}>
              {t('assistant.interview.questionNumber', { number: index + 1 })}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>
              {question.question}
            </Typography>
            <Typography variant="body2" sx={{ color: answer ? BRAND_PRIMARY : TEXT_SECONDARY, mt: 0.5, fontWeight: 600 }}>
              {answer || t('assistant.interview.notAnswered')}
            </Typography>
          </Box>
        );
      })}
      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!allAnswered}
        endIcon={<Check sx={{ fontSize: ICON_SIZE_SM }} />}
        sx={{ alignSelf: 'flex-end' }}
      >
        {t('assistant.interview.confirm')}
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
      <Box
        sx={(theme) => ({
          ...assistantInsetSx(theme),
          p: { xs: 1.5, md: 2 },
          borderColor: alpha(BRAND_PRIMARY, 0.3),
        })}
      >
        <Stack spacing={GAP_DEFAULT}>
          {/* Cabeçalho */}
          <Stack direction="row" spacing={GAP_COMPACT} sx={{ alignItems: 'center' }}>
            <Chip
              label={t('assistant.interview.badge')}
              size="small"
              sx={{
                bgcolor: alpha(BRAND_PRIMARY, 0.12),
                color: BRAND_PRIMARY,
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22,
              }}
            />
            {isMultiQuestion ? (
              <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
                {t('assistant.interview.questionCount', { answered: answeredCount, total: questions.length })}
              </Typography>
            ) : null}
          </Stack>

          {/* Tabs para multi-question */}
          {isMultiQuestion ? (
            <>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 36,
                  '& .MuiTab-root': {
                    minHeight: 36,
                    py: 0,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    minWidth: 'auto',
                    px: 1.5,
                  },
                  '& .MuiTabs-indicator': {
                    height: 2,
                  },
                }}
              >
                {questions.map((q, index) => (
                  <Tab
                    key={index}
                    label={
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {t('assistant.interview.questionNumber', { number: index + 1 })}
                        </Typography>
                        {isQuestionAnswered(index) ? (
                          <Check sx={{ fontSize: 14, color: 'success.main' }} />
                        ) : null}
                      </Stack>
                    }
                  />
                ))}
                <Tab
                  label={
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {t('assistant.interview.confirmTab')}
                    </Typography>
                  }
                />
              </Tabs>

              {/* Conteúdo da tab ativa */}
              {activeTab < questions.length ? (
                <SingleQuestion
                  question={questions[activeTab]}
                  state={questionStates[activeTab]}
                  onStateChange={(state) => handleSingleQuestionAnswer(activeTab, state)}
                  focusKey={activeTab}
                />
              ) : (
                renderConfirmTab()
              )}

              {/* Navegação entre tabs */}
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                <Button
                  size="small"
                  startIcon={<ArrowBack sx={{ fontSize: ICON_SIZE_SM }} />}
                  onClick={handlePrevTab}
                  disabled={activeTab === 0}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  {t('assistant.interview.previous')}
                </Button>
                {activeTab < questions.length ? (
                  <Button
                    size="small"
                    endIcon={<ArrowForward sx={{ fontSize: ICON_SIZE_SM }} />}
                    onClick={handleNextTab}
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    {activeTab === questions.length - 1
                      ? t('assistant.interview.reviewAnswers')
                      : t('assistant.interview.next')}
                  </Button>
                ) : null}
              </Stack>
            </>
          ) : (
            /* Single question */
            <>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.5 }}>
                {questions[0].question}
              </Typography>
              <SingleQuestion
                question={questions[0]}
                state={questionStates[0]}
                onStateChange={(state) => handleSingleQuestionAnswer(0, state)}
                focusKey={0}
              />
              {/* Botão de envio para multiple single-question */}
              {questions[0].multiple ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!isQuestionAnswered(0)}
                  endIcon={<Send sx={{ fontSize: ICON_SIZE_SM }} />}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  {t('assistant.interview.send')}
                </Button>
              ) : null}
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
