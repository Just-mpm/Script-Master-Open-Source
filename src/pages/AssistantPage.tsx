import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Assistant } from '../components/Assistant';
import type { AssistantStudioState } from '../features/assistant/types';
import type { StudioSettingsPatch } from '../features/studio/types';
import { APP_MAX_WIDTH } from '../theme/tokens';

interface AssistantPageProps {
  currentState: AssistantStudioState;
  onApplySettings: (settings: StudioSettingsPatch) => void;
}

export function AssistantPage({ currentState, onApplySettings }: AssistantPageProps) {
  return (
    <Box sx={{ height: '100%', px: { xs: 0, md: 2 }, py: { xs: 0, md: 2 } }}>
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, height: '100%', px: { xs: 0, md: 0 } }}>
        <Assistant onApplySettings={onApplySettings} currentState={currentState} />
      </Container>
    </Box>
  );
}
