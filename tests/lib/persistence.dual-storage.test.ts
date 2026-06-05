import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock completo do firebase — DEVE estar no topo do arquivo
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn().mockResolvedValue({ docs: [] });
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn().mockResolvedValue({ exists: () => false, data: () => null });
const mockWithConverter = vi.fn().mockReturnValue({});
const mockDoc = vi.fn().mockReturnValue({ withConverter: mockWithConverter });
const mockCollection = vi.fn().mockReturnValue({ withConverter: mockWithConverter });
const mockQuery = vi.fn().mockReturnValue({});
const mockWhere = vi.fn().mockReturnValue({});
const mockCollectionGroup = vi.fn().mockReturnValue({ withConverter: mockWithConverter });
const mockStorageRef = vi.fn();
const mockUploadBytes = vi.fn().mockResolvedValue({});
const mockUploadBytesResumable = vi.fn();
const mockGetDownloadURL = vi.fn().mockResolvedValue('https://storage.example/video.mp4');
const mockDeleteObject = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  getDocs: mockGetDocs,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  deleteDoc: mockDeleteDoc,
  query: mockQuery,
  where: mockWhere,
  collectionGroup: mockCollectionGroup,
  orderBy: vi.fn(),
  // Função de limite de query — retorna placeholder encadeável
  limit: vi.fn().mockReturnValue({}),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

