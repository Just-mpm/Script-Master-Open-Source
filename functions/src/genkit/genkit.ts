// ---------------------------------------------------------------------------
// Inicialização centralizada do Genkit
// ---------------------------------------------------------------------------
//
// Configura a instância única do Genkit com o plugin Google GenAI.
//
// BYOK (Bring Your Own Key):
//   O plugin é inicializado com googleAI({ apiKey: false }) — nenhuma API key
//   global é configurada. Cada chamada de IA (ai.generate / ai.generateStream)
//   DEVE fornecer config: { apiKey: userKey } no payload, extraído via helper
//   extractApiKey() de '../utils/byok.js'.
//
// Também configura telemetria com Firebase (OpenTelemetry) e nível de log.
//
// Consumido por todos os flows e utilitários de IA no backend.
// ---------------------------------------------------------------------------
 
import { genkit } from 'genkit/beta';
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
//
// BYOK: googleAI({ apiKey: false }) desabilita chave global no ambiente.
// Cada chamada de IA deve fornecer config: { apiKey } com a key do usuário.
// ---------------------------------------------------------------------------

/** Instância única do Genkit compartilhada por todos os flows */
export const ai = genkit({
  plugins: [googleAI({ apiKey: false })],
});

// ---------------------------------------------------------------------------
// Nível de log do Genkit — suprime falsos positivos de DEBUG
// ---------------------------------------------------------------------------
//
// O Genkit emite logs DEBUG para cada flow que não usa `defineSecret` com
// Cloud Secret Manager. Como usamos variáveis de ambiente diretamente
// (via .env local e env vars nas Cloud Functions), esses avisos são
// falsos positivos.
//
// Subindo o nível para 'warn', os DEBUGs e INFOs internos são suprimidos,
// mantendo apenas warnings e erros reais.
// ---------------------------------------------------------------------------

logger.setLogLevel('warn');
