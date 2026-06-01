/**
 * BatchProcessor — acumula logs em memória e envia em batch para o Firestore.
 *
 * Características:
 * - Fila com máximo de 100 itens
 * - Deduplicação por message+category+context+level dentro de 5 minutos
 * - Envio por batch (tamanho ou timeout)
 * - Retry com exponential backoff (2s, 4s, 8s), máximo 3 tentativas
 * - Flush síncrono no beforeunload (limpa fila)
 * - Remove campos undefined antes de enviar (Firestore não aceita undefined)
 */

import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { ErrorLogEntry } from './types';
import { getLoggerConfig } from './config';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Capacidade máxima da fila de logs pendentes. */
const MAX_QUEUE_SIZE = 100;

/** Janela de deduplicação — mesmo erro dentro de 5 minutos incrementa contador. */
const DEDUP_WINDOW_MS = 5 * 60 * 1000;

/** Backoff base para retry (2s, 4s, 8s). */
const BASE_RETRY_DELAY_MS = 2000;

/** Número máximo de tentativas de envio. */
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

/** Item na fila com metadados de retry. */
interface QueueItem {
  entry: ErrorLogEntry;
  retries: number;
  addedAt: number;
}

/** Estatísticas do processador. */
interface BatchStats {
  pendingCount: number;
  totalSent: number;
  totalFailed: number;
  lastFlushTime: number | null;
  isProcessing: boolean;
}

// ---------------------------------------------------------------------------
// BatchProcessor
// ---------------------------------------------------------------------------

export class BatchProcessor {
  private queue: QueueItem[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isProcessing = false;
  private totalSent = 0;
  private totalFailed = 0;
  private lastFlushTime: number | null = null;

  /**
   * Adiciona um log à fila.
   *
   * Se o item for duplicado (mesma message+category+context+level
   * dentro da janela de 5 minutos), incrementa `occurrenceCount` em vez
   * de criar uma nova entrada.
   */
  addToQueue(entry: ErrorLogEntry): void {
    // Deduplicação
    const now = Date.now();
    const existing = this.queue.find(
      (item) =>
        item.entry.message === entry.message &&
        item.entry.category === entry.category &&
        item.entry.context === entry.context &&
        item.entry.level === entry.level &&
        now - item.addedAt < DEDUP_WINDOW_MS,
    );

    if (existing) {
      existing.entry.occurrenceCount += 1;
      return;
    }

    // Limite da fila — remove o mais antigo se cheia
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.shift();
    }

    this.queue.push({ entry, retries: 0, addedAt: now });

    // Dispara processamento se atingiu batch size
    const config = getLoggerConfig();
    if (this.queue.length >= config.batchSize) {
      void this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  /**
   * Envia todos os logs pendentes para o Firestore.
   *
   * Usa exponential backoff em caso de falha.
   * Remove campos undefined antes de enviar (Firestore não aceita).
   */
  async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.clearTimer();
    this.isProcessing = true;

    const batch = this.queue.splice(0);

    const batchPromises = batch.map((item) =>
      this.sendWithRetry(item),
    );

    await Promise.allSettled(batchPromises);

    this.isProcessing = false;
    this.lastFlushTime = Date.now();
  }

  /** Retorna estatísticas do processador. */
  getStats(): BatchStats {
    return {
      pendingCount: this.queue.length,
      totalSent: this.totalSent,
      totalFailed: this.totalFailed,
      lastFlushTime: this.lastFlushTime,
      isProcessing: this.isProcessing,
    };
  }

  // -----------------------------------------------------------------------
  // Métodos privados
  // -----------------------------------------------------------------------

  /** Agenda flush por timeout (debounce). */
  private scheduleFlush(): void {
    if (this.timer) return;
    const config = getLoggerConfig();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, config.batchTimeout);
  }

  /** Cancela timer de flush pendente. */
  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Envia um item com retry e exponential backoff.
   * Backoff: 2s, 4s, 8s (base * 2^retry).
   */
  private async sendWithRetry(item: QueueItem): Promise<void> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const cleaned = this.removeUndefined(item.entry);
        await addDoc(collection(db, 'errorLogs'), cleaned);
        this.totalSent += 1;
        return;
      } catch (error: unknown) {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await this.sleep(delay);
        } else {
          this.totalFailed += 1;
          // Falha silenciosa — logger não pode gerar mais erros
          if (typeof console !== 'undefined') {
            console.error('[logger] Falha ao enviar log após', MAX_RETRIES, 'tentativas:', error);
          }
        }
      }
    }
  }

  /** Remove recursivamente campos undefined de um objeto (Firestore não aceita). */
  private removeUndefined(
    obj: ErrorLogEntry | Record<string, unknown>,
  ): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      if (value === null) {
        cleaned[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        const nested = this.removeUndefined(
          value as Record<string, unknown>,
        );
        if (Object.keys(nested).length > 0) {
          cleaned[key] = nested;
        }
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  /** Promise-based sleep. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
