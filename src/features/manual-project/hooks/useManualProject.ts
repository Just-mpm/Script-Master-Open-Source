/**
 * Hook principal do wizard de Projeto Manual.
 *
 * Encapsula o reducer + side effects:
 *  - cleanup de blob URLs ao desmontar
 *  - analytics (9 eventos)
 *  - validação assíncrona de áudio/imagens
 *  - persistência via saveProject / saveAudioToProject / saveImageToProject
 *  - save sequencial (project → audio → images)
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createLogger } from '../../../lib/logger';
import { categorizeAnalyticsError, trackAnalyticsEvent } from '../../../lib/analytics';
import {
  saveProject,
  saveAudioToProject,
  saveImageToProject,
} from '../../../lib/db/projects';
import {
  buildAudioSource,
  buildProjectFromDraft,
  buildProjectImages,
  generateLocalId,
  type VideoSceneSeed,
} from '../lib/manualProjectHelpers';
import {
  getSizeBucket,
  validateAudioFile,
  validateImageFile,
  validateProjectName,
} from '../lib/manualProjectValidation';
import { useAudioGeneratorStore } from '../../studio/store/audioGeneratorStore';
import {
  MAX_IMAGES,
  type AudioUploadItem,
  type ImageUploadItem,
  type ManualProjectDraft,
  type ManualProjectSaveResult,
  type UseManualProjectReturn,
} from '../types';
import { INITIAL_DRAFT, manualProjectReducer } from './useManualProjectReducer';

const log = createLogger('useManualProject');

/** Converte `ValidationErrorKind` em `AnalyticsErrorCategory`.
 *
 * Erros de validação do cliente não mapeiam para categorias server-side
 * específicas — todos caem em 'unknown'. Detalhes ficam no payload do evento
 * (size_bucket, error_kind) para diagnóstico. */
function errorKindToCategory(): 'unknown' {
  return 'unknown';
}

