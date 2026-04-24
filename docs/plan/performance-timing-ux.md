# Plano: Otimização de Performance (Re-renders) + UX do Editor de Timing

## Contexto

O aplicativo apresenta lentidão perceptível em diversos pontos, especialmente na página `/video` ao interagir com o editor de legendas (CaptionEditorPanel). A investigação revelou **5 fontes principais de re-renders desnecessários** que afetam não apenas o editor, mas o app inteiro.

### Evidências coletadas

1. **`VideoPreview.tsx`** faz polling via `requestAnimationFrame` (~30x/s) e chama `onFrameUpdate(frame)` que atualiza `useState` na `VideoPage` a cada frame — causando re-render em cascata
2. **`ActionBar.tsx`** faz polling duplicado via `setInterval(100ms)` para obter frame do Remotion Player (já obtido pelo VideoPreview) — segundo estado independente redundante
3. **`App.tsx`** desestrutura 17+ valores de `useStudioState()` — qualquer mudança (digitar no roteiro, trocar voz) re-renderiza App inteiro, incluindo Header, ActionBar, Toasts
4. **`CaptionEditorPanel`** recebe `currentFrame` como prop e re-renderiza completamente a cada frame (recalcula `activePhraseId` via `.find()`, faz auto-scroll com `scrollIntoView({ behavior: 'smooth' })`, formata timestamps)
5. **`useStudioState`** é um hook monolítico com ~30 `useState` — qualquer mudança individual invalida o hook inteiro e causa re-render cascata em todos os consumidores

### Problema secundário: UX do timing
O campo de edição de timing no CaptionEditorPanel trabalha com **frames brutos** (ex: `337`), mas o Chip de cabeçalho mostra timestamp formatado (`00:11.23`). O usuário vê um número sem correspondência visual imediata com o que aparece no vídeo.

## Decisões Tomadas

### 1. Fonte de frame atual — External Store vs Props
- **Opção A:** External Store (Zustand/useSyncExternalStore) para currentFrame
- **Opção B:** useRef + polling local no CaptionEditorPanel
- **Decisão: Opção A** — External Store via Zustand (já usado no projeto). Permite que qualquer componente assine ao frame sem afetar a árvore React. O `videoRenderBridge` já é um store Zustand — basta adicionar `currentFrame` lá.

### 2. Eliminar polling duplicado na ActionBar
- **Opção A:** ActionBar assina o mesmo external store
- **Opção B:** ActionBar recebe frame via props
- **Decisão: Opção A** — ActionBar usa `useVideoRenderBridge` com selector para `currentFrame`, eliminando o `setInterval(100ms)` inteiro.

### 3. Memoizar PhraseCard no CaptionEditorPanel
- **Decisão:** `React.memo` em `PhraseCard` + memoizar callbacks via `useCallback` com stable deps. Sempre que `currentFrame` muda, apenas o `PhraseCard` ativo re-renderiza (highlight muda), os outros pulam.

### 4. Auto-scroll do CaptionEditorPanel
- **Opção A:** Remover smooth scroll
- **Opção B:** Throttle do auto-scroll (a cada 500ms)
- **Decisão: Opção B** — Throttle de 500ms. Mantém a UX de scroll suave mas elimina o custo de `scrollIntoView({ behavior: 'smooth' })` 30x/s.

### 5. UX do timing: campos em segundos
- **Opção A:** Campo mostra/edita em segundos (converte para frames internamente)
- **Opção B:** Campo mostra/edita em frames com label claro
- **Decisão: Opção A** — Campo edita em segundos com 2 casas decimais (ex: `11.23`). Conversão frame↔segundo no onChange/onBlur. O hint ao lado mostra o timestamp `MM:SS.xx` como referência visual.

## Reutilização e Padrões

