# Plano de Páginas Públicas — Script Master

> Versão: 2.0 | Data: 24/04/2026 | Status: Em execução

---

## 1. O que já foi feito

| Item | Detalhes |
|------|----------|
| Paleta de marca | Tokens alinhados com logos: azul `#2E75B6` + laranja `#F7941E` |
| Prefixo `/app/` | Rotas autenticadas migradas (`/app/estudio`, `/app/video`, etc.) |
| Landing Page | `/` — hero, social proof, 6 feature cards, 3 showcases, "como funciona", CTA |
| Funcionalidades | `/funcionalidades` — 6 seções categorizadas com deep dives |
| Login | `/login` — layout de conversão: benefícios + card de login |
| Componentes públicos | 10 componentes em `src/components/public/` (Header, Footer, PageLayout, Hero, FeatureCard, FeatureShowcase, CTASection, StepCard, SocialProofBar, barrel) |
| Assets visuais | 8 imagens Nanobanana em `public/images/public/` |
| COEP | Apenas `/app/*` e `/404.html`, páginas públicas sem COEP |
| SEO base | OG meta tags, Twitter Cards, Schema.org Organization no `index.html` |
| PWA base | `vite-plugin-pwa` instalado, ícones 192/512 gerados |
| Build | 731 testes passando, lint/typecheck limpos |

---

## 2. Tradução de rotas (inglês → português)

### Rotas públicas

| Rota atual (inglês) | Rota nova (português) | Página | Status |
|---------------------|-----------------------|--------|--------|
| `/` | `/` | Landing Page | Feito |
| `/features` | `/funcionalidades` | Funcionalidades | Feito (precisa renomear arquivo) |
| `/login` | `/login` | Login | Feito |
| — | `/precos` | Preços | **Pendente** |
| — | `/sobre` | Sobre | **Pendente** |
| — | `/contato` | Contato | **Pendente** |
| — | `/perguntas-frequentes` | Perguntas Frequentes | **Pendente** |
| — | `/termos` | Termos de Uso | **Pendente** |
| — | `/privacidade` | Privacidade | **Pendente** |
| — | `/cookies` | Cookies | **Pendente** |
| — | `/novidades` | Novidades (Changelog) | **Pendente** |
| — | `/status` | Status | **Pendente** |

### Rotas do app (autenticadas)

| Rota atual | Rota nova | Página | Status |
|------------|-----------|--------|--------|
| `/app/estudio` | `/app/estudio` | Estúdio de Produção | Feito |
| `/app/video` | `/app/video` | Editor de Vídeo | Feito |
| `/app/assistant` | `/app/assistente` | Assistente IA | **Precisa renomear** |
| `/app/library` | `/app/biblioteca` | Biblioteca | **Precisa renomear** |
| `/app/speed-paint` | `/app/pintura-rapida` | Pintura Rápida | **Precisa renomear** |
| `/app/image` | `/app/imagens` | Estúdio de Imagem | **Precisa renomear** |

---

## 3. Páginas pendentes — detalhamento

### 3.1 Preços — `/precos` (P1)

**Objetivo:** Mostrar planos, converter visitantes, responder dúvidas sobre preços.

```
┌──────────────────────────────────────────────┐
│ [PublicHeader]                               │
├──────────────────────────────────────────────┤
│ [HeroSection]                                │
│ H1: "Escolha o plano ideal para você"       │
│ Toggle Mensal / Anual (com desconto)         │
├──────────────────────────────────────────────┤
│ [PricingCards — 3 colunas]                   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ Gratuito │ │ Pro ⭐   │ │ Equipe  │     │
│ │ R$ 0     │ │ R$ XX/mês│ │ Sob dem.│     │
│ │ Features │ │ Features │ │ Features │     │
│ │ CTA      │ │ CTA prim │ │ CTA      │     │
│ └──────────┘ └──────────┘ └──────────┘     │
├──────────────────────────────────────────────┤
│ [Tabela Comparativa]                         │
│ Grid com checkmarks por feature/limite        │
├──────────────────────────────────────────────┤
│ [FAQAccordion — perguntas de preços]         │
│ 6-8 perguntas (forma de pagamento, reembolso,│
│  limite de uso, etc.)                        │
├──────────────────────────────────────────────┤
│ [CTASection]                                 │
│ "Comece grátis, sem cartão de crédito"       │
├──────────────────────────────────────────────┤
│ [PublicFooter]                               │
└──────────────────────────────────────────────┘
```

