import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Library } from '../components/Library';
import { APP_MAX_WIDTH } from '../theme/tokens';

export function LibraryPage() {
  return (
    <Box>
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: 0 }}>
        <Library />
      </Container>
    </Box>
  );
}
