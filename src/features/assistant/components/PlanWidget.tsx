import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, keyframes } from '@mui/material/styles';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Circle from '@mui/icons-material/Circle';
import ErrorOutline from '@mui/icons-material/ErrorOutlineOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import HighlightOff from '@mui/icons-material/HighlightOff';
import RadioButtonChecked from '@mui/icons-material/RadioButtonChecked';
import type { AssistantTask, AssistantTaskPriority, AssistantTaskStatus } from '../types';
import { assistantInsetSx } from './assistantUi';
import { useLocale } from '../../i18n';
import {
  APP_BORDER,
  BRAND_PRIMARY,
  GAP_COMPACT,
  ICON_SIZE_SM,
  RADIUS_XS,
  TEXT_DISABLED,
  TEXT_SECONDARY,
} from '../../../theme/tokens';

// Animação de pulso para status in_progress
const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

interface PlanWidgetProps {
  tasks: AssistantTask[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

type StatusIconSize = 'sm' | 'md';

/**
 * Ícone de status unificado com tamanho configurável.
 * - completed: check verde
 * - in_progress: ponto pulsante azul
 * - failed: X vermelho
 * - need_help: alerta amarelo
 * - pending: circulo cinza
 *
 * size 'md' = tarefas principais, 'sm' = subtarefas
 */
function StatusIcon({ status, size = 'md' }: { status: AssistantTaskStatus; size?: StatusIconSize }) {
  const isSmall = size === 'sm';
  const iconSize = isSmall ? ICON_SIZE_SM : ICON_SIZE_SM + 2;
  const dotSize = isSmall ? 7 : 10;

  const iconSx = {
    fontSize: iconSize,
    transition: 'color 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  switch (status) {
    case 'completed':
      return <CheckCircle sx={{ ...iconSx, color: 'success.main' }} />;
    case 'in_progress':
      return (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: iconSize,
            height: iconSize,
          }}
        >
          <Box
            sx={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              bgcolor: 'info.main',
              animation: `${pulseAnimation} 1.5s ease-in-out infinite`,
            }}
          />
        </Box>
      );
    case 'failed':
      return <HighlightOff sx={{ ...iconSx, color: 'error.main' }} />;
    case 'need_help':
      return <ErrorOutline sx={{ ...iconSx, color: 'warning.main' }} />;
    case 'pending':
    default:
      return <Circle sx={{ ...iconSx, color: 'text.disabled', opacity: isSmall ? 0.5 : 0.6 }} />;
  }
}

/**
 * Texto com strikethrough condicional e transição suave.
 */
function TaskTitle({ status, children }: { status: AssistantTaskStatus; children: React.ReactNode }) {
  const isDone = status === 'completed' || status === 'failed';

  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        textDecoration: isDone ? 'line-through' : 'none',
        color: isDone ? 'text.disabled' : 'text.primary',
        opacity: status === 'pending' ? 0.7 : 1,
        transition: 'color 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {children}
    </Typography>
  );
}

function SubtaskTitle({ status, children }: { status: AssistantTaskStatus; children: React.ReactNode }) {
  const isDone = status === 'completed' || status === 'failed';

  return (
    <Typography
      variant="caption"
      noWrap
      sx={{
        color: isDone ? 'text.disabled' : TEXT_SECONDARY,
        textDecoration: isDone ? 'line-through' : 'none',
        opacity: status === 'pending' ? 0.6 : 1,
        transition: 'color 220ms ease, opacity 220ms ease',
      }}
    >
      {children}
    </Typography>
  );
}

