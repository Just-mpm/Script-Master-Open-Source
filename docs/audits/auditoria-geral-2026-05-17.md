# Auditoria Geral — Script Master v0.32.0

**Data:** 2026-05-17  
**Tipo:** Auditoria estática de engenharia, riscos, padrões, Firebase e testes  
**Escopo:** Hotspots (logger, tokens, AuthContext), áreas core (auth, billing, áudio/TTS, persistência), testes, config  
**Arquivos lidos:** ~35 arquivos entre src/ e tests/

---

## Veredito

**Ajustes recomendados** — 1 bug real de memory leak encontrado, 2 warnings de resiliência, 4 sugestões de melhoria. O código é bem estruturado no geral, com tipagem forte e boas práticas consistentes.

---

## Achados Priorizados

---

### [CRITICAL] Memory leak: subscription Firestore nunca é cancelada no useBillingInit

- **Arquivo:** `src/features/billing/hooks/useBillingInit.ts:54-60`
- **Confidence:** 95/100
- **Categoria:** Memory Leak | Firebase
- **Problema:** O hook `useBillingInit` cria uma subscription Firestore via `onSnapshot` mas **nunca a cancela** quando o efeito re-executa ou o componente desmonta.

```typescript
// src/features/billing/hooks/useBillingInit.ts:54-60
loadSubscription().then(() => {
  const unsubscribe = subscribeToSubscription(); // ← cria onSnapshot
  return () => {
    unsubscribe(); // ← cleanup function, mas NUNCA é usada
  };
});
// O retorno do .then() é ignorado. O useEffect não recebe cleanup.
```

- **Impacto:** A cada troca de usuário ou re-render do AuthContext, uma nova subscription `onSnapshot` é criada sem cancelar a anterior. Em navegação longa, múltiplos listeners ativos consomem banda, bateria e podem causar leituras obsoletas. Como `useBillingInit` fica ativo enquanto o AuthProvider está montado (app inteiro), o leak persiste por toda a sessão.
- **Sugestão:** Armazenar `unsubscribe` em um `useRef` e chamar no cleanup do `useEffect`. Ou retornar uma função cleanup assíncrona que aguarda `loadSubscription` resolver e então armazena o unsubscribe.

---

### [WARNING] Múltiplos `setTimeout` sem cleanup em componentes

- **Arquivos:** Vários (ver evidência)
- **Confidence:** 88/100
- **Categoria:** Memory Leak | UX
- **Problema:** `setTimeout` usado para auto-dismiss de mensagens de erro/sucesso sem cleanup no unmount. Se o componente desmontar antes do timeout, `setState` é chamado em componente desmontado.

**Ocorrências confirmadas:**

| Arquivo | Linha | Código |
|---|---|---|
| `src/components/ImageStudio.tsx` | 221 | `window.setTimeout(() => setSuccessMsg(null), 3000)` |
| `src/components/Inspector.tsx` | 226 | `window.setTimeout(() => setReferenceImageWarning(null), 5000)` |
| `src/components/Configuracoes.tsx` | 171 | `window.setTimeout(() => setToast(null), 3000)` |
| `src/components/Library.tsx` | 217 | `window.setTimeout(() => setDeleteSuccess(false), 5000)` |
| `src/hooks/useAudioGenerator.ts` | 474, 602 | `setTimeout(() => storeApi.getState().setError(''), 8000)` |
| `src/hooks/useImageGenerator.ts` | 160 | `setTimeout(() => setError(''), 8000)` |
| `src/features/assistant/Assistant.tsx` | 127, 161, 235, 301 | `window.setTimeout(() => set[...], ...)` |

- **Impacto:** `setState` em componente desmontado. Em React 19 strict mode, gera warnings no console. Em casos extremos com timers longos e navegação rápida, pode causar vazamento indireto (closures retendo referências).
- **Sugestão:** Usar `useRef` para armazenar o timer ID e criar um `useEffect` cleanup que limpa o timeout. Para hooks como `useAudioGenerator`, o problema é menor porque é singleton (nunca desmonta), mas ainda inconsistente com a convenção do projeto. O `Inspector.tsx:198` é um exemplo de **como deveria ser** (com cleanup).

