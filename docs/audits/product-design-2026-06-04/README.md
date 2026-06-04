# Auditoria Product Design - Script Master

Data: 2026-06-04  
Escopo: fluxo publico de descoberta e conversao, com amostras de desktop, breakpoint intermediario e mobile.  
Destino das evidencias: `docs/audits/product-design-2026-06-04/screenshots/`

## Resumo executivo

O produto ja comunica bem a promessa principal: transformar roteiro em narracao, cenas, legendas e video em um fluxo unico. A identidade visual tambem esta consistente, com marca clara, CTAs fortes e bons blocos de prova.

Os maiores problemas encontrados nao sao de conteudo. Sao de experiencia e robustez visual:

1. A navegacao mobile publica esta duplicada: existe um menu dentro do `PublicHeader` e outro `GuestMobileNav` global renderizado pelo `App`. Isso cria dois botoes "Menu", um deles aparece solto na lateral da tela.
2. O scroll/foco entre rotas parece frágil porque o app rola o container `#main-content`, mas `ScrollToTop` chama `window.scrollTo(0, 0)`. Em layouts com `overflow: auto` no `main`, isso nao garante topo nem foco previsivel.
3. Login/cadastro em mobile funcionam, mas ficam altos e apertados: logo truncada no header, botao Google quebrando linha e formulario competindo com padding/card grande.
4. O hero e o demo visual passam uma sensacao premium, mas o produto fica escuro demais para inspecao rapida. Em mobile, a captura do hero travou no Browser, e o console indicou carregamentos duplicados de Emotion e Mediabunny.
5. Ha strings de estilo com `${...}` dentro de aspas simples em componentes visiveis. Isso impede interpolacao e pode quebrar bordas, sombras e overlays sutis.

## Fluxo auditado

| Passo | Tela | Evidencia | Saude geral |
|---|---|---|---|
| 1 | Landing hero desktop | `screenshots/01-landing-hero-desktop.png` | Boa, com risco de demo escuro demais |
| 2 | Landing features desktop | `screenshots/02-landing-features-desktop.png` | Boa, cards claros e escaneaveis |
| 3 | Landing casos de uso/prova | `screenshots/03-landing-demo-and-proof-desktop.png` | Boa, mas hierarquia visual repetitiva |
| 4 | Funcionalidades em breakpoint intermediario | `screenshots/04-funcionalidades-tablet-nav.png` | Fraca por menu duplicado e logo truncada |
| 5 | Precos/Beta em breakpoint intermediario | `screenshots/05-precos-tablet-nav.png` | Media, proposta clara com mesmo problema de navegacao |
| 6 | Cadastro em breakpoint intermediario | `screenshots/06-cadastro-tablet-nav.png` | Media, formulario util mas layout apertado |
| 7 | Login desktop | `screenshots/07-login-desktop.png` | Boa, com card alto e excesso de area decorativa |
| 8 | Onboarding direto sem login | `screenshots/08-onboarding-start-desktop.png` | Limitada: rota levou ao gate/login |
| 9 | Rota protegida sem login | `screenshots/09-protected-route-redirect-desktop.png` | Esperada: gate/login, app interno nao auditado |
| 10 | Login mobile | `screenshots/10-login-mobile.png` | Media, formulario funciona mas header quebra |
| 11 | Cadastro mobile | `screenshots/11-cadastro-mobile.png` | Media-baixa, CTA visivel mas botao Google quebra linha |
| 12 | Precos/Beta mobile | `screenshots/12-precos-mobile.png` | Boa, mensagem do beta aparece rapido |

## Achados e recomendacoes

### 1. Corrigir navegacao mobile publica duplicada

Evidencia: screenshots `04`, `05`, `06`, `10`, `11`, `12`; DOM mobile mostrou dois botoes com nome acessivel "Menu".

O app monta `GuestMobileNav` globalmente em `src/App.tsx`, enquanto `PublicHeader` ja renderiza um `IconButton` e um `Drawer` mobile. O resultado visivel e um menu no header mais outro botao solto na lateral.

Recomendacao:

- Centralizar a navegacao mobile no `PublicHeader`.
- Remover `GuestMobileNav` de `App.tsx` ou renderiza-lo apenas em rotas sem `PublicHeader`.
- Adicionar teste mobile para garantir que so exista um botao `Menu` nas rotas publicas.

Arquivos-alvo:

- `src/App.tsx`
- `src/components/public/PublicHeader.tsx`
- `src/components/app/GuestMobileNav.tsx`
- `tests/components/public/PublicHeader.component.test.tsx`

Nota de risco: `PublicHeader` e compartilhado por muitas rotas publicas. `GuestMobileNav` tem superficie menor, entao a correcao mais segura tende a ser reduzir ou remover o uso global dele.

### 2. Ajustar scroll e foco em mudanca de rota

Evidencia: o shell principal em `App.tsx` usa `overflow: auto` no `main`, enquanto `ScrollToTop` chama `window.scrollTo(0, 0)`. Isso e inconsistente com a estrutura real do layout.

Recomendacao:

- Atualizar `ScrollToTop` para rolar `#main-content`, nao apenas `window`.
- Depois da navegacao, focar `main` ou o primeiro `h1` de forma controlada.
- Preservar o skip link atual, que e um ponto forte de acessibilidade.

Arquivos-alvo:

- `src/components/public/ScrollToTop.tsx`
- `src/App.tsx`

### 3. Compactar login/cadastro no mobile

