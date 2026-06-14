# Gap Finder — Fase 1 (Fundação: Tipos, Store, Vectorizer, Cache)

**Data:** 2026-06-14
**Scan:** `gap-finder` fase 1.5 do plano `plano-speed-paint-vetorial-2026-06-14.md`
**Tracker:** `tracker-speed-paint-vetorial-2026-06-14.md` §Fase 1.5
**Auditor:** gap-finder agent
**Foco:** Completude, escopo, alinhamento com requisitos (NÃO qualidade de código)

---

## 1. Contexto Assumido

- 6 arquivos auditados: 3 novos + 3 modificados
- Plano: Fase 1 é aditiva — não altera comportamento do modo máscara
- Modo máscara (`renderMode: 'mask'`) permanece como default
- Fase 0 (spike) removida por decisão do Matheus — risco aceito
- `@remotion/paths` e `imagetracerjs` devem estar instalados (Fase 1.0)

---

## 2. Mapa Rápido

| Arquivo | Status | Observações |
|---------|--------|-------------|
| `src/features/speed-paint/types/vetorial.ts` | ✅ Sólido | Tipos completos, sem `any`, comentários pt-BR |
| `src/features/speed-paint/lib/vectorizer.ts` | ✅ Sólido | Async, AbortSignal, regex sem DOMParser, pathomit |
| `src/types/imagetracerjs.d.ts` | ✅ Sólido | Declarações mínimas, sem `any`, 16 presets |
| `src/features/speed-paint/types.ts` | ✅ Sólido | Re-exports corretos, sem circular |
| `src/features/speed-paint/store/animationStore.ts` | ✅ Sólido | renderMode + vetorialPreset, defaults corretos, resets ok |
| `src/features/video-render/lib/strokeCache.ts` | 🔶 Atenção | Narrow da discriminated union perdido na overload com context |

---

## 3. Gaps Priorizados

### GAP-01 | 🔶 MÉDIO | Tipo/API incompleto

**Descrição:**
`getStrokeAnimation()` com overload de `context` perde o narrow da discriminated union `CachedAnimation`. A linha 160 retorna `entry.data.animation` em ambos os branches do ternário, descartando o `kind` que permitiria ao TypeScript saber em tempo de compilação se o resultado é `StrokeAnimation` ou `VetorialAnimation`.

**Evidência:**
```typescript
// strokeCache.ts:160
return entry.data.kind === 'mask' ? entry.data.animation : entry.data.animation;
// ambos os branches retornam StrokeAnimation | VetorialAnimation
// o kind 'mask' | 'vetorial' é perdido
```

