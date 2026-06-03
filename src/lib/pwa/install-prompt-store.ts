/**
 * Store de módulo (singleton) para o prompt customizado de instalação PWA.
 *
 * Centraliza:
 * - O `BeforeInstallPromptEvent` capturado (sobrevive a mudanças de rota).
 * - Persistência de preferências do usuário (instalado, cooldown, dismiss forever)
 *   em `localStorage` com prefixo `s2a_pwa_*`.
 * - Pub/sub simples (`Set<Listener>`) para que o componente reaja a mudanças
 *   sem precisar de Zustand/React Context.
 * - Agendamento do delay de exibição (`SHOW_DELAY_MS`) via `setTimeout`
 *   único, com pub/sub dedicado (`subscribeDelayResolved`).
 *
 * Regras de negócio (vide `docs/plan/pwa-install-prompt-plano-final.md`):
 * - 3 recusas → nunca mais mostra (`MAX_DISMISSALS`).
 * - Após qualquer recusa, cooldown de 7 dias (`COOLDOWN_MS`).
 * - Delay de 3s entre a captura do evento e a elegibilidade para exibir
 *   (`SHOW_DELAY_MS`) — evita intrusão logo no carregamento.
 *
 * Todos os acessos a `localStorage` estão em try/catch: em modo anônimo ou
 * ambientes sem storage, o store degrada graciosamente para "elegível" (nunca
 * bloqueia o prompt por falha de persistência).
 */

import { createLogger } from '../logger';
import type { BeforeInstallPromptEvent } from '../../types/pwa';

const log = createLogger('PWA');

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  INSTALLED: 's2a_pwa_installed',
  DISMISSED_AT: 's2a_pwa_install_dismissed_at',
  DISMISSED_COUNT: 's2a_pwa_install_dismissed_count',
  DISMISSED_FOREVER: 's2a_pwa_install_dismissed_forever',
} as const;

/** 7 dias em ms — cooldown entre recusas. */
export const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Máximo de recusas antes de marcar "nunca mais mostrar". */
export const MAX_DISMISSALS = 3;

/** 3 segundos — delay entre capturar o evento e exibir o banner. */
export const SHOW_DELAY_MS = 3_000;

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type InstallPromptState = {
  /** `true` se o usuário ainda é elegível para ver o prompt. */
  canShow: boolean;
  /** `true` se o app já está instalado (standalone ou flag manual). */
  isInstalled: boolean;
};

type Listener = (state: InstallPromptState) => void;

type DelayListener = () => void;

// ---------------------------------------------------------------------------
// Estado do módulo (singleton)
// ---------------------------------------------------------------------------

/** Evento capturado pelo `beforeinstallprompt` (consumido após `prompt()`). */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Timestamp de quando o `deferredPrompt` foi capturado.
 * Usado por `shouldDelayShow()` para aplicar `SHOW_DELAY_MS` entre a captura
 * e a primeira renderização elegível.
 */
let captureTimestamp: number | null = null;

/**
 * Handle do `setTimeout` que dispara `notifyDelayResolved` quando o
 * delay de `SHOW_DELAY_MS` expira. Substitui o polling de 500ms que
 * o hook fazia (overhead desnecessário para um delay fixo de 3s).
 */
let delayTimeoutId: ReturnType<typeof setTimeout> | null = null;

/** Listeners do pub/sub principal (estado de instalação). */
const listeners = new Set<Listener>();

/** Listeners do pub/sub dedicado ao delay (`SHOW_DELAY_MS` expirado). */
const delayListeners = new Set<DelayListener>();

const logMissingWindow = (op: string): void => {
  log.warn(`Operação '${op}' ignorada: window indisponível (SSR).`);
};

// ---------------------------------------------------------------------------
// Pub/sub interno
// ---------------------------------------------------------------------------

