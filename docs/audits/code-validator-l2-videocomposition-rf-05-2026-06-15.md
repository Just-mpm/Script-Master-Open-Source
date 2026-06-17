# Code Validator — Leiva L2 (RF-05): VideoComposition — Type Guard Real

**Data:** 2026-06-15
**Arquivo revisado:** `src/features/video-render/components/VideoComposition.tsx`
**Escopo:** Substituição de `as StrokeAnimation` por type guard real `isVetorialAnimation()` + branch ternário entre `WhiteboardScene` e `SpeedPaintScene`
**Plano:** `docs/plan/speed-paint-vetorial-completo-plano-final.md` (Leiva L2, RF-05)

---

## Veredito

**APROVADO** ✅ — L2 implementa corretamente o type guard real sem `as` bypass, com narrowing type-safe, lint/typecheck/testes passando.

---

## Escopo da Revisão

O que foi lido:
- `src/features/video-render/components/VideoComposition.tsx` — completo (240 linhas)
- `src/features/video-render/components/WhiteboardScene.tsx` — completo (298 linhas)
- `src/features/video-render/components/SpeedPaintScene.tsx` — props e interface
- `src/features/video-render/lib/strokeCache.ts` — completo (315 linhas, type guards)
- `src/features/video-render/types.ts` — completo (143 linhas, `VideoScene.strokeAnimation` união)
- `src/features/speed-paint/types/vetorial.ts` — completo (88 linhas, `VetorialAnimation`)
- `docs/plan/speed-paint-vetorial-completo-plano-final.md` — seções de L2, MDE-01, validações

Focos cobertos: Engenharia/estrutura, Tipos (TypeScript), Riscos técnicos, Performance

---

## Validações Executadas

| Validação | Comando | Resultado |
|-----------|---------|-----------|
| ESLint | `bun x eslint src/features/video-render/components/VideoComposition.tsx` | ✅ 0 erros, 0 warnings |
| TypeScript | `npx tsc -b` | ✅ 0 erros |
| Grep `as StrokeAnimation` | `Select-String -Path "..." -Pattern "as StrokeAnimation"` | ✅ 0 matches |
| Grep `as` geral | `Select-String -Path "..." -Pattern "\bas\b"` | ⚠️ 1 match **pré-existente** (linha 231, `as SpeedPaintSpeed`, não é da L2) |
| Testes unitários | `bun x vitest run tests/video-render/videoComposition.component.test.tsx` | ✅ 16/16 passando (446ms) |

---

## Achados Priorizados

### [CRITICAL] Nenhum — todos os 5 critérios críticos do contract foram atendidos

### [WARNING] Nenhum — sem bugs latentes ou problemas de narrowing

### [SUGGESTION] Cast redundante `as SpeedPaintSpeed` na linha 231 (pré-existente)

- **Arquivo:** `src/features/video-render/components/VideoComposition.tsx:231`
- **Confidence:** 95/100
- **Categoria:** TypeScript
- **Problema:** Cast `as SpeedPaintSpeed` redundante — `speedPaintSpeed` já é do tipo `SpeedPaintSpeed` (default `'normal'` no destructuring da linha 160, prop tipada em `VideoCompositionProps`)
- **Evidência:**
  ```typescript
  // Linha 160: speedPaintSpeed = 'normal' — tipo SpeedPaintSpeed
  // Linha 231:
  globalSpeedMultiplier={
    SPEED_PAINT_MULTIPLIERS[speedPaintSpeed as SpeedPaintSpeed]
    ?? SPEED_PAINT_MULTIPLIERS.normal
  }
  ```
- **Impacto:** Nenhum em runtime. Violação cosmética de CT-S01 (zero `as` bypass). O cast é inócuo mas desnecessário — se `speedPaintSpeed` fosse `string`, o cast esconderia um erro de tipo.
- **Sugestão:** Remover o `as SpeedPaintSpeed`. O código resultante `SPEED_PAINT_MULTIPLIERS[speedPaintSpeed]` é type-safe porque o acesso em `Record<SpeedPaintSpeed, number>` com chave `SpeedPaintSpeed` não precisa de cast.
- **Nota:** Este cast **não faz parte da L2** — é código pré-existente que não foi alterado pela leiva. Incluído por transparência.

---

## Análise Detalhada

### 1. Type guard real, sem `as` bypass (MDE-01, GAP-05, CT-F33, CT-S01) ✅

**Checklist:**
- ✅ `isVetorialAnimation` importado de `../lib/strokeCache` (linha 9)
- ✅ Type predicate: `animation is VetorialAnimation` baseado em `'totalLength' in animation`
- ✅ Narrowing real em compile-time — TypeScript reconhece a guarda e restringe o tipo
- ✅ Zero `as StrokeAnimation` no arquivo
- ✅ Props de `WhiteboardScene` recebem `VetorialAnimation` corretamente (narrowing)
- ✅ Props de `SpeedPaintScene` recebem `StrokeAnimation` corretamente (narrowing inverso)

