# Script Master — Estado Atual (v0.24.7)

> Inventário completo e detalhado do projeto, organizado para comparação competitiva.
> Última atualização: 2026-04-28

---

## 1. Visão Geral do Produto

### Proposta de Valor

O **Script Master** é uma plataforma client-side que transforma roteiros de texto em áudio profissional, imagens e vídeos usando inteligência artificial do Google Gemini. O diferencial central é que toda a renderização — incluindo vídeo com WebCodecs e legendas com Whisper WASM — acontece diretamente no navegador do usuário, sem necessidade de backend ou servidor de renderização.

A jornada do usuário segue 3 passos:
1. **Escrever o roteiro** no editor integrado (ou colar texto existente)
2. **Gerar com IA** — um clique transforma o roteiro em áudio TTS, imagens de cena e vídeo completo
3. **Exportar** — baixar áudio WAV, vídeo MP4/WebM ou imagens PNG

### Stack Técnica Resumida

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React + Vite | 19.2.5 / 8.0.8 |
| **Roteamento** | react-router-dom v7 (lazy loading por rota) | 7.14.1 |
| **UI** | MUI v9 (dark mode, CSS variables) | 9.0.0 |
| **Animações** | Motion (Framer Motion) | 12.38.0 |
| **Estado** | Zustand (stores flat, sem middleware persist) | 5.0.12 |
| **Canvas** | Konva + react-konva (Speed Paint) | 10.2.5 / 19.2.3 |
| **Vídeo** | Remotion 4.0.448 (WebCodecs + Whisper WASM) | 4.0.448 |
| **IA** | @google/genai (cliente direto, sem backend) | 1.50.1 |
| **Auth/DB** | Firebase (Auth + Firestore + Storage) | 12.12.0 |
| **Offline** | IndexedDB (dual storage) + Firestore persistence | — |
| **PWA** | vite-plugin-pwa (Workbox) | 1.2.0 |
| **Testes** | Vitest + @testing-library/react | 4.1.5 / 16.3.2 |
| **Lint** | ESLint 10 (flat config) | 10.2.1 |
| **Linguagem** | TypeScript | 6.0.3 |
| **Runtime** | Bun (desenvolvimento) | — |

### Modelo de Negócio (Pricing)

O projeto define 3 planos de preço, mas **os limites ainda não são aplicados automaticamente** — todos os recursos estão disponíveis durante o período de desenvolvimento. A monetização está planejada via Stripe (integração futura).

| Plano | Preço | Destaques |
|-------|-------|-----------|
| **Gratuito** | R$ 0 | 5 roteiros/mês, 10 imagens/mês, 720p, 30s vídeo, 20 msgs/dia, 3 speed paints/mês, 5 projetos |
| **Pro** | R$ 29/mês (R$ 23 anual) | TTS ilimitado, 200 imagens/mês, 1080p, 5 min vídeo, assistente ilimitado, 50 speed paints/mês, 100 projetos |
| **Equipe** | Sob demanda | Tudo ilimitado, 1080p, 10 min vídeo, suporte prioritário |

- Desconto de ~20% no pagamento anual
- Formas de pagamento planejadas: cartão de crédito (Visa, Mastercard, Elo, Amex), PIX, boleto
- FAQ de preços compartilhado entre PricingPage e FaqPage via `src/data/pricingFaq.ts`
- PricingPage inclui JSON-LD structured data (`SoftwareApplication` schema)

---

## 2. Páginas Públicas

As páginas públicas são carregadas via lazy loading (`React.lazy`) em `src/App.tsx`. Todas usam o componente `PageLayout` (shell com PublicHeader + PublicFooter) e `DocumentHead` para SEO via React 19 nativo.

### Landing Page (`/`)

Arquivo: `src/pages/public/LandingPage.tsx`

A landing page é construída com os seguintes blocos:

1. **HeroSection** — título "Transforme roteiros em arte com IA", subtítulo descritivo, 2 CTAs (cadastro + funcionalidades), ilustração à direita com drop-shadow
2. **SocialProofBar** — "Powered by Gemini AI" com subtítulo sobre TTS/imagens/assistente
3. **6 Feature Cards** (grid 3x2) — Voz com IA, Vídeo Automático, Geração de Imagens, Speed Paint, Assistente IA, Biblioteca. Cada card tem ícone, título, descrição e animação stagger
4. **3 Feature Showcases** — deep dives alternados (direita/esquerda) para TTS, Vídeo e Assistente IA. Cada showcase tem ícone, título, descrição, lista de 5 benefícios e imagem visual
5. **"Como Funciona"** — 3 StepCards: Escreva seu roteiro → Gere com IA → Exporte e compartilhe
6. **"E Muito Mais"** — 3 Feature Cards adicionais: Multi-speaker, Chunking Inteligente, Dual Storage
7. **CTA Final** — "Comece a criar agora" com link para cadastro

Animações: `motion/react` com `staggerContainer(0.08)` e `fadeInUp`, viewport `once`.

### Páginas Informativas

#### Funcionalidades (`/funcionalidades`)
Arquivo: `src/pages/public/FuncionalidadesPage.tsx`

6 seções categorizadas com deep dives:
- **Áudio** — TTS, multi-speaker, voice previews, pace
- **Vídeo** — Remotion client-side, codec fallback, legendas Whisper
- **Imagem** — 8 aspect ratios, referência visual, galeria
- **Assistente** — Streaming, memórias, anexos, integração estúdio
- **Biblioteca** — Projetos, batch download, persistência dual
- **Speed Paint** — Edge detection, BFS, batch processing

#### Preços (`/precos`)
Arquivo: `src/pages/public/PricingPage.tsx`

- Hero com ícone Savings
- Toggle Mensal/Anual com badge "-20%"
- 3 PricingCards em grid (Gratuito/Pro/Equipe)
- Alert informativo: limites não aplicados ainda
- Tabela comparativa semântica (`<table>` nativa com `<thead>`, `<tbody>`, `<th scope="col">`) — 9 funcionalidades × 3 planos
- FAQ de preços (6 perguntas via `FAQAccordion`)
- CTA final

#### FAQ (`/perguntas-frequentes`)
Arquivo: `src/pages/public/FaqPage.tsx`

FAQ por categorias via tabs MUI:
- **Geral** (6 perguntas) — O que é, precisa de conta, idioma, plataformas
- **Pagamentos** (6 perguntas, reutiliza `PRICING_FAQ_ITEMS`) — Grátis, cancelamento, formas, limites, anual, troca
- **Funcionamento** (5 perguntas) — Vozes, formatos export, duração, offline
- **Conta** (4 perguntas) — Exclusão, dados, migração, suporte

