/**
 * StackedHeader — componente genérico de header padronizado.
 *
 * Resolve 3 famílias de UI com 1 API:
 * 1. Banners com ação (substitui `<Alert action={<Button>}>`)
 * 2. Section headers colapsáveis (substitui `<ButtonBase><Collapse>`)
 * 3. Cards com controle à direita (substitui `<Paper><Stack responsivo>`)
 *
 * Layout responsivo nativo: coluna em mobile (xs), linha em desktop (sm+).
 * Texto sempre fica com `minWidth: 0` para evitar overflow com descrições longas.
 *
 * **Variantes:**
 * - `glass` (default): Paper com `glassPanelSx` para section headers e banners em cards
 * - `alert`: `<Alert>` MUI com severity colorida para mensagens inline
 * - `plain`: `<Box>` sem decoração para casos custom
 *
 * **Colapso:** puramente controlado (`expanded` + `onToggle`). Para colapso com
 * estado interno, use o hook `useCollapsibleSection`.
 *
 * @see docs/plan/stacked-header-plano-final.md
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useLocale } from '../../features/i18n';
import { stopSwipePropagation } from '../../hooks/useSwipeTabs';
import { glassPanelSx } from '../../theme/surfaces';
import {
  APP_BORDER,
  ERROR_BG_SUBTLE,
  ERROR_BORDER,
  ERROR_GLOW,
  GAP_COMPACT,
  GAP_DEFAULT,
  GAP_MEDIUM,
  GLASS_BG,
  ICON_SIZE_MD,
  SUCCESS_BG_SUBTLE,
  SUCCESS_BORDER,
  SUCCESS_GLOW,
  WARNING_BG_SUBTLE,
  WARNING_BORDER,
  WARNING_GLOW,
} from '../../theme/tokens';

// ─── Tipos públicos ────────────────────────────────────────

export type StackedHeaderVariant = 'alert' | 'glass' | 'plain';
export type StackedHeaderSeverity = 'success' | 'error' | 'warning' | 'info';
export type StackedHeaderAlertVariant = 'standard' | 'outlined' | 'filled';
export type StackedHeaderTitleVariant = 'overline' | 'subtitle2' | 'alertTitle';
export type StackedHeaderDescriptionVariant = 'body2' | 'caption';

// ─── Severity → tokens (mapa centralizado) ────────────────

interface SeverityStyles {
  border: string;
  bg: string;
  glow?: string;
}

const SEVERITY_STYLES: Record<StackedHeaderSeverity, SeverityStyles> = {
  success: { border: SUCCESS_BORDER, bg: SUCCESS_BG_SUBTLE, glow: SUCCESS_GLOW },
  error: { border: ERROR_BORDER, bg: ERROR_BG_SUBTLE, glow: ERROR_GLOW },
  warning: { border: WARNING_BORDER, bg: WARNING_BG_SUBTLE, glow: WARNING_GLOW },
  info: { border: APP_BORDER, bg: GLASS_BG },
};

// ─── Defaults por variante ─────────────────────────────────

const VARIANT_DEFAULTS = {
  glass: {
    titleVariant: 'overline' as StackedHeaderTitleVariant,
    descriptionVariant: 'body2' as StackedHeaderDescriptionVariant,
    padding: { px: { xs: 2.5, md: 3 }, py: 2 },
    borderRadius: { xs: 3, md: 4 },
  },
  alert: {
    titleVariant: 'subtitle2' as StackedHeaderTitleVariant,
    descriptionVariant: 'caption' as StackedHeaderDescriptionVariant,
    padding: { px: { xs: 2, md: 2.5 }, py: { xs: 1.25, md: 1.5 } },
    borderRadius: 2,
  },
  plain: {
    titleVariant: 'overline' as StackedHeaderTitleVariant,
    descriptionVariant: 'body2' as StackedHeaderDescriptionVariant,
    padding: undefined,
    borderRadius: 0,
  },
};

// ─── Props ─────────────────────────────────────────────────

export interface StackedHeaderProps {
  // ── Variantes visuais ──
  /** Define o container visual do header. @default 'glass' */
  variant?: StackedHeaderVariant;
  /** Severidade (apenas variant='alert'). Define cor, borda e glow. @default 'info' */
  severity?: StackedHeaderSeverity;
  /** Variante do Alert MUI (apenas variant='alert'). @default 'standard' */
  alertVariant?: StackedHeaderAlertVariant;

  // ── Slots de conteúdo ──
  /** Ícone decorativo à esquerda do título (com aria-hidden automático). */
  icon?: ReactNode;
  /** Título principal — ReactNode obrigatório. */
  title: ReactNode;
  /** Descrição secundária, abaixo do título. Aceita ReactNode (links, format). */
  description?: ReactNode;
  /** Chips/resumo do estado. Renderizado quando colapsado (ou sempre, se summaryAlwaysVisible). */
  summary?: ReactNode;
  /** Controle à direita do texto (Switch, Chip count, etc). Coexiste com chevron. */
  control?: ReactNode;
  /** Ações/botões à direita (CTA, "Tentar novamente", etc). */
  action?: ReactNode;

  // ── Colapso (controlado) ──
  /** Habilita comportamento colapsável. @default false */
  collapsible?: boolean;
  /** Estado expandido (controlado externamente). Obrigatório se collapsible=true. */
  expanded?: boolean;
  /** Callback de toggle. Recebe o novo estado expandido. */
  onToggle?: (expanded: boolean) => void;

  // ── Tipografia (overrides) ──
  /** Variante de Typography para o título. Default inteligente por variant. */
  titleVariant?: StackedHeaderTitleVariant;
  /** Variante de Typography para a descrição. Default inteligente por variant. */
  descriptionVariant?: StackedHeaderDescriptionVariant;
  /** Se true, summary aparece mesmo quando expandido. @default false */
  summaryAlwaysVisible?: boolean;

  // ── Comportamento ──
  /** Callback para fechar o banner (apenas variant='alert'). Renderiza botão X. */
  onClose?: () => void;

  // ── Acessibilidade ──
  /** ID do conteúdo colapsável (aria-controls). Obrigatório se collapsible=true. */
  collapseId?: string;
  /** ARIA label para o botão de expandir/recolher. Se ausente, usa i18n com
   * fallback para "expand" / "collapse" conforme o estado `expanded`. */
  collapseAriaLabel?: string;
  /** Role ARIA do container. Aplicado em **todas** as variantes (`alert`,
   * `glass`, `plain`). Sem default automático. */
  role?: string;

  // ── Comportamento de collapse ──
  /** Se true, desmonta o conteúdo ao colapsar (perde estado interno). @default false */
  unmountOnExit?: boolean;

  // ── Sobrescrita ──
  /** sx adicional aplicado ao container raiz. */
  sx?: SxProps<Theme>;
  /** Sobrescrita de componentes por slot. Use com cautela. */
  slots?: {
    root?: React.ElementType;
    action?: React.ElementType;
    control?: React.ElementType;
    icon?: React.ElementType;
    title?: React.ElementType;
    description?: React.ElementType;
    summary?: React.ElementType;
    collapse?: React.ElementType;
  };
  /** Props adicionais por slot. Aceita `sx` para merge com estilo padrão. */
  slotProps?: {
    root?: { sx?: SxProps<Theme> } & Record<string, unknown>;
    action?: { sx?: SxProps<Theme> } & Record<string, unknown>;
    control?: { sx?: SxProps<Theme> } & Record<string, unknown>;
    icon?: { sx?: SxProps<Theme> } & Record<string, unknown>;
    title?: { sx?: SxProps<Theme> } & Record<string, unknown>;
    description?: { sx?: SxProps<Theme> } & Record<string, unknown>;
    summary?: { sx?: SxProps<Theme> } & Record<string, unknown>;
    collapse?: { sx?: SxProps<Theme> } & Record<string, unknown>;
  };

  /** Conteúdo colapsável (apenas se collapsible=true). */
  children?: ReactNode;

  /** Props DOM extras (id, className, data-*, aria-*). */
  id?: string;
  className?: string;
}

