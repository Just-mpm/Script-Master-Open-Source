# Script Master

Script Master e uma SPA open source para transformar roteiros em audio, cenas, imagens e videos com IA. O modelo de uso e **BYOK (Bring Your Own Key)**: cada usuario configura a propria chave do Gemini no app e paga o consumo diretamente ao Google.

O projeto nao tem Stripe, planos pagos, creditos internos ou billing. As chamadas de IA passam por Firebase Cloud Functions/Genkit, recebendo a chave do usuario no payload `providerAuth`.

## Stack

- React 19 + Vite 8
- MUI v9
- Firebase Auth, Firestore, Storage, Hosting, App Check e Cloud Functions v2
- Genkit + Gemini
- Remotion 4 para renderizacao de video no cliente
- Zustand, Motion, Vitest e Testing Library

## Como o BYOK funciona

- A chave Gemini e salva apenas no IndexedDB do navegador, escopada pelo `uid`.
- A chave nao e salva no Firestore, nao vai para `localStorage` e nao fica no bundle.
- Em cada geracao, o frontend envia `providerAuth: { provider: 'gemini', apiKey }` para a callable Function.
- O backend usa `googleAI({ apiKey: false })` e injeta a chave por chamada com `config: { apiKey }`.

## Requisitos

- Bun
- Node.js 24
- Firebase CLI
- Um projeto Firebase com Auth, Firestore, Storage, Hosting, Functions e App Check configurados
- Uma chave Gemini criada pelo usuario em [Google AI Studio](https://aistudio.google.com)

## Setup local

Instale as dependencias do frontend:

```bash
bun install
```

Instale as dependencias das Functions:

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

Preencha `.env.local` com as variaveis publicas do Firebase Web SDK e `.firebaserc` com o ID do seu projeto Firebase. Nao crie variavel Gemini no frontend: a chave Gemini e configurada pelo usuario dentro do app.

## App Check

As callable Functions usam `enforceAppCheck: true`. Para desenvolvimento local voce tem duas opcoes:

- Usar emuladores (`VITE_USE_EMULATORS=true` e flags `VITE_EMULATOR_*`).
- Usar backend real com um debug token registrado no Firebase Console e definido localmente em `VITE_APP_CHECK_DEBUG_TOKEN`.

Nunca commite um debug token real. Em producao, configure `VITE_RECAPTCHA_SITE_KEY` com uma chave reCAPTCHA v3 autorizada para o seu dominio.

## CORS para forks

As Functions aceitam localhost e os dominios padrao do Firebase Hosting do proprio projeto (`<project-id>.web.app` e `<project-id>.firebaseapp.com`). Para dominio customizado, defina em `functions/.env`:

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

Functions:

```bash
cd functions
npm run build
cd ..
```

## Scripts principais

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run build:full
bun run deploy
```

Functions:

```bash
cd functions
npm run lint
npm run build
npm run grant-access
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
bun run deploy:hosting
bun run deploy:functions
bun run deploy:firestore
bun run deploy:storage
```

## Seguranca antes de publicar

- Nao copie `.env`, `.env.local`, `.env.production` ou service accounts para o repo.
- Rode secret scan antes do push publico.
- Rotacione chaves expostas por historico antigo antes de publicar um repo novo.
- Se for criar repo novo, copie apenas arquivos rastreados/intencionais e mantenha `.gitignore`.

## Licenca

MIT. Veja [LICENSE](LICENSE).
