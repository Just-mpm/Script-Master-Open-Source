# Product Spec — Video Render Survive Navigation

**Slug:** `video-render-survive-navigation`
**Versão do projeto:** 0.122.0
**Data:** 2026-06-02

---

## 1. Persona & Contexto

**Quem:** Matheus (29), power user de criação de conteúdo. Usa o Script Master para transformar roteiros em vídeos narrados com cenas animadas.

**Problema hoje:** Quando Matheus clica "Exportar Vídeo" em `/app/video` e navega para o Assistente (`/app/assistente`) para continuar trabalhando no roteiro enquanto o vídeo renderiza, o render **morre silenciosamente**. Ao voltar para `/app/video`, não há vídeo — perdeu 30s+ de espera. Ele precisa ficar preso na página de vídeo até o fim.

**Objetivo:** Matheus inicia a exportação, navega livremente pelo app, é notificado quando termina, e volta para ver/baixar o resultado. O render **não morre** na navegação.

---

## 2. Jornadas do Usuário

### Jornada Feliz (cenário principal)

```
/app/video                      /app/assistente                 /app/video
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│ [Exportar Vídeo]│──click──►  │                  │            │  ┌───────────┐  │
│                 │            │ Toast no topo:   │            │  │✅ Vídeo    │  │
│ Progresso: 45%  │            │ "Renderizando    │            │  │   pronto!  │  │
│ [Cancelar]      │            │  vídeo... 45%"   │            │  │[▶ Ver]     │  │
│                 │            │ [Ver Vídeo] [X]  │──click──►  │  │[⬇ Baixar] │  │
│                 │            │                  │  "Ver"     │  │[🗑 Descartar]│  │
│                 │            │                  │            │  └───────────┘  │
└─────────────────┘            └─────────────────┘            └─────────────────┘
```

1. Matheus está em `/app/video`, ajusta qualidade, clica **Exportar Vídeo**.
2. O painel de exportação mostra progresso (barra + % + status text).
3. Ele navega para `/app/assistente` para revisar o roteiro.
4. Um **Toast persistente** (top-center) aparece imediatamente: "Renderizando vídeo... 45%" com progresso atualizado em tempo real, botão "Ver Vídeo" e botão "Cancelar".
5. 30s depois, o Toast muda para **"Vídeo pronto!"** com ícone de check verde, botões "Ver Vídeo" e "Baixar".
6. Matheus clica "Ver Vídeo" → navega para `/app/video`, onde vê o vídeo final no preview, com opções de download, replay e descartar.
7. Se ele clicar "Baixar" direto do Toast, o download inicia e o Toast some.

### Jornada de Cancelamento

```
/app/assistente (render ativo)
┌─────────────────────────────────┐
│                                 │
│ Toast: "Renderizando vídeo...   │
│ 72%"                            │
│ [Ver Vídeo] [Cancelar]         │
│                   ┌──────┐     │
│                   │Cancel│     │
│                   │ render│     │
│                   └──────┘     │
│                                 │
│ → Toast vira: "Renderização    │
│   cancelada" (amarelo, 4s)     │
│ → ActionBar remove indicador   │
│ → Ao voltar p/ /app/video,     │
│   painel resetou p/ idle       │
└─────────────────────────────────┘
```

1. Matheus vê o Toast de progresso no topo da tela.
2. Clica **Cancelar** no Toast.
3. Toast de progresso SOME imediatamente.
4. Um toast amarelo (`react-hot-toast`, 4s) aparece: "Renderização cancelada".
5. O render é abortado — `outputBlob` é descartado, `outputUrl` revogada.
6. Se ele voltar para `/app/video`, o painel de exportação está em estado **idle** (resetado).

### Jornada de Erro

