import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, keyframes } from '@mui/material/styles';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutline from '@mui/icons-material/ErrorOutlineOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Memory from '@mui/icons-material/Memory';
import Psychology from '@mui/icons-material/Psychology';
import Settings from '@mui/icons-material/Settings';
import SmartToy from '@mui/icons-material/SmartToy';
import Star from '@mui/icons-material/Star';
import Tune from '@mui/icons-material/Tune';
import Web from '@mui/icons-material/Web';
import type { AssistantToolEvent } from '../types';
import { useLocale } from '../../i18n';
import {
  APP_BORDER,
  BRAND_PRIMARY,
  ERROR_MAIN,
  ICON_SIZE_SM,
  RADIUS_XS,
  TEXT_DISABLED,
  TEXT_SECONDARY,
} from '../../../theme/tokens';

// Animação de shimmer para estado pending
const shimmerAnimation = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Animação de pulso sutil para pending
const pulseSubtle = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// ─── Tool Registry ───────────────────────────────────────────────
// Mapeamento de tool name → ícone, label i18n key, cor

interface ToolConfig {
  icon: React.ReactNode;
  labelKey: string;
  color: string;
  /** Extrai texto de resultado inline do output da tool */
  extractResult?: (output: unknown) => string | null;
}

const TOOL_REGISTRY: Record<string, ToolConfig> = {
  webSearch: {
    icon: <Web sx={{ fontSize: ICON_SIZE_SM }} />,
    labelKey: 'assistant.toolEvents.webSearch',
    color: '#4fc3f7',
    extractResult: (output) => {
      if (output && typeof output === 'object' && 'results' in output) {
        const results = (output as { results: unknown[] }).results;
        if (Array.isArray(results)) {
          return `${results.length} resultados`;
        }
      }
      return null;
    },
  },
  getStudioState: {
    icon: <Settings sx={{ fontSize: ICON_SIZE_SM }} />,
    labelKey: 'assistant.toolEvents.getStudioState',
    color: '#ab47bc',
  },
  getUserMemories: {
    icon: <Memory sx={{ fontSize: ICON_SIZE_SM }} />,
    labelKey: 'assistant.toolEvents.getUserMemories',
    color: '#66bb6a',
    extractResult: (output) => {
      if (output && typeof output === 'object' && 'memories' in output) {
        const memories = (output as { memories: unknown[] }).memories;
        if (Array.isArray(memories)) {
          return `${memories.length} memórias`;
        }
      }
      return null;
    },
  },
  updateStudio: {
    icon: <Tune sx={{ fontSize: ICON_SIZE_SM }} />,
    labelKey: 'assistant.toolEvents.updateStudio',
    color: '#ffa726',
    extractResult: (output) => {
      if (output && typeof output === 'object' && 'applied' in output) {
        const applied = (output as { applied: boolean }).applied;
        return applied ? 'Configurações aplicadas' : 'Configurações ignoradas';
      }
      return null;
    },
  },
  updatePlan: {
    icon: <Psychology sx={{ fontSize: ICON_SIZE_SM }} />,
    labelKey: 'assistant.toolEvents.updatePlan',
    color: '#42a5f5',
  },
  interview: {
    icon: <SmartToy sx={{ fontSize: ICON_SIZE_SM }} />,
    labelKey: 'assistant.toolEvents.interview',
    color: ERROR_MAIN,
  },
  respond: {
    icon: <SmartToy sx={{ fontSize: ICON_SIZE_SM }} />,
    labelKey: 'assistant.toolEvents.respond',
    color: '#26c6da',
  },
  use_skill: {
    icon: <Star sx={{ fontSize: ICON_SIZE_SM }} />,
    labelKey: 'assistant.toolEvents.useSkill',
    color: '#ffd54f',
    extractResult: (output) => {
      // Output é o conteúdo completo da skill — mostra confirmação genérica
      if (typeof output === 'string' && output.length > 0) {
        return 'Habilidade carregada';
      }
      return null;
    },
  },
};

function getToolConfig(name: string): ToolConfig {
  return TOOL_REGISTRY[name] ?? {
    icon: <SmartToy sx={{ fontSize: ICON_SIZE_SM }} />,
    labelKey: name,
    color: BRAND_PRIMARY,
  };
}

// ─── Shimmer Text ────────────────────────────────────────────────

