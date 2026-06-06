# Script Master

[![Version](https://img.shields.io/badge/version-0.130.0-blue)](https://github.com/Just-mpm/Script-Master-Open-Source)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Languages](https://img.shields.io/badge/languages-pt--BR%20%7C%20en%20%7C%20es-orange)](#)

**Read in other languages:** **English** | [Português](README-pt.md) | [Español](README-es.md)

---

Script Master is an **open source** SPA that transforms scripts into audio, scenes, images, and videos with AI. The usage model is **BYOK (Bring Your Own Key)**: each user configures their own Gemini API key in the app and pays for usage directly to Google.

The project has **no** Stripe, paid plans, internal credits, or billing. All AI calls go through Firebase Cloud Functions/Genkit, receiving the user's key in the `providerAuth` payload.

## Features

- **TTS (Text-to-Speech)** — Transform scripts into audio with Gemini voices, multi-speaker support, and automatic chunking
- **Image generation** — Create visual scenes from scripts with optimized prompts
- **Video rendering** — Remotion renders videos client-side with subtitles (Whisper WASM) and codec fallback
- **Speed Paint** — Real-time painting-style animation with edge detection and sketch/reveal phases
- **AI Assistant** — Conversational chat with tools (web search, plans, studio integration)
- **Project library** — Full project management with audio, images, and videos
- **Manual project** — Upload your own audio and images to create projects from scratch
- **Internationalization** — UI in 3 languages (pt-BR, en, es)
- **PWA** — Installable as a native app with service worker and offline cache

## Stack

| Technology | Usage |
|-----------|-------|
| React 19 + Vite 8 | Frontend SPA with lazy-loaded routes |
| MUI v9 | Components and theme (dark mode) |
| Firebase | Auth, Firestore, Storage, Hosting, App Check, Cloud Functions v2 |
| Genkit + Gemini | AI backend (TTS, images, assistant, chunking) |
| Remotion 4 | Client-side video rendering (WebCodecs) |
| Zustand | Global state with localStorage persistence |
| Motion | Animations and transitions |
| Vitest + Testing Library | Unit and component tests |

## How BYOK works

1. The user creates a Gemini API key at [Google AI Studio](https://aistudio.google.com)
2. The key is saved **only** in the browser's IndexedDB, scoped by `uid`
3. The key is **not** saved in Firestore, not stored in `localStorage`, and not included in the bundle
4. On each generation, the frontend sends `providerAuth: { provider: 'gemini', apiKey }` to the callable Function
5. The backend uses `googleAI({ apiKey: false })` and injects the key per call with `config: { apiKey }`

## Gemini Models

| Model | Usage |
|-------|-------|
| `gemini-3.1-flash-tts-preview` | Text-to-speech |
| `gemini-3.1-flash-image-preview` | Image generation |
| `gemini-3.1-flash-lite` | Chunking, scene prompts, assistant (fast mode) |
| `gemini-3.5-flash` | Assistant (specialist mode) |

## Requirements

- [Bun](https://bun.sh)
- [Node.js 24](https://nodejs.org)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- A Firebase project with Auth, Firestore, Storage, Hosting, Functions, and App Check configured
- A Gemini API key created at [Google AI Studio](https://aistudio.google.com)

## Local setup

Install frontend dependencies:

```bash
bun install
```

Install Functions dependencies:

```bash
cd functions
npm install
cd ..
```

Copy environment examples:

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

Fill `.env.local` with your Firebase Web SDK public variables and `.firebaserc` with your Firebase project ID. **Do not create a Gemini variable in the frontend**: the Gemini key is configured by the user inside the app.

## App Check

Callable Functions use `enforceAppCheck: true`. For local development you have two options:

- Use emulators (`VITE_USE_EMULATORS=true` and `VITE_EMULATOR_*` flags).
- Use real backend with a debug token registered in the Firebase Console and set locally as `VITE_APP_CHECK_DEBUG_TOKEN`.

Never commit a real debug token. In production, configure `VITE_RECAPTCHA_SITE_KEY` with a reCAPTCHA v3 key authorized for your domain.

## CORS for forks

Functions accept localhost and the default Firebase Hosting domains of your project (`<project-id>.web.app` and `<project-id>.firebaseapp.com`). For a custom domain, set it in `functions/.env`:

```bash
APP_CORS_ORIGINS=https://your-domain.com,https://your-project.web.app,http://localhost:3000
```

## Running

Frontend:

```bash
bun run dev
```

Emulators:

```bash
bun run emulators:all
```

Functions (build):

```bash
cd functions
npm run build
cd ..
```

## Main scripts

```bash
bun run lint          # ESLint
bun run lint:fix      # ESLint with auto-fix
bun run typecheck     # TypeScript (tsc -b)
bun run test          # Vitest (single run)
bun run test:watch    # Vitest (watch mode)
bun run build         # lint + typecheck + build (~1s)
bun run build:full    # build + pre-render public routes (~25s)
bun run deploy        # build:full + functions build + firebase deploy
```

Functions:

```bash
cd functions
npm run lint
npm run build
npm run grant-access  # grants admin flag via custom claim
```

## Deploy

Before the first deploy, point `.firebaserc` to your project:

```bash
cp .firebaserc.example .firebaserc
# Edit .firebaserc and replace "your-firebase-project-id" with your project ID
```

Full deploy:

```bash
bun run deploy
```

Partial deploys:

```bash
bun run deploy:hosting    # build:full + hosting
bun run deploy:functions  # functions build + deploy
bun run deploy:firestore  # rules and indexes
bun run deploy:storage    # Storage rules
bun run deploy:preview    # hosting channel:deploy preview
```

## Security before publishing

- Do not copy `.env`, `.env.local`, `.env.production`, or service accounts into the repo
- Run a secret scan before public push
- Rotate keys exposed in old history before publishing a new repo
- If creating a new repo, copy only tracked/intentional files and maintain `.gitignore`

## Documentation

- [Contributing Guide](CONTRIBUTING.md) — How to contribute to Script Master
- [Security Policy](SECURITY.md) — How to report vulnerabilities
- [Code of Conduct](CODE_OF_CONDUCT.md) — Community guidelines
- [Changelog](CHANGELOG.md) — Full release history

## License

MIT. See [LICENSE](LICENSE).
