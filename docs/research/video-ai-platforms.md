# Pesquisa Competitiva — Plataformas de Vídeo IA

> Pesquisa realizada em abril de 2026. Dados coletados dos sites oficiais e fontes especializadas.

---

## Resumo Executivo

O mercado de vídeo IA valeu **$716,8 milhões em 2025** e projeta **$2,5 bilhões até 2033** (CAGR de 20%). Mais de **124 milhões de pessoas** usam plataformas de vídeo IA mensalmente. Text-to-video domina com 46,3% do mercado, e 63% das empresas já incorporaram IA em seus fluxos de vídeo.

O Script Master compete em um nicho específico dentro desse ecossistema: **roteiro → áudio (TTS) → cenas → vídeo com legendas e crossfade**. Nenhuma das plataformas pesquisadas faz exatamente essa combinação. As mais próximas são InVideo AI e Pictory (roteiro → vídeo), mas nenhuma gera áudio TTS com continuidade de voz, cenas geradas por IA, speed paint e renderização client-side como o Script Master.

---

## 1. Runway (runwayml.com)

**Categoria:** Vídeo generativo AI (text-to-video, image-to-video)  
**Público-alvo:** Criadores profissionais, cineastas, estúdios de produção  
**Foco:** Geração de vídeo de alta qualidade a partir de prompts de texto ou imagens de referência

### Visão Geral

Runway é a plataforma líder mundial em vídeo generativo com IA. Desde 2023, lança modelos cada vez mais sofisticados — do Gen-2 ao Gen-4 — e consolidou-se como a ferramenta de referência para criadores que buscam qualidade cinematográfica em vídeo gerado por IA. A plataforma não edita vídeos tradicionais; ela *gera* novos vídeos a partir de descrições textuais ou imagens de entrada.

### Features de Vídeo

- **Gen-4 (flagship):** Geração de vídeo até 1080p, 16 segundos de duração. Consistência de personagem e objeto entre cenas, multi-ângulos da mesma cena, simulação física realista. 12 créditos/segundo.
- **Gen-3 Alpha Turbo:** Geração mais rápida e barata (5 créditos/segundo), ideal para iterações e testes. Suporta imagem de referência.
- **Text-to-Video:** Usuário escreve um prompt descritivo e o modelo gera um clipe de vídeo correspondente.
- **Image-to-Video:** Usuário fornece uma imagem de referência e o modelo a anima com movimento natural.
- **Expand/Extend:** Estende a duração de um vídeo gerado para além do limite base.
- **Upscale para 4K:** Melhora a resolução de vídeos gerados (2 créditos/segundo).
- **Frame Interpolation:** Interpola frames intermediários para suavizar movimento.
- **Legendas e acessibilidade:** Geração de legendas, remoção de silêncios e melhoria de áudio.
- **Workflows:** Sistema visual baseado em nós que permite encadear modelos, LLMs e ferramentas em pipelines personalizados — essencial para automação avançada.

### UX/UI

Interface dividida em duas áreas principais: **Dashboard** (projetos recentes, ferramentas) e **Editor** (prompt, preview, timeline). O editor apresenta um campo de prompt central, seletor de modelo no canto inferior esquerdo, preview do vídeo gerado à direita e controles de configuração (duração, resolução, estilo). A navegação é intuitiva com sidebar de ferramentas. Workflows usa canvas de nós similar a sistemas como ComfyUI.

### Fluxo de Criação

1. Usuário acessa "Generate Video" no dashboard
2. Seleciona o modelo (Gen-4, Gen-3 Alpha, Turbo)
3. Escreve um prompt textual detalhado (ou carrega imagem de referência)
4. Configura duração (5-16 segundos), resolução e estilo
5. Gera o vídeo (fila de processamento — prioridade nos plans pagos)
6. Preview, itera no prompt ou estende o vídeo
7. Exporta o clipe final

**Ponto-chave:** Runway gera *clipes curtos* (5-16 segundos), não vídeos completos. O usuário precisa montar o vídeo final em um editor externo.

### Export e Formatos

- **Resolução:** 720p (free), 1080p (Standard+), 4K (Pro+)
- **Formato:** MP4 (H.264)
- **Duração máxima por clipe:** 16 segundos (Gen-4)
- **Extensão:** É possível estender clipes para criar sequências maiores
- **Sem marca d'água:** Standard+ (removida)

### Pricing

| Plano | Preço Mensal | Créditos/Mês | Resolução Máx. |
|-------|-------------|--------------|----------------|
| Free | $0 | 125 | 720p (com watermark) |
| Standard | $12-15 | 625 | 1080p |
| Pro | $28-35 | 2.250 | 4K |
| Unlimited | $76-95 | Ilimitado (Explore Mode) | 4K |
| Enterprise | Custom | Custom | 4K |

**Sistema de créditos:** Cada ação consome créditos. Gen-4: 12 créditos/segundo. Gen-3 Turbo: 5 créditos/segundo. Upscale 4K: 2 créditos/segundo. Um clipe Gen-4 de 10 segundos custa ~120 créditos.

---

## 2. Pika (pika.art)

**Categoria:** Vídeo generativo AI com controle de cena  
**Público-alvo:** Criadores de conteúdo social, social media, YouTubers  
**Foco:** Geração de vídeos curtos com efeitos visuais avançados e controle de cena

### Visão Geral

Pika Labs emergiu como uma das principais alternativas ao Runway, com foco em vídeos curtos, estilizados e efeitos especiais (Pikaffects). A plataforma se destaca pela facilidade de uso e por recursos como "Pikadditions" (adicionar elementos a um vídeo existente), "Pikaswaps" (trocar objetos em cena) e "Pikaframes" (controle de keyframes para transições). É popular entre criadores de TikTok e Instagram Reels.

### Features de Vídeo

