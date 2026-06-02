# Gaps — `video-render-survive-navigation`

**Data:** 2026-06-02
**Origem:** Revisão adversarial pós-architecture.
**Status:** Pendente de sign-off do usuário (3 perguntas) e ajustes no plano (3 CRÍTICOS, 5 IMPORTANTES, 5 MENORES).

---

## Sumário executivo

O plano está **funcionalmente completo** e cobre os 13 RFs + 7 RNFs. A arquitetura está coerente e os módulos M1–M9 são viáveis. **Porém**, 3 lacunas CRÍTICAS exigem ajuste ANTES de partir para implementação, e 5 perguntas exigem decisão do usuário Matheus.

**Recomendação:** Responder as 5 perguntas → ajustar 3 CRÍTICOS no `base.md` e `architecture.md` → seguir para implementação.

---

## Lacunas CRÍTICAS (3)

### [CRÍTICO] LAC-001: M5 substitui vs. permanece — contradição entre base plan e architecture

- **Localização:** `base.md §3 M5 linha 105` vs `architecture.md §3 M5 linha 619`
- **Descrição:** O `base.md` diz que M5 "substitui" o `beforeunload` inline em `AudioGenerationHandler.tsx:163-173`. A `architecture.md` diz que o inline "permanece" porque cobre `isGenerating` (áudio). Comportamentos opostos.
- **Impacto:** Implementação pode duplicar listeners, ou M5 não ser instalado se alguém seguir a architecture.
- **Sugestão:** Decidir explicitamente: ou M5 cobre TUDO (áudio + vídeo + speed paint) e o inline é removido, OU M5 cobre apenas vídeo/speed paint e o inline permanece. **Recomendação: architecture tem razão** — M5 foca em vídeo/speed paint, inline do áudio permanece. Atualizar `base.md §3 e §6 (passo 4)`.

### [CRÍTICO] LAC-002: M5 depende de M2 (linha 187 da architecture), mas PR1 (M9+M1+M3+M5+M6) não inclui M2

- **Localização:** `architecture §3 M5 "Dependências: M1, M2"` (linha 187); `base.md §5 "Recomendação: M9 + M1 + M3 + M5 + M6 em um PR"` (linha 210)
- **Descrição:** M5 lê `speedPaintRenderController.getState().isRendering`. Se M2 não existe no PR1, a chamada retorna `false` (default), o que é OK em runtime mas é uma dependência implícita.
- **Impacto:** PR1 falha ao compilar se M2 não for stubado, OU M5 não funciona para speed paint até PR2.
- **Sugestão:** Criar arquivo stub de M2 (vazio, com `isRendering: false` no estado inicial) já no PR1. M2 "real" vem no PR2.

### [CRÍTICO] LAC-003: M3 (refactor de `useVideoExporter`) — `startRender` body é elidido

- **Localização:** `architecture §3 M3` (linhas 423-522) e `base.md §3 M3` (linhas 82-91)
- **Descrição:** O `base.md` diz que M3 vira "fachada fina ~80 linhas" e delega para M1. Mas o `useVideoExporter.tsx` original (523 linhas) tem **~260 linhas de lógica de negócio em `startRender`** (fase de speed paint, mapping, error handling, save to project). A architecture M1 tem "...monta composition, chama `renderMediaOnWeb`..." (linha 276) — elide o resto. A migração precisa copiar ~250 linhas para M1, mas o plano não documenta isso.
- **Impacto:** Worker pode interpretar errado e duplicar lógica entre M1 e M3, ou perder comportamento (`saveVideoToProject`, `speedPaintWarnings`).
- **Sugestão:** Documentar explicitamente: **"M1.startRender encapsula a lógica completa de render (speed paint phase + renderMediaOnWeb + getBlob + save to project). M3.startRender apenas calcula resolução e chama M1."**

---

## Lacunas IMPORTANTES (5)

### [IMPORTANTE] LAC-004: Race condition em `getBlob()` com `currentRenderId` check

- **Localização:** `architecture §3 M1` (linhas 295-302)
- **Descrição:** Quando `startRender` é chamado 2× rapidamente, `currentRenderId` é incrementado. Render #1 chama `await result.getBlob()`. Se o `getBlob()` de #1 resolver DEPOIS do `getBlob()` de #2, o check `if (currentRenderId !== renderId)` vai revogar a URL do #2.
- **Impacto:** Em condições extremas (cancelamento + restart rápido), o blob do novo render pode ser revogado por engano. Usuário perde o vídeo.
- **Sugestão:** Capturar a URL no closure local do `startRender` (não em `set()`), e só revogar a URL local.

### [IMPORTANTE] LAC-005: Snapshot M8 em localStorage não lida com múltiplas abas

