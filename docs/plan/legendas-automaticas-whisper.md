# Plano: Legendas Automaticas com Whisper Web + Fallback Proporcional

## Contexto

As legendas atuais do plano de edição sao geradas pelo Gemini como resumos curtos (ate 8 palavras) por cena, resultando em texto desconectado da fala real. O usuario deseja legendas que acompanhem o texto completo da narracao, sincronizadas com o audio.

**Arquitetura proposta:** Sistema hibrido em duas camadas:
1. **Estimativa proporcional (Camada 1):** Usa o texto do roteiro segmentado por cena com timing proporcional ao tamanho das palavras (reutiliza `calculateWordTiming` existente). Funciona sempre, sem dependencia externa.
2. **Whisper Web (Camada 2):** Transcreve o audio gerado via Whisper WASM no browser (`tiny`, ~40MB) para obter timestamps reais por palavra. Substitui a Camada 1 quando disponivel. Fallback automatico para Camada 1 se Whisper falhar (browser sem suporte, SharedArrayBuffer indisponivel, etc.).

**Separacao de responsabilidades:**
- Gemini: apenas edicao visual (transicoes, camera, efeitos) -- para de gerar legendas
- Whisper: transcricao automatica do audio com timestamps
- Estimativa proporcional: fallback offline

**Evidencias tecnicas:**
- Gemini TTS nao retorna timestamps por palavra (confirmado via NotebookLM)
- `@remotion/whisper-web` roda Whisper via WASM no browser, suporta modelo `tiny` (~40MB, multilingual)
- Headers COOP/COEP (`credentialless`) necessarios para SharedArrayBuffer -- `canUseWhisperWeb()` verifica apenas `SharedArrayBuffer`, que `credentialless` desbloqueia
- `@remotion/captions` oferece `createTikTokStyleCaptions()` mas o `AnimatedWord` customizado tem esteticas especificas do projeto -- manter componente customizado alimentado por dados Whisper
- `resampleTo16Khz()` e exportado por `@remotion/whisper-web` (nao por `@remotion/webcodecs`)

## Decisoes Pendentes

### 1. Modelo Whisper e estrategia de download

- Opcao A: `tiny.en` (ingles-only, ~40MB, mais rapido). **Risco:** legenda em pt-BR pode perder precisao em slang/girias.
- Opcao B: `tiny` (multilingual, ~40MB, suporta pt-BR nativamente). **Risco:** levemente menos preciso que `tiny.en` em ingles, mas suporta portugues corretamente.

> **RECOMENDACAO:** Opcao B (`tiny`). O projeto e 100% pt-BR e slang/regionalismos sao comuns em roteiros.

### 2. Strategia COEP para assets cross-origin (Firebase Storage)

- Opcao A: `Cross-Origin-Embedder-Policy: credentialless` (mais permissivo). Desbloqueia `SharedArrayBuffer` e permite assets cross-origin sem exigir header `Cross-Origin-Resource-Policy` no servidor de origem.
- Opcao B: `Cross-Origin-Embedder-Policy: require-corp` (mais restritivo). Bloqueia assets cross-origin que nao enviem `Cross-Origin-Resource-Policy: cross-origin`.

> **RECOMENDACAO:** Opcao A (`credentialless`). A documentacao oficial do Remotion mostra `require-corp` no exemplo, mas `canUseWhisperWeb()` verifica apenas a disponibilidade de `SharedArrayBuffer` -- que `credentialless` tambem desbloqueia. A vantagem de `credentialless` e que **nao exige nenhuma configuracao extra no Firebase Storage** -- imagens e audio cross-origin continuam funcionando normalmente. Se `credentialless` nao for suficiente em algum browser especifico, o fallback proporcional entra em acao automaticamente.

### 3. Quando disparar a transcricao Whisper

- Opcao A: Automatica apos geracao do audio (no `useAudioGenerator`). **Risco:** atrasa experiencia de geracao; Whisper e pesado.
- Opcao B: Manual via botao na VideoPage. **Risco:** usuario pode nao descobrir o botao.
- Opcao C: Deferred -- botao manual visivel + auto-disparo com delay (ex: 3s apos montagem da pagina, se audio disponivel e sem cache).