Accordion expansível com `id`/`aria-controls` para WCAG 4.1.2.

#### Contato (`/contato`)
Arquivo: `src/pages/public/ContactPage.tsx`

- Formulário de contato (nome, email, mensagem)
- Links para redes sociais (WhatsApp, Instagram, LinkedIn, GitHub)
- Informações de suporte por email
- CTA final

#### Sobre (`/sobre`)
Arquivo: `src/pages/public/AboutPage.tsx`

- Missão, valores e diferenciais do produto
- Seção sobre a equipe/produto
- CTA para cadastro

### Páginas Legais

Todas usam `LegalPageTemplate` (componente reutilizável com título, data de atualização, seções e sumário):

- **Termos de Uso** (`/termos`) — `src/pages/public/TermsPage.tsx`
- **Privacidade** (`/privacidade`) — `src/pages/public/PrivacyPage.tsx`
- **Cookies** (`/cookies`) — `src/pages/public/CookiesPage.tsx`

### Status Page (`/status`)
Arquivo: `src/pages/public/StatusPage.tsx`

Monitora 8 serviços com status visual:
- Google Gemini API (TTS, Imagem, Chat)
- Firebase (Auth, Firestore, Storage)
- Renderização de Vídeo (Remotion)
- CDN (Firebase Hosting)

Tipos de status: `operational`, `degraded`, `outage`, `maintenance`. Cada serviço tem ícone e chip colorido.

### SEO

O SEO usa React 19 nativo (sem react-helmet-async, removido na v0.24.4):

- **`DocumentHead`** (`src/components/DocumentHead.tsx`) — renderiza `<title>`, `<meta>`, `<link>` no `<head>` via hoisting nativo do React 19
- **`getPageSeo()`** (`src/lib/seo.ts`) — gera dados padronizados de SEO para cada página
  - Open Graph tags: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:site_name`, `og:locale` (pt_BR)
  - Twitter Cards: `summary_large_image`
  - Canonical URL
  - `article:published_time` para páginas com data
- **`SeoData`** e **`SeoMeta`/`SeoLink`** — tipos próprios em `src/lib/seo.ts`
- **`robots.txt`** — bloqueia `/app/`, `/login`, `/cadastro`
- **`sitemap.xml`** — 9 URLs públicas priorizadas
- **NotFoundPage** — meta `noindex, nofollow`
- **PricingPage** — JSON-LD structured data (`SoftwareApplication` schema)

### Componentes de Páginas Públicas

12 componentes em `src/components/public/`:

| Componente | Descrição |
|-----------|-----------|
| `PublicHeader` | AppBar responsivo com drawer mobile, logo, navegação, link "Contato" |
| `PublicFooter` | 3 grupos: Produto (6 links), Empresa (4 links), Legal (3 links) |
| `PageLayout` | Shell genérico (sem `<main>` — landmark fica em App.tsx) |
| `HeroSection` | Hero com título, subtítulo, CTAs, visual à direita/esquerda, glow opcional |
| `FeatureCard` | Card de feature com ícone, título, descrição, highlight e animação |
| `FeatureShowcase` | Deep dive alternado com benefícios e visual |
| `CTASection` | Seção de call-to-action com glow laranja |
| `StepCard` | Card de passo "como funciona" com glassPanelSx |
| `SocialProofBar` | Barra de social proof horizontal |
| `PricingCard` | Card de plano com preço, features, badge recomendado |
| `FAQAccordion` | Accordion com a11y (`id`, `aria-controls`, `aria-expanded`) |
| `ScrollToTop` | Scroll automático ao mudar de rota |

Animações exportadas de `src/components/public/animations.ts`: `staggerContainer`, `fadeInUp`, `fadeIn`, `VIEWPORT_ONCE`.

### Redirects de Compatibilidade

8 redirects 301 configurados no `firebase.json` e duplicados no `App.tsx`:

| De | Para |
|----|------|
| `/features` | `/funcionalidades` |
| `/pricing` | `/precos` |
| `/faq` | `/perguntas-frequentes` |
| `/contact` | `/contato` |
| `/register` | `/cadastro` |
| `/app/image` | `/app/imagens` |
| `/app/assistant` | `/app/assistente` |
| `/app/library` | `/app/biblioteca` |
| `/app/speed-paint` | `/app/pintura-rapida` |

---

## 3. Autenticação & Onboarding

Arquivos: `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/lib/firebase.ts`, `src/lib/db/account-cleanup.ts`

### Métodos de Login

| Método | Componente | Detalhes |
|--------|-----------|----------|
| **Google popup** | `login()` | `signInWithPopup(auth, googleProvider)` |
| **Email/senha** | `loginWithEmail()` | `signInWithEmailAndPassword` |
| **Cadastro email/senha** | `signup()` | `createUserWithEmailAndPassword` + `sendEmailVerification` |

- 10 componentes consomem `useAuth()` no projeto
- Erros mapeados para pt-BR: `auth/popup-blocked`, `auth/too-many-requests`, `auth/email-already-in-use`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`, `auth/weak-password`, `auth/invalid-email`, `auth/requires-recent-login`
- Login/logout/delete fazem `window.location.href` (full reload) para alternar COEP — popup Firebase precisa de iframes cross-origin

### Verificação de Email

- Email de verificação enviado automaticamente após cadastro (`sendEmailVerification`)
- `ProtectedRoute` bloqueia acesso a usuários email/senha não verificados
- Tela de bloqueio com botão "Reenviar email" para retentativa
- Login com Google é auto-verificado (sem tela de bloqueio)

### Fluxo de Cadastro

1. Usuário preenche email + senha em `/cadastro`
2. `createUserWithEmailAndPassword` cria a conta
3. `sendEmailVerification` envia email de verificação (falha silenciosa)
4. `ProtectedRoute` detecta não-verificação e exibe tela com botão "Reenviar email"
5. Após verificação, redirect para `/app/estudio`

### Exclusão de Conta (LGPD)

Pipeline completo em `AuthContext.tsx:156` e `account-cleanup.ts`:

1. **Dialog de confirmação** — usuário deve digitar "EXCLUIR" para confirmar
2. **`deleteUser(currentUser)` PRIMEIRO** — remove autenticação antes do cleanup
3. **`deleteAllUserData(userId)`** — pipeline de limpeza que remove:
   - Projetos + subcoleções (audios, images, videos) do Firestore
   - Gerações (coleção flat)
   - Chats
   - Memórias
   - User settings
   - Storage objects (imagens, áudios, vídeos)
   - IndexedDB local
4. **Notificação de falhas parciais** — via `window.confirm()` se alguma categoria falhar (LGPD)
5. **Redirect** para `/login`

### Migração de Dados