- **Localização:** `base.md §3 M8` (linhas 132-140); `requirements RF-013` (linhas 206-213)
- **Descrição:** O snapshot é global (chave `s2a_active_render`). Se o usuário abre 2 abas e inicia render em #1, a aba #2 lê o snapshot e mostra "Renderização interrompida" — mesmo que #1 ainda esteja renderizando.
- **Impacto:** UX ruim em power users com múltiplas abas. Banner aparece indevidamente.
- **Sugestão:** Incluir `tabId` no snapshot (gerado por `crypto.randomUUID()` salvo em `sessionStorage` por aba). Filtrar snapshots de outras abas. **Ou** documentar como limitação aceitável.

### [IMPORTANTE] LAC-006: Ordem de migração do ToastManager — janela com 2 toasts

- **Localização:** `base.md §6 "Passo 5"` (M6, 2h) e §6 (linha 210 PR1); `architecture §14 "deliverables"` (linha 1164)
- **Descrição:** M6 é o novo cross-route toast (top-center). O antigo no `ToastProvider.tsx:52-94` é bottom-center. Se M6 for adicionado PRIMEIRO em `App.tsx` e o antigo não for removido na mesma PR, o usuário vê 2 toasts simultâneos.
- **Impacto:** Durante o PR, usuário vê 2 toasts. Confuso.
- **Sugestão:** Passo 5 do §6 deve incluir explicitamente: "Remover Snackbar de `ToastProvider.tsx:52-94` (ou fazer `useExportingVideo` ficar `false` via M1). Editar o mesmo arquivo no mesmo commit."

### [IMPORTANTE] LAC-007: Analytics `video_export_completed_offroute` — timing + source

- **Localização:** `architecture §12` (linhas 1108-1129)
- **Descrição:** O evento proposto usa `window.location.pathname` no controller. Funciona, mas: (1) timing relativo a `set({ status: 'completed' })` não está documentado — se for emitido antes, a UI pode ainda estar mostrando "rendering"; (2) usar `window.location.pathname` em vez de algo subscrito via `history.listen()` é frágil em casos extremos (browser back/forward).
- **Impacto:** Analytics fora de ordem, ou emitido com rota errada.
- **Sugestão:** Emitir **APÓS** o `set({ status: 'completed' })` (fonte de verdade). Usar `useLocation()` subscrito, OU documentar `window.location.pathname` como decisão (simples e suficiente).

### [IMPORTANTE] LAC-008: `useTranscription` (Whisper) e `useSpeedPaintEnhancer` têm o mesmo bug — sem follow-up

- **Localização:** `base.md §2` (linha 53) e `§9` (linha 363)
- **Descrição:** `useTranscription.ts:265-296` usa `cancelRef + fetchAbortRef` (mesma estrutura). `useSpeedPaintEnhancer.ts:126-136` tem `useEffect` cleanup com AbortController. O plano declara R7 como fora de escopo mas não cria ticket/issue de follow-up.
- **Impacto:** Download do Whisper (39MB) pode morrer no meio se o usuário navegar — desperdiça banda. Speed paint enhancement cancela.
- **Sugestão:** Criar issue no GitHub referenciando esses dois arquivos + o padrão M1/M3. Listar como "follow-up de mesma arquitetura" (mesmo padrão singleton).

### [IMPORTANTE] LAC-009: Conflito potencial de `beforeunload` (M5 vs AudioGenerationHandler) — dupla instalação

- **Localização:** `AudioGenerationHandler.tsx:163-173` vs `architecture M5` (linhas 555-616)
- **Descrição:** Mesmo após decisão sobre o inline, se M5 ler `isExportingVideo` e o `AudioGenerationHandler` ler `isGenerating OU isExportingVideo` (linha 165), os dois podem estar ativos ao mesmo tempo. `window.addEventListener` é idempotente, mas o cleanup de um pode remover o listener do outro.
- **Impacto:** Em condições específicas, `beforeunload` pode sumir mesmo com render ativo.
- **Sugestão:** **Centralizar** o `beforeunload` em M5 (remover do `AudioGenerationHandler`). M5 lê `isGenerating` do `useAudioGenerator` store também. Documentar a decisão.

---

## Lacunas MENORES (5)

### [MENOR] LAC-010: RNF-002 (memória) — claim "1 blob órfão por sessão" desatualizado

- **Localização:** `requirements RNF-002` (linhas 228-234)
- **Descrição:** Com M1 (vídeo) e M2 (speed paint) ambos como controllers, podem coexistir até 2 blobs.
- **Sugestão:** Atualizar RNF-002 para "≤ 2 blobs órfãos (1 vídeo + 1 speed paint)" e heap "≤ 90 MB".

### [MENOR] LAC-011: `setInterval(updateTitle, 1000)` em M5 é wasteful

- **Localização:** `architecture §3 M5` (linhas 585-605)
- **Descrição:** Atualizar `document.title` via `setInterval(1s)` mesmo quando nada mudou.
- **Sugestão:** Usar `useStore.subscribe()` do Zustand para reagir a mudanças. Polling é OK como fallback se complicado.

### [MENOR] LAC-012: `ExportCrossRouteToast` (M6) sem `useShallow` explícito

