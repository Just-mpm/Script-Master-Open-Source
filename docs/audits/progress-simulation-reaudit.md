# Re-auditoria: Simulação de Progresso (Timer com `progressTimerRef`)

**Data:** 2026-05-27
**Escopo:** `src/hooks/useAudioGenerator.ts` + `src/components/app/AudioGenerationHandler.tsx`
**Foco:** Correção do memory leak e qualidade da implementação do timer de progresso simulado

---

## 1. Escopo da revisão

Leitura completa de ambos os arquivos, verificação de propagação de `estimatedChunkCount`, análise do fluxo `handleGenerate → confirmGenerate → generateAudio`, e validação da tipagem.

---

## 2. Veredito

**Sem problemas relevantes.** As correções solicitadas no audit anterior foram aplicadas corretamente. Não há regressão.

---

## 3. Achados

Nenhum achado atingiu o confidence gate mínimo. Todos os cenários investigados estão cobertos:

### 3.1 Memory leak — ✅ Corrigido

O leak anterior (variável `let progressTicks` sem ref) foi substituído por `progressTimerRef` com cleanup em **3 pontos de saída**:

| Cenário | Local da limpeza | Funciona? |
|---------|------------------|-----------|
| Resposta da Cloud Function chega | Linhas 461–464 (pós-await) | ✅ |
| Erro ou cancelamento no `catch` | Linhas 777–780 (`finally`) | ✅ |
| Componente desmonta durante geração | Linhas 292–295 (`useEffect` unmount) | ✅ |

**Verificação extra:** O ref nunca é limpo duas vezes — as guards `if (progressTimerRef.current)` em todos os 3 pontos previnem double-clear.

### 3.2 TypeScript — ✅ Correto

- `useRef<ReturnType<typeof setInterval> | null>(null)` → tipo correto
- `options.estimatedChunkCount` → `number | undefined` (opcional em `GenerateOptions`)
- `const estimatedChunks = options.estimatedChunkCount ?? 0` → fallback para 0 com nullish coalescing

### 3.3 Edge cases — ✅ Cobertos

| Cenário | Comportamento | Status |
|---------|---------------|--------|
| `estimatedChunkCount = undefined` ou `0` | `estimatedChunks > 0` é `false` → timer **não** criado | ✅ Seguro |
| `estimatedChunkCount = 1` | 1 tick: `(1/1)*50 = 50`, `Math.min(50, 49)` = **49%** | ✅ Teto correto |
| `estimatedChunkCount = 100`, CF leva 30min | 30 ticks: `(30/100)*50 = 15%` | ✅ Conservador, sem falso 100% |
| Múltiplas gerações simultâneas | Protegido por `if (isGenerating) return;` no handler (linha 178) | ✅ |
| Timer nunca iniciado | `progressTimerRef.current` é `null` → `clearInterval` não chamado | ✅ |
| NaN vindo do backend | `NaN > 0` é `false` → timer não criado | ✅ Seguro |

### 3.4 Propagação de `estimatedChunkCount` — ✅ Sem regressão

O fluxo é:

1. `buildGenerateOptions()` **não inclui** `estimatedChunkCount` (o tipo `GenerateOptionsState` não tem esse campo)
2. `handleGenerate()` armazena opções sem `estimatedChunkCount` em `pendingGenerateOptions`
3. `confirmGenerate()` **adiciona** `preflight.estimatedChunkCount` ao spread (linha 259 → `estimatedChunkCount: preflight.estimatedChunkCount`)
4. `generateAudio()` usa `options.estimatedChunkCount ?? 0` (linha 440)

Todos os tipos são compatíveis. A ordem do spread garante que o valor do preflight prevalece.

### 3.5 Observações de manutenibilidade (não são achados)

- `progressTicks` é um `let` local capturado pela closure do `setInterval` — corretamente isolado por chamada de `generateAudio`
- O intervalo de 60s é hardcoded. Se no futuro o backend mudar a velocidade de processamento, pode ser necessário tornar configurável
- O teto de 49% evita que a simulação ultrapasse a métrica real de 50% pós-resposta — proteção que funciona independentemente da acurácia do `estimatedChunkCount`

---

## 4. O que parece saudável

- Cleanup triplo cobre todos os cenários de saída da função e desmontagem
- Separação clara: hook gerencia estado + refs, handler gerencia UI + preflight + confirmação
- `NaN` e valores negativos são inertes (guard `> 0`)
- Tipagem explícita em `GenerateOptions.estimatedChunkCount` com JSDoc

---

## 5. Limites da revisão

- Não foi possível verificar a resposta real do backend `audioPreflight` para garantir que `estimatedChunkCount` nunca é `NaN` ou negativo. Isso é responsabilidade da Cloud Function.
- A condição de corrida teórica (2 chamadas simultâneas a `generateAudio`) não foi testada em runtime, mas está estruturalmente bloqueada pelo handler e pelo botão desabilitado na UI.
