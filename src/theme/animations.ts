import type { SxProps } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

/**
 * Animação CSS reutilizável — pulse do dot indicador de export de vídeo.
 *
 * Espelha o "ponto azul pulsante" usado em `SidebarNavItem` (sidebar desktop)
 * e `MobileBottomNav` (bottom bar mobile) para sinalizar que há uma renderização
 * de vídeo em andamento. Quando o render termina, o dot vira verde estático.
 *
 * Centralizamos a definição aqui para garantir que ambos os pontos pulsem
 * exatamente na mesma frequência e amplitude (UX consistente entre desktop
 * e mobile) e para evitar o `@keyframes` duplicado inline no JSX — antes da
 * v0.134.0 cada componente redefinia a animação localmente.
 *
 * Uso (array syntax do MUI v9, padrão oficial para SxProps compartilhados):
 * ```tsx
 * <Box sx={[exportDotPulseKeyframes, { animation: 'exportDotPulse 1.6s ease-in-out infinite' }]} />
 * ```
 *
 * O `keyframes` é gerenciado pelo Emotion automaticamente quando usado via `sx`,
 * mas exposto também como constante para casos que precisem montar `SxProps`
 * manualmente (ex: spread + extensão).
 */
export const exportDotPulseKeyframes = {
  '@keyframes exportDotPulse': {
    '0%, 100%': { transform: 'scale(1)', opacity: 1 },
    '50%': { transform: 'scale(1.4)', opacity: 0.7 },
  },
} as const satisfies SxProps<Theme>;
