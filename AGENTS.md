# AGENTS.md — Script Master

## Project Overview

Script Master é uma SPA em React + Vite para transformar roteiros em áudio com Gemini TTS, com geração opcional de imagens/cenas, biblioteca de projetos e um assistente conversacional.

O projeto roda como frontend estático no **Firebase Hosting tradicional**.

## Commands

```bash
bun install          # instala dependências
bun run dev          # inicia o Vite em http://localhost:3000
bun run lint         # ESLint 10 (flat config)
bun run typecheck    # tsc -b
bun run build        # lint + type-check + build de produção em dist/
bun run preview      # serve o build localmente em http://localhost:3000
bun run generate-previews  # gera WAVs de preview de voz via Gemini TTS
```

**Sem test runner, sem formatter e sem CI/CD configurados no momento.**

## Architecture

- **Runtime:** SPA estática com React 19 + react-router-dom v7
- **Entry:** `index.html` + `src/main.tsx`
- **App shell:** `src/App.tsx`
- **UI:** **MUI v9** + tema customizado em `src/theme/*`
- **AI:** `@google/genai` no cliente
  - TTS: `gemini-3.1-flash-tts-preview`
  - Imagens: `gemini-3.1-flash-image-preview`
  - Prompts de cena: `gemini-3.1-flash-lite-preview`
- **Backend em produção:** nenhum servidor Node/Express
- **Hosting:** Firebase Hosting tradicional com rewrite SPA para `index.html`
- **Persistência:** Firebase Auth + Firestore + Storage + IndexedDB local

## UI & Design System

- A interface usa **MUI v9** como stack visual principal
- O tema global fica em `src/theme/appTheme.ts`
- Tokens visuais compartilhados ficam em `src/theme/tokens.ts`
- Integração MUI + Router fica em `src/theme/linkBehavior.tsx`
- `src/index.css` deve permanecer **mínimo**, só para estilos globais realmente necessários
- Evite reintroduzir Tailwind ou utilitários visuais paralelos

## Routing & Code Splitting

- As rotas principais vivem em `src/App.tsx`
- As páginas ficam em `src/pages/*`
- O app usa **lazy loading por rota** para reduzir o bundle inicial
- Ao criar nova página, prefira manter o padrão atual de page-level split

## Environment Variables

Use `.env.local` para desenvolvimento local. Exemplo em `.env.example`.

Variáveis atuais:

- `VITE_GEMINI_API_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (opcional)
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID` (opcional)

### Regras importantes

- Leia envs do frontend via `import.meta.env`
- Centralize leituras em `src/lib/env.ts` quando fizer sentido
- **Não use `process.env` no código cliente**
- `firebase-applet-config.json` foi removido do runtime
- `firebase-blueprint.json` permanece apenas como **documentação/schema**, não como config ativa

### Observação de segurança

Como este projeto usa Gemini diretamente no cliente, `VITE_GEMINI_API_KEY` vai para o bundle final. Isso é aceito neste projeto por simplicidade e contexto privado. Não trate `VITE_*` como segredo real.

## Firebase & Persistence

O projeto usa um padrão de **dual storage**:

- **Authenticated:** Firestore + Firebase Storage
- **Anonymous:** IndexedDB local (`GeminiVoiceStudioDB`, versão 6)

Ao alterar persistência, atualize os dois caminhos.

### Camada atual de persistência

- Fachada compatível: `src/lib/db.ts`
- Implementação modular: `src/lib/db/*`

Domínios atuais da persistência:

- `memories`
- `user_settings`
- `generations`
- `image_generations`
- `projects`
- `chats`

Subcoleções de projeto:

- `projects/{projectId}/audios`
- `projects/{projectId}/images`

Os contratos documentais espelham `firebase-blueprint.json`.

## Firebase Rules & Ownership

- Todas as coleções usam ownership por `userId == request.auth.uid`
- Override admin atual: `kurosaki.mpm@gmail.com` (verificado)
- Storage segue a mesma lógica de ownership
- Limites atuais:
  - áudio: 50 MB
  - imagem: 10 MB

## TTS Generation

- O roteiro é quebrado em chunks de **850 caracteres** (`CHUNK_LIMIT`)
- Cada chunk é enviado separadamente ao Gemini TTS
- O retorno PCM é concatenado e encapsulado em WAV
- Formato final:
  - 24 kHz
  - mono
  - 16-bit
- O modo multi-speaker usa duas configurações de voz distintas

## Key Conventions

- **Alias:** `@/` aponta para a raiz do projeto
- **Idioma da UI:** pt-BR
- **Comentários e prompts internos:** preferencialmente em português
- **Prompts de imagem:** em inglês
- **Sem backend Node em produção:** não criar `/api/*` sem necessidade real
- **Downloads e prévias:** resolvidos client-side/Firebase
- **HMR em AI Studio:** existe a checagem `DISABLE_HMR` em `vite.config.ts`; não altere sem motivo forte

## Current File Structure

```txt
src/
  main.tsx                    # bootstrap React, providers e router
  App.tsx                     # app shell, lazy routes e composição global
  index.css                   # CSS global mínimo

  pages/
    AssistantPage.tsx
    LibraryPage.tsx
    StudioPage.tsx
    VideoPage.tsx

  features/
    assistant/
      Assistant.tsx
      types.ts
      utils.ts
      components/
    studio/
      types.ts
      useStudioState.ts

  components/
    Header.tsx
    ActionBar.tsx
    Inspector.tsx
    ScriptEditor.tsx
    ImageStudio.tsx
    Library.tsx
    VideoLibrary.tsx
    VideoPreview.tsx
    ErrorToast.tsx
    SuccessToast.tsx
    studioSurfaceStyles.ts

  contexts/
    AuthContext.tsx
    AudioContext.tsx

  hooks/
    useAssistant.ts
    useAudioGenerator.ts
    useAudioPlayer.ts
    useImageGenerator.ts
    useVoicePreviews.ts

  lib/
    env.ts                    # leitura tipada de env
    firebase.ts               # init Firebase via env
    gemini.ts                 # integração central com Gemini
    audio.ts                  # utilitários WAV/PCM
    download.ts               # downloads client-side
    constants.ts              # vozes, limites e instruções
    types.ts                  # tipos compartilhados
    db.ts                     # fachada compatível
    db/
      *.ts                    # persistência modular

  theme/
    AppThemeProvider.tsx
    appTheme.ts
    linkBehavior.tsx
    tokens.ts

  vite-env.d.ts              # tipagem do import.meta.env

scripts/
  generate-voice-previews.ts  # geração offline de WAVs de preview de voz
```

## Notes for Future Changes

- Se criar nova feature grande, prefira `src/features/<dominio>/`
- Se criar nova página, prefira `src/pages/`
- Se criar novo utilitário de tema/UI global, prefira `src/theme/`
- Se alterar persistência, revise `src/lib/db.ts` **e** `src/lib/db/*`
- Se alterar config/env, atualize também:
  - `.env.example`
  - `README.md`
  - este `AGENTS.md`

## Version

- **Current:** `0.3.2`
- **Last release:** 2026-04-18 — Design tokens centralization, component cleanup, unused imports removal