> **RECOMENDACAO:** Opcao C (deferred com botao manual). A VideoPage renderiza imediatamente. Se ha audio e nao ha transcricao cacheada, mostra botao "Gerar legendas" e apos 3s de idle dispara automaticamente. O usuario pode cancelar ou ignorar. Se ha cache, carrega silenciosamente sem UI de progresso.

### 4. Formato de legenda no SubtitleOverlay

- Opcao A: Scroll de frases (frase aparece, some, proxima frase entra) com karaoke palavra-a-palavra dentro de cada frase.
- Opcao B: Karaoke palavra-a-palavra contínuo (como hoje, mas com o texto COMPLETO do roteiro segmento por cena).
- Opcao C: Karaoke contínuo com wrap automatico -- mostra N palavras por vez com scroll horizontal suave.

> **RECOMENDACAO:** Opcao A. Mais legivel em video (frases completas em vez de palavras soltas), funciona bem com texto longo, e combina karaoke interno com transicoes suaves entre frases.

## Decisoes Tomadas

### 1. Manter `subtitle` em EditingScene como deprecated (nao remover)

- Remover `subtitle` de `EditingScene` quebra 11 pontos de consumo e planos salvos no IndexedDB.
- Decisao: manter campos com `@deprecated` no JSDoc, remover do schema Gemini, remover da UI do Inspector.
- **Cronograma de remocao:** Remover `subtitle` de `EditingScene` e `VideoScene` na versao 0.9.0, apos confirmar que nenhum plano salvo usa o campo. Criar quest de tracking para accountability.
- Justificativa: backward compatibility com planos salvos + menor risco de regressao.

### 2. Extrair utilitarios de SubtitleOverlay para lib compartilhada

- Mover `calculateWordTiming`, `splitIntoWords`, `parseBoldMarkdown`, `AnimatedWord`, `WordEntry`, `TextSegment`, `WordState` para `src/features/video-render/lib/subtitleUtils.ts`.
- Justificativa: reutilizacao pelo novo modo scroll de frases + hook de transccricao.

### 3. COEP `credentialless` (sem impacto em assets cross-origin)

- Usar `credentialless` (desbloqueia `SharedArrayBuffer` sem exigir `CORP` header em servidores de origem).
- Assets Firebase Storage (imagens, audio) continuam funcionando normalmente sem conversao.
- Se `credentialless` nao for suficiente em algum browser, `canUseWhisperWeb()` retorna `false` e o fallback proporcional entra em acao automaticamente.
- Justificativa: sem `credentialless`, `require-corp` exigiria que TODOS os assets cross-origin enviem header `Cross-Origin-Resource-Policy: cross-origin` (configuracao no Firebase Hosting) OU conversao manual para blob URLs -- complexidade desnecessaria.

### 4. Mapeamento roteiro → cenas para fallback proporcional (ALGORITMO)

O fallback proporcional precisa mapear trechos do roteiro as cenas. Algoritmo:
1. **Entrada:** `script` (string completa) + array de cenas com `timestamp` e `durationInFrames` (ou timestamp da proxima cena).
2. **Divisao proporcional:** Para cada cena `i`, calcular o texto atribuido como: `script.slice(charStart, charEnd)` onde `charStart` e `charEnd` sao proporcionais a `(timestamp_i / totalDuration)` e `(timestamp_{i+1} / totalDuration)` do total de caracteres do script.
3. **Divisao por frases:** Dentro do trecho atribuido, dividir por pontuacao (`.`, `!`, `?`, `\n`) para obter frases. Se uma frase exceder o limite de palavras (~12), dividir por virgula ou em limite duro.
4. **Edge case:** Se o roteiro foi editado apos a geracao do audio, o fallback fica desalinhado. Documentar esse trade-off no JSDoc do hook.
5. **Implementacao:** Funcao `segmentScriptByCenes(script, scenes, totalDuration)` em `subtitleUtils.ts`.

### 5. Instalacao de dependencias antes dos lotes

- `bun add @remotion/whisper-web` executado ANTES do Lote 1 (como pre-requisito).
- Justificativa: o hook `useTranscription` (Lote 2) importa de `@remotion/whisper-web`. Sem a dependencia, `typecheck` falha.

### 6. DB_VERSION increment e seguranca do upgrade

- O `onupgradeneeded` em `shared.ts` usa `objectStoreNames.contains()` (idempotente). O novo store `transcriptions` sera criado apenas se nao existir. Incrementar `DB_VERSION` de 8 para 9 e seguro para usuarios existentes.
- Justificativa: O upgrade e aditivo (cria store novo, nunca modifica ou remove stores existentes). Nenhum dado e perdido.