- **Pika 2.5 (atual):** Geração text-to-video e image-to-video em 480p, 720p e 1080p. Duração de 5 a 10 segundos.
- **Pikascenes:** Geração de cenas com controle mais granular sobre a composição visual.
- **Pikaffects:** Efeitos especiais aplicáveis a vídeos — explode, melt, crush, inflate, cake-ify, e dezenas de outros. Diferencial competitivo forte.
- **Pikadditions:** Adiciona elementos (objetos, personagens) a vídeos existentes mantendo consistência visual.
- **Pikaswaps:** Troca objetos ou pessoas em um vídeo por outro conteúdo.
- **Pikatwists:** Transforma o estilo visual de um vídeo (anime, watercolor, pixel art, etc.).
- **Pikaframes:** Controle de keyframes para definir pontos de transição específicos no vídeo gerado (introduzido no Pika 2.2).
- **Lip-sync:** Sincronização labial básica disponível.
- **API:** Disponível para desenvolvedores via plataformas como fal.ai.

### UX/UI

Interface minimalista e direta. Tela central com campo de prompt, upload de imagem de referência, seletor de modelo, configurações de duração e resolução, e galeria de resultados. Barra lateral com Pikaffects (visual em cards clicáveis). Design voltado para rapidez — ideal para criadores que precisam gerar muitos clips por sessão.

### Fluxo de Criação

1. Acessa pika.art (web, sem download)
2. Escreve prompt ou carrega imagem
3. Seleciona duração (5s ou 10s) e resolução
4. Aplica Pikaffects se desejar
5. Gera e visualiza resultados (vários por prompt)
6. Itera ou exporta

**Diferencial:** O foco em efeitos visuais (Pikaffects) permite criar conteúdo viral e memorável sem habilidades de edição. Não é uma ferramenta de "roteiro → vídeo" — é mais "prompt → clip criativo".

### Export e Formatos

- **Resolução:** 480p (free), 720p, 1080p (paid)
- **Formato:** MP4
- **Duração máxima:** 10 segundos por clipe
- **Aspect ratios:** 16:9, 9:16, 1:1, 4:5, 5:4, 3:2, 2:3
- **Sem marca d'água:** Standard+ (removida)

### Pricing

| Plano | Preço Mensal | Créditos/Mês | Resolução Máx. |
|-------|-------------|--------------|----------------|
| Basic (Free) | $0 | Limitado | 480p |
| Standard | $10 | 80 | 720p/1080p |
| Pro | $35 | 700 | 1080p |
| Fancy | $95 | 2.300 | 1080p |

Créditos não acumulam mês a mês. Compra extra de créditos disponível nos plans pagos (esses acumulam).

---

## 3. HeyGen (heygen.com)

**Categoria:** Vídeos com avatares AI  
**Público-alvo:** Marketing, educação corporativa, vendas, criadores UGC  
**Foco:** Avatares realistas que falam roteiros em múltiplos idiomas

### Visão Geral

HeyGen é a plataforma líder em vídeos com avatares gerados por IA. Permite criar vídeos profissionais com apresentadores virtuais realistas que falam qualquer roteiro, em mais de 175 idiomas e dialetos. É a ferramenta de escolha para empresas que precisam de vídeos de apresentação, treinamento, vendas e marketing sem gravar com pessoas reais. Em 2025, introduziu Avatar IV (avatares com gesticulação natural), VEO3 (geração de cena B-roll) e tradução com lip-sync.

### Features de Vídeo

- **Avatares AI:** Biblioteca com 700+ avatares stock + 1 avatar personalizado por usuário (custom avatar a partir de vídeo ou foto).
- **Avatar IV:** Avatares de nova geração com gesticulação natural e expressões mais realistas.
- **VEO3:** Geração de B-roll e cenas complementares por IA integrada ao vídeo do avatar.
- **Voice Cloning:** Clonagem de voz a partir de amostra de áudio para avatares personalizados.
- **Multi-language:** Suporte a 175+ idiomas e dialetos com tradução automática e lip-sync.
- **Video Translation:** Traduz vídeos existentes mantendo a voz e sincronização labial do apresentador original.
- **Dubbing:** Legendagem e dublagem em múltiplos idiomas.
- **Generate Looks:** Personalização de aparência do avatar (roupa, cenário).
- **Brand Kit:** Cores, fontes e logos padronizados.
- **Templates:** Centenas de templates para diferentes formatos (YouTube, LinkedIn, TikTok).
- **Streaming Avatar:** Avatar AI para interação em tempo real (chatbots, eventos).

### UX/UI

Interface em três etapas principais: **Template/Avatar** → **Script** → **Export**. Painel esquerdo com avatares e templates, área central com preview do vídeo, painel direito com editor de roteiro e configurações. Design orientado a fluxo linear — ideal para usuários sem experiência em edição de vídeo. Integração com Chrome Extension para gravação de tela com avatar.

### Fluxo de Criação

1. Escolhe avatar (stock ou personalizado) ou template
2. Escreve o roteiro (ou cola texto, ou usa IA para gerar)
3. Seleciona idioma, voz e velocidade
4. Personaliza cenário, roupas e brand elements
5. Gera o vídeo (processamento em cloud)
6. Preview, ajusta e exporta

**Diferencial:** Fluxo extremamente simples — roteiro + avatar = vídeo. Nenhuma edição manual necessária. Ideal para produção em escala.

### Export e Formatos

- **Resolução:** 720p (Free), 1080p (Creator+), 4K (Business)
- **Formato:** MP4
- **Duração máxima:** 1-3 min (Free), ilimitado até 30 min (Creator+)
- **Sem marca d'água:** Creator+ (removida)
- **Licença comercial:** Inclusa nos plans pagos

### Pricing

| Plano | Preço Mensal | Vídeos/Mês | Resolução |
|-------|-------------|-----------|-----------|
| Free | $0 | 3 | 720p (watermark) |
| Creator | $24-29 | Ilimitado | 1080p |
| Pro | $79-99 | Ilimitado | 1080p |
| Business | $30-39/seat | Ilimitado | 4K |

**Nota:** O sistema de créditos premium (para Avatar IV, VEO3) é separado — 200 créditos/mês no Creator.

---

## 4. Synthesia (synthesia.io)

**Categoria:** Vídeos com avatares AI corporativos  
**Público-alvo:** Enterprise, RH, L&D (Learning & Development), treinamento corporativo  
**Foco:** Vídeos de treinamento e comunicação interna com avatares profissionais

### Visão Geral

