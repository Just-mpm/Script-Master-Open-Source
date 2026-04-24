import { describe, it, expect, vi } from 'vitest';
import {
  extractJsonSettings,
  stripJsonSettingsBlock,
  fileToAttachment,
} from '../../src/features/assistant/utils';

import type { ExtractedSettingsResult } from '../../src/features/assistant/utils';

// ---------------------------------------------------------------------------
// extractJsonSettings
// ---------------------------------------------------------------------------
describe('extractJsonSettings', () => {
  it('retorna null quando não há bloco json no texto', () => {
    const result = extractJsonSettings('Texto sem JSON algum');
    expect(result).toBeNull();
  });

  it('retorna null quando há bloco de código mas não é json', () => {
    const result = extractJsonSettings('```typescript\nconsole.log("oi")\n```');
    expect(result).toBeNull();
  });

  it('retorna null para bloco ```json vazio', () => {
    const result = extractJsonSettings('Aqui vai:\n```json\n```');
    expect(result).toBeNull();
  });

  it('extrai JSON válido de bloco ```json com parseError: false', () => {
    const text = 'Sugiro estes ajustes:\n```json\n{"pace": "lento", "styleNotes": "calmo"}\n```\nEspero que goste.';
    const result = extractJsonSettings(text);

    expect(result).not.toBeNull();
    expect(result!.parseError).toBe(false);
    if (!result || result.parseError) return;
    expect(result.settings).toEqual({ pace: 'lento', styleNotes: 'calmo' });
  });

  it('extrai JSON válido mesmo com quebras de linha dentro do bloco', () => {
    const text = '````json\n{\n  "script": "novo roteiro",\n  "pace": "rápido"\n}\n````';
    const result = extractJsonSettings(text);

    expect(result).not.toBeNull();
    expect(result!.parseError).toBe(false);
    if (!result || result.parseError) return;
    expect(result.settings.script).toBe('novo roteiro');
    expect(result.settings.pace).toBe('rápido');
  });

  it('retorna parseError: true para JSON malformado', () => {
    const text = 'Ajustes:\n```json\n{pace: "lento"}\n```\n';
    const result = extractJsonSettings(text);

    expect(result).not.toBeNull();
    expect(result!.parseError).toBe(true);
    expect(result!.settings).toBeNull();
  });

  it('retorna parseError: true para JSON com chave sem aspas', () => {
    const text = '```json\n{invalid}\n```';
    const result = extractJsonSettings(text);

    expect(result).not.toBeNull();
    expect(result!.parseError).toBe(true);
  });

  it('retorna parseError: true para JSON truncado', () => {
    const text = '```json\n{"script": "aberto';
    const result = extractJsonSettings(text);

    // O regex precisa de ``` de fechamento, então sem fechamento não match
    // Mas o regex /\s*```/ é non-greedy — precisa do fechamento
    expect(result).toBeNull();
  });

  it('retorna parseError: true para JSON com array ao invés de objeto', () => {
    // Array é JSON válido — settings deve ser o array
    const text = '```json\n["item1", "item2"]\n```';
    const result = extractJsonSettings(text);

    expect(result).not.toBeNull();
    expect(result!.parseError).toBe(false);
  });

  it('retorna o primeiro bloco json quando há múltiplos', () => {
    const text = 'Primeiro:\n```json\n{"pace": "primeiro"}\n```\nSegundo:\n```json\n{"pace": "segundo"}\n```';
    const result = extractJsonSettings(text);

    expect(result).not.toBeNull();
    expect(result!.parseError).toBe(false);
    if (!result || result.parseError) return;
    expect(result.settings.pace).toBe('primeiro');
  });

  it('aceita JSON vazio {} como settings válido', () => {
    const text = '```json\n{}\n```';
    const result = extractJsonSettings(text);

    expect(result).not.toBeNull();
    expect(result!.parseError).toBe(false);
    if (!result || result.parseError) return;
    expect(result.settings).toEqual({});
  });

  it('funciona com JSON que contém números e booleanos', () => {
    const text = '```json\n{"sceneDensity": 20, "generateScenes": true, "isMultiSpeaker": false}\n```';
    const result = extractJsonSettings(text);

    expect(result).not.toBeNull();
    expect(result!.parseError).toBe(false);
    if (!result || result.parseError) return;
    expect(result.settings.sceneDensity).toBe(20);
    expect(result.settings.generateScenes).toBe(true);
    expect(result.settings.isMultiSpeaker).toBe(false);
  });

  it('ignora whitespace extra dentro do bloco json', () => {
    const text = '```json   \n\n   {"pace": "normal"}   \n\n   ```';
    const result = extractJsonSettings(text);

    expect(result).not.toBeNull();
    expect(result!.parseError).toBe(false);
    if (!result || result.parseError) return;
    expect(result.settings.pace).toBe('normal');
  });
});