## Reutilizacao e Padroes

- **Reutilizar:** `src/features/video-render/lib/videoUtils.ts` (`msToFrames`, `framesToSeconds`) para converter timestamps Whisper (segundos) em frames Remotion.
- **Reutilizar:** `src/features/video-render/lib/audioAnalysis.ts` (padrao `OfflineAudioContext` + fallback gracioso) como referencia para decodificacao de audio no hook Whisper.
- **Reutilizar:** `src/features/video-render/hooks/useEditingPlan.ts` (padrao progress/status/cancel/persist) como template para `useTranscription`.
- **Reutilizar:** `src/features/video-render/store/videoRenderBridge.ts` (Zustand bridge) para sincronizar estado de transccricao entre rotas.
- **Reutilizar:** `src/lib/db/shared.ts` (`putIndexedDbItem`, `getIndexedDbItem`) para persistir transccricoes.
- **Reutilizar:** `src/lib/db/editing-plans.ts` como padrao para `src/lib/db/transcriptions.ts`.
- **Reutilizar:** `AnimatedWord` componente extraido de `SubtitleOverlay.tsx` para karaoke palavra-a-palavra dentro de cada frase do scroll.
- **Reutilizar:** `calculateWordTiming()` extraido de `SubtitleOverlay.tsx` como fallback proporcional.
- **Padrao de referencia:** `useEditingPlan.ts` -- hook de operacao demorada com 7 fases (init, optional-op, progress-interval, main-op, success, error-categorized, cleanup).
- **Codigo novo:**
  - `src/features/video-render/hooks/useTranscription.ts` -- hook Whisper Web (justificativa: logica nova, nao existe no projeto).
  - `src/features/video-render/lib/subtitleUtils.ts` -- utilitarios extraidos de SubtitleOverlay + `segmentScriptByCenes` (justificativa: separar concerns, permitir reuso).
  - `src/lib/db/transcriptions.ts` -- persistencia de transccricoes (justificativa: nova entidade, padrao existente).
  - `src/features/video-render/components/ScrollingPhrase.tsx` -- componente de frase com scroll (justificativa: novo visual, reusa AnimatedWord).

## Arquivos a Modificar

### Arquivos Novos
- `src/features/video-render/hooks/useTranscription.ts` -- Hook Whisper Web com fallback proporcional
- `src/features/video-render/lib/subtitleUtils.ts` -- Utilitarios de legenda (extraidos de SubtitleOverlay) + `segmentScriptByCenes`
- `src/features/video-render/components/ScrollingPhrase.tsx` -- Componente de frase com scroll e karaoke interno
- `src/lib/db/transcriptions.ts` -- CRUD de transccricoes no IndexedDB

### Arquivos Modificados
- `src/features/video-render/types.ts` -- Adicionar `CaptionWord`, `TranscriptionResult`, `SubtitleMode`
- `src/features/video-render/lib/editingPlan.ts` -- `@deprecated` em `subtitle` e `subtitlePosition` de `EditingScene`
- `src/features/video-render/components/SubtitleOverlay.tsx` -- Reescrever para modo scroll de frases, importar de `subtitleUtils.ts`
- `src/features/video-render/components/VideoComposition.tsx` -- Aceitar `captions` como prop, passar para SubtitleOverlay
- `src/features/video-render/components/EditingPlanInspector.tsx` -- Remover UI de legenda (TextField + Select posicao)
- `src/features/video-render/hooks/useVideoExporter.tsx` -- Atualizar `ExportableComposition` para repassar `captions`
- `src/features/video-render/store/videoRenderBridge.ts` -- Adicionar campos de estado de transccricao
- `src/features/video-render/index.ts` -- Adicionar novos exports
- `src/components/VideoPreview.tsx` -- Adicionar `captions` como prop, repassar ao inputProps
- `src/pages/VideoPage.tsx` -- Integrar `useTranscription`, repassar captions ao VideoPreview
- `src/lib/gemini.ts` -- Remover campo `subtitle` do schema Gemini e do prompt, remover normalizacao de subtitle
- `src/lib/db/shared.ts` -- Adicionar `TRANSCRIPTIONS_STORE` + incrementar `DB_VERSION` de 8 para 9 (upgrade idempotente via `contains` check)
- `vite.config.ts` -- Headers COOP/COEP (`credentialless` + `same-origin`) + `optimizeDeps.exclude` whisper-web