Evidencia: screenshots `10` e `11`. O header trunca "Script Master"; no cadastro, o botao "Cadastrar com Google" quebra em duas linhas; os cards ocupam quase toda a primeira dobra.

Recomendacao:

- Em `xs`, reduzir padding do card de auth de `p: 4` para algo mais compacto.
- Usar `Stack spacing={{ xs: 1.25, sm: 2 }}` nos formularios.
- Considerar `TextField size="small"` em mobile, mantendo alvo de toque confortavel.
- Encurtar o label mobile do Google para "Google" ou "Continuar com Google".
- Ocultar ou mover os beneficios da coluna esquerda para abaixo do formulario em `xs/sm`.
- Garantir `minWidth: 0` no bloco de marca do header e reservar largura suficiente para logo, idioma, menu e CTA.

Arquivos-alvo:

- `src/pages/LoginPage.tsx`
- `src/pages/RegisterPage.tsx`
- `src/components/public/PublicHeader.tsx`
- `src/theme/authStyles.ts`

### 4. Deixar o hero/demo mais legivel e mais leve

Evidencia: screenshot `01`; tentativa de screenshot mobile do hero travou no Browser. Console local mostrou avisos repetidos de Emotion carregado mais de uma vez e Mediabunny carregado duas vezes.

O hero tem boa promessa e CTA forte, mas o visual do produto esta escuro demais. O usuario entende o texto, mas nao consegue inspecionar rapidamente o que o app faz.

Recomendacao:

- Usar um visual de produto mais claro no primeiro viewport, com screenshot real legivel.
- Adiar demo animado pesado para uma secao abaixo ou iniciar apenas apos interacao.
- Investigar por que Mediabunny aparece duplicado no ambiente local.
- Confirmar se os avisos existem tambem em build/preview de producao antes de tratar como bug de release.

Arquivos-alvo:

- `src/components/public/HeroSection.tsx`
- `src/features/public-demo-video/MarketingDemoPlayer.tsx`
- `src/features/public-demo-video/MarketingDemoComposition.tsx`
- `src/pages/public/LandingPage.tsx`

### 5. Corrigir interpolacoes de estilo que viraram texto literal

Evidencia de codigo em arquivos do fluxo auditado:

- `src/App.tsx`: `border: '1px solid ${WHITE_08}'`
- `src/pages/LoginPage.tsx`: `border: '1px solid ${WHITE_06}'`, `boxShadow: '0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}'`
- `src/pages/RegisterPage.tsx`: `border: '1px solid ${WHITE_06}'`
- `src/pages/public/LandingPage.tsx`: `border: '1px solid ${WHITE_12}'`
- `src/features/public-demo-video/MarketingDemoPlayer.tsx`: sombras/bordas com `${...}` em aspas simples

Recomendacao:

- Trocar esses casos para template literals com crase ou tokens diretos.
- Criar um teste ou regra simples para detectar `'\${` em arquivos `ts/tsx`.

Impacto esperado: melhora de bordas, sombras e estados visuais que hoje podem estar simplesmente ausentes.

### 6. Reduzir divida visual de tipografia e brilho

Evidencia: uso amplo de `letterSpacing` negativo em tema e componentes publicos; muitas superficies escuras com glow semelhante.

Recomendacao:

- Padronizar letter spacing para `0` em componentes novos e ir removendo negativos por lote.
- Manter o gradiente da marca nos pontos de maior valor, mas reduzir repeticao em titulos secundarios.
- Alternar seções com densidade diferente: algumas com menos card e mais produto real.

Isso deve deixar o app menos "marketing glass repetido" e mais util para leitura rapida.

## Pontos fortes

- Proposta de valor clara no primeiro viewport.
- CTA primario forte e consistente.
- Conteudo do beta/precos comunica bem gratuidade, feedback e ausencia de cartao.
- Skip link global existe e e um bom ponto de partida de acessibilidade.
- Cards de features e casos de uso sao escaneaveis e usam linguagem direta.
- Login/cadastro oferecem Google e email/senha com labels visiveis.

## Riscos de acessibilidade

- Dois botoes "Menu" no mobile confundem teclado e leitor de tela.
- O foco automatico nos campos de auth pode ser util, mas combinado com card alto e header truncado pode causar entrada de pagina pouco orientada em mobile.
- O contraste do demo visual e baixo para entender conteudo de tela.
- O gerenciamento de foco em mudanca de rota ainda nao parece cobrir o container real que rola.
- Nao foi feita validacao completa de teclado, leitor de tela ou contraste computado. Esta auditoria se limita a screenshots, DOM snapshot e leitura de codigo.

## Limites da auditoria

- Sem credenciais, o app autenticado nao foi auditado por dentro. A rota protegida mostrou gate/login.
- A captura mobile do hero da landing travou no Browser, provavelmente por peso/animacao do demo. Foram aceitas capturas mobile de login, cadastro e precos.
- Os avisos de Emotion/Mediabunny foram observados no dev server local. Dev server pode emitir ruidos que nao existem no build final, entao isso precisa ser validado em `bun run build` + `bun run preview`.

## Ordem sugerida de execucao

1. Corrigir menu mobile duplicado.
2. Corrigir scroll/foco do `main-content` em mudanca de rota.
3. Compactar login/cadastro mobile.
4. Corrigir interpolacoes de estilo com aspas simples.
5. Tornar hero/demo mais legivel e validar peso do demo.
6. Fazer uma rodada visual para reduzir excesso de glow e letter spacing negativo.