vi.mock('firebase/storage', () => ({
  ref: mockStorageRef,
  uploadBytes: mockUploadBytes,
  uploadBytesResumable: mockUploadBytesResumable,
  getDownloadURL: mockGetDownloadURL,
  deleteObject: mockDeleteObject,
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

import { DB_NAME } from '../../src/lib/db/shared';

// Gera ID único para evitar colisão (DB singleton não pode ser resetado)
const uid = () => `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// =========================================================================
// memories.ts
// =========================================================================
describe('db/memories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saveMemory salva no IndexedDB quando userId ausente', async () => {
    const { saveMemory, getMemories } = await import('../../src/lib/db/memories');
    const memory = await saveMemory('Minha memória de teste');

    expect(memory.content).toBe('Minha memória de teste');
    expect(memory.userId).toBeUndefined();
    expect(memory.id).toBeDefined();
    expect(typeof memory.createdAt).toBe('number');
  });

  it('getMemories retorna itens do IndexedDB quando userId ausente', async () => {
    const { saveMemory, getMemories } = await import('../../src/lib/db/memories');
    await saveMemory(`mem-a-${uid()}`);
    await saveMemory(`mem-b-${uid()}`);

    const memories = await getMemories();
    expect(memories.length).toBeGreaterThanOrEqual(2);
  });

  it('deleteMemory remove do IndexedDB quando userId ausente', async () => {
    const { saveMemory, getMemories, deleteMemory } = await import('../../src/lib/db/memories');
    const saved = await saveMemory('para deletar');

    await deleteMemory(saved.id);
    const memories = await getMemories();
    expect(memories.find((m) => m.id === saved.id)).toBeUndefined();
  });

  it('saveMemory chama setDoc do Firestore quando userId presente', async () => {
    const { saveMemory } = await import('../../src/lib/db/memories');
    await saveMemory('mem firestore', 'user-123');
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it('getMemories chama getDocs do Firestore quando userId presente', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    const { getMemories } = await import('../../src/lib/db/memories');
    await getMemories('user-123');
    expect(mockGetDocs).toHaveBeenCalled();
  });

  it('deleteMemory chama deleteDoc do Firestore quando userId presente', async () => {
    const { deleteMemory } = await import('../../src/lib/db/memories');
    await deleteMemory('mem-id', 'user-123');
    expect(mockDeleteDoc).toHaveBeenCalled();
  });
});

// =========================================================================
// user-settings.ts
// =========================================================================
describe('db/user-settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saveUserSettings salva no IndexedDB quando userId ausente', async () => {
    const { saveUserSettings } = await import('../../src/lib/db/user-settings');
    const setting = await saveUserSettings('Você é um assistente');

    expect(setting.customSystemPrompt).toBe('Você é um assistente');
    expect(setting.id).toBe('local_settings');
    expect(setting.userId).toBeUndefined();
  });

  it('getUserSettings retorna settings salvos do IndexedDB', async () => {
    const { saveUserSettings, getUserSettings } = await import('../../src/lib/db/user-settings');
    const uniquePrompt = `prompt-${uid()}`;
    await saveUserSettings(uniquePrompt);

    const result = await getUserSettings();
    expect(result).not.toBeNull();
    expect(result!.customSystemPrompt).toBe(uniquePrompt);
  });

  it('saveUserSettings chama setDoc do Firestore quando userId presente', async () => {
    const { saveUserSettings } = await import('../../src/lib/db/user-settings');
    await saveUserSettings('prompt firestore', 'user-123');
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it('getUserSettings chama getDoc do Firestore quando userId presente', async () => {
    const { getUserSettings } = await import('../../src/lib/db/user-settings');
    await getUserSettings('user-123');
    expect(mockGetDoc).toHaveBeenCalled();
  });
});

// =========================================================================
// chats.ts
// =========================================================================
describe('db/chats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saveChatSession salva no IndexedDB quando userId ausente', async () => {
    const { saveChatSession, getChatSessions } = await import('../../src/lib/db/chats');
    const id = uid();
    const session = {
      id,
      title: 'Teste',
      messages: [{ id: 'm1', role: 'user' as const, text: 'Olá' }],
      updatedAt: Date.now(),
    };

    await saveChatSession(session);
    const chats = await getChatSessions();
    expect(chats.some((c) => c.id === id)).toBe(true);
  });

  it('getChatSessions retorna array ordenado por updatedAt descendente', async () => {
    const { saveChatSession, getChatSessions } = await import('../../src/lib/db/chats');

    const idOld = uid();
    await saveChatSession({ id: idOld, title: 'Velho', messages: [], updatedAt: 100 });
    const idNew = uid();
    await saveChatSession({ id: idNew, title: 'Novo', messages: [], updatedAt: Date.now() });

    const chats = await getChatSessions();
    const oldIdx = chats.findIndex((c) => c.id === idOld);
    const newIdx = chats.findIndex((c) => c.id === idNew);
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it('deleteChatSession remove do IndexedDB quando userId ausente', async () => {
    const { saveChatSession, getChatSessions, deleteChatSession } = await import('../../src/lib/db/chats');
    const id = uid();

    await saveChatSession({ id, title: 'Del', messages: [], updatedAt: Date.now() });
    await deleteChatSession(id);
    const chats = await getChatSessions();
    expect(chats.find((c) => c.id === id)).toBeUndefined();
  });

  it('saveChatSession chama setDoc do Firestore quando userId presente', async () => {
    const { saveChatSession } = await import('../../src/lib/db/chats');
    await saveChatSession({
      id: uid(), title: 'Firestore', messages: [], updatedAt: Date.now(),
    }, 'user-123');
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it('saveChatSession remove base64 de anexos e inlineData antes de persistir', async () => {
    const { saveChatSession, getChatSessions } = await import('../../src/lib/db/chats');
    const id = uid();

    await saveChatSession({
      id,
      title: 'Sanitizado',
      messages: [{
        id: 'm1',
        role: 'user',
        text: 'Veja o arquivo',
        attachments: [{ mimeType: 'image/png', data: 'base64-antigo', name: 'foto.png' }],
      }],
      fullHistory: [{
        role: 'user',
        content: [
          { text: 'Veja o arquivo' },
          { inlineData: { mimeType: 'image/png', data: 'base64-antigo' } },
          { media: { contentType: 'image/png', url: 'data:image/png;base64,base64-antigo' } },
          { media: { contentType: 'image/png', url: 'https://example.com/foto.png' } },
        ],
      }],
      updatedAt: Date.now(),
    });

    const session = (await getChatSessions()).find((chat) => chat.id === id);
    expect(session?.messages[0].attachments).toEqual([
      { mimeType: 'image/png', name: 'foto.png', processed: true },
    ]);
    expect(session?.fullHistory?.[0].content).toEqual([
      { text: 'Veja o arquivo' },
      { media: { contentType: 'image/png', url: 'https://example.com/foto.png' } },
    ]);
  });

  it('deleteChatSession chama deleteDoc do Firestore quando userId presente', async () => {
    const { deleteChatSession } = await import('../../src/lib/db/chats');
    await deleteChatSession(uid(), 'user-123');
    expect(mockDeleteDoc).toHaveBeenCalled();
  });
});

// =========================================================================
// generations.ts
// =========================================================================
describe('db/generations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saveGeneration salva no IndexedDB quando userId ausente', async () => {
    const { saveGeneration, getGenerations } = await import('../../src/lib/db/generations');
    const id = uid();
    await saveGeneration({ id, name: 'Geração teste', createdAt: Date.now(), script: 'roteiro', voice: 'Aoede' });

    const gens = await getGenerations();
    expect(gens.some((g) => g.id === id)).toBe(true);
  });

  it('getGenerations retorna ordenado por createdAt descendente', async () => {
    const { saveGeneration, getGenerations } = await import('../../src/lib/db/generations');
    const idOld = uid();
    await saveGeneration({ id: idOld, name: 'A', createdAt: 100, script: '', voice: '' });
    const idNew = uid();
    await saveGeneration({ id: idNew, name: 'B', createdAt: Date.now(), script: '', voice: '' });

    const gens = await getGenerations();
    const oldIdx = gens.findIndex((g) => g.id === idOld);
    const newIdx = gens.findIndex((g) => g.id === idNew);
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it('deleteGeneration remove do IndexedDB quando userId ausente', async () => {
    const { saveGeneration, getGenerations, deleteGeneration } = await import('../../src/lib/db/generations');
    const id = uid();
    await saveGeneration({ id, name: 'Del', createdAt: Date.now(), script: '', voice: '' });
    await deleteGeneration(id);

    const gens = await getGenerations();
    expect(gens.find((g) => g.id === id)).toBeUndefined();
  });
});

// =========================================================================
// images.ts
// =========================================================================
describe('db/images', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saveImageGeneration salva no IndexedDB quando userId ausente', async () => {
    const { saveImageGeneration, getImageGenerations } = await import('../../src/lib/db/images');
    const id = uid();
    await saveImageGeneration({ id, name: 'Img', createdAt: Date.now(), prompt: 'sunset', aspectRatio: '16:9' });

    const imgs = await getImageGenerations();
    expect(imgs.some((i) => i.id === id)).toBe(true);
  });

  it('getImageGenerations retorna ordenado por createdAt descendente', async () => {
    const { saveImageGeneration, getImageGenerations } = await import('../../src/lib/db/images');
    const idOld = uid();
    await saveImageGeneration({ id: idOld, name: 'A', createdAt: 100, prompt: '', aspectRatio: '1:1' });
    const idNew = uid();
    await saveImageGeneration({ id: idNew, name: 'B', createdAt: Date.now(), prompt: '', aspectRatio: '1:1' });

    const imgs = await getImageGenerations();
    const oldIdx = imgs.findIndex((i) => i.id === idOld);
    const newIdx = imgs.findIndex((i) => i.id === idNew);
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it('deleteImageGeneration remove do IndexedDB quando userId ausente', async () => {
    const { saveImageGeneration, getImageGenerations, deleteImageGeneration } = await import('../../src/lib/db/images');
    const id = uid();
    await saveImageGeneration({ id, name: 'Del', createdAt: Date.now(), prompt: '', aspectRatio: '1:1' });
    await deleteImageGeneration(id);

    const imgs = await getImageGenerations();
    expect(imgs.find((i) => i.id === id)).toBeUndefined();
  });
});

// =========================================================================
// projects.ts
// =========================================================================
describe('db/projects', () => {
  const baseSettings = {
    selectedVoice: 'Aoede', pace: 'normal', styleNotes: '',
    isMultiSpeaker: false, speakerAName: '', speakerBName: '',
    speakerBVoice: '', audioProfile: 'default', scene: 'default',
    sceneDensity: 15, sceneRatio: '16:9',
  };

  beforeEach(() => vi.clearAllMocks());

  it('saveProject salva no IndexedDB quando userId ausente', async () => {
    const { saveProject, getProjects } = await import('../../src/lib/db/projects');
    const id = uid();
    await saveProject({ id, name: 'Projeto', script: 'roteiro', createdAt: Date.now(), settings: baseSettings });

    const projects = await getProjects();
    expect(projects.some((p) => p.id === id)).toBe(true);
  });

  it('getProjects retorna ordenado por createdAt descendente', async () => {
    const { saveProject, getProjects } = await import('../../src/lib/db/projects');
    const idOld = uid();
    await saveProject({ id: idOld, name: 'A', script: '', createdAt: 100, settings: baseSettings });
    const idNew = uid();
    await saveProject({ id: idNew, name: 'B', script: '', createdAt: Date.now(), settings: baseSettings });

    const projects = await getProjects();
    const oldIdx = projects.findIndex((p) => p.id === idOld);
    const newIdx = projects.findIndex((p) => p.id === idNew);
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it('deleteProject remove do IndexedDB quando userId ausente', async () => {
    const { saveProject, getProjects, deleteProject } = await import('../../src/lib/db/projects');
    const id = uid();
    await saveProject({ id, name: 'Del', script: '', createdAt: Date.now(), settings: baseSettings });
    await deleteProject(id);

    const projects = await getProjects();
    expect(projects.find((p) => p.id === id)).toBeUndefined();
  });

  it('saveProject chama setDoc do Firestore quando userId presente', async () => {
    const { saveProject } = await import('../../src/lib/db/projects');
    await saveProject(
      { id: uid(), name: 'FB', script: '', createdAt: Date.now(), settings: baseSettings },
      'user-123',
    );
    expect(mockSetDoc).toHaveBeenCalled();
  });
});

// =========================================================================
// audio-segments.ts
// =========================================================================
describe('db/audio-segments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saveAudioSegments com userId ausente atualiza item existente no IndexedDB', async () => {
    const { putIndexedDbItem } = await import('../../src/lib/db/shared');
    const { saveAudioSegments, loadAudioSegments } = await import('../../src/lib/db/audio-segments');
    const audioId = uid();

    await putIndexedDbItem('audios', {
      id: audioId,
      projectId: 'proj-1',
      audioUrl: 'blob:test',
      createdAt: Date.now(),
    });

    const segments = [
      { text: 'chunk 1', startSec: 0, endSec: 5, chunkIndex: 0 },
      { text: 'chunk 2', startSec: 5, endSec: 10, chunkIndex: 1 },
    ];

    await saveAudioSegments('proj-1', audioId, segments);
    const loaded = await loadAudioSegments('proj-1');

    expect(loaded).not.toBeNull();
    expect(loaded!).toHaveLength(2);
    expect(loaded![0].text).toBe('chunk 1');
    expect(loaded![1].text).toBe('chunk 2');
  });

  it('loadAudioSegments retorna null quando não há segmentos no IndexedDB', async () => {
    const { loadAudioSegments } = await import('../../src/lib/db/audio-segments');
    const result = await loadAudioSegments('proj-inexistente-xyz');
    expect(result).toBeNull();
  });

  it('saveAudioSegments com userId chama setDoc do Firestore', async () => {
    const { saveAudioSegments } = await import('../../src/lib/db/audio-segments');
    await saveAudioSegments('proj-1', 'audio-1', [], 'user-123');
    expect(mockSetDoc).toHaveBeenCalled();
  });
});

// =========================================================================
// videos.ts
// =========================================================================
describe('db/videos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saveVideoToProject salva no IndexedDB quando userId ausente', async () => {
    const { saveVideoToProject, getProjectVideos } = await import('../../src/lib/db/videos');
    const projectId = `proj-${uid()}`;

    const video = await saveVideoToProject({
      projectId,
      userId: '',
      videoUrl: 'blob:test',
      format: 'mp4',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 60,
      fileSizeBytes: 5000,
    });

    expect(video.id).toBeDefined();
    expect(video.format).toBe('mp4');
    expect(video.videoUrl).toBe('');

    const videos = await getProjectVideos(projectId);
    expect(videos.some((item) => item.id === video.id)).toBe(true);
  });

  it('saveVideoToProject com userId grava localmente sem upload nem Firestore', async () => {
    const { saveVideoToProject, getProjectVideos } = await import('../../src/lib/db/videos');
    const projectId = `proj-${uid()}`;
    const videoBlob = new Blob(['video'], { type: 'video/mp4' });

    const video = await saveVideoToProject({
      projectId,
      userId: 'user-123',
      videoUrl: 'blob:rendered-video',
      format: 'mp4',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 60,
      fileSizeBytes: 5000,
      videoBlob,
    }, 'user-123');

    const videos = await getProjectVideos(projectId, 'user-123');

    expect(video.userId).toBe('user-123');
    expect(video.videoUrl).toBe('');
    const storedVideo = videos.find((item) => item.id === video.id);
    expect(storedVideo).toBeDefined();
    expect(storedVideo?.videoBlob).toBeDefined();
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUploadBytes).not.toHaveBeenCalled();
    expect(mockUploadBytesResumable).not.toHaveBeenCalled();
  });

  it('getProjectVideos retorna vazio quando não há vídeos', async () => {
    const { getProjectVideos } = await import('../../src/lib/db/videos');
    const videos = await getProjectVideos('proj-inexistente-xyz');
    expect(videos).toEqual([]);
  });

  it('getProjectVideos com userId retorna vídeos locais e legados remotos', async () => {
    const { saveVideoToProject, getProjectVideos } = await import('../../src/lib/db/videos');
    const projectId = `proj-${uid()}`;
    const localVideo = await saveVideoToProject({
      projectId,
      userId: 'user-123',
      videoUrl: '',
      format: 'webm',
      width: 1080,
      height: 1920,
      fps: 30,
      durationInSeconds: 30,
      fileSizeBytes: 2000,
    }, 'user-123');
    const legacyVideo = {
      id: `legacy-${uid()}`,
      projectId,
      userId: 'user-123',
      videoUrl: 'https://storage.example/legacy.mp4',
      format: 'mp4' as const,
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 45,
      fileSizeBytes: 3000,
      createdAt: localVideo.createdAt + 1,
    };
    mockGetDocs.mockResolvedValueOnce({ docs: [{ data: () => legacyVideo }] });

    const videos = await getProjectVideos(projectId, 'user-123');

    expect(videos.map((video) => video.id)).toEqual([legacyVideo.id, localVideo.id]);
  });

  it('getProjectVideos com userId não retorna vídeos locais de outro usuário', async () => {
    const { saveVideoToProject, getProjectVideos } = await import('../../src/lib/db/videos');
    const projectId = `proj-${uid()}`;
    const userVideo = await saveVideoToProject({
      projectId,
      userId: 'user-123',
      videoUrl: '',
      format: 'mp4',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 20,
      fileSizeBytes: 1000,
    }, 'user-123');
    await saveVideoToProject({
      projectId,
      userId: 'user-456',
      videoUrl: '',
      format: 'webm',
      width: 1080,
      height: 1920,
      fps: 30,
      durationInSeconds: 30,
      fileSizeBytes: 2000,
    }, 'user-456');

    const videos = await getProjectVideos(projectId, 'user-123');
    const anonymousVideos = await getProjectVideos(projectId);

    expect(videos.map((video) => video.id)).toEqual([userVideo.id]);
    expect(anonymousVideos).toEqual([]);
  });

  it('getProjectVideos retorna vídeos locais quando Firestore legado falha', async () => {
    const { saveVideoToProject, getProjectVideos } = await import('../../src/lib/db/videos');
    const projectId = `proj-${uid()}`;
    const localVideo = await saveVideoToProject({
      projectId,
      userId: 'user-123',
      videoUrl: '',
      format: 'mp4',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 20,
      fileSizeBytes: 1000,
    }, 'user-123');
    mockGetDocs.mockRejectedValueOnce(new Error('legacy offline'));

    const videos = await getProjectVideos(projectId, 'user-123');

    expect(videos.map((video) => video.id)).toEqual([localVideo.id]);
  });

  it('deleteVideoFromProject remove do IndexedDB quando userId ausente', async () => {
    const { saveVideoToProject, getProjectVideos, deleteVideoFromProject } = await import('../../src/lib/db/videos');
    const projectId = `proj-${uid()}`;

    const saved = await saveVideoToProject({
      projectId,
      userId: '',
      videoUrl: '',
      format: 'webm',
      width: 1080,
      height: 1920,
      fps: 30,
      durationInSeconds: 30,
      fileSizeBytes: 2000,
    });

    await deleteVideoFromProject(saved.id, projectId);
    const videos = await getProjectVideos(projectId);
    expect(videos).toHaveLength(0);
  });

  it('deleteVideoFromProject local com userId não tenta apagar Storage sem doc legado', async () => {
    const { saveVideoToProject, getProjectVideos, deleteVideoFromProject } = await import('../../src/lib/db/videos');
    const projectId = `proj-${uid()}`;
    const saved = await saveVideoToProject({
      projectId,
      userId: 'user-123',
      videoUrl: '',
      format: 'mp4',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 20,
      fileSizeBytes: 1000,
      videoBlob: new Blob(['video'], { type: 'video/mp4' }),
    }, 'user-123');
    vi.clearAllMocks();

    await deleteVideoFromProject(saved.id, projectId, 'user-123');
    const videos = await getProjectVideos(projectId);

    expect(videos).toHaveLength(0);
    expect(mockGetDoc).toHaveBeenCalled();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });
});