## Passos de Implementacao

### Pre-requisito: Instalar dependencia

**0.1. Instalar `@remotion/whisper-web`**
`bun add @remotion/whisper-web`
Arquivos: `package.json`
Resultado: Pacote Whisper Web disponível para imports.
Sugestao: Executar via bash

### Lote 1: Tipos + Infraestrutura (sem impacto runtime)

**1.1. Tipos novos em `types.ts`**
Adicionar interfaces `CaptionWord` (`{ text: string; startFrame: number; endFrame: number; bold: boolean }`), `TranscriptionResult` (`{ words: CaptionWord[]; source: 'whisper' | 'proportional' }`), tipo `SubtitleMode`. Manter `VideoScene.subtitle` intacto.
Arquivos: `src/features/video-render/types.ts`
Resultado: Tipos base disponíveis para os demais passos.
Sugestao: `builder-worker`

**1.2. Deprecar campos em `EditingScene`**
Adicionar `@deprecated` no JSDoc de `subtitle` e `subtitlePosition` em `editingPlan.ts`. NAO remover. Documentar cronograma: remocao prevista para v0.9.0.
Arquivos: `src/features/video-render/lib/editingPlan.ts`
Resultado: Campos sinalizados como deprecated, zero breaking change.
Sugestao: `builder-worker`

**1.3. Configurar Vite para Whisper (COOP/COEP)**
Adicionar headers `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: credentialless` em `server` e `preview`. Adicionar `optimizeDeps.exclude: ['@remotion/whisper-web']`. **Testar imediatamente** se o app continua funcionando: imagens data URL, imagens Firebase Storage, blob URLs, audio.
Arquivos: `vite.config.ts`
Resultado: Headers configurados, Whisper pode usar SharedArrayBuffer.
Sugestao: `builder-worker` | Notebook: `3333bad6` (Remotion Docs)

**1.4. Persistencia de transccricoes**
Criar `src/lib/db/transcriptions.ts` (CRUD IndexedDB seguindo padrao de `editing-plans.ts`). Adicionar `TRANSCRIPTIONS_STORE = 'transcriptions'` em `shared.ts` e incrementar `DB_VERSION` de 8 para 9. Nota: o upgrade e idempotente -- `onupgradeneeded` usa `objectStoreNames.contains()` e apenas cria o store se nao existir. Usuarios existentes nao perdem dados.
Arquivos: `src/lib/db/transcriptions.ts`, `src/lib/db/shared.ts`
Resultado: Transccricoes podem ser salvas/carregadas por projectId.
Sugestao: `builder-worker`

**1.5. Barrel exports**
Adicionar novos tipos e utilitarios ao `index.ts`.
Arquivos: `src/features/video-render/index.ts`
Resultado: Novos exports disponíveis.
Sugestao: `builder-worker`

### Lote 2: Hook de Transcricao + Utilitarios

**2.1. Extrair utilitarios de SubtitleOverlay + criar `segmentScriptByCenes`**
Criar `src/features/video-render/lib/subtitleUtils.ts` com:
- `calculateWordTiming`, `splitIntoWords`, `parseBoldMarkdown`, `AnimatedWord`, `WordEntry`, `TextSegment`, `WordState` (tudo extraído de SubtitleOverlay.tsx)
- **NOVO:** `segmentScriptByCenes(script, scenes, totalDurationFrames, fps)` -- divide o roteiro em frases por cena usando divisao proporcional de caracteres + split por pontuacao (`.`, `!`, `?`, `\n`). Retorna `CaptionWord[]` com timing estimado para cada frase/palavra. Algoritmo detalhado na Decisao 4.
Arquivos: `src/features/video-render/lib/subtitleUtils.ts`, `src/features/video-render/components/SubtitleOverlay.tsx` (refactor para importar de subtitleUtils)
Resultado: SubtitleOverlay refatorado sem mudanca de comportamento. Utilitarios disponíveis para reuso. Funcao de segmentacao disponivel para fallback.
Sugestao: `builder-worker`

