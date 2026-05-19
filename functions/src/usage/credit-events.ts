// ---------------------------------------------------------------------------
// Tipos de evento de crédito — log de auditoria imutável
// ---------------------------------------------------------------------------
//
// Define os tipos CreditEventStatus, CreditEvent e CreateCreditEventInput
// usados pelo credit-service.ts e credit-metering middleware.
// As funções CRUD foram removidas — o credit-service gerencia os eventos
// internamente via transações Firestore.
// ---------------------------------------------------------------------------

/** Status do evento de crédito */
export type CreditEventStatus = 'reserved' | 'confirmed' | 'reverted' | 'expired';

/** Evento de consumo/concessão de créditos */
export interface CreditEvent {
  /** UUID da requisição (idempotência) */
  requestId: string;
  /** Nome do flow: 'assistant', 'audio', 'image', etc. */
  flowName: string;
  /** Tipo da operação (mesmo de flowName) */
  operationType: string;
  /** Status atual do evento */
  status: CreditEventStatus;
  /** Créditos estimados na reserva */
  estimatedCredits: number;
  /** Créditos efetivamente consumidos (preenchido na confirmação) */
  finalCredits: number;
  /** Modelo Gemini utilizado */
  model: string;
  /** Caracteres de entrada (ou tokens) */
  inputSize: number;
  /** Caracteres de saída (ou tokens) */
  outputSize: number;
  /** Timestamp de criação (ms) */
  createdAt: number;
  /** Timestamp de finalização (ms) — preenchido na confirmação/reversão */
  finishedAt: number;
  /** Código de erro, se houve falha */
  errorCode?: string;
}

/** Dados para criação de um novo evento (sem createdAt, que é gerado automaticamente) */
export type CreateCreditEventInput = Omit<CreditEvent, 'createdAt'>;