Arquivo: `src/lib/db/migration.ts`, componente: `DataMigrationDialog`

Quando um usuário anônimo faz login (transição `null → user`):
1. `checkForMigratableData()` verifica IndexedDB por dados migráveis (projetos, gerações, imagens, memórias, chats, settings)
2. `DataMigrationDialog` exibe resumo e solicita confirmação
3. `migrateAnonymousData(userId)` migra metadados para Firestore (blobs locais não são transferidos via Storage)
4. Chats > 900KB são pulados (limite Firestore)
5. Itens migrados são removidos do IndexedDB
6. Flag de migração salva em `localStorage` para evitar repetição

---

## 4. Estúdio de Produção (Core Feature)

### Visão Geral

O estúdio é a feature principal do produto. Consiste em:
- **Editor de roteiro** (ScriptEditor) — área de texto com fonte serifada (Georgia)
- **Painel de inspeção** (Inspector) — configurações de voz, cena, áudio e geração
- **ActionBar** — barra fixa na parte inferior com controles de geração e reprodução

Layout: Grid 2 colunas — Inspector (`xs:12, lg:4`) + ScriptEditor (`xs:12, lg:8`)

### Editor de Roteiro

Arquivo: `src/components/ScriptEditor.tsx`

- Textarea com fonte serifada (Georgia) para experiência de escrita
- Atalho **Ctrl+Enter** para iniciar geração
- **Highlight de cena ativa** — fundo do ScriptEditor muda baseado na cena ativa do vídeo (via `currentTime`)
- Limite de 50.000 caracteres (`MAX_CHARS`)
- Props: `script`, `setScript`, `isGenerating`, `handleGenerate`, `isGenerateDisabled`, `scenes`, `currentTime`

### Configurações de Voz

Arquivo: `src/features/studio/store/studioStore.ts` + `src/components/Inspector.tsx`

**30 vozes disponíveis** (definidas em `src/lib/constants.ts`):

| ID | Estilo | ID | Estilo |
|----|--------|-----|--------|
| Aoede | Descontraída | Puck | Animada |
| Zephyr | Brilhante | Charon | Informativa |
| Kore | Firme | Fenrir | Entusiasmada |
| Leda | Jovem | Orus | Firme |
| Autonoe | Brilhante | Enceladus | Suave/Aérea |
| Iapetus | Clara | Umbriel | Tranquila |
| Algieba | Suave | Despina | Suave |
| Erinome | Clara | Algenib | Rouca |
| Rasalgethi | Informativa | Laomedeia | Animada |
| Achernar | Macia | Alnilam | Firme |
| Schedar | Equilibrada | Gacrux | Madura |
| Pulcherrima | Direta | Achird | Amigável |
| Zubenelgenubi | Casual | Vindemiatrix | Gentil |
| Sadachbia | Vibrante | Sadaltager | Especialista |
| Sulafat | Acolhedora | Callirrhoe | Tranquila |

**Voice Previews** — arquivos WAV estáticos em `/voice-previews/{voiceId}.wav`, hook `useVoicePreviews()` para preview de voz antes de gerar.

**Multi-speaker** — quando ativo, configura 2 locutores independentes:
- Speaker A (nome + voz selecionável)
- Speaker B (nome + voz selecionável)
- O prompt TTS inclui instruções para o modelo alternar entre locutores

**Audio Profile** — instruções de direção de áudio (podcast, audiobook, narração, etc.)
**Pace** — 5 velocidades: `very_slow`, `slow`, `normal`, `fast`, `very_fast` com instruções de prompt
**Style Notes** — notas de direção livres

### Geração de Áudio TTS

Hook: `src/hooks/useAudioGenerator.ts` (~698 linhas)

**Pipeline completo:**

1. **Validação** — script não vazio, dentro do limite de 50K chars
2. **Criação de projeto** — UUID gerado, salvo no Firestore/IndexedDB via `saveProject()`
3. **Chunking** — se roteiro > 500 chars:
   - Tenta divisão via LLM (`gemini-3.1-flash-lite-preview`) com JSON output (array de strings)
   - Fallback: `splitTextProgrammatically` por sentenças (respeitando `. ! ? \n`)
   - Cada chunk ≤ 500 caracteres (`CHUNK_LIMIT`)
4. **Geração TTS por chunk** — modelo `gemini-3.1-flash-tts-preview`:
   - Prompt inclui: perfil de áudio, cena, notas de direção, pace
   - **Continuidade**: a partir do chunk 2, injeta "TAKES CONTÍNUOS" no prompt para manter tom/energia consistentes
   - Multi-speaker: `multiSpeakerVoiceConfig` com 2 `speakerVoiceConfigs`
   - Retry: `withRetry` com 3 tentativas, 1500ms base, 500ms jitter
5. **Montagem WAV** — PCM chunks concatenados, header WAV de 44 bytes, 24kHz mono 16-bit
6. **Auto-save** — áudio salvo no projeto via `saveAudioToProject()`
7. **Segmentos de timing** — cada chunk gera `AudioSegment` (text, startSec, endSec, chunkIndex) para legendas
8. **Detecção de silêncio** — `detectSceneBoundaries()` via RMS para refinar timestamps de cena

**Estado do hook:**
- `isGenerating`, `statusText`, `generationProgress` (0-100%)
- `audioUrl`, `audioBlob`, `scenes`, `audioSegments`, `projectId`
- `error`, `sceneGenerationWarning`
- `durationInSeconds` — calculado do blob WAV (preciso) ou metadados do áudio (fallback)

**Cancelamento:**
- `cancelRef` checado antes de cada chunk
- Estado anterior restaurado via `lastSuccessfulStateRef`
- State values espelhados via refs para evitar stale closure

### Store do Estúdio

Arquivo: `src/features/studio/store/studioStore.ts`

**14 preferências persistidas** no localStorage (prefixo `s2a_`):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `script` | string | Texto do roteiro |
| `selectedVoice` | string | Voz principal |
| `isMultiSpeaker` | boolean | Multi-speaker ativo |
| `speakerAName` | string | Nome do locutor A |
| `speakerBVoice` | string | Voz do locutor B |
| `speakerBName` | string | Nome do locutor B |
| `audioProfile` | string | Perfil de áudio |
| `scene` | string | Descrição da cena |
| `styleNotes` | string | Notas de direção |
| `pace` | string | Velocidade (very_slow → very_fast) |
| `generateScenes` | boolean | Gerar cenas visuais |
| `sceneDensity` | number | Densidade de cenas (segundos entre cenas) |
| `sceneRatio` | SceneRatio | Proporção (16:9, 9:16, 1:1) |
| `visualFramework` | string | "general" ou "whiteboard" |

+ `referenceImage` (session-only, não persistido)