1. Render falha (codec não suportado, OOM, canvas crash).
2. **Se Matheus está em outra rota:** Um Toast de erro (vermelho, persistente até dismiss manual) aparece: "Falha na exportação de vídeo: [motivo]. Tente com qualidade menor ou use Chrome."
3. Botões: "Ver detalhes" (volta p/ `/app/video` com o erro visível no painel) e "Fechar".
4. **Se ele volta p/ `/app/video`:** O painel de exportação mostra o erro com mensagem clara + botão "Tentar novamente".
5. O `outputBlob` é `null` — não há download.

### Jornada Mobile

1. Matheus está no celular, usando a Bottom Nav (5 abas: Biblioteca, Vídeo, Assistente, Estúdio, Mais).
2. Inicia exportação em `/app/video`.
3. Navega para Assistente via bottom nav.
4. O **Toast** (top-center) funciona igual ao desktop.
5. **Extra mobile:** o ícone da aba "Vídeo" na Bottom Navigation ganha um **small dot indicator** (ponto azul pulsante) enquanto o render está ativo — sinaliza "algo está rolando aqui" mesmo com o Toast visível.
6. Ao clicar na aba "Vídeo", volta para `/app/video` com o estado preservado.

---

## 3. Tabela de Cenários × Comportamento Esperado

| # | Cenário | Comportamento | Onde |
|---|---------|---------------|------|
| 1 | Inicia exportação em `/app/video` | Painel de exportação mostra progresso. `videoRenderBridge.isExportingVideo = true`. | VideoExportPanel |
| 2 | Navega para outra rota **enquanto renderiza** | Toast de progresso aparece em **top-center** (Snackbar MUI). Progresso atualizado em tempo real. | `ExportCrossRouteToast` (novo) |
| 3 | Navega para `/app/video` **enquanto renderiza** | Toast some (está na rota de vídeo). Painel de exportação mostra progresso normalmente. | VideoExportPanel |
| 4 | Render **completa** enquanto está em outra rota | Toast troca para "Vídeo pronto!" (verde, persistente). Botões: "Ver Vídeo", "Baixar", "Fechar". | `ExportCrossRouteToast` |
| 5 | Clica "Ver Vídeo" no Toast (render completo) | Navega para `/app/video`. Preview mostra o vídeo final. Painel exibe botões "Baixar" e "Exportar novamente". | Navegação + VideoPage |
| 6 | Clica "Baixar" no Toast (render completo) | Inicia download do `outputBlob`. Toast some. | downloadFile |
| 7 | Clica "Fechar" no Toast (render completo) | Toast some. Resultado permanece disponível se voltar p/ `/app/video`. | `ExportCrossRouteToast` |
| 8 | Clica **Cancelar** no Toast | Render abortado. Toast de progresso some. Toast amarelo "Cancelado" (4s). `outputBlob` descartado. Painel reseta p/ idle. | `videoRenderController.cancelRender()` |
| 9 | Clica Cancelar em `/app/video` | Mesmo comportamento — o controller é o mesmo singleton. | VideoExportPanel |
| 10 | Render **falha** enquanto está em outra rota | Toast vermelho persistente: "Falha na exportação". Botão "Ver detalhes" (volta p/ `/app/video`) e "Fechar". | `ExportCrossRouteToast` |
| 11 | Volta p/ `/app/video` **após falha** | Painel de exportação mostra o erro + botão "Tentar novamente". | VideoExportPanel |
| 12 | Volta p/ `/app/video` **após cancelamento** | Painel de exportação em estado idle (resetado). | VideoExportPanel |
| 13 | Tenta **iniciar 2ª exportação** enquanto a 1ª roda | A 2ª **cancela a 1ª** silenciosamente e inicia nova. (Comportamento binário — 1 export ativo por vez.) | `videoRenderController.startRender()` |
| 14 | **F5 / reload** durante render | Metadados do render são perdidos (está na memória). Snapshot em `localStorage` (M8) persiste `startedAt` + `status`. Ao recarregar, mostra banner "Renderização interrompida — reiniciar". `outputBlob` NÃO sobrevive a F5. | `cross-route-persistence.ts` |
| 15 | **Fecha a aba** com render ativo | `beforeunload` dispara: "Há uma renderização em andamento. Se sair agora, perderá o progresso." (padrão do navegador + mensagem customizada.) | `useCrossRouteRenderGuard` |
| 16 | **Mobile** — render em andamento | Toast funciona igual. **Extra:** dot indicator no ícone da aba "Vídeo" na Bottom Navigation. | MobileBottomNav + `videoRenderBridge` |
| 17 | Troca de app / aba em background | Render continua (WebCodecs roda independente de visibilidade). Ao retornar, Toast/indicador reflete estado atual. | `visibilitychange` handler |