**2.2. Hook `useTranscription`**
Criar `src/features/video-render/hooks/useTranscription.ts` seguindo padrao de `useEditingPlan` (progress, statusText, error, cancelRef, persistencia debounceada). Logica:
  - `canUseWhisperWeb({ model: 'tiny' })` para verificar suporte (chamado uma vez ao montar)
  - `downloadWhisperModel({ model: 'tiny', onProgress })` para modelo multilingual (~40MB, cacheado)
  - `resampleTo16Khz({ file, onProgress })` para converter audio (funcao exportada por `@remotion/whisper-web`)
  - `transcribe({ channelWaveform, model, onProgress })` para obter timestamps por palavra
  - Converter resultados Whisper (segundos) para `CaptionWord[]` (frames via `msToFrames`)
  - **Fallback:** se Whisper nao suportado ou falhar, usar `segmentScriptByCenes(script, scenes, durationFrames, fps)` para gerar `CaptionWord[]` estimados
  - Persistir resultado em IndexedDB (cache por projectId)
  - Cache hit: se transcricao existe no IndexedDB e ha audio, carregar sem re-processar
  - Trigger: funcao `transcribeAudio(audioUrl, script, scenes, durationFrames, fps)` -- pode ser chamada manualmente ou via auto-trigger deferred (3s de delay)
Arquivos: `src/features/video-render/hooks/useTranscription.ts`
Resultado: Hook completo com Whisper + fallback proporcional.
Sugestao: `builder-worker` | Notebook: `3333bad6` (Remotion Docs)

### Lote 3: Componente de Legenda

**3.1. Componente `ScrollingPhrase`**
Criar `src/features/video-render/components/ScrollingPhrase.tsx` -- renderiza uma frase com:
  - Animacao de entrada (fade + translateY via spring Remotion)
  - Karaoke palavra-a-palavra interno (reusando `AnimatedWord` de subtitleUtils)
  - Animacao de saida (fade out) quando a proxima frase entra
  - Duas frases visíveis simultaneamente (a ativa e a próxima surgindo)
  - Limite de palavras por frase (~12) com divisao inteligente
Arquivos: `src/features/video-render/components/ScrollingPhrase.tsx`
Resultado: Componente visual de frase com scroll e karaoke.
Sugestao: `builder-worker` | Notebook: `3333bad6` (Remotion Docs -- animacoes, Sequence, spring)

**3.2. Reescrever `SubtitleOverlay`**
Reescrever para receber `CaptionWord[]` (com timestamps reais ou estimados) e agrupar em frases (usando pontuacao como delimitador). Renderizar frases usando `ScrollingPhrase`. Manter props `position` e `durationInFrames`. Manter suporte a `text: string` como overload para backward compatibility temporario (converte string para `CaptionWord[]` via `splitIntoWords` + `calculateWordTiming`).
Arquivos: `src/features/video-render/components/SubtitleOverlay.tsx`
Resultado: SubtitleOverlay com scroll de frases + karaoke interno, alimentado por Whisper ou fallback.
Sugestao: `builder-worker`

### Lote 4: Integracao na Composicao

**4.1. Atualizar `VideoComposition` e `types.ts`**
Adicionar `captions?: CaptionWord[]` a `VideoCompositionProps` em `types.ts`. Em `VideoComposition.tsx`: passar `captions` para `SubtitleOverlay` (via nova prop). Remover leitura de `planScene?.subtitle ?? scene.subtitle` (linhas 52, 78-79).
Arquivos: `src/features/video-render/types.ts`, `src/features/video-render/components/VideoComposition.tsx`
Resultado: Composicao usa captions em vez de subtitle do plano de edicao. **Passo 4.1 deve ser concluido antes de 4.2 e 4.3** pois modifica `VideoCompositionProps`. Sugestao: `builder-worker`

**4.2. Atualizar `VideoPreview`**
Adicionar `captions?: CaptionWord[]` as props. Repassar no `inputProps` ao Player.
Arquivos: `src/components/VideoPreview.tsx`
Resultado: Player recebe captions.
Sugestao: `builder-worker`

**4.3. Atualizar `useVideoExporter`**
Atualizar `ExportableComposition` (wrapper em `useVideoExporter.tsx`) para repassar `captions` ao `VideoComposition`.
Arquivos: `src/features/video-render/hooks/useVideoExporter.tsx`
Resultado: Exportacao de video inclui legendas Whisper.
Sugestao: `builder-worker`