- **Reutilizar:** `videoRenderBridge.ts` — adicionar `currentFrame` + `syncCurrentFrame` ao store existente (padrão Zustand já usado)
- **Reutilizar:** `formatTimestamp()` de `formatTimestamp.ts` — já faz frame→MM:SS.xx
- **Reutilizar:** Padrão `useSyncExternalStore` do `AudioContext.tsx` — referência de external store otimizado
- **Novo:** `formatSecondsToTimestamp()` helper — inversão (string "11.23" → frame) para o campo de timing. Função pura, 3 linhas.
- **Novo:** `throttleRef` utility — ref com throttle para auto-scroll (evita depender de lib externa)

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/features/video-render/store/videoRenderBridge.ts` | Adicionar `currentFrame` + `syncCurrentFrame` + `isPlaying` + `syncIsPlaying` |
| `tests/video-render/videoRenderBridge.unit.test.ts` | Atualizar testes para cobrir `currentFrame`, `syncCurrentFrame`, `isPlaying`, `syncIsPlaying` |
| `src/components/VideoPreview.tsx` | RAF escreve no bridge store em vez de prop callback; remover `onFrameUpdate` prop |
| `src/pages/VideoPage.tsx` | Remover `currentPlayerFrame` state; CaptionEditorPanel não recebe `currentFrame` |
| `src/components/ActionBar.tsx` | Remover polling `setInterval(100ms)` e estados `playerFrame`/`playerIsPlaying`/`isRemotionActive`; ler do bridge store |
| `src/features/video-render/components/CaptionEditorPanel.tsx` | Assinar `currentFrame` do bridge store internamente; `React.memo` em `PhraseCard`; throttle no auto-scroll; timing em segundos |
| `src/features/video-render/lib/formatTimestamp.ts` | Adicionar `secondsToFrame()` e `frameToSeconds()` |
| `src/App.tsx` | Memoizar valores derivados do studio que vão para ActionBar; memoizar `appRoutes` |

## Passos de Implementação

### Lote 1: External Store de Frame (Bridge)

**1. Ampliar videoRenderBridge com currentFrame e isPlaying**
- Arquivos: `src/features/video-render/store/videoRenderBridge.ts`, `tests/video-render/videoRenderBridge.unit.test.ts`
- Adicionar `currentFrame: number` ao estado
- Adicionar `syncCurrentFrame(frame: number)` action
- Adicionar `isPlaying: boolean` ao estado
- Adicionar `syncIsPlaying(playing: boolean)` action
- Atualizar `resetBridge` para limpar os novos campos
- Atualizar testes existentes para cobrir os novos campos
- **Trade-off consciente:** O Zustand Guide recomenda isolar stores de alta frequência. Com apenas 4 consumers (CaptionEditorPanel, ActionBar, VideoPreview, VideoPage), o custo é aceitável e evita proliferar stores.
- **Resultado:** Store centralizado para frame atual e estado de reprodução do player

Sugestão: `fix-worker` | Notebook: `{c7233d41-4d3e-471e-9e96-5247f6f6208c}` (Zustand Guide)

**2. Refatorar VideoPreview para escrever no bridge store**
- Arquivos: `src/components/VideoPreview.tsx`
- Remover prop `onFrameUpdate`
- No RAF loop, chamar `useVideoRenderBridge.getState().syncCurrentFrame(frame)` e `syncIsPlaying(playing)` diretamente
- Manter `seekTo` no handle imperativo atualizando o store
- **Resultado:** Frame propagado sem causar re-render em VideoPage

Sugestão: `fix-worker` | Notebook: `{10dd427a-e066-48e5-9001-7c870d390078}` (React - useSyncExternalStore pattern)

**3. Refatorar VideoPage para remover currentPlayerFrame**
- Arquivos: `src/pages/VideoPage.tsx`
- Remover `const [currentPlayerFrame, setCurrentPlayerFrame] = useState(0)`
- Remover prop `currentFrame={currentPlayerFrame}` do CaptionEditorPanel
- Remover `onFrameUpdate={setCurrentPlayerFrame}` do VideoPreview
- **Resultado:** VideoPage não re-renderiza mais a cada frame

Sugestão: `fix-worker`

### Lote 2: CaptionEditorPanel Otimizado + UX Timing

**4. CaptionEditorPanel assina bridge store internamente**
- Arquivos: `src/features/video-render/components/CaptionEditorPanel.tsx`
- Substituir prop `currentFrame` por `useVideoRenderBridge(state => state.currentFrame)` com selector
- Memoizar `activePhraseId` com `useMemo`
- **Resultado:** Apenas o CaptionEditorPanel re-renderiza quando o frame muda (VideoPage não)

Sugestão: `fix-worker` | Notebook: `{c7233d41-4d3e-471e-9e96-5247f6f6208c}` (Zustand v5 - useShallow)

**5. Memoizar PhraseCard com React.memo**
- Arquivos: `src/features/video-render/components/CaptionEditorPanel.tsx`
- Envolver `PhraseCard` em `React.memo` com custom arePropsEqual (comparar isActive, isEditing, isTimingExpanded, phrase.id)
- Memoizar callbacks `onStartEdit`, `onToggleTiming`, `onDelete`, `onTimingChange`, `onTimingBlur` via `useCallback`
- **Resultado:** Apenas o PhraseCard ativo re-renderiza quando frame muda; os outros pulam

Sugestão: `fix-worker` | Notebook: `{10dd427a-e066-48e5-9001-7c870d390078}` (React - memo pattern)

**6. Throttle no auto-scroll**
- Arquivos: `src/features/video-render/components/CaptionEditorPanel.tsx`
- Implementar throttle via ref (última execução timestamp) no useEffect de auto-scroll
- Intervalo mínimo: 500ms
- **Resultado:** `scrollIntoView({ behavior: 'smooth' })` executa no máximo 2x/s em vez de 30x/s

Sugestão: `fix-worker`

**7. UX: Timing em segundos no CaptionEditorPanel**
- Arquivos: `src/features/video-render/components/CaptionEditorPanel.tsx`, `src/features/video-render/lib/formatTimestamp.ts`
- `formatTimestamp.ts`: adicionar `frameToSeconds(frame, fps): number` e `secondsToFrame(seconds, fps): number`
- TextField de timing: `type="number"` com `step="0.01"`, valor em segundos, `onChange` converte segundos→frames via `secondsToFrame`
- Hint ao lado continua mostrando `formatTimestamp(frame, fps)` como referência
- ARIA label atualizado: "Início (segundos)"
- **Resultado:** Usuário digita `11.23` (segundos) em vez de `337` (frames)

Sugestão: `builder-worker`

### Lote 3: ActionBar e App.tsx

**8. Eliminar polling duplicado na ActionBar**
- Arquivos: `src/components/ActionBar.tsx`
- Remover `setInterval(100ms)` e estados `playerFrame`, `playerIsPlaying`, `isRemotionActive`
- Remover refs `prevFrameRef`, `prevPlayingRef`
- Assinar `useVideoRenderBridge` com selector para `currentFrame` e `isPlaying`
- **Resultado:** Elimina segundo polling redundante; ActionBar re-renderiza apenas quando frame muda (via store subscription otimizada)

Sugestão: `fix-worker`

**9. Memoizar callbacks no App.tsx**
- Arquivos: `src/App.tsx`
- Memoizar callbacks estáticos passados para ActionBar (`scrollToExport`, `dismissError`, `dismissSceneWarning`) — já usam `useCallback` com deps estáveis
- NOTA: NÃO memoizar `appRoutes` — `studio` não é estável (retorna novo objeto a cada render), e React 19 lazy + Suspense já isola as pages
- **Resultado:** App re-renderiza menos ao propagar mudanças do studio para componentes filhos

Sugestão: `fix-worker`

### Lote 4: Correção de Bugs de Renderização de Legendas

> **Bugs identificados durante exportação de vídeo:**
> 1. Legendas somem e reaparecem entre transições de frases
> 2. Posição vertical das legendas sobe progressivamente (drift acumulado)

#### Root Cause Analysis

**Bug 1 — Legendas desaparecem entre frases:**
- `SubtitleOverlay.tsx:119-128`: A frase ativa é encontrada via `frame >= startFrame && frame < endFrame`. Quando a frase N termina e a N+1 ainda não começou, `activePhraseIndex = -1`.
- `SubtitleOverlay.tsx:171-172`: `hasVisiblePhrases` retorna `false` quando `activePhraseIndex === -1` e o frame já passou da primeira frase → o componente retorna `null`, fazendo a legenda desaparecer por alguns frames.
- Quando a próxima frase entra, ela reaparece com fade in → efeito visual de "piscar/sumir".

**Bug 2 — Drift vertical acumulado:**
- `SubtitleOverlay.tsx:93`: `phraseHeight` é uma estimativa teórica (`fontSize * 1.6 + paddingY * 2 + gap`). Frases com bold, caracteres especiais ou wrapping podem ter altura real diferente.
- `SubtitleOverlay.tsx:134-146`: `translateY` acumula `-phraseHeight` para cada frase ativa já passada. Se a altura real < estimativa, o deslocamento extra se acumula. Com 10+ frases, a legenda "vaza" para cima significativamente.
- Quando `activePhraseIndex` fica `-1` (gap), o loop de acumulação não executa → scroll reseta abruptamente ao reiniciar, causando salto de posição.

**11. Corrigir desaparecimento entre frases (SubtitleOverlay)**
- Arquivos: `src/features/video-render/components/SubtitleOverlay.tsx`
- Alterar a lógica de `activePhraseIndex` para estender a última frase ativa até o início da próxima frase, eliminando o gap onde `activePhraseIndex = -1`:
  - Quando `frame >= currentPhrase.endFrame` e `frame < nextPhrase.startFrame`, manter `activePhraseIndex = currentIndex` em vez de `-1`
  - Alternativa: após o loop principal, se `activePhraseIndex === -1` mas `frame >= phrases[0][0].startFrame`, atribuir a última frase cujo `endFrame <= frame` (fallback "sticky")
- Atualizar `hasVisiblePhrases` para não depender exclusivamente de `activePhraseIndex !== -1`
- **Resultado:** Transição contínua entre frases sem flash de "nada na tela"

Sugestão: `fix-worker` | Notebook: `{3333bad6-daf0-4f5a-9a82-e5f0c038ef20}` (Remotion Docs — interpolate, useCurrentFrame)

**12. Corrigir drift vertical no translateY (SubtitleOverlay)**
- Arquivos: `src/features/video-render/components/SubtitleOverlay.tsx`
- Substituir a estratégia de `translateY` acumulativo por scroll baseado na frase atual:
  - **Opção A (recomendada):** Usar apenas 2 posições relativas — `0` (frase ativa na base) e `-phraseHeight` (frase anterior acima). O container sempre mostra no máximo 2 frases, então o scroll é sempre 0 ou `-phraseHeight`, sem acumulação.
  - Calcular `scrollY = activePhraseIndex > 0 ? -phraseHeight : 0` e interpolar a transição com `interpolate` usando o frame de entrada da frase ativa atual.
  - Isso elimina completamente o drift porque o deslocamento é absoluto (0 ou -phraseHeight), não cumulativo.
- Ajustar `phraseHeight` para usar `gap` entre as frases no container (já incluído no cálculo) e garantir consistência com o `gap` do CSS flex.
- **Resultado:** Legenda permanece na posição correta durante toda a duração do vídeo, sem subir progressivamente

Sugestão: `fix-worker` | Notebook: `{3333bad6-daf0-4f5a-9a82-e5f0c038ef20}` (Remotion Docs — interpolate, useCurrentFrame)

**13. Validar ScrollingPhrase remain consistente após correções**
- Arquivos: `src/features/video-render/components/ScrollingPhrase.tsx`
- Garantir que as correções no SubtitleOverlay não quebram o fade in/out da variante `active` e `previous`
- Verificar que `fadeOutFrame` da variante `previous` ainda funciona corretamente quando a frase ativa não mais "pula" para `-1`
- **Resultado:** Animações de opacidade intactas com o novo comportamento contínuo

Sugestão: `fix-worker`

### Lote 5: Validação

**14. Validação final**
- Executar `bun run lint`
- Executar `bun run typecheck`
- Teste manual: abrir `/video`, verificar que:
  - Player toca sem lag
  - CaptionEditorPanel abre timing instantaneamente
  - Timing mostra/edita em segundos
  - ActionBar progress bar atualiza normalmente
  - Auto-scroll funciona (com throttle)
  - Seek no CaptionEditorPanel funciona
- **Resultado:** App fluido, editor responsivo

Sugestão: `fix-worker`

## Riscos e Mitigações

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Bridge store com `currentFrame` causando re-render excessivo em múltiplos assinantes | Médio | Usar selector granular no CaptionEditorPanel; ActionBar pode usar throttle local para display |
| `React.memo` em PhraseCard quebrado por callbacks novos a cada render | Médio | Memoizar TODOS os callbacks passados como props com `useCallback` + stable deps |
| Conversão segundos↔frames causar perda de precisão (arredondamento) | Baixo | Usar `Math.round` apenas na conversão final; armazenar frames internamente; 2 casas decimais cobrem bem 30fps |
| Remover `onFrameUpdate` prop do VideoPreview quebrar contrato com outros consumidores | Baixo | Verificar com `impact_analysis` — apenas VideoPage consome `onFrameUpdate` (`VideoPage.tsx:187`). ActionBar tem polling independente (`ActionBar.tsx:98`) via `videoPlayerRef?.current`, não via `onFrameUpdate` |
| ActionBar perder sincronização de isPlaying ao eliminar polling | Médio | Já coberto: Passo 1 adiciona `isPlaying` + `syncIsPlaying` ao bridge store, sincronizado pelo VideoPreview RAF |
| Correção de gap entre frases causar sobreposição de legendas | Médio | Testar com roteiros longos (20+ frases) e frases curtas (< 5 palavras); garantir que a frase "sticky" não interfere com a fade out da variante previous |
| Scroll absoluto (0 ou -phraseHeight) causar transição abrupta entre frases | Baixo | Interpolar a transição com `interpolate` sobre `SUBTITLE_FADE` frames — mesma técnica já usada no fade in/out |
| `phraseHeight` teórico não corresponder à altura real renderizada pelo navegador | Baixo | A nova estratégia (apenas 2 posições) minimiza o impacto: erro é fixo (1 phraseHeight) e não acumulativo como antes |

## Verificação

- [ ] `bun run lint` passa sem erros
- [ ] `bun run typecheck` passa sem erros
- [ ] Player na `/video` toca sem engasgos
- [ ] CaptionEditorPanel abre timing instantaneamente (<100ms)
- [ ] Timing mostra/edita em segundos (ex: 11.23) com hint MM:SS.xx
- [ ] PhraseCard ativo highlight segue o vídeo
- [ ] Auto-scroll funciona com throttle (não 30x/s)
- [ ] ActionBar progress bar atualiza normalmente
- [ ] Nenhum console.error ou warning no DevTools
- [ ] Rotas `/estudio`, `/library`, `/assistant` não foram afetadas
- [ ] Legendas não somem entre transições de frases (scroll contínuo)
- [ ] Posição vertical das legendas permanece estável do início ao fim do vídeo (sem drift)
- [ ] Transição entre frases é suave (fade out/in sem flash)
- [ ] Animação de opacidade da variante `previous` funciona corretamente

## Notebooks Relevantes

| Notebook | ID | Uso |
|----------|----|-----|
| React Guide | `10dd427a-e066-48e5-9001-7c870d390078` | Padrões de memo, React.memo, useCallback, useSyncExternalStore |
| Zustand Guide | `c7233d41-4d3e-471e-9e96-5247f6f6208c` | Selectors, useShallow, transient updates, subscribe |
| Remotion Docs | `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` | interpolate, useCurrentFrame, AbsoluteFill, animações frame-a-frame |

## Instruções de Execução

Ao executar este plano, siga este protocolo:

### 1. Investigação
- Use analyze tools (`suggest_reads`, `impact_analysis`, `file_context`) nos arquivos listados
- Consulte os Notebooks Relevantes acima para confirmar padrões da tecnologia envolvida
- Identifique padrões, dependências e riscos que o plano não cobriu

### 2. Divisão do Trabalho
- Calcule tokens dos arquivos com `token-counter_token_count` (budget: 40K por agent)
- Agrupe por afinidade — arquivos que se modificam juntos ficam juntos
- Respeite dependências: quem cria tipo usado por outro vai primeiro
- Nunca dois agents do mesmo lote tocam no mesmo arquivo

### 3. Escolha de Agents
Para cada grupo, escolha o agent mais adequado ao contexto:
- `builder-worker` — código novo, features, refatorações, componentes
- `fix-worker` — correções, ajustes, fixes

As sugestões nos passos são pontos de partida — o executor decide com base na investigação.

### 4. Execução em Lotes
- **Lote 1 (passos 1-3):** Sequential (bridge → VideoPreview → VideoPage). Dependência linear.
- **Lote 2 (passos 4-7):** Sequential dentro do CaptionEditorPanel. Depende do Lote 1.
- **Lote 3 (passos 8-9):** Paralelo entre ActionBar e App.tsx. Depende do Lote 1.
- **Lote 4 (passos 11-13):** Sequential (SubtitleOverlay gap → SubtitleOverlay drift → ScrollingPhrase validação). Independente dos lotes 1-3, pode rodar em paralelo com o Lote 3.
- **Lote 5 (passo 14):** Após todos os lotes.
- Para cada agent, inclua notebook relevante se houver
- Após cada lote, execute lint + type-check do projeto

### 5. Validação Pós-lote
- Execute scripts de lint e type-check (verifique `package.json`)
- Corrija sem `eslint-disable`, `@ts-ignore` ou `@ts-expect-error` — corrija a causa raiz
- Repita até 0 erros e 0 warnings
