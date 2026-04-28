import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { Inspector } from '../components/Inspector';
import { ScriptEditor } from '../components/ScriptEditor';
import { useAudioCurrentTime } from '../contexts/AudioContext';
import { useLocale } from '../features/i18n';
import { useStudioStore } from '../features/studio/store';
import { OnboardingManager } from '../features/onboarding';
import { useShallow } from 'zustand/react/shallow';

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

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`studio-tabpanel-${index}`}
      aria-labelledby={`studio-tab-${index}`}
    >
      {value === index ? children : null}
    </Box>
  );
}

export function StudioPage({ isGenerating, scenes, handleGenerate, isGenerateDisabled }: StudioPageProps) {
  const { t } = useLocale();
  const currentTime = useAudioCurrentTime();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [activeTab, setActiveTab] = useState(0);

  // Estado de config do store — apenas script para o ScriptEditor (Inspector usa o store diretamente)
  const { script, setScript } = useStudioStore(useShallow((s) => ({
    script: s.script,
    setScript: s.setScript,
  })));

  // Em mobile: tabs alternam entre Inspector e ScriptEditor
  // Em desktop (lg+): grid 2 colunas (layout original)
  if (isMobile) {
    return (
      <OnboardingManager>
        <Box sx={{ pb: 10 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, newValue: number) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              },
            }}
          >
            <Tab label={t('studio.studioPage.settingsTab')} {...a11yProps(0)} />
            <Tab label={t('studio.studioPage.scriptTab')} {...a11yProps(1)} />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <Inspector isGenerating={isGenerating} />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <ScriptEditor
              script={script}
              setScript={setScript}
              isGenerating={isGenerating}
              handleGenerate={handleGenerate}
              isGenerateDisabled={isGenerateDisabled}
              scenes={scenes}
              currentTime={currentTime}
            />
          </TabPanel>
        </Box>
      </OnboardingManager>
    );
  }

  return (
    <OnboardingManager>
      <Grid container spacing={{ xs: 3, lg: 4 }}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Inspector isGenerating={isGenerating} />
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
    </OnboardingManager>
  );
}