### Lote 5: Integracao na UI

**5.1. Atualizar `VideoPage`**
Integrar `useTranscription` hook. Repassar `captions` ao `VideoPreview`. Adicionar botao "Gerar legendas" (manual). Implementar auto-trigger deferred: se ha audio, nao ha cache e usuario nao cancelou, disparar transccricao apos 3s. Mostrar progresso da transccricao (reutilizando padrao de `planStatusText`).
Arquivos: `src/pages/VideoPage.tsx`
Resultado: VideoPage integra transccricao completa.
Sugestao: `builder-worker`

**5.2. Atualizar `videoRenderBridge`**
Adicionar campos `isTranscribing`, `transcriptionProgress`, `transcriptionStatusText` ao bridge. Adicionar `syncTranscriptionState()` e atualizar `resetBridge()`.
Arquivos: `src/features/video-render/store/videoRenderBridge.ts`
Resultado: Estado de transccricao visivel no App.tsx/ActionBar.
Sugestao: `builder-worker`

**5.3. Remover legenda do Gemini**
Em `gemini.ts`: remover campo `subtitle` do schema JSON (linha 431-434), remover regra 6 do prompt (linhas 364, 369), remover normalizacao de `subtitle` (linha 475). Manter todo o resto intacto.
Arquivos: `src/lib/gemini.ts`
Resultado: Gemini gera apenas edicao visual, sem legendas.
Sugestao: `builder-worker`

**5.4. Remover UI de legenda do Inspector**
Em `EditingPlanInspector.tsx`: remover bloco de TextField de legenda (L516-528) e Select de posicao (L531-545). Remover importacoes de `subtitle`/`subtitlePosition`.
Arquivos: `src/features/video-render/components/EditingPlanInspector.tsx`
Resultado: Inspector so mostra edicao visual.
Sugestao: `builder-worker`

**5.5. Atualizar App.tsx (se necessario)**
Se o bridge for expor estado de transccricao, adicionar leitura no App.tsx para ActionBar (ex: icone de status).
Arquivos: `src/App.tsx`
Resultado: ActionBar pode mostrar estado da transccricao.
Sugestao: `builder-worker`

### Lote 6: Lint + Typecheck

**6.1. Lint + typecheck completo**
Executar `bun run lint` + `bun run typecheck`. Corrigir todos os erros sem `eslint-disable`, `@ts-ignore` ou `@ts-expect-error`.
Arquivos: Varios
Resultado: Zero erros, zero warnings.
Sugestao: `fix-worker`

## Riscos e Mitigacoes

| Risco | Severidade | Mitigacao |
|-------|-----------|-----------|
| **Whisper nao suporta SharedArrayBuffer em browsers antigos** | Medio | Fallback automatico para estimativa proporcional. `canUseWhisperWeb()` verifica suporte antes de tentar. `credentialless` desbloqueia `SharedArrayBuffer` na maioria dos browsers modernos. |
| **Modelo `tiny` impreciso em pt-BR** | Medio | Whisper e reference-standard para pt-BR. Usar `tiny` (multilingual) em vez de `tiny.en`. Precisao aceitavel para legendas de video. |
| **Download do modelo (~40MB) lento** | Medio | Cache via IndexedDB (persiste entre sessoes). Progresso visível na UI. Primeira transccricao e mais lenta, subsequentes sao instantaneas. |
| **Canvas tainted na exportacao de video** | Medio | Imagens data URLs e blob URLs sao same-origin (safe com `credentialless`). Garantir que assets Firebase sejam carregados normalmente sem conversao extra. |
| **Breaking change ao remover subtitle de EditingScene** | Alto | NAO remover nesta versao -- manter como `@deprecated`. Remocao prevista para v0.9.0 com quest de tracking. |
| **Transcricao Whisper difere do texto original** | Baixo | Whisper transcreve o que foi realmente falado. Para legenda de video, isso e aceitavel (e desejavel). |
| **Performance da VideoPage com auto-trigger de Whisper** | Baixo | Auto-trigger deferred (3s de delay). Se usuario interage (play/pause), cancelar auto-trigger. Cache IndexedDB evita re-processamento. |
| **Performance do Whisper no player Remotion** | Baixo | Whisper roda UMA VEZ apos geracao do audio (nao a cada frame). Resultado e persistido e convertido para frames. SubtitleOverlay apenas le dados pre-computados. |
| **@remotion/whisper-web API instavel (experimental)** | Baixo | Wrapper no hook `useTranscription` isola a dependencia. Se API mudar, apenas o hook precisa ser atualizado. |
| **DB_VERSION increment quebra IndexedDB** | Baixo | Upgrade e idempotente (`objectStoreNames.contains()`). Nenhum dado existente e modificado ou removido. |

