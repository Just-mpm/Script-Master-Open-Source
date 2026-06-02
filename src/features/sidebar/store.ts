import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Estado da sidebar (colapsada/expandida).
 * Persistido em localStorage com chave 's2a_sidebar_collapsed'.
 * Default: collapsed (maximiza espaço para conteúdo).
 */
interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: true,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    {
      name: 's2a_sidebar_collapsed',
      partialize: (state) => ({ collapsed: state.collapsed }),
    },
  ),
);
