# Fase 5.3 — Handoff: Teste end-to-end com 10 imagens + bun run build

**Você é o agent `worker` da Koda AI Studio.** Sua tarefa é a Fase 5.3 do plano `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`).

## Objetivo

Validar end-to-end o pipeline vetorial com **10 imagens diversas** (Gemini flat design, logos, fotos) e rodar `bun run build` para confirmar que o build de produção não quebra.

## Contexto do projeto

- **Stack:** React 19 + Vite 8 + Remotion 4.0.448 + TypeScript 6 + `@remotion/paths` + `imagetracerjs` + Zustand + Vitest 4.
- **Regras:** NUNCA `any`, NUNCA `process.env`, logger `createLogger` (import relativo, NUNCA `@/`), comentários em pt-BR.
- **Padrão:** seguir `imageProcessing.unit.test.ts` (mask) como base.

## Estado atual

### 10 imagens de teste

Gerar 10 imagens **diretamente em runtime** (sem precisar de assets externos) com características variadas:
1. Imagem flat design (fundo branco + quadrado preto)
2. Imagem com múltiplas cores (padrão quadriculado)
3. Imagem com gradiente (CanvasGradient)
4. Imagem com várias formas (círculos, retângulos, triângulos)
5. Imagem só com linhas (Hough-style: várias linhas paralelas)
6. Imagem com alta densidade (1000+ pixels diferentes — perto do limite de paths)
7. Imagem PNG transparente (alpha variado)
8. Imagem pequena (50×50 — menos que limite 1920×1080)
9. Imagem muito escura (preto com detalhes cinza)
10. Imagem muito clara (branco com detalhes cinza claro)

**Decisão:** criar as 10 imagens em runtime via `document.createElement('canvas')` no test, em vez de assets binários. Mais simples, mais determinístico, sem dependências de arquivos.

### Validação por imagem

Para cada imagem:
- `generateStrokesFromImage(dataUrl, onProgress, { renderMode: 'vetorial' })` → deve retornar `VetorialAnimation`.
- Verificar: `paths.length > 0` (vetorização produziu algo), `paths.length <= 500` (truncamento), `totalLength > 0`, `canvasColor === 'white'`, `sourcePreset` é válido.
- Medir latência: `performance.now()` antes/depois. Reportar.
- Verificar que **fallback mask** ainda funciona (1 imagem de teste com `renderMode: 'mask'`).

## Tarefas

### 1. Criar `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts`

Estrutura sugerida:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { generateStrokesFromImage } from '../../src/features/speed-paint/lib/imageProcessing';
import type { VetorialAnimation } from '../../src/features/speed-paint/types/vetorial';

// ---------------------------------------------------------------------------
// Helpers para gerar 10 imagens de teste
// ---------------------------------------------------------------------------