## Verificacao

- [ ] Validação funcional: Transcricao Whisper funciona com audio gerado. Fallback proporcional funciona quando Whisper indisponivel. Mapeamento roteiro→cenas distribui texto corretamente. Scroll de frases aparece corretamente. Karaoke palavra-a-palavra sincroniza com audio. Exportacao de video inclui legendas. Plano de edicao gerado sem campo subtitle. App continua funcionando apos headers `credentialless`. Imagens Firebase Storage carregam normalmente.
- [ ] Validação técnica: `bun run lint` com zero erros. `bun run typecheck` com zero erros. `window.crossOriginIsolated === true` no dev server. `canUseWhisperWeb()` retorna `true`.
- [ ] Validação de regressao: VideoPage carrega normalmente. Preview de video funciona. Plano de edicao (sem legenda) gera e edita normalmente. Exportacao de video renderiza corretamente. Projetos salvos com `subtitle` no plano carregam sem crash.

## Notebooks Relevantes

| Notebook | ID | Uso |
|----------|----|-----|
| Remotion Docs | `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` | API do @remotion/whisper-web (transcribe, downloadWhisperModel, canUseWhisperWeb, resampleTo16Khz). Animacoes Remotion (Sequence, spring, interpolate). Headers COOP/COEP (`credentialless` desbloqueia SharedArrayBuffer sem exigir CORP em servidores de origem). |
| Vite 8 Guide | `42336176-1ab5-4b62-9f97-84feefb3d2ec` | Configuracao de headers COOP/COEP no vite.config. optimizeDeps.exclude. |
| Gemini API | `5efcb208-b12d-47d1-8d51-a2b5ad8e954e` | Confirmacao de que Gemini TTS nao retorna timestamps. |

## Instrucoes de Execucao

Ao executar este plano, siga este protocolo:

### 1. Investigacao
- Use analyze tools (`suggest_reads`, `impact_analysis`, `file_context`) nos arquivos listados
- Consulte os Notebooks Relevantes acima para confirmar padroes da tecnologia envolvida
- Identifique padroes, dependencias e riscos que o plano nao cobriu

### 2. Divisao do Trabalho
- Calcule tokens dos arquivos com `token-counter_token_count` (budget: 40K por agent)
- Agrupe por afinidade -- arquivos que se modificam juntos ficam juntos
- Respeite dependencias: quem cria tipo usado por outro vai primeiro
- Nunca dois agents do mesmo lote tocam no mesmo arquivo

### 3. Escolha de Agents
Para cada grupo, escolha o agent mais adequado ao contexto:
- `builder-worker` -- codigo novo, features, refatoracoes, componentes
- `fix-worker` -- correcoes, ajustes, fixes
- `vitest-specialist` -- testes de logica (hooks, utils, services sem Firebase)

As sugestoes nos passos sao pontos de partida -- o executor decide com base na investigacao.

### 4. Execucao em Lotes
- **Pre-requisito:** Executar passo 0.1 (install) antes de tudo
- **Lote 1** (tipos + infra): Passos 1.1-1.5 em paralelo
- **Lote 2** (hook + utils): Passos 2.1-2.2 em sequencia (2.1 antes de 2.2)
- **Lote 3** (componente legenda): Passos 3.1-3.2 em sequencia (3.1 antes de 3.2)
- **Lote 4** (composicao): Passo 4.1 primeiro (modifica `VideoCompositionProps`). Depois 4.2-4.3 em paralelo
- **Lote 5** (integracao UI): Passos 5.1-5.5 em paralelo
- **Lote 6** (cleanup): Passo 6.1
- Apos cada lote, execute `bun run lint` + `bun run typecheck`

### 5. Validacao Pos-lote
- Execute scripts de lint e type-check (verifique `package.json`)
- Corrija sem `eslint-disable`, `@ts-ignore` ou `@ts-expect-error` -- corrija a causa raiz
- Repita ate 0 erros e 0 warnings
