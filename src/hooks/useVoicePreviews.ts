import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '../lib/logger';

const log = createLogger('useVoicePreviews');

/**
 * Hook para preview de vozes.
 *
 * Os áudios de preview ficam em `public/voice-previews/{voiceId}.wav` e
 * são distribuídos junto com o build (Vite copia `public/` para `dist/`).
 * O `playPreview` apenas toca o arquivo estático — sem Firebase Storage.
 *
 * ## Ciclo de vida do áudio
 *
 * O hook garante que cada `playPreview` só gera log de erro quando a falha
 * realmente corresponde à tentativa atual. Eventos de áudios antigos
 * (interrompidos por `stop`, troca de voz ou navegação) são descartados
 * via `token` — evita o falso positivo `Preview para X não encontrado`
 * que o Chrome dispara ao limpar `audio.src` ou abortar um `Audio` em
 * reprodução (ver `MediaError.code = MEDIA_ERR_SRC_NOT_SUPPORTED`).
 */
const PREVIEW_PATH_PREFIX = '/voice-previews/';
const PREVIEW_EXTENSION = '.wav';

export function useVoicePreviews() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Token incremental garante que callbacks de áudios antigos sejam ignorados.
  const sessionTokenRef = useRef(0);

  // Cleanup ao desmontar: replica a lógica de `stop()` para garantir que
  // listeners (`onerror`/`onended`) e token de sessão sejam zerados antes
  // do garbage collector coletar o `<audio>`. Sem isso, um `onerror`
  // tardio (code 2 de rede ou abort pós-navegação) pode disparar
  // `reportLoadError` num componente desmontado e gerar log falso +
  // warning React de setState-after-unmount.
  useEffect(() => {
    return () => {
      sessionTokenRef.current += 1;
      const audio = audioRef.current;
      if (audio === null) return;
      audio.pause();
      audio.onerror = null;
      audio.onended = null;
      try {
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // ignore — alguns navegadores lançam em `load()` pós-pause
      }
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback((): void => {
    if (audioRef.current) {
      // Pausar e limpar listeners antes de zerar `src` — evita o `onerror`
      // falso que o Chrome dispara ao atribuir `src = ''` num `<audio>` ativo.
      const current = audioRef.current;
      current.pause();
      current.onerror = null;
      current.onended = null;
      current.removeAttribute('src');
      // Forçar `load()` zera o estado interno sem disparar `error` quando
      // não há fonte válida (a spec define `error` apenas para src inválido
      // prévio). Após o load, descartamos a referência.
      try {
        current.load();
      } catch {
        // ignore — alguns navegadores lançam em `load()` pós-pause; não importa
      }
    }
    audioRef.current = null;
    setPlayingId(null);
    // Limpa o `errorId` para que o indicador de erro não persista indefinidamente
    // após o usuário descartar o preview. O `Inspector` também tem auto-clear
    // de 3s, mas o `Configuracoes` não — sem este reset, o erro fica eterno
    // até o próximo `playPreview`. (S7 da auditoria v0.135.1.)
    setErrorId(null);
  }, []);

  const playPreview = useCallback((voiceId: string): void => {
    // Limpa erro anterior ao tentar nova voz
    setErrorId(null);

    if (playingId === voiceId && audioRef.current) {
      stop();
      return;
    }

    stop();
    setPlayingId(voiceId);

    // Cada `playPreview` recebe um token novo. Callbacks comparam antes de
    // aplicar efeito colateral — eventos atrasados de áudio anterior são
    // descartados.
    const currentToken = ++sessionTokenRef.current;

    const audio = new Audio(`${PREVIEW_PATH_PREFIX}${voiceId}${PREVIEW_EXTENSION}`);
    audio.preload = 'auto';
    audioRef.current = audio;

    const isStale = (): boolean => sessionTokenRef.current !== currentToken;

    const reportLoadError = (mediaError: MediaError | null): void => {
      if (isStale()) return;
      const code = mediaError?.code ?? null;
      // Códigos que NÃO devem gerar log de erro (cleanup, abort, src inválido):
      // - `null` = `mediaError` ausente (caso degenerado observado em alguns browsers)
      // - `0` = `MediaError` sem code definido (típico de `src=''` + `load()`)
      // - `1` = `MEDIA_ERR_ABORTED` (cancelamento por troca/pause/navegação)
      // - `4` = `MEDIA_ERR_SRC_NOT_SUPPORTED` — condicional: se o `src` já
      //   foi limpo pelo cleanup (`removeAttribute('src')` em `stop()` ou
      //   no cleanup de unmount), é o caso `src=''` + `load()` que o Chrome
      //   dispara com code 4 e deve ser silenciado. Se o `src` ainda aponta
      //   para o preview path, é falha real (asset 404/corrompido) e deve
      //   virar `log.error` para preservar telemetria de assets quebrados.
      //
      // Trade-off (decisão consciente v0.135.1 rodada 6): o caminho "src
      // vazio + listener ativo" é tecnicamente inalcançável no design atual
      // (listeners são zerados antes de `removeAttribute('src')`), mas a
      // guarda é mantida como defesa em profundidade + contrato explícito.
      // A restauração do ramo condicional (revertendo a simplificação do
      // round 5) preserva a telemetria de 404 real sem reabrir o falso
      // positivo original.
      if (code === null || code === 0 || code === 1) {
        log.debug('Preview de voz abortado ou áudio substituído', { voiceId, code });
        return;
      }
      if (code === 4 && audio.src === '') {
        // src vazio (limpo pelo cleanup) — caso `src=''` + `load()` do Chrome
        log.debug('Preview de voz abortado ou áudio substituído', { voiceId, code });
        return;
      }
      // Codes 2 (`MEDIA_ERR_NETWORK`), 3 (`MEDIA_ERR_DECODE`) e 4 com src
      // válido: falha real de carregamento.
      log.error(
        `Não foi possível carregar o preview de voz "${voiceId}" (code=${code}). Verifique o asset em public/voice-previews/.`,
        { voiceId, code, src: audio.src, networkState: audio.networkState },
      );
      setPlayingId(null);
      setErrorId(voiceId);
    };

    audio.onerror = () => {
      reportLoadError(audio.error);
    };
    audio.onended = () => {
      if (isStale()) return;
      setPlayingId(null);
    };
    audio.play().catch((playErr: unknown) => {
      if (isStale()) return;
      const isAbort = playErr instanceof DOMException && playErr.name === 'AbortError';
      if (!isAbort) {
        log.warn('Preview bloqueado pela política de autoplay do navegador', { error: playErr });
      }
      setPlayingId(null);
    });
  }, [playingId, stop]);

  const clearError = useCallback((): void => {
    setErrorId(null);
  }, []);

  return {
    playingId,
    errorId,
    playPreview,
    stop,
    clearError,
  };
}
