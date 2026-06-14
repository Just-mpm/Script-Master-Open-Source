# Gap Finder — Fase 4 (UI e Integração) — Speed Paint Vetorial

**Data:** 2026-06-14
**Versão alvo:** `0.131.0`
**Tipo:** Auditoria de completude (Fase 4.5 — escopo)
**Arquivos auditados:** 10 (ver §Contexto)

---

## 1. Contexto assumido

Audita a **Fase 4** (UI e Integração) do plano `plano-speed-paint-vetorial-2026-06-14.md` contra o tracker `tracker-speed-paint-vetorial-2026-06-14.md` (§Fase 4:154-183).

A Fase 4 entrega: seletor de modo (Clássico/Desenho) no SpeedPaintPage, persistência em UserSettings, i18n (4 chaves × 3 locales), analytics event, e refinamento UI/UX do seletor.

---

## 2. Mapa rápido

### ✅ Sólido

| Componente | Status | Evidência |
|---|---|---|
| `renderMode` + `setRenderMode` na store Zustand | ✅ OK | `animationStore.ts` L19, L77-78 |
| Seletor ToggleButtonGroup no SpeedPaintPage | ✅ OK | `SpeedPaintPage.tsx` L779-871 |
| i18n: 4 chaves × 3 locales | ✅ OK | `pt-BR.ts` L1427-1430, `en.ts` L1410-1413, `es.ts` L1410-1413 |
| `speed_paint_mode_changed` no AnalyticsEventMap | ✅ OK | `analytics.ts` L93 |
| `speedPaintRenderMode` no `UserSetting` | ✅ OK | `db/types.ts` L99 |
| `speedPaintRenderMode` no `StudioUserSettings` | ✅ OK | `db/user-settings.ts` L37 |
| `saveUserSettings` aceita novo campo | ✅ OK | `db/user-settings.ts` L43-48 (spread `studio`) |
| `loadSpeedPaintRenderMode` / `saveSpeedPaintRenderMode` | ✅ OK | `userSettings.ts` L22-38 |
| `useSyncSpeedPaintRenderMode` hook | ✅ OK | `hook.ts` — carrega no mount, salva com debounce |
| Hook montado no `App.tsx` | ✅ OK | `App.tsx` L31, L53 |
| Acessibilidade: aria-label, aria-describedby, Tooltips | ✅ OK | `SpeedPaintPage.tsx` L807-808, L844-866 |
| Ícones distintos (FormatPaintOutlined / GestureOutlined) | ✅ OK | `SpeedPaintPage.tsx` L851, L864 |
| MUI v9, sem Tailwind | ✅ OK | Todo o componente |
| Glow no ativo, tokens de marca | ✅ OK | `SpeedPaintPage.tsx` L826-835 |

### ❌ Frágil / Ausente

| Componente | Status | Evidência |
|---|---|---|
| **`trackAnalyticsEvent('speed_paint_mode_changed')` nunca é chamado** | ❌ **GAP** | `handleRenderModeChange` (L297-303) só chama `setRenderMode()`. Zero chamadas a `trackAnalyticsEvent` para este evento em todo o código-fonte. |
| Tipo `SpeedPaintRenderMode` duplicado | ⚠️ Atenção | Definido em `types/vetorial.ts` L22 e **redefinido** em `userSettings.ts` L16 em vez de importado. |

---

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/Decisão |
|---|---|---|---|---|---|---|---|
| **GAP-01** | **ALTO** | Fluxo incompleto | 95 | `trackAnalyticsEvent('speed_paint_mode_changed', { mode })` **nunca é chamado**. O evento está tipado no `AnalyticsEventMap` (analytics.ts L93), mas `handleRenderModeChange` no SpeedPaintPage.tsx (L297-303) só atualiza a store sem disparar analytics. `supergrep_find` e `grep` confirmam zero chamadas em toda a codebase. | `SpeedPaintPage.tsx` L297-303 — handler sem `trackAnalyticsEvent`; `analytics.ts` L93 — definição isolada; `supergrep_find "trackAnalyticsEvent.*speed_paint_mode"` → 0 matches | O evento não é chamado em nenhum subscriber, middleware ou outro lugar. Não há ErrorBoundary ou wrapper que dispare analytics automaticamente. | **Inserir `trackAnalyticsEvent('speed_paint_mode_changed', { mode: newMode })` no `handleRenderModeChange`** antes ou depois de `setRenderMode(newMode)`. |
| **GAP-02** | **BAIXO** | Desalinhamento cosmético | 85 | `SpeedPaintRenderMode` definido em 2 lugares: `types/vetorial.ts` L22 (canonical) e `userSettings.ts` L16 (duplicata). Ambos têm a mesma definição (`'mask' \| 'vetorial'`), mas `userSettings.ts` deveria importar de `../types` em vez de redefinir. Viola DRY. | `types/vetorial.ts` L22: `export type SpeedPaintRenderMode = 'mask' \| 'vetorial';`; `userSettings.ts` L16: redefinição idêntica; `types.ts` L58-63 re-exporta de `vetorial.ts` | A duplicata tem o mesmo tipo literal, então não quebra. Mas se o tipo evoluir (ex: adicionar `'hybrid'`), um dos dois ficará dessincronizado. | Refatorar `userSettings.ts` para importar o tipo de `../../types` (ou `../types`) e remover a definição local. |

