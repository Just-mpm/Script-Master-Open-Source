# Script Master

[![Versión](https://img.shields.io/badge/versión-0.130.0-blue)](https://github.com/Just-mpm/Script-Master-Open-Source)
[![Licencia](https://img.shields.io/badge/licencia-MIT-green)](LICENSE)
[![Idiomas](https://img.shields.io/badge/idiomas-pt--BR%20%7C%20en%20%7C%20es-orange)](#)

**Leer en otros idiomas:** [English](README-en.md) | [Português](README-pt.md) | **Español**

---

Script Master es una SPA **open source** para transformar guiones en audio, escenas, imágenes y videos con IA. El modelo de uso es **BYOK (Bring Your Own Key)**: cada usuario configura su propia clave de Gemini en la app y paga el consumo directamente a Google.

El proyecto **no tiene** Stripe, planes de pago, créditos internos ni billing. Todas las llamadas de IA pasan por Firebase Cloud Functions/Genkit, recibiendo la clave del usuario en el payload `providerAuth`.

## Funcionalidades

- **TTS (Text-to-Speech)** — Transforma guiones en audio con voces de Gemini, multi-locutor y chunking automático
- **Generación de imágenes** — Crea escenas visuales a partir del guion con prompts optimizados
- **Renderización de video** — Remotion renderiza videos del lado del cliente con subtítulos (Whisper WASM) y fallback de codec
- **Speed Paint** — Animación estilo "pintura en tiempo real" con edge detection y fases sketch/reveal
- **Asistente IA** — Chat conversacional con herramientas (búsqueda web, planes, integración con el estudio)
- **Biblioteca de proyectos** — Gestión completa de proyectos con audios, imágenes y videos
- **Proyecto manual** — Sube tu propio audio e imágenes para crear proyectos desde cero
- **Internacionalización** — Interfaz en 3 idiomas (pt-BR, en, es)
- **PWA** — Instalable como app nativa con service worker y cache offline

## Stack

| Tecnología | Uso |
|------------|-----|
| React 19 + Vite 8 | Frontend SPA con lazy loading por ruta |
| MUI v9 | Componentes y tema (dark mode) |
| Firebase | Auth, Firestore, Storage, Hosting, App Check, Cloud Functions v2 |
| Genkit + Gemini | Backend de IA (TTS, imágenes, asistente, chunking) |
| Remotion 4 | Renderización de video del lado del cliente (WebCodecs) |
| Zustand | Estado global con persistencia en localStorage |
| Motion | Animaciones y transiciones |
| Vitest + Testing Library | Tests unitarios y de componentes |

## Cómo funciona el BYOK

1. El usuario crea una clave de Gemini en [Google AI Studio](https://aistudio.google.com)
2. La clave se guarda **solo** en el IndexedDB del navegador, asociada al `uid`
3. La clave **no** se guarda en Firestore, no va a `localStorage` y no queda en el bundle
4. En cada generación, el frontend envía `providerAuth: { provider: 'gemini', apiKey }` a la callable Function
5. El backend usa `googleAI({ apiKey: false })` e inyecta la clave por llamada con `config: { apiKey }`

## Modelos Gemini

| Modelo | Uso |
|--------|-----|
| `gemini-3.1-flash-tts-preview` | Text-to-speech |
| `gemini-3.1-flash-image-preview` | Generación de imágenes |
| `gemini-3.1-flash-lite` | Chunking, prompts de escena, asistente (modo rápido) |
| `gemini-3.5-flash` | Asistente (modo especialista) |

## Requisitos

- [Bun](https://bun.sh)
- [Node.js 24](https://nodejs.org)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- Un proyecto Firebase con Auth, Firestore, Storage, Hosting, Functions y App Check configurados
- Una clave de Gemini creada en [Google AI Studio](https://aistudio.google.com)

## Setup local

Instala las dependencias del frontend:

```bash
bun install
```

Instala las dependencias de las Functions:

```bash
cd functions
npm install
cd ..
```

Copia los ejemplos de entorno:

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

Completa `.env.local` con las variables públicas del Firebase Web SDK y `.firebaserc` con el ID de tu proyecto Firebase. **No crees una variable Gemini en el frontend**: la clave de Gemini se configura por el usuario dentro de la app.

## App Check

Las callable Functions usan `enforceAppCheck: true`. Para desarrollo local tienes dos opciones:

- Usar emuladores (`VITE_USE_EMULATORS=true` y flags `VITE_EMULATOR_*`).
- Usar el backend real con un debug token registrado en Firebase Console y definido localmente como `VITE_APP_CHECK_DEBUG_TOKEN`.

Nunca comitees un debug token real. En producción, configura `VITE_RECAPTCHA_SITE_KEY` con una clave reCAPTCHA v3 autorizada para tu dominio.

## CORS para forks

Las Functions aceptan localhost y los dominios por defecto de Firebase Hosting del proyecto (`<project-id>.web.app` y `<project-id>.firebaseapp.com`). Para un dominio customizado, defínelo en `functions/.env`:

```bash
APP_CORS_ORIGINS=https://tu-dominio.com,https://tu-proyecto.web.app,http://localhost:3000
```

## Ejecutar

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

## Scripts principales

```bash
bun run lint          # ESLint
bun run lint:fix      # ESLint con autocorrección
bun run typecheck     # TypeScript (tsc -b)
bun run test          # Vitest (ejecución única)
bun run test:watch    # Vitest (modo watch)
bun run build         # lint + typecheck + build (~1s)
bun run build:full    # build + pre-render de rutas públicas (~25s)
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

Antes del primer deploy, apunta `.firebaserc` a tu proyecto:

```bash
cp .firebaserc.example .firebaserc
# Edita .firebaserc y cambia "your-firebase-project-id" por el ID de tu proyecto
```

Deploy completo:

```bash
bun run deploy
```

Deploys parciales:

```bash
bun run deploy:hosting    # build:full + hosting
bun run deploy:functions  # functions build + deploy
bun run deploy:firestore  # reglas e índices
bun run deploy:storage    # reglas del Storage
bun run deploy:preview    # hosting channel:deploy preview
```

## Seguridad antes de publicar

- No copies `.env`, `.env.local`, `.env.production` ni service accounts al repo
- Ejecuta un secret scan antes del push público
- Rota las claves expuestas en el historial antiguo antes de publicar un repo nuevo
- Si vas a crear un repo nuevo, copia solo archivos rastreados/intencionales y mantén `.gitignore`

## Licencia

MIT. Ver [LICENSE](LICENSE).
