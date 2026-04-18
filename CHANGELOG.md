# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

## [0.2.0] - 2026-04-18

### Adicionado

- **MUI v7 como stack visual principal**: migração completa de Tailwind CSS + lucide-react para MUI v7 + @mui/icons-material
- **Design System** (`src/theme/`): tema customizado (`appTheme.ts`), tokens visuais (`tokens.ts`), surfaces de vidro (`surfaces.ts`), provider e link behavior
- **Pages com lazy loading** (`src/pages/`): `AssistantPage`, `LibraryPage`, `StudioPage`, `VideoPage` com code splitting por rota
- **Feature Assistant** (`src/features/assistant/`): assistente conversacional completo com header, composer, messages, history panel, memories panel, settings panel e utilitários de UI
- **Feature Studio** (`src/features/studio/`): state management centralizado com `useStudioState`, tipos para cenas e ratio
- **Persistência modular** (`src/lib/db/`): camada dividida em domínios (`chats`, `generations`, `images`, `memories`, `projects`, `shared`, `user-settings`, `types`) substituindo `db.ts` monolítico
- **Variáveis de ambiente tipadas** (`src/lib/env.ts`): leitura centralizada via `import.meta.env` com tipos explícitos
- **Utilitário de download** (`src/lib/download.ts`): `downloadFile` e `triggerDownload` client-side
- **ESLint 10** (flat config): `eslint.config.js` com plugins react, mui-v7, react-19-upgrade, firebase-ai-logic e zod-v4
- **Firebase Hosting**: `firebase.json` configurado com SPA rewrite, cache headers e storage/firestore rules apontados
- **Font Inter via Google Fonts**: preconnect no `index.html`
- **Scripts**: `lint:fix` e `typecheck` (`tsc -b`) adicionados ao `package.json`
- **AGENTS.md**: documentação completa do projeto para agentes de IA

### Alterado

- **App shell** (`App.tsx`): reescrito com lazy loading por rota, MUI Container/Box/Stack e Suspense fallback
- **Header**: migrado de lucide-react para MUI icons com navegação por array tipado (`NavItem[]`)
- **ActionBar**: reescrito com MUI, glass surface, menu de download e integração com `useGlobalAudioActions`
- **Inspector**: reescrito com MUI, tabs de voz (A/B), opções de ritmo, framework visual, ratio de cena e densidade
- **ScriptEditor**: migrado para MUI com suporte a scenes e glass panel
- **ImageStudio**: reescrito com MUI, select de ratio, collapse de parâmetros avançados e glass surface
- **Library**: reescrita com MUI, dialog de edição, search e cards de projetos/imagens
- **VideoLibrary**: reescrito com MUI, cards, metadata pills e glass surface
- **VideoPreview**: reescrito com MUI e glass surface
- **ErrorToast/SuccessToast**: migrados de motion para MUI Snackbar + Alert
- **AudioContext**: split em `useGlobalAudioState` e `useGlobalAudioActions` para leitura otimizada
- **Firebase init** (`firebase.ts`): usa `env.ts` em vez de `firebase-applet-config.json`
- **Gemini** (`gemini.ts`): suporte a imagens de referência, usa `env.ts` para API key
- **Hooks**: todos refatorados para usar `env.ts` e tipos importados de `features/`
- **CSS global** (`index.css`): removido Tailwind, variáveis CSS agora referenciam MUI palette tokens
- **Storage rules**: adicionada regra `update` para imagens com validação de tamanho e contentType

### Removido

- **Tailwind CSS**: `@tailwindcss/vite`, `tailwindcss`, `autoprefixer` e `@theme` removidos
- **lucide-react**: substituído integralmente por `@mui/icons-material`
- **Express server** (`server.ts`): app agora é SPA estática, sem backend Node
- **firebase-applet-config.json**: config Firebase movida para variáveis de ambiente `VITE_*`
- **package-lock.json**: substituído por `bun.lock` (migrado de npm para bun)
- **db.ts monolítico**: `src/lib/db.ts` reduzido a re-export da fachada modular

### Corrigido

- Tipagem `BlobPart` explícita em `audio.ts` para compatibilidade com TS strict

---

## [0.3.0] - 2026-04-18

### Alterado

- **MUI v7 → v9**: migração completa de `@mui/material` e `@mui/icons-material` v7.3.10 para v9.0.0
- **Novas dependências MUI explícitas**: `@mui/styled-engine`, `@mui/system` e `@mui/utils` adicionados como dependências diretas
- **Theme refactoring** (`src/theme/appTheme.ts`): paleta reestruturada com novas cores para primary, secondary, success, warning, background, text e action; remoção de overrides legados (`containedPrimary`, `filledSuccess`, `filledError`, `palette`); adição de `variants` com component-level overrides para Button e `light` theme variant
- **Stack API migration** (MUI v9): props `alignItems` e `justifyContent` movidas de props diretas para `sx` prop em 14+ componentes — `ActionBar`, `Header`, `ImageStudio`, `Inspector`, `Library`, `ScriptEditor`, `VideoLibrary`, `VideoPreview`, `AssistantHeader`, `AssistantHistoryPanel`, `AssistantMemoriesPanel`, `AssistantMessages`, `AssistantSettingsPanel`, `App`
- **ESLint config**: remoção de `@eslint/compat` e `eslint-plugin-mui-v7` (incompatível com MUI v9)

---

## [0.1.0] - 2025-xx-xx

### Adicionado

- Versão inicial do projeto Script Master (migrado do Google AI Studio)
- SPA React + Vite para transformar roteiros em áudio com Gemini TTS
- Geração de imagens com Gemini
- Assistente conversacional básico
- Firebase Auth + Firestore + Storage + IndexedDB