export function PlanWidget({ tasks, isExpanded, onToggle }: PlanWidgetProps) {
  const { t } = useLocale();
  const [internalExpanded, setInternalExpanded] = useState(true);
  const expanded = isExpanded ?? internalExpanded;

  const statusLabels: Record<AssistantTaskStatus, string> = {
    pending: t('assistant.plan.statusLabels.pending'),
    in_progress: t('assistant.plan.statusLabels.in_progress'),
    completed: t('assistant.plan.statusLabels.completed'),
    failed: t('assistant.plan.statusLabels.failed'),
    need_help: t('assistant.plan.statusLabels.need_help'),
  };

  const priorityLabels: Record<AssistantTaskPriority, string> = {
    high: t('assistant.plan.priorityLabels.high'),
    medium: t('assistant.plan.priorityLabels.medium'),
    low: t('assistant.plan.priorityLabels.low'),
  };

  const progress = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
    return { completed, inProgress, total };
  }, [tasks]);

  if (tasks.length === 0) {
    return null;
  }

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }

    setInternalExpanded((prev) => !prev);
  };

  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, pb: 0.75 }}>
      <Box
        sx={(theme) => ({
          ...assistantInsetSx(theme),
          p: { xs: 1, md: 1.5 },
          borderColor: alpha(BRAND_PRIMARY, 0.24),
        })}
      >
        <ButtonBase
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-label={t('assistant.plan.title')}
          sx={{
            width: '100%',
            justifyContent: 'space-between',
            borderRadius: RADIUS_XS,
            textAlign: 'left',
          }}
        >
          <Stack direction="row" spacing={GAP_COMPACT} sx={{ alignItems: 'center', minWidth: 0 }}>
            <RadioButtonChecked sx={{ color: BRAND_PRIMARY, fontSize: ICON_SIZE_SM + 2 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontWeight: 700 }}>
                {t('assistant.plan.title')}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: progress.completed === progress.total ? 'success.main' : BRAND_PRIMARY,
                    transition: 'color 300ms ease',
                  }}
                >
                  {progress.completed}/{progress.total}
                </Typography>
                <Typography variant="body2" sx={{ color: TEXT_DISABLED }}>
                  {t('assistant.plan.tasksCompletedLabel')}
                </Typography>
                {progress.inProgress > 0 ? (
                  <Chip
                    label={`${progress.inProgress} ${statusLabels.in_progress.toLowerCase()}`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: alpha('#2196f3', 0.12),
                      color: '#2196f3',
                      fontWeight: 600,
                    }}
                  />
                ) : null}
              </Stack>
            </Box>
          </Stack>
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </ButtonBase>

        <Collapse in={expanded} timeout={180}>
          <Stack spacing={GAP_COMPACT * 0.75} sx={{ mt: 1 }}>
            {tasks.map((task) => (
              <Box
                key={task.id}
                sx={(theme) => ({
                  border: `1px solid ${APP_BORDER}`,
                  borderRadius: RADIUS_XS,
                  px: { xs: 1, md: 1.25 },
                  py: { xs: 0.75, md: 1 },
                  backgroundColor: alpha(theme.palette.background.default, 0.34),
                  transition: 'border-color 220ms ease, background-color 220ms ease',
                  ...(task.status === 'in_progress' && {
                    borderColor: alpha('#2196f3', 0.4),
                    backgroundColor: alpha('#2196f3', 0.04),
                  }),
                  ...(task.status === 'completed' && {
                    borderColor: alpha('#4caf50', 0.2),
                  }),
                })}
              >
                {/* Layout mobile: ícone + título em cima, chips embaixo */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
                    <Tooltip title={statusLabels[task.status]}>
                      <Box component="span" sx={{ mt: 0.15 }}>
                        <StatusIcon status={task.status} />
                      </Box>
                    </Tooltip>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <TaskTitle status={task.status}>{task.title}</TaskTitle>
                      {task.description ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: task.status === 'completed' || task.status === 'failed' ? 'text.disabled' : TEXT_SECONDARY,
                            transition: 'color 220ms ease',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {task.description}
                        </Typography>
                      ) : null}
                      {task.subtasks.length > 0 ? (
                        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                          {task.subtasks.map((subtask) => (
                            <Stack
                              key={subtask.id}
                              direction="row"
                              spacing={0.5}
                              sx={{ alignItems: 'center', minWidth: 0 }}
                            >
                              <StatusIcon status={subtask.status} size="sm" />
                              <SubtaskTitle status={subtask.status}>{subtask.title}</SubtaskTitle>
                            </Stack>
                          ))}
                        </Stack>
                      ) : null}
                    </Box>
                    {/* Chips de status/prioridade — quebram para baixo em mobile */}
                    <Stack
                      direction="row"
                      spacing={0.5}
                      useFlexGap
                      sx={{
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                        // Em mobile, esconde as chips da linha principal (vão para baixo)
                        display: { xs: 'none', sm: 'flex' },
                      }}
                    >
                      <Chip label={statusLabels[task.status]} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.625rem' }} />
                      <Chip label={priorityLabels[task.priority]} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.625rem' }} />
                    </Stack>
                  </Stack>

                  {/* Chips mobile — abaixo do conteúdo em telas pequenas */}
                  <Stack
                    direction="row"
                    spacing={0.5}
                    useFlexGap
                    sx={{
                      flexWrap: 'wrap',
                      display: { xs: 'flex', sm: 'none' },
                      ml: 3.5,
                    }}
                  >
                    <Chip label={statusLabels[task.status]} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                    <Chip label={priorityLabels[task.priority]} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                  </Stack>
                </Box>

                {task.dependencies.length > 0 || task.subtasks.some((subtask) => (subtask.tools?.length ?? 0) > 0) ? (
                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.5, ml: { xs: 3, sm: 3.25 } }}>
                    {task.dependencies.map((dependency) => (
                      <Chip
                        key={dependency}
                        label={t('assistant.plan.dependsOn', { dependency })}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.625rem', color: TEXT_SECONDARY }}
                      />
                    ))}
                    {task.subtasks.flatMap((subtask) => (
                      (subtask.tools ?? []).map((tool) => ({ id: `${subtask.id}-${tool}`, tool }))
                    )).map(({ id, tool }) => (
                      <Chip
                        key={`${task.id}-${id}`}
                        label={tool}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.625rem', color: BRAND_PRIMARY }}
                      />
                    ))}
                  </Stack>
                ) : null}
              </Box>
            ))}
          </Stack>
        </Collapse>
      </Box>
    </Box>
  );
}