---

## 4. Estados Visuais

### Painel de Exportação (`/app/video`)

| Estado | O que o usuário vê | Ações disponíveis |
|--------|--------------------|-------------------|
| **Idle** | Botão "Exportar Vídeo", seletor de qualidade, nome do arquivo | Iniciar exportação |
| **Preparing** | "Preparando exportação..." com spinner | Cancelar |
| **Rendering** | Barra de progresso + % + status text "Renderizando... 45%" | Cancelar |
| **Completed** | ✅ "Exportação concluída!" + preview do vídeo + info "720p • 30s" | Baixar, Exportar novamente, Descartar |
| **Failed** | ❌ "Falha na exportação: [motivo]" | Tentar novamente, Fechar erro |
| **Cancelled** | Estado idle (resetado) | — |

### Toast Cross-Route (qualquer rota fora de `/app/video`)

| Estado | Posição | Conteúdo | Ações | Persistência |
|--------|---------|----------|-------|-------------|
| **Rendering** | Top-center, Snackbar MUI | Ícone spinner + "Renderizando vídeo... 45%" + progresso em tempo real | "Ver Vídeo" (navega), "Cancelar" (aborta) | Até terminar, cancelar ou falhar |
| **Completed** | Top-center, Snackbar MUI | ✅ "Vídeo pronto!" + info "720p • 30s" | "Ver Vídeo" (navega), "Baixar" (download), "Fechar" (dismiss) | Até usuário fechar, baixar ou clicar "Ver" |
| **Failed** | Top-center, Snackbar MUI | ❌ "Falha na exportação: [motivo breve]" | "Ver detalhes" (navega p/ `/app/video` com erro), "Fechar" (dismiss) | Até usuário fechar |
| **Cancelled** | N/A (toast `react-hot-toast` amarelo) | "Renderização cancelada." | Nenhum (some após 4s) | 4 segundos |

### Mobile Bottom Nav Indicator

| Estado | Indicador |
|--------|-----------|
| Render inativo | Nenhum |
| Render ativo | **Small pulsating dot** (azul/ciano, 4px, animado) sobre o ícone da aba "Vídeo" |
| Render concluído | Small **check dot** (verde, estático) sobre o ícone da aba "Vídeo" — até o usuário abrir a rota |

### Indicadores Globais

| Elemento | Render Ativo | Render Completo | Falha |
|----------|-------------|-----------------|-------|
| `document.title` | "🎥 Exportando vídeo — Script Master" | ✅ "Vídeo pronto — Script Master" | ❌ "Falha na exportação — Script Master" |
| favicon | Mantém o padrão (piscar favicon é agressivo demais) | Mantém o padrão | Mantém o padrão |
| `beforeunload` | "Há uma renderização em andamento. Deseja realmente sair?" | Removido | Removido |

> Nota: `document.title` é barato e não exige permissão. Favicon dinâmico seria 1-2KB a mais — descartado por simplicidade nesta versão. Se o time quiser, pode ser P3.

---

## 5. Microcopy Sugerido

### Novas chaves i18n (namespace `exportCrossRoute`)

