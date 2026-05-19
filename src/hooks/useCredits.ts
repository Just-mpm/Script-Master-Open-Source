/**
 * Hook useCredits em vez de store Zustand — a leitura é via onSnapshot
 * do Firestore (tempo real), e o estado é local a cada componente consumidor.
 * Uma store global não traria benefício porque o Firestore já é a fonte
 * da verdade.
 */
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { createLogger } from '../lib/logger';

const log = createLogger('useCredits');

/** Estado do saldo de créditos do usuário (subcoleção beta_access) */
export interface CreditState {
  /** Créditos disponíveis para consumo neste mês */
  availableCredits: number;
  /** Créditos já consumidos neste mês */
  usedCredits: number;
  /** Créditos base do plano */
  baseCredits: number;
  /** Créditos bônus (ex: feedback) */
  bonusCredits: number;
  /** Se o bônus de feedback já foi concedido */
  feedbackBonusGranted: boolean;
  /** Se está carregando o documento */
  loading: boolean;
  /** Mensagem de erro, se houver */
  error: string | null;
}

// NOTE: creditsExhausted é gerenciado por hook individualmente — uma store global
// (ex: useCreditsStore) centralizaria no futuro, evitando o estado fragmentado entre
// useAudioGenerator, useAssistant, useImageGenerator e useInlineAssistant.
/** Hook que lê o saldo de créditos do usuário via listener em tempo real no Firestore */
export function useCredits(): CreditState {
  const { user } = useAuth();
  const [state, setState] = useState<CreditState>({
    availableCredits: 0,
    usedCredits: 0,
    baseCredits: 0,
    bonusCredits: 0,
    feedbackBonusGranted: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'beta_access', 'current');

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Validação runtime: Firestore pode retornar strings, NaN, etc.
          setState({
            availableCredits: typeof data.availableCredits === 'number' ? data.availableCredits : Number(data.availableCredits) || 0,
            usedCredits: typeof data.usedCredits === 'number' ? data.usedCredits : Number(data.usedCredits) || 0,
            baseCredits: typeof data.baseCredits === 'number' ? data.baseCredits : Number(data.baseCredits) || 0,
            bonusCredits: typeof data.bonusCredits === 'number' ? data.bonusCredits : Number(data.bonusCredits) || 0,
            feedbackBonusGranted: typeof data.feedbackBonusGranted === 'boolean' ? data.feedbackBonusGranted : Boolean(data.feedbackBonusGranted),
            loading: false,
            error: null,
          });
        } else {
          // Documento ainda não criado (usuário novo)
          setState((prev) => ({ ...prev, loading: false }));
        }
      },
      (err) => {
        log.error('Falha ao carregar documento beta_access', { error: String(err) });
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar saldo de créditos.',
        }));
      },
    );

    return () => unsubscribe();
  }, [user]);

  return state;
}
