# Reauditoria Final de Segurança — Speed Paint Vetorial (3ª Passada)

**Data:** 2026-06-14
**Versão alvo:** v0.131.0
**Agent:** `security`
**Passada:** 3ª (reauditoria pós-correção GAP-01 + GAP-02)

---

## 1. Escopo da Revisão

### Arquivos lidos por completo
- `src/features/speed-paint/components/SpeedPaintPlayer.tsx` (293 linhas)
- `src/features/speed-paint/components/WhiteboardComposition.tsx` (66 linhas)
- `src/features/speed-paint/components/SpeedPaintExportPanel.tsx` (299 linhas)
- `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` (319 linhas)
- `src/features/speed-paint/store/speedPaintRenderController.tsx` (1013 linhas)
- `src/features/speed-paint/store/animationStore.ts` (196 linhas)
- `src/features/speed-paint/types.ts` (63 linhas)
- `src/features/speed-paint/types/vetorial.ts` (88 linhas)
- `src/features/speed-paint/lib/imageProcessing.ts` (830 linhas — lido parcialmente, foco no `generateStrokesFromImage` e `processVetorialOnMainThread`)
- `src/features/speed-paint/lib/vectorizer.ts` (362 linhas)
- `src/features/video-render/lib/strokeCache.ts` (315 linhas)
- `src/features/video-render/components/WhiteboardScene.tsx` (298 linhas)
- `src/pages/SpeedPaintPage.tsx` (943 linhas — lido parcialmente, foco no fluxo `isCompleted`, `job.animation!`, `handleRenderModeChange`)

### Superfícies sensíveis cobertas
- Discriminação de tipo (type guard) em runtime
- Renderização de SVG com dados de path (XSS via `<path d>`)
- `imageSource` opcional e fallback para string vazia
- Non-null assertion `job.animation!` e guarda `isCompleted`
- Cache LRU com isolamento por modo+preset
- Logging e analytics (vazamento de dados)
- Race conditions entre geração e troca de modo
- Casts `as StrokeAnimation` remanescentes no controller

---

## 2. Veredito

**✅ Release v0.131.0 SEGURO — Sem vulnerabilidades de segurança**

Nenhuma vulnerabilidade real encontrada nesta reauditoria. Os 10 focos específicos foram validados individualmente e todos se comportam seguramente. As mudanças do worker para suporte vetorial introduziram risco mínimo e controlado.

---

## 3. Confirmação dos 10 Focos Específicos

### 1. Discriminação por `'paths' in animation` no SpeedPaintPlayer
- **Confiança:** 99/100
- **Resultado:** ✅ Seguro
- **Análise:** O type guard `'paths' in animation` (linha 100-104 do `SpeedPaintPlayer.tsx`) é seguro porque `VetorialAnimation` e `StrokeAnimation` são gerados exclusivamente por código controlado (`imageProcessing.ts` / `vectorizer.ts`). Não há entrada de dados do usuário que modele esses tipos. Prototype pollution exigiria acesso ao runtime e controle sobre `Object.prototype` — cenário sem vetor de ataque real.

### 2. Renderização de WhiteboardComposition no preview
- **Confiança:** 99/100
- **Resultado:** ✅ Seguro
- **Análise:** `WhiteboardScene` renderiza `<path d={path.d}>` e `<g transform={...}>` via React JSX — XSS escapado automaticamente. Os paths vêm do `vectorizer.ts`, que recebe apenas `ImageData` (pixels) e extrai atributos via regex controlada com fallback de cor. Sem possibilidade de injeção.

### 3. `imageSource` opcional
- **Confiança:** 95/100
- **Resultado:** ✅ Seguro (risco de UX, não de segurança)
- **Análise:** `imageSource?: string` com fallback `imageSource ?? ''` (linha 282). O controller (`runSingleRender` linha 545) aborta se `!isVetorial && !imageSource`. String vazia não causa crash de segurança — apenas falha silenciosa de renderização.

### 4. `job.animation!` non-null assertion em SpeedPaintPage.tsx
- **Confiança:** 98/100
- **Resultado:** ✅ Seguro
- **Análise:** A guarda `isCompleted = job.status === 'completed' && Boolean(job.animation)` (linha 127) impede renderização quando `animation` é `undefined`. Os 4 usos de `job.animation!` (linhas 697, 698, 749, 750) são condicionais a `{isCompleted && (...)}` (linha 689). A non-null assertion é segura pelo contexto.

