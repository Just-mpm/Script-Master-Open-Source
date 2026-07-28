# Auditoria — v0.134.0: Animations, SidebarNavItem, MobileBottomNav, Vitest config

**Data:** 2026-07-28
**Auditor:** Code Validator
**Status:** Ajustes recomendados (0 bloqueadores, 1 sugestão)

---

## 1. Escopo da revisão

| Arquivo | Foco |
|---|---|
| `src/theme/animations.ts` | Novo helper compartilhado — extração do `@keyframes exportDotPulse` |
| `src/components/app/SidebarNavItem.tsx` | Consome `exportDotPulseKeyframes` via spread no `sx` |
| `src/components/app/MobileBottomNav.tsx` | Consome `exportDotPulseKeyframes` + `handleNavigate` sem `useCallback` |
| `vitest.config.ts` | `pool: 'forks'`, `testTimeout: 15000`, `hookTimeout: 20000`, `maxWorkers: '50%'` |

**Investigações conduzidas:**
- Leitura completa dos 4 arquivos (100% do código)
- NotebookLM consultado: **MUI v9** (padrão SxProps com `@keyframes`), **Vitest 4** (pool/timeouts), **React 19** (useCallback)
- Verificações de barrel export, propagação de import, consistência cross-componente
- Análise de impacto: nenhum upstream além dos 2 componentes consumidores

---

## 2. Veredito

**Ajustes recomendados** — 0 bloqueadores, 0 warnings, 1 sugestão de melhoria.

---

## 3. Achados

### [SUGGESTION] Spread de shared SxProps contra recomendação do MUI v9

- **Arquivos:**
  - `src/theme/animations.ts` (definição, ~linha 25-30)
  - `src/components/app/SidebarNavItem.tsx` (consumo, linha 186)
  - `src/components/app/MobileBottomNav.tsx` (consumo, linha 294)
- **Confidence:** 85/100
- **Categoria:** Architecture
- **Problema:** O `exportDotPulseKeyframes` é espalhado dentro de objetos `sx` via operador spread (`...exportDotPulseKeyframes`). O notebook oficial do MUI v9 desaconselha este padrão: *"No, you should avoid spreading `SxProps` using the JavaScript spread operator (`...`)"*. A razão principal é que `SxProps<Theme>` é união de object | array | `(theme) => CSSObject` — se no futuro a constante for refatorada para callback function, o spread quebrará silenciosamente em runtime.
- **Evidência:**

```tsx
// 🔴 Padrão atual (nos dois componentes):
<Box sx={{
  animation: videoIsRendering ? 'exportDotPulse 1.6s ease-in-out infinite' : 'none',
  ...exportDotPulseKeyframes, // spread de SxProps importado
}} />

// ✅ Padrão recomendado (array syntax):
<Box sx={[
  exportDotPulseKeyframes,
  { animation: videoIsRendering ? 'exportDotPulse 1.6s ease-in-out infinite' : 'none' },
]} />
```

- **Impacto:** **Nenhum imediato.** O código funciona corretamente hoje porque `exportDotPulseKeyframes` é um objeto puro (`as const`). O risco é puramente de manutenção futura: uma mudança de assinatura da constante quebraria ambos os componentes simultaneamente.
- **Atenuante:** O codebase já usa spread de SxProps locais (ex: `...itemSx` em `SidebarNavItem.tsx` linha 113). A diferença é que `itemSx` é local ao arquivo, não um shared constant importado — então o risco de refatoração indesejada é menor. Ainda assim, a documentação do MUI v9 recomenda array syntax para todos os casos de shared SxProps.
- **Sugestão:** Substituir o spread por array syntax nos dois componentes:

```tsx
// SidebarNavItem.tsx linha 186
sx={[
  exportDotPulseKeyframes,
  {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: videoIsRendering ? 'primary.main' : 'success.main',
    boxShadow: videoIsRendering
      ? `0 0 0 2px ${APP_SURFACE}, 0 0 8px ${BRAND_PRIMARY_GLOW_SOFT}`
      : `0 0 0 2px ${APP_SURFACE}`,
    animation: videoIsRendering
      ? 'exportDotPulse 1.6s ease-in-out infinite'
      : 'none',
  },
]}
```
(O mesmo padrão se aplica ao `MobileBottomNav.tsx` linha 280-295.)

---

## 4. Validações adicionais (sem achados)

### ✅ `animations.ts` — Estrutura e tipagem corretas

