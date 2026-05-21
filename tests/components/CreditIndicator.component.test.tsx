import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '../../src/features/i18n';
import { CreditIndicator } from '../../src/components/CreditIndicator';

const mockCreditsState = vi.hoisted(() => ({
  availableCredits: 320,
  usedCredits: 80,
  reservedCredits: 0,
  baseCredits: 300,
  bonusCredits: 100,
  feedbackBonusGranted: false,
  unlimitedCredits: false,
  canEnforceBalance: true,
  loading: false,
  error: null as string | null,
}));

vi.mock('../../src/hooks/useCredits', () => ({
  useCredits: () => ({ ...mockCreditsState }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('CreditIndicator', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    mockCreditsState.availableCredits = 320;
    mockCreditsState.usedCredits = 80;
    mockCreditsState.reservedCredits = 0;
    mockCreditsState.baseCredits = 300;
    mockCreditsState.bonusCredits = 100;
    mockCreditsState.feedbackBonusGranted = false;
    mockCreditsState.unlimitedCredits = false;
    mockCreditsState.canEnforceBalance = true;
    mockCreditsState.loading = false;
    mockCreditsState.error = null;
  });

  it('mostra skeleton enquanto os créditos estão carregando', () => {
    mockCreditsState.loading = true;

    render(<CreditIndicator />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Carregando créditos...')).toBeDefined();
  });

  it('mostra estado de sincronização quando o saldo ainda não pode ser aplicado', () => {
    mockCreditsState.canEnforceBalance = false;

    render(<CreditIndicator />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Sincronizando saldo de créditos...')).toBeDefined();
  });

  it('mostra estado de erro quando a leitura de créditos falha', () => {
    mockCreditsState.error = 'Erro ao carregar saldo de créditos.';

    render(<CreditIndicator />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Erro ao carregar créditos')).toBeDefined();
  });

  it('mostra badge de créditos ilimitados', () => {
    mockCreditsState.unlimitedCredits = true;

    render(<CreditIndicator />, { wrapper: Wrapper });

    expect(screen.getByText('Ilimitado')).toBeDefined();
  });

  it('mostra o saldo confirmado com label acessível', () => {
    render(<CreditIndicator />, { wrapper: Wrapper });

    screen.getByLabelText('Saldo de créditos: 320');
    expect(screen.getByText('320')).toBeDefined();
  });
});
