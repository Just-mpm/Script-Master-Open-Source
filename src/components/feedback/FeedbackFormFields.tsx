/**
 * FeedbackFormFields — campos puros do formulário de feedback.
 *
 * Extraído do ContactPage para permitir reuso dentro de múltiplos wrappers
 * (Dialog modal, página pública, banner inline). Não gerencia layout externo
 * nem estado de "enviado" — apenas os campos, validação e submit.
 *
 * O submit chama a Cloud Function `feedback` que:
 * - Valida texto (mínimo 10 caracteres) + categoria
 * - Concede 250 créditos UMA vez (campo `feedbackBonusGranted` no Firestore)
 * - Cria documento `feedback_rewards/{rewardId}` para histórico
 *
 * Após sucesso, atualiza o store global de créditos via `refreshCredits()`
 * para que o `CreditIndicator` no Header reflita o novo saldo imediatamente.
 */
import { useCallback, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import SendIcon from '@mui/icons-material/Send';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import { removeUndefinedFields } from '../../lib/callable-utils';
import { useCreditsStore } from '../../hooks/useCredits';
import { useLocale } from '../../features/i18n';
import { createLogger } from '../../lib/logger';
import { trackAnalyticsEvent } from '../../lib/analytics';
import { BRAND_SECONDARY, BRAND_SECONDARY_GLOW_SOFT } from '../../theme/tokens';
import { alpha } from '@mui/material/styles';
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from './constants';
import { StackedHeader } from '../ui';

const log = createLogger('FeedbackFormFields');

/** Payload esperado pela Cloud Function `feedback` (espelha FeedbackInputSchema) */
interface FeedbackCallableInput {
  category: string;
  text: string;
  screenContext?: string;
  requestId: string;
}

/** Resposta da Cloud Function (espelha FeedbackOutputSchema) */
interface FeedbackCallableOutput {
  success: boolean;
  bonusGranted: boolean;
  availableCredits?: number;
}

/** Resultado de um envio bem-sucedido */
export interface FeedbackSubmitResult {
  bonusGranted: boolean;
  availableCredits?: number;
}

export interface FeedbackFormFieldsProps {
  /** Contexto da tela atual pré-preenchido (ex: "/app/estudio") */
  defaultScreenContext?: string;
  /** Callback disparado após envio bem-sucedido (o pai decide o que fazer) */
  onSubmitted?: (result: FeedbackSubmitResult) => void;
  /** Se true, esconde o botão de envio (útil quando o pai injeta seu próprio botão) */
  hideButton?: boolean;
  /** Label customizado do botão (default: t('feedback.dialog.button')) */
  buttonLabel?: string;
  /** Largura máxima do container (default: 480). Aceita número (px) ou string CSS. */
  maxWidth?: number | string;
  /** Se true, mostra estado de sucesso inline em vez de chamar onSubmitted */
  showSuccessInline?: boolean;
  /** Desabilita inputs (útil para estados de loading externos) */
  disabled?: boolean;
}

/**
 * Componente puro de campos do form de feedback.
 * Reutilizado por FeedbackDialog, ContactPage e FeedbackBanner.
 */
export function FeedbackFormFields({
  defaultScreenContext,
  onSubmitted,
  hideButton = false,
  buttonLabel,
  maxWidth = 480,
  showSuccessInline = false,
  disabled = false,
}: FeedbackFormFieldsProps) {
  const { t } = useLocale();
  const refreshCredits = useCreditsStore((s) => s.refreshCredits);

  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [text, setText] = useState('');
  const [screenContext, setScreenContext] = useState(defaultScreenContext ?? '');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<FeedbackSubmitResult | null>(null);

  const isTooShort = text.length > 0 && text.trim().length < 10;
  const canSubmit = category.trim().length > 0 && text.trim().length >= 10 && !isSending;

  const handleSubmit = useCallback(async () => {
    setIsSending(true);
    setError(null);

    try {
      const feedbackCall = httpsCallable<FeedbackCallableInput, FeedbackCallableOutput>(
        functions,
        'feedback',
      );

      const result = await feedbackCall(removeUndefinedFields({
        category,
        text: text.trim(),
        screenContext: screenContext.trim() || undefined,
        requestId: crypto.randomUUID(),
      }));

      const data = result.data;
      const submitResult: FeedbackSubmitResult = {
        bonusGranted: data.bonusGranted,
        availableCredits: data.availableCredits,
      };

      trackAnalyticsEvent('generate_lead', { source: 'feedback' });
      log.info('feedback enviado', { category, bonusGranted: data.bonusGranted });

      // Atualiza saldo global de créditos (CreditIndicator reflete o novo saldo)
      void refreshCredits(false);

      setSuccessResult(submitResult);
      onSubmitted?.(submitResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn('erro ao enviar feedback', { error: message });
      setError(t('feedback.dialog.error'));
    } finally {
      setIsSending(false);
    }
  }, [category, text, screenContext, t, onSubmitted, refreshCredits]);

  // Estado de sucesso inline (usado pelo ContactPage público)
  if (successResult && showSuccessInline) {
    const message = successResult.bonusGranted
      ? t('feedback.dialog.successWithBonus')
      : t('feedback.dialog.successNoBonus');

    return (
      <Stack spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
        {/* Fora do escopo StackedHeader: Snackbar/toast auto-hide (sucesso de envio) */}
        <Alert
          severity="success"
          variant="outlined"
          sx={{
            maxWidth,
            borderColor: alpha(BRAND_SECONDARY, 0.4),
            '& .MuiAlert-icon': { color: BRAND_SECONDARY },
            boxShadow: `0 0 0 1px ${BRAND_SECONDARY_GLOW_SOFT}`,
          }}
        >
          {message}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ width: '100%', maxWidth }}>
      {/* Categoria */}
      <TextField
        select
        label={t('feedback.dialog.categoryLabel')}
        value={category}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setCategory(e.target.value as FeedbackCategory)}
        size="small"
        fullWidth
        disabled={disabled || isSending}
      >
        {FEEDBACK_CATEGORIES.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {t(`feedback.dialog.${opt.i18nKey}`)}
          </MenuItem>
        ))}
      </TextField>

      {/* Texto do feedback */}
      <TextField
        label={t('feedback.dialog.textLabel')}
        placeholder={t('feedback.dialog.textPlaceholder')}
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
        multiline
        minRows={3}
        maxRows={6}
        fullWidth
        error={isTooShort}
        helperText={isTooShort ? t('feedback.dialog.tooShort') : undefined}
        disabled={disabled || isSending}
      />

      {/* Contexto da tela (opcional) — pré-preenchido pelo pai */}
      <TextField
        label={t('feedback.dialog.screenContextLabel')}
        placeholder={t('feedback.dialog.screenContextPlaceholder')}
        value={screenContext}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setScreenContext(e.target.value)}
        size="small"
        fullWidth
        disabled={disabled || isSending}
      />

      {/* Erro */}
      {error ? (
        <StackedHeader
          variant="alert"
          severity="error"
          alertVariant="outlined"
          title={t('common.error')}
          description={error}
          onClose={() => setError(null)}
        />
      ) : null}

      {/* Botão de envio */}
      {!hideButton ? (
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleSubmit}
          disabled={!canSubmit || disabled}
          endIcon={isSending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          sx={{ mt: 1, boxShadow: `0 0 24px ${BRAND_SECONDARY_GLOW_SOFT}` }}
        >
          {isSending ? t('feedback.dialog.sending') : (buttonLabel ?? t('feedback.dialog.button'))}
        </Button>
      ) : null}

      {/* Dica visual — apenas quando categoria não selecionada (UX gentil) */}
      {!category && !hideButton ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('feedback.dialog.hint')}
        </Typography>
      ) : null}
    </Stack>
  );
}