### 5. Objeto que satisfaz ambos os tipos (paths + strokes)
- **Confiança:** 97/100
- **Resultado:** ✅ Seguro (teórico, sem vetor de ataque)
- **Análise:** `'paths' in animation` tem prioridade → renderiza como vetorial. `WhiteboardScene` só acessa campos de `VetorialAnimation`. Não há campos conflitantes entre os tipos. Um objeto com ambos funcionaria corretamente no ramo vetorial. Improvável de acontecer porque não há fonte externa para criar objetos híbridos.

### 6. Sanitização do VetorialAnimation em runtime com projetos antigos
- **Confiança:** 98/100
- **Resultado:** ✅ Seguro
- **Análise:** Cache `strokeCache.ts` usa `buildCacheKey` com hash SHA-256 de `imageUrl|{mode,preset}` (linhas 77-84). Chaves para `mode: 'mask'` e `mode: 'vetorial'` são distintas. Lookup de cache vetorial retorna `null` para entradas mask, forçando regeneração. Isolamento total.

### 7. Logging e analytics
- **Confiança:** 99/100
- **Resultado:** ✅ Seguro
- **Análise:** Todos os logs usam mensagens fixas ou `String(err)`. `trackAnalyticsEvent` recebe `mode: newMode` (`'mask' | 'vetorial'`) — valores seguros. `strokeCache` trunca `imageUrl` para 60 chars. Logger tem sanitização automática documentada no AGENTS.md.

### 8. Fuzz testing conceitual
- **Confiança:** 98/100
- **Resultado:** ✅ Seguro
- **Análise:** Testados mentalmente: `null` (TS impede), `undefined` (guardado por `isCompleted`), objetos parciais, objetos com ambos os tipos. Todos os cenários seguros ou com fallback previsível.

### 9. Race condition na troca de modo durante geração
- **Confiança:** 90/100
- **Resultado:** ✅ Seguro (discrepância visual tolerável)
- **Análise:** Se o modo muda enquanto a animação está sendo gerada, o job carrega a animação do modo antigo. O player discrimina pelo tipo real da animação, não pelo `renderMode` da store. Pode haver discrepância visual (seletor mostra 'vetorial' mas preview é mask), mas sem impacto de segurança.

### 10. CSS injection via WhiteboardComposition
- **Confiança:** 99/100
- **Resultado:** ✅ Seguro
- **Análise:** `canvasColor` é `'white' | 'black'` — ternário seguro. `imageSource` não é usado no modo vetorial. Modo mask usa `<img src={imageSource}>` — React escapa. `Pencil` SVG usa coordenadas numéricas (`x`, `y`) e string fixa para `filter`.

---

## 4. Vulnerabilidades

**Nenhuma vulnerabilidade encontrada.** Nesta terceira passada, todos os riscos identificados são teóricos, sem vetor de ataque real, ou mitigados por código controlado e guardas de runtime.

### Riscos teóricos documentados (não vulnerabilidades)

| Risco | Gravidade teórica | Motivo do descarte |
|-------|-------------------|-------------------|
| Prototype pollution injetando `paths` em StrokeAnimation | LOW | Sem vetor de ataque. Animação é gerada internamente, nunca recebida de fonte externa. |
| `imageSource` vazio no modo mask sem imageSource | LOW | Controller aborta com `return` silencioso (linha 545). Não quebra, não vaza. |
| Race condition modo/geração | LOW | Apenas discrepância visual. Player discrimina pelo tipo, não pelo modo. |
| Casts `as StrokeAnimation` remanescentes | LOW | Narrowing prévio (`'paths' in animation`) garante segurança em runtime. |

---

## 5. O que Parece Saudável

