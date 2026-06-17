# Auditoria Code Validator — Leiva L3 (RF-01 + RF-02)

**Data:** 2026-06-15
**Versão alvo:** 0.132.0
**Arquivos revisados:** 4 (SpeedPaintPage.tsx, pt-BR.ts, en.ts, es.ts)
**Comando:** `code-validator` sobre Leiva L3 do plano `speed-paint-vetorial-completo-plano-final.md`

---

## Escopo da Revisão

- **Qualidade do código** (SOLID, Clean Code, padrões do projeto)
- **Tipos** (TypeScript estrito, narrowing correto, sem `any`)
- **Race protection** (`processingIdRef` + `AbortController` no padrão do BatchOrchestrator)
- **Cache lookup antes de generate** (evita reprocessamento desnecessário)
- **i18n** (5 chaves em cada locale, tradução real, namespace correto)
- **Acessibilidade** (`aria-label` no CircularProgress, `describeChild`, `aria-describedby`)
- **Tooltips distintos** (Clássico ≠ Desenho, sem cross-contamination de conteúdo)
- **Possíveis bugs latentes** (memory leak, deps do `useCallback`, edge cases)

---

## Veredito

✅ **APROVADO COM RESSALVAS**

A implementação do `handleRenderModeChange` está tecnicamente correta e segue os padrões do projeto (useCallback, AbortController, processingIdRef, cache lookup, type guards sem `as` bypass, narrowing real). Todos os 146 testes de speed-paint e 327 testes de video-render passam. ESLint e typecheck sem erros. Nenhum `@ts-ignore`, `as` bypass ou `any` no código novo.

**2 warnings encontrados**, nenhum bloqueador. Ambos são corrigíveis com mudanças pontuais.

---

## Achados Priorizados

