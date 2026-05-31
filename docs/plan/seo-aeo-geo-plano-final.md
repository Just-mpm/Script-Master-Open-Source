# Plano: SEO / AEO / GEO — Script Master

## Contexto

SPA React + Vite 8 hospedado no Firebase Hosting. Domínio prod: `script-master.pro`. As 10 páginas públicas dependem de React 19 hoisting para injetar meta tags SEO — isso funciona para Googlebot (que executa JS), mas **falha para crawlers de redes sociais** (Twitter, LinkedIn, Discord, Slack) e bots de LLMs (ChatGPT, Perplexity), que não executam JavaScript.

Além disso, faltam JSON-LD por página, OG image dedicada, llms.txt para visibilidade em LLMs, e otimizações de favicon/assets.

**Nota estratégica Google (maio/2026):** O guia oficial "Optimizing for Generative AI Search" é claro: SEO = AEO = GEO. Não existem "hacks" para AI search. O que funciona: (1) conteúdo único e valioso, (2) estrutura técnica limpa, (3) structured data para rich results. FAQ rich results foram descontinuados em maio/2026 — não investir em `FAQPage` schema.

**Investigação realizada:**
- Código: `src/lib/seo.ts`, `src/components/DocumentHead.tsx`, `src/assets/logos.ts`, `vite.config.ts`, `firebase.json`, `public/*`
- NotebookLM: Vite 8 Guide (SSG/prerender, PWA)
- Web: Google AI Optimization Guide, SoftwareApp schema, FAQ schema (deprecated), llms.txt spec, vite-plugin-prerender npm

## Escopo

### O que entra
- Pre-render das 10 páginas públicas para HTML estático
- OG image dedicada (1200x630) para compartilhamento social
- llms.txt + llms-full.txt para visibilidade em LLMs (ChatGPT, Claude, Perplexity)
- JSON-LD por página: `SoftwareApplication`, `BreadcrumbList`, `WebPage`, `Organization` (melhorado)
- Favicon otimizado (.ico + apple-touch-icon)
- OG locale alternates para i18n (pt-BR, en, es)
- Sitemap com `lastmod` dinâmico
- Meta tags Apple (mobile-web-app-capable, apple-touch-icon)
- robots.txt atualizado permitindo llms.txt

### O que não entra
- Mudanças de conteúdo/copy das páginas
- FAQ schema (descontinuado pelo Google em maio/2026)
- SSR completo ou migração para framework SSR (Next.js, Astro)
- Subpaths de idioma (`/en/`, `/es/`) — i18n continua client-side
- Google Search Console setup ou submissão de sitemap
- Otimização de Core Web Vitals (escopo separado)
- A/B testing de meta descriptions

## Decisões (MDE)

### D1: Estratégia de pre-render
- **Problema:** SPA entrega HTML vazio; crawlers sociais e LLMs não executam JS
- **Opções consideradas:**
  1. `vite-plugin-prerender` (Puppeteer headless, pós-build)
  2. SSR manual com Vite (`vite build --ssr` + script Node)
  3. Migração para Astro/Next.js
- **Escolha:** `vite-plugin-prerender` (Puppeteer)
- **Justificativa:** Framework-agnostic, não exige reescrever a app, funciona com Firebase Hosting (arquivos estáticos em `dist/`), 16K+ downloads/semana, suporta `renderAfterDocumentEvent` para esperar React hidratar. Opção 2 exigiria `entry-server.ts` e manutenção contínua. Opção 3 é overkill para 10 páginas.
- **Fonte:** NotebookLM Vite 8 Guide (SSG section) + npm `vite-plugin-prerender`

### D2: OG Image
- **Problema:** `og:image` atual é a logo transparente (1024x1024) — genérica, sem contexto
- **Opções consideradas:**
  1. OG image estática única (brand + tagline)
  2. OG image por página (gerada via Cloud Function ou Satori)
  3. OG image dinâmica via API (Vercel OG, etc.)
