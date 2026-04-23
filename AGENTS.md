# AGENTS.md — Script Master

## Visão Geral

SPA em React + Vite para transformar roteiros em áudio com Gemini TTS, geração opcional de imagens/cenas, renderização de vídeo com Remotion, biblioteca de projetos e assistente conversacional.

Firebase Hosting tradicional (frontend estático, sem backend Node).

## Comandos

```bash
bun run dev              # Vite em http://localhost:3000
bun run build            # lint + typecheck + build de produção
bun run lint             # ESLint 10 (flat config)
bun run lint:fix         # ESLint com autocorreção
bun run typecheck        # tsc -b
bun run preview          # serve build localmente
bun run clean            # remove dist/
```

**Sem test runner, sem formatter e sem CI/CD.**

## Stack

- **React 19** + **Vite 8** + **react-router-dom v7** (lazy loading por rota)
- **MUI v9** — tema em `src/theme/*`, sem Tailwind
- **@google/genai** (cliente direto) — TTS, imagens, prompts de cena
- **Firebase** — Auth + Firestore + Storage + IndexedDB (dual storage)
- **Remotion 4.0.448** — renderização de vídeo client-side (WebCodecs, Whisper WASM para legendas)
- **Zustand** (estado) | **Konva** (canvas) | **react-dropzone** (upload)

## Modelos Gemini

| Modelo | Uso |
|--------|-----|
| `gemini-3.1-flash-tts-preview` | Text-to-speech |
| `gemini-3.1-flash-image-preview` | Geração de imagens |
| `gemini-3.1-flash-lite-preview` | Chunking de roteiros, prompts de cena |

## Convenções

- **Idioma:** pt-BR na UI e comentários, inglês nos prompts de imagem
- **Alias:** `@/` aponta para a raiz do projeto
- **Sem backend:** não criar `/api/*`, tudo client-side
- **Rotas:** lazy loading por rota, páginas em `src/pages/`
- **HMR:** não altere a checagem `DISABLE_HMR` em `vite.config.ts`

## Guia Rápido de Features

| Feature | Arquivos principais |
|---------|---------------------|
| Áudio/TTS | `src/hooks/useAudioGenerator.ts`, `src/lib/audio.ts` |
| Imagens | `src/hooks/useImageGenerator.ts`, `src/lib/gemini.ts` |
| Vídeo | `src/features/video-render/` |
| Assistente | `src/features/assistant/` |
| Canvas/Speed Paint | `src/features/speed-paint/` |
| Studio | `src/features/studio/` |

## Documentação por Domínio

Ao trabalhar nestas áreas, leia o guia correspondente **antes** de implementar:

| Área | Arquivo | O que cobre |
|------|---------|-------------|
| Audio & TTS | `docs/guides/audio.md` | Pipeline TTS, chunks, WAV, vozes, multi-speaker |
| Geração de imagens | `docs/guides/image-generation.md` | Modelos, prompts, referências, aspect ratios |
| Persistência | `docs/guides/persistence.md` | Dual storage, domínios, Firebase rules, tipos |
| Renderização de vídeo | `docs/guides/video-render.md` | Remotion, fade padrão, legendas, exportação |
| UI & Design System | `docs/guides/ui-design-system.md` | MUI v9, tema, tokens, surfaces, CSS |
| Environment & Config | `docs/guides/environment.md` | Env vars, Firebase, Vite, TypeScript |
| Integração IA (Gemini) | `docs/guides/gemini-integration.md` | SDK GenAI, modelos, geração de imagem, prompts de cena, rate limiter, logger |
| Assistente IA | `docs/guides/assistant.md` | Chat conversacional, memórias, persona, streaming, extração JSON |
| Speed Paint & Animação | `docs/guides/speed-paint.md` | Canvas Konva, strokes, batch processing, reprodução, store |
| Estúdio de Produção | `docs/guides/studio.md` | Roteiro, vozes, ação, estado centralizado, integração TTS/imagens |
| Biblioteca & Projetos | `docs/guides/library.md` | Histórico, galeria, navegação, downloads, dual storage |
| Autenticação | `docs/guides/auth.md` | Login Google, sessão, ProtectedRoute, COEP |