**Padrão de persistência:**
- `subscribe` + `PERSIST_MAP` — escuta mudanças e salva no localStorage
- Sem middleware `persist` — deliberadamente para simplicidade
- `useShallow` para seletores otimizados

**`buildGenerateOptions()`** — construtor DRY em `store/studio.utils.ts` que recebe `StudioDraftState` + campos de speaker + userId e retorna `GenerateOptions` para o hook de áudio.

### ActionBar

Arquivo: `src/components/ActionBar.tsx`

- Fixo na parte inferior (z-index 1400)
- Aparece nas rotas `/app/estudio` e `/app/video`
- Controles: play/pause áudio, progresso de geração, download WAV, salvar na biblioteca, exportar vídeo
- Seletores primitivos do AudioContext (`useAudioIsPlaying`, `useAudioCurrentTime`, `useAudioDuration`) — elimina ~4 re-renders/s
- Snackbar de exportação de vídeo visível quando exportando fora da página `/video`

---

## 5. Geração de Imagens

### Pipeline de Geração

Hook: `src/hooks/useImageGenerator.ts`
Lib: `src/lib/gemini.ts`

1. Usuário escreve prompt e seleciona aspect ratio (opcionalmente anexa referência)
2. Referência convertida de `File` para base64 via `FileReader`
3. Chamada ao modelo `gemini-3.1-flash-image-preview` via `withRetry` (3 tentativas, 1000ms base, 500ms jitter)
4. Extrai `inlineData` da resposta
5. Converte base64 → Blob → Blob URL
6. Cancelamento silencioso (sem erro para o usuário)

### Aspect Ratios Suportados

**Estúdio de Imagem** — 8 ratios: `1:1`, `3:4`, `4:3`, `9:16`, `16:9` e mais
**Pipeline de Cenas** — 3 ratios (`SceneRatio`): `16:9`, `9:16`, `1:1`
**Vídeo** — mesmos 3 ratios de cena

### Referência de Imagem

- Estúdio: upload via `File` → `FileReader` → base64 → `inlineData` no request
- Pipeline de cenas: `string` (data URL ou base64) via `parseReferenceImage()` que detecta `data:` URI vs base64 puro

### Frameworks Visuais

Dois modos configuráveis no Inspector:

1. **General** — imagens cinematográficas/fotográficas seguindo a direção de arte
2. **Whiteboard** — ilustrações coloridas estilo whiteboard animation:
   - Fundo branco explícito
   - Ilustrações coloridas (marker/doodle)
   - Textos integrados na imagem (1-4 palavras-chave)
   - Sem fotografias ou 3D

### Estúdio Dedicado

Rota: `/app/imagens`
Componente: `src/components/ImageStudio.tsx`

- Campo de prompt de texto
- Seletor de aspect ratio
- Upload de referência visual (drag & drop via react-dropzone)
- Preview da imagem gerada
- Botões de gerar/cancelar/limpar

### Geração de Cenas (Pipeline Integrado)

Quando `generateScenes=true` no estúdio:

1. **`generateScenePrompts()`** — modelo `gemini-3.1-flash-lite-preview` gera descrições de cena em JSON
   - Recebe: roteiro, duração, estilo, densidade (padrão 15s), framework visual
   - Retorna: array de `{ timestamp, prompt }`
   - Fallback genérico se API falhar (warning exibido ao usuário)
2. **`generateImageFromPrompt()`** — para cada prompt, gera imagem via `gemini-3.1-flash-image-preview`
   - Suporta referência de imagem
3. **Refinamento de timestamps** — `detectSceneBoundaries()` substitui timestamps estimados do Gemini por timestamps reais do áudio via análise de silêncio (RMS)
4. **Auto-save** — cada imagem salva no projeto via `saveImageToProject()`

---

## 6. Vídeo & Renderização

### Pipeline Completo

A renderização de vídeo é **100% client-side** usando Remotion + WebCodecs, sem backend.

Arquivos principais: `src/features/video-render/` (53 arquivos)

**Composição de vídeo (`VideoComposition`):**
- Sequência de cenas (`VideoScene[]`) com duração em frames
- Legendas sincronizadas (`CaptionWord[]`)
- Áudio embutido
- Crossfade entre cenas com spring animation

**Fluxo de criação:**
1. Áudio gerado no estúdio → carregado na página `/app/video`
2. Cenas geradas → mapeadas para `VideoScene[]` via `mapScenesToVideoScenes()`
3. Transcrição Whisper → legendas `CaptionWord[]`
4. Exportação via `useVideoExporter()` → WebCodecs → Blob → download

### Codec Fallback

O exportador tenta codecs em ordem de preferência:

1. **H.264 + AAC + MP4** — melhor compatibilidade
2. **H.264 sem áudio** — fallback se AAC não disponível
3. **VP8 + Opus + WebM** — fallback universal (aviso exibido ao usuário)

**Bridge Store** — `videoRenderBridge` (Zustand) sincroniza estado de exportação entre VideoPage (dono dos hooks Remotion) e App.tsx/ActionBar, evitando importar Remotion no App.tsx.

### Speed Paint no Vídeo

**`SpeedPaintScene`** — sistema de 4 zonas com `interpolate` do Remotion:

1. **Fade in** (1s) — opacidade vai de 0 a 1
2. **Animação** — progresso sketch/reveal controlado por `SpeedPaintMultipliers`
3. **Hold** (3s) — frame final mantido
4. **Fade out** (1s) — opacidade vai de 1 a 0

- Opacidade via CSS no `<AbsoluteFill>` para crossfade real entre cenas
- Overlap dinâmico: speed paint usa 1s, cenas estáticas usam 400ms
- Fade = 12 frames para cenas estáticas
- Spring `{damping:26, stiffness:100, mass:1}`

**`SceneSequence`** — fallback para cenas estáticas (sem speed paint)

**`SpeedPaintControls`** — sliders independentes sketch/reveal (0.25x–4.0x) via props primitivas
**`SpeedPaintSpeed`** type: `slow | normal | fast`

### Legendas

Hook: `src/features/video-render/hooks/useTranscription.ts` (~591 linhas)

**3 fontes de sincronização (prioridade):**

1. **segment-timing** — segmentos de áudio do `useAudioGenerator` (timing real do TTS)
2. **whisper-aligned** — Whisper WASM com timestamps por palavra
3. **proportional** — distribuição proporcional do roteiro pela duração

**Pipeline Whisper:**
1. Verifica suporte via `canUseWhisperWeb()`
2. Download do modelo `tiny` (~39MB) se necessário
3. Resample para 16kHz
4. Transcrição via `transcribe()` → `TranscriptionJson`
5. Conversão para `Caption` via `toCaptions()` (Remotion captions)
6. Criação de TikTok-style captions via `createTikTokStyleCaptions()`

