import { describe, it, expect, beforeEach } from 'vitest';
import { useVideoRenderBridge } from '../../src/features/video-render/store/videoRenderBridge';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';

describe('videoRenderBridge (Zustand store)', () => {
  beforeEach(() => {
    // Reset do store antes de cada teste
    useVideoRenderBridge.getState().resetBridge();
  });

  it('estado inicial padrão', () => {
    const state = useVideoRenderBridge.getState();
    expect(state.isExportingVideo).toBe(false);
    expect(state.videoExportProgress).toBe(0);
    expect(state.isTranscribing).toBe(false);
    expect(state.transcriptionProgress).toBe(0);
    expect(state.transcriptionStatusText).toBe('');
    expect(state.currentFrame).toBe(0);
    expect(state.isPlaying).toBe(false);
    // L7 (RF-06) — defaults alinhados com animationStore
    expect(state.renderMode).toBe('mask');
    expect(state.vetorialPreset).toBe('artistic1');
  });

  it('syncRenderMode atualiza modo + preset em uma única chamada', () => {
    useVideoRenderBridge.getState().syncRenderMode('vetorial', 'artistic3');
    const state = useVideoRenderBridge.getState();
    expect(state.renderMode).toBe('vetorial');
    expect(state.vetorialPreset).toBe('artistic3');

    // Volta para mask com outro preset
    useVideoRenderBridge.getState().syncRenderMode('mask', 'default');
    const state2 = useVideoRenderBridge.getState();
    expect(state2.renderMode).toBe('mask');
    expect(state2.vetorialPreset).toBe('default');
  });

  it('resetBridge restaura os defaults de L7 (mask + artistic1)', () => {
    useVideoRenderBridge.getState().syncRenderMode('vetorial', 'detailed');
    useVideoRenderBridge.getState().resetBridge();
    const state = useVideoRenderBridge.getState();
    expect(state.renderMode).toBe('mask');
    expect(state.vetorialPreset).toBe('artistic1');
  });

  it('syncExportState atualiza estado de exportação', () => {
    useVideoRenderBridge.getState().syncExportState(true, 45);
    const state = useVideoRenderBridge.getState();
    expect(state.isExportingVideo).toBe(true);
    expect(state.videoExportProgress).toBe(45);
  });

  it('syncExportState com rendering=false marca exportação como concluída', () => {
    useVideoRenderBridge.getState().syncExportState(true, 50);
    useVideoRenderBridge.getState().syncExportState(false, 100);
    const state = useVideoRenderBridge.getState();
    expect(state.isExportingVideo).toBe(false);
    expect(state.videoExportProgress).toBe(100);
  });

  it('syncTranscriptionState atualiza estado de transcrição', () => {
    useVideoRenderBridge.getState().syncTranscriptionState(true, 30, 'Transcrevendo...');
    const state = useVideoRenderBridge.getState();
    expect(state.isTranscribing).toBe(true);
    expect(state.transcriptionProgress).toBe(30);
    expect(state.transcriptionStatusText).toBe('Transcrevendo...');
  });

  it('syncTranscriptionState com transcribing=false marca como concluída', () => {
    useVideoRenderBridge.getState().syncTranscriptionState(true, 50, 'Progresso');
    useVideoRenderBridge.getState().syncTranscriptionState(false, 100, 'Concluído');
    const state = useVideoRenderBridge.getState();
    expect(state.isTranscribing).toBe(false);
    expect(state.transcriptionProgress).toBe(100);
    expect(state.transcriptionStatusText).toBe('Concluído');
  });

  it('resetBridge volta ao estado inicial', () => {
    useVideoRenderBridge.getState().syncExportState(true, 75);
    useVideoRenderBridge.getState().syncTranscriptionState(true, 50, 'Status');
    useVideoRenderBridge.getState().syncCurrentFrame(120);
    useVideoRenderBridge.getState().syncIsPlaying(true);
    useVideoRenderBridge.getState().syncRenderMode('vetorial', 'curvy');
    useVideoRenderBridge.getState().resetBridge();
    const state = useVideoRenderBridge.getState();
    expect(state.isExportingVideo).toBe(false);
    expect(state.videoExportProgress).toBe(0);
    expect(state.isTranscribing).toBe(false);
    expect(state.transcriptionProgress).toBe(0);
    expect(state.transcriptionStatusText).toBe('');
    expect(state.currentFrame).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.renderMode).toBe('mask');
    expect(state.vetorialPreset).toBe('artistic1');
  });

  it('exportação e transcrição são independentes', () => {
    useVideoRenderBridge.getState().syncExportState(true, 20);
    useVideoRenderBridge.getState().syncTranscriptionState(true, 80, 'Transcrevendo');
    const state = useVideoRenderBridge.getState();
    expect(state.isExportingVideo).toBe(true);
    expect(state.videoExportProgress).toBe(20);
    expect(state.isTranscribing).toBe(true);
    expect(state.transcriptionProgress).toBe(80);

    // Reset de um não afeta o outro
    useVideoRenderBridge.getState().syncExportState(false, 100);
    expect(state.isTranscribing).toBe(true);
  });

  it('syncCurrentFrame atualiza o frame do player', () => {
    useVideoRenderBridge.getState().syncCurrentFrame(45);
    const state = useVideoRenderBridge.getState();
    expect(state.currentFrame).toBe(45);

    useVideoRenderBridge.getState().syncCurrentFrame(150);
    expect(useVideoRenderBridge.getState().currentFrame).toBe(150);
  });

  it('syncIsPlaying atualiza o estado de reprodução', () => {
    useVideoRenderBridge.getState().syncIsPlaying(true);
    expect(useVideoRenderBridge.getState().isPlaying).toBe(true);

    useVideoRenderBridge.getState().syncIsPlaying(false);
    expect(useVideoRenderBridge.getState().isPlaying).toBe(false);
  });

  it('currentFrame e isPlaying são independentes dos demais campos', () => {
    useVideoRenderBridge.getState().syncExportState(true, 50);
    useVideoRenderBridge.getState().syncCurrentFrame(200);
    useVideoRenderBridge.getState().syncIsPlaying(true);

    const state = useVideoRenderBridge.getState();
    expect(state.isExportingVideo).toBe(true);
    expect(state.videoExportProgress).toBe(50);
    expect(state.currentFrame).toBe(200);
    expect(state.isPlaying).toBe(true);

    // Alterar exportação não afeta frame/isPlaying
    useVideoRenderBridge.getState().syncExportState(false, 100);
    expect(useVideoRenderBridge.getState().currentFrame).toBe(200);
    expect(useVideoRenderBridge.getState().isPlaying).toBe(true);
  });

  // L7 (RF-06) — CT-T05: sync inicial ao montar a VideoPage popula a bridge
  // com o estado vigente da `animationStore` global. Valida o pattern usado
  // pelo useEffect de mount da VideoPage.
  it('CT-T05: sync inicial popula a bridge com o estado da animationStore', () => {
    // Arrange — reseta a bridge para os defaults
    useVideoRenderBridge.getState().resetBridge();
    expect(useVideoRenderBridge.getState().renderMode).toBe('mask');
    expect(useVideoRenderBridge.getState().vetorialPreset).toBe('artistic1');

    // Act — simula o pattern do useEffect: lê da animationStore global e
    // empurra para a bridge via syncRenderMode.
    const animationState = useAnimationStore.getState();
    useVideoRenderBridge.getState().syncRenderMode(
      animationState.renderMode,
      animationState.vetorialPreset,
    );

    // Assert — a bridge reflete o estado da animationStore
    const bridgeState = useVideoRenderBridge.getState();
    expect(bridgeState.renderMode).toBe(animationState.renderMode);
    expect(bridgeState.vetorialPreset).toBe(animationState.vetorialPreset);
  });
});
