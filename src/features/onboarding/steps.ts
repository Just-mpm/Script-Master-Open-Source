import type { OnboardingStep } from './types';

/**
 * Passos do tour de onboarding do estúdio.
 *
 * Ordem: boas-vindas → editor de roteiro → inspetor de configurações → barra de ações → conclusão.
 * Passos sem `targetId` são exibidos centralizados (sem âncora no DOM).
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Script Master!',
    content:
      'Transforme seus roteiros em áudio, cenas e vídeo com inteligência artificial. Vamos te mostrar o caminho.',
  },
  {
    id: 'script-editor',
    targetId: 'script-editor',
    title: 'Seu roteiro começa aqui',
    content:
      'Escreva ou cole seu roteiro nesta área. Use Ctrl+Enter para gerar o áudio quando estiver pronto.',
    placement: 'left',
  },
  {
    id: 'inspector',
    targetId: 'inspector-panel',
    title: 'Configure a produção',
    content:
      'Ajuste voz, ritmo, estilo e mais. Experimente os templates prontos para começar rápido!',
    placement: 'right',
    action: { label: 'Ver Templates', type: 'secondary' },
  },
  {
    id: 'action-bar',
    targetId: 'action-bar',
    title: 'Controles de produção',
    content:
      'Gere, reproduza, baixe e exporte seu conteúdo diretamente da barra de ações.',
    placement: 'top',
  },
  {
    id: 'complete',
    title: 'Pronto para criar!',
    content:
      'Você já sabe o básico. Explore as funcionalidades e crie seu primeiro conteúdo!',
  },
] as const;
