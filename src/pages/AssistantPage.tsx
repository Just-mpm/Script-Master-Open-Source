import { Assistant } from '../components/Assistant';
import { useStudioStore, useCurrentStudioState } from '../features/studio/store';
import { DocumentHead } from '../components/DocumentHead';
import { getPageSeo } from '../lib/seo';

export function AssistantPage() {
  const currentState = useCurrentStudioState();
  const applySettings = useStudioStore((s) => s.applySettings);

  return (
    <>
      <DocumentHead {...getPageSeo({
        title: 'Assistente IA',
        description: 'Chat conversacional com IA para refinar roteiros, gerar ideias e otimizar seu conteúdo.',
        path: '/app/assistente',
      })} />
      <Assistant onApplySettings={applySettings} currentState={currentState} />
    </>
  );
}
