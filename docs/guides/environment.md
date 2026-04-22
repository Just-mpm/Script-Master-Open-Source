# Variáveis de Ambiente e Configuração

> Baseado nos arquivos: `src/lib/env.ts`, `src/lib/firebase.ts`, `.env.example`, `firebase.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `src/vite-env.d.ts`

## Variáveis de Ambiente

Todas as variáveis seguem o prefixo `VITE_` para serem expostas ao bundle do cliente pelo Vite. São lidas exclusivamente via `import.meta.env` — **nunca use `process.env` no código cliente**.

### Obrigatórias

| Variável | Descrição | Usada em |
|---|---|---|
| `VITE_GEMINI_API_KEY` | Chave da API Google Gemini AI | `src/lib/gemini.ts` (via `getGeminiApiKey()`) |
| `VITE_FIREBASE_API_KEY` | Chave pública do Firebase Web SDK | `src/lib/firebase.ts` (via `getFirebaseEnvConfig()`) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação Firebase | `src/lib/firebase.ts` |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto Firebase | `src/lib/firebase.ts` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket do Firebase Storage | `src/lib/firebase.ts` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID do Firebase Cloud Messaging | `src/lib/firebase.ts` |
| `VITE_FIREBASE_APP_ID` | ID do app Firebase | `src/lib/firebase.ts` |

### Opcionais

| Variável | Descrição | Usada em |
|---|---|---|
| `VITE_FIREBASE_MEASUREMENT_ID` | ID do Google Analytics | `src/lib/firebase.ts` (via `getFirebaseEnvConfig()`) |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | ID de banco Firestore alternativo | `src/lib/firebase.ts` |

### Comportamento das helpers

Definidas em `src/lib/env.ts`:

- `readRequiredEnv()` — lança `Error` se ausente ou vazia
- `readOptionalEnv()` — retorna `string | undefined`, `undefined` se ausente ou vazia
- `getGeminiApiKey()` — retorna `string` (required)
- `getFirebaseEnvConfig()` — retorna `FirebaseEnvConfig` com 7 campos obrigatórios + 2 opcionais

### Exclusivo do Node (não exposto ao cliente)

| Variável | Descrição | Usada em |
|---|---|---|
| `DISABLE_HMR` | Desativa o Hot Module Replacement | `vite.config.ts` (lida via `process.env`) |

## Tipagem das Env Vars

O arquivo `src/vite-env.d.ts` augmenta a interface `ImportMetaEnv` para tipar todas as variáveis:

```typescript
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FIREBASE_FIRESTORE_DATABASE_ID?: string;
}
```

A interface `FirebaseEnvConfig` em `src/lib/env.ts` espelha as variáveis Firebase em formato de objeto:

```typescript
export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}
```

## Firebase Init

`src/lib/firebase.ts` inicializa o Firebase no escopo do módulo:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFirebaseEnvConfig } from './env';

const appletConfig = getFirebaseEnvConfig();
const app = initializeApp(appletConfig);

export const auth = getAuth(app);
export const db = appletConfig.firestoreDatabaseId
  ? getFirestore(app, appletConfig.firestoreDatabaseId)
  : getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
```

Pontos-chave:
- `firestoreDatabaseId` condicional: se definido, `getFirestore` recebe o database ID como segundo argumento
- `GoogleAuthProvider` exportado para autenticação via popup
- Funções de auth re-exportadas: `signInWithPopup`, `signOut`, `onAuthStateChanged` e o tipo `User`
- Função `testFirebaseConnection()` disponível para validação (não executada automaticamente no escopo do módulo)

## Gemini AI Init

`src/lib/gemini.ts` inicializa o client Gemini no escopo do módulo:

```typescript
import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiApiKey } from './env';

const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
```

## Firebase Hosting

Configuração em `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "/index.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "storage": { "rules": "storage.rules" },
  "firestore": { "rules": "firestore.rules" }
}
```

- **Public dir:** `dist` (output do `vite build`)
- **SPA rewrite:** todas as rotas (`**`) reescritas para `/index.html`
- **Cache:** `index.html` com `no-cache` (garante que o cliente sempre busca a versão mais recente)
- **Ignored:** `firebase.json`, arquivos ocultos e `node_modules`

## Vite Config

Configuração em `vite.config.ts`:

```typescript
export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
    dedupe: ['mediabunny', '@mediabunny/aac-encoder', '@mediabunny/flac-encoder', '@mediabunny/mp3-encoder'],
  },
  optimizeDeps: {
    exclude: ['@remotion/whisper-web'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: process.env.DISABLE_HMR !== 'true',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
}));
```