```ts
// Sugestão de namespace novo
exportCrossRoute: {
  renderingTitle: 'Renderizando vídeo',
  renderingProgress: 'Renderizando vídeo... {progress}%',
  renderingStatusTextPreparing: 'Preparando exportação...',
  renderingStatusTextSpeedPaint: 'Gerando animações... {progress}%',
  renderingStatusTextRender: 'Renderizando... {progress}%',
  renderingStatusTextFinalizing: 'Finalizando exportação...',
  completedTitle: 'Vídeo pronto!',
  completedDescription: '{quality} • {duration}s',
  failedTitle: 'Falha na exportação',
  failedDescription: '{reason}',
  failedHint: 'Tente com qualidade menor ou use Chrome.',
  cancelledMessage: 'Renderização cancelada.',
  actionViewVideo: 'Ver Vídeo',
  actionDownload: 'Baixar',
  actionCancel: 'Cancelar',
  actionClose: 'Fechar',
  actionSeeDetails: 'Ver detalhes',
  actionTryAgain: 'Tentar novamente',
  beforeUnloadMessage: 'Há uma renderização de vídeo em andamento. Se sair agora, perderá o progresso.',
  // Mobile dot indicator
  mobileDotActive: 'Renderização em andamento',
  mobileDotCompleted: 'Vídeo pronto para ver',
}
```

### Chaves existentes que podem ser reusadas

| Chave | Texto pt-BR | Onde usar |
|-------|-------------|-----------|
| `common.cancel` | Cancelar | Botão de cancelar no Toast |
| `common.close` | Fechar | Botão de fechar no Toast |
| `common.back` | Voltar | Alternativa menos direta que "Ver Vídeo" |
| `studio.actionBar.exportingVideo` | Exportando vídeo | Prefixo do status |
| `studio.actionBar.exportingVideoProgress` | Exportando vídeo... {progress}% | Formato de progresso |
| `studio.actionBar.viewVideo` | Ver vídeo | Botão de navegação |

---

## 6. Critérios de Aceite Observáveis

> Formato: **O sistema faz X quando Y.**

1. ✅ O sistema **NÃO aborta** a renderização quando o usuário navega de `/app/video` para qualquer outra rota autenticada.
2. ✅ O sistema mostra um **Toast persistente** (Snackbar MUI, top-center) com progresso em tempo real **em qualquer rota** quando há uma exportação ativa e o usuário não está em `/app/video`.
3. ✅ O Toast de progresso **some** automaticamente quando o usuário volta para `/app/video`.
4. ✅ Ao completar a exportação, o Toast muda para **estado "Pronto"** (verde) com botões "Ver Vídeo", "Baixar" e "Fechar".
5. ✅ Clicar "Ver Vídeo" no Toast navega para `/app/video`.
6. ✅ Clicar "Baixar" no Toast inicia o download do vídeo e fecha o Toast.
7. ✅ Ao voltar para `/app/video` com exportação concluída, o preview do vídeo está disponível para reprodução e download.
8. ✅ Clicar "Cancelar" no Toast **aborta** a renderização, descarta o blob parcial, mostra toast amarelo "Cancelado" por 4s, e reseta o painel de exportação para idle.
9. ✅ Se a exportação falhar, um Toast vermelho persistente mostra a mensagem de erro com botão "Ver detalhes" (volta p/ `/app/video` com erro visível).
10. ✅ O usuário **não pode iniciar 2 exportações simultâneas**. A 2ª chamada cancela silenciosamente a 1ª e inicia nova.
11. ✅ **`beforeunload`** dispara aviso se o usuário tentar fechar a aba com render ativo (padrão nativo do navegador).
12. ✅ **Mobile:** um dot indicator pulsante aparece no ícone da aba "Vídeo" da Bottom Navigation durante render ativo.
13. ✅ **Mobile:** o Toast de progresso aparece na mesma posição (top-center) e funciona com toque.
14. ✅ **F5/Reload:** o `outputBlob` é perdido (em memória). Um banner "Renderização interrompida — reiniciar" aparece se snapshot persistido existir. (Comportamento deliberado — fora de escopo reter blob pós-F5.)
15. ✅ Ao **voltar de aba em background**, o Toast reflete o estado atual do render (progresso atualizado ou já concluído).

