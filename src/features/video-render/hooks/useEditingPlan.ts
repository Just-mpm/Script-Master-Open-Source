import { useState, useCallback, useRef } from 'react';
import { generateEditingPlan } from '../../../lib/gemini';
import type { EditingPlan, EditingScene } from '../lib/editingPlan';

/** Input que descreve cada cena para o plano de edição */
export interface EditingPlanSceneInput {
  timestamp: number;
  prompt: string;
}

/** Estado e ações do hook de plano de edição */
export interface UseEditingPlanReturn {
  /** Plano de edição gerado (null se ainda não gerado) */
  editingPlan: EditingPlan | null;
  /** Indica se está gerando o plano */
  isGeneratingPlan: boolean;
  /** Progresso da geração (0-100) */
  planProgress: number;
  /** Texto descritivo do status atual */
  planStatusText: string;
  /** Mensagem de erro (null se não houver) */
  error: string | null;
  /** Gera o plano de edição via Gemini */
  generatePlan: (
    script: string,
    scenes: EditingPlanSceneInput[],
    durationInSeconds: number,
  ) => Promise<void>;
  /** Reseta todo o estado do plano */
  clearPlan: () => void;
  /** Edita uma cena específica do plano gerado */
  updateScene: (index: number, updates: Partial<EditingScene>) => void;
  /** Cancela a geração em andamento */
  cancelPlan: () => void;
}

export function useEditingPlan(): UseEditingPlanReturn {
  const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planProgress, setPlanProgress] = useState(0);
  const [planStatusText, setPlanStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef(false);

  const generatePlan = useCallback(
    async (script: string, scenes: EditingPlanSceneInput[], durationInSeconds: number) => {
      cancelRef.current = false;
      setIsGeneratingPlan(true);
      setPlanProgress(0);
      setError(null);
      setPlanStatusText('Analisando cenas e criando plano de edição...');

      let progressInterval: ReturnType<typeof setInterval> | null = null;

      try {
        // Simula progresso incremental enquanto espera a resposta da IA
        progressInterval = setInterval(() => {
          setPlanProgress(prev => {
            if (prev >= 85) {
              if (progressInterval) clearInterval(progressInterval);
              return prev;
            }
            return prev + Math.random() * 15;
          });
        }, 300);

        if (cancelRef.current) throw new Error('Geração do plano cancelada pelo usuário.');

        setPlanStatusText('Gerando plano de edição com IA...');
        const plan = await generateEditingPlan(script, scenes, durationInSeconds);

        if (cancelRef.current) throw new Error('Geração do plano cancelada pelo usuário.');

        setEditingPlan(plan);
        setPlanProgress(100);
        setPlanStatusText('Plano de edição gerado com sucesso!');
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'Geração do plano cancelada pelo usuário.') {
          setPlanStatusText('Geração cancelada.');
          return;
        }

        console.error('Erro ao gerar plano de edição:', err);
        const errorMessage = err instanceof Error ? err.message : '';
        const msg = errorMessage.toLowerCase();

        if (msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('429')) {
          setError('Limite de uso atingido. Aguarde alguns minutos e tente novamente.');
        } else if (msg.includes('api key') || msg.includes('permission_denied')) {
          setError('Erro de autenticação. Verifique sua chave de API nas configurações.');
        } else if (msg.includes('deadline') || msg.includes('504')) {
          setError('O servidor demorou demais para responder. Tente novamente.');
        } else if (msg.includes('unavailable') || msg.includes('503')) {
          setError('Serviço temporariamente indisponível. Tente novamente em instantes.');
        } else {
          setError('Não foi possível gerar o plano de edição. Tente novamente.');
        }
      } finally {
        if (progressInterval) clearInterval(progressInterval);
        setIsGeneratingPlan(false);
      }
    },
    [],
  );

  const clearPlan = useCallback(() => {
    setEditingPlan(null);
    setPlanProgress(0);
    setPlanStatusText('');
    setError(null);
    setIsGeneratingPlan(false);
  }, []);

  const updateScene = useCallback((index: number, updates: Partial<EditingScene>) => {
    setEditingPlan(prev => {
      if (!prev) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  }, []);

  const cancelPlan = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return {
    editingPlan,
    isGeneratingPlan,
    planProgress,
    planStatusText,
    error,
    generatePlan,
    clearPlan,
    updateScene,
    cancelPlan,
  };
}
