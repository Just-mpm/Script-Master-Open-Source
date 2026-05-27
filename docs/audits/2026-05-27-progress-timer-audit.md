# Auditoria: Timer de Progresso Estimado em `useAudioGenerator`

**Data:** 2026-05-27
**Arquivo auditado:** `src/hooks/useAudioGenerator.ts` (805 linhas)
**Foco:** Implementação da simulação de progresso (timer `setInterval`) no `generateAudio()`

---

## Escopo da revisão

- Leitura completa do arquivo `src/hooks/useAudioGenerator.ts`
- Leitura completa da store `src/features/studio/store/audioGeneratorStore.ts` (tipos, actions, estado inicial)
- Verificação de consumo de `generationProgress` em `ActionBar.tsx`, `AudioGenerationHandler.tsx`, `App.tsx` e testes
- Consulta ao NotebookLM React (ID `8765c786`) sobre padrão de cleanup de timer em unmount com Promise pendente
- Análise de escopo, tipo, cleanup e edge cases do timer

---

## Veredito

**Ajustes recomendados** — Um problema de memory leak temporário identificado (severidade WARNING). Demais aspectos estão corretos.

---

## Achados priorizados

### [WARNING] Timer de progresso não é limpo se o hook desmontar durante geração

- **Arquivo:** `src/hooks/useAudioGenerator.ts:420-444`
- **Confidence:** 95/100
- **Categoria:** Memory Leak
- **Problema:** A variável `progressTimer` é declarada com `let` dentro da callback `generateAudio` (escopo local). Se o componente que consome `useAudioGenerator` desmontar enquanto a Promise de geração (`audioCallable`) ainda está pendente, o `finally` (linha 769) só executa quando a Promise completar. O timer continua rodando nesse intervalo — o cleanup do `useEffect` atual (linha 283-290) não tem acesso a `progressTimer` por ser uma variável local da callback.

  O padrão usado em `errorTimerRef` (linha 267: `useRef<ReturnType<typeof setTimeout> | null>`) já resolve exatamente este problema para o timer de auto-dismiss de erro. O `progressTimer` deveria seguir o mesmo padrão.

- **Evidência:**

  **Linha 267** — timer de erro usa ref (bom):
  ```typescript
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  ```

  **Linha 283-290** — cleanup do useEffect limpa `errorTimerRef` no unmount:
  ```typescript
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, []);
  ```

  **Linhas 420-444** — `progressTimer` é variável local (não ref), inacessível ao cleanup:
  ```typescript
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  // ...
  if (estimatedChunks > 0) {
    progressTimer = setInterval(() => {
      // ...
    }, 60_000);
  }
  ```

- **Impacto:** Em cenários de navegação frequente (usuário muda de rota enquanto o áudio está sendo gerado), o timer continua alocado e executando callbacks a cada 60s até a Promise original completar. Com o timeout de 30min (`1_800_000` ms na linha 452), o timer pode viver por até 30 minutos após o usuário já ter saído da página. Múltiplas navegações podem acumular timers ativos.

- **Sugestão:** Substituir a variável local `progressTimer` por uma ref (`progressTimerRef`), seguindo o mesmo padrão de `errorTimerRef`:

  1. Adicionar no corpo do hook (junto com `errorTimerRef`):
     ```typescript
     const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
     ```

  2. No `generateAudio`, usar `progressTimerRef.current` em vez de `progressTimer`:
     ```typescript
     // Dentro do try, antes do await
     const estimatedChunks = options.preflight?.totalPlanned ?? 0;
     if (estimatedChunks > 0) {
       progressTimerRef.current = setInterval(() => {
         progressTicks++;
         const estimated = Math.min((progressTicks / estimatedChunks) * 50, 49);
         storeApi.getState().setGenerationProgress(estimated);
       }, 60_000);
     }
     ```

  3. No cleanup existente do `useEffect`:
     ```typescript
     useEffect(() => {
       return () => {
         if (errorTimerRef.current) { /* ... */ }
         if (progressTimerRef.current) { // NOVO
           clearInterval(progressTimerRef.current);
           progressTimerRef.current = null;
         }
       };
     }, []);
     ```

  4. No `finally` (linha 769-771), limpar a ref em vez da variável local:
     ```typescript
     if (progressTimerRef.current) {
       clearInterval(progressTimerRef.current);
       progressTimerRef.current = null;
     }
     ```