Synthesia é a plataforma pioneira e mais consolidada em vídeos com avatares para uso corporativo. Fundada em 2017, foi a primeira a popularizar o conceito de "vídeo a partir de texto com avatar". Em 2025, lançou 127 novos features incluindo avatares Express 2 (com gestos profissionais), vídeo interativo com branching, AI dubbing em 130+ idiomas, integração com Sora 2 e Veo 3.1 para B-roll, e SCORM export para LMS. É usada por 50.000+ equipes.

### Features de Vídeo

- **Avatares Express 2:** Avatares com gesticulação natural, similar a apresentadores profissionais.
- **180+ Avatares stock** com aparências diversas (idades, etnias, estilos).
- **Personal Avatars:** Até 5 avatares personalizados por cena (Creator plan). Studio Avatars customizados ($1.000/ano adicionais).
- **AI Video Assistant:** Assistente IA que ajuda a escrever e refinar o roteiro.
- **AI Dubbing:** Tradução de vídeos existentes para 130+ idiomas com preservação de voz.
- **Interactive Video:** Vídeos com branching, CTAs, quizzes — ideal para treinamento interativo.
- **SCORM Export:** Compatível com plataformas LMS (Corporate LMS).
- **Multicam Avatars:** Troca de ângulo de câmera durante o vídeo.
- **Dynamic Captions:** Legendas com efeitos animados (pop, shake, blink).
- **AI Playground:** Acesso a Sora 2, Veo 3.1, FLUX 2 e outros modelos para gerar assets.
- **Spaces:** Organização de vídeos por equipe/projeto.
- **Storyboard:** Planejamento visual antes da produção.
- **Express Voice:** Vozes de alta qualidade com controles avançados.

### UX/UI

Interface corporativa e limpa, otimizada para equipes. Tela principal com editor de script à esquerda, preview do avatar à direita, e barra de ferramentas superior. Fluxo em etapas: **Escolher Avatar → Escrever Script → Estilizar → Gerar → Exportar**. Painel de brand control para empresas com múltiplos templates. Dashboard com métricas de uso e gestão de equipe.

### Fluxo de Criação

1. Escolhe template ou começa do zero
2. Seleciona avatar(s) e personaliza (cenário, roupa, acessórios)
3. Escreve ou cola o roteiro (AI Video Assistant pode ajudar)
4. Ajusta vozes, velocidade, entonação
5. Adiciona elementos interativos (CTAs, branching, quizzes) se desejar
6. Gera e preview
7. Exporta (incluindo SCORM para LMS)

**Diferencial:** Foco total em uso corporativo — SCORM, branching, multi-avatar, gestão de equipe, segurança enterprise (SAML/SSO). Nenhuma outra plataforma oferece esse nível de features para L&D.

### Export e Formatos

- **Resolução:** 720p (Free), 1080p (Starter+)
- **Formato:** MP4 + SCORM (Enterprise)
- **Duração máxima:** 10 min/mês (Basic/Starter), 30 min/mês (Creator), ilimitado (Enterprise)
- **Sem marca d'água:** Starter+ (removida)
- **Branded video pages:** Disponível no Creator+

### Pricing

| Plano | Preço Mensal | Minutos/Mês | Créditos/Mês |
|-------|-------------|-------------|-------------|
| Basic (Free) | $0 | 10 min | 1.200 |
| Starter | $18-29 | 10 min | 1.200-14.500 |
| Creator | $89 | 30 min | 14.500+ |
| Enterprise | Custom | Ilimitado | Custom |

**Nota:** Créditos são moeda compartilhada para todas as features baseadas em IA (vídeo, dubbing, etc.).

---

## 5. InVideo AI (invideo.io)

**Categoria:** Vídeo a partir de texto/prompt com IA  
**Público-alvo:** Criadores de conteúdo, YouTubers, marketers, small businesses  
**Foco:** Transformar prompts de texto em vídeos completos com roteiro, narração, cenas e legendas

### Visão Geral

InVideo AI é a plataforma mais próxima do conceito do Script Master. O usuário descreve o que quer em linguagem natural ("crie um vídeo de 1 minuto sobre inteligência artificial para TikTok") e a IA gera um vídeo completo: escreve o roteiro, seleciona/gera cenas visuais, adiciona narração (TTS), legendas, música de fundo e transições. Em 2025, integrou Sora 2 (OpenAI) e Veo 3.1 (Google) para geração de cenas, oferecendo acesso a ambos a partir de $25/mês — valor significativamente menor que usar os modelos diretamente.

### Features de Vídeo

- **AI Co-Pilot:** Usuário descreve o vídeo desejado em texto e a IA gera tudo: roteiro, cenas, narração, legendas, música.
- **Sora 2 + Veo 3.1:** Integração dos modelos mais avançados de geração de vídeo (antes restritos a $200+/mês cada).
- **Geração de roteiro:** IA escreve scripts otimizados para o formato escolhido (YouTube, TikTok, Reels, etc.).
- **TTS com voice cloning:** Narração em múltiplos idiomas com vozes realistas. Clonagem de voz disponível no Plus.
- **Legendas automáticas:** Subtitles gerados e sincronizados automaticamente com a narração.
- **8M+ iStock:** Biblioteca massiva de mídia stock (imagens e vídeos).
- **Templates:** 5.000+ templates para diferentes formatos e nichos.
- **Brand Presets:** Kits de marca com logos, cores e fontes.
- **Social Media Calendar:** Planejamento e agendamento de publicações.
- **Voice Clones:** Até 5 clones de voz (Max plan).
- **Export 4K:** Disponível no Max plan.

### UX/UI

Interface chat-first: o usuário interage com a IA via prompt textual (similar ao ChatGPT). A IA retorna um vídeo completo que pode ser editado em um editor baseado em timeline. Painel de assets (mídia stock, música) à esquerda, timeline na parte inferior, preview central. Design simples e acessível para não-criadores. O fluxo é: *prompt → vídeo → ajustes → export*.

### Fluxo de Criação

1. Usuário descreve o vídeo desejado (prompt em linguagem natural)
2. IA gera roteiro completo
3. IA seleciona/gera cenas visuais compatíveis com cada trecho do roteiro
4. IA adiciona narração TTS, legendas, música e transições
5. Usuário preview o resultado e pode editar (trocar cenas, ajustar texto, refinar)
6. Exporta o vídeo final

