// ---------------------------------------------------------------------------
// Inicialização centralizada do Genkit
// ---------------------------------------------------------------------------
//
// Configura a instância única do Genkit com o plugin Google GenAI.
// O plugin lê automaticamente a API key das variáveis de ambiente:
//   GOOGLE_GENAI_API_KEY (preferencial) ou GEMINI_API_KEY (fallback)
//
// Também configura telemetria com Firebase (OpenTelemetry) e validação
// de variáveis de ambiente na inicialização.
//
// Consumido por todos os flows e utilitários de IA no backend.
// ---------------------------------------------------------------------------

import { genkit, generateMiddleware } from 'genkit/beta';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/google-genai';
import { logger } from 'genkit/logging';

// ---------------------------------------------------------------------------
// Telemetria Firebase — OpenTelemetry para tracing, logging e métricas
// ---------------------------------------------------------------------------
//
// Habilita exportação automática de traces, logs e métricas do Genkit
// para Google Cloud Logging, Cloud Trace e Cloud Monitoring.
//
// Requer:
//   1. @genkit-ai/firebase instalado (ver package.json)
//   2. APIs habilitadas no Google Cloud: Cloud Logging, Cloud Trace, Cloud Monitoring
//   3. Service account com roles: Monitoring Metric Writer, Cloud Trace Agent,
//      Logs Writer (geralmente a default compute service account do projeto)
//
// A telemetria só é ativada quando ENABLE_FIREBASE_MONITORING=true no ambiente.
// Isso evita timeout de 10s durante o deploy (a CLI carrega o código e a
// telemetria tentaria conectar com Cloud Trace/Monitoring antes do deploy
// ser concluído).
// ---------------------------------------------------------------------------

if (process.env.ENABLE_FIREBASE_MONITORING === 'true') {
  enableFirebaseTelemetry({
    // Intervalo de exportação de métricas (padrão: 5 min)
    // Deve ser >= metricExportTimeoutMillis (padrão do OTel: 30s).
    // O exportTimeoutMillis padrão do @genkit-ai/google-cloud pode ser maior
    // que 60s em certas versões, causando crash no deploy. Usamos 5 min para
    // garantir compatibilidade com qualquer timeout razoável.
    metricExportIntervalMillis: 300_000,
    // Timeout explícito: 4 min, garantindo que interval (5 min) >= timeout (4 min)
    metricExportTimeoutMillis: 240_000,
  });
}

// ---------------------------------------------------------------------------
// Instância única do Genkit
// ---------------------------------------------------------------------------

/** Instância única do Genkit compartilhada por todos os flows */
export const ai = genkit({
  plugins: [googleAI()],
});

// ---------------------------------------------------------------------------
// Nível de log do Genkit — suprime falsos positivos de DEBUG
// ---------------------------------------------------------------------------
//
// O Genkit emite logs DEBUG para cada flow que não usa `defineSecret` com
// Cloud Secret Manager. Como usamos variáveis de ambiente diretamente
// (via .env local e env vars nas Cloud Functions), esses avisos são
// falsos positivos — a API key já está disponível em process.env.
//
// Subindo o nível para 'warn', os DEBUGs e INFOs internos são suprimidos,
// mantendo apenas warnings e erros reais.
// ---------------------------------------------------------------------------

logger.setLogLevel('warn');

// ---------------------------------------------------------------------------
// Validação de variáveis de ambiente na inicialização
// ---------------------------------------------------------------------------
//
// Verifica se a API key do Gemini está configurada. O erro só apareceria
// na primeira chamada a um flow — esta validação antecipa o diagnóstico.
// Não lança erro para não quebrar o deploy, mas loga em stderr para
// aparecer no Cloud Logging.
// ---------------------------------------------------------------------------

if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
  console.error(
    '[genkit] GOOGLE_GENAI_API_KEY não configurada — os flows de IA vão falhar',
  );
  console.error(
    '[genkit] Configure a variável no arquivo .env ou no ambiente de deploy',
  );
}

// ---------------------------------------------------------------------------
// Middleware de guard do Open Beta
// ---------------------------------------------------------------------------
//
// Bloqueia chamadas aos flows de IA quando o beta aberto está desabilitado.
// Controlado pela variável de ambiente OPEN_BETA_ENABLED.
//
// Uso: adicione `use: [openBetaGuard]` nas opções de ai.generate() ou
// ai.generateStream() para bloquear chamadas quando o beta estiver fechado.
//
// Planejado (Fase 5): Aplicar este middleware em todos os flows de IA quando
// o beta aberto terminar e a cobrança por créditos for ativada.
// ---------------------------------------------------------------------------

const OPEN_BETA_ENABLED = process.env.OPEN_BETA_ENABLED === 'true';

if (!OPEN_BETA_ENABLED) {
  console.warn(
    '[genkit] OPEN_BETA_ENABLED não está ativa — os flows de IA DEVEM ser protegidos pelo middleware openBetaGuard',
  );
}

/**
 * Middleware que bloqueia chamadas ao modelo quando o beta aberto está
 * desabilitado (OPEN_BETA_ENABLED !== 'true').
 *
 * Aplica-se na fase `generate` (loop de alto nível do Genkit) para
 * interceptar qualquer tentativa de geração antes mesmo de chegar ao modelo.
 */
export const openBetaGuard: ReturnType<typeof generateMiddleware> = generateMiddleware(
  {
    name: 'open-beta-guard',
    description:
      'Bloqueia chamadas aos modelos de IA quando o beta aberto está desabilitado',
  },
  () => ({
    generate: async (_envelope, _ctx, next) => {
      if (!OPEN_BETA_ENABLED) {
        throw new Error(
          'O beta aberto está temporariamente desabilitado. ' +
          'Tente novamente em breve.',
        );
      }
      return next(_envelope, _ctx);
    },
  }),
);
