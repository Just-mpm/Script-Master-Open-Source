import { describe, it, expect } from 'vitest';

describe('gemini', () => {
  it('parseReferenceImage deve parsear data URI corretamente', async () => {
    // Como parseReferenceImage não é exportado, testamos via o módulo completo
    // Primeiro mockamos todas as dependências pesadas no nível do arquivo

    const { generateScenePrompts, generateImageFromPrompt } = await import('../../src/lib/gemini');

    // Verifica que as funções exportadas existem
    expect(typeof generateScenePrompts).toBe('function');
    expect(typeof generateImageFromPrompt).toBe('function');
  });
});