---

### [WARNING] `getPlanLimitForResource` — mapeamento manual frágil

- **Arquivo:** `src/features/billing/usageUtils.ts:145-163`
- **Confidence:** 82/100
- **Categoria:** Architecture
- **Problema:** A função `getPlanLimitForResource` mantém um array manual de `limitKeys` que replica o mapeamento já definido em `getUsageResourceKey`/`RESOURCE_TO_USAGE`. Se um novo recurso for adicionado em `PlanLimits`, ele precisa ser lembrado em **dois lugares**.

```typescript
const limitKeys: ReadonlyArray<keyof PlanLimits> = [
  'maxAudioGenerationsPerMonth',
  'maxImageGenerationsPerMonth',
  'maxVideoExportsPerMonth',
  'maxScriptChars',
  'maxStorageMB',
  // Se adicionar 'maxProjectCount' aqui, precisa lembrar de atualizar
];
```

- **Impacto:** Risco de dessincronização futura. Se adicionar `maxProjectCount` no `PlanLimits`, o billing pode não detectar corretamente o limite.
- **Sugestão:** Inverter o mapeamento: construir um `Record<UsageResource, keyof PlanLimits>` a partir de `RESOURCE_TO_USAGE` e iterar sobre ele, eliminando a lista manual duplicada.

---

### [SUGGESTION] `useAudioGenerator.ts` — 635 linhas, violação de SRP