**Diferencial:** É a plataforma que mais se aproxima do fluxo "roteiro → vídeo completo" de forma automatizada. Porém, não permite controle granular sobre a voz TTS, não tem crossfade entre cenas e a renderização é server-side.

### Export e Formatos

- **Resolução:** 720p (Free), 1080p (Plus), 4K (Max)
- **Formato:** MP4
- **Duração máxima:** 10 min (Free), 15 min (Plus/Max)
- **Sem marca d'água:** Plus+ (removida)
- **Aspect ratios:** 16:9, 9:16, 1:1, 4:5

### Pricing

| Plano | Preço Mensal | Minutos IA/Semana | Resolução |
|-------|-------------|-------------------|-----------|
| Free | $0 | 10 min | 720p (watermark) |
| Plus | $25-28 | 50 min | 1080p |
| Max | $48-60 | 200 min | 4K |
| Generative | $96 | 15 min (generativos) | 4K |

**Nota:** Limites são semanais, não mensais. Minutos não acumulam entre semanas.

---

## 6. Descript (descript.com)

**Categoria:** Editor de vídeo com IA (text-based editing)  
**Público-alvo:** Podcasters, YouTubers, criadores de conteúdo, equipes de comunicação  
**Foco:** Editar vídeo editando texto — transcrição automática e edição por documento

### Visão Geral

Descript revolucionou a edição de vídeo ao introduzir o conceito de "editar vídeo editando texto". A plataforma transcreve automaticamente o vídeo, exibe a transcrição como documento editável, e qualquer alteração no texto (deletar palavras, reorganizar frases) se reflete no vídeo. Em setembro de 2025, reformulou o pricing para um sistema de "media minutes" + "AI credits", e introduziu o "Underlord" — um co-editor IA que automatiza tarefas complexas.

### Features de Vídeo

- **Text-Based Editing:** Edição de vídeo via transcrição textual — deletar palavras no texto remove os trechos correspondentes do vídeo.
- **Underlord (AI Co-Editor):** IA que automatiza remoção de silêncios, melhora de áudio, adição de legendas, e sugestões de cortes.
- **Studio Sound:** Melhoria de qualidade de áudio com IA (remoção de ruído, equalização).
- **Filler Word Removal:** Remove automaticamente "um", "ah", repetições e hesitações.
- **AI Eye Contact:** Corrige contato visual — faz o apresentador parecer olhar diretamente para a câmera.
- **AI Green Screen:** Remove/altera o fundo sem necessidade de green screen real.
- **Overdub:** Gera nova fala a partir de texto usando a voz clonada do apresentador (corrige erros sem regravar).
- **Screen Recording:** Gravação de tela integrada com webcam.
- **AI Dubbing:** Tradução e dublagem em 30+ idiomas.
- **Auto-Captions:** Legendas automáticas com estilos customizáveis.
- **Collaboration:** Edição em tempo real com múltiplos usuários.
- **Export para Adobe:** Exporta projetos para Premiere Pro e Final Cut Pro.

### UX/UI

Interface híbrida: metade superior é o preview do vídeo, metade inferior é a transcrição editável (estilo documento de texto). Sidebar com ferramentas (Underlord, templates, media library). Timeline tradicional disponível como alternativa. Design limpo e intuitivo, focado em produtividade. Painel de AI tools à direita com one-click actions.

### Fluxo de Criação

1. Importa ou grava vídeo/áudio
2. Descript transcreve automaticamente
3. Edita o vídeo editando o texto (deleta palavras, reorganiza trechos)
4. Usa Underlord para automatizar melhorias (remover silêncios, melhorar áudio, legendas)
5. Preview, ajusta e exporta

**Diferencial:** Descript não *gera* vídeo — ele *edita* vídeo existente. É um editor poderosíssimo, mas não transforma roteiro em vídeo do zero. O fluxo é: *gravar → transcrever → editar como texto → exportar*.

### Export e Formatos

- **Resolução:** 720p (Free), 1080p (Hobbyist), 4K (Creator+)
- **Formato:** MP4, WAV, SRT, MP3, exportação para Adobe Premiere/Final Cut
- **Sem marca d'água:** Hobbyist+ (removida)
- **Cloud Storage:** 5 GB (Free) a 2 TB (Business)

### Pricing

| Plano | Preço Mensal | Media Hours/Mês | AI Credits/Mês |
|-------|-------------|-----------------|---------------|
| Free | $0 | 1 hora | 100 (one-time) |
| Hobbyist | $16-24 | 10 horas | 400 |
| Creator | $24-35 | 30 horas (+5 bonus) | 800 (+500 bonus) |
| Business | $50-65 | 40 horas (+10 bonus) | 1.500 (+1.000 bonus) |

**Nota (set/2025):** Sistema reformulado. Media minutes = upload/record. AI credits = uso de features IA. Nenhum acumula mês a mês.

---

## 7. Kapwing (kapwing.com)

**Categoria:** Editor de vídeo online com IA  
**Público-alvo:** Criadores de conteúdo, equipes de marketing, social media managers  
**Foco:** Edição de vídeo no browser com ferramentas IA integradas

### Visão Geral

Kapwing é um editor de vídeo online completo que funciona inteiramente no browser, sem necessidade de download. Em dezembro de 2025, consolidou suas features de IA em um sistema unificado de créditos. É popular entre equipes que precisam colaborar em tempo real e por criadores que valorizam a acessibilidade (funciona em qualquer dispositivo). Oferece mais de 20 ferramentas dedicadas (subtítulos, TTS, resize, dubbing, etc.).

### Features de Vídeo

