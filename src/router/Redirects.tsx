import { Navigate, Route } from 'react-router-dom';

/**
 * Redirects de compatibilidade para rotas públicas antigas.
 * Preserva SEO e links externos que ainda apontam para as URLs antigas.
 * Retorna array de <Route> para uso dentro de <Routes>.
 */
export const publicCompatRedirects = [
  <Route key="r-features" path="/features" element={<Navigate to="/funcionalidades" replace />} />,
  <Route key="r-pricing" path="/pricing" element={<Navigate to="/precos" replace />} />,
  <Route key="r-faq" path="/faq" element={<Navigate to="/perguntas-frequentes" replace />} />,
  <Route key="r-contact" path="/contact" element={<Navigate to="/contato" replace />} />,
  <Route key="r-about" path="/about" element={<Navigate to="/sobre" replace />} />,
  <Route key="r-register" path="/register" element={<Navigate to="/cadastro" replace />} />,
  <Route key="r-terms" path="/terms" element={<Navigate to="/termos" replace />} />,
  <Route key="r-privacy" path="/privacy" element={<Navigate to="/privacidade" replace />} />,
];

/**
 * Redirects de compatibilidade para rotas do app.
 * Deve ser usado dentro de <Route element={<ProtectedRoute />}>.
 * Retorna array de <Route> para uso dentro de <Routes>.
 */
export const appCompatRedirects = [
  <Route key="r-image" path="/app/image" element={<Navigate to="/app/imagens" replace />} />,
  <Route key="r-assistant" path="/app/assistant" element={<Navigate to="/app/assistente" replace />} />,
  <Route key="r-library" path="/app/library" element={<Navigate to="/app/biblioteca" replace />} />,
  <Route key="r-speed-paint" path="/app/speed-paint" element={<Navigate to="/app/pintura-rapida" replace />} />,
];