- **Arquivo:** `src/hooks/useAudioGenerator.ts`
- **Confidence:** 90/100
- **Categoria:** Architecture
- **Problema:** O hook acumula múltiplas responsabilidades: chunking de roteiro (LLM + fallback), geração TTS (multi-speaker + emoções), montagem WAV, geração de cenas visuais, detecção de silêncio, persistência (Firestore + IndexedDB), auto-save de áudio e imagens, e gerenciamento de estado de cancelamento. A função `generateAudio` tem ~430 linhas.

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // ← supressão de dependências
```

- **Impacto:** Dificuldade de teste (tudo mockado), manutenção propensa a regressões, e a supressão de `exhaustive-deps` (linha 607) pode esconder bugs de stale closure.
- **Sugestão:** Extrair o pipeline em etapas: `AudioChunker` (chunking), `TtsGenerator` (TTS), `ScenePipeline` (cenas+detecção), `AudioPersister` (save). O hook coordenaria chamadas, não implementaria cada etapa.

---

### [SUGGESTION] Castings `as unknown as` no studioStore

- **Arquivo:** `src/features/studio/store/studioStore.ts:146,149`
- **Confidence:** 85/100
- **Categoria:** TypeScript
- **Problema:** Uso de double cast para iterar sobre chaves do patch, desativando parcialmente o type-checking.

```typescript
const stateRecord = state as unknown as Record<string, unknown>;
// ...
(updates as unknown as Record<string, unknown>)[key] = value;
```

- **Impacto:** Se uma chave inválida for passada no `StudioSettingsPatch`, o código não vai detectar em compile-time. Baixo risco porque o tipo da entrada é controlado por `StudioSettingsPatch`, mas o padrão enfraquece a segurança de tipos.
- **Sugestão:** Extrair as chaves válidas de `StudioSettingsPatch` como um array tipado em vez de usar `Object.entries` com cast.

---

### [SUGGESTION] `UNLIMITED = 0` — convenção frágil

- **Arquivo:** `src/features/billing/plans.ts:8`
- **Confidence:** 80/100
- **Categoria:** Architecture
- **Problema:** Usar `0` como "ilimitado" pode causar ambiguidade. Em `checkEntitlement` (usageUtils.ts:35), `rawLimit === 0` é tratado como ilimitado, mas se em algum lugar o valor `0` for usado sem esse tratamento especial, será interpretado como "zero/sem permissão".

```typescript
const UNLIMITED = 0;
```

- **Impacto:** Risco de bug se um novo desenvolvedor usar `plan.limits.maxStorageMB` diretamente sem passar pelo `checkEntitlement`. Exemplo: `if (usage < plan.limits.maxStorageMB)` seria incorreto para business (0 < 0 = false, mas deveria ser ilimitado).
- **Sugestão:** Usar `Number.POSITIVE_INFINITY` para ilimitado (ou `null`), mantendo `0` como "zero real". Ajustar `checkEntitlement` e `getRemainingUsage` para tratar `Infinity` como ilimitado.

---

### [SUGGESTION] `AuthContext` — funções de autenticação poderiam ser extraídas

- **Arquivo:** `src/contexts/AuthContext.tsx`
- **Confidence:** 75/100 → **REBAIXADO** (confidence < 80 → descartado da lista principal, mantido como observação)

Após reavaliação: O AuthContext tem 268 linhas com 6 handlers de autenticação. Embora seja grande, cada handler é conciso (15-30 linhas) e segue o mesmo padrão (try/catch + setError). A complexidade é justificada pelo número de métodos Firebase necessários. **Descartado por confidence 75.**

---

## O que parece saudável

- **Zero `console.log/warn/error`** fora do logger.ts — todos os módulos usam `createLogger`. Padrão exemplar.
- **Zero `process.env`** no src/ — todas as variáveis passam por `src/lib/env.ts` com funções nomeadas.
- **Zero `any`** não documentado — única ocorrência (`canvasFontStretchPatch.ts:105`) tem `eslint-disable-next-line` com justificativa clara.
- **Stores Zustand consistentes** — todas seguem o mesmo padrão (interface + INITIAL_STATE + create + ações inline), sem immer, sem persist middleware desnecessário.
- **Cobertura de testes robusta** — ~100 arquivos de teste, incluindo testes unitários e de componente para auth, billing, áudio, assistant, speed-paint, video-render, temas e hooks críticos.
- **Tratamento de erros amigável** — `createErrorMapper` com fallback e regras compartilhadas entre domínios. Mensagens em pt-BR com mapeamento por código Firebase.
- **Retry com backoff bem implementado** — `withRetry` com exponential backoff + jitter, tratamento seletivo de erros transitórios vs permanentes.
- **Cleanup correto em hooks críticos** — `useKeyboardShortcuts`, `useOnlineStatus`, `useTranscription`, `useAssistant` e `ActionBar` têm cleanup de event listeners e intervals.
- **COEP management** — implementação correta com exceções para rotas que usam Firebase Auth popup.
- **Testes de billing** — cobrem checkEntitlement, getRemainingUsage, needsUpgrade, formatUsageLimit/Display, PLANS e formatPrice com edge cases (uso negativo, limite exato, ilimitado, recursos booleanos).

---

## Limites da revisão

- **Análise estática apenas** — não foi executado nenhum teste ou build.
- **Firebase Rules não auditados** — as regras de segurança Firestore/Storage estão em arquivos separados (`firestore.rules`, `storage.rules`), não examinados aqui.
- **Cloud Functions** — apenas o índice (`functions/src/index.ts`) está na lista de arquivos sem área; o conteúdo não foi lido por completo.
- **Remotion components** — a área de renderização de vídeo tem 60 arquivos; apenas alguns foram lidos (bridge, patches, players).
- **Testes de speed-paint e video-render** — não examinados individualmente; apenas contagem de arquivos.
- **Performance** — não foram feitas medidas de bundle, re-renders ou queries Firestore.
- **Acessibilidade** — não auditada formalmente (embora alguns componentes usem `aria-*` corretamente).

---

## Próximo passo recomendado

1. **`worker`** — Corrigir o memory leak do `useBillingInit` (CRITICAL) usando `useRef` para armazenar e limpar o unsubscribe do `onSnapshot`.
2. **`worker`** — Adicionar cleanup nos `setTimeout` sem cleanup (WARNING), começando pelos mais impactantes (useAudioGenerator, Inspector, Assistant).
3. **Revisão futura** — Refatorar `useAudioGenerator.ts` (635 linhas) em etapas menores quando houver tempo dedicado.
4. **Preventivo** — Ajustar `UNLIMITED = 0` para `Infinity` no billing antes de adicionar novos planos/limites.