---

### [SUGGESTION] Simulação com intervalo fixo de 60s pode ser imprecisa

- **Arquivo:** `src/hooks/useAudioGenerator.ts:444`
- **Confidence:** 85/100 (rebaixado de WARNING para SUGGESTION pelo confidence gate 80-89)
- **Categoria:** UX
- **Problema:** O intervalo de 60.000ms por chunk é uma estimativa fixa que não considera:
  - Tamanho variável dos chunks (500 chars cada, mas o primeiro chunk pode ser menor)
  - Latência de rede e tempo de processamento no backend
  - Variação entre vozes/emoções (algumas podem processar mais rápido)

  Para scripts com muitos chunks (ex: 50+), o progresso avança ~1% por minuto. Para scripts com poucos chunks (ex: 2), pula de 10% para 25% no primeiro tick após 60s, o que pode parecer "travado" até lá.

- **Evidência:**

  ```typescript
  const estimatedChunks = options.preflight?.totalPlanned ?? 0;

  if (estimatedChunks > 0) {
    progressTimer = setInterval(() => {
      progressTicks++;
      const estimated = Math.min((progressTicks / estimatedChunks) * 50, 49);
      storeApi.getState().setGenerationProgress(estimated);
    }, 60_000);
  }
  ```

- **Impacto:** Baixo. O progresso é uma simulação com teto de 49% (nunca mente que passou da metade). A imprecisão não afeta a funcionalidade, apenas a experiência do usuário que pode achar que travou em roteiros longos.

- **Sugestão:** Duas abordagens complementares:
  1. **Intervalo dinâmico:** Em vez de 60s fixo, usar `totalDuration / estimatedChunks` (se o preflight fornecer duração estimada). Se não houver duração, manter 60s como fallback.
  2. **Feedback textual adicional:** Além da barra de progresso, o `statusText` já existe e dá feedback semântico ("Gerando áudio..."). Garantir que ele seja atualizado periodicamente mesmo quando o progresso percentual está baixo.

---

## O que parece saudável

- **Escopo correto:** `progressTimer` e `progressTicks` são declarados antes do `try`, acessíveis no `finally`. ✅
- **Cleanup no finally:** O timer é limpo no `finally` (linha 771), garantindo execução em sucesso, erro e cancelamento. ✅
- **Cleanup no sucesso:** O timer é limpo imediatamente após `await audioCallable()` (linha 457-458), antes do processamento do resultado. ✅
- **Proteção contra divisão por zero:** `estimatedChunks > 0` antes de iniciar o timer (linha 439). ✅
- **Teto de 49%:** `Math.min(..., 49)` impede que a simulação ultrapasse a metade, nunca mentindo que o progresso real passou de 50%. ✅
- **Tipo TypeScript:** `ReturnType<typeof setInterval>` é o padrão idiomático correto — resolve para `number` no browser, aceito por `clearInterval()`. ✅
- **Reset entre gerações:** `progressTicks` é reinicializado como `0` a cada chamada de `generateAudio` (linha 421). ✅
- **Progresso inicial 0 e 10%:** O progresso é setado como 0 (linha 361) e depois 10% (linha 430) antes do timer começar, dando feedback imediato ao usuário. ✅
- **Zustand sem re-render excessivo:** `setGenerationProgress` dispara `set({ generationProgress: value })` — com intervalo de 60s, não há risco de performance. ✅

---

## Limites da revisão

- Não foi possível testar o comportamento em runtime (apenas leitura estática).
- A precisão do `preflight.totalPlanned` (número de chunks) depende da implementação no backend (Cloud Function), que não foi auditada neste escopo.
- Não foi verificado se há outros hooks ou componentes que consomem `generationProgress` com frequência maior que 60s (não encontrado na varredura, mas possível em componentes não indexados).
- A sugestão de `AbortController` para `httpsCallable` não é aplicável — o Firebase Functions não suporta `AbortSignal` nativamente; o cancelamento via `cancelAiRequestCallable` já é o padrão correto.