function ShimmerText({ text, color }: { text: string; color: string }) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 600,
        background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.4)} 50%, ${color} 100%)`,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: `${shimmerAnimation} 1.8s ease-in-out infinite`,
      }}
    >
      {text}
    </Typography>
  );
}

// ─── Pending Indicator ───────────────────────────────────────────

function PendingIndicator({ color }: { color: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        animation: `${pulseSubtle} 1.5s ease-in-out infinite`,
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: color,
          animation: `${pulseSubtle} 1s ease-in-out infinite`,
        }}
      />
    </Box>
  );
}

// ─── Error Card ──────────────────────────────────────────────────

interface ToolErrorCardProps {
  error: string;
  label: string;
}

function ToolErrorCard({ error, label }: ToolErrorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLocale();

  return (
    <Box
      sx={{
        mt: 0.5,
        borderRadius: RADIUS_XS,
        border: `1px solid ${alpha(ERROR_MAIN, 0.3)}`,
        bgcolor: alpha(ERROR_MAIN, 0.04),
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1,
          py: 0.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(ERROR_MAIN, 0.06) },
          transition: 'background-color 150ms ease',
        }}
      >
        <ErrorOutline sx={{ fontSize: ICON_SIZE_SM, color: ERROR_MAIN }} />
        <Typography variant="caption" sx={{ color: ERROR_MAIN, fontWeight: 600, flex: 1 }}>
          {label}: {t('assistant.toolEvents.failed')}
        </Typography>
        {expanded ? (
          <ExpandLess sx={{ fontSize: 14, color: TEXT_DISABLED }} />
        ) : (
          <ExpandMore sx={{ fontSize: 14, color: TEXT_DISABLED }} />
        )}
      </Box>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: 1, pb: 0.75 }}>
          <Typography
            variant="caption"
            component="pre"
            sx={{
              m: 0,
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: TEXT_SECONDARY,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 120,
              overflow: 'auto',
            }}
          >
            {typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

// ─── Single Tool Event ───────────────────────────────────────────

interface ToolEventItemProps {
  event: AssistantToolEvent;
  isPending: boolean;
}

function ToolEventItem({ event, isPending }: ToolEventItemProps) {
  const { t } = useLocale();
  const config = useMemo(() => getToolConfig(event.name), [event.name]);
  const label = t(config.labelKey) || event.name;

  // Extrai nome da skill para use_skill
  const skillName = useMemo(() => {
    if (event.name !== 'use_skill') return null;
    if (event.type === 'tool_call' && event.input && typeof event.input === 'object') {
      return (event.input as { skillName?: string }).skillName ?? null;
    }
    return null;
  }, [event]);

  // Label customizado para use_skill — mostra "Carregando habilidade: {nome}"
  const displayLabel = useMemo(() => {
    if (event.name !== 'use_skill') return label;
    if (skillName) {
      // Converte kebab-case para título legível
      const friendlyName = skillName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return isPending
        ? `${t('assistant.toolEvents.loadingSkill')} ${friendlyName}…`
        : `${friendlyName}`;
    }
    return label;
  }, [event.name, label, skillName, isPending, t]);

  // Verifica se é erro
  const isError = event.type === 'tool_result'
    && event.output
    && typeof event.output === 'object'
    && 'error' in (event.output as Record<string, unknown>)
    && (event.output as { error: boolean }).error === true;

  // Texto do resultado inline
  const resultText = useMemo(() => {
    if (isPending) return null;
    if (isError) return null;
    if (event.type === 'tool_result' && config.extractResult) {
      return config.extractResult(event.output);
    }
    return null;
  }, [event, isPending, isError, config]);

  return (
    <Box>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: 'center',
          px: 1,
          py: 0.5,
          borderRadius: RADIUS_XS,
          bgcolor: isPending ? alpha(config.color, 0.06) : 'transparent',
          border: `1px solid ${isPending ? alpha(config.color, 0.2) : 'transparent'}`,
          transition: 'all 200ms ease',
        }}
      >
        {/* Ícone da tool */}
        <Box sx={{ color: isPending ? config.color : isError ? ERROR_MAIN : config.color, display: 'flex' }}>
          {isPending ? <PendingIndicator color={config.color} /> : config.icon}
        </Box>

        {/* Label + resultado */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {isPending ? (
            <ShimmerText text={displayLabel} color={config.color} />
          ) : (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline' }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: isError ? ERROR_MAIN : config.color,
                  transition: 'color 200ms ease',
                }}
              >
                {displayLabel}
              </Typography>
              {resultText ? (
                <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
                  — {resultText}
                </Typography>
              ) : null}
              {isError ? (
                <Typography variant="caption" sx={{ color: ERROR_MAIN }}>
                  — {t('assistant.toolEvents.failed')}
                </Typography>
              ) : null}
              {!isPending && !isError && !resultText && event.type === 'tool_result' ? (
                <CheckCircle sx={{ fontSize: 12, color: 'success.main' }} />
              ) : null}
            </Stack>
          )}
        </Box>
      </Stack>

      {/* Error card inline */}
      {isError && event.output ? (
        <ToolErrorCard
          error={(event.output as { message?: string }).message ?? String(event.output)}
          label={displayLabel}
        />
      ) : null}
    </Box>
  );
}

// ─── Merged Tool Event (tool_call + tool_result → 1 item) ────────

interface MergedToolEvent {
  name: string;
  callEvent: AssistantToolEvent;
  resultEvent?: AssistantToolEvent;
  isPending: boolean;
}

/**
 * Extrai o skillName de um evento use_skill.
 * Para tool_call, vem do input. Para tool_result, procura o tool_call
 * correspondente no array (o result não carrega input).
 */
function extractSkillName(event: AssistantToolEvent, allEvents: AssistantToolEvent[]): string | null {
  // Caso 1: evento já tem skillName no input (tool_call)
  if (event.input && typeof event.input === 'object') {
    const skillName = (event.input as { skillName?: string }).skillName;
    if (skillName) return skillName;
  }
  // Caso 2: tool_result sem input — procura o tool_call mais recente com mesmo name
  if (event.type === 'tool_result') {
    for (let i = allEvents.length - 1; i >= 0; i--) {
      const e = allEvents[i];
      if (e.name === 'use_skill' && e.type === 'tool_call') {
        if (e.input && typeof e.input === 'object') {
          const skillName = (e.input as { skillName?: string }).skillName;
          if (skillName) return skillName;
        }
        break;
      }
    }
  }
  return null;
}

/**
 * Gera chave única para merge de tool events.
 * Para use_skill, inclui o skillName do input para diferenciar
 * múltiplas chamadas com skills diferentes no mesmo turno.
 * Para tool_result de use_skill, procura o tool_call correspondente
 * no array para gerar a mesma chave (sem isso, call e result ficam
 * em chaves separadas e duplicam visualmente).
 */
function getEventKey(event: AssistantToolEvent, allEvents: AssistantToolEvent[] = []): string {
  if (event.name === 'use_skill') {
    const skillName = extractSkillName(event, allEvents);
    if (skillName) return `use_skill:${skillName}`;
  }
  return event.name;
}

// ─── Tool Event List ─────────────────────────────────────────────

interface ToolEventListProps {
  events: AssistantToolEvent[];
  isStreaming: boolean;
}

export function ToolEventList({ events, isStreaming }: ToolEventListProps) {
  const { t } = useLocale();

  // Mescla tool_call e tool_result em um único item por tool (ou por skill para use_skill)
  const { mergedEvents, hasPending } = useMemo(() => {
    // Mapa: eventKey → último tool_call e último tool_result
    const callMap = new Map<string, AssistantToolEvent>();
    const resultMap = new Map<string, AssistantToolEvent>();

    for (const event of events) {
      const key = getEventKey(event, events);
      if (event.type === 'tool_call') {
        callMap.set(key, event);
      } else if (event.type === 'tool_result') {
        resultMap.set(key, event);
      }
    }

    // Preserva ordem de aparição (primeira ocorrência de cada tool/skill)
    const seen = new Set<string>();
    const ordered: MergedToolEvent[] = [];

    for (const event of events) {
      const key = getEventKey(event, events);
      if (seen.has(key)) continue;
      seen.add(key);

      const call = callMap.get(key);
      const result = resultMap.get(key);

      // Sempre cria um merged event (com ou sem call)
      if (call || result) {
        ordered.push({
          name: event.name,
          callEvent: call ?? result!,
          resultEvent: result,
          isPending: Boolean(call && !result),
        });
      }
    }

    return {
      mergedEvents: ordered,
      hasPending: ordered.some((e) => e.isPending),
    };
  }, [events]);

  // Filtra tools silenciosas que não devem aparecer na UI
  const SILENT_TOOLS = new Set(['updatePlan']);
  const filteredEvents = mergedEvents.filter((e) => !SILENT_TOOLS.has(e.name));

  if (filteredEvents.length === 0) return null;

  // Mostra no máximo 8 eventos (últimos)
  const visibleEvents = filteredEvents.slice(-8);
  const hiddenCount = mergedEvents.length - visibleEvents.length;

  return (
    <Box
      sx={{
        mt: 0.75,
        borderRadius: RADIUS_XS,
        bgcolor: alpha(APP_BORDER, 0.08),
        border: `1px solid ${alpha(APP_BORDER, 0.15)}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          px: 1,
          py: 0.375,
          borderBottom: `1px solid ${alpha(APP_BORDER, 0.1)}`,
          bgcolor: alpha(APP_BORDER, 0.04),
        }}
      >
        <SmartToy sx={{ fontSize: 11, color: TEXT_DISABLED }} />
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: TEXT_DISABLED, fontWeight: 600 }}>
          {t('assistant.toolEvents.title')}
        </Typography>
        {isStreaming && hasPending ? (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: BRAND_PRIMARY,
              animation: `${pulseSubtle} 1s ease-in-out infinite`,
              ml: 0.5,
            }}
          />
        ) : null}
      </Stack>

      {/* Event list — um item por tool */}
      <Stack spacing={0} sx={{ py: 0.25 }}>
        {hiddenCount > 0 ? (
          <Typography variant="caption" sx={{ px: 1, py: 0.25, fontSize: '0.6rem', color: TEXT_DISABLED }}>
            +{hiddenCount} {t('assistant.toolEvents.more')}
          </Typography>
        ) : null}
        {visibleEvents.map((merged) => (
          <ToolEventItem
            key={getEventKey(merged.resultEvent ?? merged.callEvent, events)}
            event={merged.resultEvent ?? merged.callEvent}
            isPending={merged.isPending}
          />
        ))}
      </Stack>
    </Box>
  );
}