**Impacto:**
- Consumidores da overload com context precisam fazer duck typing runtime (`if ('paths' in result)`) em vez de narrow por `kind`
- Viola a premissa do tracker de "discriminated union" (Premissa #10)
- **Não afeta código atual** (todos os consumidores usam overload sem context), mas afetará a Fase 2 quando o cache for usado para `VetorialAnimation`

**Mitigações verificadas:**
- A overload sem context (original) ainda retorna `StrokeAnimation | null` — preserva compatibilidade com `speedPaintRenderer.ts`
- A discriminated union existe internamente em `CachedAnimation`, só a API pública que perde o narrow

**Pergunta/Decisão:**
A overload com context deveria retornar `CachedAnimation` (com `kind`) em vez de `StrokeAnimation | VetorialAnimation`? Ou criar duas overloads separadas (ex: `getVetorialAnimation` + `getMaskAnimation`)?

**Confidence:** 95

---

### GAP-02 | 🔹 BAIXO (Sugestão) | Potencial confusão semântica

**Descrição:**
`pathomit = 8` é usado em dois níveis com significados potencialmente diferentes:
1. Como opção do `imagetracerjs` — filtra paths por **pixels** na imagem original
2. Como filtro pós-`getLength()` — filtra paths por **unidades SVG** (escala diferente)

O mesmo valor numérico `8` serve para dois conceitos que podem não ser equivalentes dependendo da relação entre resolução da imagem e escala do SVG.

**Evidência:**
- `vectorizer.ts:46` — `const DEFAULT_PATHOMIT = 8`
- `vectorizer.ts:211` — `ImageTracer.imagedataToSVG(imageData, { preset, pathomit })` (pixels)
- `vectorizer.ts:241` — `if (length < pathomit) continue;` (unidades SVG)

**Impacto:** Baixo. Na prática, pode estar funcionando, mas a semântica não está documentada e pode causar surpresas com imagens de resoluções muito diferentes.

**Mitigações verificadas:**
Nenhuma — não há documentação explicando a diferença de unidades.

**Pergunta/Decisão:**
Renomear para dois valores distintos (ex: `svgPathomit` vs `imagePathomit`) ou documentar que é coincidência? Pode ser tratado na Fase 5 (polish).

**Confidence:** 85 (rebaixado de BAIXO para SUGESTÃO)

---

### GAP-03 | ⚠️ ATENÇÃO | Desalinhamento entre Fases 1 e 2

**Descrição:**
`PaintingJob.animation` é tipado como `StrokeAnimation | undefined` — não aceita `VetorialAnimation`. A Fase 2 precisará armazenar o resultado do vectorizer no job, mas o tipo atual impede.

A Fase 1 propositalmente não modificou `PaintingJob` (escopo aditivo), mas sem essa preparação a Fase 2 encontrará um erro de tipo na primeira tentativa de armazenar o resultado do vectorizer.

**Evidência:**
- `src/features/speed-paint/types.ts:40` — `animation?: StrokeAnimation;`
- Nenhuma união com `VetorialAnimation` presente

**Impacto:** Bloqueio na Fase 2 se não for resolvido antes ou durante. A Fase 2 quebrará typecheck.

**Mitigações verificadas:**
Nenhuma — não há campo alternativo para armazenar animação vetorial.

**Recomendação:** Resolver na Fase 2 (mudar `PaintingJob.animation` para `StrokeAnimation | VetorialAnimation | undefined`), mas documentar no tracker para o executor não ser pego de surpresa.

**Confidence:** 90

---

### GAP-04 | ✅ NÃO-ISSUE (Descartado) | `VetorialAnimation` tem campos extras não-planejados

**Descrição:** `VetorialAnimation` inclui `canvasColor` e `totalDurationMs` que não estão no plano §6.1:391.

**Análise:** `canvasColor` veio da Premissa #14 do tracker (decisão documentada). `totalDurationMs` é consistente com `StrokeAnimation` (modo máscara). Campos extras benéficos e intencionais.

**Veredito:** Descartado — campos extras documentados e consistentes.

---

## 4. Critérios do Gate (Tracker §Fase 1.5)

| Critério | Status | Evidência |
|----------|--------|-----------|
| Zero uso de `any` | ✅ OK | 0 ocorrências nos 6 arquivos auditados |
| `renderMode` default = `'mask'` | ✅ OK | `animationStore.ts:19` — `DEFAULT_RENDER_MODE: SpeedPaintRenderMode = 'mask'` |
| `vetorialPreset` default = `'artistic1'` | ✅ OK | `animationStore.ts:22` — `DEFAULT_VETORIAL_PRESET: VetorialPreset = 'artistic1'` |
| Comportamento mask inalterado | ✅ OK | Nada removido, campos aditivos, resets incluem novos campos |
| Tipos explícitos | ✅ OK | Todas as interfaces e tipos são explícitos |
| `vectorizeImage` suporta `AbortSignal` | ✅ OK | `ensureNotAborted()` + checagem a cada 50 paths |
| `vectorizeImage` compatível com Worker | ✅ OK | Parser regex puro, sem `DOMParser` |
| Comentários em pt-BR | ✅ OK | Todos os 6 arquivos |
| Imports circulares | ✅ OK | Re-export em `types.ts` quebra ciclo |
| Discriminated union no cache | ⚠️ Parcial | `CachedAnimation` é discriminated union internamente, mas API pública perde o narrow (GAP-01) |

---

## 5. Status Final

### ✅ **Pronto com ressalvas**

**Motivo:** GAP-01 precisa ser resolvido antes da Fase 2 usar a overload com context do cache. GAP-03 precisa de decisão antes da Fase 2. GAP-02 é sugestão opcional.

### Próximos Passos Recomendados

1. **Corrigir GAP-01 (antes da Fase 2):** Fazer `getStrokeAnimation()` com context retornar `CachedAnimation` em vez de `StrokeAnimation | VetorialAnimation`, ou criar overloads separadas com tipo de retorno específico. Correção de ~5 linhas.

2. **Documentar GAP-03 para executor da Fase 2:** Adicionar nota no tracker que `PaintingJob.animation` precisará ser estendido na Fase 2.1 para aceitar `VetorialAnimation`.

3. **GAP-02 (opcional):** Avaliar se vale a pena separar os dois `pathomit` em constantes distintas ou documentar a diferença de unidades. Deixar para Fase 5.

4. **Próximo passo do plano:** Executar `bun run lint && bun run typecheck && bun run test` para confirmar que a Fase 1 não introduziu regressões (a cargo do orquestrador, não do gap-finder).
