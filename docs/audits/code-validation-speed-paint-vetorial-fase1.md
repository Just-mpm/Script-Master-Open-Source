# Auditoria de Código — Fase 1 (Fundação Vetorial)

**Data:** 2026-06-14
**Agent:** code-validator
**Escopo:** 6 arquivos (3 novos, 3 modificados) da Fase 1 do plano `plano-speed-paint-vetorial-2026-06-14.md`.

---

## 1. Escopo da Revisão

| Arquivo | Status | Linhas |
|---------|--------|--------|
| `src/features/speed-paint/types/vetorial.ts` | Novo | 88 |
| `src/features/speed-paint/lib/vectorizer.ts` | Novo | 253 |
| `src/types/imagetracerjs.d.ts` | Novo | 83 |
| `src/features/speed-paint/types.ts` | Modificado | 51 |
| `src/features/speed-paint/store/animationStore.ts` | Modificado | 196 |
| `src/features/video-render/lib/strokeCache.ts` | Modificado | 237 |

**Focos cobertos:** Tipagem, SOLID, Clean Code, Padrões do Projeto, Performance (Fase 1), Riscos Técnicos.

---

## 2. Veredito

**⚠️ Aprovado com ressalvas**

Nenhum blocker encontrado. Os issues identificados são **WARNING** (deve ser corrigido em breve, não bloqueia merge) e **INFO** (melhoria). O código segue os padrões do projeto com excelente qualidade geral.

---

## 3. Achados Priorizados

### [WARNING] Type assertion `as` em `setStrokeAnimation` — narrowing falso

- **Arquivo:** `src/features/video-render/lib/strokeCache.ts:205,208`
- **Confidence:** 92/100
- **Categoria:** TypeScript
- **Problema:** Uso de `as VetorialAnimation` e `as StrokeAnimation` para construir a união discriminada `CachedAnimation`. Type assertions são removidas em compile-time e **não têm verificação em runtime** (confirmado pelo NotebookLM TypeScript Guide). Se o caller inverter o tipo da animação em relação ao `mode`, o erro passa silenciosamente.
- **Evidência:**

```typescript
const data: CachedAnimation =
  mode === 'vetorial'
    ? {
        kind: 'vetorial',
        animation: animation as VetorialAnimation,  // ← type assertion
        preset: preset ?? DEFAULT_VETORIAL_PRESET,
      }
    : { kind: 'mask', animation: animation as StrokeAnimation };  // ← type assertion
```

- **Impacto:** Se `mode === 'vetorial'` e `animation` for `StrokeAnimation`, o cache armazenará uma entrada com `kind: 'vetorial'` e `animation` do tipo errado. O erro só apareceria em runtime ao consumir o cache — sem warning do compilador.
- **Sugestão:** Substituir por **function overloads** que correlacionam o tipo de `animation` ao `mode` na assinatura:

```typescript
// Overloads
export async function setStrokeAnimation(
  imageUrl: string,
  animation: VetorialAnimation,
  context: { mode: 'vetorial'; preset?: VetorialPreset },
): Promise<void>;
export async function setStrokeAnimation(
  imageUrl: string,
  animation: StrokeAnimation,
  context?: { mode?: 'mask'; preset?: never },
): Promise<void>;
// Implementação usa narrowing real no parâmetro união
```

Isso elimina a necessidade de `as` e força o compilador a validar o par.

---

### [INFO] `vectorizeImage` com 59 linhas — acima do limite de 20

- **Arquivo:** `src/features/speed-paint/lib/vectorizer.ts:190-252`
- **Confidence:** 88/100
- **Categoria:** Architecture (Clean Code)
- **Problema:** A função `vectorizeImage` tem ~45 linhas de corpo efetivo (excluindo JSDoc e comentários), excedendo o limite de 20 linhas do projeto. Ela mistura duas responsabilidades: (1) validação + chamada à lib externa + parse, e (2) enriquecimento com `getLength()` + filtro `pathomit`.
- **Evidência:** Linhas 229-250 (loop de enriquecimento) poderiam ser extraídas para um helper `enrichPaths(parsed, ...)`.
- **Impacto:** Baixo — a função é legível e bem comentada. A violação é da regra de 20 linhas, mas não afeta manutenibilidade significativamente.
- **Sugestão:** Extrair o loop de enriquecimento (linhas 229-250) para uma função auxiliar:

```typescript
function enrichPaths(
  parsed: ParsedPath[],
  pathomit: number,
  strokeWidth: number,
  defaultColor: string,
  signal?: AbortSignal,
): VetorialPath[] {
  // ... loop com getLength() e filtro
}
```

---

### [INFO] Ternário redundante em `getStrokeAnimation`

- **Arquivo:** `src/features/video-render/lib/strokeCache.ts:160`
- **Confidence:** 95/100
- **Categoria:** Architecture (Clean Code)
- **Problema:** Ambos os branches do ternário retornam o mesmo valor:

```typescript
return entry.data.kind === 'mask' ? entry.data.animation : entry.data.animation;
```

O TypeScript já infere `StrokeAnimation | VetorialAnimation` de `entry.data.animation` — o discriminante `kind` está no `entry.data`, não no `entry.data.animation`. O ternário não adiciona narrowing.
- **Impacto:** Código morto — sem efeito colateral, mas polui a leitura.
- **Sugestão:** Simplificar para `return entry.data.animation;`

---

### [INFO] Comentário incorreto sobre "narrowing" em `strokeCache.ts`