---

## 4. Cenários de borda sem resposta

| Cenário | Impacto | Nota |
|---|---|---|
| Visitante (sem login) muda para modo vetorial, sai e volta | A preferência é perdida (volta a `'mask'`) | **Documentado** no hook (`useSyncSpeedPaintRenderMode.ts` L8-9): *"Apenas para usuários logados"*. Decisão intencional — default `mask` é seguro para anônimos. |
| Dois dispositivos com usuário logado mudam modo simultaneamente | Último write vence (sem conflito) | `merge: true` no Firestore + debounce de 2s. Risco baixo. |
| Falha no save do UserSettings (offline) | Store mantém o valor escolhido, mas reload perde | Hook loga `warn`/`error` via `createLogger`. O user experience é que a preferência reverte ao default. Cenário aceitável. |

---

## 5. Checklist de sanidade

- [✅] `renderMode` e `setRenderMode` na store (animationStore.ts)
- [✅] Seletor MUI ToggleButtonGroup no SpeedPaintPage
- [✅] Keyboard accessible (MUI nativo + aria-label + aria-describedby + Tooltips)
- [✅] Ícones distintos por modo (FormatPaintOutlined / GestureOutlined)
- [✅] Glow/estilo visual consistente com tema do projeto
- [✅] 4 chaves i18n × 3 locales no namespace `speedPaint`
- [✅] `speed_paint_mode_changed` tipado no `AnalyticsEventMap`
- [❌] **`trackAnalyticsEvent('speed_paint_mode_changed', ...)` NUNCA é chamado** ← GAP-01
- [✅] `speedPaintRenderMode` no `UserSetting` e `StudioUserSettings`
- [✅] `loadSpeedPaintRenderMode` / `saveSpeedPaintRenderMode` implementados
- [✅] `saveSpeedPaintRenderMode` preserva `customSystemPrompt` (merge com Firestore)
- [✅] `useSyncSpeedPaintRenderMode` montado no `App.tsx`
- [✅] Persistência em Firestore (logado) + IndexedDB (mecanismo pronto)

---

## 6. Status final

| Critério do Gate | Status |
|---|---|
| i18n completo nos 3 locales | ✅ OK |
| Persistência funciona após reload | ✅ OK |
| Analytics dispara corretamente | ❌ **GAP-01** — evento nunca é disparado |
| Confirmação de seletor acessível | ✅ OK |

### Status: ⚠️ Ressalvas

**GAP-01 (ALTO)** impede que o analytics funcione. O evento `speed_paint_mode_changed` está definido mas nunca é disparado. O `handleRenderModeChange` no SpeedPaintPage.tsx precisa chamar `trackAnalyticsEvent('speed_paint_mode_changed', { mode: newMode })`.

**GAP-02 (BAIXO)** — duplicação do tipo `SpeedPaintRenderMode`. Violação DRY não bloqueante.

### Próximos passos

1. **Corrigir GAP-01**: Adicionar `trackAnalyticsEvent('speed_paint_mode_changed', { mode: newMode })` dentro de `handleRenderModeChange` em `SpeedPaintPage.tsx` (antes ou depois de `setRenderMode(newMode)`).
2. **Corrigir GAP-02**: Refatorar `userSettings.ts` para importar o tipo de `../types` em vez de redefinir.
3. Rodar `bun run lint && bun run typecheck && bun run test` após correções.
4. Avançar para **Fase 5** (Validação e Polish) após aprovação do gate.
