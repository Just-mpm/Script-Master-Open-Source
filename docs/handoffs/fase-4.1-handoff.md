# Fase 4.1 — Handoff: Seletor de modo no SpeedPaintPage.tsx

**Você é o agent `worker` da Koda AI Studio.** Sua tarefa é a Fase 4.1 do plano `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`).

## Objetivo

Adicionar **seletor de modo de renderização** (Clássico/Desenho) no `src/pages/SpeedPaintPage.tsx`, dentro da seção de configurações existente. O seletor usa o campo `renderMode` da store Zustand (adicionado na Fase 1.3) e o `setRenderMode` setter.

## Contexto do projeto

- **Stack:** React 19 + Vite 8 + Remotion 4.0.448 + TypeScript 6 + `@remotion/paths` + `imagetracerjs` + Zustand + **MUI v9** (sem Tailwind).
- **Regras:** NUNCA `any`, NUNCA `process.env`, logger `createLogger` (import relativo, NUNCA `@/`), comentários em pt-BR.
- **Convenção i18n:** usar `useLocale()` e `t('namespace.key')` (já em uso no projeto). Namespace: `speedPaint`.
- **Padrão de seção colapsável:** `useCollapsibleSection` + `<StackedHeader>` (já em uso na página, ver `configSection` linha 71).
- **Padrão de ToggleButtonGroup/RadioGroup:** outros lugares do projeto usam MUI v9 (ver `StackedHeader` em `src/components/ui/StackedHeader.tsx`).

## Estado atual

### `src/pages/SpeedPaintPage.tsx` (799 linhas — JÁ EXISTE)

Estrutura:
- Linhas 65-90: selectors da store via `useShallow` (inclui `animationDuration`, `showDrawTool`, `canvasColor`).
- Linhas 91-100: setters via `useShallow` (inclui `setAnimationDuration`, `setShowDrawTool`, `setCanvasColor`).
- Linha 71: `configSection` de `useCollapsibleSection(true)`.
- **Linhas ~400-450 (estimativa):** render da seção de configurações com `StackedHeader`, `Switch` para `showDrawTool`, `ToggleButtonGroup` para `canvasColor`. **O agente deve localizar a seção exata via busca.**

### Store Zustand (Fase 1.3)

`useAnimationStore` tem:
- `renderMode: SpeedPaintRenderMode` (default `'mask'`)
- `vetorialPreset: VetorialPreset` (default `'artistic1'`)
- `setRenderMode: (mode: SpeedPaintRenderMode) => void`
- `setVetorialPreset: (preset: VetorialPreset) => void`

## Tarefas

### 1. Modificar `src/pages/SpeedPaintPage.tsx`

#### 1.1. Adicionar `renderMode` e `vetorialPreset` aos selectors

No bloco `useShallow` que pega `animationDuration, showDrawTool, canvasColor` (linhas 75-89), adicionar:
```typescript
renderMode: s.renderMode,
vetorialPreset: s.vetorialPreset,
```

#### 1.2. Adicionar `setRenderMode` e `setVetorialPreset` aos setters

No bloco `useShallow` que pega setters (linhas 91-100), adicionar:
```typescript
setRenderMode: s.setRenderMode,
setVetorialPreset: s.setVetorialPreset,
```

#### 1.3. Adicionar seletor de modo na UI

Localizar a seção de configurações (provavelmente após `showDrawTool` Switch e antes/depois de `canvasColor` ToggleButtonGroup). Adicionar:

```typescript
{/* Modo de renderização: Clássico (mask) ou Desenho (vetorial) */}
<FormControl component="fieldset" sx={{ width: '100%' }}>
  <FormLabel component="legend">{t('speedPaint.modeLabel')}</FormLabel>
  <ToggleButtonGroup
    value={renderMode}
    exclusive
    onChange={(_, newMode) => {
      if (newMode !== null) {
        setRenderMode(newMode as SpeedPaintRenderMode);
        trackAnalyticsEvent('speed_paint_mode_changed', { mode: newMode });
      }
    }}
    aria-label={t('speedPaint.modeLabel')}
    fullWidth
  >
    <ToggleButton value="mask" aria-label={t('speedPaint.modeClassic')}>
      {t('speedPaint.modeClassic')}
    </ToggleButton>
    <ToggleButton value="vetorial" aria-label={t('speedPaint.modeVetorial')}>
      {t('speedPaint.modeVetorial')}
    </ToggleButton>
  </ToggleButtonGroup>
  <FormHelperText>{t('speedPaint.modeDescription')}</FormHelperText>
</FormControl>
```