---

## 7. Decisões Respondidas (do handoff)

| Pergunta | Decisão de UX |
|----------|---------------|
| **1. Cenário feliz — notificação** | Toast Snackbar global (top-center) com progresso em tempo real. Ao completar, vira verde com botões "Ver Vídeo" / "Baixar" / "Fechar". |
| **2. Cancelamento durante navegação** | Botão "Cancelar" no Toast. Não precisa voltar p/ `/app/video`. |
| **3. Erro de render** | Toast vermelho persistente com "Ver detalhes" (volta p/ `/app/video`) e "Fechar". |
| **4. Volta p/ `/app/video` durante render** | Toast some (está na rota certa). Painel de exportação mostra progresso normalmente. |
| **5. Volta p/ `/app/video` após render terminar** | Preview do vídeo disponível com botões "Baixar" e "Exportar novamente". |
| **6. Múltiplas tentativas** | 2ª chamada cancela a 1ª. Sem fila. Uma exportação ativa por vez. |
| **7. Créditos** | Créditos são consumidos no início da exportação (já implementado). O toast de erro de crédito já existe. Fora de escopo desta UX — o comportamento existente cobre. |
| **8. Mobile** | Toast funciona igual. **Extra:** dot indicator no ícone da aba "Vídeo" na Bottom Navigation. |
| **9. Bloqueio de tela / trocar app** | Render continua (WebCodecs é independente de visibilidade). `document.title` muda para indicar estado. |
| **10. Beforeunload** | Aviso nativo do navegador com mensagem customizada: "Há uma renderização em andamento. Se sair agora, perderá o progresso." |

---

## 8. Pontos Abertos para `requirement`

> Dúvidas que precisam de formalização antes/híbrida com implementação.

| # | Dúvida | Contexto | Impacto |
|---|--------|----------|---------|
| P1 | O Toast de progresso deve ser **arrastável** ou fixo? | Snackbar MUI fixo vs. `react-hot-toast` que some. | Se for fixo (Snackbar), o usuário não consegue ver conteúdo atrás. Se for `react-hot-toast`, some ao clicar fora. **Recomendação:** Snackbar fixo, sem auto-dismiss, com `role="alert"` e `aria-live="polite"`. |
| P2 | O **dot indicator mobile** deve ser na Bottom Nav (ícone Vídeo) ou em todos os ícones de rota com render? | Apenas a aba "Vídeo" tem render ativo. Botão "Ver Vídeo" no Toast já leva p/ lá. | Dot excessivo polui. **Decisão recomendada:** apenas no ícone "Vídeo". |
| P3 | Qual o comportamento ao **descartar** o resultado completo? | Botão "Fechar" no Toast "Vídeo pronto!" — descarta o resultado ou só fecha o Toast? | **Recomendação:** "Fechar" só dismiss o Toast. O resultado continua disponível em `/app/video`. Para descartar de fato, o usuário precisa ir em `/app/video` e clicar "Limpar" / iniciar nova exportação. |
| P4 | O `outputUrl` (blob URL) deve ser **revogado** quando? | Memória: blob URLs não revogadas vazam. | **Regra:** revogada em `reset()` (iniciar nova exportação) e em `cancelRender()` (se blob não estava completo). **NÃO** revogada ao fechar Toast — o resultado fica disponível até o usuário explicitamente iniciar nova exportação. |
| P5 | **Speed paint** entra no mesmo PR ou separado? | Base plan sugere PR separado (D4.b). | **Decisão para product:** validar se speed paint precisa da mesma feature. Recomendação técnica: mesmo padrão, PR separado (menos risco). |
| P6 | **Notificação sonora** ao completar? | Fora de escopo do handoff (Notification API exige permissão). | **Decisão:** não fazer. Apenas visual. |
| P7 | E se o usuário está em `/app/video` e o render **completa**? O Toast não aparece (está na rota certa). O painel já mostra ✅ "Concluído". | Sem mudança no comportamento atual. | Nenhuma — já funciona. |
| P8 | E se o usuário **nunca** clicar "Ver Vídeo" nem "Baixar"? O blob em memória fica até nova exportação. | Risco de vazamento de memória se o usuário exportar múltiplas vezes sem voltar p/ `/app/video`. | **Aceito:** o controller `reset()` revoga a URL anterior ao iniciar nova exportação. Máximo de 1 blob "órfão" por sessão. |
| P9 | O **banner pós-F5** (M8 + R4) deve aparecer em todas as rotas ou só em `/app/video`? | Persistência em `localStorage` apenas de metadados. Sem blob. | **Recomendação:** banner aparece **apenas em `/app/video`** (rota onde o usuário pode reiniciar). Em outras rotas, não mostrar — o snapshot serve apenas para proteger o `beforeunload`. |

