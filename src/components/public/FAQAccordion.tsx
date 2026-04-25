import type { ReactNode } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BRAND_PRIMARY, TEXT_SECONDARY, GAP_DEFAULT } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';

// ── Constantes de estilização ──────────────────────────────────────────

/** Duração da transição de expand/collapse em milissegundos */
const EXPAND_TRANSITION_MS = 300;

/** Altura da linha do texto de resposta para legibilidade */
const ANSWER_LINE_HEIGHT = 1.7;

/** Largura máxima do container para leitura confortável em desktop */
const CONTAINER_MAX_WIDTH = 800;

/** Espessura da borda indicadora de accordion expandido */
const ACTIVE_INDICATOR_WIDTH = 3;

// ── Tipos ─────────────────────────────────────────────────────────────

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  /** Título opcional exibido acima do grupo de accordions */
  title?: string;
}

// ── Componente ─────────────────────────────────────────────────────────

export function FAQAccordion({ items, title }: FAQAccordionProps): ReactNode {
  const theme = useTheme();

  return (
    <Box sx={(theme) => glassPanelSx(theme)}>
      {/* Container interno com largura limitada para leitura */}
      <Box sx={{ maxWidth: CONTAINER_MAX_WIDTH, mx: 'auto' }}>
        {title && (
          <Typography
            variant="h3"
            component="h2"
            sx={{
              px: { xs: 3, md: 5 },
              pt: { xs: 4, md: 5 },
              pb: { xs: 2, md: 3 },
            }}
          >
            {title}
          </Typography>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Accordion
              key={`faq-${index}`}
              elevation={0}
              disableGutters
              slotProps={{ transition: { timeout: EXPAND_TRANSITION_MS } }}
              sx={{
                // Fundo transparente por padrão
                backgroundColor: 'transparent',
                // Borda inferior como divisor (exceto no último item)
                borderBottom: isLast ? 'none' : `1px solid ${theme.palette.divider}`,

                // Indicador visual ao expandir: borda esquerda com brand primary
                '&.Mui-expanded': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  borderLeft: `${ACTIVE_INDICATOR_WIDTH}px solid ${BRAND_PRIMARY}`,
                },

                // Remover sombra padrão do MUI
                boxShadow: 'none',

                // Transição suave no background ao expandir
                transition: `background-color ${EXPAND_TRANSITION_MS}ms ease-in-out, border-color ${EXPAND_TRANSITION_MS}ms ease-in-out`,

                // Espaçamento interno do container
                '&:before': { display: 'none' }, // remove a linha separadora padrão do MUI

                // Primeiro item sem borda superior
                ...(index === 0 && { borderTop: 'none' }),
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      color: 'text.secondary',
                      transition: `transform ${EXPAND_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), color ${EXPAND_TRANSITION_MS}ms ease`,
                    }}
                  />
                }
                sx={{
                  // Padding responsivo
                  px: { xs: 3, md: 5 },
                  py: { xs: 1.5, md: 2 },
                  // Hover sutil
                  transition: 'background-color 200ms ease',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.background.paper, 0.06),
                  },
                  // Diminuir padding do conteúdo quando expandido
                  '&.Mui-expanded': {
                    minHeight: 'auto',
                    '& .MuiAccordionSummary-content': {
                      my: { xs: 1.5, md: 2 },
                    },
                    '& .MuiAccordionSummary-expandIcon': {
                      color: BRAND_PRIMARY,
                    },
                  },
                  '& .MuiAccordionSummary-content': {
                    my: { xs: 1, md: 1.5 },
                    gap: GAP_DEFAULT,
                  },
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    fontSize: { xs: '0.95rem', md: '1rem' },
                    lineHeight: 1.5,
                  }}
                >
                  {item.question}
                </Typography>
              </AccordionSummary>

              <AccordionDetails
                sx={{
                  px: { xs: 3, md: 5 },
                  pb: { xs: 3, md: 4 },
                  pt: 0,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: TEXT_SECONDARY,
                    lineHeight: ANSWER_LINE_HEIGHT,
                    fontSize: { xs: '0.9rem', md: '0.95rem' },
                  }}
                >
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
}
