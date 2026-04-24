import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { GAP_COMPACT, RADIUS_CHIP } from '../../theme/tokens';

interface MetadataPillProps {
  icon: React.ReactNode;
  label: string;
}

/** Badge compacto para metadados (data, hora, duração) */
export function MetadataPill({ icon, label }: MetadataPillProps) {
  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: GAP_COMPACT,
        px: 1,
        py: 0.5,
        borderRadius: RADIUS_CHIP,
        backgroundColor: alpha(theme.palette.common.white, 0.05),
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
      })}
    >
      {icon}
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