**Sincronização avançada:**
- `segmentScriptByCenes()` — divide roteiro por timestamps de cena
- `alignScriptToSegments()` — alinha palavras do roteiro com segmentos de áudio
- `parseBoldMarkdown()` — suporte a **bold** via markdown nas legendas
- `splitIntoWordsWithTiming()` — conversão de texto em `CaptionWord[]`

**Staleness detection** — hash SHA-256 do roteiro detecta quando legendas ficam desatualizadas após edição

**SubtitleOverlay** — componente Remotion que renderiza legendas no vídeo
**SubtitleStyle** — configuração completa: fontSize, paddingX/Y, borderRadius, backgroundOpacity, gap, verticalOffset, position (top/bottom)

**SubtitleInlineEditor** — editor inline via portal com:
- `EditorToolbar` — toolbar flutuante com controles
- `FontSizeControls` — botões de aumentar/diminuir fonte
- `PositionToggle` — alternar posição (top/bottom)
- `StyleSlider` — slider genérico para opacidade/offset
- `ToolbarActions` — botões reset/confirmar/cancelar
- `SubtitlePreview` — preview da legenda
- `DragOverlay` — overlay de drag para reposicionar

### Export Quality

**`VideoExportQuality`** type: `720p | 1080p | 1440p | 4k`

**`getResolutionFromQuality()`** — resolução baseada no quality e ratio:
- 720p: 1280px lado maior
- 1080p: 1920px (padrão)
- 1440p: 2560px
- 4k: 3840px

**`estimateFileSize()`** — estima tamanho em bytes baseado em:
- Bitrate base do mediabunny: 3 Mbps para 1080p
- Escala não-linear: `pow(pixels/reference, 0.95)`
- Multiplicadores por codec: H.264=1, H.265=0.6, VP9=0.6, AV1=0.4, VP8=1.2

### Resoluções Suportadas

| Ratio | Resolução |
|-------|-----------|
| 16:9 | 1920×1080 |
| 9:16 | 1080×1920 |
| 1:1 | 1080×1080 |

### Player de Vídeo

**`VideoPreview`** — player Remotion com handle exposto:
- `play()`, `pause()`, `seekTo(frame)`, `getCurrentTime()`, `isPlaying()`
- Ref compartilhado entre VideoPage e ActionBar

**`WaveformOverlay`** — waveform sincronizado sobreposto ao vídeo (desabilitado durante exportação)

**`ScrollingPhrase`** — texto contínuo com variantes `active` (fade in + translateY) e `previous` (opacidade 1.0→0.5). Suporte a bold via markdown.

---

## 7. Assistente IA

### Visão Geral

Arquivos: `src/features/assistant/`, `src/hooks/useAssistant.ts`

Chat conversacional com Gemini, streaming em tempo real, memórias de longo prazo e integração direta com o estúdio de produção.

### Modelo e Streaming

- Modelo: `gemini-3.1-flash-lite-preview`
- Streaming via `generateContentStream`
- Chunks acumulados via `requestAnimationFrame` — flush uma vez por frame de display (reduz re-renders durante streaming)
- Novo envio aborta chamada anterior (`AbortController`)
- Desmontagem aborta streaming em andamento

### Anexos

- **5 por mensagem**
- **Imagem**: até 10MB, enviada como `inlineData` ao Gemini
- **Documento**: `.md`, `.txt`, `.csv` até 500KB (truncado em 490K chars)
- Convertidos via `fileToAttachment()` → `AttachmentRecord`
- Exibidos como `Chip` MUI com estilo premium (`assistantAttachmentChipSx`)

### Memórias e Contextos

- **Memórias curtas**: texto direto, salvo no Firestore/IndexedDB
- **Upload de memória**: documentos `.md/.txt/.csv` até 500KB
- Memórias injetadas no **system prompt** do assistente
- **Custom system prompt**: salvo via `saveUserSettings()` / `getUserSettings()`

**System prompt** montado dinamicamente com:
- Identidade do assistente
- Estrutura TTS (vozes disponíveis, pace, etc.)
- Memórias do usuário
- Configurações customizadas
- Estado atual do estúdio (quando disponível)

### Modo Estúdio

Quando `currentState` (estúdio) é fornecido ao hook:
- Inclui estado completo do estúdio no system prompt
- Instrui modelo a sugerir alterações em bloco JSON
- Resposta pode conter bloco `\`\`\`json` com `StudioSettingsPatch`
- `extractJsonSettings()` extrai e parseia o bloco
- Botão **"Aplicar no estúdio"** aplica o patch parcial via `applySettings()`
- `stripJsonSettingsBlock()` remove o bloco JSON do texto exibido

### Chat Sessions

- **Auto-save**: salva sessão ao final de cada resposta (quando `isStreaming → false`)
- **Título**: primeiros 40 chars da primeira mensagem do usuário
- **Histórico**: `getChatSessions()` busca Firestore + IndexedDB e deduplica por `updatedAt`
- **Dual storage**: se doc > 900KB ou erro Firestore, salva no IndexedDB
- **Dual delete**: `deleteChatSession()` remove de ambas as fontes
- **Retry**: `retryLastMessage()` reenvia última mensagem do usuário
- **Botão "Tentar novamente"** no Alert de erro

### Empty State

`EmptyChatState` no `AssistantMessages`:
- Mensagem de boas-vindas do assistente
- Chips clicáveis com prompts contextuais (ex: "Me ajude a escolher a voz ideal")

### UI do Assistente

Estilos centralizados em `assistantUi.ts` — 13 estilos exportados:
- `assistantDrawerPaperSx` — fundo do drawer
- `assistantInsetSx` — fundo do inset
- `assistantBubbleModelSx` — bolha da IA
- `assistantBubbleUserSx` — bolha do usuário
- `assistantComposerInputSx` — campo de input
- `assistantComposerContainerSx` — container do composer

---

## 8. Biblioteca & Projetos

### Organização de Projetos

Arquivos: `src/components/Library.tsx`, `src/lib/db/projects.ts`, `src/lib/db/generations.ts`

**Projetos** — unidade principal de organização:
- Cada projeto tem: script, configurações (settings), e subcoleções (audios, images, videos)
- Firestore: `projects/{id}` com subcoleções `audios`, `images`, `videos`
- IndexedDB: stores `projects`, `audios`, `project_images`, `videos`
- Suporta rename via `updateProjectName()`
- Delete com confirmação via `DeleteConfirmationDialog`

**Gerações** — coleção flat `generations`:
- Salvam áudio + roteiro + voz + cenas de forma independente
- Storage: `audios/{userId}/{id}.wav`, cenas em `generations_images/{userId}/{id}_scene_{index}.png`