**NOTA sobre analytics:** a Fase 4.2 vai adicionar o evento `speed_paint_mode_changed` em `src/lib/analytics.ts`. **NÃO adicione o evento nesta task** — use `trackAnalyticsEvent` apenas se o evento já existir; se não existir, comente essa linha e adicione na Fase 4.2. (OU — mais simples — adicione apenas a UI sem analytics; a Fase 4.2 cuida do evento.)

#### 1.4. Imports necessários

Adicionar no topo do arquivo (junto com os outros imports do MUI):
```typescript
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormHelperText from '@mui/material/FormHelperText';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
```

E para o tipo:
```typescript
import type { SpeedPaintRenderMode } from '../features/speed-paint/types';
```

**NÃO** importar `VetorialPreset` aqui — o seletor de preset (Fase 4.2) é separado.

#### 1.5. Considerar a UX

- O seletor deve ficar **dentro da seção de configurações** existente (a que tem `configSection` collapsible). Não criar nova seção.
- Posicionar entre "Mostrar lápis" e "Cor do canvas" (ou outro lugar lógico que faça sentido na hierarquia de configurações).
- Usar `StackedHeader` se apropriado (subsection header para "Modo de renderização").
- Keyboard accessible: `aria-label` no ToggleButtonGroup + `aria-label` em cada ToggleButton.
- **Padrão visual do projeto:** usar tokens do tema (`BRAND_GRADIENT`, `BRAND_PRIMARY_LIGHT`, etc.) se aplicável. Ver outros ToggleButtonGroup no projeto.

### 2. Verificar que nada quebra

- `bun run typecheck` — 0 erros.
- `bun run lint` — 0 erros/warnings.
- `bun run test tests/speed-paint/animationStore.unit.test.ts` (se existir) — passa.

## Restrições

- **NÃO** modificar outros arquivos além de `src/pages/SpeedPaintPage.tsx`.
- **NÃO** adicionar novas dependências.
- **NÃO** usar `any` / `process.env` / `@/`.
- **NÃO** criar novo componente separado (manter inline na página para esta task — Fase 4.3 com `ui-designer` pode extrair se necessário).
- **NÃO** usar `StackedHeader` se isso mudar a hierarquia drasticamente — apenas adicionar o seletor inline na seção existente.
- **NÃO** alterar a lógica de `resetJob` ou `clearQueue` (Fase 1.3 já cuidou).
- **NÃO** adicionar o seletor de **preset** (`'artistic1'`, `'detailed'`, etc.) nesta task — apenas o seletor de modo (`'mask'` vs `'vetorial'`). O preset pode ser configurado em uma task futura ou na Fase 5 (polish).
- Comentários em pt-BR.

## Detalhes de implementação

### Layout sugerido dentro da seção de configurações

```tsx
<Stack spacing={GAP_DEFAULT}>
  {/* existente: Animation duration (ToggleButtonGroup) */}
  {/* existente: Show draw tool (Switch) */}
  {/* existente: Canvas color (ToggleButtonGroup) */}
  
  {/* NOVO: Modo de renderização */}
  <Box>
    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
      {t('speedPaint.modeLabel')}
    </Typography>
    <ToggleButtonGroup ...>
      <ToggleButton value="mask">...</ToggleButton>
      <ToggleButton value="vetorial">...</ToggleButton>
    </ToggleButtonGroup>
    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.disabled' }}>
      {t('speedPaint.modeDescription')}
    </Typography>
  </Box>
  
  {/* existente: Draw speed (sketch/reveal) */}
</Stack>
```

### Comportamento esperado

- Usuário clica em "Modo Desenho" → `setRenderMode('vetorial')` → `useAnimationStore` atualiza → próxima geração de animação usa `vectorizeImage()`.
- A geração **atual** (se houver job em andamento) não é afetada — o `renderMode` só afeta o PRÓXIMO job (decisão padrão do projeto, similar a outros configs).
- Quando o usuário volta para "Modo Clássico" → `setRenderMode('mask')` → próxima geração usa edge detection.

## Notebooks

- **MUI Docs** — `ToggleButtonGroup`, `ToggleButton`, `FormControl`. Padrão bem conhecido do projeto.
- Não precisa consultar.

## Validação (pronto quando)

- Arquivo `src/pages/SpeedPaintPage.tsx` modificado.
- `bun run typecheck` passa com 0 erros.
- `bun run lint` passa com 0 erros/warnings.
- Seletor de modo aparece na seção de configurações.
- Comportamento: clicar muda `renderMode` na store.
- **NÃO** adicionado `setVetorialPreset` na UI (Fase 5 polish).
- Retorne mensagem final com: (a) resumo das mudanças, (b) saída do `bun run typecheck` e `bun run lint`, (c) decisões de UX relevantes.
