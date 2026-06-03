/**
 * Augmentations de tipos para APIs PWA não cobertas pela lib DOM padrão.
 *
 * - `BeforeInstallPromptEvent`: evento nativo do Chromium que permite
 *   capturar/deferir o prompt de instalação (Chrome, Edge, Samsung Internet).
 *   Não existe no Safari nem no Firefox.
 *
 * - `Navigator.standalone`: propriedade não-padrão do Safari (iOS < 16.4)
 *   para detectar modo standalone. Substituída em iOS 16.4+ pelo
 *   `display-mode: standalone` media query, mas ainda presente em devices
 *   antigos. Mantida aqui para evitar `as any` no código de produção.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    readonly standalone?: boolean;
  }
}
