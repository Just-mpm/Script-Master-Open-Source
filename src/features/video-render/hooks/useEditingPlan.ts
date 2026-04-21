import { useState, useCallback, useRef, useEffect } from 'react';
import { generateEditingPlan, loadSceneImagesForAnalysis } from '../../../lib/gemini';
import type { SceneImagePayload } from '../../../lib/gemini';
import { loadEditingPlan, saveEditingPlan } from '../../../lib/db/editing-plans';
import type { EditingPlan, EditingScene } from '../lib/editingPlan';
import { analyzeAudioForEditing } from '../lib/audioAnalysis';
import type { AudioAnalysisResult } from '../lib/audioAnalysis';

/** Input que descreve cada cena para o plano de edição */
export interface EditingPlanSceneInput {
  timestamp: number;
  prompt: string;
  /** URL da imagem gerada para esta cena (usada na análise visual do Gemini) */
  imageUrl?: string;
}

/** Estado e ações do hook de plano de edição */
export interface UseEditingPlanReturn {
  /** Plano de edição gerado (null se ainda não gerado) */
  editingPlan: EditingPlan | null;
  /** Plano original gerado pela IA (antes de edições manuais) */
  originalPlan: EditingPlan | null;
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
    audioUrl?: string | null,
  ) => Promise<void>;
  /** Reseta todo o estado do plano */
  clearPlan: () => void;
  /** Edita uma cena específica do plano gerado (com histórico de undo) */
  updateScene: (index: number, updates: Partial<EditingScene>) => void;
  /** Cancela a geração em andamento */
  cancelPlan: () => void;
  /** Reseta para o plano original gerado pela IA */
  resetToOriginal: () => void;
  /** Desfaz a última edição manual */
  undoLastEdit: () => void;
  /** Indica se há edições para desfazer */
  canUndo: boolean;
  /** Re-gera uma cena individual via IA (solicita plano completo, substitui só a cena) */
  regenerateScene: (
    index: number,
    script: string,
    scenes: EditingPlanSceneInput[],
    durationInSeconds: number,
  ) => Promise<void>;
}

/** Máximo de entradas no histórico de undo */
const MAX_UNDO_HISTORY = 20;

/** Debounce em ms para persistência do plano no IndexedDB */
const PERSIST_DEBOUNCE_MS = 500;

/** Etapas de progresso da geração do plano (etapa 0 = análise de áudio) */
const GENERATION_STAGES = [
  { text: 'Carregando imagens...', progress: 20 },
  { text: 'Enviando para IA...', progress: 40 },
  { text: 'Analisando roteiro e imagens...', progress: 60 },
  { text: 'Gerando plano de edição...', progress: 80 },
] as const;

/** Progresso reservado para a fase de análise de áudio */
const AUDIO_ANALYSIS_PROGRESS = 15;
const AUDIO_ANALYSIS_TEXT = 'Analisando áudio...';

/**
 * Hook de plano de edição com persistência, undo/redo e re-geração individual.
 * Aceita projectId opcional para persistir o plano no IndexedDB.
 * @param projectId - ID do projeto para persistência (null desativa)
 */
