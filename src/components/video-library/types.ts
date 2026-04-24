import type { Project } from '../../lib/db';

/** Cena de vídeo com imagem e timestamp */
export interface VideoLibraryScene {
  imageUrl: string;
  timestamp: number;
}

/** Item da galeria — estende Project com campos opcionais de mídia */
export interface VideoLibraryItem extends Project {
  thumbnail?: string;
  isGeneration?: boolean;
  audioUrl?: string;
  scenes?: VideoLibraryScene[];
}

/** Props públicas do componente VideoLibrary */
export interface VideoLibraryProps {
  onSelect: (
    projectId: string,
    audioUrl: string,
    scenes: { imageUrl: string; timestamp: number }[],
    script: string,
  ) => void;
  activeProjectId?: string | null;
}

/** Ordem de classificação da galeria */
export type SortOrder = 'recent' | 'oldest';
