import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'motion/react';
import { Inspector } from '../components/Inspector';
import { ScriptEditor } from '../components/ScriptEditor';
import { useAudioCurrentTime } from '../contexts/AudioContext';
import { DocumentHead } from '../components/DocumentHead';
import { getPageSeo } from '../lib/seo';
import { useLocale } from '../features/i18n';
import { useStudioStore } from '../features/studio/store';
import { useSwipeTabs } from '../hooks/useSwipeTabs';

interface StudioPageProps {
  isGenerating: boolean;
  scenes: { imageUrl: string; timestamp: number }[];
  handleGenerate: () => void;
  isGenerateDisabled: boolean;
}

function a11yProps(index: number) {
  return {
    id: `studio-tab-${index}`,
    'aria-controls': `studio-tabpanel-${index}`,
  };
}

export function StudioPage({
  isGenerating,
  scenes,
  handleGenerate,
  isGenerateDisabled,
}: StudioPageProps) {
  const { t } = useLocale();
  const currentTime = useAudioCurrentTime();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [activeTab, setActiveTab] = useState(0);
  const [direction, setDirection] = useState(0);

  // Hook de swipe com feedback visual (drag) para mobile
  const { dragConstraints, swipeVariants, handleDragEnd, dragElastic, dragDirectionLock } = useSwipeTabs({
    activeTab,
    tabCount: 2,
    setActiveTab: (index: number) => {
      setDirection(index > activeTab ? 1 : -1);
      setActiveTab(index);
    },
  });

  const seo = getPageSeo({
    title: 'Estúdio',
    description: 'Transforme roteiros em áudio profissional com IA. Editor, vozes e configurações de geração.',
    path: '/app/estudio',
  });

  // Estado de config do store — apenas script para o ScriptEditor (Inspector usa o store diretamente)
  const { script, setScript } = useStudioStore(useShallow((s) => ({
    script: s.script,
    setScript: s.setScript,
  })));

  const intro = (
    <Stack spacing={0.75}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
        {t('studio.studioPage.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
        {t('studio.studioPage.subtitle')}
      </Typography>
    </Stack>
  );

  // Em mobile: tabs alternam entre Inspector e ScriptEditor
  // Em desktop (lg+): grid 2 colunas (layout original)
  if (isMobile) {
    return (
        <Stack spacing={2.5} sx={{ pb: 10 }}>
          <DocumentHead {...seo} />
          {intro}

          <Box
            sx={{
              position: 'sticky',
              top: 68,
              zIndex: 5,
              py: 0.5,
              mx: -0.5,
              px: 0.5,
              borderRadius: 3,
              bgcolor: 'rgba(5, 8, 22, 0.88)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_event, newValue: number) => {
                setDirection(newValue > activeTab ? 1 : -1);
                setActiveTab(newValue);
              }}
              variant="fullWidth"
              sx={{
                minHeight: 46,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                '& .MuiTabs-indicator': {
                  height: '100%',
                  borderRadius: 2.5,
                  bgcolor: 'rgba(46, 117, 182, 0.18)',
                  zIndex: 0,
                },
                '& .MuiTab-root': {
                  minHeight: 46,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  zIndex: 1,
                },
              }}
            >
              <Tab label={t('studio.studioPage.settingsTab')} {...a11yProps(0)} />
              <Tab label={t('studio.studioPage.scriptTab')} {...a11yProps(1)} />
            </Tabs>
          </Box>

          {/* Container de constraints para limitar arrasto */}
          <Box
            role="region"
            aria-label={t('studio.studioPage.swipeRegion', { defaultValue: 'Conteúdo do estúdio com swipe' })}
            sx={{ position: 'relative', overflow: 'hidden' }}
          >
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={`studio-tab-${activeTab}`}
                custom={direction}
                variants={swipeVariants}
                initial="enter"
                animate="center"
                exit="exit"
                drag="x"
                dragConstraints={dragConstraints}
                dragElastic={dragElastic}
                dragMomentum={false}
                dragDirectionLock={dragDirectionLock}
                onDragEnd={handleDragEnd}
                style={{ touchAction: 'pan-y' }}
              >
                {activeTab === 0 ? (
                  <Inspector isGenerating={isGenerating} />
                ) : (
                  <ScriptEditor
                    script={script}
                    setScript={setScript}
                    isGenerating={isGenerating}
                    handleGenerate={handleGenerate}
                    isGenerateDisabled={isGenerateDisabled}
                    scenes={scenes}
                    currentTime={currentTime}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </Box>
        </Stack>
    );
  }

  return (
      <Stack spacing={3}>
        <DocumentHead {...seo} />
        {intro}

        <Grid container spacing={{ xs: 3, lg: 4 }}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box
            sx={{
              position: { lg: 'sticky' },
              top: { lg: 84 },
            }}
          >
            <Inspector isGenerating={isGenerating} />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <ScriptEditor
            script={script}
            setScript={setScript}
            isGenerating={isGenerating}
            handleGenerate={handleGenerate}
            isGenerateDisabled={isGenerateDisabled}
            scenes={scenes}
            currentTime={currentTime}
          />
        </Grid>
        </Grid>
      </Stack>
  );
}
