import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('../../src/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

describe('download', () => {
  let mockLink: {
    href: string;
    download: string;
    target: string;
    rel: string;
    click: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLink = {
      href: '',
      download: '',
      target: '',
      rel: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as HTMLAnchorElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('lança erro quando URL está vazia', async () => {
    const { downloadFile } = await import('../../src/lib/download');
    await expect(downloadFile('', 'file.txt')).rejects.toThrow('URL de download ausente');
  });

  it('triggera download para blob URL sem tentar fetch', async () => {
    const { downloadFile } = await import('../../src/lib/download');
    await downloadFile('blob:http://localhost/test', 'audio.wav');

    expect(mockLink.href).toBe('blob:http://localhost/test');
    expect(mockLink.download).toBe('audio.wav');
    expect(mockLink.target).toBe('_blank');
    expect(mockLink.rel).toBe('noopener noreferrer');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('triggera download para data URL sem tentar fetch', async () => {
    const { downloadFile } = await import('../../src/lib/download');
    await downloadFile('data:image/png;base64,abc123', 'image.png');

    expect(mockLink.href).toBe('data:image/png;base64,abc123');
    expect(mockLink.download).toBe('image.png');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('faz fetch e cria blob URL para URL remota', async () => {
    const fakeBlob = new Blob(['content'], { type: 'text/plain' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(fakeBlob),
    });
    const mockRevokeObjectURL = vi.fn();
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:generated');

    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });

    const { downloadFile } = await import('../../src/lib/download');
    await downloadFile('https://example.com/file.wav', 'file.wav');

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/file.wav');
    expect(mockCreateObjectURL).toHaveBeenCalledWith(fakeBlob);
    expect(mockLink.href).toBe('blob:generated');
    expect(mockLink.download).toBe('file.wav');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:generated');
  });

  it('usa fallback ao navegador quando fetch falha para URL remota', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { downloadFile } = await import('../../src/lib/download');
    await downloadFile('https://example.com/file.wav', 'file.wav');

    // Deve ter feito o fallback (triggerDownload direto com a URL original)
    expect(mockLink.href).toBe('https://example.com/file.wav');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('usa fallback ao navegador quando fetch retorna status != 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const { downloadFile } = await import('../../src/lib/download');
    await downloadFile('https://example.com/missing.wav', 'missing.wav');

    expect(mockLink.href).toBe('https://example.com/missing.wav');
    expect(mockLink.click).toHaveBeenCalled();
  });
});
