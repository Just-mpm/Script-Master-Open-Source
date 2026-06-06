// ---------------------------------------------------------------------------
// ProviderSettingsSection — seção de configuração BYOK na página de configurações
// ---------------------------------------------------------------------------
//
// Exibe UI para salvar, testar e remover a API key do Gemini.
// A key é persistida APENAS em IndexedDB via useProviderSettings.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircle from '@mui/icons-material/CheckCircle';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Key from '@mui/icons-material/Key';
import OpenInNew from '@mui/icons-material/OpenInNew';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Save from '@mui/icons-material/Save';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useLocale } from '../../../features/i18n';
import { useProviderSettings } from '../hooks/useProviderSettings';
import { StackedHeader } from '../../../components/ui';
import { useCollapsibleSection } from '../../../hooks/useCollapsibleSection';
import { ICON_SIZE_MD, RADIUS_XS } from '../../../theme/tokens';
import { useTheme } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import { insetPanelSx } from '../../../theme/surfaces';
import { createLogger } from '../../../lib/logger';
import { getProviderAuthFromStore } from '../utils';

const log = createLogger('ProviderSettingsSection');

/** URL externa para obter a API key do Google AI Studio */
const GOOGLE_AI_STUDIO_URL = 'https://aistudio.google.com/apikey';

export function ProviderSettingsSection() {
  const theme = useTheme();
  const { t } = useLocale();
  const { expanded, onToggle } = useCollapsibleSection(true);

  const {
    maskedApiKey,
    hasKey,
    loading,
    error,
    saveKey,
    removeKey,
  } = useProviderSettings();

  // Estado local do input
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [removing, setRemoving] = useState(false);
  const [showValue, setShowValue] = useState(false);

  // Inicia o fluxo de save
  const handleSave = useCallback(async () => {
    const key = inputValue.trim();
    if (!key) return;

    try {
      await saveKey(key);
      setInputValue('');
      setShowInput(false);
      setTestResult(null);
      log.info('API key salva com sucesso');
    } catch (err) {
      log.error('Erro ao salvar API key', { error: err });
    }
  }, [inputValue, saveKey]);

  // Testa a key chamando um endpoint simples do backend
  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Usa o flow de teste do backend — se a key é inválida, o backend retorna erro
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../../../lib/firebase');
      const providerAuth = getProviderAuthFromStore();
      if (!providerAuth) {
        setTestResult('error');
        log.warn('Nenhuma API key configurada para teste');
        return;
      }
      const testCall = httpsCallable<{ providerAuth: { provider: 'gemini'; apiKey: string } }, { valid: boolean; message: string }>(functions, 'testApiKey');
      await testCall({ providerAuth });
      setTestResult('success');
      log.info('API key testada com sucesso');
    } catch (err) {
      setTestResult('error');
      log.warn('Teste de API key falhou', { error: err });
    } finally {
      setTesting(false);
    }
  }, []);

  // Remove a key salva
  const handleRemove = useCallback(async () => {
    setRemoving(true);
    try {
      await removeKey();
      setTestResult(null);
      log.info('API key removida');
    } catch (err) {
      log.error('Erro ao remover API key', { error: err });
    } finally {
      setRemoving(false);
    }
  }, [removeKey]);

  // Exibe o formulário de input
  const handleShowInput = useCallback(() => {
    setShowInput(true);
    setTestResult(null);
  }, []);

  // Cancela o input
  const handleCancelInput = useCallback(() => {
    setShowInput(false);
    setInputValue('');
  }, []);

  // Summary do StackedHeader
  const summary = hasKey
    ? <Chip size="small" variant="outlined" color="success" icon={<CheckCircle sx={{ fontSize: 16 }} />} label={t('configuracoes.providerSettings.saved')} />
    : <Chip size="small" variant="outlined" label={t('configuracoes.providerSettings.inputLabel')} />;

  return (
    <StackedHeader
      variant="glass"
      collapsible
      expanded={expanded}
      onToggle={onToggle}
      collapseId="config-provider"
      icon={<Key sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />}
      title={t('configuracoes.providerSettings.title')}
      description={t('configuracoes.providerSettings.sectionDescription')}
      summary={summary}
      summaryAlwaysVisible
    >
      <Paper elevation={0} sx={(t) => ({ ...insetPanelSx(t), p: 2 })}>
        <Stack spacing={2}>
          {/* Descrição */}
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {t('configuracoes.providerSettings.description')}
          </Typography>

          {/* Link externo para Google AI Studio */}
          <Button
            variant="text"
            size="small"
            href={GOOGLE_AI_STUDIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            {t('configuracoes.providerSettings.getApiKey')}
          </Button>

          {/* Estado: sem key salva → mostra input */}
          {!hasKey && !showInput && (
            <Button
              variant="outlined"
              onClick={handleShowInput}
              startIcon={<Key sx={{ fontSize: 18 }} />}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('configuracoes.providerSettings.inputLabel')}
            </Button>
          )}

          {/* Estado: input ativo → formulário de save */}
          {!hasKey && showInput && (
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label={t('configuracoes.providerSettings.inputLabel')}
                placeholder={t('configuracoes.providerSettings.inputPlaceholder')}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                type={showValue ? 'text' : 'password'}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowValue((v) => !v)}
                          aria-label={showValue ? 'Ocultar chave' : 'Mostrar chave'}
                        >
                          {showValue ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSave}
                  disabled={!inputValue.trim() || loading}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Save sx={{ fontSize: 18 }} />}
                >
                  {t('configuracoes.providerSettings.save')}
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleCancelInput}
                >
                  Cancelar
                </Button>
              </Stack>
            </Stack>
          )}

          {/* Estado: key salva → mostra masked key + ações */}
          {hasKey && (
            <Stack spacing={1.5}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                borderRadius: RADIUS_XS,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}>
                <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {maskedApiKey}
                </Typography>
              </Box>

              {/* Resultado do teste */}
              {testResult === 'success' && (
                <Alert severity="success" variant="outlined" sx={{ borderRadius: RADIUS_XS }}>
                  {t('configuracoes.providerSettings.testSuccess')}
                </Alert>
              )}
              {testResult === 'error' && (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: RADIUS_XS }}>
                  {t('configuracoes.providerSettings.testError')}
                </Alert>
              )}

              {/* Erro da store */}
              {error && (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: RADIUS_XS }}>
                  {error}
                </Alert>
              )}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleTest}
                  disabled={testing}
                  startIcon={testing ? <CircularProgress size={16} color="inherit" /> : <PlayArrow sx={{ fontSize: 18 }} />}
                >
                  {t('configuracoes.providerSettings.test')}
                </Button>
                <Button
                  variant="text"
                  color="error"
                  size="small"
                  onClick={handleRemove}
                  disabled={removing}
                  startIcon={removing ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlined sx={{ fontSize: 18 }} />}
                >
                  {t('configuracoes.providerSettings.remove')}
                </Button>
              </Stack>
            </Stack>
          )}

          {/* Aviso de segurança */}
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {t('configuracoes.providerSettings.warning')}
          </Typography>
        </Stack>
      </Paper>
    </StackedHeader>
  );
}