---

## 9. Mapa de Componentes (UX × Código)

| Componente UX | Módulo (do base plan) | O que faz |
|---------------|----------------------|-----------|
| `ExportCrossRouteToast` | M6 (novo) | Snackbar global de progresso em rota diferente. Mostra progresso, "Ver Vídeo", "Cancelar". Monomorfo: vídeo + speed paint. |
| `useCrossRouteRenderGuard` | M5 (novo) | Hook no App.tsx: `beforeunload`, `visibilitychange`, `focus`, `document.title`. Lê de M1/M2. |
| `ExportSurviveIndicator` | M7 (novo) | Banner no topo de VideoPage quando volta com render em andamento. Mostra progresso retomado. |
| `MobileRenderDot` | Novo (dentro de `MobileBottomNav` ou `ExportCrossRouteToast`) | Ponto indicador de render ativo no ícone "Vídeo" da bottom nav. |
| `videoRenderController` | M1 (novo) | Store Zustand singleton: controla o ciclo de vida do render. Vive fora do componente. |
| `useVideoExporter` (refatorado) | M3 (edit) | Fachada fina que consome M1. Contrato público preservado. Remove cleanup que aborta. |
| `videoRenderBridge` | Existente (edit) | Continua sendo a ponte de estado cross-route. M1 escreve nele via `syncExportState()`. |
| `cross-route-persistence` | M8 (novo) | Snapshot em localStorage para pós-F5. Metadados apenas (sem blob). |
| `ToastManager` | Existente | Continua gerenciando toasts de erro/warning/success. O novo `ExportCrossRouteToast` vive ao lado. |

---

## 10. Não-Objetivos (reforço)

- ❌ Persistência do `outputBlob` após F5/reload (fora de escopo, plano futuro).
- ❌ `Notification API` do navegador (exige permissão, experiência inconsistente).
- ❌ Fila de múltiplos renders (1 export ativo por vez — binário).
- ❌ Mostrar o `<video>` em si em outras rotas (pesado, desnecessário — apenas indicador).
- ❌ Cloud Functions / backend para render (custo, time-to-market).
- ❌ Background Sync / Service Worker (inviável com WebCodecs + Remotion).
- ❌ Pausar/retomar render (Remotion não suporta — `AbortSignal` é destrutivo).

---

## Próximo passo

1. **Product** dá sign-off nas decisões D1–D4 (ver base plan §8) e nos pontos P1–P9.
2. **Gap-finder** audita o plano contra o código real, especialmente: `VideoPage.tsx:224-226` (resetBridge), `useVideoExporter.tsx:178-186` (abort cleanup), e `ToastProvider.tsx:52-94` (já tem cross-route toast — conflito com M6?).
3. **Architecture** detalha M1 e M2 (assinaturas, slices, throttling), M3 e M4 (fachadas), M5/M6/M7 (UX), M8 (schema).
4. **Frontend-engineer** executa M9 → M1 → M3 → M5 → M6 (vídeo apenas, PR1) e M2 → M4 → M7 → M8 (speed paint + persist, PR2).