### [WARNING] `aria-describedby` redundante no ToggleButtonGroup com helper text repetindo o título

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:885-900`
- **Confidence:** 88/100
- **Categoria:** A11y
- **Problema:** O `aria-describedby="speed-paint-mode-description"` no `ToggleButtonGroup` aponta para um elemento `<Typography>` cujo conteúdo é `t('speedPaint.modeLabel')` ("Modo de renderização") — **idêntico ao `aria-label` do grupo** (linha 899). Isso causa anúncio duplicado em leitores de tela. Além disso, o `describeChild` nos Tooltips filhos (linhas 937, 949) já gerencia `aria-describedby` automaticamente para cada botão, tornando o `aria-describedby` do grupo redundante e potencialmente conflitante.

  **Contexto:** Antes da L3, o helper text exibia `modeDescription` ("Clássico: revelação por máscara... Desenho: animação vetorial..."), que era um texto descritivo genuíno. Após a L3, o helper foi alterado para `modeLabel`, perdendo o valor descritivo. O `modeDescription` (linha 1430 do pt-BR) continua existindo nos dicionários mas não é mais referenciado em lugar nenhum.

- **Evidência:**

  ```tsx
  // Linha 885-892 — helper text que agora repete o título
  <Typography id="speed-paint-mode-description" ...>
    {t('speedPaint.modeLabel')}  {/* "Modo de renderização" — igual ao aria-label */}
  </Typography>

  // Linha 899-900 — aria-describedby apontando para o helper redundante
  aria-label={t('speedPaint.modeLabel')}
  aria-describedby="speed-paint-mode-description"
  ```

- **Impacto:** Leitores de tela anunciam "Modo de renderização" duas vezes consecutivas. O `aria-describedby` não agrega valor descritivo. Usuários de NVDA/JAWS perdem informação útil que existia antes.

- **Sugestão:** Reverter o helper text para `t('speedPaint.modeDescription')` (que já existe nos dicionários e tem texto descritivo genuíno), ou remover o `aria-describedby` se os tooltips com `describeChild` já cobrem a descrição individual dos botões. O helper text visual (para usuários videntes) pode ficar com `modeDescription` ou ser removido se os tooltips individuais já cumprem esse papel.

---

### [WARNING] Duas chaves i18n definidas mas não referenciadas em lugar nenhum (dead code)

- **Arquivo:** `src/features/i18n/locales/{pt-BR,en,es}.ts:1433-1434, 1416-1417, 1416-1417`
- **Confidence:** 95/100
- **Categoria:** Architecture
- **Problema:** As chaves `modeProcessingError` e `modeProcessingRetry` foram adicionadas aos 3 dicionários, mas não são usadas em **nenhum componente** do projeto. Nenhum `t('speedPaint.modeProcessingError')` ou `t('speedPaint.modeProcessingRetry')` existe em arquivo de UI.

- **Evidência:**

  - Grep por `modeProcessingError|modeProcessingRetry` em `src/` retorna **apenas** as definições nos locais dos dicionários (6 matches — 3 idiomas × 2 chaves).
  - Nenhum import ou chamada de `t()` referenciando essas chaves existe no código.

- **Impacto:** Aumento desnecessário de 6 strings (~120 caracteres cada) no bundle de tradução. Futuros tradutores ou auditores podem se perguntar por que essas chaves existem. Risco de drift se alguém implementar o tratamento de erro sem consultar os nomes existentes.

- **Sugestão:** 
  1. Se o plano não prevê uso imediato destas chaves (o plano menciona apenas tooltips + reprocessamento para L3), **removê-las** dos 3 dicionários para evitar dead code. 
  2. Se há intenção de usá-las em L3 (como o erro no `catch` do `handleRenderModeChange`), **implementar o consumo**: na linha 383-384 de `SpeedPaintPage.tsx`, o `catch` poderia mostrar um toast ou alerta com `t('speedPaint.modeProcessingError')` e um botão de retry com `t('speedPaint.modeProcessingRetry')`.

---

## O que parece saudável

- **`useCallback` com deps corretas:** `[setRenderMode, setJob]` — ambas são seletores individuais do Zustand (referências estáveis entre renders). O `vetorialPreset` é lido via `useAnimationStore.getState()` dentro do callback, confirmado pelo NotebookLM React como padrão seguro contra stale closure.
- **Race protection tripla:** `processingIdRef` (ID único por chamada), `AbortController` (abort antecipado), e guardas contra `ac.signal.aborted` e `processingIdRef.current !== processId` em todos os pontos de saída (5 verificações no total).
- **Cache lookup antes de generate:** Linhas 351-358 consultam cache primeiro; apenas em miss executa `generateStrokesFromImage`. Evita reprocessamento desnecessário conforme MDE-04.
- **Type guards reais, zero `as` bypass:** Linhas 375-379 usam `isVetorialAnimation(animation)` e `isStrokeAnimation(animation)` — narrowing type-safe em compile-time. Confirmado: nenhum `as StrokeAnimation`, `: any` ou `@ts-ignore` no código novo.
- **Tooltips individuais (RF-01):** `modeClassicTooltip` e `modeVetorialTooltip` são distintos, com `describeChild` + `aria-label` preservado nos ToggleButtons, conforme boas práticas MUI.
- **Acessibilidade no CircularProgress:** `aria-label={t('speedPaint.processingLabel')}` presente na linha 520.
- **Dynamic import:** `generateStrokesFromImage` é importado dinamicamente (linha 361), preservando bundle enxuto.
- **i18n:** 5 chaves adicionadas consistentemente nos 3 locales, com traduções reais e adequadas. Namespace `speedPaint.*` correto.
- **Testes:** 146 testes speed-paint + 327 testes video-render passando integralmente.
- **Lint:** zero erros. **Typecheck:** zero erros. **Build:** sem quebras.

---

## Limites da Revisão

- Não foi verificado se `modeProcessingError`/`modeProcessingRetry` serão consumidos em leivas futuras (L4+). Pode ser dead code planejado.
- O relatório `modeDescription` ainda existe nos dicionários e não é mais referenciado — isso é esperado pela RF-01 (tooltips substituem a descrição única), mas não foi removido neste escopo. Pode ser limpo em limpeza pós-release.
- Não foi testado manualmente o comportamento do `handleRenderModeChange` com imagens reais (fora do escopo de análise estática).
- Não foi verificado o comportamento de fallback quando `generateStrokesFromImage` lança exceção não-AbortError (ex: rede) — o `catch` genérico trata como failed, o que é aceitável.

---

## Resumo do Gate de Qualidade

| Critério | Resultado |
|----------|-----------|
| ESLint (0 erros) | ✅ |
| TypeScript (0 erros) | ✅ |
| Testes speed-paint (146) | ✅ Todos passam |
| Testes video-render (327) | ✅ Todos passam |
| CT-F01 a CT-F17 (tooltips + reprocessamento) | ✅ (2 Warnings não funcional) |
| CT-A01 a CT-A10 (acessibilidade) | ⚠️ 1 Warning (`aria-describedby`) |
| CT-I01 a CT-I04 (i18n) | ⚠️ 1 Warning (dead code) |
| CT-C03 (sem regressão) | ✅ |
| CT-S01 (zero any/as/@ts-ignore) | ✅ |
| CT-T01 (6 testes handleRenderModeChange) | ✅ (146+327 passam) |

**Veredito final:** ✅ **APROVADO COM RESSALVAS** — 2 warnings não bloqueiam o merge, mas devem ser corrigidos antes da release 0.132.0.
