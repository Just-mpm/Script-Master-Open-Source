# Fase 4.2 — Handoff: i18n + analytics + persistência em UserSettings

**Você é o agent `worker` da Koda AI Studio.** Sua tarefa é a Fase 4.2 do plano `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`).

## Objetivo

Três entregas paralelas:
1. **i18n:** adicionar 4 chaves no namespace `speedPaint` × 3 locales (pt-BR, en, es).
2. **Analytics:** adicionar evento `speed_paint_mode_changed` em `src/lib/analytics.ts`.
3. **Persistência:** persistir `renderMode` em `UserSettings` (dual storage Firestore/IndexedDB — padrão do projeto).

## Contexto do projeto

- **Stack:** React 19 + Vite 8 + Remotion 4.0.448 + TypeScript 6 + `@remotion/paths` + `imagetracerjs` + Zustand + MUI v9.
- **Regras:** NUNCA `any`, NUNCA `process.env`, logger `createLogger` (import relativo, NUNCA `@/`), comentários em pt-BR.
- **Decisão Matheus 2026-06-14 (Premissa #9):** Persistir `renderMode` em `UserSettings` (dual storage Firestore/IndexedDB — padrão do projeto), NÃO adicionar `persist` middleware no `animationStore`.

## Estado atual

### `src/features/i18n/locales/pt-BR.ts` (linha 1316: namespace `speedPaint`)

Estrutura:
```typescript
speedPaint: {
  durationLabel: '...',
  // ... ~120 chaves
}
```

### `src/features/i18n/locales/en.ts` (linha 1299: namespace `speedPaint`)

Mesma estrutura.

### `src/features/i18n/locales/es.ts` (linha 1299: namespace `speedPaint`)

Mesma estrutura.

### `src/lib/analytics.ts` (281 linhas — JÁ EXISTE)

Tem `AnalyticsEventMap` (linha 44) com 47+ eventos. Eventos existentes relacionados:
```typescript
speed_paint_export_started: ExportParams;
speed_paint_export_completed: ExportParams;
speed_paint_export_failed: ExportParams;
speed_paint_export_cancelled: ExportParams;
speed_paint_downloaded: ExportParams;
```

Adicionar novo:
```typescript
/** Disparado quando o usuário troca o modo de renderização (mask ↔ vetorial) */
speed_paint_mode_changed: { mode: 'mask' | 'vetorial' };
```

`trackAnalyticsEvent` (já exportado) aceita esse evento.

### `src/lib/db/types.ts` (linha 84: `UserSetting`)

Interface:
```typescript
export interface UserSetting {
  id: string;
  userId?: string;
  name?: string;
  role?: string;
  goals?: string[];
  customSystemPrompt: string;
  updatedAt: number;
  tourSeen?: boolean;
  // ... outros campos de estúdio opcionais
}
```

Adicionar:
```typescript
/** Modo de renderização preferido do Speed Paint (Fase 4.2 do plano vetorial). */
speedPaintRenderMode?: 'mask' | 'vetorial';
```

### `src/lib/db/user-settings.ts` (158 linhas — JÁ EXISTE)

Funções públicas:
- `saveUserSettings(customSystemPrompt, userId?, profile?, studio?)` — recebe um objeto `StudioUserSettings` para o estúdio.
- `getUserSettings(userId?)` — retorna `UserSetting | null`.
- `markTourSeen(userId?)` — similar.
- `hasTourSeen(userId?)` — similar.

`StudioUserSettings` (linha 19) tem os campos do estúdio. **Adicionar `speedPaintRenderMode` lá também** para que o `saveUserSettings` aceite o novo campo.

### Hook `useAutoSaveStudioSettings.ts` (Fase 1.3 — JÁ EXISTE, mas não toca em `renderMode`)

O hook atual auto-salva o studioStore no Firestore. **NÃO estender** — o `renderMode` é do `animationStore`, não do studio. Esta task precisa criar um novo hook `useAutoSaveSpeedPaintRenderMode.ts` OU adicionar a persistência inline na `SpeedPaintPage`.

**Decisão recomendada:** criar um novo hook `useSpeedPaintRenderModeSetting.ts` (similar a `useAutoSaveStudioSettings`) que:
- Lê `renderMode` do `useAnimationStore`
- Salva no `UserSettings` via `saveUserSettings` (com debounce 2s)
- Lê do `UserSettings` no mount e atualiza a store

**OU** — mais simples e suficiente para Fase 4.2: criar a função `loadSpeedPaintRenderMode(userId?)` e `saveSpeedPaintRenderMode(mode, userId?)` em `src/features/speed-paint/lib/userSettings.ts` (helper local) e fazer a sincronização via um hook `useSyncSpeedPaintRenderMode` (synchronization one-shot no mount + write on change).

## Tarefas

### 1. i18n — adicionar 4 chaves em 3 locales

#### 1.1. `src/features/i18n/locales/pt-BR.ts`

No namespace `speedPaint` (linha 1316), adicionar no final (antes de `speedLabels: {...}` ou junto com as outras chaves de UI):

```typescript
modeLabel: 'Modo de renderização',
modeClassic: 'Modo Clássico',
modeVetorial: 'Modo Desenho',
modeDescription: 'Clássico: revelação por máscara (rápido, ideal para fotos). Desenho: animação vetorial com paths SVG (mais expressivo, ideal para ilustrações).',
```

#### 1.2. `src/features/i18n/locales/en.ts`

```typescript
modeLabel: 'Render mode',
modeClassic: 'Classic Mode',
modeVetorial: 'Drawing Mode',
modeDescription: 'Classic: mask reveal (fast, ideal for photos). Drawing: vector animation with SVG paths (more expressive, ideal for illustrations).',
```

#### 1.3. `src/features/i18n/locales/es.ts`

```typescript
modeLabel: 'Modo de renderización',
modeClassic: 'Modo Clásico',
modeVetorial: 'Modo Dibujo',
modeDescription: 'Clásico: revelación por máscara (rápido, ideal para fotos). Dibujo: animación vectorial con paths SVG (más expresivo, ideal para ilustraciones).',
```

### 2. Analytics — adicionar evento em `src/lib/analytics.ts`

No `AnalyticsEventMap` (interface, linha 44), adicionar (junto com os outros `speed_paint_*`):

```typescript
/**
 * Disparado quando o usuário troca o modo de renderização do Speed Paint
 * (mask ↔ vetorial). Usado para entender qual modo é mais popular.
 *
 * Modos:
 * - 'mask' — revelação por máscara (edge detection + reveal)
 * - 'vetorial' — animação vetorial com paths SVG animados
 */
speed_paint_mode_changed: { mode: 'mask' | 'vetorial' };
```

**NÃO** modificar `trackAnalyticsEvent` (já é genérico).

### 3. UserSettings — adicionar campo em `src/lib/db/types.ts`

Na interface `UserSetting` (linha 84), adicionar (junto com `tourSeen`):

```typescript
/**
 * Modo de renderização preferido do Speed Paint.
 * Default: 'mask' (retrocompatibilidade com projetos existentes).
 * Sincronizado via dual storage (Firestore/IndexedDB) pelo padrão do projeto.
 */
speedPaintRenderMode?: 'mask' | 'vetorial';
```

### 4. `StudioUserSettings` em `src/lib/db/user-settings.ts`

Na interface `StudioUserSettings` (linha 19), adicionar:

```typescript
/** Modo de renderização preferido do Speed Paint (Fase 4.2). */
speedPaintRenderMode?: 'mask' | 'vetorial';
```

### 5. Criar `src/features/speed-paint/lib/userSettings.ts`

Helper local com 2 funções:

```typescript
/**
 * Helpers de persistência do `renderMode` em UserSettings.
 * Usa o padrão dual storage (Firestore logado / IndexedDB visitante).
 */

import { getUserSettings, saveUserSettings } from '../../../lib/db';
import type { UserSetting } from '../../../lib/db/types';

export type SpeedPaintRenderMode = 'mask' | 'vetorial';

/** Lê o `speedPaintRenderMode` do UserSettings. Retorna undefined se não estiver salvo. */
export async function loadSpeedPaintRenderMode(userId?: string): Promise<SpeedPaintRenderMode | undefined> {
  const settings = await getUserSettings(userId);
  return settings?.speedPaintRenderMode;
}

/** Salva o `speedPaintRenderMode` no UserSettings (merge com campos existentes). */
export async function saveSpeedPaintRenderMode(
  mode: SpeedPaintRenderMode,
  userId?: string,
): Promise<void> {
  // saveUserSettings aceita studio como 4o param — passa o campo lá
  await saveUserSettings('', userId, undefined, { speedPaintRenderMode: mode });
}
```

### 6. Criar `src/features/speed-paint/hooks/useSyncSpeedPaintRenderMode.ts`

Hook que sincroniza o `renderMode` da store com `UserSettings`:

```typescript
import { useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAnimationStore } from '../store/animationStore';
import { loadSpeedPaintRenderMode, saveSpeedPaintRenderMode } from '../lib/userSettings';
import { createLogger } from '../../../lib/logger';

const log = createLogger('useSyncSpeedPaintRenderMode');
const DEBOUNCE_MS = 2000;

/**
 * Sincroniza `renderMode` da store com UserSettings (dual storage).
 * - No mount: lê o valor salvo e atualiza a store.
 * - Em mudanças: salva com debounce.
 *
 * Padrão: análogo a `useAutoSaveStudioSettings` (Fase 1.3).
 */
export function useSyncSpeedPaintRenderMode(): void {
  const user = useAuth().user;
  const userId = user?.uid;
  const hasLoadedRef = useRef(false);

  // Carrega do UserSettings no mount (uma vez)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    void loadSpeedPaintRenderMode(userId)
      .then((mode) => {
        if (mode) {
          useAnimationStore.getState().setRenderMode(mode);
        }
      })
      .catch((err: unknown) => log.warn('Falha ao carregar renderMode do UserSettings', { error: err }));
  }, [userId]);

  // Salva com debounce quando muda
  useEffect(() => {
    if (!userId) return; // visitante: sem persistência por enquanto
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsub = useAnimationStore.subscribe((state, prevState) => {
      if (state.renderMode === prevState.renderMode) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void saveSpeedPaintRenderMode(state.renderMode, userId).catch((err: unknown) =>
          log.error('Falha ao salvar renderMode no UserSettings', { error: err }),
        );
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [userId]);
}
```

### 7. Montar o hook em `App.tsx`

Localizar `App.tsx` e adicionar o hook (junto com `useAutoSaveStudioSettings`):

```typescript
import { useSyncSpeedPaintRenderMode } from './features/speed-paint/hooks/useSyncSpeedPaintRenderMode';

// Dentro do componente App, próximo dos outros hooks de auto-save:
useSyncSpeedPaintRenderMode();
```

## Restrições

- **NÃO** usar `any` / `process.env` / `@/`.
- Comentários em pt-BR.
- **NÃO** criar mais de 3 arquivos novos (`userSettings.ts` + `useSyncSpeedPaintRenderMode.ts` + (opcional) modificações em arquivos existentes).
- **NÃO** modificar a interface pública de `saveUserSettings` / `getUserSettings` (apenas estender `StudioUserSettings` com o novo campo).
- **NÃO** usar `persist` middleware no Zustand (decisão Matheus).
- **NÃO** modificar `useAutoSaveStudioSettings.ts` (este hook é para o estúdio, não para o Speed Paint).

## Detalhes de implementação

### Sobre o `saveUserSettings` existente

A função `saveUserSettings` (linha 41) já tem o parâmetro `studio?: StudioUserSettings` que faz merge via `...(studio !== undefined ? studio : {})`. Adicionar `speedPaintRenderMode` em `StudioUserSettings` faz com que o save funcione automaticamente — o caller passa `{ speedPaintRenderMode: mode }` no 4o parâmetro e o Firestore/IndexedDB faz `merge: true`.

### Sobre o IndexedDB no visitante

Visitante (sem `userId`) também deve ter o `renderMode` persistido — `saveUserSettings` já cuida disso via `putIndexedDbItem` quando `userId` é undefined. A persistência funciona em ambos os casos.

### Sobre o debounce

2 segundos é o mesmo padrão de `useAutoSaveStudioSettings` (DEBOUNCE_MS = 2000). Suficiente para evitar escritas excessivas.

## Notebooks

Não aplicável.

## Validação (pronto quando)

- 3 locales atualizados com 4 chaves cada (pt-BR, en, es).
- Evento `speed_paint_mode_changed` tipado em `AnalyticsEventMap`.
- Campo `speedPaintRenderMode` em `UserSetting` e `StudioUserSettings`.
- Arquivos novos: `src/features/speed-paint/lib/userSettings.ts`, `src/features/speed-paint/hooks/useSyncSpeedPaintRenderMode.ts`.
- `App.tsx` modificado para montar o hook.
- `bun run typecheck` — 0 erros.
- `bun run lint` — 0 erros/warnings.
- Retorne mensagem final com: (a) resumo das mudanças, (b) saída do `bun run typecheck` e `bun run lint`, (c) decisões relevantes.
