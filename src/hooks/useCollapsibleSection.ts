/**
 * useCollapsibleSection — hook auxiliar para colapso controlado de StackedHeader.
 *
 * Encapsula useState + useId para reduzir boilerplate em consumidores que usam
 * o StackedHeader colapsável. Cada chamada tem estado independente.
 *
 * @example
 * ```tsx
 * const { expanded, onToggle, collapseId } = useCollapsibleSection(true);
 *
 * <StackedHeader
 *   variant="glass"
 *   collapsible
 *   expanded={expanded}
 *   onToggle={onToggle}
 *   collapseId={collapseId}
 *   title="Voz do locutor"
 * >
 *   <VoiceSelector />
 * </StackedHeader>
 * ```
 */
import { useCallback, useId, useState } from 'react';

export interface UseCollapsibleSectionResult {
  /** Estado expandido atual. */
  expanded: boolean;
  /** Handler para alternar o estado. Aceita valor opcional (se omitido, inverte). */
  onToggle: (next?: boolean) => void;
  /** ID único para conectar `<ButtonBase aria-controls>` ao `<Collapse id>`. */
  collapseId: string;
}

/**
 * Hook de colapso controlado. Inicializa com `initial` (default: `true`).
 * Gera um `collapseId` único via React `useId` para evitar conflitos de aria-controls.
 */
export function useCollapsibleSection(initial = true): UseCollapsibleSectionResult {
  const [expanded, setExpanded] = useState(initial);
  // useId garante IDs únicos mesmo com múltiplas instâncias na mesma página
  const reactId = useId();
  const collapseId = `stacked-header-${reactId.replace(/:/g, '')}`;

  const onToggle = useCallback((next?: boolean) => {
    setExpanded((prev) => (next ?? !prev));
  }, []);

  return { expanded, onToggle, collapseId };
}
