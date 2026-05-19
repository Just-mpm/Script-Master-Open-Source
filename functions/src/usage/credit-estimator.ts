// ---------------------------------------------------------------------------
// Estimador de créditos — pré-reserva conservadora
// ---------------------------------------------------------------------------
//
// Estima créditos ANTES da execução do flow para evitar estouro de reserva.
// As estimativas são conservadoras (para cima) para garantir que a reserva
// sempre cubra o custo real, permitindo devolução parcial na confirmação.
// ---------------------------------------------------------------------------

import type { OperationType } from './credit-policy.js';
import { calculateCreditCost } from './credit-policy.js';
import { asString } from '../genkit/utils/helpers.js';

/**
 * Entrada para estimativa — os campos variam conforme o tipo de operação.
 * Usamos Record<string, unknown> para flexibilidade, pois cada flow passa
 * seus próprios parâmetros (ex: script para audio, mensagem para assistant).
 */
type EstimateInput = Record<string, unknown>;

/**
 * Estima créditos necessários para uma operação antes da execução.
 *
 * A estimativa é CONSERVADORA — sempre arredonda para cima e usa
 * cenários de pior caso (ex: assume que o script inteiro será sintetizado).
 *
 * @param operationType - Tipo da operação
 * @param input - Dados de entrada específicos do flow
 * @returns Estimativa conservadora de créditos
 */
export function estimateCredits(
  operationType: OperationType,
  input: EstimateInput,
): number {
  switch (operationType) {
    // Assistant / inline assistant: estima baseado no tamanho da mensagem + histórico
    case 'assistant':
    case 'inline_assistant': {
      const message = asString(input.message) ?? asString(input.prompt) ?? '';
      const history = asString(input.history) ?? '';
      // Entrada: mensagem atual + histórico truncado (máx 50k chars)
      const inputChars = (message + history).slice(0, 50_000).length;
      // Saída: estimativa conservadora de ~1500 chars de resposta
      const estimatedOutputChars = 1500;
      return calculateCreditCost({
        operationType,
        inputChars,
        outputChars: estimatedOutputChars,
      });
    }

    // Audio (TTS): estima baseado no tamanho total do script
    case 'audio': {
      const script = asString(input.script) ?? asString(input.text) ?? '';
      // Cenário conservador: script inteiro será sintetizado
      const inputChars = script.length;
      return calculateCreditCost({ operationType, inputChars });
    }

    // Imagem: custo fixo, mas verifica se há referência
    case 'image': {
      const referenceImage = input.referenceImage ?? input.reference ?? input.reference_image;
      const hasReference = referenceImage !== undefined && referenceImage !== null && referenceImage !== '';
      return calculateCreditCost({ operationType, hasReferenceImage: hasReference });
    }

    // Scene prompts: 2 base + estimativa de itens
    case 'scene_prompts': {
      // Se o input já tem um array de cenas, usa o tamanho como estimativa
      const scenes = asArray(input.scenes);
      // Se não tem cenas explícitas, estima baseado no script
      const estimatedItems = scenes.length > 0
        ? scenes.length
        : estimateSceneCountFromScript(asString(input.script) ?? '');
      return calculateCreditCost({ operationType, itemCount: estimatedItems });
    }

    // Chunking: custo base + estimativa de chunks
    case 'chunking': {
      const script = asString(input.script) ?? asString(input.text) ?? '';
      // Estima ~1 chunk por 500 caracteres (arredondado para cima)
      const estimatedChunks = Math.ceil(script.length / 500);
      return calculateCreditCost({ operationType, itemCount: estimatedChunks });
    }

    // Feedback: não consome créditos
    case 'feedback':
      return 0;

    default:
      // Tipo desconhecido — estimativa genérica conservadora
      return 5;
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Converte valor desconhecido para array de forma segura */
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Estima quantidade de cenas a partir do tamanho do script */
function estimateSceneCountFromScript(script: string): number {
  if (!script || script.length === 0) return 5; // mínimo conservador

  // Heurística: conta parágrafos ou blocos separados por linha em branco
  const paragraphs = script
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0);

  // Mínimo 1 cena, máximo 50 (para evitar estimativas absurdas)
  const count = Math.max(1, Math.min(paragraphs.length, 50));

  return count;
}