- **Escolha:** OG image estática única (brand + tagline)
- **Justificativa:** Custo zero de infra, uma imagem serve todas as páginas públicas, pode ser evoluída para por-página depois. Opções 2 e 3 exigem infra adicional e não justificam para 10 páginas de um SaaS em beta.
- **Fonte:** Análise de impacto vs esforço

### D3: llms.txt — abordagem
- **Problema:** LLMs (ChatGPT, Claude, Perplexity) não conhecem o Script Master
- **Opções consideradas:**
  1. `llms.txt` + `llms-full.txt` (spec oficial llmstxt.org)
  2. Apenas `llms.txt` (resumo + links)
  3. Não fazer (Google diz que não precisa)
- **Escolha:** `llms.txt` + `llms-full.txt`
- **Justificativa:** Google não precisa, mas ChatGPT/Claude/Perplexity usam ativamente. O `llms-full.txt` pode ser consumido inline pelo LLM sem precisar seguir links. A spec é simples (Markdown) e os dois arquivos vivem em `public/`. Custo de manutenção baixo.
- **Fonte:** llmstxt.org spec + Google AI Optimization Guide

### D4: JSON-LD — schemas por página
- **Problema:** Só existe `Organization` global; faltam schemas específicos
- **Opções consideradas:**
  1. JSON-LD inline em cada página via `DocumentHead`
  2. JSON-LD estático no `index.html` + pré-render injeta por página
  3. Apenas melhorar o `Organization` existente
- **Escolha:** JSON-LD via `DocumentHead` (injetado pelo React e capturado pelo pre-render)
- **Justificativa:** O pre-render vai capturar o HTML completo após hidratação, incluindo JSON-LD injetado pelo React. Assim cada página tem seu schema correto sem duplicar lógica. Opção 2 exigiria lógica duplicada. Opção 3 é muito limitada.
- **Fonte:** Google Structured Data Gallery + análise do `DocumentHead`

### D5: Favicon
- **Problema:** `favicon.webp` tem 2048x2048 (83KB); Safari não suporta `.webp` como favicon
- **Opções consideradas:**
  1. Gerar `.ico` (multi-size: 16+32+48) + `apple-touch-icon.png` (180x180) + manter `.webp`
  2. Usar apenas `.ico`
  3. Manter `.webp` e ignorar Safari
- **Escolha:** `.ico` (16+32+48) + `apple-touch-icon.png` (180x180) + manter `.webp` como fallback
- **Justificativa:** Compatibilidade universal. `.ico` funciona em todos os browsers. `apple-touch-icon.png` para iOS bookmarks. `.webp` mantido para browsers modernos que preferem.
- **Fonte:** Google Favicon docs + análise de compatibilidade

## Reutilização e Padrões

- **Reutilizar:** `getPageSeo()` (já gera title, meta, canonical, OG, Twitter) — apenas estender
- **Reutilizar:** `DocumentHead` (já faz hoisting) — apenas adicionar JSON-LD ao output
- **Reutilizar:** `logos.ts` (versionamento centralizado) — adicionar OG image e favicon
- **Seguir como referência:** JSON-LD `Organization` já no `index.html` (estilo consistente)
- **Evitar criar do zero:** Não reescrever `seo.ts` — estender com novas props

## Arquivos e Áreas Prováveis

| Arquivo | Motivo |
|---------|--------|
| `vite.config.ts` | Adicionar `vite-plugin-prerender` |
| `src/lib/seo.ts` | Estender `getPageSeo()` com JSON-LD e `og:locale:alternate` |
| `src/components/DocumentHead.tsx` | Renderizar `<script type="application/ld+json">` |
| `public/llms.txt` | Novo — arquivo para LLMs |
| `public/llms-full.txt` | Novo — conteúdo completo para LLMs |
| `public/og-image.webp` | Novo — OG image 1200x630 |
| `public/favicon.ico` | Novo — favicon multi-size |
| `public/apple-touch-icon.png` | Novo — ícone iOS |
| `public/robots.txt` | Atualizar — permitir llms.txt explicitamente |
| `public/sitemap.xml` | Atualizar — `lastmod` dinâmico |
| `index.html` | Adicionar `apple-touch-icon`, melhorar favicon links |
| `package.json` | Adicionar `vite-plugin-prerender` como devDependency |

