import { app } from './firebase';
import { getFirebaseEnvConfig, isFirebaseAnalyticsEnabled } from './env';
import { createLogger } from './logger';

const log = createLogger('analytics');
export const ANALYTICS_CONSENT_KEY = 's2a_analytics_consent';
export const ANALYTICS_CONSENT_CHANGED_EVENT = 's2a-analytics-consent-changed';

export type AnalyticsConsent = 'unknown' | 'granted' | 'denied';
export type AnalyticsErrorCategory =
  | 'credits'
  | 'app_check'
  | 'permission'
  | 'timeout'
  | 'network'
  | 'unsupported_browser'
  | 'safety'
  | 'cancelled'
  | 'unknown';

type CommonParams = {
  feature?: string;
  source?: string;
  mode?: string;
  error_category?: AnalyticsErrorCategory;
};

type GenerationParams = CommonParams & {
  size_bucket?: string;
  ratio?: string;
  scene_count?: number;
  has_attachment?: boolean;
  multi_speaker?: boolean;
  generate_scenes?: boolean;
};

type ExportParams = CommonParams & {
  quality?: string;
  ratio?: string;
  codec?: string;
  container?: string;
  scene_count?: number;
};

export interface AnalyticsEventMap {
  select_content: { content_type: 'public_cta'; item_id: string; source: string };
  generate_lead: { source: 'contact_email' | 'feedback' };
  sign_up: { method: 'email' };
  login: { method: 'google' | 'email' };
  logout: Record<string, never>;
  password_reset_requested: Record<string, never>;
  onboarding_started: Record<string, never>;
  onboarding_completed: { role: string; goals_count: number };
  onboarding_skipped: Record<string, never>;
  audio_generate_started: GenerationParams;
  audio_generate_completed: GenerationParams;
  audio_generate_failed: GenerationParams;
  audio_generate_cancelled: GenerationParams;
  image_generate_started: GenerationParams;
  image_generate_completed: GenerationParams;
  image_generate_failed: GenerationParams;
  image_generate_cancelled: GenerationParams;
  assistant_message_sent: GenerationParams;
  assistant_response_completed: GenerationParams;
  assistant_response_failed: GenerationParams;
  assistant_response_cancelled: GenerationParams;
  video_export_started: ExportParams;
  video_export_completed: ExportParams;
  video_export_failed: ExportParams;
  video_export_cancelled: ExportParams;
  video_downloaded: ExportParams;
  speed_paint_export_started: ExportParams;
  speed_paint_export_completed: ExportParams;
  speed_paint_export_failed: ExportParams;
  speed_paint_export_cancelled: ExportParams;
  speed_paint_downloaded: ExportParams;
  library_audio_saved: { source: 'studio' };
  library_project_deleted: Record<string, never>;
  library_opened_in_speed_paint: { scene_count: number };
  upgrade_dialog_opened: { plan_id?: string };
  begin_checkout: { plan_id: string; billing_cycle: 'monthly' | 'yearly' };
}

type AnalyticsModule = typeof import('firebase/analytics');
type AnalyticsInstance = ReturnType<AnalyticsModule['getAnalytics']>;

let analyticsModulePromise: Promise<AnalyticsModule | null> | null = null;
let analyticsInstancePromise: Promise<AnalyticsInstance | null> | null = null;
let pendingUserId: string | null = null;
const pendingUserProperties: Record<string, string> = {};

function dispatchConsentChanged(consent: AnalyticsConsent): void {
  window.dispatchEvent(new CustomEvent<AnalyticsConsent>(ANALYTICS_CONSENT_CHANGED_EVENT, {
    detail: consent,
  }));
}

export function getAnalyticsConsent(): AnalyticsConsent {
  try {
    const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return consent === 'granted' || consent === 'denied' ? consent : 'unknown';
  } catch {
    return 'unknown';
  }
}

function persistConsent(consent: Exclude<AnalyticsConsent, 'unknown'>): void {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  } catch {
    log.warn('Falha ao persistir consentimento do Analytics');
  }
  dispatchConsentChanged(consent);
}

