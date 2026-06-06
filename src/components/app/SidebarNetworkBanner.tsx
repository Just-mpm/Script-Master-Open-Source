import Box from '@mui/material/Box';
import { NetworkStatusIndicator } from '../NetworkStatusIndicator';

/**
 * Banner sobreposto (Snackbar-like) com o indicador de status de conexão.
 *
 * Aparece no topo da página, centralizado, apenas quando o usuário está
 * offline. Substitui a posição que o `NetworkStatusIndicator` ocupava
 * dentro do Header (layout legado, substituído pela Sidebar).
 *
 * O container externo usa `pointer-events: none` para que o banner não
 * bloqueie cliques no conteúdo abaixo quando o indicador estiver
 * visível em uma faixa estreita do topo. O conteúdo interno
 * reativa `pointer-events: auto` para manter o tooltip interativo.
 */
export function SidebarNetworkBanner() {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        // Acima de Sidebar (1200), ActionBar (1400) e Dialogs (1300)
        zIndex: 1500,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        px: 2,
        pt: 1.5,
      }}
    >
      <Box sx={{ pointerEvents: 'auto' }}>
        <NetworkStatusIndicator />
      </Box>
    </Box>
  );
}
