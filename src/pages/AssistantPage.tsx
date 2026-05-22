import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Assistant } from '../components/Assistant';
import { useStudioStore, useCurrentStudioState } from '../features/studio/store';
import { APP_MAX_WIDTH } from '../theme/tokens';
import { DocumentHead } from '../components/DocumentHead';
import { getPageSeo } from '../lib/seo';

export function AssistantPage() {
  const currentState = useCurrentStudioState();
  const applySettings = useStudioStore((s) => s.applySettings);

  return (
    <Box sx={{ height: '100%', px: { xs: 0, md: 2 }, py: { xs: 0, md: 2 } }}>
      <DocumentHead {...getPageSeo({
        title: 'Assistente IA',
        description: 'Chat conversacional com IA para refinar roteiros, gerar ideias e otimizar seu conteúdo.',
        path: '/app/assistente',
      })} />
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, height: '100%', px: { xs: 0, md: 0 } }}>
        <Assistant onApplySettings={applySettings} currentState={currentState} />
      </Container>
    </Box>
  );
}