interface TestImage {
  name: string;
  /** Função que desenha a imagem num canvas 2D */
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

const TEST_IMAGES: TestImage[] = [
  {
    name: 'flat-design-basico',
    draw: (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.fillRect(w / 4, h / 4, w / 2, h / 2);
    },
  },
  {
    name: 'multi-cores',
    draw: (ctx, w, h) => {
      const cols = 4, rows = 4;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = `hsl(${(r * cols + c) * (360 / (cols * rows))}, 80%, 50%)`;
          ctx.fillRect((c * w) / cols, (r * h) / rows, w / cols, h / rows);
        }
      }
    },
  },
  {
    name: 'gradiente',
    draw: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#ff0000');
      grad.addColorStop(0.5, '#00ff00');
      grad.addColorStop(1, '#0000ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    name: 'multiplas-formas',
    draw: (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(0, 0, w / 3, h / 3);
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.moveTo(w * 0.7, h * 0.3);
      ctx.lineTo(w * 0.9, h * 0.3);
      ctx.lineTo(w * 0.8, h * 0.7);
      ctx.fill();
    },
  },
  {
    name: 'linhas-paralelas',
    draw: (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(0, ((i + 1) * h) / 21);
        ctx.lineTo(w, ((i + 1) * h) / 21);
        ctx.stroke();
      }
    },
  },
  {
    name: 'alta-densidade',
    draw: (ctx, w, h) => {
      // 100+ pequenos círculos — gera muitos paths
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `hsl(${(i * 3.6) % 360}, 60%, 30%)`;
        ctx.beginPath();
        ctx.arc((Math.random() * w), (Math.random() * h), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    name: 'pequena-50x50',
    draw: (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 3, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    name: 'muito-escura',
    draw: (ctx, w, h) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#333';
      ctx.fillRect(w / 3, h / 3, w / 3, h / 3);
    },
  },
  {
    name: 'muito-clara',
    draw: (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#eee';
      ctx.fillRect(w / 3, h / 3, w / 3, h / 3);
    },
  },
  {
    name: 'circulos-aninhados',
    draw: (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      for (let r = w / 2; r > 0; r -= w / 12) {
        ctx.strokeStyle = r % 2 === 0 ? '#000' : '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },
];

function createImageDataURL(width: number, height: number, draw: TestImage['draw']): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  return canvas.toDataURL('image/png');
}

describe('imageProcessing — pipeline vetorial e2e (10 imagens)', () => {
  it('processa 10 imagens diversas no modo vetorial', async () => {
    const results: Array<{ name: string; latency: number; paths: number; totalLength: number }> = [];

    for (const img of TEST_IMAGES) {
      // Alterna entre 200x200 e 800x600 para variar
      const [w, h] = img.name === 'pequena-50x50' ? [50, 50] : [800, 600];
      const dataUrl = createImageDataURL(w, h, img.draw);
      const start = performance.now();
      const animation = await generateStrokesFromImage(
        dataUrl,
        () => {},
        { renderMode: 'vetorial' },
      );
      const latency = performance.now() - start;

      if ('paths' in animation) {
        results.push({
          name: img.name,
          latency,
          paths: animation.paths.length,
          totalLength: animation.totalLength,
        });

        // Validações de sanidade
        expect(animation.canvasWidth).toBeLessThanOrEqual(1920);
        expect(animation.canvasHeight).toBeLessThanOrEqual(1080);
        expect(animation.fps).toBe(60);
        expect(animation.sourcePreset).toBe('artistic1');
        expect(animation.paths.length).toBeLessThanOrEqual(500); // MAX_PATHS_PER_SCENE
      } else {
        throw new Error(`Tipo inesperado para ${img.name}: esperado VetorialAnimation`);
      }
    }

    // Log de latência para debug (não falha o teste)
    console.log('Latência por imagem:');
    for (const r of results) {
      console.log(`  ${r.name}: ${r.latency.toFixed(0)}ms, ${r.paths} paths, totalLength=${r.totalLength.toFixed(0)}`);
    }
    expect(results).toHaveLength(10);
  }, 60000); // 60s timeout para 10 imagens

  it('fallback mask ainda funciona (1 imagem de teste)', async () => {
    const dataUrl = createImageDataURL(200, 200, TEST_IMAGES[0]!.draw);
    const animation = await generateStrokesFromImage(
      dataUrl,
      () => {},
      { renderMode: 'mask' },
    );
    expect(animation).toHaveProperty('strokes');
    expect(animation).not.toHaveProperty('paths');
  });
});
```

### 2. Rodar `bun run build` (build de produção)

```bash
cd "D:/Pictures/ProgML/Script-Master" && bun run build
```

Isso roda `lint + typecheck + vite build` (script definido no `package.json`). Validar que **produz o `dist/`** sem erros.

### 3. (Opcional) Reportar latência média

Se as 10 imagens forem processadas em < 30s total, performance está OK. Se > 30s, documentar e considerar otimizações adicionais (fora do escopo desta task).

## Restrições

- **NÃO** modificar código de produção.
- **NÃO** usar `any` / `@ts-ignore`.
- Comentários em pt-BR.
- Timeout generoso (60s para 10 imagens) — `imagetracerjs` pode ser lento em algumas imagens.
- Se algum teste for flaky, marcar com `it.fails()` ou ajustar (mas tentar manter).

## Notebooks

Não aplicável.

## Validação (pronto quando)

- `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts` criado.
- 2/2 testes passando (e2e + fallback mask).
- `bun run test` completo sem regressões (mantém 2262+2 = 2264/2264 ou similar).
- `bun run build` completa com 0 erros, gera `dist/`.
- Latência média reportada (informação de log, não falha).
- Retorne mensagem final com: (a) quantos testes, (b) latência por imagem, (c) saída do `bun run build`, (d) decisões de otimização relevantes.
