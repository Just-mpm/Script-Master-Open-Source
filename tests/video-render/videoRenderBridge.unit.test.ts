import { describe, it, expect, beforeEach } from 'vitest';
import { useVideoRenderBridge } from '../../src/features/video-render/store/videoRenderBridge';

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
    useVideoRenderBridge.getState().resetBridge();
    const state = useVideoRenderBridge.getState();
    expect(state.isExportingVideo).toBe(false);
    expect(state.videoExportProgress).toBe(0);
    expect(state.isTranscribing).toBe(false);
    expect(state.transcriptionProgress).toBe(0);
    expect(state.transcriptionStatusText).toBe('');
    expect(state.currentFrame).toBe(0);
    expect(state.isPlaying).toBe(false);
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
});