- **Online Video Editor:** Editor completo com timeline, multi-track, drag-and-drop.
- **Auto-Subtitles:** Legendas automáticas em múltiplos idiomas (até 1.000 min/mês no Pro).
- **Smart Cut:** Remove silêncios e seleciona os melhores momentos automaticamente.
- **Background Removal:** Remoção de fundo com IA em um clique.
- **AI Assistant:** Assistente IA para gerar vídeos, imagens e áudio a partir de prompts.
- **Repurpose Studio:** Transforma um vídeo longo em múltiplos clips otimizados para diferentes plataformas.
- **Text to Speech:** Vozes realistas em múltiplos idiomas (até 50 min/mês no Pro).
- **Dubbing:** Tradução de áudio para 40+ idiomas com lip-sync (até 50 min/mês no Pro).
- **Clean Audio:** Melhoria de qualidade de áudio e remoção de ruído (até 500 min/mês no Pro).
- **Lip Sync:** Sincronização labial para vídeos traduzidos (até 30 min/mês no Pro).
- **Speaker Focus:** Redimensiona automaticamente para focar no falante.
- **Trim with Transcript:** Edição de vídeo via transcrição textual.
- **Brand Kit:** Cores, fontes e logos padronizados para equipes.
- **Collaborative Workspace:** Edição em tempo real com múltiplos membros.
- **Smart Resize:** Redimensiona vídeo para diferentes plataformas (TikTok, YouTube, Instagram).

### UX/UI

Interface de editor tradicional adaptada para browser: timeline na parte inferior, preview central, painel de assets e ferramentas à esquerda, painel de propriedades à direita. Ícone de lâmpada (AI Assistant) no topo para acesso rápido a ferramentas IA. Design clean e responsivo. Toolbar contextual com one-click actions para remoção de fundo, estabilização, limpeza de áudio.

### Fluxo de Criação

1. Upload de vídeo ou URL, ou gravação direta
2. Edição na timeline (cortes, transições, efeitos)
3. Aplica ferramentas IA (legendas, clean audio, background removal)
4. Usa AI Assistant para gerar assets ou B-roll
5. Preview e ajustes finais
6. Exporta

**Diferencial:** Kapwing é um *editor* completo, não um gerador. Não transforma roteiro em vídeo do zero. O foco é editar vídeos existentes com assistência IA. A colaboração em tempo real e o fato de funcionar no browser são seus maiores diferenciais.

### Export e Formatos

- **Resolução:** 720p (Free), 4K (Pro+)
- **Formato:** MP4, GIF, SRT
- **Duração máxima:** 1 min/vídeo (Free), 2 horas (Pro+)
- **Sem marca d'água:** Pro+ (removida)
- **Upload:** até 6 GB (Pro)

### Pricing

| Plano | Preço Mensal | AI Credits/Mês | Resolução |
|-------|-------------|---------------|-----------|
| Free | $0 | 10 (lifetime) | 720p (watermark) |
| Pro | $16-24 | 1.000 | 4K |
| Business | $50+ | 4.000 | 4K |

**Nota (dez/2025):** Créditos unificados. Quando acabam, features IA ficam indisponíveis até o próximo ciclo.

---

## 8. Lumen5 (lumen5.com)

**Categoria:** Transformar texto em vídeo (blog/article to video)  
**Público-alvo:** Marketers de conteúdo, equipes de social media, small businesses  
**Foco:** Converter artigos de blog, newsletters e relatórios em vídeos curtos para redes sociais

### Visão Geral

Lumen5 é a ferramenta mais madura e especializada em transformar conteúdo textual existente em vídeos. O fluxo principal é: colar URL de um artigo ou texto, e a IA analisa o conteúdo com NLP, sumariza pontos-chave, seleciona imagens/vídeos relevantes, adiciona narração e música, e monta um vídeo pronto. É a escolha número um para equipes de marketing que precisam republicar conteúdo de blog em formato de vídeo. Em 2025, introduziu "Chat to Video" e "AI Recommendations".

### Features de Vídeo

- **Blog to Video:** Cola uma URL de artigo e a IA gera um vídeo completo.
- **Chat to Video:** Conversa com a IA para descrever o vídeo desejado (nova feature).
- **AI Recommendations:** IA revisa e sugere melhorias no vídeo antes da exportação.
- **NLP Scene Selection:** A IA analisa o texto e divide automaticamente em cenas com visuais relevantes.
- **AI Voiceover:** Narração automática com vozes em múltiplos idiomas.
- **Stock Media:** 50M+ (Starter) a 500M+ (Professional) de fotos e vídeos stock.
- **Brand Kits:** Até 3 kits (Professional) com fontes, cores e logos customizados.
- **Templates:** Templates populares para diferentes formatos e nichos.
- **Custom Fonts/Colors:** Personalização visual completa.
- **Instant Videos:** Vídeos gerados em um clique a partir de templates (até 10/mês no Professional).
- **Real-Time Waveform:** Visualização de waveform de áudio em tempo real.
- **Multi-Workspace:** Organização de projetos por equipe/projeto.
- **Export em MP4:** Vídeos exportáveis em múltiplos aspect ratios.

### UX/UI

Interface orientada a cenas: painel de cenas à esquerda (timeline vertical), preview central, painel de mídia e configurações à direita. Fluxo simplificado em 4 passos visuais. Design minimalista e acessível — sem curva de aprendizado. Para usuários avançados, oferece controle granular sobre cada cena (trocar mídia, ajustar texto, personalizar timing).

### Fluxo de Criação

1. Importa conteúdo (cola URL de artigo, texto ou usa Chat to Video)
2. IA analisa, divide em cenas e seleciona mídia relevante
3. Personaliza cada cena (troca imagens, ajusta texto, escolhe música)
4. AI Recommendations sugere melhorias
5. Preview e exporta

**Diferencial:** É a melhor ferramenta para repurposing de conteúdo textual existente. Não é ideal para roteiros originais ou vídeos longos. O foco é claramente em conteúdo de marketing para redes sociais.

### Export e Formatos

- **Resolução:** 720p (Free/Basic), 1080p (Starter+)
- **Formato:** MP4
- **Aspect ratios:** Landscape (16:9), Square (1:1), Vertical (9:16)
- **Sem marca d'água:** Basic+ (removida)
- **Vídeos ilimitados:** Todos os plans

### Pricing

| Plano | Preço Mensal | Stock Media | Brand Kits |
|-------|-------------|-------------|------------|
| Community (Free) | $0 | Limitado | Não |
| Basic | $19-25 | Standard | Não |
| Starter | $59-79 | 50M+ | 1 |
| Professional | $149-199 | 500M+ | 3 |
| Enterprise | Custom | Ilimitado | Custom |

---

## 9. Veed.io (veed.io)

**Categoria:** Editor de vídeo online com IA  
**Público-alvo:** Criadores de conteúdo, educadores, marketers, small businesses  
**Foco:** Editor de vídeo no browser com suite completa de ferramentas IA