- **Localização:** `architecture §3 M6` (linhas 642-728)
- **Descrição:** O código M6 lê 10+ slices do controller (vídeo + speed paint) sem `useShallow`. Pode re-renderizar 30×/s.
- **Sugestão:** Especificar M6 com slices primitivos individuais OU `useShallow`.

### [MENOR] LAC-013: Analytics event com params inconsistentes

- **Localização:** `architecture §12` (linhas 1101-1129) vs `analytics.ts` (linhas 67-70)
- **Descrição:** Outros eventos usam `ExportParams` (`quality`, `ratio`, `scene_count`, `mode`). O novo `video_export_completed_offroute` tem `quality`, `codec`, `container`, `scene_count`, `source` — falta `ratio` e `mode`.
- **Sugestão:** Estender `ExportParams` com `container` (já existe para vídeo) e adicionar campo opcional `source: string` para offroute.

### [MENOR] LAC-014: `base.md` tem D1–D4 e `requirements.md` tem P5/P9/P2 — não sincronizados

- **Localização:** `base.md §8` (linhas 328-356) e `requirements §9` (linhas 363-397)
- **Descrição:** Os dois documentos não estão sincronizados sobre o que precisa de decisão do usuário. D1 e D2 foram decididos na architecture, mas o doc não refletiu.
- **Sugestão:** Sincronizar — o architecture resolveu D1 e D2; requirements deve refletir isso. Renomear pendências para evitar confusão.

---

## Pendências que precisam do usuário (3-5)

Estas são as decisões que bloqueiam o início da implementação. Respostas em **uma rodada**:

### P1. Speed paint no mesmo PR ou separado?

- **Opções:**
  - **A) Mesmo PR (PR1 inclui M1+M2+M3+M4):** consistência arquitetural, mas PR fica grande (~600-800 linhas).
  - **B) PRs separados (PR1 = vídeo, PR2 = speed paint):** PRs menores e revisáveis, mas o mesmo padrão é duplicado em duas rodadas de review.
- **Recomendação:** **B) PRs separados.** Speed paint tem hook paralelo (`useSpeedPaintExporter`) com a mesma estrutura. Reaproveitar M1/M3 é fácil, mas revisar/reverter é mais simples em PRs menores. Stub de M2 no PR1 (LAC-002).
- **Default se não responder:** B.

### P2. Banner pós-F5 com "retomar" ou só informativo?

- **Opções:**
  - **A) Só informativo:** "A renderização foi interrompida. Inicie uma nova exportação." Simples, mas o usuário perde tempo refazendo.
  - **B) Informativo + botão "Tentar retomar":** tecnicamente inviável (Remotion não tem `saveState`/`pause`/`resume`). Seria no máximo "reiniciar do zero com as mesmas opções".
  - **C) Não mostrar banner:** limpar snapshot automaticamente e confiar que o usuário vai notar que precisa re-exportar.
- **Recomendação:** **A) Só informativo.** B é tecnicamente inviável. C confunde.
- **Default se não responder:** A.

### P3. M5 centraliza `beforeunload` ou apenas adiciona novo?

- **Opções:**
  - **A) Centralizar:** M5 substitui o `beforeunload` inline do `AudioGenerationHandler.tsx:163-173`. M5 lê `isGenerating` do store de áudio. Menos duplicação.
  - **B) Coexistir:** M5 apenas para vídeo/speed paint. O inline do áudio permanece. Mais simples, mas listeners múltiplos.
- **Recomendação:** **A) Centralizar.** É uma refatoração pequena (extrair o `useEffect` do AudioGenerationHandler para o App.tsx via M5), reduz duplicação, e segue a regra "1 lugar para cada responsabilidade".
- **Default se não responder:** A.

### P4. Dot indicator no MobileBottomNav: só "Vídeo" ou também "Speed Paint"?

- **Opções:**
  - **A) Só no ícone "Vídeo"** (rota `/app/video`).
  - **B) Vídeo + Speed Paint** (rotas `/app/video` e `/app/pintura-rapida`).
- **Recomendação:** **A) Só Vídeo.** Speed paint é uma página secundária e o usuário geralmente está focado. Se ele está com speed paint rodando, ele tende a ficar olhando a página.
- **Default se não responder:** A.

### P5. (Opcional) Multi-abas no snapshot M8 (LAC-005)?

- **Opções:**
  - **A) Implementar `tabId`** (sessionStorage por aba) — mais correto mas mais código.
  - **B) Documentar como limitação** — simples, e o caso é raro.
- **Recomendação:** **B) Documentar como limitação.** Power users com multi-aba são minoria. Adicionar nota no RNF-002.
- **Default se não responder:** B.

---

## O que o `validation-contract` precisa fazer

(Será disparado na próxima rodada da Fase 4 da skill arquiteto, se você aprovar o plano.)

- Para cada RF/RNF, produzir critério "como verificar manualmente" + "como verificar automaticamente".
- Plano de QA manual dos 17 cenários do `product.md`.
- Plano de testes automatizados (6 arquivos novos, ~19 casos).
- Gate de release e critérios de rollback.