## Estratégia Técnica

### Pre-render (Puppeteer)
Após `vite build`, o `vite-plugin-prerender`:
1. Abre Chromium headless
2. Navega para cada uma das 10 rotas públicas
3. Aguarda evento customizado disparado pelo React após hidratação (`document.dispatchEvent(new Event('prerender-ready'))`)
4. Captura o HTML completo (com meta tags, OG, JSON-LD já injetados)
5. Salva como `dist/{route}/index.html`

O Firebase Hosting serve esses HTMLs estáticos. Crawlers sociais e LLMs recebem conteúdo completo sem executar JS.

### JSON-LD
Cada página pública recebe um schema via `getPageSeo()`:
- **Landing + Funcionalidades:** `SoftwareApplication` + `WebPage`
- **FAQ:** `WebPage` (não `FAQPage` — descontinuado)
- **Preços:** `SoftwareApplication` com `offers`
- **Demais:** `WebPage` + `BreadcrumbList`
- **Todas:** `BreadcrumbList`

### llms.txt
Segue a spec oficial (llmstxt.org):
- `llms.txt`: resumo + seções com links (H2 headings)
- `llms-full.txt`: conteúdo expandido inline (para LLMs que não seguem links)

## Passos de Implementação

### Lote 1 — Fundação (sem dependência entre si)

#### 1.1 — Instalar e configurar pre-render
**Objetivo:** Adicionar `vite-plugin-prerender` ao build pipeline
**Arquivos:** `vite.config.ts`, `package.json`
**Resultado:** `bun run build` gera HTML estático para as 10 rotas públicas em `dist/`
**Detalhes:**
- Instalar `vite-plugin-prerender` como devDependency
- Configurar rotas: `/`, `/funcionalidades`, `/precos`, `/perguntas-frequentes`, `/contato`, `/sobre`, `/termos`, `/privacidade`, `/cookies`, `/status`
- Configurar `renderAfterDocumentEvent: 'prerender-ready'` (espera React hidratar)
- Adicionar `postProcess` para: remover scripts de preload, ajustar HTML
- Garantir que o `index.html` raiz (SPA fallback) permanece intacto
- Adicionar `index.html` no `.gitignore` das pastas pré-renderizadas? Não — Firebase precisa delas
**Agent:** worker
**Evidência:** D1 (estratégia de pre-render)
**Notebook:** Vite 8 Guide (`1b3f4862-5e21-481e-aaf5-155b1897f6f8`) — confirmar compatibilidade com vite-plugin-pwa

#### 1.2 — Adicionar evento de sinalização para pre-render
**Objetivo:** React dispara `prerender-ready` quando a página está completamente renderizada
**Arquivos:** `src/components/DocumentHead.tsx` ou `src/main.tsx`
**Resultado:** Puppeteer sabe quando capturar o HTML (não antes da hidratação)
**Detalhes:**
- No `DocumentHead`, após renderizar todas as meta tags, disparar `document.dispatchEvent(new Event('prerender-ready'))` apenas se `window.__PRERENDER_INJECTED` existir (sinal de que está em modo pre-render)
- OU: usar `useEffect` no componente raiz para disparar o evento após mount
- Testar manualmente que o evento dispara
**Agent:** worker
**Evidência:** D1 (renderAfterDocumentEvent)
**Dependência:** Necessária antes de 1.1 funcionar corretamente