function notify(): void {
  if (listeners.size === 0) return;
  const snapshot = getInstallState();
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch (err: unknown) {
      // Nunca deixa um listener quebrado derrubar os outros
      log.error('Listener de install-prompt-store lançou exceção', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Notifica os listeners do pub/sub de delay (`SHOW_DELAY_MS` expirou).
 * Disparado uma única vez por `setDeferredPrompt` — listeners devem
 * marcar seu estado local de "delay resolvido" e parar de ouvir.
 */
function notifyDelayResolved(): void {
  for (const listener of delayListeners) {
    try {
      listener();
    } catch (err: unknown) {
      log.error('Listener de delay de install-prompt-store lançou exceção', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Cancela qualquer `setTimeout` de delay em andamento. Chamado sempre
 * que o estado do prompt muda (limpeza, dismiss, instalação) para
 * evitar disparo tardio de `notifyDelayResolved` após o banner ter
 * sido descartado.
 */
function clearDelayTimeout(): void {
  if (delayTimeoutId === null) return;
  clearTimeout(delayTimeoutId);
  delayTimeoutId = null;
}

// ---------------------------------------------------------------------------
// Acesso ao deferredPrompt
// ---------------------------------------------------------------------------

/** Retorna o evento `beforeinstallprompt` capturado, ou `null` se ainda não houve. */
export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

/**
 * Armazena o evento capturado e marca o timestamp. Deve ser chamado pelo hook
 * que escuta `window.beforeinstallprompt` após `event.preventDefault()`.
 *
 * Também agenda o `setTimeout` único que dispara `notifyDelayResolved` após
 * `SHOW_DELAY_MS`. Isso substitui o polling de 500ms que o hook fazia
 * (overhead desnecessário para um delay fixo).
 */
export function setDeferredPrompt(event: BeforeInstallPromptEvent): void {
  deferredPrompt = event;
  captureTimestamp = Date.now();
  log.info('beforeinstallprompt capturado e armazenado.');
  notify();

  // Cancela timeout anterior (se houver) e agenda novo. Em SSR não há
  // `setTimeout`, mas o `canShow` será `false` de qualquer forma, então
  // o listener de delay pode simplesmente não ser disparado.
  clearDelayTimeout();
  if (typeof window !== 'undefined') {
    delayTimeoutId = setTimeout(() => {
      delayTimeoutId = null;
      notifyDelayResolved();
    }, SHOW_DELAY_MS);
  }
}

/** Limpa o evento armazenado. Chamado após `prompt()` ou em `recordInstalled`. */
export function clearDeferredPrompt(): void {
  if (deferredPrompt === null && captureTimestamp === null) return;
  deferredPrompt = null;
  captureTimestamp = null;
  clearDelayTimeout();
  notify();
}

// ---------------------------------------------------------------------------
// Persistência: dismiss
// ---------------------------------------------------------------------------

/**
 * Grava recusa do usuário: timestamp + incremento do contador. Quando o
 * contador atinge `MAX_DISMISSALS`, marca `DISMISSED_FOREVER` para suprimir
 * o prompt permanentemente.
 */
export function recordDismiss(): void {
  if (typeof window === 'undefined') {
    logMissingWindow('recordDismiss');
    return;
  }

  try {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEYS.DISMISSED_AT, String(now));

    const current = Number(localStorage.getItem(STORAGE_KEYS.DISMISSED_COUNT) ?? '0');
    const next = current + 1;
    localStorage.setItem(STORAGE_KEYS.DISMISSED_COUNT, String(next));

    if (next >= MAX_DISMISSALS) {
      localStorage.setItem(STORAGE_KEYS.DISMISSED_FOREVER, 'true');
      log.info(`Usuário atingiu ${MAX_DISMISSALS} recusas — prompt suprimido permanentemente.`);
    }
  } catch (err: unknown) {
    log.warn('Falha ao gravar recusa do install prompt', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Independente do resultado da persistência, libera o evento (não dá pra
  // tentar de novo) e notifica subscribers.
  clearDeferredPrompt();
}

// ---------------------------------------------------------------------------
// Persistência: instalado
// ---------------------------------------------------------------------------

/**
 * Grava flag de app instalado e descarta o `deferredPrompt` (não é mais
 * útil). Chamado em resposta ao evento nativo `appinstalled`.
 */
export function recordInstalled(): void {
  if (typeof window === 'undefined') {
    logMissingWindow('recordInstalled');
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
    // Reset defensivo das flags de recusa (não fazem mais sentido)
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_AT);
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_COUNT);
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_FOREVER);
  } catch (err: unknown) {
    log.warn('Falha ao gravar flag de instalado', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  log.info('PWA instalado — prompt suprimido.');
  clearDeferredPrompt();
}

// ---------------------------------------------------------------------------
// Detecção de standalone
// ---------------------------------------------------------------------------

/**
 * Detecta se o app está rodando em modo standalone (instalado).
 * - `display-mode: standalone` — Chrome/Edge/Firefox/Samsung + iOS 16.4+
 * - `navigator.standalone === true` — Safari iOS < 16.4 (fallback)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    // matchMedia pode falhar em ambientes restritos; segue para o fallback.
  }
  if (typeof navigator !== 'undefined' && navigator.standalone === true) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Cálculo de elegibilidade
// ---------------------------------------------------------------------------

/**
 * Computa o estado atual: combina sinal de standalone, persistência local e
 * presença do `deferredPrompt` em uma resposta única para o consumidor.
 *
 * Regra de precedência (primeira que casar):
 * 1. Standalone → instalado, não mostrar
 * 2. Flag `INSTALLED` → instalado, não mostrar
 * 3. Flag `DISMISSED_FOREVER` → não mostrar
 * 4. Cooldown de 7 dias não expirado → não mostrar
 * 5. Contador >= MAX_DISMISSALS → não mostrar
 * 6. Senão, mostrar somente se houver `deferredPrompt` capturado
 */
export function getInstallState(): InstallPromptState {
  if (isStandalone()) return { canShow: false, isInstalled: true };

  if (typeof window === 'undefined') {
    return { canShow: false, isInstalled: false };
  }

  let hasDeferred = deferredPrompt !== null;

  try {
    if (localStorage.getItem(STORAGE_KEYS.INSTALLED) === 'true') {
      return { canShow: false, isInstalled: true };
    }
    if (localStorage.getItem(STORAGE_KEYS.DISMISSED_FOREVER) === 'true') {
      return { canShow: false, isInstalled: false };
    }

    const dismissedAt = localStorage.getItem(STORAGE_KEYS.DISMISSED_AT);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < COOLDOWN_MS) {
        return { canShow: false, isInstalled: false };
      }
    }

    const count = Number(localStorage.getItem(STORAGE_KEYS.DISMISSED_COUNT) ?? '0');
    if (count >= MAX_DISMISSALS) {
      return { canShow: false, isInstalled: false };
    }
  } catch (err: unknown) {
    // localStorage inacessível (modo anônimo, sandbox) — trata como elegível.
    log.warn('Falha ao ler preferências de install prompt do localStorage', {
      error: err instanceof Error ? err.message : String(err),
    });
    hasDeferred = deferredPrompt !== null;
  }

  return { canShow: hasDeferred, isInstalled: false };
}

// ---------------------------------------------------------------------------
// Delay de exibição
// ---------------------------------------------------------------------------

/**
 * Indica se o evento foi capturado há menos de `SHOW_DELAY_MS` (3s).
 * Retorna `true` (= ainda em delay) também quando não há evento capturado —
 * neste caso o delay não se aplica, mas o retorno `true` é seguro pois o
 * componente já vai estar com `canShow: false` por falta de `deferredPrompt`.
 *
 * O componente deve combinar: `canShow === true && !shouldDelayShow()`.
 */
export function shouldDelayShow(): boolean {
  if (captureTimestamp === null) return true;
  return Date.now() - captureTimestamp < SHOW_DELAY_MS;
}

// ---------------------------------------------------------------------------
// Pub/sub público
// ---------------------------------------------------------------------------

/**
 * Inscreve um listener para mudanças no estado de instalação.
 * Retorna função de unsubscribe. Listeners são chamados em `setDeferredPrompt`,
 * `clearDeferredPrompt`, `recordDismiss` e `recordInstalled` (sempre com o
 * `InstallPromptState` mais recente).
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Inscreve um listener para o evento de delay resolvido.
 *
 * Disparado uma única vez por `setDeferredPrompt` quando `SHOW_DELAY_MS`
 * expira. O hook `usePwaInstallPrompt` usa este canal para marcar
 * `delayResolved = true` e parar de bloquear a exibição do banner.
 *
 * Se o listener for inscrito **após** o delay já ter expirado (e nenhum
 * novo `setDeferredPrompt` ocorreu), ele **não** será chamado — o hook
 * é responsável por usar `shouldDelayShow()` no estado inicial para
 * detectar esse caso. A notificação só é entregue em eventos futuros.
 *
 * @returns função de unsubscribe.
 */
export function subscribeDelayResolved(listener: DelayListener): () => void {
  delayListeners.add(listener);
  return () => {
    delayListeners.delete(listener);
  };
}
