import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloudUpload from '@mui/icons-material/CloudUpload';
import { useEffect, useState } from 'react';
import { createLogger } from '../lib/logger';
import type { MigrationCheckResult, MigrationResult } from '../lib/db/migration';
import { checkForMigratableData, markMigrationCompleted, migrateAnonymousData } from '../lib/db/migration';

const log = createLogger('DataMigrationDialog');

interface DataMigrationDialogProps {
  userId: string;
  /** Callback executado quando o dialog pode ser fechado (migração concluída ou recusada) */
  onComplete: () => void;
}

export function DataMigrationDialog({ userId, onComplete }: DataMigrationDialogProps) {
  const [checkResult, setCheckResult] = useState<MigrationCheckResult | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    checkForMigratableData().then(setCheckResult);
  }, []);

  // Se não há dados para migrar, fecha automaticamente
  useEffect(() => {
    if (checkResult && !checkResult.hasData) {
      markMigrationCompleted(userId);
      onComplete();
    }
  }, [checkResult, userId, onComplete]);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateAnonymousData(userId);
      setMigrationResult(result);
      markMigrationCompleted(userId);
    } catch (error: unknown) {
      log.error('Erro na migração', { error });
      setMigrationResult({ migrated: 0, errors: 1, details: 'Erro inesperado durante a migração.' });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkip = () => {
    markMigrationCompleted(userId);
    onComplete();
  };

  if (!checkResult) {
    return (
      <Dialog open aria-label="Migrando dados">
        <DialogContent>
          <Stack spacing={2} sx={{ alignItems: 'center', py: 3 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Verificando dados locais...
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  // Estado pós-migração
  if (migrationResult) {
    return (
      <Dialog open aria-labelledby="migration-complete-title">
        <DialogTitle id="migration-complete-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CloudUpload color="primary" />
          Migração concluída
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              {migrationResult.errors === 0
                ? `Todos os ${migrationResult.migrated} itens foram migrados com sucesso.`
                : `${migrationResult.migrated} itens migrados com sucesso. ${migrationResult.errors} erros encontrados.`}
            </Typography>
            {migrationResult.details && (
              <Typography variant="body2" color="text.secondary">
                {migrationResult.details}
              </Typography>
            )}
            <DialogContentText sx={{ mt: 1 }} variant="caption" color="text.disabled">
              Arquivos de mídia (áudio, imagens, vídeos) foram migrados como metadados.
              Os arquivos físicos precisam ser gerados novamente.
            </DialogContentText>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onComplete}>
            Continuar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Estado de confirmação
  const { summary } = checkResult;
  const totalItems = summary.projects + summary.generations + summary.imageGenerations
    + summary.memories + summary.chats + (summary.settings ? 1 : 0);

  return (
    <Dialog open maxWidth="sm" fullWidth aria-labelledby="migration-confirm-title">
      <DialogTitle id="migration-confirm-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CloudUpload color="primary" />
        Migrar dados locais?
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            Detectamos <Box component="strong">{totalItems} itens</Box> salvos localmente
            no seu navegador. Deseja migrá-los para a nuvem para acessar de qualquer dispositivo?
          </DialogContentText>

          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2,
              color: 'text.secondary',
              '& li': { py: 0.25 },
            }}
          >
            {summary.projects > 0 && <Typography component="li" variant="body2">{summary.projects} projetos</Typography>}
            {summary.generations > 0 && <Typography component="li" variant="body2">{summary.generations} gerações de áudio</Typography>}
            {summary.imageGenerations > 0 && <Typography component="li" variant="body2">{summary.imageGenerations} gerações de imagem</Typography>}
            {summary.memories > 0 && <Typography component="li" variant="body2">{summary.memories} memórias da IA</Typography>}
            {summary.chats > 0 && <Typography component="li" variant="body2">{summary.chats} conversas</Typography>}
            {summary.settings && <Typography component="li" variant="body2">Configurações personalizadas</Typography>}
          </Box>

          <DialogContentText variant="caption" color="text.disabled">
            Arquivos de mídia (áudio, imagens) serão migrados como metadados.
            Os arquivos físicos não podem ser transferidos e precisarão ser gerados novamente.
          </DialogContentText>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleSkip} disabled={isMigrating}>
          Ignorar
        </Button>
        <Button
          variant="contained"
          onClick={handleMigrate}
          disabled={isMigrating}
          startIcon={isMigrating ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isMigrating ? 'Migrando...' : 'Migrar dados'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
