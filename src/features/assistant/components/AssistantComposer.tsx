import {
  type ChangeEvent,
  type FormEvent,
  type ForwardedRef,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import { AnimatePresence, motion } from 'motion/react';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import AttachFile from '@mui/icons-material/AttachFile';
import Close from '@mui/icons-material/Close';
import Description from '@mui/icons-material/Description';
import Image from '@mui/icons-material/Image';
import SendIcon from '@mui/icons-material/Send';
import Stop from '@mui/icons-material/Stop';
import Bolt from '@mui/icons-material/Bolt';
import Psychology from '@mui/icons-material/Psychology';
import Check from '@mui/icons-material/Check';
import { useLocale } from '../../../features/i18n';
import {
  ICON_SIZE_SM,
  ICON_SIZE_MD,
  WHITE_06,
  TEXT_DISABLED,
  ERROR_MAIN,
  SHADOW_DEEP,
  BRAND_PRIMARY, RADIUS_XS } from '../../../theme/tokens';
import {
  assistantComposerContainerSx,
  assistantAttachmentChipSx,
  assistantActionIconButtonSx,
  assistantSendButtonSx,
  assistantComposerInputRowSx,
  assistantComposerWrapperSx,
  assistantCyclingPlaceholderSx,
  assistantPlaceholderLetterSx,
  assistantComposerControlsSx,
} from './assistantUi';

// Placeholders que cycling a cada 3s — sem tradução (prompts de exemplo)
const PLACEHOLDERS = [
  'Como melhorar meu roteiro?',
  'Crie uma cena de suspense',
  'Resuma este trecho',
  'Sugira uma transição',
  'Como otimizar o ritmo?',
  'Gere uma narração',
];

interface AssistantComposerProps {
  pendingFiles: File[];
  isLoading: boolean;
  isThinkActive: boolean;
  interviewPending?: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedModel: 'fast' | 'specialist';
  selectedThinkingLevel: 'minimal' | 'low' | 'medium' | 'high';
  onSubmit: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onStopGeneration?: () => void;
  onThinkToggle?: () => void;
  onModelChange: (model: 'fast' | 'specialist') => void;
  onThinkingLevelChange: (level: 'minimal' | 'low' | 'medium' | 'high') => void;
}

/**
 * Handle imperativo do Composer — permite ao pai:
 * - Definir o texto do input (sugestões, ações)
 * - Ler o valor atual
 * - Focar o textarea
 * - Limpar o input (após submit)
 *
 * Movido para dentro do componente via useState local para evitar
 * re-render do componente raiz a cada keystroke (recomendação React
 * "move state down").
 */
export interface AssistantComposerHandle {
  setValue: (value: string) => void;
  getValue: () => string;
  focus: () => void;
  clear: () => void;
}

function AssistantComposerInner(
  {
    pendingFiles,
    isLoading,
    isThinkActive,
    interviewPending = false,
    fileInputRef,
    selectedModel,
    selectedThinkingLevel,
    onSubmit,
    onFileChange,
    onRemoveFile,
    onStopGeneration,
    onThinkToggle,
    onModelChange,
    onThinkingLevelChange,
  }: AssistantComposerProps,
  ref: ForwardedRef<AssistantComposerHandle>,
) {
  const { t } = useLocale();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Ref paralela ao state para leitura síncrona fora do ciclo de render
  // (necessário porque useImperativeHandle com closure no getValue
  // retornaria valor stale até o próximo render)
  const inputValueRef = useRef('');
  const [input, setInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [thinkingMenuAnchor, setThinkingMenuAnchor] = useState<HTMLElement | null>(null);
  const [modelMenuAnchor, setModelMenuAnchor] = useState<HTMLElement | null>(null);

  // Expõe API imperativa para o pai controlar o input (sugestões, ações).
  // Mantém identidade estável (sem deps) — usa ref para leitura síncrona.
  useImperativeHandle(ref, () => ({
    setValue: (value: string) => {
      inputValueRef.current = value;
      setInput(value);
      // Foca e posiciona o cursor no final — UX esperada quando o app
      // preenche o input via sugestão
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        const len = value.length;
        textareaRef.current?.setSelectionRange(len, len);
      });
    },
    getValue: () => inputValueRef.current,
    focus: () => textareaRef.current?.focus(),
    clear: () => {
      inputValueRef.current = '';
      setInput('');
    },
  }), []);

  // Cycling placeholder quando input está inativo — intervalo de 3.5s para ritmo mais calmo
  useEffect(() => {
    if (isFocused || input) return;

    const interval = setInterval(() => {
      setShowPlaceholder(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        setShowPlaceholder(true);
      }, 350);
    }, 3500);

    return () => clearInterval(interval);
  }, [isFocused, input]);

  const isExpanded = isFocused || input.length > 0 || Boolean(thinkingMenuAnchor);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    inputValueRef.current = value;
    setInput(value);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  const canSend = (input.trim().length > 0 || pendingFiles.length > 0) && !isLoading && !interviewPending;

  // Letter animation variants — blur + translateY com spring suave
  const letterVariants = {
    initial: { opacity: 0, filter: 'blur(10px)', y: 8 },
    animate: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { opacity: { duration: 0.3 }, filter: { duration: 0.45 }, y: { type: 'spring' as const, stiffness: 70, damping: 18 } },
    },
    exit: {
      opacity: 0,
      filter: 'blur(10px)',
      y: -8,
      transition: { opacity: { duration: 0.2 }, filter: { duration: 0.3 }, y: { type: 'spring' as const, stiffness: 70, damping: 18 } },
    },
  };

  const containerVariants = {
    collapsed: {
      height: 68,
      boxShadow: `0 2px 8px 0 ${alpha(SHADOW_DEEP, 0.12)}`,
      transition: { type: 'spring' as const, stiffness: 120, damping: 18 },
    },
    expanded: {
      height: 104,
      boxShadow: `0 8px 32px 0 ${alpha(SHADOW_DEEP, 0.24)}`,
      transition: { type: 'spring' as const, stiffness: 120, damping: 18 },
    },
  };

  const controlsVariants = {
    hidden: { opacity: 0, y: 12, pointerEvents: 'none' as const, transition: { duration: 0.2 } },
    visible: { opacity: 1, y: 0, pointerEvents: 'auto' as const, transition: { duration: 0.3, delay: 0.06 } },
  };

  const handleThinkingMenuOpen = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setThinkingMenuAnchor(event.currentTarget);
  };

  const handleThinkingMenuClose = () => setThinkingMenuAnchor(null);

  const handleThinkingSelect = (level: 'minimal' | 'low' | 'medium' | 'high') => {
    onThinkingLevelChange(level);
    handleThinkingMenuClose();
  };

  const thinkingLabels: Record<'minimal' | 'low' | 'medium' | 'high', string> = {
    minimal: t('assistant.composer.thinkingMinimal'),
    low: t('assistant.composer.thinkingLow'),
    medium: t('assistant.composer.thinkingMedium'),
    high: t('assistant.composer.thinkingHigh'),
  };

  const modelLabels: Record<'fast' | 'specialist', string> = {
    fast: t('assistant.composer.modelFast'),
    specialist: t('assistant.composer.modelSpecialist'),
  };

  const handleModelMenuOpen = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setModelMenuAnchor(event.currentTarget);
  };

  const handleModelMenuClose = () => setModelMenuAnchor(null);

  const handleModelSelect = (model: 'fast' | 'specialist') => {
    onModelChange(model);
    handleModelMenuClose();
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={(theme) => assistantComposerContainerSx(theme)}
    >
      <Box
        component={motion.div}
        ref={wrapperRef}
        variants={containerVariants}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        initial="collapsed"
        sx={assistantComposerWrapperSx}
        onMouseDown={(e: React.MouseEvent) => {
          // Previne que cliques nos botões internos tirem o foco do textarea
          const target = e.target as HTMLElement;
          if (target.tagName === 'BUTTON' || target.closest('button')) {
            e.preventDefault();
          }
        }}
      >
        {/* File chips */}
        {pendingFiles.length > 0 ? (
          <Box sx={{ px: 1.5, pt: 1.25 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {pendingFiles.map((file, index) => {
                const isImage = file.type.startsWith('image/');

                return (
                  <Chip
                    key={`${file.name}-${index}`}
                    icon={isImage
                      ? <Image sx={{ fontSize: ICON_SIZE_SM }} />
                      : <Description sx={{ fontSize: ICON_SIZE_SM }} />}
                    label={file.name}
                    onDelete={() => onRemoveFile(index)}
                    deleteIcon={<Close sx={{ fontSize: ICON_SIZE_SM }} />}
                    variant="outlined"
                    size="small"
                    sx={assistantAttachmentChipSx}
                  />
                );
              })}
            </Stack>
          </Box>
        ) : null }

        <Box sx={assistantComposerInputRowSx}>
          <input
            type="file"
            id="assistant-file-input"
            ref={fileInputRef}
            onChange={onFileChange}
            hidden
            multiple
            accept="image/*,.pdf,.txt"
          />

          <Tooltip title={t('assistant.composer.attachFile')}>
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              edge="start"
              aria-label={t('assistant.composer.attachFileAria')}
              size="small"
              sx={{
                color: TEXT_DISABLED,
                '&:hover': { color: 'text.secondary', backgroundColor: alpha(WHITE_06, 0.5) },
              }}
            >
              <AttachFile sx={{ fontSize: ICON_SIZE_MD }} />
            </IconButton>
          </Tooltip>

          {/* Text Input & Cycling Placeholder */}
          <Box sx={{ position: 'relative', flex: 1 }}>
            {/* Cycling placeholder — layer absoluto com letter-by-letter animation */}
            <AnimatePresence mode="wait">
              {showPlaceholder && !isFocused && !input && (
                <Box
                  key={placeholderIndex}
                  component={motion.div}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  sx={assistantCyclingPlaceholderSx}
                >
                  {PLACEHOLDERS[placeholderIndex].split('').map((char, i) => (
                    <Box component="span" key={i} sx={assistantPlaceholderLetterSx}>
                      <motion.span variants={letterVariants}>
                        {char === ' ' ? '\u00A0' : char }
                      </motion.span>
                    </Box>
                  ))}
                </Box>
              )}
            </AnimatePresence>

            {/* Plain textarea — placeholder renderizado via layer absoluto */}
            <textarea
              id="assistant-chat-input"
              name="chat-message"
              rows={1}
              placeholder={interviewPending ? t('assistant.composer.interviewPending') : undefined }
              aria-label={interviewPending ? t('assistant.composer.interviewPending') : t('assistant.composer.placeholder')}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              ref={textareaRef}
              onFocus={() => setIsFocused(true)}
              onBlur={(e) => {
                // Não perde foco se o relatedTarget está dentro do wrapper
                // (ex: clicou no botão do dropdown)
                const related = e.relatedTarget as Node | null;
                if (related && wrapperRef.current?.contains(related)) return;
                setIsFocused(false);
              }}
              disabled={interviewPending}
              style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                color: 'inherit',
                padding: 0,
                minHeight: 24,
                maxHeight: 144,
                overflowY: 'auto' as const,
                width: '100%',
              }}
            />
          </Box>

          {/* Send / Stop button */}
          {isLoading ? (
            <Tooltip title={t('assistant.composer.stopGeneration')}>
              <IconButton
                onClick={onStopGeneration || onSubmit }
                aria-label={t('assistant.composer.stopGeneration')}
                size="small"
                sx={{
                  ...assistantActionIconButtonSx,
                  minWidth: 40,
                  width: 40,
                  height: 40,
                  backgroundColor: 'error.main',
                  boxShadow: `0 4px 16px ${alpha(ERROR_MAIN, 0.24)}`,
                  '&:hover': {
                    ...assistantActionIconButtonSx['&:hover'],
                    backgroundColor: 'error.dark',
                    boxShadow: `0 6px 24px ${alpha(ERROR_MAIN, 0.36)}`,
                  },
                }}
              >
                <Stop sx={{ fontSize: ICON_SIZE_SM }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={!canSend }
              aria-label={t('assistant.composer.send')}
              endIcon={<SendIcon sx={{ fontSize: ICON_SIZE_SM }} />}
              sx={assistantSendButtonSx}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('assistant.composer.send')}
              </Box>
            </Button>
          )}
        </Box>

        {/* Expanded Controls Row */}
        <Box
          component={motion.div}
          variants={controlsVariants}
          initial="hidden"
          animate={isExpanded ? 'visible' : 'hidden'}
          sx={assistantComposerControlsSx}
        >
          {/* Model Selector Chip */}
           <Chip
             icon={selectedModel === 'fast'
               ? <Bolt sx={{ fontSize: ICON_SIZE_SM }} />
               : <Psychology sx={{ fontSize: ICON_SIZE_SM }} />}
             label={modelLabels[selectedModel]}
             onClick={handleModelMenuOpen}
             variant="outlined"
             size="small"
             title={t('assistant.composer.modelSelectorLabel')}
             sx={{
               fontWeight: 500,
               fontSize: '0.8125rem',
               '& .MuiChip-icon': {
                 color: selectedModel === 'fast' ? '#f59e0b' : '#60a5fa',
               },
             }}
           />

          {/* Thinking Level Chip */}
          <Chip
            icon={<Psychology sx={{ fontSize: ICON_SIZE_SM }} />}
            label={thinkingLabels[selectedThinkingLevel]}
            onClick={handleThinkingMenuOpen}
            variant="outlined"
            size="small"
            title={t('assistant.composer.thinkingSelectorLabel')}
            sx={{
              fontWeight: 500,
              fontSize: '0.8125rem',
              '& .MuiChip-icon': { color: '#60a5fa' },
            }}
          />

          {/* Think Toggle Chip */}
          {onThinkToggle ? (
            <Chip
              icon={<AutoAwesome sx={{ fontSize: ICON_SIZE_SM }} />}
              label={t('assistant.composer.think')}
              onClick={(e) => { e.stopPropagation(); onThinkToggle(); }}
              variant={isThinkActive ? 'filled' : 'outlined'}
              color={isThinkActive ? 'primary' : 'default'}
              size="small"
              sx={{
                fontWeight: 500,
                fontSize: '0.8125rem',
              }}
            />
          ) : null }
        </Box>

        {/* Thinking Level Menu — abre para cima */}
        <Menu
          anchorEl={thinkingMenuAnchor}
          open={Boolean(thinkingMenuAnchor)}
          onClose={handleThinkingMenuClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: (theme) => ({
                mt: 1,
                minWidth: 140,
                borderRadius: RADIUS_XS,
                backgroundColor: alpha(theme.palette.background.paper, 0.96),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(BRAND_PRIMARY, 0.15)}`,
                boxShadow: `0 8px 32px ${alpha(SHADOW_DEEP, 0.24)}`,
              }),
            },
          }}
        >
          {(['minimal', 'low', 'medium', 'high'] as const).map((level) => (
            <MenuItem
              key={level}
              onClick={() => handleThinkingSelect(level)}
              selected={selectedThinkingLevel === level }
            >
              <ListItemText primary={thinkingLabels[level]} />
              {selectedThinkingLevel === level && <Check sx={{ fontSize: ICON_SIZE_SM, color: BRAND_PRIMARY }} />}
            </MenuItem>
          ))}
        </Menu>

        {/* Model Selector Menu */}
        <Menu
          anchorEl={modelMenuAnchor}
          open={Boolean(modelMenuAnchor)}
          onClose={handleModelMenuClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: (theme) => ({
                mt: 1,
                minWidth: 140,
                borderRadius: RADIUS_XS,
                backgroundColor: alpha(theme.palette.background.paper, 0.96),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(BRAND_PRIMARY, 0.15)}`,
                boxShadow: `0 8px 32px ${alpha(SHADOW_DEEP, 0.24)}`,
              }),
            },
          }}
        >
          {(['fast', 'specialist'] as const).map((model) => (
            <MenuItem
              key={model}
              onClick={() => handleModelSelect(model)}
              selected={selectedModel === model }
            >
              <ListItemText primary={modelLabels[model]} />
              {selectedModel === model && <Check sx={{ fontSize: ICON_SIZE_SM, color: BRAND_PRIMARY }} />}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
}

export const AssistantComposer = React.memo(forwardRef<AssistantComposerHandle, AssistantComposerProps>(
  AssistantComposerInner,
));