- **Type guard real:** Uso de `'paths' in animation` sem `as` bypass no `SpeedPaintPlayer`. Duas branches (`VetorialPlayer` / `MaskPlayer`) com props tipadas contra os componentes corretos.
- **Isolamento de cache:** Hash SHA-256 inclui `mode` + `preset`, garantindo que não haja colisão entre animações mask e vetoriais da mesma imagem.
- **Validação de runtime no cache:** `setStrokeAnimation` (strokeCache.ts linhas 265-281) valida o tipo da animação com type guards e lança `TypeError` se o caller passar o tipo errado para o modo — dupla checagem defensiva.
- **Modo batch só mask:** Documentado e consistente (runBatchRender não suporta vetorial, usa `as StrokeAnimation` apenas nesse contexto conhecido).
- **`isCompleted` como guarda:** A dupla verificação (`status === 'completed'` + `Boolean(animation)`) é robusta e cobre os 4 usos de `job.animation!`.
- **Sanitização de filename:** `SpeedPaintExportPanel` filtra caracteres especiais com regex `[^a-zA-Z0-9_-]` (linha 148).

---

## 6. Limites da Revisão

- **Análise estática apenas:** Não foram executados testes de fuzz ou penetração em runtime.
- **Sem análise de dependências:** `imagetracerjs` e `@remotion/paths` não foram auditados internamente.
- **Sem análise de persistência Firestore/Storage:** O armazenamento e recuperação de `VetorialAnimation` no Firestore não foi reauditado (já coberto na F5.5 security).
- **NotebookLM não consultado:** Para esta reauditoria, não havia dúvida de API ou comportamento de framework que justificasse consulta. Toda a análise foi sobre código próprio do projeto. Conforme a regra, a confiança máxima não foi restrita a 80 porque não havia notebook dedicado cobrindo o tema específico (segurança de type guards e animação vetorial).
- **`imageProcessing.ts`:** Apenas lido parcialmente (foco no generateStrokesFromImage). As funções `processOnMainThread` (~300 linhas) não foram lidas integralmente.

---

## 7. Checks Rápidos

| Superfície | Status |
|---|---|
| Auth — autenticação/sessão | 🔲 Não escopo (sem mudanças) |
| Authorization — permissão/ownership | 🔲 Não escopo (sem mudanças) |
| **Secrets** — vazamento de chaves | ✅ Sem vazamento |
| PII — dados pessoais | ✅ Sem PII nos paths/animations |
| **Injection** — XSS via path SVG | ✅ React escapa |
| Webhook — assinatura/replay | 🔲 Não escopo (sem webhooks) |
| Upload — tipo/tamanho | 🔲 Não escopo (sem mudanças) |
| Rate Limit — quota/abuso | 🔲 Não escopo (sem mudanças) |
| CORS — origem/credentials | 🔲 Não escopo (sem mudanças) |
| **Encryption** — dados em trânsito/repouso | 🔲 Não escopo (sem mudanças) |
| Multi-tenant — isolamento | 🔲 Não escopo (sem mudanças) |

---

## 8. Priorização — Top Correções

**Nenhuma correção de segurança necessária.** Recomendações abaixo são sugestões de hardening, não bloqueadores.

| Prioridade | Sugestão | Esforço | Impacto |
|---|---|---|---|
| 🟢 Sugestão | Adicionar comentário JSDoc no `SpeedPaintPlayerProps.animation` explicitando que o tipo é união discriminada por `paths` vs `strokes` (já parcialmente documentado) | 1 minuto | Clareza de código |
| 🟢 Sugestão | Validar que `job.animation` não é `undefined` com type guard explícito antes da non-null assertion (ex: `animation: job.animation! as Exclude<typeof job.animation, undefined>`) | 2 minutos | Segurança defensiva |
| 🟢 Sugestão | Adicionar fallback para `totalLength === 0` em `WhiteboardScene` para evitar divisão por zero em `interpolate` (já que `extrapolateRight: 'clamp'` mitiga, mas `drawnLength` seria 0) | 1 minuto | Robustez |

---

## 9. Gate de Saída Final

- [x] Li o contexto mínimo real ou reuni evidência suficiente
- [x] Cada achado passou pela validação anti-falso-positivo
- [x] Cada achado passou pelo confidence gate numérico (todos ≥ 90)
- [x] Achados com confidence < 80 foram descartados (nenhum)
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`
- [x] Existe motivo real para escalar? **Não.** Release seguro.

---

**Status final:** ✅ **Release v0.131.0 SEGURO** — Nenhuma vulnerabilidade de segurança encontrada. As correções dos GAPs foram validadas e a refatoração para suporte vetorial introduziu risco mínimo e controlado.