export function useEditingPlan(projectId?: string | null): UseEditingPlanReturn {
  const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);
  const [originalPlan, setOriginalPlan] = useState<EditingPlan | null>(null);
  const [audioAnalysisResult, setAudioAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planProgress, setPlanProgress] = useState(0);
  const [planStatusText, setPlanStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<EditingPlan[]>([]);

  const cancelRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Persistência com debounce ─────────────────────────────────

  // Salva no IndexedDB com debounce quando o plano muda
  useEffect(() => {
    // Limpa timer anterior
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }

    // Só persiste se houver plano e projectId
    if (!editingPlan || !projectId) return;

    persistTimerRef.current = setTimeout(() => {
      void saveEditingPlan(projectId, editingPlan, originalPlan);
      persistTimerRef.current = null;
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [editingPlan, originalPlan, projectId]);

  // Carrega plano salvo ao montar ou ao mudar projectId
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    void (async () => {
      try {
        const stored = await loadEditingPlan(projectId);
        if (cancelled) return;

        if (stored) {
          setEditingPlan(stored.plan);
          setOriginalPlan(stored.originalPlan);
          setEditHistory([]);
        } else {
          // Projeto sem plano salvo — limpa estado
          setEditingPlan(null);
          setOriginalPlan(null);
          setEditHistory([]);
        }
      } catch (err) {
        // Falha na carga não deve quebrar a UI
        console.warn('Erro ao carregar plano de edição persistido:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  // ─── Geração do plano ──────────────────────────────────────────

  const generatePlan = useCallback(
    async (script: string, scenes: EditingPlanSceneInput[], durationInSeconds: number, audioUrl?: string | null) => {
      cancelRef.current = false;
      setIsGeneratingPlan(true);
      setPlanProgress(0);
      setError(null);
      setPlanStatusText('Preparando geração...');

      let stageInterval: ReturnType<typeof setInterval> | null = null;

      try {
        // ─── Análise de áudio (opcional) ────────────────────────
        let audioAnalysis: AudioAnalysisResult | null = null;

        if (audioUrl) {
          try {
            setPlanProgress(AUDIO_ANALYSIS_PROGRESS);
            setPlanStatusText(AUDIO_ANALYSIS_TEXT);

            if (cancelRef.current) throw new Error('Geração do plano cancelada pelo usuário.');

            const response = await fetch(audioUrl);
            const audioData = await response.arrayBuffer();
            audioAnalysis = await analyzeAudioForEditing(audioData);
          } catch {
            // Falha na análise (CORS, formato, etc.) — continua sem dados de áudio
            console.warn('[useEditingPlan] Análise de áudio falhou, continuando sem análise.');
          }
        }

        // Progresso baseado em etapas (para em 80% — ao completar salta para 100%)
        let stageIndex = 0;
        stageInterval = setInterval(() => {
          if (stageIndex < GENERATION_STAGES.length) {
            setPlanProgress(GENERATION_STAGES[stageIndex].progress);
            setPlanStatusText(GENERATION_STAGES[stageIndex].text);
            stageIndex++;
          }
          // Para automaticamente quando atinge a última etapa
          if (stageIndex >= GENERATION_STAGES.length && stageInterval) {
            clearInterval(stageInterval);
            stageInterval = null;
          }
        }, 500);

        if (cancelRef.current) throw new Error('Geração do plano cancelada pelo usuário.');

        // ─── Carregamento de imagens para análise visual ─────────
        let sceneImages: SceneImagePayload[] = [];

        const scenesWithImages = scenes.filter(s => s.imageUrl?.trim());
        if (scenesWithImages.length > 0) {
          try {
            sceneImages = await loadSceneImagesForAnalysis(scenesWithImages);
          } catch {
            // Falha no carregamento de imagens — continua sem análise visual
            console.warn('[useEditingPlan] Carregamento de imagens falhou, continuando sem análise visual.');
          }
        }

        if (cancelRef.current) throw new Error('Geração do plano cancelada pelo usuário.');

        const plan = await generateEditingPlan(script, scenes, durationInSeconds, audioAnalysis, sceneImages);

        if (cancelRef.current) throw new Error('Geração do plano cancelada pelo usuário.');

        // Salva análise de áudio no estado para reutilizar em regenerateScene
        setAudioAnalysisResult(audioAnalysis);

        setEditingPlan(plan);
        setOriginalPlan(plan); // Salva original para undo/reset
        setEditHistory([]); // Limpa histórico de edições anteriores
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
        } else if (msg.includes('token count exceeds') || msg.includes('maximum number of tokens') || msg.includes('invalid_argument')) {
          setError('O conteúdo é muito longo para o modelo processar. Tente com menos cenas ou um roteiro mais curto.');
        } else if (msg.includes('deadline') || msg.includes('504')) {
          setError('O servidor demorou demais para responder. Tente novamente.');
        } else if (msg.includes('unavailable') || msg.includes('503')) {
          setError('Serviço temporariamente indisponível. Tente novamente em instantes.');
        } else {
          setError('Não foi possível gerar o plano de edição. Tente novamente.');
        }
      } finally {
        if (stageInterval) clearInterval(stageInterval);
        setIsGeneratingPlan(false);
      }
    },
    [],
  );

  // ─── Edição com histórico (undo) ───────────────────────────────

  const updateScene = useCallback((index: number, updates: Partial<EditingScene>) => {
    setEditingPlan(prev => {
      if (!prev) return prev;
      // Salva estado atual no histórico antes de modificar
      setEditHistory(history => [...history.slice(-(MAX_UNDO_HISTORY - 1)), prev]);
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  }, []);

  const undoLastEdit = useCallback(() => {
    setEditHistory(history => {
      if (history.length === 0) return history;
      const lastState = history[history.length - 1];
      setEditingPlan(lastState);
      return history.slice(0, -1);
    });
  }, []);

  const resetToOriginal = useCallback(() => {
    if (originalPlan) {
      setEditingPlan(originalPlan);
      setEditHistory([]);
    }
  }, [originalPlan]);

  const canUndo = editHistory.length > 0;

  // ─── Re-geração individual de cena ────────────────────────────

  const regenerateScene = useCallback(
    async (index: number, script: string, scenes: EditingPlanSceneInput[], durationInSeconds: number) => {
      // Carrega imagens para análise visual na re-geração (silencioso em caso de falha)
      let sceneImages: SceneImagePayload[] = [];
      const scenesWithImages = scenes.filter(s => s.imageUrl?.trim());
      if (scenesWithImages.length > 0) {
        try {
          sceneImages = await loadSceneImagesForAnalysis(scenesWithImages);
        } catch {
          // Falha silenciosa — re-gera sem análise visual
        }
      }

      // Solicita plano completo para manter coerência entre cenas
      const newPlan = await generateEditingPlan(script, scenes, durationInSeconds, audioAnalysisResult, sceneImages);

      // Substitui só a cena no índice solicitado
      setEditingPlan(prev => {
        if (!prev || index >= prev.length || index >= newPlan.length) return prev;
        // Salva estado atual no histórico
        setEditHistory(history => [...history.slice(-(MAX_UNDO_HISTORY - 1)), prev]);
        const updated = [...prev];
        updated[index] = newPlan[index];
        return updated;
      });
    },
    [audioAnalysisResult],
  );

  // ─── Utilitários ──────────────────────────────────────────────

  const clearPlan = useCallback(() => {
    setEditingPlan(null);
    setOriginalPlan(null);
    setAudioAnalysisResult(null);
    setPlanProgress(0);
    setPlanStatusText('');
    setError(null);
    setIsGeneratingPlan(false);
    setEditHistory([]);
  }, []);

  const cancelPlan = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return {
    editingPlan,
    originalPlan,
    isGeneratingPlan,
    planProgress,
    planStatusText,
    error,
    generatePlan,
    clearPlan,
    updateScene,
    cancelPlan,
    resetToOriginal,
    undoLastEdit,
    canUndo,
    regenerateScene,
  };
}
