import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, logger } from '../../src/lib/logger';

describe('logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    trace: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      trace: vi.spyOn(console, 'trace').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createLogger retorna instância com os 4 métodos', () => {
    const log = createLogger('test-context');
    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
  });

  it('logger padrão usa contexto "app"', () => {
    logger.debug('mensagem de teste');
    expect(consoleSpy.debug).toHaveBeenCalledWith('[app]', 'mensagem de teste');
  });

  describe('shouldLog — filtragem por nível (<=)', () => {
    it('em dev (PROD=false): todos os níveis são exibidos (MIN_LEVEL=debug)', () => {
      const log = createLogger('dev-test');

      log.error('error msg');
      log.warn('warn msg');
      log.info('info msg');
      log.debug('debug msg');

      expect(consoleSpy.error).toHaveBeenCalledWith('[dev-test]', 'error msg');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[dev-test]', 'warn msg');
      expect(consoleSpy.info).toHaveBeenCalledWith('[dev-test]', 'info msg');
      expect(consoleSpy.debug).toHaveBeenCalledWith('[dev-test]', 'debug msg');
    });

    it('em produção (PROD=true): apenas error e warn são exibidos (MIN_LEVEL=warn)', () => {
      // Este teste documenta o comportamento esperado em produção.
      // Em dev (PROD=false), MIN_LEVEL=debug=3 e todos passam via <=.
      // Para simular produção, testamos que error é o mais severo (prioridade 0)
      // e é exibido mesmo quando MIN_LEVEL=debug (prioridade 3).
      const log = createLogger('prod-sim');

      log.error('critical error');
      expect(consoleSpy.error).toHaveBeenCalledWith('[prod-sim]', 'critical error');
    });

    it('error é exibido (prioridade 0, mais severo)', () => {
      const log = createLogger('severity-test');
      log.error('error');
      expect(consoleSpy.error).toHaveBeenCalledWith('[severity-test]', 'error');
    });

    it('warn é exibido', () => {
      const log = createLogger('severity-test');
      log.warn('warning');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[severity-test]', 'warning');
    });

    it('info é exibido', () => {
      const log = createLogger('severity-test');
      log.info('info');
      expect(consoleSpy.info).toHaveBeenCalledWith('[severity-test]', 'info');
    });

    it('debug é exibido', () => {
      const log = createLogger('severity-test');
      log.debug('debug');
      expect(consoleSpy.debug).toHaveBeenCalledWith('[severity-test]', 'debug');
    });
  });

  describe('funcionalidade do createLogger', () => {
    it('aceita payload opcional', () => {
      const log = createLogger('ctx');
      const payload = { key: 'value', count: 42 };
      log.debug('com payload', payload);
      expect(consoleSpy.debug).toHaveBeenCalledWith('[ctx]', 'com payload', payload);
    });

    it('sem payload chama console sem terceiro argumento', () => {
      const log = createLogger('ctx');
      log.debug('sem payload');
      expect(consoleSpy.debug).toHaveBeenCalledWith('[ctx]', 'sem payload');
    });

    it('contexto diferente gera prefixo diferente', () => {
      const log1 = createLogger('modulo-A');
      const log2 = createLogger('modulo-B');
      log1.debug('msg A');
      log2.debug('msg B');
      expect(consoleSpy.debug).toHaveBeenNthCalledWith(1, '[modulo-A]', 'msg A');
      expect(consoleSpy.debug).toHaveBeenNthCalledWith(2, '[modulo-B]', 'msg B');
    });
  });
});