## Version

- **Current:** `0.13.0`
- **Last release:** 2026-04-23

### Últimas mudanças (atualizado por /fast)

| Versão | Resumo |
|--------|--------|
| 0.13.0 | 6 novos guias (assistant, speed-paint, studio, library, auth, gemini-integration), 4 guias corrigidos (22 inconsistências), deleteImageGeneration, saveChatSession com fallback IndexedDB, countIndexedDbItems, errorId em useVoicePreviews, blob URL cleanup |
| 0.12.0 | LoginPage dedicada, ProtectedRoute, rota /estudio (era /), COEP em produção via firebase.json, coepPlugin simplificado no Vite, 5 guias corrigidos (26 inconsistências) |
| 0.11.2 | Plugin condicional COEP (?coep=1) no dev server, resolve conflito Firebase Auth vs SharedArrayBuffer; referrerPolicy no Header Avatar; correção de encoding nas mensagens de auth |
| 0.11.1 | 5 novos tokens de tema (ERROR_BG_SUBTLE, ERROR_BG_MEDIUM, WARNING_BG_SUBTLE, WHITE_01, GLASS_BG), 12 componentes migrados de cores hardcoded para tokens, 6 guias corrigidos (47 inconsistências) |
| 0.11.0 | Logger centralizado (createLogger), CaptionEditorPanel com split/merge de legendas, persistência de segmentos de áudio (AudioSegment), detecção de silêncio via RMS, hash de roteiro (staleness), alinhamento script→legendas via segmentos TTS, CaptionSource type |
| 0.10.1 | WarningToast, loading states no assistente, auto-save respeita isStreaming, tratamento de autoplay em previews, labels dinâmicos no exportador, withRetry em generateScenePrompts, ScenePromptResult, limpeza de código legado |
| 0.10.0 | TranscriptionPanel dedicado, refatoração do pipeline Whisper (model tiny-en, idioma auto, @remotion/captions), WaveformOverlay com frame relativo, ScrollingPhrase centralizado, 3 logos WebP, 6 guias atualizados |
| 0.9.0 | Remoção completa do plano de edição IA — fade in/out padrão em todas as cenas, sem análise de áudio/visual para edição, sem inspetor, sem TitleOverlay. Documentação atualizada em 4 guias. Rate limiter reutilizável, RoutableErrorBoundary, getImageGenerations |
| 0.8.4 | Transcrição automática de legendas via Whisper WASM, dois modos de legenda (scroll-phrases, word-karaoke), ScrollingPhrase, subtitleUtils, persistência de transcrições, headers COOP/COEP, @remotion/captions + @remotion/whisper-web, Remotion 4.0.448 |
| 0.8.3 | Limpeza de código morto (10 funções), patch font-stretch Canvas, truncamento de roteiro + limite de imagens para Gemini, reutilização de análise de áudio, menu mobile de velocidade, progresso no download em lote, detecção de JSON malformado no assistente, Snackbar no AnimationControls, Remotion 4.0.450, dedupe no Vite |
| 0.8.2 | NotFoundPage, ErrorBoundary, DataMigrationDialog, rate limiter, migração IndexedDB→Firestore, cursor animado no assistente, `isStreaming`, fallback VP8/WebM no exportador, tratamento de erros contextualizado, 6 guias em `docs/guides/` |
| 0.8.1 | Unificação do modelo de imagem para `gemini-3.1-flash-image-preview`; reestruturação da documentação em `docs/guides/` (6 guias); remoção de scripts de preview |
| 0.8.0 | WaveformOverlay, karaoke palavra-a-palavra nas legendas, análise visual de cenas, transições com spring, deps Remotion |