**Fluxo de narrowing (linhas 83-105):**
```
scene.strokeAnimation?             → StrokeAnimation | VetorialAnimation | undefined
  ├── false (undefined)            → SceneSequence (sem animação)
  └── true (StrokeAnimation | VetorialAnimation)
        ├── isVetorialAnimation()  → WhiteboardScene (narrowed para VetorialAnimation)
        └── else                   → SpeedPaintScene (narrowed para StrokeAnimation)
```

### 2. Branch ternário legível (CT-C10) ✅

O ternário aninhado tem 3 estados e 2 níveis:
```typescript
{scene.strokeAnimation ? (                         // nível 1: tem animação?
  isVetorialAnimation(scene.strokeAnimation) ? (    // nível 2: vetorial?
    <WhiteboardScene ... />
  ) : (
    <SpeedPaintScene ... />
  )
) : (
  <SceneSequence ... />
)}
```

- **Legível**: indentação clara, cada nível representa uma decisão binária
- **Manutenível**: se um 4º modo for adicionado no futuro, refatorar para switch/Map será o movimento correto
- **Performance**: zero re-render desnecessário (memoização por `React.memo` em `SceneItem`)

### 3. Narrowing de props — correto ✅

| Prop | Tipo em runtime | Tipo esperado | Bate? |
|------|----------------|---------------|-------|
| `WhiteboardScene.animation` | `VetorialAnimation` | `VetorialAnimation` | ✅ |
| `WhiteboardScene.canvasColor` | `'white' \| 'black'` (de `VetorialAnimation`) | `CanvasColor` | ✅ |
| `SpeedPaintScene.animation` | `StrokeAnimation` | `StrokeAnimation` | ✅ |

### 4. Possíveis bugs latentes no narrowing

**Risco identificado — shape-based type guard:**
- `isVetorialAnimation` usa `'totalLength' in animation` como discriminador
- Se no futuro `StrokeAnimation` ganhar um campo `totalLength` (mesmo opcional), o type guard passaria a retornar `true` incorretamente
- **Mitigação:** chance baixa (os tipos são estáveis); o mesmo padrão já é usado em `SpeedPaintPlayer` (linha 100-104) com `'paths' in animation`
- **Recomendação:** Se houver refatoração futura, considerar campo `kind` explícito (`'mask' | 'vetorial'`) como discriminador da união — mais seguro e resistente a colisão de shape. Não é necessário agora.

---

## O que parece saudável

- `SceneItem` definido no escopo de módulo (`React.memo`) — evita recriação de referência a cada frame, prevenindo unmount/remount dos componentes de cena
- `isVetorialAnimation` reutiliza a função já exportada de `strokeCache.ts` — sem duplicação de lógica
- `WhiteboardSceneProps.animation` tipado como `VetorialAnimation` (estrito) em vez de `StrokeAnimation | VetorialAnimation` — a discriminação é feita no pai, SRP respeitada
- `useMemo` duplo (`sceneCaptionsMap` + `nextHasSpeedPaintMap`) — pré-computa fora do `SceneItem`, evitando trabalho redundante por cena a cada frame
- Comentário sobre a troca de modo na VideoPage vs SpeedPaintPage (linhas 226-230) — clareza sobre responsabilidade de cada rota

---

## Limites da Revisão

- O type guard shape-based (`'totalLength' in animation`) não foi validado contra NotebookLM do TypeScript — o padrão é canônico (TypeScript narrowing via `in` operator) e já validado em produção em outros pontos do projeto (`SpeedPaintPlayer.tsx:100-104`)
- Não foi possível verificar se `scene.strokeAnimation` em runtime pode ser algo que não seja `StrokeAnimation` nem `VetorialAnimation` — isso dependeria do upstream (`speedPaintService.enhanceScenesWithSpeedPaint`), que não faz parte desta L2
- A revisão não inclui análise de cobertura de código dos testes (threshold ≥80%)

---

## Contratos Verificados

| Contrato | Status | Evidência |
|----------|--------|-----------|
| CT-F31: Type guard real | ✅ | `isVetorialAnimation()` na linha 84, zero `as` para StrokeAnimation |
| CT-F32: Branch ternário funcional | ✅ | 3 ramos: vetorial → mask → estático |
| CT-F33: Sem `as` bypass | ✅ | Grep confirmou 0 `as StrokeAnimation`; único `as` (linha 231) é pré-existente |
| CT-F34: Narrowing correto | ✅ | Props compatíveis nos 3 componentes filhos |
| CT-F35: Testes unitários | ✅ | 16/16 passando |
| CT-S01: Zero `any`/`@ts-ignore`/`as` | ✅ | (exceção: `as SpeedPaintSpeed` pré-existente) |
| CT-C10: Branch legível | ✅ | Máximo 2 níveis, indentação clara |

---

## Veredito Final

**APROVADO** ✅

A Leiva L2 implementa corretamente a RF-05 conforme especificado no plano:
- Type guard real substitui `as StrokeAnimation`
- Branch ternário discrimina corretamente `WhiteboardScene` (vetorial) vs `SpeedPaintScene` (mask)
- Narrowing type-safe em compile-time
- Todas as validações de contrato passam (lint, typecheck, grep, testes)

O único `as` encontrado (`as SpeedPaintSpeed` na linha 231) é **pré-existente** e não faz parte da L2. Registrado como SUGGESTION para limpeza futura.