async function loadAnalyticsModule(): Promise<AnalyticsModule | null> {
  if (!analyticsModulePromise) {
    analyticsModulePromise = import('firebase/analytics').catch((error: unknown) => {
      log.warn('Falha ao carregar Firebase Analytics', { error });
      analyticsModulePromise = null;
      return null;
    });
  }
  return analyticsModulePromise;
}

async function getAnalyticsInstance(): Promise<AnalyticsInstance | null> {
  if (getAnalyticsConsent() !== 'granted' || !isFirebaseAnalyticsEnabled()) return null;
  if (!getFirebaseEnvConfig().measurementId) return null;

  if (!analyticsInstancePromise) {
    analyticsInstancePromise = (async () => {
      const analyticsModule = await loadAnalyticsModule();
      if (!analyticsModule || !(await analyticsModule.isSupported())) return null;

      analyticsModule.setConsent({
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      const analytics = analyticsModule.getAnalytics(app);
      analyticsModule.setAnalyticsCollectionEnabled(analytics, true);
      analyticsModule.setUserId(analytics, pendingUserId);
      if (Object.keys(pendingUserProperties).length > 0) {
        analyticsModule.setUserProperties(analytics, pendingUserProperties);
      }
      return analytics;
    })().catch((error: unknown) => {
      log.warn('Falha ao inicializar Firebase Analytics', { error });
      return null;
    }).then((analytics) => {
      if (!analytics) analyticsInstancePromise = null;
      return analytics;
    });
  }
  return analyticsInstancePromise;
}

export async function grantAnalyticsConsent(): Promise<void> {
  persistConsent('granted');
  await getAnalyticsInstance();
}

export async function denyAnalyticsConsent(): Promise<void> {
  persistConsent('denied');
  if (!analyticsInstancePromise) return;

  const analyticsModule = await loadAnalyticsModule();
  const analytics = await analyticsInstancePromise;
  if (!analyticsModule || !analytics) return;

  analyticsModule.setConsent({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  analyticsModule.setUserId(analytics, null);
  analyticsModule.setAnalyticsCollectionEnabled(analytics, false);
  analyticsInstancePromise = null;
}

export function syncAnalyticsUser(userId: string | null): void {
  pendingUserId = userId;
  void getAnalyticsInstance().then(async (analytics) => {
    if (!analytics) return;
    const analyticsModule = await loadAnalyticsModule();
    analyticsModule?.setUserId(analytics, userId);
  });
}

export function setAnalyticsUserProperties(properties: Record<string, string>): void {
  Object.assign(pendingUserProperties, properties);
  void getAnalyticsInstance().then(async (analytics) => {
    if (!analytics) return;
    const analyticsModule = await loadAnalyticsModule();
    analyticsModule?.setUserProperties(analytics, properties);
  });
}

export function trackAnalyticsEvent<Name extends keyof AnalyticsEventMap>(
  name: Name,
  params: AnalyticsEventMap[Name],
): void {
  void getAnalyticsInstance().then(async (analytics) => {
    if (!analytics) return;
    const analyticsModule = await loadAnalyticsModule();
    const sendEvent = analyticsModule?.logEvent as
      | ((instance: AnalyticsInstance, eventName: string, eventParams: object) => void)
      | undefined;
    sendEvent?.(analytics, name, params);
  });
}

export function categorizeAnalyticsError(error: unknown): AnalyticsErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('credit') || message.includes('crédito') || message.includes('saldo')) return 'credits';
  if (message.includes('app-check') || message.includes('appcheck')) return 'app_check';
  if (message.includes('permission') || message.includes('unauthorized')) return 'permission';
  if (message.includes('timeout') || message.includes('deadline') || message.includes('504')) return 'timeout';
  if (message.includes('network') || message.includes('fetch')) return 'network';
  if (message.includes('unsupported') || message.includes('not supported')) return 'unsupported_browser';
  if (message.includes('safety') || message.includes('blocked')) return 'safety';
  if (message.includes('cancel') || message.includes('abort')) return 'cancelled';
  return 'unknown';
}

export function getSizeBucket(length: number): string {
  if (length <= 500) return 'small';
  if (length <= 5_000) return 'medium';
  if (length <= 20_000) return 'large';
  return 'xlarge';
}
