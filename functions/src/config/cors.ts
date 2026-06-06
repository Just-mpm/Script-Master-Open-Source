// ---------------------------------------------------------------------------
// CORS Origins permitidas para chamadas callable
// ---------------------------------------------------------------------------

interface FirebaseConfigEnv {
  projectId?: string;
}

function getFirebaseConfigProjectId(): string | null {
  const firebaseConfig = process.env.FIREBASE_CONFIG;
  if (!firebaseConfig) return null;

  try {
    const parsed = JSON.parse(firebaseConfig) as FirebaseConfigEnv;
    return typeof parsed.projectId === 'string' && parsed.projectId.length > 0
      ? parsed.projectId
      : null;
  } catch {
    return null;
  }
}

function getProjectId(): string | null {
  return process.env.GCLOUD_PROJECT
    ?? process.env.GCP_PROJECT
    ?? getFirebaseConfigProjectId();
}

function getDefaultOrigins(): string[] {
  const projectId = getProjectId();
  const firebaseHostingOrigins = projectId
    ? [`https://${projectId}.web.app`, `https://${projectId}.firebaseapp.com`]
    : [];

  return [
    'https://script-master.pro',
    ...firebaseHostingOrigins,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
}

/** Origins permitidas — configuráveis via variável de ambiente APP_CORS_ORIGINS */
export const APP_ALLOWED_CORS_ORIGINS: string[] = (() => {
  const envOrigins = process.env.APP_CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(Boolean);
  }

  return getDefaultOrigins();
})();
