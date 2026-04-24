import { describe, it, expect } from 'vitest';
import { hashScript } from '../../src/lib/crypto-utils';

describe('crypto-utils', () => {
  describe('hashScript', () => {
    it('retorna hash SHA-256 hex de 64 caracteres para string não vazia', async () => {
      const hash = await hashScript('Olá, mundo!');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('retorna hash diferente para strings diferentes', async () => {
      const hash1 = await hashScript('roteiro A');
      const hash2 = await hashScript('roteiro B');
      expect(hash1).not.toBe(hash2);
    });

    it('retorna hash idêntico para a mesma string (determinístico)', async () => {
      const script = 'Um roteiro de teste para verificação de hash.';
      const hash1 = await hashScript(script);
      const hash2 = await hashScript(script);
      expect(hash1).toBe(hash2);
    });

    it('retorna hash correto para string vazia', async () => {
      // SHA-256 de string vazia = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      const hash = await hashScript('');
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('lida com strings grandes (50K chars — limite MAX_CHARS)', async () => {
      const largeScript = 'a'.repeat(50000);
      const hash = await hashScript(largeScript);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('lida com caracteres especiais e unicode', async () => {
      const hash = await hashScript('Teste com émojis 🎬🎵 e acentuação àáãõç');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