// ─── Componente ────────────────────────────────────────────

/**
 * Componente genérico de header com layout responsivo stack-vertical-em-mobile.
 *
 * @example Banner (variant="alert")
 * ```tsx
 * <StackedHeader
 *   variant="alert"
 *   severity="success"
 *   icon={<RateReviewIcon />}
 *   title="Sua opinião vale créditos bônus"
 *   description="Envie um feedback e ganhe 250 créditos."
 *   action={<Button color="secondary">Dar feedback agora</Button>}
 * />
 * ```
 *
 * @example Section header colapsável (variant="glass")
 * ```tsx
 * <StackedHeader
 *   variant="glass"
 *   collapsible
 *   expanded={isOpen}
 *   onToggle={setIsOpen}
 *   collapseId="voice-section"
 *   icon={<GraphicEq color="primary" />}
 *   title="Voz do locutor"
 *   description="Escolha a assinatura vocal..."
 *   summary={<Chip label="Sadaltager" />}
 *   control={<Chip label="30 opções" variant="outlined" />}
 * >
 *   <VoiceSelector />
 * </StackedHeader>
 * ```
 */
export function StackedHeader(props: StackedHeaderProps) {
  const {
    variant = 'glass',
    severity = 'info',
    alertVariant = 'standard',
    icon,
    title,
    description,
    summary,
    control,
    action,
    collapsible = false,
    expanded = false,
    onToggle,
    titleVariant,
    descriptionVariant,
    summaryAlwaysVisible = false,
    onClose,
    collapseId,
    collapseAriaLabel,
    role,
    unmountOnExit = false,
    sx,
    slots,
    slotProps,
    children,
    id,
    className,
  } = props;

  const { t } = useLocale();

  // ── Resolver defaults por variante ──
  const variantDefaults = VARIANT_DEFAULTS[variant];
  const resolvedTitleVariant = titleVariant ?? variantDefaults.titleVariant;
  const resolvedDescriptionVariant = descriptionVariant ?? variantDefaults.descriptionVariant;

  // ── Handler de toggle ──
  // Ref com latest value de `expanded` para manter `handleToggle` estável
  // (sem invalidar memo do ButtonBase a cada toggle). Pattern: latest ref
  // sincronizado em useEffect para satisfazer `react-hooks/refs` (atualizar
  // ref.current diretamente no render é proibido).
  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
  });

  const handleToggle = useCallback(() => {
    if (collapsible && onToggle) {
      onToggle(!expandedRef.current);
    }
  }, [collapsible, onToggle]);

  // ── Construir container de texto (esquerda) ──
  const textContent = (
    <Stack spacing={GAP_COMPACT} sx={{ minWidth: 0, flex: 1 }}>
      <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
        {icon && (
          <Box aria-hidden="true" sx={{ display: 'inline-flex', flexShrink: 0 }}>
            {icon}
          </Box>
        )}
        {resolvedTitleVariant === 'alertTitle' ? (
          <AlertTitle sx={{ mb: 0, fontWeight: 700, ...(slotProps?.title?.sx as SxProps<Theme>) }}>
            {title}
          </AlertTitle>
        ) : (
          <Typography
            variant={resolvedTitleVariant}
            component="span"
            sx={[
              {
                fontWeight: 700,
                ...(resolvedTitleVariant === 'overline' && { letterSpacing: '0.18em' }),
              },
              ...(Array.isArray(slotProps?.title?.sx) ? slotProps.title.sx : [slotProps?.title?.sx]),
            ]}
          >
            {title}
          </Typography>
        )}
      </Stack>
      {description && (
        <Typography
          variant={resolvedDescriptionVariant}
          color="text.secondary"
          component="div"
          sx={[
            {
              lineHeight: variant === 'alert' ? 1.4 : 1.7,
            },
            ...(Array.isArray(slotProps?.description?.sx) ? slotProps.description.sx : [slotProps?.description?.sx]),
          ]}
        >
          {description}
        </Typography>
      )}
      {summary && collapsible && (summaryAlwaysVisible || !expanded) && (
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          sx={[
            { flexWrap: 'wrap', pt: 0.25 },
            ...(Array.isArray(slotProps?.summary?.sx) ? slotProps.summary.sx : [slotProps?.summary?.sx]),
          ]}
        >
          {summary}
        </Stack>
      )}
    </Stack>
  );

  // ── Construir container direito (control + action + chevron) ──
  // Decisão D9: control e chevron coexistem (Inspector "Voz do Locutor" tem ambos)
  const showChevron = collapsible;
  const rightContent = (
    <Stack
      direction="row"
      spacing={GAP_DEFAULT}
      sx={[
        { alignItems: 'center', flexShrink: 0 },
        ...(Array.isArray(slotProps?.action?.sx) ? slotProps.action.sx : [slotProps?.action?.sx]),
      ]}
    >
      {control && (
        <Box
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          sx={[
            { display: 'inline-flex' },
            ...(Array.isArray(slotProps?.control?.sx) ? slotProps.control.sx : [slotProps?.control?.sx]),
          ]}
        >
          {control}
        </Box>
      )}
      {action && <Box>{action}</Box>}
      {showChevron &&
        (expanded ? (
          <ExpandLess sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
        ) : (
          <ExpandMore sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
        ))}
    </Stack>
  );

  // ── Layout interno (compartilhado entre variantes) ──
  const mainRow = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: GAP_DEFAULT, sm: GAP_MEDIUM }}
      sx={[
        { alignItems: { xs: 'flex-start', sm: 'center' }, width: '100%' },
        ...(Array.isArray(slotProps?.root?.sx) ? slotProps.root.sx : [slotProps?.root?.sx]),
      ]}
    >
      {textContent}
      {rightContent}
    </Stack>
  );

  // ── Cabeçalho clicável (se collapsible) ──
  // Quando `variant="alert"` + `collapsible`, o ButtonBase fica dentro do
  // `<Alert>` externo que já tem padding. Zerar px/py evita double-padding.
  // Em outras variantes, o padding é necessário para área de toque confortável.
  const buttonBasePaddingSx =
    variant === 'alert' ? { px: 0, py: 0 } : { px: { xs: 2.5, md: 3 }, py: 2 };

  const headerContent = collapsible ? (
    <ButtonBase
      type="button"
      onClick={handleToggle}
      aria-expanded={expanded}
      aria-controls={collapseId}
      // GAP-01: aria-label dinâmico reflete o estado (expand vs collapse).
      // WCAG 4.1.2 (Name, Role, Value) — o leitor de tela anuncia o estado real.
      aria-label={
        collapseAriaLabel
          ?? t(
            expanded
              ? 'stackedHeader.collapseAriaLabel.collapse'
              : 'stackedHeader.collapseAriaLabel.expand',
          )
      }
      // GAP-02: intercepta pointerdown antes do `motion.div drag="x"` pai
      // (Inspector em mobile via useSwipeTabs) — evita swipe acidental
      // trocar de aba ao arrastar o cabeçalho.
      onPointerDownCapture={stopSwipePropagation}
      sx={{
        width: '100%',
        textAlign: 'left',
        ...buttonBasePaddingSx,
        borderRadius: { xs: 3, md: 4 },
        transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
        display: 'block',
      }}
    >
      {mainRow}
    </ButtonBase>
  ) : (
    mainRow
  );

  // ── Conteúdo colapsável ──
  const CollapseSlot = slots?.collapse ?? Collapse;
  const collapseContent =
    collapsible && children ? (
      <CollapseSlot
        in={expanded}
        timeout="auto"
        id={collapseId}
        unmountOnExit={unmountOnExit}
        {...slotProps?.collapse}
      >
        <Stack spacing={2} sx={{ px: { xs: 2.5, md: 3 }, pb: { xs: 2.5, md: 3 } }}>
          {children}
        </Stack>
      </CollapseSlot>
    ) : null;

  // ── Renderização por variante ──
  if (variant === 'alert') {
    const severityStyles = SEVERITY_STYLES[severity];
    return (
      <Alert
        severity={severity}
        variant={alertVariant}
        icon={false}
        role={role}
        onClose={onClose}
        closeText={t('common.close')}
        id={id}
        className={className}
        sx={[
          {
            borderRadius: variantDefaults.borderRadius,
            borderColor: alpha(severityStyles.border, 0.32),
            backgroundColor: alpha(severityStyles.bg, 0.08),
            backgroundImage: 'none',
            ...(severityStyles.glow ? { boxShadow: `0 0 0 1px ${severityStyles.glow}` } : {}),
            '& .MuiAlert-message': { width: '100%', overflow: 'visible' },
            ...variantDefaults.padding,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {headerContent}
        {collapseContent}
      </Alert>
    );
  }

  if (variant === 'glass') {
    const RootComponent = slots?.root ?? Paper;
    return (
      <RootComponent
        elevation={0}
        id={id}
        className={className}
        role={role}
        sx={[glassPanelSx, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        {headerContent}
        {collapseContent}
      </RootComponent>
    );
  }

  // variant === 'plain'
  const RootComponent = slots?.root ?? Box;
  return (
    <RootComponent id={id} className={className} role={role} sx={sx}>
      {headerContent}
      {collapseContent}
    </RootComponent>
  );
}