### Visão Geral

Veed.io é um editor de vídeo online que compete diretamente com Kapwing, mas com maior ênfase em ferramentas IA integradas e avatares. Funciona inteiramente no browser, sem instalação. Oferece um editor de timeline completo combinado com auto-subtitles, Magic Cut (edição automática), TTS, avatares AI, screen recording e limpeza de áudio. É popular entre YouTubers e criadores de conteúdo educacional.

### Features de Vídeo

- **Online Video Editor:** Editor completo com timeline multi-track, drag-and-drop, no browser.
- **Magic Cut:** IA que automaticamente remove silêncios, hesitações e seleciona os melhores momentos.
- **Auto Subtitles:** Legendas automáticas em 100+ idiomas com estilos customizáveis.
- **AI Avatars:** Avatares que falam roteiros (mais limitados que HeyGen/Synthesia).
- **Text to Speech:** Vozes realistas em múltiplos idiomas.
- **AI Eye Contact:** Correção de contato visual.
- **Background Removal:** Remoção de fundo com IA.
- **Screen + Webcam Recording:** Gravação integrada.
- **Audio Cleaner:** Remoção de ruído e melhoria de áudio.
- **AI Image Generator:** Geração de imagens a partir de prompts.
- **Chroma Key:** Editor de green screen.
- **Video Background Remover:** Remoção de fundo de vídeo.
- **Collaboration:** Workspaces compartilhados para equipes.
- **Translation:** Tradução de legendas e áudio para múltiplos idiomas.
- **Gen-AI Studio:** Geração de vídeos curtos com IA (5 vídeos/dia no Lite).

### UX/UI

Interface de editor tradicional no browser: timeline na parte inferior, preview central, toolbar superior com todas as ferramentas, painel de mídia à esquerda. Design limpo e beginner-friendly com tooltips e guias visuais. Organização por abas (Elements, Text, Audio, Effects). Drag-and-drop universal.

### Fluxo de Criação

1. Upload de vídeo, gravação, ou geração via prompt (Gen-AI Studio)
2. Edição na timeline (cortes, efeitos, transições)
3. Adiciona legendas automáticas, narrazão TTS ou avatar
4. Aplica Magic Cut e outras ferramentas IA
5. Preview e exporta

**Diferencial:** Combina edição tradicional com ferramentas IA em uma interface acessível. Porém, como Kapwing, é um *editor*, não um gerador. Não transforma roteiro em vídeo completo automaticamente.

### Export e Formatos

- **Resolução:** 720p (Free), 1080p (Lite+)
- **Formato:** MP4, MOV, WMV, MKV, AVI, GIF, SRT
- **Duração máxima:** 10 min (Free), 2 horas (Pro)
- **Sem marca d'água:** Lite+ (removida)
- **Storage:** 2 GB (Free) a ilimitado (Business)

### Pricing

| Plano | Preço Mensal | Legendas/Mês | Resolução |
|-------|-------------|-------------|-----------|
| Free | $0 | Limitado | 720p (watermark) |
| Basic | $12-18 | 5 horas | 1080p |
| Lite | $19-24 | 12 horas | 1080p |
| Pro | $30-55 | Ilimitado | 1080p |
| Business | $59 | Ilimitado | 1080p |

---

## 10. Pictory (pictory.ai)

**Categoria:** Vídeo a partir de texto/roteiros longos  
**Público-alvo:** Marketers de conteúdo, YouTubers, blogueiros, small businesses  
**Foco:** Transformar roteiros, artigos e URLs em vídeos completos com cenas, narração e legendas

### Visão Geral

Pictory é a plataforma mais diretamente comparável ao Script Master no que diz respeito ao fluxo "roteiro → vídeo". Aceita roteiros de texto, URLs de artigos, e até arquivos de PowerPoint como entrada, e gera vídeos completos com cenas visuais (a partir de biblioteca stock ou IA), narração TTS, legendas e transições. Também oferece "Edit Video Using Text" (editar vídeo editando a transcrição) e "Create Video Highlights" (extrair highlights de vídeos longos). É especialmente forte para roteiros longos e conteúdo educacional.

### Features de Vídeo

- **Script to Video:** Cola um roteiro de texto e a IA gera um vídeo completo com cenas, narração e legendas. Suporta roteiros de até 30 minutos.
- **Blog/URL to Video:** Cola uma URL e a IA extrai conteúdo, divide em cenas e monta o vídeo.
- **Edit Video Using Text:** Edição de vídeo via transcrição (similar ao Descript, mas mais simples).
- **Video Highlights:** IA extrai os melhores momentos de vídeos longos para criar clips curtos.
- **Auto Captions:** Legendas automáticas com export em SRT, VTT e TXT.
- **B-Roll Automático:** A IA seleciona vídeos e imagens relevantes do Storyblocks (2M+ assets) para cada cena.
- **AI Voiceover:** Vozes realistas em 7-29 idiomas (dependendo do plano). Integração com ElevenLabs no Professional.
- **PowerPoint to Video:** Converte apresentações PPT em vídeos narrados (até 50 slides).
- **Brand Kits:** Kits de marca com logos, cores e fontes (até 10 no Team).
- **Auto Summarize:** Resume vídeos longos automaticamente.
- **Pictory Central:** Hosting interativo de vídeos (Team plan).
- **Multi-language:** Suporte a 29 idiomas para edição por texto.

### UX/UI

Interface em três modos: **Script to Video** (editor de texto à esquerda, preview à direita), **Blog to Video** (campo de URL, geração automática) e **Edit Video Using Text** (transcrição editável). Timeline na parte inferior com cenas visuais. Design funcional e direto, sem excessos visuais. Cada cena pode ser customizada individualmente (trocar mídia, ajustar texto, modificar timing).

### Fluxo de Criação

1. Escolhe o modo (Script to Video, Blog to Video, Edit Video)
2. **Script to Video:** Cola o roteiro → IA divide em cenas → seleciona visuais → adiciona narração
3. **Blog to Video:** Cola URL → IA extrai conteúdo → gera vídeo
4. Customiza cada cena (troca imagens, ajusta legenda, modifica timing)
5. Preview e exporta

