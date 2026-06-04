/**
 * Constantes do onboarding wizard — opcoes de perfil, metas e variantes de animacao.
 */

import MovieCreation from '@mui/icons-material/MovieCreation';
import Mic from '@mui/icons-material/Mic';
import Campaign from '@mui/icons-material/Campaign';
import School from '@mui/icons-material/School';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import GraphicEq from '@mui/icons-material/GraphicEq';
import Image from '@mui/icons-material/Image';
import Videocam from '@mui/icons-material/Videocam';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import type { Variants } from 'motion/react';
import { BRAND_PRIMARY, BRAND_PRIMARY_GLOW_SOFT } from '../../theme/tokens';
import type { WizardRole, WizardGoal } from './types';

/** Tipo para componentes de icone MUI */
export type IconComponent = React.ComponentType<{ sx?: object }>;

/** Opcao de papel com icone MUI */
export interface RoleOption {
  id: WizardRole;
  icon: IconComponent;
}

/** Opcao de meta com icone MUI */
export interface GoalOption {
  id: WizardGoal;
  icon: IconComponent;
}

/** Opcoes de papel disponiveis no wizard */
export const WIZARD_ROLES: RoleOption[] = [
  { id: 'contentCreator', icon: MovieCreation },
  { id: 'podcaster', icon: Mic },
  { id: 'marketer', icon: Campaign },
  { id: 'educator', icon: School },
  { id: 'other', icon: MoreHoriz },
];

/** Opcoes de meta disponiveis no wizard */
export const WIZARD_GOALS: GoalOption[] = [
  { id: 'audio', icon: GraphicEq },
  { id: 'scenes', icon: Image },
  { id: 'video', icon: Videocam },
  { id: 'assistant', icon: AutoAwesome },
];

/** Estilo compartilhado do Chip de identificacao de etapa */
export const STEP_CHIP_SX = {
  alignSelf: 'flex-start' as const,
  backgroundColor: BRAND_PRIMARY_GLOW_SOFT,
  color: BRAND_PRIMARY,
  fontWeight: 700,
  fontSize: '0.7rem',
  letterSpacing: '0.5px',
};

/** Total de etapas do wizard (Welcome, Profile, Goals, Completion) */
export const TOTAL_STEPS = 4;

/** Variantes de animacao para transicao entre etapas (slide + blur) */
export const stepVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 400, damping: 35 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
    filter: 'blur(4px)',
    transition: { type: 'spring' as const, stiffness: 400, damping: 35 },
  }),
};

/** Container com stagger para animar itens filhos em sequencia */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

/** Item individual dentro de um stagger container */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
  },
};
