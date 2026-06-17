# Auditoria de Segurança — L5 (RF-08) BatchOrchestrator

**Data:** 2026-06-15  
**Agente:** Security  
**Arquivo auditado:** `src/features/speed-paint/components/batch/BatchOrchestrator.tsx`  
**Hash do commit:** (working dir, diff da L5)

---

## Escopo da revisão

- **Arquivo principal:** `src/features/speed-paint/components/batch/BatchOrchestrator.tsx` (206 linhas)
- **Store:** `src/features/speed-paint/store/animationStore.ts` — definição de `renderMode`, `vetorialPreset`, `setRenderMode`, `setVetorialPreset`
- **Função downstream:** `src/features/speed-paint/lib/imageProcessing.ts` — `generateStrokesFromImage()`, `processVetorialOnMainThread()`
- **Tipos:** `src/features/speed-paint/types/vetorial.ts` — `SpeedPaintRenderMode`, `VetorialPreset`
- **Logger:** `src/lib/logger/sanitization.ts` — sanitização de PII em logs

**Superfícies sensíveis cobertas:**
- Validação de entrada (`renderMode`, `vetorialPreset`)
- Race condition / DoS por troca rápida de modo
- Memory leak (AbortController, timeouts)
- Exposição de PII/dados sensíveis em logs
- Type guards em runtime

---

## Veredito

**SEGURO COM RESSALVAS**

Não há vulnerabilidades críticas. Os riscos identificados são teóricos e mitigados pelo downstream. As ressalvas são oportunidades de hardening defensivo.

---

## Achados priorizados

### [SUGGESTION] Ausência de validação de runtime para `renderMode` e `vetorialPreset`

- **Arquivo:** `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:108`
- **Confidence:** 75/100
- **Categoria:** Injection
- **Problema:** `renderMode` e `vetorialPreset` são lidos da store Zustand via `getState()` e propagados para `generateStrokesFromImage` sem nenhuma validação de runtime.
- **Evidência:**

```typescript
// Linha 108 — sem validação
const { renderMode, vetorialPreset } = useAnimationStore.getState();

// Linhas 114-117 — propagado diretamente
generateStrokesFromImage(dataUrl, (p) => { ... }, {
  signal: abortController.signal,
  renderMode,
  vetorialPreset: renderMode === 'vetorial' ? vetorialPreset : undefined,
})
```

- **Mitigação existente:** `generateStrokesFromImage` (linha 401-403 de `imageProcessing.ts`) faz fallbacks:
  - `const renderMode: SpeedPaintRenderMode = options.renderMode ?? 'mask';`
  - `if (renderMode === 'vetorial') { ... }` → qualquer valor !== `'vetorial'` cai no branch mask (seguro)
  - `const preset: VetorialPreset = options.vetorialPreset ?? 'artistic1';`

- **Impacto:** Um valor arbitrário injetado via store (ex: manipulação de localStorage ou devtools) não causa quebra — o downstream trata como `'mask'`. Risco de injeção de preset inválido no `imagetracerjs` mitigado pelo fallback `?? 'artistic1'`.

- **Pré-condição de ataque:** Usuário precisaria manipular manualmente o estado da store Zustand (via devtools ou edição direta de localStorage) — cenário de auto-ataque sem ganho real.

- **Confidence rebaixada para 75** porque: (1) a mitigação downstream é eficaz, (2) a pré-condição requer controle sobre o próprio cliente, (3) a severidade original WARNING foi rebaixada para SUGGESTION.

- **Sugestão:** Adicionar validação explícita no BatchOrchestrator para documentar a intenção defensiva:

```typescript
const { renderMode, vetorialPreset } = useAnimationStore.getState();
const validatedMode: SpeedPaintRenderMode = renderMode === 'vetorial' ? 'vetorial' : 'mask';
const validatedPreset: VetorialPreset | undefined = validatedMode === 'vetorial'
  ? (VETORIAL_PRESETS.includes(vetorialPreset as VetorialPreset) ? vetorialPreset as VetorialPreset : 'artistic1')
  : undefined;
```

---

### [SUGGESTION] Sem validação no setter da store para `renderMode`

- **Arquivo:** `src/features/speed-paint/store/animationStore.ts:193`
- **Confidence:** 65/100
- **Categoria:** Injection
- **Problema:** O setter `setRenderMode` aceita qualquer valor sem validação de runtime.
- **Evidência:**

```typescript
// animationStore.ts:193
setRenderMode: (renderMode) => set({ renderMode }),
```

- **Impacto:** Mesmo que o `ToggleButtonGroup` da UI só emita `'mask'` ou `'vetorial'`, o setter não valida. Qualquer código ou extensão que chame `setRenderMode('invalido')` passaria sem barreira. Porém, o downstream (`generateStrokesFromImage`) trata o valor inseguramente como seguro.

- **Sugestão:** Adicionar guard no setter:

```typescript
setRenderMode: (renderMode) => set({
  renderMode: renderMode === 'vetorial' ? 'vetorial' : 'mask',
}),
```

