/**
 * Ações de resultado de exportação reutilizáveis.
 * Exibe sucesso (check + status + download + reset) ou erro (tentar novamente).
 * Aceita labels customizáveis para i18n.
 */

import React from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Replay from '@mui/icons-material/Replay';
import Download from '@mui/icons-material/Download';
import {
  BRAND_GRADIENT,
  BRAND_GRADIENT_HOVER,
  BRAND_GLOW,
  SUCCESS_MAIN,
  SUCCESS_GLOW,
  ICON_SIZE_MD,
  GAP_COMPACT,
  GAP_DEFAULT,
} from '../../../../theme/tokens';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ExportResultActionsProps {
  /** Se tem output disponível (sucesso) */
  hasOutput: boolean;
  /** Container do vídeo ('mp4' ou 'webm') — usado no label de download */
  container: string;
  /** Callback de download */
  onDownload: () => void;
  /** Callback de reset (nova exportação) */
  onReset: () => void;
  /** Texto de status (ex: "Exportação concluída!") */
  statusText: string;
  /** Tamanho do blob em bytes (para exibição) */
  blobSizeBytes?: number;
  /** Label do botão "Exportar novamente" */
  labelRetry?: string;
  /** Label do botão "Limpar" */
  labelClear?: string;
  /** Label do botão "Baixar MP4/WebM" — o container é anexado automaticamente */
  labelDownload?: string;
  /** sx override */
  sx?: SystemStyleObject<Theme>;
}

// ---------------------------------------------------------------------------
// Utilitário
// ---------------------------------------------------------------------------

function formatBlobSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const ExportResultActions = React.memo(function ExportResultActions({
  hasOutput,
  container,
  onDownload,
  onReset,
  statusText,
  blobSizeBytes,
  labelRetry = 'Exportar novamente',
  labelClear = 'Limpar',
  labelDownload = 'Baixar',
  sx,
}: ExportResultActionsProps) {
  if (!hasOutput) return null;

  return (
    <Stack
      direction="row"
      spacing={GAP_DEFAULT}
      sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', ...sx }}
    >
      <Stack direction="row" spacing={GAP_COMPACT} sx={{ alignItems: 'center' }}>
        <CheckCircle sx={{ fontSize: 20, color: SUCCESS_MAIN, filter: `drop-shadow(0 0 6px ${SUCCESS_GLOW})` }} />
        <Typography variant="body2" sx={{ color: SUCCESS_MAIN, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {statusText}
        </Typography>
        {blobSizeBytes != null && blobSizeBytes > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            ({formatBlobSize(blobSizeBytes)})
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={GAP_DEFAULT}>
        <Button
          variant="outlined"
          size="small"
          onClick={onReset}
          startIcon={<Replay sx={{ fontSize: ICON_SIZE_MD }} />}
        >
          {labelRetry}
        </Button>
        <Button
          variant="text"
          size="small"
          onClick={onReset}
          startIcon={<Download sx={{ fontSize: ICON_SIZE_MD }} />}
        >
          {labelClear}
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={onDownload}
          startIcon={<Download sx={{ fontSize: ICON_SIZE_MD }} />}
          sx={{
            background: BRAND_GRADIENT,
            boxShadow: BRAND_GLOW,
            '&:hover': { background: BRAND_GRADIENT_HOVER },
            '&:active': { transform: 'scale(0.97)' },
            transition: 'transform 0.15s ease',
          }}
        >
          {labelDownload} {container.toUpperCase()}
        </Button>
      </Stack>
    </Stack>
  );
});