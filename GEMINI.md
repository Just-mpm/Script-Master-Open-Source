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
| `gemini-3.1-flash-lite-preview` | Chunking de roteiros, prompts de cena, plano de edição |

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
| Renderização de vídeo | `docs/guides/video-render.md` | Remotion, editing plan, overlays, exportação |
| UI & Design System | `docs/guides/ui-design-system.md` | MUI v9, tema, tokens, surfaces, CSS |
| Environment & Config | `docs/guides/environment.md` | Env vars, Firebase, Vite, TypeScript |

## Version

- **Current:** `0.8.4`
- **Last release:** 2026-04-21

### Últimas mudanças (atualizado por /fast)

| Versão | Resumo |
|--------|--------|
| 0.8.4 | Transcrição automática de legendas via Whisper WASM, dois modos de legenda (scroll-phrases, word-karaoke), ScrollingPhrase, subtitleUtils, persistência de transcrições, headers COOP/COEP, @remotion/captions + @remotion/whisper-web, Remotion 4.0.448 |
| 0.8.3 | Limpeza de código morto (10 funções), patch font-stretch Canvas, truncamento de roteiro + limite de imagens para Gemini, reutilização de análise de áudio, menu mobile de velocidade, progresso no download em lote, detecção de JSON malformado no assistente, Snackbar no AnimationControls, Remotion 4.0.450, dedupe no Vite |
| 0.8.2 | NotFoundPage, ErrorBoundary, DataMigrationDialog, rate limiter, migração IndexedDB→Firestore, cursor animado no assistente, `isStreaming`, fallback VP8/WebM no exportador, tratamento de erros contextualizado, 6 guias em `docs/guides/` |
| 0.8.1 | Unificação do modelo de imagem para `gemini-3.1-flash-image-preview`; reestruturação da documentação em `docs/guides/` (6 guias); remoção de scripts de preview |
| 0.8.0 | WaveformOverlay, karaoke palavra-a-palavra nas legendas, análise visual de cenas, transições com spring, deps Remotion |
