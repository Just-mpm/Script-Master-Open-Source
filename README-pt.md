# Script Master

[![Versão](https://img.shields.io/badge/versão-0.130.0-blue)](https://github.com/Just-mpm/Script-Master-Open-Source)
[![Licença](https://img.shields.io/badge/licença-MIT-green)](LICENSE)
[![Idiomas](https://img.shields.io/badge/idiomas-pt--BR%20%7C%20en%20%7C%20es-orange)](#)

**Leia em outros idiomas:** [English](README.md) | [Español](README-es.md) | **Português**

---

Script Master é uma SPA **open source** para transformar roteiros em áudio, cenas, imagens e vídeos com IA. O modelo de uso é **BYOK (Bring Your Own Key)**: cada usuário configura a própria chave do Gemini no app e paga o consumo diretamente ao Google.

O projeto **não tem** Stripe, planos pagos, créditos internos ou billing. Todas as chamadas de IA passam por Firebase Cloud Functions/Genkit, recebendo a chave do usuário no payload `providerAuth`.

## Funcionalidades

- **TTS (Text-to-Speech)** — Transforma roteiros em áudio com vozes do Gemini, multi-locutor e chunking automático
- **Geração de imagens** — Cria cenas visuais a partir do roteiro com prompts otimizados
- **Renderização de vídeo** — Remotion renderiza vídeos client-side com legendas (Whisper WASM) e fallback de codec
- **Speed Paint** — Animação estilo "pintura em tempo real" com edge detection e fases sketch/reveal
- **Assistente IA** — Chat conversacional com ferramentas (web search, planos, integração com o estúdio)
- **Biblioteca de projetos** — Gerenciamento completo de projetos com áudios, imagens e vídeos
- **Projeto manual** — Upload de áudio e imagens próprias para criar projetos do zero
- **Internacionalização** — Interface em 3 idiomas (pt-BR, en, es)
- **PWA** — Instalável como app nativo com service worker e cache offline

## Stack

| Tecnologia | Uso |
|-----------|-----|
| React 19 + Vite 8 | Frontend SPA com lazy loading por rota |
| MUI v9 | Componentes e tema (dark mode) |
| Firebase | Auth, Firestore, Storage, Hosting, App Check, Cloud Functions v2 |
| Genkit + Gemini | Backend de IA (TTS, imagens, assistente, chunking) |
| Remotion 4 | Renderização de vídeo client-side (WebCodecs) |
| Zustand | Estado global com persistência localStorage |
| Motion | Animações e transições |
| Vitest + Testing Library | Testes unitários e de componentes |

## Como o BYOK funciona

1. O usuário cria uma chave Gemini no [Google AI Studio](https://aistudio.google.com)
2. A chave é salva **apenas** no IndexedDB do navegador, escopada pelo `uid`
3. A chave **não** é salva no Firestore, não vai para `localStorage` e não fica no bundle
4. Em cada geração, o frontend envia `providerAuth: { provider: 'gemini', apiKey }` para a callable Function
5. O backend usa `googleAI({ apiKey: false })` e injeta a chave por chamada com `config: { apiKey }`

## Modelos Gemini

| Modelo | Uso |
|--------|-----|
| `gemini-3.1-flash-tts-preview` | Text-to-speech |
| `gemini-3.1-flash-image-preview` | Geração de imagens |
| `gemini-3.1-flash-lite` | Chunking, prompts de cena, assistente (modo rápido) |
| `gemini-3.5-flash` | Assistente (modo especialista) |

## Requisitos

- [Bun](https://bun.sh)
- [Node.js 24](https://nodejs.org)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- Um projeto Firebase com Auth, Firestore, Storage, Hosting, Functions e App Check configurados
- Uma chave Gemini criada em [Google AI Studio](https://aistudio.google.com)

## Setup local

Instale as dependências do frontend:

```bash
bun install
```

Instale as dependências das Functions:

```bash
cd functions
npm install
cd ..
```

Copie os exemplos de ambiente:

```bash
cp .firebaserc.example .firebaserc
cp cors.json.example cors.json
cp .env.example .env.local
cp functions/.env.example functions/.env
cp public/robots.txt.example public/robots.txt
cp public/sitemap.xml.example public/sitemap.xml
cp public/llms.txt.example public/llms.txt
cp public/llms-full.txt.example public/llms-full.txt
```

Preencha `.env.local` com as variáveis públicas do Firebase Web SDK e `.firebaserc` com o ID do seu projeto Firebase. **Não crie variável Gemini no frontend**: a chave Gemini é configurada pelo usuário dentro do app.

## App Check

As callable Functions usam `enforceAppCheck: true`. Para desenvolvimento local você tem duas opções:

- Usar emuladores (`VITE_USE_EMULATORS=true` e flags `VITE_EMULATOR_*`).
- Usar backend real com um debug token registrado no Firebase Console e definido localmente em `VITE_APP_CHECK_DEBUG_TOKEN`.

Nunca commite um debug token real. Em produção, configure `VITE_RECAPTCHA_SITE_KEY` com uma chave reCAPTCHA v3 autorizada para o seu domínio.

## CORS para forks

As Functions aceitam localhost e os domínios padrão do Firebase Hosting do próprio projeto (`<project-id>.web.app` e `<project-id>.firebaseapp.com`). Para domínio customizado, defina em `functions/.env`:

```bash
APP_CORS_ORIGINS=https://seu-dominio.com,https://seu-projeto.web.app,http://localhost:3000
```

## Rodar

Frontend:

```bash
bun run dev
```

Emuladores:

```bash
bun run emulators:all
```

Functions (build):

```bash
cd functions
npm run build
cd ..
```

## Scripts principais

```bash
bun run lint          # ESLint
bun run lint:fix      # ESLint com autocorreção
bun run typecheck     # TypeScript (tsc -b)
bun run test          # Vitest (execução única)
bun run test:watch    # Vitest (watch mode)
bun run build         # lint + typecheck + build (~1s)
bun run build:full    # build + pre-render das rotas públicas (~25s)
bun run deploy        # build:full + functions build + firebase deploy
```

Functions:

```bash
cd functions
npm run lint
npm run build
npm run grant-access  # concede flag admin via custom claim
```

## Deploy

Antes do primeiro deploy, aponte a `.firebaserc` para o seu projeto:

```bash
cp .firebaserc.example .firebaserc
# Edite .firebaserc e troque "your-firebase-project-id" pelo ID do seu projeto
```

Deploy completo:

```bash
bun run deploy
```

Deploys parciais:

```bash
bun run deploy:hosting    # build:full + hosting
bun run deploy:functions  # functions build + deploy
bun run deploy:firestore  # regras e indexes
bun run deploy:storage    # regras do Storage
bun run deploy:preview    # hosting channel:deploy preview
```

## Segurança antes de publicar

- Não copie `.env`, `.env.local`, `.env.production` ou service accounts para o repo
- Rode secret scan antes do push público
- Rotacione chaves expostas por histórico antigo antes de publicar um repo novo
- Se for criar repo novo, copie apenas arquivos rastreados/intencionais e mantenha `.gitignore`

## Documentação

- [Guia de Contribuição](CONTRIBUTING.md) — Como contribuir com o Script Master
- [Política de Segurança](SECURITY.md) — Como reportar vulnerabilidades
- [Código de Conduta](CODE_OF_CONDUCT.md) — Diretrizes da comunidade
- [Changelog](CHANGELOG.md) — Histórico completo de versões

## Licença

MIT. Veja [LICENSE](LICENSE).
