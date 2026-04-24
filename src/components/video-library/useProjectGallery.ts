import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getProjects,
  getProjectsDetailsMap,
  getGenerations,
  deleteProject,
  deleteGeneration,
} from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { createLogger } from '../../lib/logger';
import type { VideoLibraryItem, VideoLibraryProps, SortOrder } from './types';

const log = createLogger('VideoLibrary:gallery');

/** Hook dedicado à lógica de busca, filtro, ordenação e exclusão da galeria */
export function useProjectGallery(
  onSelect: VideoLibraryProps['onSelect'],
) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<VideoLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<VideoLibraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Blob URL tracking ---
  const blobUrlsRef = useRef<Set<string>>(new Set());
  /** Mapeia blob URL → ID do item para revogação seletiva */
  const blobUrlItemMapRef = useRef<Map<string, string>>(new Map());

  const createTrackedBlobUrl = useCallback((blob: Blob, itemId: string): string => {
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.add(url);
    blobUrlItemMapRef.current.set(url, itemId);
    return url;
  }, []);

  const revokeAllBlobUrls = useCallback(() => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current.clear();
    blobUrlItemMapRef.current.clear();
  }, []);

  const revokeBlobUrlsForItem = useCallback((itemId: string) => {
    blobUrlsRef.current.forEach((url) => {
      if (blobUrlItemMapRef.current.get(url) === itemId) {
        URL.revokeObjectURL(url);
        blobUrlsRef.current.delete(url);
        blobUrlItemMapRef.current.delete(url);
      }
    });
  }, []);

  useEffect(() => revokeAllBlobUrls, [revokeAllBlobUrls]);

  // --- Carregamento de projetos ---
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    revokeAllBlobUrls();
    try {
      const [projectsData, generationsData] = await Promise.all([
        getProjects(user?.uid),
        getGenerations(user?.uid),
      ]);
      const projectDetailsMap = await getProjectsDetailsMap(user?.uid);

      const unified: VideoLibraryItem[] = [
        ...projectsData.map((p) => ({ ...p, isGeneration: false })),
        ...generationsData.filter((g) => g.scenes && g.scenes.length > 0).map((g) => ({
          id: g.id,
          name: g.name,
          script: g.script,
          createdAt: g.createdAt,
          userId: g.userId,
          isGeneration: true,
          audioUrl: g.audioUrl,
          scenes: g.scenes,
          settings: {
            selectedVoice: g.voice,
            pace: 'normal',
            styleNotes: '',
            isMultiSpeaker: false,
            speakerAName: '',
            speakerBName: '',
            speakerBVoice: '',
            audioProfile: '',
            scene: '',
            sceneDensity: 15,
            sceneRatio: '16:9',
          },
        })),
      ];

      const sorted = unified.sort((a, b) => b.createdAt - a.createdAt);

      const finalItems = await Promise.all(sorted.map(async (item) => {
        if (item.isGeneration) {
          return {
            ...item,
            thumbnail: item.scenes?.[0]?.imageUrl,
          };
        }
        try {
          const details = projectDetailsMap[item.id];
          if (!details) {
            return item;
          }
          return {
            ...item,
            thumbnail: details.images[0]?.imageUrl || (details.images[0]?.imageBlob ? createTrackedBlobUrl(details.images[0].imageBlob, item.id) : undefined),
            audioUrl: details.audios[0]?.audioUrl || (details.audios[0]?.audioBlob ? createTrackedBlobUrl(details.audios[0].audioBlob, item.id) : ''),
            scenes: details.images.map((img) => ({ imageUrl: img.imageUrl || (img.imageBlob ? createTrackedBlobUrl(img.imageBlob, item.id) : ''), timestamp: img.timestamp })),
          };
        } catch {
          return item;
        }
      }));

      setProjects(finalItems);
    } catch (err) {
      log.error('Falha ao carregar galeria de vídeos', { error: err });
      setError('Não foi possível carregar a galeria. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user, revokeAllBlobUrls, createTrackedBlobUrl]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // --- Filtro e ordenação ---
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return [...projects].sort((a, b) =>
        sortOrder === 'recent'
          ? b.createdAt - a.createdAt
          : a.createdAt - b.createdAt,
      );
    }

    const query = searchQuery.toLowerCase().trim();
    const matched = projects.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      p.script.toLowerCase().includes(query),
    );

    return matched.sort((a, b) =>
      sortOrder === 'recent'
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt,
    );
  }, [projects, searchQuery, sortOrder]);

  // --- Seleção ---
  const handleSelect = useCallback((item: VideoLibraryItem) => {
    if (item.audioUrl && item.scenes) {
      onSelect(item.id, item.audioUrl, item.scenes, item.script);
    }
  }, [onSelect]);

  // --- Exclusão ---
  const confirmDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;

    setDeletingItem(true);
    setDeleteError(null);
    try {
      if (itemToDelete.isGeneration) {
        await deleteGeneration(itemToDelete.id, user?.uid);
      } else {
        await deleteProject(itemToDelete.id, user?.uid);
      }

      setProjects((prev) => prev.filter((p) => p.id !== itemToDelete.id));
      setItemToDelete(null);
      revokeBlobUrlsForItem(itemToDelete.id);
    } catch (err) {
      log.error('Falha ao excluir item da galeria', { error: err });
      setDeleteError('Não foi possível excluir o item. Tente novamente.');
    } finally {
      setDeletingItem(false);
    }
  }, [itemToDelete, user, revokeBlobUrlsForItem]);

  return {
    projects,
    loading,
    error,
    filteredProjects,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    itemToDelete,
    deletingItem,
    deleteError,
    setItemToDelete,
    confirmDeleteItem,
    handleSelect,
    reload: loadProjects,
  };
}