#### 1.3 — Criar llms.txt + llms-full.txt
**Objetivo:** Arquivos LLM-friendly na raiz do site
**Arquivos:** `public/llms.txt`, `public/llms-full.txt`
**Resultado:** `https://script-master.pro/llms.txt` e `/llms-full.txt` acessíveis
**Conteúdo `llms.txt`:**
```markdown
# Script Master

> Plataforma SaaS que transforma roteiros de vídeo em áudio profissional usando inteligência artificial (Gemini TTS). Oferece geração de voz multi-locutor, criação de cenas com IA, Speed Paint, renderização de vídeo com Remotion e assistente conversacional.

Script Master é uma ferramenta web para criadores de conteúdo que precisam transformar textos em produções audiovisuais completas. Funciona inteiramente no navegador, sem instalação.

## Funcionalidades Principais

- [Estúdio de Voz (TTS)](https://script-master.pro/funcionalidades): Conversão de roteiro em áudio com 30+ vozes via Gemini, suporte multi-locutor, preview de vozes e emotions
- [Geração de Imagens e Cenas](https://script-master.pro/funcionalidades): Imagens geradas por IA para cada cena do roteiro, com frameworks visuais (general, whiteboard)
- [Speed Paint](https://script-master.pro/funcionalidades): Animação automatizada de imagens com efeito de pintura progressiva, edge detection e renderização via Remotion
- [Renderização de Vídeo](https://script-master.pro/funcionalidades): Composição de vídeo client-side com WebCodecs, legendas automáticas (Whisper WASM), exportação até 4K
- [Assistente IA](https://script-master.pro/funcionalidades): Chat com IA para refinar roteiros, gerar planos de produção e editar conteúdo, com ferramentas integradas
- [Biblioteca de Projetos](https://script-master.pro/funcionalidades): Gerenciamento de projetos com áudios, cenas, vídeos e roteiros organizados

## Preços

- [Planos e Preços](https://script-master.pro/precos): Beta aberto gratuito — planos futuros: Free, Pro (R$49,90/mês), Business (R$149,90/mês)

## Empresa

- [Sobre](https://script-master.pro/sobre): Desenvolvido pela Koda AI Studio, empresa brasileira de IA criativa
- [Contato](https://script-master.pro/contato): Suporte e contato

## Stack Técnica

- React 19 + Vite 8 + Firebase (Auth, Firestore, Storage, Cloud Functions, Hosting)
- Gemini 3.1 Flash (TTS e imagens) + Gemini 3.5 Flash (assistente)
- Remotion 4 (renderização de vídeo) + WebCodecs
- 3 idiomas: pt-BR, en, es

## Optional

- [Termos de Uso](https://script-master.pro/termos)
- [Política de Privacidade](https://script-master.pro/privacidade)
- [Cookies](https://script-master.pro/cookies)
```

**Conteúdo `llms-full.txt`:** Versão expandida com descrições detalhadas de cada funcionalidade, limites técnicos, modelos Gemini usados, e instruções de uso. Formato texto corrido, sem links — para consumo inline pelo LLM.

**Agent:** worker
**Evidência:** D3 (llms.txt spec)
**Notebook:** Nenhum necessário

