import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Check from '@mui/icons-material/Check';
import Mic from '@mui/icons-material/Mic';
import { MAX_CHARS } from '../lib/constants';
import { resolveActiveScene } from '../lib/scene';
import type { StudioScene } from '../features/studio/types';
import { glassPanelSx } from '../theme/surfaces';
import { ICON_SIZE_LG, ICON_SIZE_MD, GAP_MEDIUM, GAP_COMPACT, BLACK_18, BLACK_24, WHITE_16 } from '../theme/tokens';

export interface ScriptEditorProps {
  script: string;
  setScript: (script: string) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  isGenerateDisabled: boolean;
  scenes?: StudioScene[];
  currentTime?: number;
}

export function ScriptEditor({ 
  script, 
  setScript, 
  isGenerating,
  handleGenerate,
  isGenerateDisabled,
  scenes = [],
  currentTime = 0
}: ScriptEditorProps) {
  const currentScene = useMemo(
    () => resolveActiveScene(scenes, currentTime),
    [scenes, currentTime],
  );

  const isOverLimit = script.length > MAX_CHARS;
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Callbacks estáveis — evita nova referência a cada render,
  // prevenindo dessincronia interna no TextareaAutosize do MUI v9
  const handleScriptChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setScript(event.target.value),
    [setScript],
  );

  const handleClearScript = useCallback(() => setScript(''), [setScript]);

  const handleCopyScript = useCallback(async () => {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script);
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      // Clipboard API pode falhar em contextos restritos — falha silenciosa
    }
  }, [script]);

  // Atalho Ctrl+Enter (ou Cmd+Enter no Mac) para gerar áudio.
  // Não dispara quando o foco está no textarea de edição — lá Enter
  // serve para nova linha, Ctrl+Enter é o atalho esperado.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter') return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (isGenerateDisabled || isGenerating) return;

      event.preventDefault();
      handleGenerate();
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isGenerateDisabled, isGenerating, handleGenerate]);

  return (
    <Stack component="section" spacing={2} ref={containerRef}>
      <Paper
        elevation={0}
        sx={(theme): SystemStyleObject<Theme> => ({
          ...glassPanelSx(theme),
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: '52vh', sm: '60vh', lg: 'calc(100vh - 12rem)' },
        })}
      >
        {currentScene && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              backgroundImage: `url(${currentScene.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.36,
              transition: 'opacity 0.6s ease',
            }}
          />
        )}

        <Box
          sx={(theme) => ({
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.92)} 0%, ${alpha(theme.palette.background.paper, 0.18)} 24%, ${alpha(theme.palette.background.paper, 0.58)} 100%)`,
          })}
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={GAP_MEDIUM}
          sx={{
            px: { xs: 2.5, sm: 3 },
            pt: { xs: 2.5, sm: 3 },
            pb: 1.5,
            position: 'relative',
            zIndex: 2,
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Stack spacing={GAP_COMPACT}>
            <Typography variant="overline" id="script-label" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
              Script
            </Typography>
            {currentScene ? (
              <Chip
                label="Cena visual sincronizada com a escrita"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
              />
            ) : null}
          </Stack>

          <Stack
            direction="row"
            spacing={GAP_MEDIUM}
            useFlexGap
            sx={{ flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, alignItems: 'center' }}
          >
            {script.length > 0 && !isGenerating && (
              <Stack direction="row" spacing={GAP_COMPACT}>
                <Tooltip title={copiedScript ? 'Copiado!' : 'Copiar roteiro'}>
                  <IconButton
                    onClick={() => void handleCopyScript()}
                    size="small"
                    aria-label="Copiar roteiro"
                    color={copiedScript ? 'success' : 'inherit'}
                  >
                    {copiedScript ? <Check sx={{ fontSize: ICON_SIZE_MD }} /> : <ContentCopy sx={{ fontSize: ICON_SIZE_MD }} />}
                  </IconButton>
                </Tooltip>
                <Button
                  variant="text"
                  color="inherit"
                  onClick={handleClearScript}
                  aria-label="Limpar roteiro"
                  sx={{ minHeight: 40 }}
                >
                  Limpar
                </Button>
              </Stack>
            )}

            <Typography
              variant="caption"
              component="div"
              sx={{
                fontFamily: 'monospace',
                color: isOverLimit ? 'error.main' : 'text.secondary',
                letterSpacing: '0.08em',
              }}
              aria-label={`${script.length} de ${MAX_CHARS} caracteres utilizados`}
            >
              {script.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ px: { xs: 2.5, sm: 3 }, pb: { xs: 2.5, sm: 3 }, position: 'relative', zIndex: 2, flex: 1, display: 'flex' }}>
          <TextField
            id="script-editor"
            fullWidth
            multiline
            minRows={12}
            maxRows={26}
            value={script}
            onChange={handleScriptChange}
            disabled={isGenerating}
            placeholder="Comece a escrever sua história aqui..."
            variant="outlined"
            slotProps={{
              htmlInput: {
                spellCheck: false,
                maxLength: MAX_CHARS + 500,
                'aria-labelledby': 'script-label',
                'aria-label': 'Editor de roteiro',
              },
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                height: '100%',
                alignItems: 'stretch',
                borderRadius: 4,
                backgroundColor: 'transparent',
                backdropFilter: 'none',
                px: { xs: 0.5, sm: 1 },
                py: { xs: 0.5, sm: 1 },
                '& fieldset': {
                  borderColor: 'transparent',
                },
                '&:hover fieldset, &.Mui-focused fieldset': {
                  borderColor: 'transparent',
                },
              },
              '& .MuiInputBase-inputMultiline': {
                height: '100% !important',
                overflowY: 'auto !important',
                px: { xs: 0.5, sm: 1 },
                py: 1,
                fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
                fontSize: { xs: '1rem', sm: '1.125rem', md: '1.35rem', lg: '1.6rem' },
                lineHeight: 1.85,
                color: 'text.primary',
                textShadow: `0 1px 12px ${BLACK_24}`,
              },
            }}
          />
        </Box>
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
        <Tooltip title={`Gerar áudio (${navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'} + Enter)`}>
          <span style={{ display: 'flex', width: '100%' }}>
            <Button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
              variant="contained"
              size="large"
              startIcon={<Mic sx={{ fontSize: ICON_SIZE_LG }} />}
              sx={(theme) => ({
                minHeight: { xs: 44, sm: 48 },
                px: { xs: 3, sm: 4 },
                borderRadius: 2,
                fontSize: { xs: '1rem', sm: '1.05rem' },
                fontWeight: 700,
                backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.light, 0.9)} 100%)`,
                boxShadow: `0 18px 48px ${alpha(theme.palette.primary.main, 0.32)}`,
                '&:hover': {
                  backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  boxShadow: `0 24px 56px ${alpha(theme.palette.primary.main, 0.38)}`,
                },
              })}
            >
              <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'center' }}>
                <span>Gerar áudio</span>
                <Box
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    px: 1,
                    py: 0.25,
                    borderRadius: 1.5,
                    border: `1px solid ${WHITE_16}`,
                    backgroundColor: BLACK_18,
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {navigator.platform?.includes('Mac') ? '⌘ ↵' : 'Ctrl ↵'}
                </Box>
              </Stack>
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