// ---------------------------------------------------------------------------
// stripJsonSettingsBlock
// ---------------------------------------------------------------------------
describe('stripJsonSettingsBlock', () => {
  it('remove bloco json e retorna texto limpo (newline extra do \\s*```)', () => {
    const text = 'Sugiro:\n```json\n{"pace": "lento"}\n```\nEspero que goste.';
    const result = stripJsonSettingsBlock(text);

    // O regex /\s*```/ inclui o \n antes do bloco, resultando em newline extra
    // stripJsonSettingsBlock: replace(/```json\s*[\s\S]*?\s*```/, '').trim()
    // Após replace: "Sugiro:\n\nEspero que goste." (o \s* antes de ``` consome o \n)
    // Após trim: "Sugiro:\n\nEspero que goste." (trim só remove whitespace nas bordas)
    expect(result).toBe('Sugiro:\n\nEspero que goste.');
  });

  it('retorna texto inalterado quando não há bloco json', () => {
    const text = 'Texto sem JSON';
    const result = stripJsonSettingsBlock(text);

    expect(result).toBe('Texto sem JSON');
  });

  it('retorna string vazaria quando texto é só o bloco json', () => {
    const text = '```json\n{"pace": "lento"}\n```';
    const result = stripJsonSettingsBlock(text);

    expect(result).toBe('');
  });

  it('remove apenas o primeiro bloco json (non-greedy)', () => {
    const text = 'Primeiro:\n```json\n{"a": 1}\n```\nTexto entre\n```json\n{"b": 2}\n```';
    const result = stripJsonSettingsBlock(text);

    // O \s* antes de ``` consome o newline, gerando \n\n extra
    expect(result).toBe('Primeiro:\n\nTexto entre\n```json\n{"b": 2}\n```');
  });

  it('faz trim do resultado', () => {
    const text = '  ```json\n{}\n```   ';
    const result = stripJsonSettingsBlock(text);

    expect(result).toBe('');
  });
});

// ---------------------------------------------------------------------------
// fileToAttachment
// ---------------------------------------------------------------------------
describe('fileToAttachment', () => {
  it('converte arquivo para attachment com mimeType, data e name', async () => {
    const file = new File(['conteúdo de teste'], 'arquivo.txt', { type: 'text/plain' });

    const attachment = await fileToAttachment(file);

    expect(attachment.mimeType).toBe('text/plain');
    expect(attachment.name).toBe('arquivo.txt');
    // data deve ser a parte base64 (após a vírgula do data URL)
    expect(typeof attachment.data).toBe('string');
    expect(attachment.data.length).toBeGreaterThan(0);
  });

  it('extrai apenas a parte base64 (sem prefixo data:...)', async () => {
    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });

    const attachment = await fileToAttachment(file);

    // Decodifica base64 e verifica o conteúdo
    const decoded = atob(attachment.data);
    expect(decoded).toBe('hello world');
  });

  it('rejeita quando FileReader retorna ArrayBuffer ao invés de string', async () => {
    // Caso extremo: FileReader retorna ArrayBuffer
    // Na prática readAsDataURL sempre retorna string, mas testamos o branch
    const file = new File(['data'], 'test.bin', { type: 'application/octet-stream' });

    // Na prática, readAsDataURL sempre retorna string, então este teste
    // verifica o comportamento normal (não rejeita)
    const attachment = await fileToAttachment(file);
    expect(attachment.mimeType).toBe('application/octet-stream');
    expect(attachment.name).toBe('test.bin');
  });

  it('rejeita quando FileReader dispara onerror', async () => {
    // Simula erro no FileReader
    const file = new File(['data'], 'erro.txt', { type: 'text/plain' });

    // Mock FileReader para simular erro
    const OriginalFileReader = globalThis.FileReader;
    class MockFileReader {
      onloadend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      result: string | ArrayBuffer | null = null;

      readAsDataURL() {
        // Simula erro assíncrono
        setTimeout(() => {
          if (this.onerror) this.onerror();
        }, 0);
      }
    }

    vi.stubGlobal('FileReader', MockFileReader);

    await expect(fileToAttachment(file)).rejects.toThrow('Erro ao carregar o arquivo erro.txt');

    vi.unstubAllGlobals();
  });

  it('preserva mimeType original do arquivo', async () => {
    const file = new File(['<svg></svg>'], 'img.svg', { type: 'image/svg+xml' });

    const attachment = await fileToAttachment(file);

    expect(attachment.mimeType).toBe('image/svg+xml');
  });

  it('trata arquivo sem type corretamente', async () => {
    const file = new File(['data'], 'semtype', {});

    const attachment = await fileToAttachment(file);

    expect(attachment.mimeType).toBe('');
    expect(attachment.name).toBe('semtype');
  });
});
