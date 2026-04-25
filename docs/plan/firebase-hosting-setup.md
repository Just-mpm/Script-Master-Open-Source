# Plano: Configuracao Completa do Firebase Hosting

## Contexto

O Script Master e uma SPA React + Vite 8 + MUI v9 que ja possui `firebase.json` com hosting basico configurado (public, ignore, SPA rewrite, COEP headers em /app/**, cache-control). Porem, a configuracao esta incompleta: faltam `.firebaserc`, `404.html` estatico, redirects 301 de SEO, `cleanUrls`, cache agressivo para assets estaticos, headers de seguranca, e scripts de deploy. Alem disso, foram encontrados bugs secundarios: `og-image.png` referenciado em `seo.ts` nao existe, e o `coepPlugin` lista rotas publicas em ingles desatualizadas.

**Evidencias das fases 1 e 2:**
- `firebase.json` existe com hosting + storage + firestore rules
- `.firebaserc` nao existe
- `public/404.html` nao existe (mas headers para `/404.html` ja estao no firebase.json)
- 8 redirects de compatibilidade so existem no react-router (App.tsx), nao no firebase.json
- `cleanUrls` e `trailingSlash` nao configurados
- Sem cache de assets estaticos (hash) com `immutable`
- Sem headers de seguranca (`X-Content-Type-Options`, `Referrer-Policy`)
- `firebase-tools` nao esta nas devDependencies
- Script `deploy` nao existe no package.json
- `seo.ts` referencia `/images/og-image.png` que nao existe (og-image quebrado em todas as paginas)
- `coepPlugin` lista rotas em ingles (`/features`, `/pricing`, etc.) que ja foram renomeadas
- `/blog` listado no coepPlugin mas nao existe no app

## Decisoes Pendentes

### 1. ID do projeto Firebase para `.firebaserc`
- **Opcao A:** Usar o project ID do env (`VITE_FIREBASE_PROJECT_ID`) como alias default
- **Opcao B:** Deixar o campo vazio e preencher manualmente no primeiro deploy
- **Recomendacao:** Opcao B — o `.firebaserc` deve conter o ID real do projeto, que so o Matheus conhece. O plano cria o arquivo com placeholder `SCRIPT_MASTER_PROJECT_ID`.

### 2. Instalar `firebase-tools` como devDependency?
- **Opcao A:** Adicionar como devDependency para padronizar a versao da CLI
- **Opcao B:** Usar apenas como CLI global (cada dev instala)
- **Recomendacao:** Opcao A — garante versionamento e reprodutibilidade.

### 3. Corrigir `og-image.png` (seo.ts) agora ou em plano separado?
- **Opcao A:** Corrigir agora (trocar referencia para `/logo-transparente.webp` que existe)
- **Opcao B:** Deixar para plano separado de SEO
- **Recomendacao:** Opcao A — correcao trivial (1 linha), impacto SEO alto.

### 4. Atualizar `coepPlugin` (rotas desatualizadas) agora ou em plano separado?
- **Opcao A:** Atualizar agora (remover rotas em ingles mortas, adicionar rotas PT)
- **Opcao B:** Deixar para plano separado de refatoracao
- **Recomendacao:** Opcao A — a lista esta desatualizada e pode causar COEP incorreto em dev.

## Decisoes Tomadas

### 1. Redirecionar rotas `/app/*` antigas no firebase.json?
- **Decisao:** NAO adicionar 301 para rotas `/app/*` antigas (`/app/image`, `/app/assistant`, etc.)
- **Justificativa:** Essas rotas sao protegidas (ProtectedRoute), crawlers nao as acessam, e o redirect via react-router ja funciona. 301 server-side adiciona hop desnecessario. Manter apenas no SPA.

### 2. Remover redirects duplicados no react-router apos adicionar 301 no firebase.json?
- **Decisao:** NAO remover agora
- **Justificativa:** Os redirects do react-router servem como fallback client-side (ex: PWA offline, navegacao SPA). Nao causam looping pois o 301 server-side acontece primeiro.

### 3. Usar `cleanUrls: true`?
- **Decisao:** SIM
- **Justificativa:** Boa pratica para SPA. Remove `.html` das URLs automaticamente. Sem risco para este projeto (build Vite gera assets com hash, sem `.html` nas rotas).

## Reutilizacao e Padroes

- **Reutilizar:** `firebase.json` — ajustar, nao recriar (hosting + storage + firestore config ja existem)
- **Reutilizar:** `public/robots.txt` — SEO correto, sem alteracao
- **Reutilizar:** `public/sitemap.xml` — SEO correto, sem alteracao
- **Reutilizar:** `firestore.rules` e `storage.rules` — completos, sem alteracao
- **Reutilizar:** `.env.example` — completo, sem alteracao
- **Reutilizar:** Paleta de tema de `src/theme/tokens.ts` para o `404.html` estatico (cores: `#050816`, `#2E75B6`, `#f8fafc`, `rgba(248, 250, 252, 0.68)`)
- **Reutilizar:** Estrutura visual de `NotFoundPage.tsx` como referencia para `404.html` (card centralizado, icone, titulo, descricao, botao)
- **Reutilizar:** Fontes do `index.html` (Inter, JetBrains Mono, Playfair Display via Google Fonts)
- **Padrao de referencia:** `firebase.json` atual — manter estrutura existente, adicionar novas seccoes
- **Codigo novo:**
  - `public/404.html` — necessario (HTML puro, sem framework, fallback para quando JS falha)
  - `.firebaserc` — necessario (alias de projeto para deploy padronizado)

## Arquivos a Modificar

### Arquivos existentes (ajustar)
- `firebase.json` — adicionar `cleanUrls`, `redirects` (8 rotas publicas 301), header de cache para assets estaticos, headers de seguranca catch-all, reorganizar ordem dos headers
- `package.json` — adicionar `firebase-tools` como devDependency, adicionar scripts `deploy` e `deploy:preview`
- `src/App.tsx` — adicionar redirect `/about` -> `/sobre` (faltando no bloco de redirects de compatibilidade — os outros 7 ja existem)
- `src/lib/seo.ts` — corrigir `DEFAULT_IMAGE` de `/images/og-image.png` para `/logo-transparente.webp`
- `vite.config.ts` — atualizar `coepPlugin` `publicRoutes` (remover rotas em ingles mortas, adicionar rotas PT reais)
- `.gitignore` — adicionar `.firebase/`

### Arquivos novos (criar)
- `.firebaserc` — alias de projeto Firebase (placeholder para ID real)
- `public/404.html` — pagina 404 estatica HTML puro (fallback Firebase Hosting)

## Passos de Implementacao

### Passo 1: Criar `.firebaserc`
- **Descricao:** Criar arquivo `.firebaserc` na raiz com alias `default` apontando para o projeto Firebase. Usar placeholder `SCRIPT_MASTER_PROJECT_ID` que o Matheus substituira pelo ID real.
- **Arquivos:** `.firebaserc` (novo)
- **Resultado:** Deploy funciona sem `--project` flag
- **Sugestao:** `fix-worker` | Notebook: `012fcf05-7f1b-4eec-b450-5b3724f8e882` (Firebase Hosting Docs)

### Passo 2: Criar `public/404.html`
- **Descricao:** Criar pagina 404 estatica em HTML puro. Usar paleta de tema do projeto (fundo `#050816`, texto `#f8fafc`, brand `#2E75B6`). Incluir: meta charset, viewport, `robots: noindex`, `theme-color`, fallback script que redireciona para `/` (para SPA lidar internamente), e link "Voltar ao inicio". NAO usar React/MUI — HTML puro. Incluir fontes Google (Inter) via CDN para consistencia visual.
- **Arquivos:** `public/404.html` (novo)
- **Resultado:** Firebase Hosting serve fallback 404 quando JS falha (offline, erro de CDN, deploy recente)
- **Sugestao:** `fix-worker` | Notebook: `012fcf05-7f1b-4eec-b450-5b3724f8e882` (Firebase Hosting Docs)

### Passo 3: Atualizar `firebase.json`
- **Descricao:** Ajustar a configuracao de hosting com:
  1. Adicionar `"cleanUrls": true` (remove .html das URLs)
  2. Adicionar `"redirects"` com 8 redirects 301 para rotas publicas antigas: `/features` -> `/funcionalidades`, `/pricing` -> `/precos`, `/faq` -> `/perguntas-frequentes`, `/contact` -> `/contato`, `/about` -> `/sobre`, `/register` -> `/cadastro`, `/terms` -> `/termos`, `/privacy` -> `/privacidade`
  3. **CRITICO:** Reorganizar headers na ordem correta. Firebase Hosting avalia headers sequencialmente com **last-wins** (a ultima regra correspondente sobrescreve as anteriores). Portanto, a ordem DEVE ser:
     - **Primeiro (topo):** headers catch-all para assets estaticos (`**/*.@(js|css|svg|webp|png|jpg|woff2|woff)` com `Cache-Control: public, max-age=31536000, immutable`)
     - **Segundo:** headers de seguranca catch-all (`**` com `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`)
     - **Terceiro:** headers especificos por rota (os mais especificos ficam POR ULTIMO para sobrescrever o catch-all quando necessario):
       - `/index.html` — `Cache-Control: no-cache` (sobrescreve o cache immutable do catch-all)
       - `/login` — `Cache-Control: no-cache` (sobrescreve; SEM COEP para Firebase Auth popup)
       - `/cadastro` — `Cache-Control: no-cache` (sobrescreve; SEM COEP para Firebase Auth popup — ja existe no firebase.json atual)
       - `/sw.js` e `/manifest.webmanifest` — `Cache-Control: no-cache` (sobrescreve o cache immutable do catch-all para garantir atualizacoes do service worker)
       - `/app/**` — `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` (sobrescreve)
       - `/404.html` — `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` (sobrescreve)
  4. NAO adicionar 301 para rotas `/app/*` (manter apenas no react-router — rotas protegidas, crawlers nao acessam, redirect client-side ja funciona)
  5. Manter headers existentes para `/login` e `/cadastro` (ja possuem `Cache-Control: no-cache`)
- **Arquivos:** `firebase.json` (ajustar)
- **Resultado:** SEO com redirects 301 corretos, cache agressivo para assets (sem travar PWA), headers de seguranca, ordem last-wins correta
- **Sugestao:** `fix-worker` | Notebook: `012fcf05-7f1b-4eec-b450-5b3724f8e882` (Firebase Hosting Docs)

### Passo 4: Atualizar `package.json` (scripts + devDependencies)
- **Descricao:**
  1. Adicionar `firebase-tools` como devDependency (versao mais recente estavel)
  2. Adicionar scripts:
     - `"deploy": "bun run build && firebase deploy --only hosting"` — build validado + deploy producao
     - `"deploy:preview": "bun run build && firebase hosting:channel:deploy preview"` — build + preview channel
- **Arquivos:** `package.json` (ajustar)
- **Resultado:** Deploy automatizado com build validado (lint + typecheck + vite build)
- **Sugestao:** `fix-worker` | Notebook: `012fcf05-7f1b-4eec-b450-5b3724f8e882` (Firebase Hosting Docs)

### Passo 5: Adicionar redirect `/about` no App.tsx
- **Descricao:** Adicionar `<Route path="/about" element={<Navigate to="/sobre" replace />} />` no bloco de redirects de rotas publicas antigas do App.tsx (entre as linhas 223-231). Esse redirect esta faltando — os outros 7 ja existem. Sem ele, navegacao SPA para `/about` resulta em NotFoundPage.
- **Arquivos:** `src/App.tsx` (ajustar, adicionar 1 linha no bloco de redirects)
- **Resultado:** Consistencia entre redirects firebase.json (301 server-side) e react-router (client-side fallback)
- **Sugestao:** `fix-worker`

### Passo 6: Atualizar `coepPlugin` no `vite.config.ts`
- **Descricao:** Atualizar a lista `publicRoutes` no `coepPlugin`:
  1. Remover rotas em ingles mortas: `/features`, `/pricing`, `/faq`, `/about`, `/contact`
  2. Remover `/blog` (nao existe)
  3. Adicionar rotas PT reais: `/funcionalidades`, `/precos`, `/perguntas-frequentes`, `/sobre`
  4. Manter: `/`, `/login`, `/cadastro`, `/terms`, `/privacy`, `/cookies`, `/status`
- **Arquivos:** `vite.config.ts` (ajustar linhas 25-26)
- **Resultado:** coepPlugin espelha as rotas reais do app em dev
- **Sugestao:** `fix-worker`

### Passo 7: Corrigir `seo.ts` (og-image quebrado)
- **Descricao:** Alterar `DEFAULT_IMAGE` de `${SITE_URL}/images/og-image.png` para `${SITE_URL}/logo-transparente.webp` (arquivo que existe no `public/`). Este bug faz com que todas as paginas publicas tenham og:image 404.
- **Arquivos:** `src/lib/seo.ts` (ajustar linha 7)
- **Resultado:** og:image valido em todas as paginas (SEO social)
- **Sugestao:** `fix-worker`

### Passo 8: Atualizar `.gitignore`
- **Descricao:** Adicionar `.firebase/` ao `.gitignore` (diretorio local do Firebase CLI com cache e debug logs).
- **Arquivos:** `.gitignore` (ajustar)
- **Resultado:** Artefatos locais do Firebase CLI nao sao versionados
- **Sugestao:** `fix-worker`

## Riscos e Mitigacoes

| Risco | Severidade | Mitigacao |
|-------|-----------|-----------|
| `cleanUrls: true` pode interferir com assets estaticos | Baixo | Vite gera assets com hash (sem .html). Testar com `bun run build && bun run preview` apos a mudanca |
| Ordem dos headers pode quebrar COEP ou cache | **Alto** | Firebase Hosting usa **last-wins**: a ultima regra correspondente sobrescreve as anteriores. Catch-all (`**`) DEVE vir primeiro, especificos por ultimo. Ex: `/sw.js` com `no-cache` DEPOIS do catch-all `immutable` sobrescreve para garantir atualizacao do service worker. |
| Cache `immutable` pode travar atualizacoes do PWA service worker | **Alto** | Adicionar header especifico para `/sw.js` e `/manifest.webmanifest` com `Cache-Control: no-cache` DEPOIS do catch-all (last-wins sobrescreve). Isso garante que o service worker sempre seja buscado na versao mais recente. |
| 301 para rotas antigas pode causar redirect loop | Baixo | Nao ha 301 de volta (rotas destino nao redirecionam). Testar manualmente cada redirect |
| `firebase-tools` como devDependency pode conflitar com CLI global | Baixo | Bun resolve prioridade de devDependencies. Se houver conflito, remover do package.json e usar global |
| 404.html estatico pode ser atingido em vez do SPA 404 | Baixo | O rewrite `**` -> `/index.html` sempre intercepta primeiro. 404.html so e servido quando JS falha. Testar navegando para rota inexistente com devtools aberto |
| Mudar og-image pode quebrar compartilhamento social existente | Baixo | O og-image anterior (og-image.png) ja nao existia, entao ja estava quebrado. A correcao so melhora |
| coepPlugin vazio demais pode aplicar COEP em rotas publicas | Medio | Garantir que todas as rotas publicas estejam na lista. A lista atual inclui `/`, `/login`, `/cadastro`, etc. Apos ajuste, verificar com acesso direto a cada rota publica no dev server |

## Verificacao

- [ ] Validação funcional
  - [ ] `bun run build` completa sem erros
  - [ ] `bun run preview` serve o build localmente
  - [ ] Login/logout funciona (COEP nao quebra Firebase Auth)
  - [ ] Navegacao SPA funciona (rotas publicas e protegidas)
  - [ ] Rotas inexistentes mostram NotFoundPage (SPA 404)
  - [ ] Acesso a `/features` redireciona para `/funcionalidades` (301)
  - [ ] Acesso a `/about` redireciona para `/sobre` (301 server-side, Navigate client-side)
  - [ ] Assets estaticos (JS, CSS, imagens) carregam normalmente
- [ ] Validação técnica (lint/type/test)
  - [ ] `bun run lint` sem erros
  - [ ] `bun run typecheck` sem erros
  - [ ] `bun run test` sem regressoes
- [ ] Validação de regressão principal
  - [ ] Nenhum header COEP vaza para `/login` ou `/cadastro` (verificar com DevTools > Network > Response Headers)
  - [ ] `robots.txt` e `sitemap.xml` continuam acessiveis
  - [ ] PWA service worker nao intercepta `/login` ou `/cadastro`
  - [ ] og:image nas paginas publicas aponta para arquivo existente
  - [ ] `/sw.js` e `/manifest.webmanifest` recebem `Cache-Control: no-cache` (nao `immutable`)
  - [ ] Assets estaticos (JS/CSS com hash) recebem `Cache-Control: immutable` (cache agressivo)
  - [ ] `/login` e `/cadastro` SEM headers COEP/COOP (Firebase Auth popup funciona)

## Notebooks Relevantes

| Notebook | ID | Uso |
|----------|----|-----|
| Firebase Hosting Docs | `012fcf05-7f1b-4eec-b450-5b3724f8e882` | Referencia principal para firebase.json, .firebaserc, headers, redirects, deploy |
| Vite 8 Guide | `42336176-1ab5-4b62-9f97-84feefb3d2ec` | Configuracao de build, base URL, cleanUrls |
| Vite PWA Docs | `e7546999-9e94-4dfc-b798-b8150848b342` | Integracao PWA com Firebase Hosting (service worker, navigateFallback) |

## Instrucoes de Execucao

Ao executar este plano, siga este protocolo:

### 1. Investigacao
- Use analyze tools (`suggest_reads`, `impact_analysis`, `file_context`) nos arquivos listados
- Consulte os Notebooks Relevantes acima para confirmar padroes da tecnologia envolvida
- Identifique padroes, dependencias e riscos que o plano nao cobriu
- **ATENCAO:** NAO altere `process.env.DISABLE_HMR` no `vite.config.ts` — embora o AGENTS.md proiba `process.env`, em arquivos de config Vite (`vite.config.ts`) o `process.env` e o padrao correto (contexto Node.js). Apenas ajuste a lista `publicRoutes` no coepPlugin.

### 2. Divisao do Trabalho
- Calcule tokens dos arquivos com `token-counter_token_count` (budget: 40K por agent)
- Agrupe por afinidade — arquivos que se modificam juntos ficam juntos
- Respeite dependencias: quem cria tipo usado por outro vai primeiro
- Nunca dois agents do mesmo lote toquem no mesmo arquivo

**Lotes sugeridos:**
- **Lote 1 (paralelo):** Passo 1 (.firebaserc) + Passo 2 (404.html) + Passo 8 (.gitignore) — arquivos independentes
- **Lote 2 (sequencial apos Lote 1):** Passo 3 (firebase.json) + Passo 4 (package.json) + Passo 5 (App.tsx redirect) — infra de hosting
- **Lote 3 (paralelo apos Lote 2):** Passo 6 (coepPlugin) + Passo 7 (seo.ts) — correcoes pontuais

### 3. Escolha de Agents
Para cada grupo, escolha o agent mais adequado ao contexto:
- `fix-worker` — para todos os passos (ajustes de configuracao, correcoes)
- Nenhum passo requer `builder-worker` (nenhuma feature nova de codigo)
- Nenhum passo requer `vitest-specialist` (mudancas sao em configuracao, nao logica)

As sugestoes nos passos sao pontos de partida — o executor decide com base na investigacao.

### 4. Execucao em Lotes
- Grupos sem dependencia -> executar em paralelo (max 2 por lote)
- Grupos com dependencia -> lotes sequenciais na ordem correta
- Para cada agent, inclua notebook relevante se houver
- Apos cada lote, execute lint + type-check do projeto

### 5. Validacao Pos-lote
- Execute scripts de lint e type-check: `bun run lint && bun run typecheck`
- Corrija sem `eslint-disable`, `@ts-ignore` ou `@ts-expect-error` — corrija a causa raiz
- Repita ate 0 erros e 0 warnings
- Execute `bun run test` para verificar regressoes