export function useManualProject(): UseManualProjectReturn {
  const [draft, dispatch] = useReducer(manualProjectReducer, INITIAL_DRAFT);
  const [isSaving, setIsSaving] = useState(false);

  // Ref para set de blob URLs — cleanup ao desmontar
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      blobUrlsRef.current = new Set();
    };
  }, []);

  // ─── Analytics: started ───
  useEffect(() => {
    trackAnalyticsEvent('manual_project_started', {});
  }, []);

  // ─── Adicionar áudio ───
  const addAudio = useCallback(async (file: File): Promise<void> => {
    dispatch({ type: 'SET_AUDIO_VALIDATION', state: { kind: 'validating' } });

    const result = await validateAudioFile(file);
    if (!result.ok) {
      const category = errorKindToCategory();
      trackAnalyticsEvent('manual_project_audio_upload_failed', {
        error_category: category,
        size_bucket: getSizeBucket(file.size),
      });
      dispatch({
        type: 'SET_AUDIO_VALIDATION',
        state: {
          kind: 'invalid',
          error: result.errorKind ?? 'unknown',
          message: result.errorMessage ?? 'Áudio inválido.',
        },
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    blobUrlsRef.current.add(previewUrl);

    // Probe de duração via decodeAudioData
    const duration = await probeDurationFromBlob(file);

    const item: AudioUploadItem = {
      localId: generateLocalId(),
      file,
      previewUrl,
      durationSec: duration,
      mimeType: file.type,
      sizeBytes: file.size,
    };

    dispatch({ type: 'ADD_AUDIO', item });

    trackAnalyticsEvent('manual_project_audio_uploaded', {
      size_bucket: getSizeBucket(file.size),
      duration_bucket: getDurationBucketForAnalytics(duration),
      duration_seconds: duration,
    });
  }, []);

  // ─── Remover áudio ───
  const removeAudio = useCallback((): void => {
    dispatch({ type: 'REMOVE_AUDIO' });
  }, []);

  // ─── Adicionar imagens (com yield ao event loop entre cada) ───
  const addImages = useCallback(async (files: File[]): Promise<void> => {
    if (files.length === 0) return;

    // Limita quantidade total (incluindo existentes)
    const remaining = MAX_IMAGES - draft.images.length;
    if (remaining <= 0) return;

    const filesToProcess = files.slice(0, remaining);
    const accepted: ImageUploadItem[] = [];
    let failed = 0;

    for (const file of filesToProcess) {
      // Yield ao event loop para não travar UI
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      const result = await validateImageFile(file);
      if (!result.ok) {
        const category = errorKindToCategory();
        trackAnalyticsEvent('manual_project_image_upload_failed', {
          error_category: category,
          size_bucket: getSizeBucket(file.size),
        });
        failed += 1;
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      blobUrlsRef.current.add(previewUrl);

      const { width, height } = await readDimensionsFromBlobUrl(previewUrl);
      accepted.push({
        localId: generateLocalId(),
        file,
        previewUrl,
        width,
        height,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }

    if (accepted.length > 0) {
      dispatch({ type: 'ADD_IMAGES', items: accepted });
      trackAnalyticsEvent('manual_project_image_uploaded', {
        count: accepted.length,
        size_bucket: getSizeBucket(accepted.reduce((sum, i) => sum + i.sizeBytes, 0)),
      });
    }

    if (failed > 0 && accepted.length === 0) {
      log.warn('Todas as imagens falharam validação', { failed, total: filesToProcess.length });
    }
  }, [draft.images.length]);

  // ─── Remover imagem ───
  const removeImage = useCallback((localId: string): void => {
    dispatch({ type: 'REMOVE_IMAGE', localId });
  }, []);

  // ─── Mover imagem (reorder) ───
  const moveImage = useCallback((fromIndex: number, toIndex: number, totalCount: number): void => {
    dispatch({ type: 'MOVE_IMAGE', fromIndex, toIndex });
    trackAnalyticsEvent('manual_project_images_reordered', {
      count: totalCount,
      from_index: fromIndex,
      to_index: toIndex,
    });
  }, []);

  // ─── Setters de nome/script ───
  const setName = useCallback((name: string): void => {
    dispatch({ type: 'SET_NAME', name });
  }, []);

  const setScript = useCallback((script: string): void => {
    dispatch({ type: 'SET_SCRIPT', script });
  }, []);

  // ─── Reset ───
  const reset = useCallback((): void => {
    dispatch({ type: 'RESET' });
  }, []);

  // ─── canAdvance memoizado ───
  const canAdvance = useMemo<boolean>(() => {
    const nameOk = validateProjectName(draft.name).ok;
    const audioOk = draft.audio !== null && draft.audioValidation.kind === 'valid';
    const imagesOk = draft.images.length > 0;
    return nameOk && audioOk && imagesOk;
  }, [draft.name, draft.audio, draft.audioValidation, draft.images.length]);

  // ─── Save sequencial ───
  const save = useCallback(async (userId: string): Promise<ManualProjectSaveResult> => {
    if (!userId) {
      return { ok: false, errorKind: 'unauthenticated', errorMessage: 'Faça login para salvar o projeto.' };
    }

    if (!canAdvance) {
      return { ok: false, errorKind: 'project_save_failed', errorMessage: 'Preencha nome, áudio e ao menos uma imagem.' };
    }

    setIsSaving(true);

    const projectId = generateLocalId().replace('local_', 'manual_');

    try {
      // 1. Project
      const project = buildProjectFromDraft(draft, projectId);
      try {
        await saveProject(project, userId);
      } catch (error) {
        log.error('Falha ao salvar projeto', { error });
        trackAnalyticsEvent('manual_project_save_failed', {
          error_category: categorizeAnalyticsError(error),
          stage: 'project',
        });
        return { ok: false, errorKind: 'project_save_failed', errorMessage: 'Não foi possível salvar o projeto.' };
      }

      // 2. Audio
      if (draft.audio) {
        const audioSource = buildAudioSource(draft, projectId, generateLocalId().replace('local_', 'aud_'));
        try {
          await saveAudioToProject(audioSource, userId);
        } catch (error) {
          log.error('Falha ao salvar áudio', { error });
          trackAnalyticsEvent('manual_project_save_failed', {
            error_category: categorizeAnalyticsError(error),
            stage: 'audio',
          });
          return {
            ok: true, // project foi salvo, áudio falhou
            projectId,
            errorKind: 'audio_save_failed',
            errorMessage: 'Projeto salvo, mas o áudio falhou. Tente reenviar depois.',
          };
        }
      }

      // 3. Images
      if (draft.images.length > 0) {
        const duration = draft.audio?.durationSec ?? 30;
        const projectImages = buildProjectImages(draft, projectId, duration);
        let imagesSucceeded = 0;
        for (const image of projectImages) {
          try {
            await saveImageToProject(image, userId);
            imagesSucceeded += 1;
          } catch (error) {
            log.error('Falha ao salvar imagem', { error, imageId: image.id });
            trackAnalyticsEvent('manual_project_save_failed', {
              error_category: categorizeAnalyticsError(error),
              stage: 'images',
            });
          }
        }
        if (imagesSucceeded < projectImages.length) {
          return {
            ok: true,
            projectId,
            errorKind: 'image_save_failed',
            errorMessage: `Projeto salvo. ${imagesSucceeded}/${projectImages.length} imagens foram salvas.`,
          };
        }
      }

      // Sucesso — atualiza store global para VideoPage.
      // IMPORTANTE: NÃO adicionar audioUrl ao blobUrlsRef — o ciclo de vida
      // do blob é gerenciado pelo `audioGeneratorStore.loadProjectData()`,
      // que revoga a URL anterior. Adicionar aqui causaria revogação dupla
      // no unmount do hook, quebrando o player cross-route.
      if (draft.audio) {
        const scenes: VideoSceneSeed[] = buildVideoScenesFromDraft(draft);
        const audioUrl = URL.createObjectURL(draft.audio.file);
        void useAudioGeneratorStore.getState().loadProjectData(
          audioUrl,
          scenes,
          draft.audio.file,
          projectId,
          draft.script.trim() || null,
        );
      }

      trackAnalyticsEvent('manual_project_saved', {
        image_count: draft.images.length,
        audio_duration_seconds: draft.audio?.durationSec ?? 0,
        has_script: draft.script.trim().length > 0,
        source: 'library',
      });

      return { ok: true, projectId };
    } finally {
      setIsSaving(false);
    }
  }, [canAdvance, draft]);

  return {
    draft,
    addAudio,
    removeAudio,
    addImages,
    removeImage,
    moveImage,
    setName,
    setScript,
    reset,
    canAdvance,
    isSaving,
    save,
  };
}

// ─── Helpers locais ───

async function probeDurationFromBlob(file: File): Promise<number> {
  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } finally {
    void audioContext.close();
  }
}

async function readDimensionsFromBlobUrl(blobUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Falha ao ler dimensões'));
    img.src = blobUrl;
  });
}

function getDurationBucketForAnalytics(seconds: number): string {
  if (seconds <= 30) return 'short';
  if (seconds <= 180) return 'medium';
  return 'long';
}

function buildVideoScenesFromDraft(draft: ManualProjectDraft): VideoSceneSeed[] {
  const duration = draft.audio?.durationSec ?? 30;
  const step = draft.images.length > 0 ? duration / draft.images.length : 0;
  return draft.images.map((img, index) => {
    // IMPORTANTE: cria um NOVO blob URL a partir de `img.file` em vez de
    // reusar `img.previewUrl`. O `previewUrl` está registrado em
    // `blobUrlsRef` e será revogado no cleanup do useEffect quando o
    // ManualProjectPage desmontar — o que acontece quando o usuário
    // navega para /app/video. Reusar quebraria o player cross-route.
    // O novo blob URL NÃO é adicionado ao `blobUrlsRef` porque seu
    // ciclo de vida agora é gerenciado pelo `audioGeneratorStore.loadProjectData()`,
    // que revoga a URL anterior em chamadas subsequentes.
    return {
      imageUrl: URL.createObjectURL(img.file),
      timestamp: Math.round(index * step * 10) / 10,
    };
  });
}