### Galeria de Vídeos

Arquivos: `src/components/video-library/` (modularizada)

Componentes:
- `VideoLibrary` — galeria horizontal com busca, ordenação, seleção rápida
- `GalleryCard` — card de vídeo com thumbnail, metadados e ações
- `DeleteConfirmationDialog` — dialog de confirmação (compartilhado com Library, ImageStudio e Assistant)
- `MetadataPill` — badge de metadado (duração, resolução, formato)
- `useProjectGallery` — hook de busca e ordenação
- `useBatchDownload` — download em lote com falha individual

**Busca e ordenação:**
- Busca por nome do projeto
- Ordenação por data (recente/antigo)
- Seleção rápida de projeto para carregar no player de vídeo

### Batch Download

Hook: `useBatchDownload()`

- Download em lote de vídeos
- Falha individual não cancela o batch
- Feedback visual: indicador de download em progresso por item

### Download de Arquivos

`downloadFile()` — utilitário genérico:
- blob/data URLs → download direto
- URLs remotas → fetch → blob → download
- Fallback: abre no browser (PDFs, etc.)

### Blob Cleanup

- **Library**: `useRef<string[]>` para revogar blob URLs
- **VideoLibrary**: `Set<string>` com revogação seletiva por item

---

## 9. Speed Paint

### Pipeline de Processamento

Arquivo: `src/features/speed-paint/lib/imageProcessing.ts` (~616 linhas)

**Fases do processamento:**

1. **Edge Detection (Sketch)**
   - Conversão para grayscale (pesos: 0.299R + 0.587G + 0.114B)
   - Detecção de bordas via diferença adjacente (threshold > 20)
   - Geração de strokes (layer 0)

2. **Clusterização BFS**
   - Bordas conectadas são agrupadas em clusters via BFS
   - Cada cluster vira um stroke com cor e espessura

3. **Vetorização**
   - Strokes convertidos para formato otimizado
   - Cores extraídas do pixel original

4. **Renderização Progressiva**
   - Canvas Konva renderiza strokes progressivamente
   - Fase sketch (bordas) → Fase reveal (coloração)

**Web Worker** — processamento pesado (edge detection + BFS) via Web Worker inline (Blob URL) — não bloqueia a main thread.

### Fases (Sketch + Reveal)

**Sketch** (layer 0):
- Desenha as bordas detectadas progressivamente
- Controlado por `drawSpeed` (0.25x – 4.0x)

**Reveal** (layer 1):
- Coloração com `destination-out` — apaga a "lousa branca" revelando a imagem original
- Controlado por `paintSpeed` (0.25x – 4.0x)

**Canvas Offscreen** — buffer simula "lousa branca" sobre a imagem original.

### Controles

- **Play/Pause** — reproduz/pausa animação
- **Seek** — barra de progresso para navegar na animação
- **Velocidade dupla** — sliders independentes para draw (sketch) e paint (reveal)
- **Export PNG** — exportação em 2x resolução
- **Export WebM** — H.264 > VP9 > padrão, bitrate 12Mbps

### Batch Processing

Componentes: `BatchOrchestrator`, `QueueStaging`

- Fila de imagens processada sequencialmente
- **Modo Watch**: auto-avança após 2 segundos
- **Modo Record**: grava animação + avança para próxima
- Status: `pending → processing → completed → failed`

### Store

`useAnimationStore` (Zustand):
- `job`: PaintingJob (id, inputImage, status, progress, animation)
- `queue`: QueuedImage[] com `currentIndex`
- `batchMode`: `idle | watch | record`
- Player state: `isPlaying`, `progress`, `speed`, `paintSpeed`

### Speed Paint no Vídeo (Remotion)

**`SpeedPaintScene`** — componente Remotion que renderiza speed paint dentro do vídeo:
- Sistema de 4 zonas: fade in → animação → hold → fade out
- `SpeedPaintMultipliers` para controle granular por fase
- Cache LRU (20 entradas) via SHA-256 em `strokeCache.ts`
- Web Worker para >5 cenas via `strokeWorker.ts`

**`generateScenesWithSpeedPaint()`** — processa todas as cenas:
- `{ useWorker: true }` para >5 cenas
- Fallback automático para main thread
- Progresso via callback

---

## 10. UX/UI & Design

### Theme

Arquivo: `src/theme/appTheme.ts`

**Dark mode** — palette idêntica para light/dark (dark only na prática)
- `colorScheme: 'dark'` no `:root`
- CSS variables: `--bg-base`, `--bg-surface`, `--bg-elevated`, `--border`, `--text-primary`, `--accent`, `--glass-bg`, `--glass-border`

**Fontes:**
- Sans: Inter (ui-sans-serif, system-ui)
- Mono: JetBrains Mono
- Serif: Georgia (usado no ScriptEditor)
- Display: Playfair Display

**Espaçamento:** 8px base (MUI default)

### Tokens Visuais

Arquivo: `src/theme/tokens.ts`

**Brand:**
- Primary: `#2E75B6` (azul) / Light `#5BA3D0` / Dark `#1A5B8E`
- Secondary: `#F7941E` (laranja) / Light `#FFB74D` / Dark `#E67300`

**Semantic:**
- Success: `#10b981` | Error: `#ef4444` | Warning: `#f59e0b`

**Surfaces (5 níveis):**
- `APP_BACKGROUND` → `APP_SURFACE` → `APP_SURFACE_ELEVATED`
- `APP_BORDER` / `APP_BORDER_STRONG`

**Glow (3 níveis):**
- `BRAND_PRIMARY_GLOW` / `BRAND_PRIMARY_GLOW_SOFT`
- `BRAND_SECONDARY_GLOW`

**Gradients:**
- `BRAND_GRADIENT` (azul → laranja)

### Superfícies Glass

Arquivo: `src/theme/surfaces.ts`

| Superfície | Descrição |
|-----------|-----------|
| `glassPanelSx` | Blur + gradiente + shadow |
| `insetPanelSx` | Recessado (inset) |
| `glassSurfaceSx` | Blur fixo |
| `searchFieldSx` | Campo de busca |

### Component Overrides MUI v9

| Componente | Customização |
|-----------|-------------|
| `MuiAppBar` | Glass/blur (backdropFilter: blur(20px)), elevation 0 |
| `MuiButton` | Border-radius 14, min-height 44, no elevation, shadow no primary contained |
| `MuiCard` | Surface elevated, border |
| `MuiAlert` | Semi-transparente (alpha 0.92) |
| `MuiSnackbar` | z-index 1500 |
| `MuiLink` | `LinkBehavior` auto-via `defaultProps` |
| `MuiButtonBase` | `LinkComponent` via `defaultProps` |