**Conteúdo dos planos:**
| | Gratuito | Pro | Equipe |
|--|----------|-----|--------|
| Geração TTS | 5 roteiros/mês | Ilimitado | Ilimitado |
| Geração de imagens | 10/mês | 200/mês | Ilimitado |
| Renderização de vídeo | 720p | 1080p | 1080p |
| Duração do vídeo | 30s | 5 min | 10 min |
| Assistente IA | 20 msgs/dia | Ilimitado | Ilimitado |
| Pintura Rápida | 3/mês | 50/mês | Ilimitado |
| Biblioteca | 5 projetos | 100 projetos | Ilimitado |
| Exportar áudio | WAV | WAV + MP3 | WAV + MP3 |
| Suporte | Comunidade | Email | Prioritário |

**Componentes necessários:**
- `PricingCard` (novo) — card de plano com variante `recommended` (borda brand gradient, badge "Popular")
- `FAQAccordion` (novo) — accordion MUI estilizado para FAQ

### 3.2 Perguntas Frequentes — `/perguntas-frequentes` (P1)

**Objetivo:** Reduzir atrito de conversão, responder dúvidas comuns.

```
┌──────────────────────────────────────────────┐
│ [PublicHeader]                               │
├──────────────────────────────────────────────┤
│ [HeroSection]                                │
│ H1: "Perguntas Frequentes"                   │
│ Subtítulo descritivo                         │
├──────────────────────────────────────────────┤
│ [Categorias — tabs ou seções]                │
│                                              │
│ Geral (5-8 perguntas)                        │
│ - O que é o Script Master?                   │
│ - Preciso de conta para usar?                │
│ - Meus dados estão seguros?                  │
│ - Funciona offline?                          │
│                                              │
│ Preços (5-8 perguntas)                       │
│ - É realmente grátis?                        │
│ - Posso cancelar a qualquer momento?         │
│ - Quais as formas de pagamento?              │
│                                              │
│ Técnico (5-8 perguntas)                      │
│ - Quais vozes estão disponíveis?             │
│ - Qual o limite de tamanho do roteiro?       │
│ - Como funcionam os vídeos?                  │
│                                              │
│ Conta (3-5 perguntas)                        │
│ - Como faço login?                           │
│ - Posso usar em mais de um dispositivo?      │
│ - Como excluo minha conta?                   │
├──────────────────────────────────────────────┤
│ [Ainda tem dúvidas?]                         │
│ Link para /contato                           │
├──────────────────────────────────────────────┤
│ [CTASection]                                 │
│ [PublicFooter]                               │
└──────────────────────────────────────────────┘
```

**Componentes necessários:**
- `FAQAccordion` (mesmo do Pricing — reutilizar)

### 3.3 Contato — `/contato` (P1)

**Objetivo:** Canal de comunicação direta com usuários.

```
┌──────────────────────────────────────────────┐
│ [PublicHeader]                               │
├──────────────────────────────────────────────┤
│ [HeroSection]                                │
│ H1: "Fale Conosco"                           │
├──────────────────────────────────────────────┤
│ [Layout 2 colunas]                           │
│ ┌─────────────────┐ ┌─────────────────┐     │
│ │ Informações     │ │ Formulário      │     │
│ │ Email de contato│ │ Nome            │     │
│ │ Horário (se apl)│ │ Email           │     │
│ │ Links redes     │ │ Assunto (select)│     │
│ │                 │ │ Mensagem        │     │
│ │                 │ │ [Enviar]        │     │
│ └─────────────────┘ └─────────────────┘     │
├──────────────────────────────────────────────┤
│ [CTASection]                                 │
│ [PublicFooter]                               │
└──────────────────────────────────────────────┘
```

**Observação:** Formulário é visual-only (sem backend). Pode usar `mailto:` ou integrar com serviço externo (Formspree, EmailJS) depois.

### 3.4 Termos de Uso — `/termos` (P1)

**Objetivo:** Página legal obrigatória.

```
┌──────────────────────────────────────────────┐
│ [PublicHeader]                               │
├──────────────────────────────────────────────┤
│ Título: "Termos de Uso"                      │
│ "Última atualização: XX/XX/XXXX"             │
├──────────────────────────────────────────────┤
│ [Sumário clicável]                           │
│ Links âncora para seções                     │
├──────────────────────────────────────────────┤
│ [Conteúdo — seções]                          │
│ 1. Aceitação dos Termos                      │
│ 2. Descrição do Serviço                     │
│ 3. Conta do Usuário                         │
│ 4. Uso Permitido                             │
│ 5. Conteúdo do Usuário                      │
│ 6. Limitação de Responsabilidade             │
│ 7. Propriedade Intelectual                   │
│ 8. Modificações nos Termos                   │
│ 9. Encerramento                              │
│ 10. Disposições Gerais                      │
├──────────────────────────────────────────────┤
│ [PublicFooter]                               │
└──────────────────────────────────────────────┘
```

### 3.5 Privacidade — `/privacidade` (P1)

**Objetivo:** Política LGPD/GDPR.