| Config | Valor | Observação |
|---|---|---|
| `server.host` | `0.0.0.0` | Acessível na rede local |
| `server.port` | `3000` | |
| `server.hmr` | `process.env.DISABLE_HMR !== 'true'` | Desativado em AI Studio |
| `preview.host` | `0.0.0.0` | |
| `preview.port` | `3000` | |
| `resolve.alias['@']` | `path.resolve(__dirname, '.')` | Aponta para raiz do projeto |
| `resolve.dedupe` | `['mediabunny', ...]` | Deduplica pacotes de mídia (evita instâncias duplicadas) |
| `optimizeDeps.exclude` | `['@remotion/whisper-web']` | Exclui Whisper WASM da otimização (carregado sob demanda) |
| `build.chunkSizeWarningLimit` | `1600` | KB |

### Headers COOP/COEP

Tanto `server` quanto `preview` definem headers de Cross-Origin:

```typescript
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
},
```

Esses headers são obrigatórios para habilitar o `SharedArrayBuffer` no navegador, que é utilizado pelo Remotion (renderização de vídeo) e pelo Whisper WASM (transcrição de legendas). Sem eles, o `SharedArrayBuffer` fica indisponível e a funcionalidade de vídeo/legendas falha silenciosamente.

> **Nota sobre DISABLE_HMR:** Usado apenas em ambientes de AI Studio. O file watching é desativado para evitar flickering durante edições de agentes. **Não altere sem motivo forte.**

## TypeScript Config

Configuração em `tsconfig.json`:

| Opção | Valor | Observação |
|---|---|---|
| `target` | `ES2022` | |
| `module` | `ESNext` | |
| `lib` | `["ES2022", "DOM", "DOM.Iterable"]` | APIs disponíveis no build |
| `moduleResolution` | `bundler` | |
| `jsx` | `react-jsx` | JSX transform automático |
| `types` | `["vite/client", "node"]` | Tipos do Vite + Node |
| `paths["@/*"]` | `["./*"]` | Alias compatível com Vite |
| `noEmit` | `true` | Apenas verificação de tipos |
| `skipLibCheck` | `true` | |
| `isolatedModules` | `true` | Obrigatório para Vite |
| `allowImportingTsExtensions` | `true` | Permite imports `.ts` diretos |
| `experimentalDecorators` | `true` | Decorators legado (necessário para libs que usam `@decorator`) |
| `useDefineForClassFields` | `false` | Comportamento de campos de classe via `Object.defineProperty` |
| `moduleDetection` | `force` | Força detecção de módulo (evita inferência por extensão de arquivo) |
| `allowJs` | `true` | Permite importar arquivos `.js` no projeto |

**Excluídos:** `Speed-Paint/**`, `dist/**`, `node_modules/**`

## Segurança

### VITE_GEMINI_API_KEY no Bundle

Como o Gemini é chamado diretamente do cliente (`@google/genai`), a chave API vai para o bundle final do JavaScript. Isso é **aceito neste projeto por simplicidade e contexto privado**. Não trate variáveis `VITE_*` como segredos reais.

### Firebase Config

As variáveis Firebase (`VITE_FIREBASE_*`) são config pública do Web SDK — não são segredos por natureza. A segurança dos dados é garantida pelas [Security Rules](#firestore-security-rules) do Firestore e Storage.

### .gitignore

```gitignore
.env*           # Ignora TODOS os arquivos .env
!.env.example   # Exceção: o template é versionado
```

Sempre use `.env.local` para desenvolvimento local. O `.env.example` serve como template com placeholders.

## Firestore Security Rules

Resumo de `firestore.rules`:

- **Ownership:** todas as coleções usam `userId == request.auth.uid`
- **Admin override:** email verificado `kurosaki.mpm@gmail.com`
- **Coleções:** `projects`, `memories`, `user_settings`, `generations`, `chats`, `image_generations`
- **Subcoleções:** `projects/{projectId}/audios`, `images`, `videos`
- **Collection groups:** `audios`, `images`, `videos` (para queries cross-project)

## Storage Security Rules

Resumo de `storage.rules`:

- **Ownership:** `request.auth.uid == userId` no path
- **Admin override:** mesmo email admin do Firestore
- **Limites:** áudio 50 MB, imagem 10 MB, vídeo 200 MB
- **Paths:** `audios/{userId}/`, `images/{userId}/`, `generations_images/{userId}/`, `projects/{userId}/`
- **Público:** `previews/{allPaths=**}` — leitura pública, escrita admin-only

## Setup Rápido

1. Copie o template:
   ```bash
   cp .env.example .env.local
   ```

2. Preencha as variáveis obrigatórias em `.env.local`

3. Instale dependências e inicie:
   ```bash
   bun install
   bun run dev
   ```

4. O app estará disponível em `http://localhost:3000`

## Fluxo de Dados das Env Vars

```
.env.local
  → Vite expõe como import.meta.env.*
    → src/lib/env.ts (helpers tipadas)
      → src/lib/firebase.ts (Firebase init)
      → src/lib/gemini.ts (Gemini init)
```

Nenhum outro arquivo lê `import.meta.env` diretamente — toda leitura passa por `src/lib/env.ts`.