### Layout Responsivo

- Container `maxWidth: 1600px`
- Padding responsivo: `px: { xs: 2, sm: 3, lg: 4 }`
- `/assistant`, `/login`, `/cadastro`: sem Container (full-width)
- Header: nav horizontal no desktop, drawer mobile via `useMediaQuery`
- Grid breakpoints: xs/sm/md/lg

### Keyboard Shortcuts

Hook: `src/hooks/useKeyboardShortcuts.ts`

| Atalho | Ação |
|--------|------|
| `Ctrl+Enter` | Gerar áudio (estúdio) |
| `Space` | Play/pause vídeo e toggle áudio |

Proteção contra atalhos quando inputs/blocos editáveis estão focados.

### PWA

Plugin: `vite-plugin-pwa`

- **Manifest**: ícones 192/512 (WebP), `theme_color: #0a0a0f`, `display: standalone`, `orientation: any`
- **Service Worker**: registrado apenas em produção (`import.meta.env.PROD`), `immediate: true`
- **Runtime caching**:
  - Assets estáticos: CacheFirst, 1 ano
  - Google Fonts stylesheets: CacheFirst, 1 ano
  - Google Fonts webfonts: CacheFirst, 1 ano
- **SPA**: `navigateFallback: '/index.html'`
- **Exceções**: `/login`, `/cadastro`, `/__/` em `navigateFallbackDenylist` (sem COEP, Firebase Hosting endpoints)

---

## 11. Infraestrutura

### Firebase

**Hosting tradicional** (frontend estático, sem backend Node):

| Serviço | Uso |
|---------|-----|
| **Auth** | Google popup + email/senha + verificação + reset + exclusão |
| **Firestore** | Projetos, gerações, imagens, chats, memórias, settings, vídeos |
| **Storage** | Áudio (50MB), imagem (10MB), vídeo (200MB) |
| **Hosting** | SPA + COEP headers + redirects + cache immutable |

**Offline persistence:**
- `initializeFirestore` com `persistentLocalCache` + `persistentMultipleTabManager`
- Suporte nativo a múltiplas abas (API moderna)

**Queries:** `limit(100)` em todas as listagens Firestore

**Upload:**
- `uploadBytesResumable` para blobs >10MB
- `uploadBytes` one-shot para menores

### IndexedDB (Dual Storage)

**Banco:** `GeminiVoiceStudioDB` v9

**Stores:** generations, image_generations, projects, audios, project_images, memories, chats, user_settings, videos, transcriptions

**Padrão:**
- `userId` presente → Firestore + Storage
- `userId` ausente → IndexedDB local

**Domínios específicos:**
- Chat: fallback IndexedDB se doc >900KB ou erro Firestore
- Transcriptions: apenas IndexedDB (dados temporários por projeto)
- Audio segments: apenas IndexedDB, campo `audioSegments` dentro de `AudioSource`

### COEP para SharedArrayBuffer

Headers `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` necessários para:
- Whisper WASM (transcrição de áudio)
- Remotion (renderização de vídeo)

**Rotas com COEP:** `/app/**` + `/404.html`
**Rotas sem COEP:** `/`, `/login`, `/cadastro` e todas as páginas públicas (Firebase Auth precisa de iframes cross-origin)

### Environment Variables

Arquivo: `src/lib/env.ts`

