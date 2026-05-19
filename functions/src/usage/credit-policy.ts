// ---------------------------------------------------------------------------
// Política de cobrança de créditos — tabela centralizada
// ---------------------------------------------------------------------------
//
// Define os custos por tipo de operação e a função calculateCreditCost.
// Todas as faixas são arredondadas para CIMA (Math.ceil).
// Nenhuma operação bem-sucedida pode ter custo zero (mínimo 1).
// ---------------------------------------------------------------------------

/** Créditos mensais concedidos a todo usuário do beta */
export const MONTHLY_BASE_CREDITS = 1000;

/** Bônus único concedido ao enviar feedback */
export const FEEDBACK_BONUS_CREDITS = 250;

/** Tipos de operação que consomem créditos */
export type OperationType =
  | 'assistant'
  | 'inline_assistant'
  | 'audio'
  | 'image'
  | 'scene_prompts'
  | 'chunking'
  | 'feedback';

/** Parâmetros para cálculo de custo de créditos */
export interface CreditCostParams {
  /** Tipo da operação */
  operationType: OperationType;
  /** Caracteres de entrada (para chat e TTS) */
  inputChars?: number;
  /** Caracteres de saída (apenas para chat) */
  outputChars?: number;
  /** Quantidade de itens retornados (para scene prompts e chunking) */
  itemCount?: number;
  /** Se a imagem tem referência (apenas para image) */
  hasReferenceImage?: boolean;
}

/**
 * Calcula o custo em créditos de uma operação.
 * Arredonda SEMPRE para cima nas faixas (Math.ceil).
 * NÃO permite operação com custo zero — retorna no mínimo 1.
 * A exceção é feedback, que não consome créditos (custo 0).
 */
export function calculateCreditCost(params: CreditCostParams): number {
  const { operationType, inputChars = 0, outputChars = 0, itemCount = 0, hasReferenceImage = false } = params;

  let cost: number;

  switch (operationType) {
    // Chat (assistant e inline assistant): 1 crédito por faixa de 500 chars de entrada
    // + 1 crédito por faixa de 300 chars de saída, mínimo 1
    case 'assistant':
    case 'inline_assistant': {
      const inputCredits = Math.ceil(inputChars / 500);
      const outputCredits = Math.ceil(outputChars / 300);
      cost = inputCredits + outputCredits;
      // Garante mínimo de 1 crédito para operações bem-sucedidas
      if (cost === 0) cost = 1;
      break;
    }

    // TTS (audio): 5 créditos base + 1 por faixa de 120 caracteres sintetizados
    case 'audio': {
      const charCredits = Math.ceil(inputChars / 120);
      cost = 5 + charCredits;
      break;
    }

    // Imagem: 40 créditos + 10 se houver referência
    case 'image': {
      cost = 40 + (hasReferenceImage ? 10 : 0);
      break;
    }

    // Scene prompts e chunking: 2 créditos base + 1 por item retornado
    case 'scene_prompts':
    case 'chunking': {
      cost = 2 + itemCount;
      break;
    }

    // Feedback: não consome créditos (CONCEDE créditos)
    case 'feedback': {
      cost = 0;
      break;
    }

    default: {
      // Tipo desconhecido — tratado como operação genérica com custo mínimo 1
      cost = 1;
    }
  }

  return cost;
}
