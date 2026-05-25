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
import { useLocale } from '../features/i18n';

const log = createLogger('DataMigrationDialog');

interface DataMigrationDialogProps {
  userId: string;
  /** Callback executado quando o dialog pode ser fechado (migração concluída ou recusada) */
  onComplete: () => void;
}

export function DataMigrationDialog({ userId, onComplete }: DataMigrationDialogProps) {
  const { t } = useLocale();
  const [checkResult, setCheckResult] = useState<MigrationCheckResult | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    checkForMigratableData()
      .then(setCheckResult)
      .catch((err: Error) => {
        log.error('Falha ao verificar dados migráveis', { error: err });
        setCheckResult({ hasData: false, summary: { projects: 0, generations: 0, imageGenerations: 0, memories: 0, chats: 0, settings: false } });
      });
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
      if (result.errors === 0) {
        markMigrationCompleted(userId);
      }
    } catch (error: unknown) {
      log.error('Erro na migração', { error });
        setMigrationResult({ migrated: 0, errors: 1, details: t('dataMigration.unexpectedError') });
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
      <Dialog open aria-label={t('dataMigration.checking')}>
        <DialogContent>
          <Stack spacing={2} sx={{ alignItems: 'center', py: 3 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              {t('dataMigration.checking')}
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
          {t('dataMigration.completed')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              {migrationResult.errors === 0
                ? t('dataMigration.successMessage', { count: migrationResult.migrated })
                : t('dataMigration.partialSuccessMessage', { count: migrationResult.migrated, errors: migrationResult.errors })}
            </Typography>
            {migrationResult.details && (
              <Typography variant="body2" color="text.secondary">
                {migrationResult.details}
              </Typography>
            )}
            <DialogContentText sx={{ mt: 1 }} variant="caption" color="text.disabled">
              {t('dataMigration.mediaNote')}
            </DialogContentText>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          {migrationResult.errors > 0 ? (
            <>
              <Button color="inherit" onClick={handleMigrate} disabled={isMigrating}>
                {t('common.tryAgain')}
              </Button>
              <Button variant="contained" onClick={() => { markMigrationCompleted(userId); onComplete(); }}>
                {t('dataMigration.ignoreAndContinue')}
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={onComplete}>
              {t('common.continue')}
            </Button>
          )}
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
        {t('dataMigration.confirmTitle')}
       </DialogTitle>
       <DialogContent>
         <Stack spacing={2}>
           <DialogContentText>
              {t('dataMigration.confirmDescription', { totalItems })}
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
            {summary.projects > 0 && <Typography component="li" variant="body2">{t('dataMigration.projectCount', { count: summary.projects })}</Typography>}
            {summary.generations > 0 && <Typography component="li" variant="body2">{t('dataMigration.audioGenerationCount', { count: summary.generations })}</Typography>}
            {summary.imageGenerations > 0 && <Typography component="li" variant="body2">{t('dataMigration.imageGenerationCount', { count: summary.imageGenerations })}</Typography>}
            {summary.memories > 0 && <Typography component="li" variant="body2">{t('dataMigration.memoryCount', { count: summary.memories })}</Typography>}
            {summary.chats > 0 && <Typography component="li" variant="body2">{t('dataMigration.chatCount', { count: summary.chats })}</Typography>}
            {summary.settings && <Typography component="li" variant="body2">{t('settings.customSettings')}</Typography>}
          </Box>

          <DialogContentText variant="caption" color="text.disabled">
             {t('dataMigration.confirmMediaNote')}
          </DialogContentText>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleSkip} disabled={isMigrating}>
          {t('common.skip')}
        </Button>
        <Button
          variant="contained"
          onClick={handleMigrate}
          disabled={isMigrating}
          startIcon={isMigrating ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isMigrating ? t('dataMigration.transferring') : t('dataMigration.transfer')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
