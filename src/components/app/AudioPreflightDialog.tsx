import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface AudioPreflightStep {
  type: 'audio' | 'chunking' | 'scene_prompts' | 'image';
  label: string;
  plannedCount: number;
  credits: number;
  details: string[];
}

export interface AudioPreflightSummary {
  summary: string;
  estimatedDurationSeconds: number;
  estimatedChunkCount: number;
  estimatedSceneCount: number;
  confidence: 'high' | 'medium';
  steps: AudioPreflightStep[];
  credits: {
    available: number;
    totalPlanned: number;
    remainingAfter: number;
    unlimited: boolean;
  };
  canProceed: boolean;
  blockingReasonCode?: string;
  blockingMessage?: string;
  notes: string[];
}

interface AudioPreflightDialogProps {
  open: boolean;
  loading: boolean;
  preflight: AudioPreflightSummary | null;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

function formatCredits(value: number, unlimited: boolean): string {
  if (unlimited || !Number.isFinite(value)) {
    return 'Ilimitado';
  }

  return `${value} créditos`;
}

function formatStepCredits(value: number): string {
  return value <= 0 ? 'Sem custo adicional' : `${value} créditos`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
}

export function AudioPreflightDialog({
  open,
  loading,
  preflight,
  error,
  onClose,
  onConfirm,
}: AudioPreflightDialogProps) {
  const isUnavailable = !loading && !preflight;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {loading
          ? 'Analisando a geração'
          : preflight
            ? 'Resumo da geração'
            : 'Prévia indisponível'}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Stack spacing={2} sx={{ alignItems: 'center', py: 3 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Verificando etapas, estimativa de créditos e saldo disponível...
            </Typography>
          </Stack>
        ) : null}

        {isUnavailable ? (
          <Alert severity="warning" variant="outlined">
            {error ?? 'Não foi possível montar a prévia agora. Tente novamente em instantes.'}
          </Alert>
        ) : null}

        {preflight ? (
          <Stack spacing={2.5}>
            <Alert severity={preflight.canProceed ? 'success' : 'warning'} variant="outlined">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {preflight.summary}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {preflight.canProceed
                  ? 'Tudo pronto para confirmar a geração.'
                  : preflight.blockingMessage}
              </Typography>
            </Alert>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip label={`Duração estimada: ${formatDuration(preflight.estimatedDurationSeconds)}`} />
              <Chip label={`Chunks: ${preflight.estimatedChunkCount}`} />
              <Chip label={`Cenas previstas: ${preflight.estimatedSceneCount}`} />
              <Chip label={`Confiança: ${preflight.confidence === 'high' ? 'Alta' : 'Muito próxima'}`} color="primary" variant="outlined" />
            </Stack>

            <Stack spacing={1.5}>
              {preflight.steps.map((step) => (
                <Box
                  key={`${step.type}-${step.label}`}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {step.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.plannedCount} etapa(s) previstas
                      </Typography>
                    </Box>
                    <Chip label={formatStepCredits(step.credits)} color="primary" />
                  </Stack>

                  <Stack spacing={0.5} sx={{ mt: 1.25 }}>
                    {step.details.map((detail) => (
                      <Typography key={detail} variant="body2" color="text.secondary">
                        {detail}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Créditos
              </Typography>

              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">Saldo atual</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatCredits(preflight.credits.available, preflight.credits.unlimited)}
                </Typography>
              </Stack>

              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">Custo previsto</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatCredits(preflight.credits.totalPlanned, false)}
                </Typography>
              </Stack>

              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">Saldo após concluir</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatCredits(preflight.credits.remainingAfter, preflight.credits.unlimited)}
                </Typography>
              </Stack>
            </Stack>

            <Stack spacing={0.5}>
              {preflight.notes.map((note) => (
                <Typography key={note} variant="caption" color="text.secondary">
                  {note}
                </Typography>
              ))}
            </Stack>
          </Stack>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={loading || !preflight || !preflight.canProceed}
        >
          Confirmar geração
        </Button>
      </DialogActions>
    </Dialog>
  );
}
