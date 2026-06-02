import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSidebarStore } from '../../../src/features/sidebar/store';

/**
 * Testes do store Zustand `useSidebarStore`.
 *
 * Cobre:
 * - Estado inicial (`collapsed: true` por padrão)
 * - Action `toggle()` (alterna collapsed)
 * - Action `setCollapsed(boolean)` (define explicitamente)
 * - Persistência via middleware `persist` (chave `s2a_sidebar_collapsed`)
 *
 * Estratégia: usa o `localStorage` real do jsdom (disponível por padrão),
 * limpando entre testes. O Zustand `persist` v5+ usa `createJSONStorage(() => localStorage)`,
 * que resolve a referência em runtime — não em tempo de criação da store —,
 * portanto o stub em `beforeEach` é seguro e suficiente.
 */
describe('useSidebarStore', () => {
  beforeEach(() => {
    // Limpa localStorage para isolar cada teste
    localStorage.clear();
    // Garante estado inicial determinístico antes de cada teste
    useSidebarStore.setState({ collapsed: true });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── Estado inicial ─────────────────────────────────────────

  describe('estado inicial', () => {
    it('collapsed deve ser true por padrão', () => {
      expect(useSidebarStore.getState().collapsed).toBe(true);
    });

    it('expõe actions toggle e setCollapsed como funções', () => {
      const state = useSidebarStore.getState();
      expect(typeof state.toggle).toBe('function');
      expect(typeof state.setCollapsed).toBe('function');
    });
  });

  // ─── toggle ─────────────────────────────────────────────────

  describe('toggle', () => {
    it('alterna collapsed de true para false', () => {
      useSidebarStore.getState().toggle();
      expect(useSidebarStore.getState().collapsed).toBe(false);
    });

    it('alterna collapsed de false para true', () => {
      useSidebarStore.setState({ collapsed: false });
      useSidebarStore.getState().toggle();
      expect(useSidebarStore.getState().collapsed).toBe(true);
    });

    it('alternar duas vezes retorna ao estado original', () => {
      const original = useSidebarStore.getState().collapsed;
      useSidebarStore.getState().toggle();
      useSidebarStore.getState().toggle();
      expect(useSidebarStore.getState().collapsed).toBe(original);
    });
  });

  // ─── setCollapsed ───────────────────────────────────────────

  describe('setCollapsed', () => {
    it('define collapsed = false', () => {
      useSidebarStore.getState().setCollapsed(false);
      expect(useSidebarStore.getState().collapsed).toBe(false);
    });

    it('define collapsed = true (já era true, mas não deve quebrar)', () => {
      useSidebarStore.getState().setCollapsed(true);
      expect(useSidebarStore.getState().collapsed).toBe(true);
    });

    it('após setCollapsed(false), toggle() traz de volta para true', () => {
      useSidebarStore.getState().setCollapsed(false);
      useSidebarStore.getState().toggle();
      expect(useSidebarStore.getState().collapsed).toBe(true);
    });
  });

  // ─── Persistência (Zustand persist) ─────────────────────────

  describe('persistência em localStorage', () => {
    it('grava na chave s2a_sidebar_collapsed quando o estado muda', () => {
      useSidebarStore.getState().setCollapsed(false);
      const serialized = localStorage.getItem('s2a_sidebar_collapsed');
      expect(serialized).not.toBeNull();
    });

    it('serializa o estado no formato {state, version}', () => {
      useSidebarStore.getState().setCollapsed(false);
      const serialized = localStorage.getItem('s2a_sidebar_collapsed');
      expect(serialized).not.toBeNull();
      const parsed = JSON.parse(serialized as string);
      expect(parsed).toMatchObject({
        state: { collapsed: false },
        version: 0,
      });
    });

    it('toggle() também persiste no localStorage', () => {
      useSidebarStore.getState().toggle();
      const serialized = localStorage.getItem('s2a_sidebar_collapsed');
      expect(serialized).not.toBeNull();
      const parsed = JSON.parse(serialized as string);
      expect(parsed.state.collapsed).toBe(false);
    });

    it('serializa apenas o campo collapsed (partialize)', () => {
      useSidebarStore.getState().setCollapsed(true);
      const serialized = localStorage.getItem('s2a_sidebar_collapsed');
      expect(serialized).not.toBeNull();
      const parsed = JSON.parse(serialized as string);
      // partialize filtra apenas `collapsed` — actions não são serializadas
      expect(parsed.state).toEqual({ collapsed: true });
      expect(parsed.state).not.toHaveProperty('toggle');
      expect(parsed.state).not.toHaveProperty('setCollapsed');
    });
  });
});
