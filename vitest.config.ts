import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'virtual:pwa-register/react': path.resolve(__dirname, 'tests/__mocks__/pwa-register.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    /**
     * `forks` é o pool default do Vitest 4 e o mais estável contra falhas
     * de segmento e promessas pendentes. Explicitado aqui para documentar a
     * intenção — estávamos no default, mas o custo de explicitar é zero.
     */
    pool: 'forks',
    /**
     * `testTimeout` (default 5s) e `hookTimeout` (default 10s) elevados para
     * tolerar a contenção de CPU/I/O quando a suíte completa (~4min, 2.5k
     * testes) satura o disco. Sem isso, 4 testes legítimos (`SpeedPaintPage`,
     * `ScriptEditor`, `lib-data`) excedem 5s sob carga embora passem isolados
     * em <1.5s. Configurado via top-level no Vitest 4 (`poolOptions` foi
     * removido nessa versão).
     */
    testTimeout: 15000,
    hookTimeout: 20000,
    /**
     * Limita paralelismo a 50% dos núcleos lógicos. Evita que o runner abra
     * workers para todos os núcleos e cause contenção de I/O em máquinas
     * com muitos cores. Sintaxe do Vitest 4 (`maxWorkers` substitui os
     * antigos `maxThreads`/`maxForks`).
     */
    maxWorkers: '50%',
  },
});
