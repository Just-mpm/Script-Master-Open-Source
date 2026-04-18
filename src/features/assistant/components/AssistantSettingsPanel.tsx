import type { ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import { BRAND_SECONDARY, ICON_SIZE_MD, ICON_SIZE_LG, GAP_DEFAULT, GAP_COMPACT } from '../../../theme/tokens';
import { assistantDrawerPaperSx, assistantInsetSx } from './assistantUi';

interface AssistantSettingsPanelProps {
  customSystemPrompt: string;
  isSavingSettings: boolean;
  onClose: () => void;
  onChangePrompt: (value: string) => void;
  onSave: () => void;
}

export function AssistantSettingsPanel({
  customSystemPrompt,
  isSavingSettings,
  onClose,
  onChangePrompt,
  onSave,
}: AssistantSettingsPanelProps) {
  const handlePromptChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChangePrompt(event.target.value);
  };

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: assistantDrawerPaperSx,
        },
        transition: {
          unmountOnExit: true,
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack spacing={GAP_COMPACT}>
            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
               <AutoAwesome sx={{ fontSize: ICON_SIZE_LG, color: BRAND_SECONDARY }} />
              <Typography variant="h6">Persona da IA</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Defina princípios permanentes de tom, marca, formato de resposta e guardrails criativos.
            </Typography>
          </Stack>

          <IconButton onClick={onClose} aria-label="Fechar persona da IA">
             <Close sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        </Stack>

        <Stack spacing={2} sx={{ flex: 1, p: 2.5 }}>
          <Box sx={(theme) => ({ ...assistantInsetSx(theme), p: 2 })}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">O que vale escrever aqui</Typography>
              <Typography variant="body2" color="text.secondary">
                Ex.: tom da marca, ritmo preferido, restrições visuais, tipo de CTA, estilo de abertura, vocabulário e formato das sugestões.
              </Typography>
            </Stack>
          </Box>

          <Alert variant="outlined" severity="info">
            Evite regras conflitantes. Quanto mais claro o direcionamento, mais previsível fica o comportamento do assistente.
          </Alert>

          <TextField
            multiline
            minRows={14}
            maxRows={24}
            fullWidth
            label="Diretrizes permanentes"
            placeholder="Ex.: responda com foco em retenção para YouTube, proponha roteiros enxutos, preserve linguagem clara e sempre ofereça um bloco JSON quando sugerir ajustes aplicáveis no estúdio."
            value={customSystemPrompt}
            onChange={handlePromptChange}
            sx={{ flex: 1 }}
          />

          <Button
            onClick={onSave}
            variant="contained"
            size="large"
            loading={isSavingSettings}
             startIcon={!isSavingSettings ? <Check sx={{ fontSize: ICON_SIZE_MD }} /> : undefined}
          >
            Aplicar diretrizes
          </Button>
        </Stack>
      </DialogContent>
    </Drawer>
  );
}