**7 obrigatórias:**
- `VITE_GEMINI_API_KEY` — API key do Google Gemini
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**2 opcionais:**
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`

Lidas via `import.meta.env` (nunca `process.env`). `readRequiredEnv()` lança se ausente.

### Deploy

- `bun run deploy` — lint + typecheck + build + `firebase deploy --only hosting`
- `bun run deploy:preview` — lint + typecheck + build + `firebase hosting:channel:deploy preview`
- Firebase Hosting com SPA rewrite (`**` → `/index.html`)
- `cleanUrls: true` — URLs sem `.html`
- Cache immutable para assets estáticos (1 ano)
- Headers de segurança: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- 8 redirects 301

---

## 12. Engenharia & Qualidade

### Testes

**Framework:** Vitest 4 + @testing-library/react + jsdom + fake-indexeddb

- **93 arquivos de teste** (maior concentração em video-render: 16, public: 17, speed-paint: 14, assistant: 9, tts: 6, images: 6, app-shell: 7)
- **Comando:** `bun run test` (execução única) / `bun run test:watch` (watch mode)
- **Coverage:** `@vitest/coverage-v8` disponível
- **Fake IndexedDB:** `fake-indexeddb` ^6.2.5 para testes de persistência

### Linting

**ESLint 10** (flat config):
- `eslint.config.js` — configuração principal
- **Plugins especializados:**
  - `eslint-plugin-react` ^7.37.5
  - `eslint-plugin-react-19-upgrade` ^1.7.1 — migração React 19
  - `eslint-plugin-react-hooks` ^7.1.1
  - `eslint-plugin-mui-v9` ^0.1.0 — padrões MUI v9
  - `eslint-plugin-firebase-ai-logic` ^1.10.0 — padrões Firebase AI
  - `eslint-plugin-zod-v4` ^0.3.0 — padrões Zod v4
  - `typescript-eslint` ^8.58.2

**Comando:** `bun run lint` / `bun run lint:fix`

### TypeCheck

**TypeScript 6** — `tsc -b` via `bun run typecheck`

### Logger

Arquivo: `src/lib/logger.ts`

- `createLogger('context')` — factory com contexto pré-fixado
- 4 níveis: `debug`, `info`, `warn`, `error`
- **Produção:** `debug` e `info` suprimidos (só exibe `warn` e `error`)
- **Stack trace** em erros de produção via `console.trace`
- **37 dependentes** no projeto (hotspot de uso)
- Uso: `import { createLogger } from '../../../lib/logger'` — sempre import relativo

### Error Mapping

Arquivo: `src/lib/error-mapping.ts`

- `createErrorMapper(config)` — factory genérico com `ErrorMappingRule[]`
- `sharedErrorRules` — regras comuns (quota, API key, unavailable)
- Cada domínio (áudio, imagem, assistente) configura suas próprias regras
- Mapeia erros técnicos para mensagens amigáveis em pt-BR

### Rate Limiter

Arquivo: `src/lib/rate-limiter.ts`

- `withRetry<T>(fn, config?)` — genérico, reutilizável
- Exponential backoff + jitter
- Detecta `ApiError.status` + keywords em mensagens
- Retry apenas em erros transitórios (429, 500, 503, 504)
- Falha imediata em erros definitivos (400, 403, 404)
- Configuração padrão: 3 tentativas, 1000ms base, 1000ms jitter

### Canvas Font Patch

`canvasFontStretchPatch` — corrige bug `%→keyword` na Canvas API do Remotion. Suporta canvas regular e OffscreenCanvas via `patchPrototype()`.

---

## 13. Pontos Fortes Identificados

### Arquitetura

- **100% client-side** — sem backend, sem custo de servidor de renderização. Toda a geração de áudio, vídeo e imagens acontece no navegador. Isso reduz drasticamente a complexidade operacional e o custo.

- **Dual storage inteligente** — Firestore para usuários autenticados, IndexedDB para anônimos. Migração automática ao criar conta. Offline-first com `persistentLocalCache`.

- **VideoRenderBridge pattern** — store Zustand leve que sincroniza estado entre VideoPage (que importa Remotion pesado) e App.tsx/ActionBar. Evita carregar Remotion globalmente, melhorando o bundle inicial.

- **Zustand stores flat** — 3 stores (studio, animation, videoRenderBridge) sem middleware persist, com sync manual via `subscribe`. Simples, previsível e sem complexidade async.

### Engenharia

- **Resiliência de geração** — retry com exponential backoff + jitter, cancelamento com restauração de estado anterior, fallbacks em múltiplas camadas (LLM → programático, Whisper → segment-timing → proportional).

- **Detecção de silêncio por RMS** — algoritmo de calibração automática (até 3 iterações) que substitui timestamps estimados do Gemini por timestamps reais do áudio. Diferencial técnico significativo.

- **Speed Paint pipeline** — edge detection + BFS + vetorização + renderização progressiva via Web Worker inline. Sistema de 4 zonas no Remotion com `interpolate` e crossfade real entre cenas.

- **Streaming otimizado** — chunks acumulados via `requestAnimationFrame` para flush uma vez por frame de display, reduzindo re-renders durante streaming do assistente.

### UX/UI

- **Design system consistente** — tokens visuais centralizados, superfícies glass, CSS variables, MUI v9 com overrides coesos. Dark mode com identidade visual forte (azul + laranja).

- **SEO nativo do React 19** — sem dependência de react-helmet-async. `DocumentHead` usa hoisting nativo. OG tags, Twitter Cards, canonical, JSON-LD.

- **Lazy loading por rota** — todas as 20+ páginas carregadas via `React.lazy`, reduzindo o bundle inicial.

- **Acessibilidade** — skip-to-content, ARIA labels, semantic HTML, accordion com `id`/`aria-controls`, `aria-current="page"`, landmark roles.

- **PWA completo** — service worker, manifest, cache offline, instalação como app.

### Produto

- **Jornada completa** — do roteiro ao vídeo exportado, tudo em uma plataforma. Editor, TTS, imagens, vídeo, legendas, speed paint, assistente IA, biblioteca.

- **Assistente integrado ao estúdio** — o assistente pode sugerir alterações no estúdio via JSON extraído do chat, aplicadas com um clique. Integração profunda, não superficial.

- **30 vozes TTS** — catálogo diversificado com previews de áudio. Multi-speaker para diálogos.

---

## 14. Áreas de Melhoria Potencial

### Arquitetura

- **App.tsx (511 linhas, hotspot alto)** — concentra roteamento, estado de geração, handlers de download/save, UI state e toasts. Poderia ser dividido em hooks/composables menores.

- **Dupla instância de `useAudioGenerator`** — TODO documentado no código: o hook é instanciado em App.tsx e VideoPage.tsx separadamente, criando estado isolado. Migração para Zustand store é sugerida mas marcada como "alto risco de regressão".

- **Monólito de áreas** — as áreas "public" e "platform" têm 102 arquivos cada (incluindo testes), o que dificulta navegação. Subdivisão em sub-áreas poderia ajudar.

- **Sem CI/CD** — deploy é manual via `bun run deploy`. Não há pipeline automatizado de testes/lint/build/deploy.

### Engenharia

- **Logger é hotspot (37 dependentes, 143 linhas)** — usado em praticamente todo arquivo. Considere lazy import ou barrel mais granular.

- **Tokens é hotspot (69 dependentes, 154 linhas)** — arquivo muito importado. Considere tree-shaking ou dividir em sub-módulos.

- **Sem formatter** — o projeto usa ESLint mas não tem Prettier ou equivalente. Formatação depende de configurações do editor.

- ** Gemini API key exposta no bundle** — `VITE_GEMINI_API_KEY` é acessível no cliente. Aceito pelo contexto (aplicativo privado), mas limita a segurança. Rate limiting por IP é a única proteção.

### Produto

- **Pricing não implementado** — os 3 planos existem na UI mas os limites não são aplicados. Sem integração Stripe ou equivalente.

- **Sem dashboard de uso** — não há como o usuário ver quantas gerações/restrições já usou no mês.

- **Compartilhamento/social** — não há funcionalidade de compartilhar projetos ou vídeos gerados. Export é apenas download local.

- **Undo/redo** — o editor de roteiro não tem histórico de ações.

- **Colaboração** — não há suporte multiusuário ou edição colaborativa em tempo real.

- **Templates** — não há templates de roteiro ou presets de configuração para acelerar o onboarding.

- **Idioma único** — toda a UI está em pt-BR. Não há i18n para outros mercados.

### Performance

- **Whisper model (~39MB)** — download na primeira transcrição pode ser lento. Não há preload ou cache agressivo.

- **Speed Paint Web Worker** — processamento pesado (edge detection + BFS) para imagens grandes pode ser lento mesmo no worker. Não há WebGPU aceleração.

- **Bundle size** — sem code splitting por feature. Remotion (~several MB) é lazy mas todas as páginas do app compartilham o mesmo bundle de vendors.

### Testes

- **93 arquivos de teste** mas sem coverage report automatizado. Qualidade dos testes não é medida sistematicamente.

- **Sem testes E2E** — não há Playwright/Cypress para testar fluxos completos (login → gerar → exportar).

- **Sem testes visuais** — não há screenshot testing para validar UI.

---

## Appendix: Métricas do Projeto

| Métrica | Valor |
|--------|-------|
| Total de arquivos | 260 |
| Pastas | 42 |
| Componentes | 70 |
| Hooks | 11 |
| Páginas | 20 |
| Utilitários | 38 |
| Tipos | 7 |
| Configs | 3 |
| Testes | 93 |
| Stores | 7 |
| Outros | 11 |
| Áreas funcionais | 16 |
| Hotspots | 10 (4 alto, 6 médio) |
| Vozes TTS | 30 |
| Modelos Gemini | 3 (TTS, imagem, lite) |
| Rotas públicas | 12 |
| Rotas protegidas | 7 |
| Redirects | 12 |
| Versão | 0.24.7 |
