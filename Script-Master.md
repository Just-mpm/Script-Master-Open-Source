# Script Master

> Plataforma completa para transformar roteiros em conteúdo multimídia com inteligência artificial: narração profissional, imagens geradas por IA, animação speed paint, montagem de vídeo e um assistente criativo que te ajuda em cada etapa do processo.

**Versão:** 0.119.0 | **Última Atualização:** 01 de junho de 2026

---

## Sobre Este Documento

Este é o **documento de contexto completo** do Script Master. Ele serve como fonte única de verdade para entender:

- **O que é o produto** — Funcionalidades, serviços e proposta de valor
- **Como funciona** — Arquitetura, stack técnica e integrações
- **Para quem é** — Públicos-alvo e casos de uso
- **Como está estruturado** — Rotas, Cloud Functions, coleções e componentes

**Uso recomendado:**

- Consulte este documento quando precisar entender o escopo completo do projeto
- Use para onboarding de novos desenvolvedores ou stakeholders
- Referência para decisões de produto e arquitetura
- Base para documentação externa (landing pages, FAQs, materiais de marketing)

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Serviços](#serviços)
   - [Estúdio de Áudio (TTS)](#1-estúdio-de-áudio-tts)
   - [Geração de Imagens](#2-geração-de-imagens)
   - [Montagem de Vídeo](#3-montagem-de-vídeo)
   - [Speed Paint](#4-speed-paint-animação-de-desenho)
   - [Assistente IA Criativo](#5-assistente-ia-criativo)
   - [Biblioteca de Projetos](#6-biblioteca-de-projetos)
   - [Painel de Configurações](#7-painel-de-configurações)
3. [Planos e Preços](#planos-e-preços)
4. [Públicos-Alvo](#públicos-alvo)
5. [Stack Técnica](#stack-técnica)
6. [Arquitetura](#arquitetura)
7. [Features Implementadas](#features-implementadas)
8. [Segurança e Privacidade](#segurança-e-privacidade)
9. [Estatísticas do Projeto](#estatísticas-do-projeto)
10. [Contato](#contato)

---

## Visão Geral

**Script Master** é uma plataforma criativa que usa inteligência artificial para transformar roteiros em produções multimídia completas. Você escreve um roteiro, escolhe uma voz, define o tom, gera imagens, anima tudo em speed paint e monta um vídeo — tudo num fluxo só, dentro do navegador.

| Campo | Valor |
| --------------------- | ------------------------------------- |
| **Domínio** | script-master.pro |
| **Modelo TTS** | Gemini 3.1 Flash TTS Preview |
| **Modelo Imagens** | Gemini 3.1 Flash Image Preview |
| **Modelo Chat (rápido)** | Gemini 3.1 Flash Lite |
| **Modelo Chat (especialista)** | Gemini 3.5 Flash |
| **Tempo de Geração (áudio)** | 15-60 segundos (dependendo do tamanho) |
| **Vozes disponíveis** | 30 vozes pré-definidas |
| **Idiomas da interface** | Português (BR), Inglês, Espanhol |
| **Renderização de vídeo** | 100% no navegador (WebCodecs) |
| **Proteção de Dados** | 100% LGPD Compliant |
| **Suporte** | studio.kodaai@gmail.com |

### Cores da Marca

- **Azul Principal:** `#2E75B6` (primary)
- **Laranja Secundário:** `#F7941E` (secondary)
- **Fundo:** `#0a0a0f` (dark)
- **Texto:** `#f8fafc` (primary text)

### Missão

Democratizar a produção de conteúdo multimídia, permitindo que qualquer pessoa — de criadores a educadores, de marketers a podcasters — transforme ideias escritas em áudio, imagens e vídeo de qualidade profissional usando inteligência artificial, sem precisar de equipamento caro ou conhecimento técnico.

### Valores

- **Criatividade:** Ferramentas que amplificam a expressão criativa, não a substituem
- **Simplicidade:** Fluxos intuitivos que qualquer pessoa consegue usar
- **Qualidade:** Áudio e vídeo com padrão profissional, direto do navegador
- **Acessibilidade:** Preços justos para criadores brasileiros
- **Privacidade:** Proteção rigorosa dos dados e produções dos usuários

---

## Serviços

### 1. Estúdio de Áudio (TTS)

O coração do Script Master. Você escreve um roteiro, o sistema transforma em áudio narrado com vozes naturais geradas por IA.

#### Como funciona

1. **Escreva o roteiro** no editor (até 50.000 caracteres)
2. **Escolha a voz** entre 30 opções com estilos variados (casual, firme, jovem, tranquila, animada, etc.)
3. **Defina a emoção** — 8 emoções com slider de intensidade (0.1 a 1.0)
4. **Ajuste o ritmo** — 5 níveis (muito lento a muito rápido)
5. **Ative o multi-speaker** (opcional) — 2 vozes simultâneas para diálogos
6. **Sistema chunking automático** — roteiros longos são divididos em partes de até 500 caracteres para melhor qualidade de narração
7. **Pré-visualização de custo** antes de confirmar a geração

#### Vozes Disponíveis (30)

Todas com nomes de estrelas, luas e constelações:

| Estilo | Vozes |
|--------|-------|
| **Casual / Descontraída** | Aoede, Zubenelgenubi |
| **Brilhante / Vibrante** | Zephyr, Autonoe, Sadachbia |
| **Animada / Entusiasmada** | Puck, Fenrir, Laomedeia |
| **Informativa / Clara** | Charon, Rasalgethi, Iapetus, Erinome |
| **Firme / Equilibrada** | Kore, Orus, Alnilam, Schedar |
| **Suave / Tranquila** | Callirrhoe, Umbriel, Algieba, Despina, Achernar |
| **Jovem** | Leda |
| **Madura / Especialista** | Gacrux, Sadaltager |
| **Direta / Acolhedora** | Pulcherrima, Sulafat |
| **Amigável / Gentil** | Achird, Vindemiatrix |
| **Rouca** | Algenib |
| **Aérea** | Enceladus |

#### Emoções Suportadas

| Emoção | Efeito na Voz |
|--------|---------------|
| **Neutra** | Tom padrão, sem modificações |
| **Feliz** | Tom animado e entusiasmado, como compartilhando uma boa notícia |
| **Triste** | Tom melancólico e contemplativo, com pausas reflexivas |
| **Bravo** | Tom firme e irritado, com ênfase em palavras-chave |
| **Calmo** | Tom sereno e reconfortante, ritmo constante |
| **Energético** | Tom vibrante e dinâmico, com variação de entonação |
| **Dramático** | Tom intenso e dramático, com variação de volume e ritmo |
| **Amigável** | Tom caloroso e acolhedor, como conversa entre amigos |

#### Formato de Áudio

- **Codec:** PCM 16-bit (WAV)
- **Taxa:** 24.000 Hz
- **Canais:** Mono
- **Entrega:** WAV inline (até 8MB) ou URL assinada Firebase Storage (24h)

#### Limites

| Item | Limite |
|------|--------|
| Máx caracteres/roteiro | 50.000 |
| Máx caracteres/chamada TTS | 500 |
| Mín caracteres para qualidade | 80 |
| Áudio grande (vai pra Storage) | > 8MB |
| Multi-speaker | 2 vozes simultâneas |

---

### 2. Geração de Imagens

Criação de imagens com IA para ilustrar cenas do roteiro ou usar como arte independente.

#### Geração por IA

- Modelo `gemini-3.1-flash-image-preview`
- 8 proporções (aspect ratios): 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9
- Suporte a **imagem de referência** —上传 uma foto para o Gemini se inspirar
- Prompt em linguagem natural
- **Custo:** 40 créditos (+10 se tiver referência)

#### Mídia Stock (Pexels)

- Busca integrada no banco de imagens Pexels
- Milhões de fotos profissionais disponíveis
- 12 resultados por página, orientação configurável
- Plano free da API Pexels: 200 requisições/hora

#### Biblioteca de Imagens

- Galeria com grid responsivo
- Download individual
- Exclusão com confirmação
- Salvamento automático (dual storage: Firestore se logado, IndexedDB se visitante)

---

### 3. Montagem de Vídeo

Transforme seu roteiro + imagens + áudio em um vídeo completo.

#### Renderização Client-Side

O diferencial: **tudo roda no navegador do usuário** usando a API WebCodecs (via Remotion). Nada de servidores de renderização caros.

**Pipeline:**
1. Áudio master como clock de sincronização
2. Cenas com fade in/out via spring physics (transições suaves)
3. Legendas sincronizadas com o áudio
4. Overlay de waveform opcional
5. Speed paint para animar as imagens (opcional)
6. Exportação direta para MP4 ou WebM

#### Qualidades de Exportação

| Qualidade | 16:9 | 9:16 | 1:1 |
|-----------|------|------|-----|
| **720p** | 1280×720 | 720×1280 | 1280×1280 |
| **1080p** | 1920×1080 | 1080×1920 | 1080×1080 |
| **1440p** | 2560×1440 | 1440×2560 | 2560×2560 |
| **4K** | 3840×2160 | 2160×3840 | 3840×3840 |

#### Codecs Suportados

| Codec | Container | Prioridade |
|-------|-----------|------------|
| H.264 + AAC | MP4 | Máxima (prioridade) |
| VP8 + Opus | WebM | Fallback |
| VP9 + Opus | WebM | Alta eficiência |

#### Sistema de Legendas (3 Fontes)

1. **Segment Timing** (prioridade máxima) — timings reais dos chunks TTS retornados pelo backend, com timing proporcional por sílabas
2. **Whisper Aligned** (prioridade média) — quando há transcrição Whisper com alinhamento fonético
3. **Proporcional** (fallback) — divisão proporcional ao timestamp de cada cena
4. **Manual** — editado pelo usuário no editor de legendas

#### Editor de Legendas

- Editor visual com toolbar completa
- Ajuste de fontSize, padding, borderRadius, opacidade
- Posicionamento: inferior, centro ou superior
- Suporte a **negrito** com markdown (`**texto**`)
- Temporização frame-a-frame

---

### 4. Speed Paint (Animação de Desenho)

Transforme imagens estáticas em animações que **se desenham sozinhas** na tela — como aqueles vídeos de whiteboard que você vê por aí.

#### Como funciona

1. **Edge Detection:** O sistema detecta as bordas da imagem usando algoritmo de luminância
2. **BFS Clustering:** Agrupa pixels de borda conectados em clusters (como se fossem "traços" de desenho)
3. **Ordernação Espacial:** Organiza os traços de cima pra baixo, esquerda pra direita — simulando a ordem natural de desenho
4. **Vetorização:** Converte os traços em curvas com largura dinâmica (simula pressão da caneta)
5. **Reveal:** Segunda fase que "colore" a imagem com pinceladas simulando um marcador grosso
6. **Renderização:** Desenha frame a frame usando canvas 2D com o Remotion

#### Efeitos Visuais

- **Sketch:** O contorno aparece como se fosse desenhado a lápis (traço amarelo no preview)
- **Reveal:** A cor "preenche" a imagem como se um marcador estivesse passando por cima
- **Whiteboard:** Fundo branco que vai sendo "rasgado" pelos traços, revelando a imagem
- **Draw tool animado:** Um lápis ou marcador virtual que segue o último traço na tela

#### Processamento

- **Web Worker inline:** o processamento pesado roda em thread separada (não trava a UI)
- **Cache LRU:** imagens já processadas são cacheadas em memória (hash SHA-256, até 20 entradas)
- **Fallback seguro:** se o navegador não suportar Web Worker, processa na main thread
- **Timeout:** 60 segundos por cena no Worker

#### Timings

| Parâmetro | Valor |
|-----------|-------|
| Hold (imagem completa visível) | 3 segundos |
| Fade in/out | 1 segundo |
| Proporção sketch/reveal | 80% / 20% |
| Sobreposição entre cenas | ~1s (crossfade) |

---

### 5. Assistente IA Criativo

Um assistente inteligente integrado que te ajuda em **todo o processo criativo** — desde a concepção do roteiro até os ajustes finais de produção.

#### O que ele faz

- **Tira dúvidas** sobre o uso da plataforma
- **Sugere melhorias** no roteiro, na escolha de voz, nas emoções
- **Pesquisa na web** em tempo real (Google Search Grounding)
- **Cria planos de tarefas** visíveis (TODO list interativa)
- **Altera configurações do estúdio** com um clique (prévia confirmável)
- **Reescreve trechos** inline no editor de roteiro
- **Lembra de preferências** suas (via sistema de memórias)
- **Faz perguntas** quando precisa de uma decisão sua (modo entrevista)

#### Dois Modos

| Modo | Modelo | Ideal para |
|------|--------|------------|
| **Fast** (padrão) | Gemini 3.1 Flash Lite | Conversas rápidas, sugestões, dúvidas simples |
| **Specialist** | Gemini 3.5 Flash | Análises profundas, críticas detalhadas, planejamento complexo |

#### Sistema de Skills

O assistente tem **habilidades especializadas** que carrega sob demanda. Em vez de sobrecarregar o contexto com tudo de uma vez, ele só ativa uma skill quando você pede algo relacionado. Skills atuais:

- **Guia de Vozes:** Ajuda a escolher a voz ideal para cada tipo de conteúdo
- **Melhores Práticas TTS:** Dicas de como escrever roteiros que soam mais naturais na narração

#### Ferramentas (Tool-First)

O assistente usa **7 ferramentas** especializadas:

| Ferramenta | O que faz |
|-----------|-----------|
| **updatePlan** | Cria/atualiza lista de tarefas visível pra você |
| **webSearch** | Pesquisa na web por dados atuais |
| **getStudioState** | Consulta as configurações atuais do seu estúdio |
| **getUserMemories** | Acessa suas preferências salvas |
| **updateStudio** | Sugere alterações no estúdio (você confirma antes) |
| **interview** | Te faz uma pergunta quando precisa de decisão |
| **respond** | Responde com ações clicáveis e mídia |

#### Chat Persistente

- O assistente **retoma automaticamente** a conversa anterior quando você volta
- Sessão ativa salva no localStorage
- Até **350 mensagens** de histórico (acima disso, compacta automaticamente)
- **Compactação inteligente:** resume o início da conversa e mantém as últimas ~100 mensagens intactas

#### Tour de Boas-Vindas

Na primeira vez que você abre o assistente, ele envia uma mensagem de boas-vindas automática (após 1.5s) explicando como usar. Só aparece uma vez — a preferência fica salva nas suas configurações.

---

### 6. Biblioteca de Projetos

Central de gerenciamento de todos os seus projetos criativos.

#### O que você encontra

- **Projetos:** Cards com nome, preview do roteiro, data de criação
- **Áudios:** Player inline para ouvir, download, exclusão
- **Imagens (Cenas):** Grid com lazy loading, download individual
- **Vídeos:** Player HTML5 com metadados (formato, resolução, duração)
- **Busca:** Filtro por nome do projeto

#### Funcionalidades

- **Renomear projetos** com edição inline
- **"Levar ao Speed Paint":** leva as imagens do projeto direto pro estúdio de animação
- **Exclusão** com confirmação (projetos e itens individuais)
- **Download** individual de áudio, imagem e vídeo
- **Busca textual** nos nomes dos projetos

---

### 7. Painel de Configurações

Personalize completamente seu estúdio com 4 seções de configurações.

#### Seções

1. **Voz** — Grid visual com todas as 30 vozes e preview de áudio
2. **Persona & Direção** — Nome do locutor, ritmo (5 níveis), perfil de áudio, cena, notas de estilo, emoção + intensidade
3. **Cenas & Imagens** — Ativar/desativar geração, densidade (15/30/60/120), proporção, framework visual (general/whiteboard), idioma
4. **Multi-locutor** — Segundo locutor com voz e nome próprios

#### Persistência

- **LocalStorage (sempre):** 17 preferências salvas automaticamente
- **Firestore (se logado):** sincronização com debounce de 2s
- **Reset:** limpa tudo e restaura valores padrão

---

## Planos e Preços

### Beta Aberto (Gratuito)

**R$ 0,00** — Durante o beta aberto, todo mundo tem acesso gratuito com 500 créditos/mês.

| Recurso | Limite Free |
|------------------|---------------------------|
| Créditos mensais | 500/mês |
| Caracteres/roteiro | 5.000 |
| Áudios/mês | 10 |
| Imagens/mês | 10 |
| Vídeos/mês | 3 |
| Projetos | 5 |
| Armazenamento | 500MB |
| Multi-speaker | ❌ |
| Emotional TTS | ❌ |
| Stock Media | ❌ |
| Suporte | Email |

### Plano Pro (Individual)

**R$ 49,90/mês** ou **R$ 499/ano** (economia de ~17%)

| Recurso | Limite Pro |
|------------------|---------------------------|
| Caracteres/roteiro | 50.000 |
| Áudios/mês | 100 |
| Imagens/mês | 100 |
| Vídeos/mês | 30 |
| Projetos | 50 |
| Armazenamento | 10GB |
| Multi-speaker | ✅ |
| Emotional TTS | ✅ |
| Stock Media | ✅ |
| Suporte | Prioritário |

### Plano Business (Profissional)

**R$ 149,90/mês** ou **R$ 1.499/ano** (economia de ~17%)

| Recurso | Limite Business |
|------------------|---------------------------|
| Tudo | **Ilimitado** |
| Suporte | Prioritário + personalizado |

*Nota: Stripe está integrado mas atualmente desconectado durante o beta aberto. Planos pagos serão ativados após o período de beta.*

---

## Públicos-Alvo

### 1. Criadores de Conteúdo Digital

| Benefício | Descrição |
|-------------------|---------------------------------------|
| Áudio profissional | Narração de qualidade sem estúdio |
| Vídeo automatizado | Monte vídeos para YouTube/TikTok/Reels |
| Speed paint | Conteúdo whiteboard estilo "draw my life" |
| Rápido | Roteiro → vídeo em minutos |

### 2. Educadores e Professores

- Criação de videoaulas narradas
- Conteúdo whiteboard para explicações
- Geração de materiais multimídia para alunos
- Legendas sincronizadas para acessibilidade

### 3. Marketers e Profissionais de Mídia

- Produção de conteúdo para redes sociais
- Vídeos explicativos para produtos/serviços
- Áudio profissional para apresentações
- Imagens geradas por IA para campanhas

### 4. Podcaster e Produtores de Áudio

- Geração de narração para episódios
- Múltiplas vozes para diálogos/entrevistas
- Edição de timing e emoção
- Exportação de áudio em WAV

### 5. Roteiristas e Escritores

- Testar como o texto "soa" em voz
- Criar versões em áudio de roteiros
- Visualizar cenas com imagens geradas por IA
- Vídeos de storyboard automáticos

---

## Stack Técnica

### Core Framework

| Tecnologia | Versão | Uso |
| ---------- | --------- | --------------------- |
| Vite | ^8.0.8 | Build tool (Rolldown) |
| React | ^19.2.5 | Biblioteca UI |
| TypeScript | ^6.0.3 | Tipagem estática (strict, zero any) |
| Node.js | >= 24.x | Runtime |

### UI Framework

| Pacote | Versão | Uso |
| ------------ | ------- | -------------- |
| MUI Material | ^9.0.0 | Componentes UI (tema dark) |
| Emotion | ^11.14.x | CSS-in-JS |
| Motion | ^12.38.0 | Animações, swipe, drag |

### Roteamento e Estado

| Pacote | Versão | Uso |
| ------------ | ------- | -------------- |
| react-router-dom | ^7.14.1 | Roteamento SPA (lazy loading) |
| Zustand | ^5.0.12 | Estado global (stores do estúdio, billing, vídeo) |
| React Hook Form | — | Formulários |

### Renderização de Vídeo

| Pacote | Versão | Uso |
| ------------ | ------- | -------------- |
| Remotion | 4.0.448 | Composição de vídeo React |
| @remotion/web-renderer | 4.0.448 | Renderização client-side WebCodecs |
| @remotion/player | 4.0.448 | Preview de vídeo |
| @remotion/whisper-web | 4.0.448 | Transcrição Whisper WASM no navegador |
| @remotion/captions | 4.0.448 | Legendas |
| @remotion/media-utils | 4.0.448 | Utilitários de mídia (waveform) |
| @remotion/transitions | 4.0.448 | Transições entre cenas |

### Backend e Database

| Serviço | Versão | Uso |
| ------------ | ------- | -------------- |
| Firebase | ^12.12.0 | Backend completo |
| Firestore | — | Banco de dados (projetos, configs) |
| Firebase Auth | — | Autenticação (Google + email/senha) |
| Firebase Storage | — | Armazenamento de áudio, imagens, vídeos |
| Cloud Functions v2 | — | Backend serverless com Genkit |
| Genkit | — | Framework de IA (flows, middlewares, tools) |
| IndexedDB | — | Armazenamento local (visitantes/offline) |

### IA e Integrações

| Serviço | Versão | Uso |
| ------------ | ------- | -------------- |
| Google Gemini | 3.1 Flash TTS | Síntese de fala |
| Google Gemini | 3.1 Flash Image | Geração de imagens |
| Google Gemini | 3.1 Flash Lite | Chat rápido, chunking, scene prompts |
| Google Gemini | 3.5 Flash | Chat especialista (modo specialist) |
| Stripe | ^9.3 (JS) | Pagamentos (desconectado durante beta) |
| Pexels API | — | Banco de imagens stock |

### Qualidade de Código

| Ferramenta | Configuração |
| -------------------- | -------------------- |
| ESLint | ^10.2.x (flat config, 6 plugins) |
| TypeScript | Strict mode 100%, zero `any` |
| Vitest | ^4.x.x (143 testes) |
| Prettier | semi, singleQuote, tabWidth 2 |

**Regra crítica:** Zero `any` types em todo o código. SOLID + Clean Code obrigatórios.

---

## Arquitetura

### Cloud Functions (Genkit Flows)

Todas as funções rodam em **Firebase Cloud Functions v2**, região `southamerica-east1`, com App Check obrigatório.

#### Flows de IA (Genkit `onCallGenkit`)

| Flow | Descrição | Modelo |
|-----------------------|-------------------------------------------|-------------------------------|
| **assistant** | Chat principal com streaming, tool loop, entrevista, plano de tarefas | Flash Lite / 3.5 Flash |
| **inlineAssistant** | Reescrita inline de trechos do roteiro (sem streaming) | Flash Lite |
| **audio** | Geração TTS — chunking automático, multi-speaker, 30 vozes | Flash TTS |
| **audioPreflight** | Pré-visualização de custos antes de gerar áudio | — |
| **images** | Geração de imagens com/sem referência | Flash Image |
| **scenePrompts** | Geração de prompts de cena (general/whiteboard) | Flash Lite |
| **chunking** | Divisão de roteiros em chunks otimizados para TTS | Flash Lite |
| **cancelAiRequest** | Cancelamento cooperativo de requisições de IA | — |
| **creditSnapshot** | Snapshot de créditos do usuário | — |
| **feedback** | Envio de feedback com bônus de créditos opcional | — |
| **ping** | Flow de teste (valida auth + App Check + Genkit) | — |

#### Stripe

| Função | Tipo | Descrição |
|--------|------|-----------|
| **stripeApi** | onRequest (Express) | Roteador com 3 handlers: webhook, checkout, portal |

### Frontend (443 arquivos)

#### Rotas

| Rota | Página | Acesso |
|------|--------|--------|
| `/` | LandingPage | Visitante |
| `/funcionalidades` | FuncionalidadesPage | Público |
| `/precos` | PricingPage | Público |
| `/perguntas-frequentes` | FaqPage | Público |
| `/contato` | ContactPage | Público |
| `/sobre` | AboutPage | Público |
| `/termos` | TermsPage | Público |
| `/privacidade` | PrivacyPage | Público |
| `/cookies` | CookiesPage | Público |
| `/login` | LoginPage | Visitante |
| `/cadastro` | RegisterPage | Visitante |
| `/onboarding` | OnboardingPage | Público (sem COEP) |
| `/app/estudio` | StudioPage | Autenticado |
| `/app/video` | VideoPage | Autenticado |
| `/app/imagens` | ImageStudio | Autenticado |
| `/app/pintura-rapida` | SpeedPaintPage | Autenticado |
| `/app/assistente` | AssistantPage | Autenticado |
| `/app/biblioteca` | LibraryPage | Autenticado |
| `/app/configuracoes` | ConfiguracoesPage | Autenticado |
| `/app` | Redirect → `/app/assistente` | — |

#### Componentes por Feature

| Feature | Componentes |
|---------|-------------|
| **Estúdio** | Inspector, ScriptEditor, EmotionSelector, AIModeToggle, InlineAIWidget, StockMediaPicker, VoiceCard |
| **Vídeo** | VideoComposition, SceneSequence, SpeedPaintScene, SubtitleOverlay, WaveformOverlay, VideoExportPanel, CaptionEditorPanel, VideoPreview |
| **Speed Paint** | SpeedPaintPlayer, SpeedPaintComposition, SpeedPaintPlayerControls, SpeedPaintExportPanel, BatchOrchestrator, QueueStaging, ImageUpload, AnimationDurationSelector |
| **Assistente** | AssistantComposer, AssistantMessages, AssistantHeader, AssistantHistoryPanel, AssistantMemoriesPanel, AssistantSettingsPanel, InterviewPanel, PlanWidget, ThinkingShimmer, TwoPhaseStopButton, CodeBlock, ImageLightbox, ScrollToBottomFab, ToolEventCard, SettingsPreviewCard |
| **Billing** | CreditIndicator, CreditBlockedMessage, UpgradeDialog, UsageIndicator, PlanBadge |
| **Biblioteca** | Library (projetos), VideoLibrary, GalleryCard, MetadataPill |
| **Páginas Públicas** | Landing, Funcionalidades, Pricing, FAQ, Contato, Sobre, Termos, Privacidade, Cookies (17 componentes) |

### Armazenamento (Dual Storage)

O sistema opera em **modo dual automático**:

| Situação | Armazenamento |
|----------|---------------|
| **Usuário logado** | Firestore + Firebase Storage (nuvem) |
| **Visitante / Offline** | IndexedDB (navegador) |

**10 Object Stores no IndexedDB:**
- `generations`, `image_generations`, `projects`, `audios`, `project_images`
- `memories`, `chats`, `user_settings`, `videos`, `transcriptions`

**Chats grandes (>900KB)** são salvos automaticamente no IndexedDB em vez do Firestore.

---

## Features Implementadas

### Estúdio de Áudio

| Feature | Descrição |
|-----------------------|----------------------------------------------------------|
| **30 Vozes** | Nomes de estrelas/constelações, cada uma com estilo único |
| **8 Emoções** | Com slider de intensidade (0.1 a 1.0), toggle para neutra |
| **5 Níveis de Ritmo** | Muito lento a muito rápido |
| **Multi-speaker** | 2 vozes simultâneas para diálogos |
| **Chunking Automático** | Divide roteiros >500 chars com IA |
| **Pré-visualização** | Calcula custo e duração antes de gerar |
| **Editor de Roteiro** | Com destaque de sintaxe, timeline de áudio |
| **Teclas de Atalho** | Ctrl+Enter (gerar), Space (play/pause) |
| **Swipe Mobile** | Navegação por gestos no celular |
| **Auto-save** | Preferências salvas a cada 2s no Firestore |

### Geração de Imagens

| Feature | Descrição |
|-----------------------|----------------------------------------------------------|
| **IA Generativa** | Gemini 3.1 Flash Image Preview |
| **8 Aspect Ratios** | De 1:1 a 21:9 |
| **Imagem de Referência** | Inspiração para o modelo |
| **Stock Media** | Integração Pexels com busca |
| **Galeria** | Grid responsivo com lazy loading |
| **Cancelamento** | Cooperativo via Cloud Function |

### Vídeo e Speed Paint

| Feature | Descrição |
|-----------------------|----------------------------------------------------------|
| **Renderização Client-Side** | WebCodecs no navegador, sem servidor |
| **4 Qualidades** | 720p a 4K em 3 proporções |
| **3 Codecs** | H.264+AAC, VP8+Opus, VP9+Opus |
| **Speed Paint** | Edge detection + BFS + stroke animation |
| **Cache LRU** | SHA-256, 20 entradas, eviction automático |
| **3 Fontes de Legenda** | Segment timing, Whisper, proporcional |
| **Editor de Legendas** | Toolbar completa, posição, estilo |
| **Waveform Overlay** | Visualização de áudio no vídeo |
| **Web Worker** | Processamento em thread separada |
| **Spring Physics** | Transições suaves sem overshoot |

### Assistente IA

| Feature | Descrição |
|-----------------------|----------------------------------------------------------|
| **Tool-First** | 7 ferramentas especializadas, contexto otimizado |
| **Streaming** | Respostas em tempo real com batching via rAF |
| **2 Modos** | Fast (Flash Lite) e Specialist (3.5 Flash) |
| **Thinking** | Níveis configuráveis de raciocínio |
| **Entrevista** | Pausa para fazer perguntas e continuar |
| **Plano de Tarefas** | TODO list interativa e visível |
| **Memórias** | Preferências do usuário persistentes |
| **Pesquisa Web** | Google Search Grounding |
| **Skills** | Habilidades carregadas sob demanda |
| **Chat Persistente** | Sessão retomada automaticamente |
| **Compactação** | Histórico longo resumido automaticamente |
| **Tour de Boas-Vindas** | Mensagem automática no primeiro acesso |
| **Inline** | Reescrita de trechos no editor de roteiro |
| **CodeBlock** | Syntax highlight com cópia |
| **ImageLightbox** | Zoom de imagens |

### Billing e Assinaturas

| Feature | Descrição |
|-----------------------|----------------------------------------------------------|
| **3 Planos** | Free, Pro (R$49,90), Business (R$149,90) |
| **Créditos** | Sistema de uso com 500/mês no beta |
| **Stripe Integrado** | Checkout, portal, webhooks (desconectado no beta) |
| **Upgrade Dialog** | Toggle mensal/anual com badge de desconto |
| **Usage Indicator** | Barra de progresso com cor adaptativa |
| **Credit Blocked** | Mensagem quando saldo insuficiente |

### Persistência

| Feature | Descrição |
|-----------------------|----------------------------------------------------------|
| **Dual Storage** | Firestore (logado) / IndexedDB (visitante) |
| **Projetos** | CRUD completo com áudio, imagens, vídeos |
| **Chat Sessions** | Histórico com fallback IndexedDB >900KB |
| **User Settings** | Preferências sincronizadas entre dispositivos |
| **Memórias** | Até 100 registros de preferências do usuário |
| **Imagens** | Galeria com salvamento e exclusão |
| **Vídeos** | Metadados (formato, resolução, duração) |

### SEO e Performance

| Feature | Descrição |
|-----------------------|----------------------------------------------------------|
| **Pre-renderização** | 9 rotas públicas com HTML estático via Puppeteer |
| **SEO Tags** | Open Graph, Twitter Cards, JSON-LD (SoftwareApplication) |
| **Hreflang** | pt-BR, en, es, x-default |
| **i18n** | 3 idiomas, 20+ namespaces |
| **PWA** | Service worker, runtime caching, instalável |
| **COEP** | SharedArrayBuffer para Whisper + Remotion |
| **App Check Lazy** | reCAPTCHA v3 só carrega para usuários logados |
| **Lazy Loading** | Todas as páginas carregadas sob demanda |

### Autenticação

| Feature | Descrição |
|-----------------------|----------------------------------------------------------|
| **Google Login** | Popup OAuth |
| **Email/Senha** | Com verificação obrigatória |
| **Recuperação de Senha** | Via email |
| **Onboarding** | 4 etapas: Welcome → Profile → Goals → Completion |
| **Delete Account** | Pipeline LGPD completo |
| **Verificação de Email** | Polling a cada 5s + focus/visibilitychange |
| **Founder Message** | Mensagem pessoal do criador na conclusão do onboarding |

---

## Segurança e Privacidade

### COEP (Cross-Origin Embedder Policy)

- **Ativado** para rotas `/app/**` — necessário para SharedArrayBuffer
- **Desativado** em rotas públicas e `/login`/`/cadastro` — necessário para Firebase Auth popup
- Em produção via headers no `firebase.json`
- Em desenvolvimento via plugin `coepPlugin()` no Vite

### App Check (reCAPTCHA v3)

- **Inicialização lazy:** só carrega quando o usuário faz login
- Visitantes anônimos não pagam o custo de ~729 KiB / ~720ms
- Fallback para modo debug em desenvolvimento/emuladores
- Todas as Cloud Functions exigem App Check (`enforceAppCheck: true`)

### Autenticação

- **Auth Multi-Provider:** Google + email/senha
- **Verificação de email obrigatória** para login por senha
- **Sessão verificada** antes de liberar rotas protegidas
- **Logout com full reload** (necessário para limpar COEP)
- **Delete account** com exclusão completa de dados (LGPD)

### Privacidade de Dados

- **100% LGPD Compliant**
- Dual storage: visitantes têm dados apenas no navegador
- Dados de usuários logados protegidos por regras Firestore
- Chat storage com fallback IndexedDB para mensagens grandes
- Blob URLs revogadas seletivamente para evitar vazamento de memória
- Logout/delete account fazem cleanup completo de dados

---

## Estatísticas do Projeto

### Código

| Métrica | Valor |
|---------|-------|
| **Total de arquivos** | 443 |
| **Componentes React** | 124 |
| **Páginas** | 22 |
| **Hooks** | 23 |
| **Stores (Zustand)** | 11 |
| **Utilitários** | 48 |
| **Cloud Functions** | 11 flows Genkit + 1 Stripe router |
| **Testes** | 143 |
| **Versão atual** | 0.119.0 |

### Features por Área

| Área | Quantidade |
|------|------------|
| **Estúdio / Áudio** | 10 componentes |
| **Vídeo / Render** | 11 componentes + 4 hooks |
| **Speed Paint** | 8 componentes + 1 hook |
| **Assistente** | 16 componentes |
| **Billing** | 6 componentes + 2 hooks |
| **Biblioteca** | 5 componentes |
| **Páginas Públicas** | 17 componentes |
| **Onboarding** | 8 componentes |

---

## Contato

| Canal | Informação |
|-------|------------|
| **Email** | studio.kodaai@gmail.com |
| **Site** | https://script-master.pro |
| **Criador** | Matheus — Koda AI Studio (Esplanada-BA) |

---

## Avisos Legais

- Script Master é um produto da **Koda AI Studio**
- Conteúdo gerado por IA deve ser revisado antes da publicação
- As vozes TTS são geradas por IA e não representam pessoas reais
- Imagens do Pexels estão sujeitas aos termos de uso da Pexels
- Stripe está integrado mas desconectado durante o período de beta aberto
- Este documento reflete o estado atual do projeto na versão 0.119.0