**Diferencial:** É a plataforma mais próxima do fluxo "roteiro → vídeo" que o Script Master implementa. Porém, Pictory é server-side, não tem geração de imagens com IA (usa stock), não tem TTS com continuidade de voz entre chunks, não tem crossfade personalizado, não tem speed paint, e a renderização não é client-side.

### Export e Formatos

- **Resolução:** 1080p (todos os plans pagos)
- **Formato:** MP4 + SRT/VTT/TXT (legendas exportáveis)
- **Duração máxima:** 5 min (Free), 30 min (Starter/Professional), 180 min (Team)
- **Sem marca d'água:** Starter+ (removida)
- **Aspect ratios:** Múltiplos (landscape, square, vertical)

### Pricing

| Plano | Preço Mensal | Minutos Vídeo/Mês | Resolução |
|-------|-------------|-------------------|-----------|
| Free Trial | $0 (14 dias) | 15 min | 1080p |
| Starter | $19-25 | 200 min | 1080p |
| Professional | $35-49 | 600 min | 1080p |
| Team | $99-119 | 1.800 min | 1080p |

---

## Comparação Cross-Platform

### Tabela Comparativa de Features de Vídeo

| Feature | Runway | Pika | HeyGen | Synthesia | InVideo AI | Descript | Kapwing | Lumen5 | Veed.io | Pictory |
|---------|--------|------|--------|-----------|------------|----------|---------|--------|---------|---------|
| **Geração de vídeo por IA** | Gen-4 (lider) | Pika 2.5 | VEO3 | Sora 2/Veo 3.1 | Sora 2 + Veo 3.1 | Não | AI Assistant | Chat to Video | Gen-AI Studio | Não (usa stock) |
| **Avatares AI** | Não | Não | Sim (700+) | Sim (180+) | Não | Não | Não | Não | Sim (limitado) | Não |
| **TTS / Narração** | Não | Não | Sim (voice clone) | Sim (Express Voice) | Sim (voice clone) | Overdub | Sim | Sim | Sim | Sim (ElevenLabs) |
| **Legendas automáticas** | Sim | Não | Sim | Sim (dynamic) | Sim | Sim | Sim | Não | Sim (100+ idiomas) | Sim |
| **Roteiro → Vídeo** | Não | Não | Sim (básico) | Sim (avatar) | Sim (completo) | Não | Não | Sim (URL/text) | Não | Sim (completo) |
| **Edição por texto** | Não | Não | Não | Não | Não | Sim (líder) | Sim | Não | Não | Sim |
| **Crossfade/Transições** | Não | Não | Sim (templates) | Sim (templates) | Sim | Sim | Sim | Sim | Sim | Sim |
| **Cenas geradas por IA** | Sim (clip) | Sim (clip) | Não | Sim (B-roll) | Sim | Não | Não | Não | Não | Não |
| **Multi-idioma** | Não | Não | 175+ | 130+ | Sim | 30+ | 40+ | Sim | 100+ | 7-29 |
| **Collaboração** | Sim | Não | Sim | Sim (enterprise) | Não | Sim | Sim | Sim | Sim | Sim |
| **Speed Paint** | Não | Não | Não | Não | Não | Não | Não | Não | Não | Não |
| **Renderização client-side** | Não | Não | Não | Não | Não | Não | Não | Não | Não | Não |

### Pricing Comparativo

| Plataforma | Free | Entrada | Mid | Pro | Enterprise |
|-----------|------|---------|-----|-----|------------|
| Runway | $0 (125 créditos) | $12/mês | $28/mês | $76/mês | Custom |
| Pika | $0 (limitado) | $10/mês | $35/mês | $95/mês | — |
| HeyGen | $0 (3 vídeos) | $24/mês | $79/mês | $30/seat | Custom |
| Synthesia | $0 (10 min) | $18/mês | $89/mês | — | Custom |
| InVideo AI | $0 (10 min/sem) | $25/mês | $48/mês | $96/mês | Custom |
| Descript | $0 (1 hora) | $16/mês | $24/mês | $50/mês | Custom |
| Kapwing | $0 (1 min) | $16/mês | — | $50/mês | Custom |
| Lumen5 | $0 (720p) | $19/mês | $59/mês | $149/mês | Custom |
| Veed.io | $0 (720p) | $12/mês | $24/mês | $59/mês | Custom |
| Pictory | $0 (14 dias) | $19/mês | $35/mês | $99/mês | $975+ |

### Fluxos de Criação Comparados

| Plataforma | Fluxo Principal | Entrada | Saída | Complexidade |
|-----------|----------------|---------|-------|-------------|
| **Runway** | Prompt → Clip IA | Texto/imagem | MP4 (5-16s) | Média |
| **Pika** | Prompt → Clip IA | Texto/imagem | MP4 (5-10s) | Baixa |
| **HeyGen** | Roteiro + Avatar → Vídeo | Texto | MP4 (ilimitado) | Baixa |
| **Synthesia** | Roteiro + Avatar → Vídeo | Texto | MP4 (10-30 min/mês) | Baixa |
| **InVideo AI** | Prompt → Vídeo completo | Texto (prompt) | MP4 (até 15 min) | Baixa |
| **Descript** | Gravação → Edição por texto | Vídeo/áudio | MP4 (até 4K) | Média |
| **Kapwing** | Upload → Edição + IA | Vídeo | MP4 (até 4K) | Média |
| **Lumen5** | URL/Texto → Vídeo | URL ou texto | MP4 (até 1080p) | Baixa |
| **Veed.io** | Upload → Edição + IA | Vídeo | MP4 (até 1080p) | Baixa-Média |
| **Pictory** | Roteiro → Vídeo completo | Texto/URL | MP4 (até 180 min) | Baixa |
| **Script Master** | Roteiro → TTS → Cenas → Vídeo | Texto (roteiro) | MP4/WebM (até 4K) | Média |

### Qualidade de Exportação