#### 1.4 — Gerar e adicionar OG Image dedicada
**Objetivo:** Imagem 1200x630 para compartilhamentos sociais
**Arquivos:** `public/og-image.webp` (novo), `src/lib/seo.ts` (atualizar referência)
**Resultado:** `og:image` e `twitter:image` apontam para card visual profissional
**Detalhes:**
- A imagem deve ser criada externamente (design) com: logo Script Master, tagline "Transforme roteiros em áudio profissional com IA", background escuro (#0a0a0f), gradiente brand
- Atualizar `DEFAULT_IMAGE` em `seo.ts` para apontar para `/og-image.webp`
- Adicionar `og:image:width` (1200) e `og:image:height` (630) nas meta tags
- Adicionar `og:image:alt` com descrição
- Adicionar versão no `logos.ts` para cache busting
**Agent:** worker (código) + Matheus (design da imagem)
**Evidência:** D2 (OG image estática)

### Lote 2 — JSON-LD e Meta Tags (depende de Lote 1 parcialmente)

#### 2.1 — Estender `seo.ts` com JSON-LD
**Objetivo:** Cada página recebe schema JSON-LD apropriado
**Arquivos:** `src/lib/seo.ts`
**Resultado:** `getPageSeo()` retorna JSON-LD no `SeoData`
**Detalhes:**
- Adicionar prop `jsonLd?: string` ao `SeoData`
- Criar funções helper:
  - `buildSoftwareAppSchema()` — para landing e funcionalidades
  - `buildBreadcrumbSchema(path, title)` — para todas as páginas
  - `buildWebPageSchema(path, title, description)` — para todas as páginas
- Atualizar `SeoProps` com prop `jsonLdType?: 'software' | 'webpage'`
- Cada página passa o tipo e o schema é gerado automaticamente
- Manter `Organization` no `index.html` (não duplicar)
**Agent:** worker
**Evidência:** D4 (JSON-LD via DocumentHead)
**Notebook:** Nenhum necessário — Google Structured Data docs já consultados

#### 2.2 — Atualizar `DocumentHead` para renderizar JSON-LD
**Objetivo:** Componente renderiza `<script type="application/ld+json">`
**Arquivos:** `src/components/DocumentHead.tsx`
**Resultado:** JSON-LD aparece no HTML pré-renderizado
**Detalhes:**
- Se `SeoData` tem `jsonLd`, renderizar `<script type="application/ld+json">{jsonLd}</script>`
- Garantir que o JSON-Ld é serializado corretamente (sem duplicação)
**Agent:** worker
**Dependência:** 2.1

#### 2.3 — Adicionar `og:locale:alternate` e melhorar meta i18n
**Objetivo:** Sinalizar versões de idioma para OG e Twitter
**Arquivos:** `src/lib/seo.ts`
**Resultado:** Meta tags com `og:locale:alternate` para en_US e es_ES
**Detalhes:**
- Adicionar `og:locale:alternate` para cada locale não-padrão (en_US, es_ES)
- Adicionar `<meta name="language" content="pt-BR">`
- Adicionar `<link rel="alternate" hreflang="pt-BR" href="{url}">` etc.
**Agent:** worker
**Evidência:** Google International SEO docs

#### 2.4 — Atualizar cada página pública com JSON-Ld e meta i18n
**Objetivo:** Passar `jsonLdType` correto para cada página
**Arquivos:** Todas as 10 páginas em `src/pages/public/`
**Resultado:** Cada página com schema apropriado
**Mapeamento:**
- `LandingPage` → `SoftwareApplication` + `BreadcrumbList`
- `FuncionalidadesPage` → `SoftwareApplication` + `BreadcrumbList`
- `PricingPage` → `SoftwareApplication` (com offers) + `BreadcrumbList`
- `FaqPage` → `WebPage` + `BreadcrumbList`
- `ContactPage` → `WebPage` + `BreadcrumbList`
- `AboutPage` → `WebPage` + `BreadcrumbList`
- `TermsPage` → `WebPage` + `BreadcrumbList`
- `PrivacyPage` → `WebPage` + `BreadcrumbList`
- `CookiesPage` → `WebPage` + `BreadcrumbList`
- `StatusPage` → `WebPage` + `BreadcrumbList`
**Agent:** worker
**Dependência:** 2.1, 2.2

### Lote 3 — Assets e Configuração (sem dependência de Lote 2)

#### 3.1 — Gerar favicon.ico e apple-touch-icon.png
**Objetivo:** Favicon universal e ícone iOS
**Arquivos:** `public/favicon.ico` (novo), `public/apple-touch-icon.png` (novo), `index.html`, `src/assets/logos.ts`
**Resultado:** Favicon funciona em todos os browsers e iOS
**Detalhes:**
- Gerar `favicon.ico` (multi-size: 16x16 + 32x32 + 48x48) a partir do `favicon.webp` existente
- Gerar `apple-touch-icon.png` (180x180) a partir de `logo-quadrado-arredondado.webp`
- Atualizar `index.html`: adicionar `<link rel="icon" type="image/x-icon" href="/favicon.ico">`, `<link rel="icon" type="image/webp" href="/favicon.webp" sizes="32x32">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- Atualizar `logos.ts`: adicionar entradas para `favicon.ico` e `appleTouchIcon`
- Adicionar `<meta name="apple-mobile-web-app-capable" content="yes">` e `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
**Agent:** worker
**Evidência:** D5 (favicon)

#### 3.2 — Atualizar robots.txt
**Objetivo:** Permitir acesso a llms.txt e llms-full.txt explicitamente
**Arquivos:** `public/robots.txt`
**Resultado:** Crawlers e LLMs podem acessar os arquivos
**Detalhes:**
- Manter regras existentes
- Adicionar `Allow: /llms.txt` e `Allow: /llms-full.txt` (explícito, embora já coberto por `Allow: /`)
- Adicionar referência ao llms.txt: `Llms-txt: https://script-master.pro/llms.txt` (campo não oficial mas alguns bots reconhecem)
**Agent:** worker

#### 3.3 — Atualizar sitemap.xml com lastmod dinâmico
**Objetivo:** Sitemap reflete data real de atualização
**Arquivos:** `public/sitemap.xml`
**Resultado:** Google recebe sinal de freshness correto
**Abordagem:** Manter estático por enquanto (10 páginas, muda raramente), mas atualizar `lastmod` para a data do deploy. Documentar no plano que pode ser automatizado via script de build no futuro.
**Alternativa considerada:** Script Node que gera sitemap.xml no pre-build — **rejeitada** por agora porque são só 10 páginas e o ganho é mínimo. Revisitar quando o site crescer.
**Agent:** worker

### Lote 4 — Validação e Testes

#### 4.1 — Teste de pre-render
**Objetivo:** Validar que todas as 10 páginas são pré-renderizadas corretamente
**Arquivos:** `tests/app/prerender.unit.test.ts` (novo) ou validação manual
**Resultado:** Build gera HTMLs com meta tags completas
**Critérios:**
- `dist/index.html` (SPA fallback) existe e não foi alterado
- `dist/funcionalidades/index.html` existe e contém `<title>`, `<meta property="og:title">`, `<script type="application/ld+json">`
- Todas as 10 rotas têm HTML estático correspondente
- HTML não contém estado de loading/skeleton
**Agent:** worker

#### 4.2 — Teste de JSON-LD (Rich Results)
**Objetivo:** Validar structured data contra Google Rich Results Test
**Arquivos:** Nenhum (validação manual)
**Resultado:** Schemas passam no validador do Google
**Critérios:**
- `SoftwareApplication` na landing: sem erros
- `BreadcrumbList` em todas as páginas: sem erros
- `Organization` no index.html: sem erros
- Tool: https://search.google.com/test/rich-results
**Agent:** validação manual (Matheus)

#### 4.3 — Teste de OG Image e compartilhamento
**Objetivo:** Validar previews em redes sociais
**Resultado:** Twitter Card Validator, Facebook Sharing Debugger e LinkedIn Post Inspector mostram card correto
**Critérios:**
- OG image carrega (1200x630)
- Title e description corretos
- Canonical URL presente
**Agent:** validação manual (Matheus)

#### 4.4 — Teste de regressão
**Objetivo:** App funciona normalmente após mudanças
**Resultado:** `bun run lint && bun run typecheck && bun run test` passam sem erros
**Agent:** worker

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Pre-render quebra com vite-plugin-pwa (conflito de plugins) | Média | Alto | Testar em branch separada; Puppeteer renderiza depois do build, então SW não interfere. Se conflito, usar `renderAfterTime` como fallback |
| JSON-LD duplicado (Organization no index.html + schemas por página) | Baixo | Médio | `Organization` fica apenas no `index.html` global (SPA fallback). Pré-render das páginas específicas NÃO inclui o `index.html` original — o React renderiza apenas os schemas daquela página |
| Pre-render timeout (páginas demoram para hidratar) | Média | Médio | Aumentar `renderAfterTime` como fallback; configurar `maxConcurrentRoutes: 1` para evitar sobrecarga |
| `favicon.ico` não funciona em alguns browsers | Baixo | Baixo | Manter `favicon.webp` como fallback; ordem de declaração no HTML prioriza `.ico` |
| Pre-render gera HTML com estado de loading | Média | Alto | Evento `prerender-ready` só dispara após hidratação completa; usar `renderAfterElementExists` como fallback para aguardar elemento específico |
| llms.txt fica desatualizado | Alta | Baixo | Adicionar nota no AGENTS.md para atualizar quando features mudarem; conteúdo é estável |

## Verificação

- [ ] **Pre-render:** `bun run build` gera HTMLs estáticos para as 10 rotas
- [ ] **OG Image:** `og:image` aponta para `/og-image.webp` (1200x630)
- [ ] **llms.txt:** `https://script-master.pro/llms.txt` acessível e bem formatado
- [ ] **JSON-LD:** Rich Results Test sem erros para SoftwareApplication e BreadcrumbList
- [ ] **Favicon:** `favicon.ico` e `apple-touch-icon.png` servidos corretamente
- [ ] **Regressão:** lint + typecheck + testes passam
- [ ] **Build:** `bun run build` completa sem erros
- [ ] **Deploy:** `bun run deploy:hosting` funciona e páginas pré-renderizadas são servidas

## Instruções de Execução

### Investigação
Antes de modificar cada arquivo, use `suggest reads`, `impact analysis` e `file context` nos arquivos listados. Os Notebooks mais relevantes são Vite 8 Guide (para prerender/PWA) e React Docs (para hoisting).

### Divisão do Trabalho
- Budget por agent: ~50K tokens
- Agrupamento por lote (Lote 1 primeiro, depois Lote 2, etc.)
- Nunca dois agents modificando o mesmo arquivo no mesmo lote
- Lote 1 pode ter 1.1+1.2 (sequencial) e 1.3+1.4 (paralelo)

### Execução
- **Lote 1:** 1.3+1.4 em paralelo (llms.txt + OG image) | 1.1+1.2 sequencial (prerender precisa do evento)
- **Lote 2:** 2.1+2.2+2.3 sequencial (seo.ts → DocumentHead → páginas) | 2.4 em seguida
- **Lote 3:** 3.1+3.2+3.3 em paralelo (assets independentes)
- **Lote 4:** 4.1+4.4 juntos (automatizados) | 4.2+4.3 manuais pelo Matheus
- Após cada lote: `bun run lint && bun run typecheck` (0 erros, 0 warnings)
- Proibido `@ts-ignore`, `@ts-expect-error` ou `eslint-disable` — corrija a causa raiz

### Ordem Recomendada
1. **1.3** (llms.txt) + **1.4** (OG image) + **3.1** (favicon) + **3.2** (robots.txt) + **3.3** (sitemap) — todos em paralelo, são arquivos estáticos
2. **1.2** (evento prerender-ready) → **1.1** (configurar vite-plugin-prerender) — sequencial
3. **2.1** (seo.ts JSON-LD) → **2.2** (DocumentHead) → **2.3** (og:locale:alternate) → **2.4** (páginas) — sequencial
4. **4.1** (teste prerender) + **4.4** (regressão) — validação
5. **4.2** + **4.3** — validação manual pelo Matheus

## Notebooks Relevantes

| Notebook | ID | Quando consultar |
|----------|----|------------------|
| Vite 8 Guide | `1b3f4862-5e21-481e-aaf5-155b1897f6f8` | Configuração do vite-plugin-prerender, compatibilidade com vite-plugin-pwa, SSR APIs |
| React Docs | `8765c786-5be2-4b46-a20c-4ef666804801` | React 19 hoisting, useEffect para evento prerender-ready |
| Firebase Hosting Docs | `d7994dac-383f-4728-8c7b-6140ff3182c4` | Headers, rewrites, cleanUrls, serving de HTMLs estáticos |
| MUI V7/V9 Docs | `2ee9920b-613b-4ace-8208-9f69c202fa71` | Se precisar de componentes para OG image preview |
