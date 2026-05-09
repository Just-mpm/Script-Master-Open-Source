<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Script Master

Script Master é uma SPA em **React + Vite** para transformar roteiros em áudio com **Gemini TTS**, com geração opcional de imagens/cenas, biblioteca de projetos e um assistente conversacional.

## Stack

- React 19
- Vite
- MUI v7
- Firebase Auth + Firestore + Storage
- IndexedDB local para modo anônimo
- `@google/genai` no cliente

## Rodar localmente

Pré-requisitos:

- Bun
- Firebase CLI (apenas para deploy)

### 1. Instale as dependências

```bash
bun install
```

### 2. Configure o ambiente

Copie `.env.example` para `.env.local` e preencha as variáveis:

- `VITE_GEMINI_API_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (opcional)
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID` (opcional)

### 3. Inicie o projeto

```bash
bun run dev
```

O app roda em:

- `http://localhost:3000`

Em produção, o domínio oficial é `https://script-master.pro`. Se você quiser alinhar o Firebase Auth ao domínio customizado, use `VITE_FIREBASE_AUTH_DOMAIN="script-master.pro"` e mantenha esse domínio em `Authorized domains` no Firebase Console.

## Scripts disponíveis

```bash
bun run dev      # dev server
bun run lint     # ESLint 10 (flat config)
bun run lint:fix # corrige problemas auto-fixáveis
bun run typecheck # TypeScript sem emitir arquivos
bun run build    # lint + typecheck + build de produção
bun run preview  # preview local do build
```

## Build de produção

```bash
bun run build
bun run preview
```

O build gera arquivos estáticos em `dist/`.

## Deploy

O projeto foi preparado para **Firebase Hosting tradicional (SPA)**.

```bash
bun run build
firebase deploy --only hosting
```

## Arquitetura de deploy

- Sem Express em produção
- Sem App Hosting
- Rotas SPA resolvidas por `rewrites` do Firebase Hosting
- Prévias de voz salvas no Firebase Storage (`previews/{voiceId}.wav`)
- Downloads feitos direto no cliente

## Configuração e ambiente

- O Firebase Web SDK usa config pública via `VITE_FIREBASE_*`
- `firebase-applet-config.json` foi removido do runtime
- `firebase-blueprint.json` permanece apenas como documentação/schema
- Leituras de env são centralizadas em `src/lib/env.ts`

### Observação importante sobre segurança

Como o projeto usa Gemini diretamente no frontend, `VITE_GEMINI_API_KEY` vai para o bundle final. Isso é aceito neste projeto por simplicidade e contexto privado.

## Persistência

O projeto usa um padrão de **dual storage**:

- **Usuário autenticado:** Firestore + Firebase Storage
- **Usuário anônimo:** IndexedDB local

Camada atual:

- `src/lib/db.ts` → fachada compatível
- `src/lib/db/*` → implementação modular

## Estrutura principal

```txt
src/
  pages/
  features/
    assistant/
    studio/
  components/
  contexts/
  hooks/
  lib/
    db/
  theme/
```

## UI

- MUI v7 como stack visual principal
- Tema global em `src/theme/appTheme.ts`
- Tokens visuais em `src/theme/tokens.ts`
- CSS global mínimo em `src/index.css`

## Observações

- UI em pt-BR
- Prompts de imagem em inglês
- O app usa lazy loading por rota para reduzir o bundle inicial
- Atualmente não há test runner configurado