```
Estrutura idêntica aos Termos de Uso, com seções:
1. Introdução
2. Dados que Coletamos
3. Como Usamos seus Dados
4. Compartilhamento de Dados
5. Cookies
6. Seus Direitos (LGPD)
7. Retenção de Dados
8. Segurança
9. Mudanças nesta Política
10. Contato
```

### 3.6 Sobre — `/sobre` (P2)

```
┌──────────────────────────────────────────────┐
│ [PublicHeader]                               │
├──────────────────────────────────────────────┤
│ [HeroSection]                                │
│ H1: "Sobre o Script Master"                  │
├──────────────────────────────────────────────┤
│ [Missão & Visão]                             │
│ Texto principal + 3 cards de valores          │
│ (Criatividade, Simplicidade, Inovação)       │
├──────────────────────────────────────────────┤
│ [Time]                                       │
│ Avatar + Nome + Cargo (se houver)            │
├──────────────────────────────────────────────┤
│ [Roadmap Público]                            │
│ Timeline vertical com marcos                 │
├──────────────────────────────────────────────┤
│ [CTASection]                                 │
│ [PublicFooter]                               │
└──────────────────────────────────────────────┘
```

### 3.7 Cookies — `/cookies` (P2)

Estrutura idêntica às páginas legais. Conteúdo sobre cookies técnicos, analíticos e de terceiros.

### 3.8 Novidades — `/novidades` (P3)

Histórico de versões. Pode ler do `AGENTS.md` ou de um JSON estático. Cada entrada: versão, data, lista de mudanças.

### 3.9 Status — `/status` (P3)

Página simples mostrando status dos serviços (Gemini API, Firebase, Storage). Pode ser estático ou buscar de um endpoint no futuro.

---

## 4. Componentes pendentes

| Componente | Onde é usado | Detalhes |
|------------|-------------|----------|
| `PricingCard` | `/precos` | Nome, preço, lista de features (check/x), CTA. Variante `recommended`: borda gradiente brand, badge "Popular", destaque visual |
| `FAQAccordion` | `/precos`, `/perguntas-frequentes` | MUI Accordion estilizado: glass surface, brand border no expandido, ícone de chevron |

---

## 5. Design System (referência rápida)

### Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| `BRAND_PRIMARY` | `#2E75B6` | Botões primários, links, destaques |
| `BRAND_PRIMARY_LIGHT` | `#5BA3D0` | Hover states, bordas ativas |
| `BRAND_PRIMARY_DARK` | `#1A5B8E` | Gradientes, texto sobre fundo claro |
| `BRAND_SECONDARY` | `#F7941E` | CTAs, badges, destaques secundários |
| `BRAND_SECONDARY_LIGHT` | `#FFB74D` | Hover de CTAs, highlights |
| `BRAND_SECONDARY_DARK` | `#E67300` | Texto sobre fundo claro |

**Gradiente:** `linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)`

### Superfícies (definidas em `src/theme/surfaces.ts`)

| Nome | Uso |
|------|-----|
| `glassPanelSx` | Cards, seções — blur + gradiente + shadow |
| `insetPanelSx` | Inputs, painéis recessados |
| `glassSurfaceSx` | Hover states, overlays |

### Tipografia

| Papel | Fonte | Tamanho (desktop) |
|-------|-------|-------------------|
| Hero | Inter 700 | 48-64px |
| H1 | Inter 700 | 36-48px |
| H2 | Inter 600 | 28-32px |
| Body | Inter 400 | 16px |
| Preço/code | JetBrains Mono 500 | 14-16px |
| Citação | Playfair Display | 20-28px |

---

## 6. Navegação atualizada

```
                    ┌─────────────────────────┐
                    │    Landing Page (/)     │
                    └────────────┬────────────┘
                                 │
         ┌──────────┬────────────┼────────────┬──────────────┐
         v          v            v            v              v
   ┌──────────┐ ┌────────┐ ┌───────────┐ ┌────────┐   ┌─────────┐
   │Funcion.  │ │Preços  │ │Perguntas  │ │ Sobre  │   │ Contato │
   │(/funcion)│ │(/precos)│ │Freq.      │ │(/sobre)│   │(/contat)│
   │          │ │        │ │(/perguntas)│ │        │   │         │
   └────┬─────┘ └───┬────┘ └─────┬─────┘ └───┬────┘   └─────────┘
        │            │            │            │
        └──────┬─────┘            │            │
               v                  v            v
         ┌────────────────────────────────────────┐
         │            Login (/login)              │
         │     Google Auth > Redirect /app/*      │
         └────────────────────────────────────────┘

    Páginas legais (/termos, /privacidade, /cookies):
    Acessíveis via PublicFooter de qualquer página pública.

    App autenticado (/app/*):
    /app/estudio | /app/video | /app/assistente | /app/biblioteca
    /app/pintura-rapida | /app/imagens
```