- `as const satisfies SxProps<Theme>` é o padrão oficialmente recomendado pelo MUI v9 (confirmado via notebook). ✅
- `@keyframes exportDotPulse` com `0%, 100%` (scale 1, opacity 1) e `50%` (scale 1.4, opacity 0.7) espelha exatamente o que existia inline nos componentes. ✅
- JSDoc completo com exemplo de uso, rationale e nota sobre o spread. ✅
- Nome da animação (`exportDotPulse`) consistente em ambos os consumidores. ✅
- Import de `@mui/material/styles` correto. ✅

### ✅ `SidebarNavItem.tsx` — Consumo correto

- Import `exportDotPulseKeyframes` de `../../theme/animations` — path relativo correto. ✅
- Spread na posição final do objeto `sx` — compatível com Emotion (keyframes são extraídos independente de posição). ✅
- `exportDotPulseKeyframes` é espalhado incondicionalmente — a `@keyframes` rule existe no CSS mesmo quando `animation: 'none'` (overhead desprezível de ~150 bytes). ✅
- Dimensões/posição do dot (top -2, right -4, 10x10) idênticas ao `MobileBottomNav`. ✅
- `role="status"` com `aria-label` condicional preservado. ✅

### ✅ `MobileBottomNav.tsx` — `handleNavigate` sem `useCallback`

- `useCallback` removido do `handleNavigate` — agora é função comum definida no corpo do componente. ✅
- Usado exclusivamente como `onClick={() => handleNavigate(item.to, item.action)}` — arrow wrapper já cria nova referência a cada render, então `useCallback` era 100% inócuo. ✅
- **Confirmado pelo notebook React 19:** *"useCallback on a simple click handler wrapped in an inline arrow function provides no benefit."* ✅
- `useCallback` ainda importado e usado em 7 outros handlers (`handleMoreClick`, `closeDrawer`, etc.) — sem dead import. ✅
- Comportamento idêntico: mesma assinatura `(to: string, action?: 'feedback')`, mesmas closures, mesmo fluxo. ✅

### ✅ `MobileBottomNav.tsx` — Consumo de `exportDotPulseKeyframes`

- Import e spread idênticos ao `SidebarNavItem`. ✅
- Dot indicator consistente (mesmas dimensões, cores, glow, animation string). ✅
- ARIA labels em pt-BR via i18n (`t('exportCrossRoute.mobileDotActive')` / `t('exportCrossRoute.mobileDotCompleted')`). ✅

### ✅ `vitest.config.ts` — Configuração de pool e timeouts

- `pool: 'forks'` — default do Vitest 4, explicitado para documentação. ✅
- `poolOptions` foi removido no Vitest 4 (confirmado via notebook). ✅
- `maxWorkers` é o substituto correto de `maxThreads`/`maxForks`. ✅
- `maxWorkers: '50%'` — sintaxe de percentual suportada. ✅
- `testTimeout: 15000` e `hookTimeout: 20000` — valores razoáveis para suíte de ~4min/2.5k testes. ✅
- Comentários JSDoc em cada campo documentam a intenção. ✅
- ✅ 2613/2613 testes passando (conforme informado; não re-executado durante auditoria).

### ✅ Barrel export

- `src/theme/` não possui barrel `index.ts` — todos os consumers (24+ arquivos) importam diretamente de `tokens.ts`, `surfaces.ts`, etc. A nova `animations.ts` segue esta convenção. ✅

---

## 5. O que parece saudável

- **Motivação clara:** Extrair o `@keyframes` duplicado reduziu repetição de CSS inline entre os dois componentes, garantindo que o dot pulse tenha exatamente a mesma frequência/amplitude em desktop e mobile.
- **Documentação:** Os JSDoc em `animations.ts` e os comentários nos componentes são descritivos e úteis.
- **Verificações automáticas passando:** lint ✅, typecheck ✅, suíte completa 2613/2613 ✅.
- **Consistência cross-componente:** Dimensões, cores, glow, timing e keyframes idênticos entre SidebarNavItem e MobileBottomNav.

---

## 6. Limites da revisão

- Não foi executada a suíte de testes durante a auditoria (confiado no resultado informado de 2613/2613).
- Não foi verificado visualmente o comportamento do dot pulse em mobile e desktop.
- A propagação de `useCallback` para outros handlers no `MobileBottomNav` não foi alvo de verificação individual — apenas confirmado que `useCallback` permanece em uso e não há dead import.
- O comportamento de RenderController e `useVideoRenderController` não foi re-analisado — assumido como estável.

---

## 7. Gate de saída

- [x] Li o código real completo (4 arquivos, 100% do escopo)
- [x] Cada achado passou pela validação anti-falso-positivo
- [x] Cada achado passou pelo confidence gate numérico (85/100 para a sugestão)
- [x] Achados com confidence < 80 foram descartados (não houve)
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`
- [x] Não existe motivo real para escalar — 0 bloqueadores, 1 sugestão
