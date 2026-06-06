# Script Master

> Plataforma open source para transformar roteiros em audio, imagens, cenas e videos usando IA generativa com modelo BYOK (Bring Your Own Key).

**Versao:** 0.130.0 | **Ultima atualizacao:** 06 de junho de 2026

---

## Visao Geral

Script Master e uma SPA em React + Vite que ajuda criadores a produzir conteudo multimidia a partir de roteiros. O usuario escreve ou importa um texto, gera narracao com Gemini TTS, cria imagens/cenas opcionais, monta videos com Remotion no navegador e organiza tudo em uma biblioteca de projetos.

O produto agora usa modelo **BYOK**:

- O usuario informa a propria API key do Gemini.
- A chave fica apenas no IndexedDB local do navegador.
- Chamadas de IA passam pelas Cloud Functions e enviam `providerAuth` no payload.
- O backend usa Genkit com `googleAI({ apiKey: false })` e injeta a chave por chamada.
- Nao ha Stripe, billing, creditos, planos pagos ou sistema de cobranca no repositorio.

Dominio oficial de producao: `https://script-master.pro`.

---

## Principais Recursos

### Estudio de Audio

- TTS com `gemini-3.1-flash-tts-preview`.
- Chunking automatico para roteiros longos.
- Suporte a multi-locutor com 2 vozes.
- Preflight tecnico antes da geracao para estimar chunks e validar limites.
- Saida WAV, com armazenamento local ou Firebase Storage conforme o estado do usuario.

### Imagens e Cenas

- Geracao de imagens com `gemini-3.1-flash-image-preview`.
- Prompts de cena com `gemini-3.1-flash-lite`.
- Suporte a imagem de referencia.
- Aspect ratios para estudio, cenas e video.
- Busca de midia stock via Pexels quando configurado.

### Video e Speed Paint

- Renderizacao client-side com Remotion e WebCodecs.
- Exportacao MP4/WebM com fallback de codec.
- Legendas por segment timing, Whisper aligned ou fallback proporcional.
- Speed Paint com deteccao de bordas, animacao de sketch/reveal e renderizacao Remotion.
- Videos exportados sao salvos apenas no IndexedDB local; leitura legada de arquivos antigos e preservada.

### Assistente IA

- Chat persistente com Genkit.
- Modos `fast` e `specialist`.
- Ferramentas para plano, busca web, estado do estudio, memorias e atualizacao do roteiro.
- Historico com tool calls preservado e compactacao automatica.
- Inline AI Widget para refatorar trechos do roteiro.

### Biblioteca e Projeto Manual

- Biblioteca de projetos com audios, imagens, videos locais e roteiros.
- Wizard `/app/projeto/novo` para criar projetos com arquivos proprios.
- Persistencia dual: Firestore + Storage para usuarios logados, IndexedDB para uso local.

---

## Stack

| Area | Tecnologia |
| ---- | ---------- |
| Frontend | React 19, Vite 8, TypeScript 6 |
| UI | MUI v9, Emotion, Motion |
| Estado | Zustand |
| Roteamento | react-router-dom v7 |
| IA | Genkit + Google Gemini |
| Backend | Firebase Cloud Functions v2 |
| Dados | Firebase Auth, Firestore, Storage, IndexedDB |
| Video | Remotion 4, WebCodecs, Whisper WASM |
| Testes | Vitest 4 + Testing Library |
| Deploy | Firebase Hosting + Cloud Functions |

---

## Arquitetura BYOK

### Frontend

- `src/features/provider-settings/` salva, testa e remove a chave Gemini.
- A chave nao vai para Firestore, Storage, Analytics ou logs.
- Hooks de IA usam `getProviderAuthFromStore()` para anexar `providerAuth`.
- `AuthContext` hidrata a chave local ao restaurar a sessao autenticada.

### Backend

- `functions/src/genkit/genkit.ts` inicializa Genkit sem chave global.
- `functions/src/genkit/utils/byok.ts` concentra `extractApiKey`, `withApiKey` e `maskApiKeyForLog`.
- Flows de IA extraem a chave do payload e chamam o Gemini com `config: { apiKey }`.
- `functions/src/flows/test-api-key.ts` faz uma chamada minima ao Gemini para validar a chave do usuario.

### Seguranca

- App Check permanece ativo nas Cloud Functions (`enforceAppCheck: true`).
- Forks precisam configurar o proprio Firebase, reCAPTCHA v3 e, em dev, token de debug do App Check.
- CORS aceita localhost, dominio oficial e dominios Firebase Hosting derivados do project id.
- A lista extra de origens pode ser configurada com `APP_CORS_ORIGINS`.

---

## Rotas

| Rota | Acesso |
| ---- | ------ |
| `/` | Visitante |
| `/funcionalidades` | Publico |
| `/open-source` | Publico |
| `/perguntas-frequentes` | Publico |
| `/contato` | Publico |
| `/sobre` | Publico |
| `/termos` | Publico |
| `/privacidade` | Publico |
| `/cookies` | Publico |
| `/login` | Visitante |
| `/cadastro` | Visitante |
| `/onboarding` | Publico |
| `/app/estudio` | Autenticado |
| `/app/video` | Autenticado |
| `/app/imagens` | Autenticado |
| `/app/pintura-rapida` | Autenticado |
| `/app/assistente` | Autenticado |
| `/app/biblioteca` | Autenticado |
| `/app/projeto/novo` | Autenticado |
| `/app/configuracoes` | Autenticado |

---

## Comandos Principais

```bash
bun run dev
bun run lint
bun run typecheck
bun run test
bun run build
bun run build:full
```

Functions:

```bash
cd functions
npm run build
npm run grant-access
```

---

## Open Source

- Licenca: MIT.
- Modelo de custo: o app e gratuito; o usuario paga diretamente ao Google pelo uso da propria chave Gemini.
- Sem segredos versionados.
- `.firebaserc` usa placeholder por padrao.
- Arquivos `.env.example` documentam variaveis necessarias sem valores sensiveis.

Antes de publicar um fork, configure:

1. Firebase project proprio.
2. Firebase Web App e variaveis `VITE_FIREBASE_*`.
3. reCAPTCHA v3 para App Check.
4. `VITE_RECAPTCHA_SITE_KEY`.
5. `VITE_APPCHECK_DEBUG_TOKEN` apenas no ambiente local quando necessario.
6. `APP_CORS_ORIGINS` nas Functions se usar dominio proprio.

---

## Avisos Legais

- Conteudo gerado por IA deve ser revisado antes da publicacao.
- Vozes TTS sao geradas por IA e nao representam pessoas reais.
- Imagens de terceiros seguem os termos dos respectivos provedores.
- O projeto nao fornece nem revende API key do Gemini.