**Regras:**
- Todas as páginas públicas: sem COEP, com PublicHeader + PublicFooter
- Todas as páginas do app: com COEP, com Header + ActionBar (onde aplicável)
- Lazy loading em todas as rotas via `React.lazy()`

---

## 7. SEO pendente

| Item | Status | Detalhes |
|------|--------|----------|
| Meta tags estáticas (`index.html`) | Feito | OG, Twitter Cards, Schema.org Organization |
| Meta tags dinâmicas por página | **Pendente** | Instalar `react-helmet-async`, adicionar `<Helmet>` em cada página |
| Sitemap.xml | **Pendente** | Gerar estático no build com lista de páginas públicas |
| robots.txt | **Pendente** | Liberar crawlers para páginas públicas |
| Structured data (JSON-LD) | **Pendente** | FAQPage para `/perguntas-frequentes`, Pricing para `/precos` |

**Dependência:** `react-helmet-async` (ainda não instalado — `bun add react-helmet-async`)

---

## 8. Estrutura de arquivos

```
src/pages/public/
  LandingPage.tsx          ✅ feito
  FeaturesPage.tsx         ✅ feito (→ renomear para FuncionalidadesPage.tsx)
  PricingPage.tsx          ❌ pendente
  FaqPage.tsx              ❌ pendente
  ContactPage.tsx          ❌ pendente
  TermsPage.tsx            ❌ pendente
  PrivacyPage.tsx          ❌ pendente
  AboutPage.tsx            ❌ pendente
  CookiesPage.tsx          ❌ pendente
  ChangelogPage.tsx        ❌ pendente (→ NovidadesPage.tsx)
  StatusPage.tsx           ❌ pendente

src/components/public/
  index.ts                 ✅ feito
  PublicHeader.tsx         ✅ feito
  PublicFooter.tsx         ✅ feito
  PageLayout.tsx           ✅ feito
  HeroSection.tsx          ✅ feito
  FeatureCard.tsx          ✅ feito
  FeatureShowcase.tsx      ✅ feito
  CTASection.tsx           ✅ feito
  StepCard.tsx             ✅ feito
  SocialProofBar.tsx       ✅ feito
  PricingCard.tsx          ❌ pendente
  FAQAccordion.tsx         ❌ pendente
```

---

## 9. Ordem de implementação

### Fase 1: Conversão (P1)

| # | Tarefa | Depende de |
|---|--------|-----------|
| 1 | Renomear rotas app para português (assistant→assistente, library→biblioteca, speed-paint→pintura-rapida, image→imagens) | Nenhuma |
| 2 | Renomear `/features` para `/funcionalidades` | Nenhuma |
| 3 | Criar `PricingCard` + `FAQAccordion` | Nenhuma |
| 4 | Página Preços (`/precos`) | 3 |
| 5 | Página Perguntas Frequentes (`/perguntas-frequentes`) | 3 |
| 6 | Página Contato (`/contato`) | Nenhuma |
| 7 | Página Termos de Uso (`/termos`) | Nenhuma |
| 8 | Página Privacidade (`/privacidade`) | Nenhuma |
| 9 | Instalar `react-helmet-async`, adicionar meta tags dinâmicas em todas as páginas públicas | 1-8 |

### Fase 2: Conteúdo (P2)

| # | Tarefa | Depende de |
|---|--------|-----------|
| 10 | Página Sobre (`/sobre`) | Fase 1 |
| 11 | Página Cookies (`/cookies`) | Nenhuma |

### Fase 3: Polish (P3)

| # | Tarefa | Depende de |
|---|--------|-----------|
| 12 | Página Novidades (`/novidades`) | Fase 1 |
| 13 | Página Status (`/status`) | Fase 1 |
| 14 | Sitemap.xml + robots.txt | Fase 1 |
| 15 | Structured data JSON-LD (FAQ, Pricing) | 4, 5 |

---

## 10. Considerações técnicas

- **Sem backend:** Formulário de contato é visual-only (mailto ou serviço externo futuro)
- **Lazy loading:** Todas as páginas novas via `React.lazy()` + `Suspense`
- **COEP:** Páginas públicas continuam sem COEP (regra já configurada em `firebase.json` e `vite.config.ts`)
- **MUI v9:** Todos os componentes usam MUI — sem Tailwind, sem CSS modules
- **Nanobanana:** Disponível para gerar assets visuais (ilustrações, ícones) conforme necessário
- **Idioma:** pt-BR na UI e comentários

---

## 11. Summary

| Métrica | Valor |
|---------|-------|
| Páginas já criadas | **3** (Landing, Funcionalidades, Login) |
| Páginas pendentes | **9** (5 P1, 2 P2, 2 P3) |
| Rotas do app pendentes de renomear | **4** |
| Componentes pendentes | **2** (PricingCard, FAQAccordion) |
| SEO pendente | **4 itens** |
| Dependências novas | **1** (react-helmet-async) |
