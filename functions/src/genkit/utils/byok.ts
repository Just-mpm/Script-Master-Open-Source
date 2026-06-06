// ---------------------------------------------------------------------------
// BYOK — Helpers para extração e validação de API key do usuário
// ---------------------------------------------------------------------------
//
// Cada chamada de IA recebe providerAuth no payload do callable.
// Este módulo extrai, valida e sanitiza a key antes de passar ao Genkit.
//
// A API key NUNCA é salva em Firestore, logs ou analytics.
// ---------------------------------------------------------------------------

import { HttpsError } from 'firebase-functions/v2/https';
import type { ProviderAuth } from '../schemas/common.js';
import { createLogger } from './logger.js';

const log = createLogger('byok');

/**
 * Extrai a API key do payload do callable.
 * Lança HttpsError se a key não for fornecida ou for inválida.
 */
export function extractApiKey(data: Record<string, unknown>): string {
  const auth = data.providerAuth as ProviderAuth | undefined;

  if (!auth?.apiKey || typeof auth.apiKey !== 'string' || auth.apiKey.trim().length === 0) {
    log.warn('Chave de API ausente ou inválida no payload');
    throw new HttpsError(
      'invalid-argument',
      'Chave de API do Gemini é obrigatória. Configure nas configurações do aplicativo.',
    );
  }

  const trimmed = auth.apiKey.trim();

  // Validação básica de formato (Gemini keys começam com AIza)
  if (!trimmed.startsWith('AIza')) {
    log.warn('Formato de API key inválido');
    throw new HttpsError(
      'invalid-argument',
      'Formato de chave de API inválido. Use uma chave válida do Google AI Studio.',
    );
  }

  return trimmed;
}

/**
 * Gera config para ai.generate() com a API key do usuário.
 * Use em toda chamada ai.generate(): `config: { ...withApiKey(key), temperature: 0.7 }`
 */
export function withApiKey(apiKey: string): { apiKey: string } {
  return { apiKey };
}

/**
 * Mascara a API key para exibição segura em logs.
 * Mostra apenas primeiros 4 e últimos 4 caracteres.
 */
export function maskApiKeyForLog(apiKey: string): string {
  if (apiKey.length <= 12) return '***';
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}
