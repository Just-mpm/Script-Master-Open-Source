import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Briefcase,
  Zap,
  Target,
  Hexagon,
  Code,
  Palette,
  CheckCircle2,
  LockKeyhole,
  Rocket
} from 'lucide-react';

type UserData = {
  name: string;
  role: string;
  goals: string[];
};

const ROLES = [
  { id: 'dev', label: 'Engenharia', icon: Code },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'product', label: 'Produto', icon: Target },
  { id: 'other', label: 'Outro', icon: Zap },
];

const GOALS = [
  {
    id: 'build',
    label: 'Criar produtos ágeis',
    icon: Rocket,
    description: 'Foco em execução rápida e entrega de valor contínua.',
  },
  {
    id: 'learn',
    label: 'Aprender e evoluir',
    icon: Sparkles,
    description: 'Expandir as habilidades e conhecimento do time.',
  },
  {
    id: 'network',
    label: 'Melhorar a colaboração',
    icon: Target,
    description: 'Conectar melhor o fluxo de trabalho na empresa.',
  },
  {
    id: 'manage',
    label: 'Gerenciar em escala',
    icon: Briefcase,
    description: 'Trazer governança, métricas e organização clara.',
  },
];

const TOTAL_STEPS = 4;

export default function App() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<UserData>({
    name: '',
    role: '',
    goals: [],
  });

  const nextStep = () => {
    setDirection(1);
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((prev) => prev - 1);
  };

  const updateData = (fields: Partial<UserData>) => {
    setData((prev) => ({ ...prev, ...fields }));
  };

  const toggleGoal = (goalId: string) => {
    setData((prev) => {
      const isSelected = prev.goals.includes(goalId);
      if (isSelected) {
        return { ...prev, goals: prev.goals.filter((g) => g !== goalId) };
      }
      return { ...prev, goals: [...prev.goals, goalId] };
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafc] flex items-center justify-center font-sans p-4 sm:p-6 md:p-12 relative overflow-hidden selection:bg-violet-200 selection:text-violet-900">
      {/* Animated Abstract Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[-10%] md:top-[-20%] left-[-10%] w-[70vw] h-[70vw] md:w-[50vw] md:h-[50vw] rounded-full bg-gradient-to-br from-violet-300/40 to-fuchsia-300/40 blur-[80px] md:blur-[120px] mix-blend-multiply opacity-70"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-[-10%] md:bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] md:w-[60vw] md:h-[60vw] rounded-full bg-gradient-to-tl from-indigo-300/40 to-cyan-300/40 blur-[80px] md:blur-[120px] mix-blend-multiply opacity-70"
        />
      </div>

      {/* Main Glass Card Container */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-[540px] bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1),_0_0_0_1px_rgba(255,255,255,0.5)_inset] border border-white/50 p-2 sm:p-3 overflow-hidden"
      >
        {/* Inner Card content container */}
        <div className="bg-white/60 rounded-[2rem] min-h-[480px] sm:min-h-[520px] flex flex-col relative overflow-hidden shadow-inner">
          
          {/* Progress Header */}
          <div className="absolute top-0 left-0 right-0 h-1.5 flex bg-white/50 z-20">
            <motion.div
              layout
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-r-full"
              initial={{ width: '0%' }}
              animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>

          <div className="flex-1 flex flex-col p-6 sm:p-10 relative mt-2 z-10">
            <AnimatePresence mode="wait" custom={direction}>
              <StepContent
                key={`step-${step}`}
                step={step}
                direction={direction}
                data={data}
                updateData={updateData}
                toggleGoal={toggleGoal}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Separate component for steps to keep AnimatePresence working cleanly
const StepContent = ({
  step,
  direction,
  data,
  updateData,
  toggleGoal,
  nextStep,
  prevStep,
}: any) => {
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
      scale: 0.98,
      filter: 'blur(4px)',
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: { type: 'spring', stiffness: 400, damping: 35 },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 40 : -40,
      opacity: 0,
      scale: 0.98,
      filter: 'blur(4px)',
      transition: { type: 'spring', stiffness: 400, damping: 35 },
    }),
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
  };

  if (step === 0) {
    return (
      <motion.div
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        className="flex flex-col flex-1 h-full"
      >
        <div className="flex-1 flex flex-col justify-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="mb-8 relative"
          >
            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center border border-white shadow-sm overflow-hidden relative">
              <Hexagon size={32} className="text-violet-600 fill-violet-600/20 relative z-10" strokeWidth={1.5} />
              <div className="absolute inset-0 bg-white/20 blur-md rounded-full" />
            </div>
            
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center border-2 border-white shadow-sm"
            >
              <Sparkles size={10} className="text-cyan-600 fill-cyan-600" />
            </motion.div>
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 to-zinc-600 mb-4">
            Desbloqueie seu <br/> potencial ágil.
          </h1>
          <p className="text-zinc-500 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed font-medium">
            Personalize sua experiência em 3 passos simples. Uma interface moldada exclusivamente para o seu workflow.
          </p>
        </div>

        <div className="mt-auto pt-4 sm:pt-6 flex flex-col-reverse sm:flex-row items-center sm:space-x-4 gap-4 sm:gap-0">
          <div className="flex items-center text-sm font-medium text-zinc-400">
            <LockKeyhole size={16} strokeWidth={2} className="mr-2 opacity-75" />
            Conexão segura
          </div>
          <div className="hidden sm:block flex-1" />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={nextStep}
            className="w-full sm:w-auto flex justify-center text-white items-center bg-zinc-900 shadow-[0_4px_14px_0_rgb(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:bg-zinc-800 px-7 py-3.5 rounded-2xl font-semibold transition-all group"
          >
            Começar
            <ArrowRight size={18} strokeWidth={2.5} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  if (step === 1) {
    return (
      <motion.div custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col flex-1 h-full">
        <div className="flex items-center space-x-2 mb-3">
          <span className="h-6 px-2.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold tracking-wide uppercase flex items-center justify-center">
            Passo 1
          </span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-zinc-900 mb-6 sm:mb-8">
          Como podemos te chamar?
        </h1>
        
        <div className="space-y-6 sm:space-y-8 flex-1">
          {/* Input Name */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <label className="block text-sm font-semibold text-zinc-700 mb-2 pl-1">
              Nome de exibição
            </label>
            <input
              type="text"
              autoFocus
              className="w-full bg-white/70 border border-zinc-200/80 text-zinc-900 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all font-medium placeholder:text-zinc-400 placeholder:font-normal shadow-sm"
              placeholder="Ex: João Silva"
              value={data.name}
              onChange={(e) => updateData({ name: e.target.value })}
            />
          </motion.div>

          {/* Role Selection */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            <label className="block text-sm font-semibold text-zinc-700 mb-3 pl-1">
              Sua especialidade
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
              {ROLES.map((role) => {
                const isSelected = data.role === role.id;
                const Icon = role.icon;
                return (
                  <motion.button
                    variants={staggerItem}
                    key={role.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateData({ role: role.id })}
                    className={`relative flex items-center p-4 rounded-2xl border transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-violet-500 ring-1 ring-violet-500 bg-violet-50/50 text-violet-900 shadow-md shadow-violet-500/10'
                        : 'border-zinc-200 bg-white/50 text-zinc-600 hover:border-zinc-300 hover:bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mr-3 transition-colors ${isSelected ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100/80 text-zinc-500'}`}>
                      <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} />
                    </div>
                    <span className="text-sm font-semibold">{role.label}</span>
                    
                    {/* Selected Indicator */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }} 
                          exit={{ scale: 0 }}
                          className="absolute top-3 right-3 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center shadow-sm"
                        >
                          <Check size={10} strokeWidth={3} className="text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        <NavigationButtons prevStep={prevStep} nextStep={nextStep} isDisabled={!data.name || !data.role} />
      </motion.div>
    );
  }

  if (step === 2) {
    return (
      <motion.div custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col flex-1 h-full">
        <div className="flex items-center space-x-2 mb-3">
          <span className="h-6 px-2.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold tracking-wide uppercase flex items-center justify-center">
            Passo 2
          </span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-zinc-900 mb-2">
          Defina seu foco.
        </h1>
        <p className="text-zinc-500 mb-6 font-medium text-sm">
          Selecione suas prioridades para personalizarmos seus relatórios.
        </p>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3 flex-1 overflow-y-auto pr-2 pb-2">
          {GOALS.map((goal) => {
            const isSelected = data.goals.includes(goal.id);
            const Icon = goal.icon;
            
            return (
              <motion.button
                variants={staggerItem}
                key={goal.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleGoal(goal.id)}
                className={`w-full group text-left p-4 rounded-2xl border flex items-center transition-all duration-200 ${
                  isSelected
                    ? 'border-violet-500 ring-1 ring-violet-500 bg-violet-50/50 shadow-md shadow-violet-500/10'
                    : 'border-zinc-200 bg-white/50 hover:border-zinc-300 hover:bg-white'
                }`}
              >
                <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${
                  isSelected ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20' : 'bg-zinc-100/80 text-zinc-500 group-hover:bg-zinc-200/50'
                }`}>
                  <Icon size={20} strokeWidth={isSelected ? 2 : 1.5} />
                </div>
                
                <div className="ml-4 flex-1">
                  <h3 className={`font-semibold text-[15px] ${isSelected ? 'text-violet-950' : 'text-zinc-900'}`}>
                    {goal.label}
                  </h3>
                  <p className={`text-[13px] mt-0.5 leading-snug ${isSelected ? 'text-violet-700' : 'text-zinc-500'}`}>
                    {goal.description}
                  </p>
                </div>

                <div className={`ml-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                  isSelected ? 'bg-violet-600 border-violet-600 text-white' : 'border-zinc-300 bg-white group-hover:border-zinc-400'
                }`}>
                  <motion.div 
                    initial={false}
                    animate={{ scale: isSelected ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Check size={12} strokeWidth={4} />
                  </motion.div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        <NavigationButtons prevStep={prevStep} nextStep={nextStep} isDisabled={data.goals.length === 0} nextText="Finalizar" />
      </motion.div>
    );
  }

  if (step === 3) {
    return (
      <motion.div custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col flex-1 h-full items-center justify-center text-center">
        
        <div className="relative mb-10 w-28 h-28 flex items-center justify-center">
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-60"
          />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
            className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 relative z-10"
          >
            {/* Animated Check Path */}
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
              <motion.path
                d="M5 12L10 17L20 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
              />
            </svg>
          </motion.div>
          
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.6 }}
            className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-zinc-100 z-20"
          >
            <Sparkles size={20} className="text-yellow-500 fill-yellow-500" />
          </motion.div>
        </div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 to-zinc-700 mb-4"
        >
          Tudo pronto, {data.name.split(' ')[0]}!
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-zinc-500 font-medium mb-10 max-w-[280px] leading-relaxed"
        >
          Sua área de trabalho foi configurada e perfeitamente adaptada para você.
        </motion.p>
        
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => alert('Onboarding completo! Redirecionando...')}
          className="w-full sm:w-auto min-w-[240px] text-white bg-zinc-900 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] hover:bg-zinc-800 px-8 py-4 rounded-2xl font-semibold transition-all flex items-center justify-center group"
        >
          Acessar Plataforma
          <ArrowRight size={18} strokeWidth={2.5} className="ml-2 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </motion.div>
    );
  }

  return null;
};

// Reusable navigation bar
const NavigationButtons = ({ prevStep, nextStep, isDisabled, nextText = "Continuar" }: { prevStep: () => void, nextStep: () => void, isDisabled: boolean, nextText?: string }) => (
  <div className="mt-4 sm:mt-8 pt-4 sm:pt-6 flex space-x-3 border-t md:border-none border-zinc-200/60 items-center justify-between">
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={prevStep}
      className="flex text-zinc-500 items-center justify-center w-12 h-12 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-2xl font-medium transition-colors shadow-sm"
    >
      <ArrowLeft size={20} strokeWidth={2.5} />
    </motion.button>
    <div className="flex-1" />
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      onClick={nextStep}
      disabled={isDisabled}
      className={`flex items-center px-7 py-3.5 rounded-2xl font-semibold transition-all group shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] ${
        !isDisabled
          ? 'bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
          : 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'
      }`}
    >
      {nextText}
      <ArrowRight size={18} strokeWidth={2.5} className={`ml-2 ${!isDisabled ? 'group-hover:translate-x-1' : ''} transition-transform`} />
    </motion.button>
  </div>
);
