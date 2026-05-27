import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
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
  GAP_DEFAULT,
  ICON_SIZE_SM,
  RADIUS_XS,
  TEXT_DISABLED,
  TEXT_SECONDARY,
} from '../../../theme/tokens';

interface PlanWidgetProps {
  tasks: AssistantTask[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

function getStatusIcon(status: AssistantTaskStatus) {
  switch (status) {
    case 'completed':
      return CheckCircle;
    case 'in_progress':
      return RadioButtonChecked;
    case 'failed':
      return HighlightOff;
    case 'need_help':
      return ErrorOutline;
    case 'pending':
    default:
      return Circle;
  }
}

function getStatusColor(status: AssistantTaskStatus): 'success.main' | 'info.main' | 'warning.main' | 'error.main' | 'text.disabled' {
  switch (status) {
    case 'completed':
      return 'success.main';
    case 'in_progress':
      return 'info.main';
    case 'need_help':
      return 'warning.main';
    case 'failed':
      return 'error.main';
    case 'pending':
    default:
      return 'text.disabled';
  }
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
    return { completed, total };
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
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
      <Box
        sx={(theme) => ({
          ...assistantInsetSx(theme),
          p: { xs: 1.25, md: 1.5 },
          borderColor: alpha(BRAND_PRIMARY, 0.24),
        })}
      >
        <ButtonBase
          onClick={handleToggle}
          sx={{
            width: '100%',
            justifyContent: 'space-between',
            borderRadius: RADIUS_XS,
            textAlign: 'left',
          }}
        >
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', minWidth: 0 }}>
            <RadioButtonChecked sx={{ color: BRAND_PRIMARY, fontSize: ICON_SIZE_SM + 2 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontWeight: 700 }}>
                {t('assistant.plan.title')}
              </Typography>
              <Typography variant="body2" noWrap sx={{ color: TEXT_DISABLED }}>
                {t('assistant.plan.tasksCompleted', { completed: progress.completed, total: progress.total })}
              </Typography>
            </Box>
          </Stack>
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </ButtonBase>

        <Collapse in={expanded} timeout={180}>
          <Stack spacing={GAP_COMPACT} sx={{ mt: 1.25 }}>
            {tasks.map((task) => {
              const TaskIcon = getStatusIcon(task.status);
              const color = getStatusColor(task.status);

              return (
                <Box
                  key={task.id}
                  sx={(theme) => ({
                    border: `1px solid ${APP_BORDER}`,
                    borderRadius: RADIUS_XS,
                    px: 1.25,
                    py: 1,
                    backgroundColor: alpha(theme.palette.background.default, 0.34),
                  })}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <Tooltip title={statusLabels[task.status]}>
                      <TaskIcon sx={{ color, fontSize: ICON_SIZE_SM + 2, mt: 0.25 }} />
                    </Tooltip>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {task.title}
                      </Typography>
                      {task.description ? (
                        <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
                          {task.description}
                        </Typography>
                      ) : null}
                      {task.subtasks.length > 0 ? (
                        <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                          {task.subtasks.map((subtask) => {
                            const SubtaskIcon = getStatusIcon(subtask.status);
                            return (
                              <Stack
                                key={subtask.id}
                                direction="row"
                                spacing={0.75}
                                sx={{ alignItems: 'center', minWidth: 0 }}
                              >
                                <SubtaskIcon sx={{ color: getStatusColor(subtask.status), fontSize: ICON_SIZE_SM }} />
                                <Typography variant="caption" noWrap sx={{ color: TEXT_SECONDARY }}>
                                  {subtask.title}
                                </Typography>
                              </Stack>
                            );
                          })}
                        </Stack>
                      ) : null}
                    </Box>
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Chip label={statusLabels[task.status]} size="small" variant="outlined" sx={{ height: 22 }} />
                      <Chip label={priorityLabels[task.priority]} size="small" variant="outlined" sx={{ height: 22 }} />
                    </Stack>
                  </Stack>

                  {task.dependencies.length > 0 || task.subtasks.some((subtask) => (subtask.tools?.length ?? 0) > 0) ? (
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.75, ml: 3.25 }}>
                      {task.dependencies.map((dependency) => (
                        <Chip
                          key={dependency}
                          label={t('assistant.plan.dependsOn', { dependency })}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, color: TEXT_SECONDARY }}
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
                          sx={{ height: 22, color: BRAND_PRIMARY }}
                        />
                      ))}
                    </Stack>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        </Collapse>
      </Box>
    </Box>
  );
}