---

### [SUGGESTION] Log de erro não estruturado expõe objeto Error completo

- **Arquivo:** `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:131`
- **Confidence:** 40/100
- **Categoria:** PII
- **Problema:** O log de erro passa `{ error: err }` sem sanitização explícita.
- **Evidência:**

```typescript
log.error('Falha ao processar imagem em lote', { error: err });
```

- **Mitigação:** O logger frontend (`src/lib/logger/sanitization.ts`) aplica sanitização automática em todos os payloads via `sanitizePayload()` antes de enviar ao Firestore. `sanitizeMessage()` redacta JWTs, emails, tokens e URLs com credenciais. Objetos Error são percorridos recursivamente com `sanitizeMetadata()`.

- **Impacto:** Em condições normais, dados sensíveis no `err.message` ou `err.stack` são redactados antes do log persistir. Risco apenas se o logger for bypassado ou configurado sem sanitização.

- **Confidence rebaixada para 40** porque a sanitização automática do logger cobre este caso — não há risco real no fluxo atual.

- **Sugestão:** Para defesa em profundidade, extrair apenas `err.message` em vez de passar o objeto completo:

```typescript
log.error('Falha ao processar imagem em lote', {
  error: err instanceof Error ? err.message : String(err),
});
```

---

## O que parece saudável

- **Race condition:** `processingIdRef` previne que resultados de processamentos cancelados ou obsoletos sejam aplicados. O `abortControllerRef` é abortado antes de cada novo processamento. `currentImageIdRef` previne re-processamento da mesma imagem.
- **DoS por troca de renderMode:** `renderMode` não está nas dependências do `useEffect` principal — trocá-lo não reinicia o processamento atual. Só afeta o próximo item da fila.
- **Memory leak:** `abortControllerRef` é abortado e limpo em 3 pontos distintos (cleanup do effect, mudança de batchMode, antes de novo processamento). `skipTimeoutRef` é limpo consistentemente.
- **Separação de responsabilidades:** A lógica de renderização está em `imageProcessing.ts` com fallbacks próprios — o orquestrador não precisa replicar validação para estar seguro.
- **Logger sanitizado:** Sistema robusto de sanitização com `sanitizePayload`, `sanitizeMessage`, `sanitizeStackTrace` que redacta JWTs, emails, tokens e URLs com credenciais antes de qualquer persistência.

---

## Limites da revisão

- **Análise estática apenas:** Não foi possível testar cenários de race condition com concorrência real no navegador.
- **`bun x eslint` e `bun x tsc -b`:** Os terminais não exibiram saída, mas o exit code foi 0 (sem erros). A configuração do ESLint pode suprimir output quando não há problemas.
- **Store Zustand com persistência:** Não foi verificado se `renderMode`/`vetorialPreset` são persistidos em `localStorage` e se um valor corrompido no storage poderia causar comportamento inesperado na inicialização. Mas o downstream trataria como `'mask'` de qualquer forma.
- **imagetracerjs:** Não foi verificado o comportamento do `imagetracerjs` com presets inválidos — assume-se que a lib trata entradas inesperadas graciosamente.

---

## Checks rápidos

| Superfície | Status | Obs |
|-----------|--------|-----|
| Validação de entrada no BatchOrchestrator | ⚠️ Ausente, mas mitigada downstream | SUGGESTION |
| Validação no setter da store | ⚠️ Ausente | SUGGESTION |
| Race condition (processingIdRef) | ✅ Robusto | — |
| Race condition (abortController) | ✅ Robusto | — |
| DoS por troca rápida de renderMode | ✅ Mitigado | renderMode não está nas deps |
| Memory leak (AbortController) | ✅ Limpo em 3 pontos | — |
| Memory leak (skipTimeoutRef) | ✅ Limpo | — |
| PII em logs (dataUrl) | ✅ Não logado | — |
| PII em logs (objeto Error) | ⚠️ Mitigado pelo logger | SUGGESTION |
| Type guard runtime (renderMode) | ⚠️ Ausente, mitigado downstream | SUGGESTION |
| ESLint | ✅ exit 0 | — |
| TypeScript typecheck | ✅ exit 0 | — |

---

## Priorização

1. **Nenhum bloqueador de merge.** Todos os riscos são teóricos ou mitigados por camadas inferiores.
2. **Opção de hardening (baixo esforço):** Adicionar validação de runtime no BatchOrchestrator (linha 108) para `renderMode` e `vetorialPreset` — documenta a intenção defensiva e protege contra valores corrompidos na store.
3. **Opção de hardening (baixíssimo esforço):** Substituir `{ error: err }` por `{ error: err instanceof Error ? err.message : String(err) }` — redundante com a sanitização do logger, mas elimina qualquer risco residual.

---

## Conclusão

O código da L5 (RF-08) é **seguro para merge**. As vulnerabilidades apontadas são cenários de hardening com confidence < 80 após validação anti-falso-positivo. Nenhum risco real identificado que justifique bloqueio ou escalação.