| Plataforma | Resolução Máx. | Formato | Duração Máx. | Marca d'água |
|-----------|---------------|---------|-------------|-------------|
| Runway | 4K | MP4 | 16s/clip | Free |
| Pika | 1080p | MP4 | 10s/clip | Free |
| HeyGen | 4K | MP4 | 30 min | Free |
| Synthesia | 1080p | MP4 + SCORM | Ilimitado (Enterprise) | Free |
| InVideo AI | 4K | MP4 | 15 min | Free |
| Descript | 4K | MP4, WAV, SRT | Ilimitado | Free |
| Kapwing | 4K | MP4, GIF, SRT | 2 horas | Free |
| Lumen5 | 1080p | MP4 | Ilimitado | Community |
| Veed.io | 1080p | MP4, MOV, GIF, SRT | 2 horas | Free |
| Pictory | 1080p | MP4, SRT, VTT | 180 min | Free Trial |

---

## Tendências do Mercado de Vídeo IA 2025-2026

### Crescimento acelerado

O mercado de vídeo IA cresceu de forma exponencial. Em dezembro de 2025, a plataforma Vivideo processou 12.000 pedidos; em janeiro de 2026, esse número saltou para 62.000 (5x em um mês). O mercado global de geradores de vídeo IA vale $716,8 milhões em 2025 e projeta $2,5 bilhões até 2033. Mais de 124 milhões de pessoas usam plataformas de vídeo IA mensalmente.

### Text-to-video dominante

Text-to-video representa 46,3% do mercado, seguido por image-to-video (32,6%). O formato landscape (16:9) lidera com 52,8%, mas vertical (9:16) cresce rápido com 43,7% — reflexo da dominância do TikTok e Reels. Square (1:1) é praticamente inexistente.

### Consolidação de modelos

Google Veo 3.1 atingiu 96,4% de share no mercado de geração de vídeo (dados da Vivideo). Sora 2 da OpenAI ficou com apenas 2%. Plataformas como InVideo AI integram múltiplos modelos (Sora 2 + Veo 3.1) para oferecer flexibilidade.

### Democratização radical

O custo de produção de vídeo caiu ~97% de 2020 a 2026: um projeto freelancer de $1.500 agora pode ser gerado por menos de $15 com IA. O principal obstáculo à adoção não é mais custo (43% dos marketers citam falta de skills in-house).

### Vídeo interativo e branching

Synthesia lidera com vídeos interativos (CTAs, quizzes, branching) para L&D. Essa tendência se expandirá para marketing e educação em 2026-2027.

### Geração em tempo real

A previsão para 2026 é que geração de vídeo em tempo real se torne viável, permitindo workflows interativos onde o criador ajusta o vídeo enquanto assiste.

### Composição de cenas e consistência

Runway Gen-4 introduziu consistência de personagem/objeto entre cenas. HeyGen e Synthesia avançam em avatares com gesticulação natural. A capacidade de manter identidade visual ao longo de um vídeo completo é o maior desafio técnico atual.

### Múltiplos idiomas e dublagem

Quase todas as plataformas (HeyGen, Synthesia, InVideo, Kapwing, Descript, Veed) investiram pesadamente em tradução e dublagem com lip-sync. Synthesia suporta 130+ idiomas; HeyGen, 175+.

### Renderização client-side como diferencial

Nenhuma das 10 plataformas pesquisadas faz renderização client-side. Todas processam vídeos em servidores cloud. O Script Master, ao usar Remotion com WebCodecs para renderização no browser, oferece um diferencial técnico significativo: sem custos de servidor, privacidade total dos dados, e funcionamento offline.

---

## Oportunidades para o Script Master

### Diferenciais competitivos existentes

1. **Renderização client-side (Remotion + WebCodecs):** Nenhuma plataforma concorrente faz isso. Elimina custos de servidor, garante privacidade e funciona offline.

2. **TTS com continuidade de voz:** O sistema de "TAKES CONTÍNUOS" entre chunks garante que a voz soe consistente ao longo de vídeos longos. Nenhuma plataforma concorrente menciona esse nível de controle sobre TTS.

3. **Speed Paint:** Animação progressiva estilo "lousa branca" com 4 zonas (fade in → animação → hold → fade out). Feature única no mercado — nenhuma plataforma oferece algo similar.

4. **Fluxo roteiro → TTS → cenas → vídeo integrado:** O Script Master controla todo o pipeline. Plataformas como InVideo AI e Pictory terceirizam partes do processo (cenas stock, TTS de terceiros).

5. **Whisper para legendas:** Transcrição local (sem API externa) com 3 fontes de timing. Privacidade e custo zero por legenda.

6. **Crossfade dinâmico:** Overlap diferente para cenas de speed paint (1s) vs. estáticas (400ms). Controle granular que editores online não oferecem.

7. **Exportação 4K client-side:** Usuário controla resolução (720p a 4K) sem limites de servidor.

### Lacunas e oportunidades

1. **Multi-idioma e TTS multilíngue:** Adicionar suporte a vozes em múltiplos idiomas abriria mercado global. Todas as concorrentes investem nisso.

2. **Templates e brand kits:** Templates predefinidos para YouTube, TikTok, Instagram acelerariam a adoção. Pictory e Lumen5 mostram que templates são fator de retenção.

3. **Avatares AI:** Embora fora do escopo atual, avatares simples (estilo Lumen5/Synthesia light) poderiam atrair o segmento corporativo.

4. **Geração de B-roll com IA:** Integrar modelos generativos (como Veo 3.1) para gerar cenas visuais a partir de prompts de cena complementaria o TTS.

5. **Vídeos interativos:** Branching, CTAs e quizzes (como Synthesia) abririam o mercado de L&D e educação.

6. **Colaboração em tempo real:** Funcionalidade multiusuário para equipes (como Kapwing e Descript) expandiria o uso corporativo.

7. **API e integrações:** API para geração programática de vídeos (como Pika oferece) atrairia desenvolvedores e agências.

8. **Repurposing de conteúdo:** Transformar vídeos longos em clips curtos para diferentes plataformas (como Kapwing Repurpose Studio) é uma feature de alto valor.

9. **Pricing freemium com créditos:** O modelo de créditos (usado por Runway, Pika, Kapwing) equilibra acesso gratuito com monetização. O Script Master pode adotar modelo similar baseado em minutos de vídeo gerados.

10. **Foco no nicho lusófono:** Nenhuma plataforma concorrente tem foco no mercado brasileiro/português. O Script Master já tem UI em pt-BR e pode se posicionar como a plataforma de vídeo IA para o mercado lusófono.
