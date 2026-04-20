import type { EditingPlan } from '../../features/video-render/lib/editingPlan';
import { EDITING_PLAN_STORE, getIndexedDbItem, putIndexedDbItem, deleteIndexedDbItem } from './shared';

/** Estrutura persistida no IndexedDB para o plano de edição de um projeto */
export interface StoredEditingPlan {
  id: string; // projectId
  plan: EditingPlan;
  originalPlan: EditingPlan | null;
  updatedAt: number;
}

/**
 * Salva o plano de edição de um projeto no IndexedDB.
 * Dados temporários por projeto — não precisam de sync com Firestore.
 */
export async function saveEditingPlan(
  projectId: string,
  plan: EditingPlan,
  originalPlan: EditingPlan | null,
): Promise<void> {
  const stored: StoredEditingPlan = {
    id: projectId,
    plan,
    originalPlan,
    updatedAt: Date.now(),
  };
  await putIndexedDbItem(EDITING_PLAN_STORE, stored);
}

/**
 * Carrega o plano de edição salvo de um projeto.
 * Retorna null se não existir plano persistido.
 */
export async function loadEditingPlan(projectId: string): Promise<StoredEditingPlan | null> {
  return getIndexedDbItem<StoredEditingPlan>(EDITING_PLAN_STORE, projectId);
}

/**
 * Remove o plano de edição persistido de um projeto.
 */
export async function deleteEditingPlan(projectId: string): Promise<void> {
  await deleteIndexedDbItem(EDITING_PLAN_STORE, projectId);
}