- **Arquivo:** `src/features/video-render/lib/strokeCache.ts:199-200`
- **Confidence:** 90/100
- **Categoria:** Architecture
- **Problema:** O comentário diz `"narrowar — não é any, é narrowing seguro de union → tipo específico"`, mas `as` **não é narrowing**. Narrowing é o que o TypeScript faz automaticamente via type guards (`if`, `switch`, `typeof`, discriminantes). Type assertion (`as`) é um bypass do compilador.
- **Evidência:** NotebookLM TypeScript Guide confirma: "Type assertions are removed by the compiler and won't affect the runtime behavior of your code" e "narrowing is the process of refining types to more specific types than declared".
- **Impacto:** Baixo — o comentário é enganoso sobre a terminologia, mas não afeta execução.
- **Sugestão:** Atualizar o comentário para: `"Type assertion — o runtime check de mode garante a consistência, mas o compilador não valida o tipo da animação contra o modo"`.

---

## 4. O que parece saudável

### Tipagem
- **Zero `any`** em todos os 6 arquivos — apenas menções em comentários
- **Zero `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`**
- **Zero `process.env`**
- **Zero `console.log`** (apenas logger institucional)
- Discriminated union `CachedAnimation` corretamente definida com `kind` como discriminante literal
- `VetorialPreset` com todos os 16 valores da lib (exaustivo)
- `VetorialPath` e `VetorialAnimation` com campos explícitos pré-calculados

### SOLID
- **SRP respeitado:** cada função/helper em `vectorizer.ts` tem 1 responsabilidade clara
- **OCP:** `VectorizeOptions` permite estender sem modificar a função (abstração via objeto)
- **DIP:** opções como abstração (`VectorizeOptions`), não valores concretos

### Clean Code
- Nomes significativos (`DEFAULT_PRESET`, `DEFAULT_PATHOMIT`, `ensureNotAborted`, `parseSvgPaths`)
- Funções helpers < 20 linhas (5 de 6 funções no `vectorizer.ts`)
- Constantes nomeadas em vez de magic numbers (`ABORT_CHECK_INTERVAL`, `MAX_CACHE_SIZE`)
- `DOMException('AbortError')` para cancelamento (padrão correto do DOM)

### Performance
- Regex `PATH_TAG_REGEX` e `FILL_ATTR_REGEX` compiladas no escopo do módulo (1 vez)
- `getLength()` pré-calculado no vetorizador, não no render
- Checagem de abort a cada 50 paths (`ABORT_CHECK_INTERVAL`) — overhead mínimo
- `lastIndex` resetado defensivamente na regex global

### Padrões do Projeto
- `createLogger('vectorizer')` e `createLogger('strokeCache')` com import relativo
- Comentários em pt-BR
- Re-exports em `types.ts` com nota explicativa (evitar import circular)
- `as const` para `DEFAULT_CANVAS_COLOR` — narrowing correto de tipo literal

### Tratamento de Edge Cases
- Validação de `ImageData` antes de chamar `imagetracerjs` (`isValidImageData`)
- SVG vazio → `log.warn` + `return []` (sem crash)
- `crypto.subtle` indisponível → fallback silencioso (cache ignorado)
- AbortSignal com verificação periódica durante loop longo

---

## 5. Limites da Revisão

- **Não cobre:** completude/escopo da Fase 1 (responsabilidade do gap-finder), testes, lint/typecheck em tempo real, segurança, comportamento em runtime.
- **Não verificado:** se todos os callers de `setStrokeAnimation` passam o tipo correto de animação — isso será implementado na Fase 2.
- **Não verificado:** se o `PaintingJob.animation` deveria ser union `StrokeAnimation | VetorialAnimation` — isso é escopo do gap-finder (Fase 2).
- **Imagetracerjs.d.ts:** `pathscan?: boolean` pode divergir do tipo original da lib (que aceita número), mas como é um subset do que usamos, é suficiente.

---

## 6. Checklist de Qualidade

| Critério | Status |
|----------|--------|
| Zero `any` | ✅ Confirmado |
| Zero `@ts-ignore/expect-error/nocheck` | ✅ Confirmado |
| Zero `process.env` | ✅ Confirmado |
| Zero `console.log` nos arquivos alvo | ✅ Confirmado |
| Tipos explícitos em assinaturas públicas | ✅ OK |
| Discriminated unions corretas | ✅ OK (CachedAnimation) |
| Logger com `createLogger` + import relativo | ✅ OK |
| DOMException para AbortError | ✅ OK |
| Comentários em pt-BR | ✅ OK |
| Regex compiladas no escopo do módulo | ✅ OK |
| Pre-cálculo de `getLength()` | ✅ OK |
| Funções < 20 linhas (regra Clean Code) | ⚠️ 1 exceção (`vectorizeImage`) |
| Nenhuma type assertion insegura | ⚠️ 2 ocorrências (`strokeCache.ts`) |

---

## 7. Próximos Passos Recomendados

1. **Resolver type assertions em `strokeCache.ts`** — implementar function overloads para eliminar `as` (prioridade #1).
2. **Extrair helper `enrichPaths` em `vectorizer.ts`** — reduzir `vectorizeImage` para < 20 linhas (baixa prioridade).
3. **Simplificar ternário redundante** em `getStrokeAnimation` (baixa prioridade).
4. **Corrigir comentário** sobre "narrowing" em `strokeCache.ts` (cosmético).
5. **Após correções:** rodar `bun run lint` + `bun run typecheck` + `bun run test` para validação completa.
