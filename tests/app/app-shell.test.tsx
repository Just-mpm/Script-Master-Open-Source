import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// ─── Mocks de dependências pesadas ──────────────────────────

const mockUnsubscribe = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  functions: {},
  googleProvider: {},
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn().mockImplementation((_auth: unknown, callback: (user: unknown) => void) => {
    callback(null);
    return mockUnsubscribe;
  }),
}));

vi.mock('../../src/lib/app-check', () => ({
  ensureAppCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn().mockReturnValue(vi.fn().mockResolvedValue({
    data: {
      summary: 'ok',
      estimatedDurationSeconds: 0,
      estimatedChunkCount: 1,
      estimatedSceneCount: 0,
      confidence: 'high',
      steps: [],
      credits: { available: 0, totalPlanned: 0, remainingAfter: 0, unlimited: false },
      canProceed: false,
      notes: [],
    },
  })),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../src/lib/env', () => ({
  readRequiredEnv: (key: string) => `mock-${key}`,
  readOptionalEnv: () => undefined,
  getGeminiApiKey: () => 'mock-api-key',
  getRecaptchaSiteKey: () => undefined,
  isBillingEnabled: () => false,
  isOpenBetaEnabled: () => true,
  getFirebaseEnvConfig: () => ({
    apiKey: 'mock',
    authDomain: 'mock',
    projectId: 'mock',
    storageBucket: 'mock',
    messagingSenderId: 'mock',
    appId: 'mock',
    measurementId: 'mock',
    databaseURL: 'mock',
  }),
}));

vi.mock('../../src/lib/constants', () => ({
  MAX_CHARS: 50000,
  CHUNK_LIMIT: 500,
  VOICES: [],
  PACE_INSTRUCTIONS: {},
}));

vi.mock('../../src/lib/db', () => ({
  saveGeneration: vi.fn().mockResolvedValue(undefined),
  saveProject: vi.fn().mockResolvedValue(undefined),
  saveAudioToProject: vi.fn().mockResolvedValue(undefined),
  saveImageToProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/audio', () => ({
  createWavBlob: vi.fn(),
  base64ToUint8Array: vi.fn(),
  extractPcmFromData: vi.fn(),
}));

vi.mock('../../src/lib/gemini', () => ({
  generateScenePrompts: vi.fn(),
  generateImageFromPrompt: vi.fn(),
}));

vi.mock('../../src/lib/audio-analysis', () => ({
  detectSceneBoundaries: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/lib/error-mapping', () => ({
  createErrorMapper: () => vi.fn(),
  sharedErrorRules: [],
}));

vi.mock('../../src/lib/rate-limiter', () => ({
  withRetry: vi.fn(),
}));

vi.mock('../../src/lib/download', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('../../src/features/video-render/lib/videoUtils', () => ({
  calculateDurationFromWav: vi.fn().mockReturnValue(0),
}));

vi.mock('../../src/features/video-render/store/videoRenderBridge', () => ({
  useVideoRenderBridge: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ isExportingVideo: false, videoExportProgress: 0 }),
}));

vi.mock('../../src/features/studio/store/studioStore', () => ({
  useStudioStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ script: '', selectedVoice: 'Aoede', isMultiSpeaker: false, speakerBVoice: '' }),
}));

vi.mock('../../src/features/studio/store/studio.utils', () => ({
  buildGenerateOptions: vi.fn().mockReturnValue({}),
  VIDEO_FPS: 30,
}));

vi.mock('../../src/hooks/useAudioGenerator', () => ({
  useAudioGenerator: () => ({
    isGenerating: false,
    statusText: '',
    generationProgress: 0,
    audioUrl: null,
    audioBlob: null,
    scenes: [],
    error: null,
    setError: vi.fn(),
    sceneGenerationWarning: null,
    generateAudio: vi.fn(),
    handleCancel: vi.fn(),
    durationInSeconds: 0,
  }),
}));

vi.mock('../../src/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('../../src/components/DataMigrationDialog', () => ({
  DataMigrationDialog: () => null,
}));

vi.mock('../../src/lib/db/migration', () => ({
  isMigrationAlreadyHandled: () => true,
}));

vi.mock('../../src/components/VideoPreview', () => ({
  VideoPreview: () => null,
}));

vi.mock('../../src/components/public/ScrollToTop', () => ({
  ScrollToTop: () => null,
}));

// ─── Imports após mocks ────────────────────────────────────

import { AuthProvider } from '../../src/contexts/AuthContext';
import { AudioProvider } from '../../src/contexts/AudioContext';
import { I18nProvider } from '../../src/features/i18n';
import App from '../../src/App';

// ─── Setup ─────────────────────────────────────────────────

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function createWrapper(initialEntry = '/') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider>
        <ThemeProvider theme={darkTheme}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <AuthProvider>
              <AudioProvider>
                {children}
              </AudioProvider>
            </AuthProvider>
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    );
  };
}

// ─── Testes ────────────────────────────────────────────────

describe('App Shell — Smoke Tests', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('renderiza sem crash na rota pública /', () => {
    render(<App />, { wrapper: createWrapper('/') });
    expect(document.body).toBeTruthy();
  });

  it('renderiza o link de skip-to-content para acessibilidade', () => {
    render(<App />, { wrapper: createWrapper('/') });
    const skipLink = document.querySelector('a[href="#main-content"]');
    expect(skipLink).toBeTruthy();
  });

  it('renderiza o landmark main com id correto', () => {
    render(<App />, { wrapper: createWrapper('/') });
    const main = document.getElementById('main-content');
    expect(main).toBeTruthy();
  });

  it('renderiza sem crash em rotas /app/*', () => {
    render(<App />, { wrapper: createWrapper('/app/estudio') });
    expect(document.body).toBeTruthy();
  });

  it('renderiza sem crash ao redirecionar /app para /app/assistente', () => {
    render(<App />, { wrapper: createWrapper('/app') });
    expect(document.body).toBeTruthy();
  });
});
