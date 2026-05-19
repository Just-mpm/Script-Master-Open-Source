# Plano de Migracao para Beta Aberto com Creditos e Genkit

## Status

- Estado: aprovado para implementacao futura
- Execucao: ainda nao iniciada
- Objetivo deste documento: servir como plano tecnico e de produto detalhado para a migracao

## Resumo executivo

O projeto vai pausar temporariamente o modelo de assinatura e pagamentos, sem apagar o trabalho de billing ja existente, e passara a operar como um beta aberto com acesso autenticado e uso controlado por creditos mensais.

Ao mesmo tempo, as operacoes de IA deixarao de rodar diretamente no navegador e passarao para o backend em Cloud Functions usando Genkit. Isso resolve o principal problema de seguranca atual: hoje o frontend usa a chave do Gemini no client, o que impede limites realmente confiaveis.

O novo modelo aprovado e este:

- Login obrigatorio para qualquer operacao que consome IA
- Pagina `/precos` convertida em pagina de beta aberto
- Creditos unicos por usuario, renovados por mes-calendario
- Bonus automatico 1x por feedback valido
- Exportacao de video fora do sistema de creditos por enquanto
- Billing/Stripe preservados no repositorio, mas desconectados por flag

---

## Objetivos

### Objetivos principais

- Desligar temporariamente cobranca e assinatura sem destruir a base de billing existente
- Impedir abuso facil no consumo de IA
- Centralizar chamadas de IA no backend
- Criar um sistema de creditos simples para o usuario e controlavel no backend
- Atualizar a comunicacao publica para refletir o beta aberto

### Objetivos secundarios

- Melhorar observabilidade de uso e custo
- Preparar o projeto para voltar a ter monetizacao no futuro
- Diminuir acoplamento entre produto beta e o dominio de billing antigo

### Nao objetivos desta fase

- Refatorar toda a arquitetura de videos
- Implementar billing novo agora
- Fazer cobranca real por credito
- Criar painel administrativo completo
- Travar de forma forte exportacao de video client-side

---

## Decisoes fechadas

### Produto

- O produto sera operado como beta aberto temporario
- Navegacao publica continua acessivel sem login
- Geracoes com IA exigem login
- A rota `/precos` continua existindo, mas deixa de vender planos e passa a explicar o beta

### Limites

- O modelo sera por creditos unicos
- O calculo sera feito por tabela interna baseada no custo real aproximado
- O usuario nao vera tokens crus nem complexidade tecnica
- O reset do saldo sera por mes-calendario
- O bonus por feedback sera um bloco fixo de creditos, concedido uma unica vez

### Backend de IA

- As geracoes migrarao para Cloud Functions
- O motor sera Genkit
- A exposicao para o frontend sera com `onCallGenkit`
- Auth e App Check serao obrigatorios nas operacoes protegidas

### Video

- Exportacao de video nao consumira creditos agora
- Exportacao de video nao tera limite agora
- Isso deve ser tratado explicitamente como excecao temporaria

---

## Problema atual

Hoje o projeto mistura tres coisas diferentes:

- Estrutura de billing e Stripe
- Estrutura parcial de planos e limites na interface
- Chamadas reais de IA acontecendo direto no client

Na pratica:

- Ha codigo de assinatura, checkout e portal
- Ha textos publicos falando de planos, upgrade e pagamento
- Ha utilitarios de plano e uso
- Mas o consumo real da IA nao passa por um backend que controle cota

Consequencia:

- O app consegue mostrar limites na UI, mas nao consegue garanti-los de forma forte
- A chave de IA fica exposta no frontend
- O usuario poderia burlar parte do fluxo alterando o client

---

## Estrategia geral

Vamos separar claramente tres dominios:

1. `billing` legado
2. `beta access / credits`
3. `ai execution backend`

### Billing legado

Continua no repositorio, mas desligado por flag. Nao sera a fonte de verdade do beta.

### Beta access / credits

Novo dominio responsavel por:

- saldo mensal
- bonus
- registro de consumo
- leitura de saldo
- bloqueio por falta de credito

### AI execution backend

Novo dominio responsavel por:

- receber chamada autenticada do frontend
- validar App Check
- reservar credito
- executar o flow Genkit
- confirmar ou reverter consumo

---

## Flags e modo de operacao

Criar configuracoes de runtime para controlar comportamento sem apagar codigo:

### Flags propostas

- `BILLING_ENABLED=false`
- `OPEN_BETA_ENABLED=true`

### Efeito esperado

- Checkout, portal e webhook deixam de ter efeito operacional
- UI de assinatura deixa de aparecer
- Fluxos publicos passam a comunicar beta aberto
- O sistema de creditos vira a unica regra de acesso para IA

---

## Arquitetura alvo com Genkit

## Principios

- Nada de chave Gemini no frontend
- Todos os fluxos caros e sensiveis passam por backend
- Cada caso de uso principal tem seu proprio flow
- Regras de credito ficam em uma camada compartilhada
- Streaming fica disponivel apenas onde agrega valor de UX

## Estrutura sugerida em `functions/src/`

- `index.ts`
  - arquivo apenas de composicao/export
- `genkit/`
  - `genkit.ts`
  - `middlewares/`
  - `schemas/`
  - `utils/`
- `flows/`
  - `assistant.ts`
  - `inline-assistant.ts`
  - `audio.ts`
  - `images.ts`
  - `scene-prompts.ts`
  - `feedback.ts`
- `usage/`
  - `credit-policy.ts`
  - `credit-estimator.ts`
  - `credit-service.ts`
  - `credit-events.ts`
  - `idempotency.ts`
  - `period.ts`
- `billing/`
  - mover helpers de Stripe para isolamento futuro, se necessario

## Inicializacao do Genkit

Criar um ponto unico de inicializacao do `ai` com:

- plugin Google GenAI
- middlewares compartilhados
- configuracao padrao de modelo quando fizer sentido
- utilitarios comuns de contexto e metering

## Exposicao dos flows

Cada flow publico deve ser exposto via `onCallGenkit` com:

- `authPolicy: signedIn()`
- `enforceAppCheck: true`
- `region: 'southamerica-east1'`

## Contexto

O contexto deve propagar:

- `auth.uid`
- metadados da requisicao
- `requestId`
- tipo de operacao
- contexto de uso para medicao

---

## Flows que precisam existir

## 1. Chat principal

Substitui a chamada atual do assistente conversacional.

### Entrada

- mensagem do usuario
- historico relevante
- anexos permitidos
- contexto de estúdio, quando houver

### Saida

- resposta final
- stream de texto parcial
- metadados opcionais

### Observacoes

- streaming habilitado
- suporte a JSON estruturado quando o assistente sugerir ajustes de estúdio

## 2. Inline assistant

Substitui os fluxos de expandir, resumir e reescrever selecoes.

### Entrada

- texto selecionado
- acao solicitada
- contexto opcional

### Saida

- texto transformado
- stream opcional

## 3. Geração de audio TTS

Centraliza:

- chunking do roteiro
- instrucoes de continuidade
- multi-speaker
- emissao de audio

### Entrada

- roteiro
- voice config
- multi-speaker config
- emotion, pace e afins

### Saida

- audio final ou segmentos
- metadados de duracao
- dados necessarios para o pipeline atual

### Observacoes

- manter compatibilidade com o frontend atual o maximo possivel
- o ideal e retornar audio em formato aproveitavel pelo player/pipeline atual

## 4. Geração de imagem

Substitui chamada client-side do Gemini para imagem.

### Entrada

- prompt
- aspect ratio
- imagem de referencia opcional

### Saida

- data URL ou payload equivalente

## 5. Geração de prompts de cena

Substitui `generateScenePrompts`.

### Entrada

- roteiro
- duracao
- densidade
- framework visual
- idioma

### Saida

- array tipado de prompts
- flag de fallback

### Observacoes

- output obrigatoriamente estruturado com schema

## 6. Chunking estruturado

Isolar o chunking como flow utilitario ou subflow, se fizer sentido.

### Entrada

- roteiro
- parametros de segmentacao

### Saida

- lista de chunks validada

## 7. Feedback com bonus

Novo flow autenticado para conceder bonus automatico 1x.

### Entrada

- categoria
- texto do feedback
- contexto opcional da tela

### Saida

- confirmacao
- indicador se bonus foi aplicado
- saldo atualizado opcional

### Regras

- conceder bonus apenas uma vez por usuario
- registrar evento de bonus
- ser idempotente

---

## Dotprompt

Usar Dotprompt para os prompts mais importantes e iterativos:

- system prompt do assistente
- prompt de prompts de cena
- prompt de chunking
- prompt de inline assistant

### Beneficios esperados

- manter prompt fora da logica
- facilitar refinamento sem refatorar codigo
- permitir schemas junto do prompt quando fizer sentido

---

## Modelo de creditos

## Conceito visivel para o usuario

O usuario nao precisa entender tokens, chars de provider nem modalidades internas. Ele vera:

- um saldo mensal de creditos
- um resumo simples de consumo
- um bonus extra por feedback

## Regras aprovadas

- Saldo base mensal: `1000`
- Bonus automatico por feedback valido: `250`
- Renovacao: inicio de cada mes
- Bonus unico por usuario

## Politica de cobranca de credito

### Chat principal / assistant / inline assistant

- `1` credito por faixa de `500` caracteres de entrada
- `1` credito por faixa de `300` caracteres de saida
- minimo de `1` credito por operacao bem-sucedida

### Prompt estruturado / chunking / cenas

- `2` creditos base por chamada
- `+1` credito por item retornado

### Imagem

- `40` creditos por imagem gerada
- `+10` se houver imagem de referencia

### TTS

- `5` creditos base
- `+1` credito por faixa de `120` caracteres efetivamente sintetizados

## Regras de arredondamento

- Arredondar sempre para cima nas faixas
- Nao permitir operacao bem-sucedida com custo zero

## Observacoes de calibragem

Esses numeros sao uma politica inicial de produto, nao uma replica exata do preco do provider.

Na implementacao, a tabela deve ficar centralizada para permitir recalibragem futura sem quebrar o contrato de UX.

---

## Estrategia de medicao

## Principio

O consumo precisa ser calculado no backend em duas fases:

1. estimativa e reserva
2. confirmacao do gasto real

## Por que isso e necessario

- evitar estouro de cota durante a operacao
- impedir corrida entre multiplas chamadas simultaneas
- permitir reverter reserva em caso de erro
- suportar streaming e retries sem cobranca duplicada

## Fluxo de consumo padrao

1. Frontend chama um flow autenticado
2. Backend gera ou recebe `requestId`
3. Backend identifica `operationType`
4. Backend estima custo inicial
5. Backend verifica saldo disponivel
6. Backend cria reserva transacional
7. Flow Genkit executa
8. Backend calcula custo final
9. Backend confirma gasto final
10. Se houve sobra entre reservado e final, devolve diferenca
11. Se houve erro, reverte ou expira reserva

---

## Middleware de metering no Genkit

Criar middleware customizado com `generateMiddleware`.

## Responsabilidades

- inspecionar contexto
- garantir que ha `requestId`
- identificar modelo e operacao
- executar pre-check quando aplicavel
- capturar resposta e metricas
- entregar dados para a camada de confirmacao

## Importante

O middleware nao deve virar regra de negocio demais. A regra de credito continua centralizada em `usage/`.

O middleware deve ser o ponto de interceptacao, nao a camada inteira de negocio.

---

## Persistencia de creditos

## Estrutura aprovada

- `users/{uid}/beta_access/current`
- `users/{uid}/credit_months/{YYYY-MM}`
- `users/{uid}/credit_events/{eventId}`
- `users/{uid}/feedback_rewards/{rewardId}`

## 1. `beta_access/current`

Documento resumido de acesso atual.

### Campos sugeridos

- `status`
- `currentPeriodKey`
- `baseCredits`
- `bonusCredits`
- `availableCredits`
- `usedCredits`
- `updatedAt`
- `feedbackBonusGranted`

## 2. `credit_months/{YYYY-MM}`

Documento agregador do mes.

### Campos obrigatorios

- `periodKey`
- `baseCredits`
- `bonusCredits`
- `reservedCredits`
- `usedCredits`
- `availableCredits`
- `updatedAt`

### Campos de breakdown

- `usage.chatCredits`
- `usage.imageCredits`
- `usage.audioCredits`
- `usage.sceneCredits`
- `usage.inlineCredits`

## 3. `credit_events/{eventId}`

Log de auditoria por operacao.

### Campos

- `requestId`
- `flowName`
- `operationType`
- `status`
- `estimatedCredits`
- `finalCredits`
- `model`
- `inputSize`
- `outputSize`
- `createdAt`
- `finishedAt`
- `errorCode` opcional

## 4. `feedback_rewards/{rewardId}`

Garantia de bonus unico.

### Campos

- `rewardType`
- `grantedCredits`
- `source`
- `createdAt`
- `requestId`

---

## Idempotencia

## Regra

Toda operacao que possa consumir credito deve ter um `requestId` unico.

## Objetivos

- evitar cobranca dupla em retry
- suportar repeticao acidental de chamadas
- auditar correlacao entre request e evento de consumo

## Estrategia

- frontend envia `requestId` quando a acao nasce na UI
- backend gera fallback se nao vier
- confirmacao final verifica se o `requestId` ja foi processado

## Feedback bonus

O bonus nao pode depender so do requestId. Deve tambem haver regra de negocio:

- se o usuario ja recebeu bonus de feedback, nao recebe de novo

---

## Auth e App Check

## Regras

- Nenhum flow caro ou sensivel sem auth
- Nenhum flow caro ou sensivel sem App Check

## Consequencias para o frontend

- Visitante pode navegar
- Visitante nao pode gerar audio, imagem, chat nem usar bonus
- Usuario logado passa a usar IA somente via callable/backend

## Observacao

Como App Check ainda nao esta visivel no codigo encontrado, essa camada precisara ser introduzida no app web e validada no backend.

---

## Firestore Rules

## Estado desejado

Usuario:

- pode ler resumo do proprio acesso beta e saldo
- pode ler o proprio historico se fizer sentido
- nao pode alterar contadores, bonus nem eventos

Backend/Admin SDK:

- unica origem de escrita para creditos e eventos

## Ajustes previstos

- manter `users/{uid}/subscription` protegido
- adicionar regras de leitura para `beta_access` e `credit_months`
- negar escrita client-side nessas colecoes

---

## Billing legado

## O que fazer

- preservar codigo
- desconectar da experiencia ativa
- impedir efeitos colaterais

## Arquivos impactados

- [functions/src/index.ts](D:/Pictures/ProgML/Script-Master/functions/src/index.ts)
- [src/features/billing/store/useBillingStore.ts](D:/Pictures/ProgML/Script-Master/src/features/billing/store/useBillingStore.ts)
- [src/features/billing/hooks/useBillingInit.ts](D:/Pictures/ProgML/Script-Master/src/features/billing/hooks/useBillingInit.ts)
- [src/components/Header.tsx](D:/Pictures/ProgML/Script-Master/src/components/Header.tsx)
- [src/lib/stripe.ts](D:/Pictures/ProgML/Script-Master/src/lib/stripe.ts)

## Comportamento desejado

- webhook pode continuar deployado, mas sem papel no produto beta
- checkout e portal devem ficar inativos por flag
- Header nao deve mostrar badge de plano
- dialogos de upgrade nao devem aparecer

---

## Migracao do frontend

## Areas principais

### Assistente

Migrar:

- [src/hooks/useAssistant.ts](D:/Pictures/ProgML/Script-Master/src/hooks/useAssistant.ts)
- [src/hooks/useInlineAssistant.ts](D:/Pictures/ProgML/Script-Master/src/hooks/useInlineAssistant.ts)

Troca principal:

- sai `GoogleGenAI` no client
- entra chamada para flow backend

### Audio

Migrar:

- [src/hooks/useAudioGenerator.ts](D:/Pictures/ProgML/Script-Master/src/hooks/useAudioGenerator.ts)

Pontos de atencao:

- chunking
- multi-speaker
- continuidade entre chunks
- compatibilidade com o pipeline atual de audio e cenas

### Imagem

Migrar:

- [src/hooks/useImageGenerator.ts](D:/Pictures/ProgML/Script-Master/src/hooks/useImageGenerator.ts)
- [src/lib/gemini.ts](D:/Pictures/ProgML/Script-Master/src/lib/gemini.ts)

### Leitura de saldo

Adicionar no frontend:

- leitura do resumo de creditos do usuario
- mensagens claras de saldo baixo
- erro amigavel quando o saldo acabar

---

## Feedback com bonus

## Estado atual

A pagina de contato hoje usa `mailto` como fallback simples.

Arquivo principal:

- [src/pages/public/ContactPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/public/ContactPage.tsx)

## Decisao

O bonus nao pode ser concedido por esse formulario publico.

## Novo desenho

- manter contato publico para comunicacao geral
- criar fluxo autenticado de feedback dentro da area logada
- esse fluxo e o unico que pode conceder bonus

## Regra de bonus

- 1 bonus por usuario
- bonus fixo
- exige feedback valido
- precisa registrar evento e prova de concessao

## Validacao minima de feedback

Definir criterios simples para evitar abuso trivial:

- categoria obrigatoria
- texto com comprimento minimo
- nao conceder bonus em mensagem vazia ou automatizada demais

---

## Comunicacao publica e textos

## Pagina `/precos`

Transformar em pagina de beta aberto.

### Mensagens que precisam aparecer

- o produto esta em beta aberto temporario
- uso de IA exige login
- cada usuario recebe creditos mensais
- feedback pode liberar um bonus unico
- pagamentos e assinaturas estao pausados

### O que deve sair

- mensal/anual
- comparacao Free/Pro/Business
- precos
- desconto anual
- CTA de assinatura
- FAQ de cancelamento/upgrade/pagamento
- JSON-LD com `Offer`

## Arquivos de texto e i18n

Revisar:

- [src/data/pricingFaq.ts](D:/Pictures/ProgML/Script-Master/src/data/pricingFaq.ts)
- [src/features/i18n/locales/pt-BR.ts](D:/Pictures/ProgML/Script-Master/src/features/i18n/locales/pt-BR.ts)
- [src/features/i18n/locales/en.ts](D:/Pictures/ProgML/Script-Master/src/features/i18n/locales/en.ts)
- [src/features/i18n/locales/es.ts](D:/Pictures/ProgML/Script-Master/src/features/i18n/locales/es.ts)

## Login e cadastro

Atualizar os textos de:

- [src/pages/LoginPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/LoginPage.tsx)
- [src/pages/RegisterPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/RegisterPage.tsx)

### Exemplo de direcao

Trocar promessas como:

- "sem limites"

Por mensagens como:

- "beta aberto"
- "comece gratis"
- "creditos mensais inclusos"

## Header e footer publicos

Revisar:

- [src/components/public/PublicHeader.tsx](D:/Pictures/ProgML/Script-Master/src/components/public/PublicHeader.tsx)
- [src/components/public/PublicFooter.tsx](D:/Pictures/ProgML/Script-Master/src/components/public/PublicFooter.tsx)

O link `/precos` pode continuar, mas com significado de beta e nao de assinatura.

---

## Paginas legais

## Privacy

Revisar:

- [src/pages/public/PrivacyPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/public/PrivacyPage.tsx)

### Ajustes esperados

- reduzir ou neutralizar referencia a pagamento se estiver pausado
- manter texto juridicamente seguro sem prometer algo inexistente

## Terms

Revisar:

- [src/pages/public/TermsPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/public/TermsPage.tsx)

### Ajustes esperados

- trocar "limites do plano escolhido" por linguagem neutra ou "limites do beta"

---

## Variaveis de ambiente

## Frontend

### Atual

- [`.env.example`](D:/Pictures/ProgML/Script-Master/.env.example) expõe `VITE_GEMINI_API_KEY`

### Futuro desejado

- frontend deixa de depender dessa chave para operacoes de IA
- manter apenas configs publicas necessarias do Firebase e outras APIs publicas

## Backend

### Atual

- [functions/.env.example](D:/Pictures/ProgML/Script-Master/functions/.env.example) contem apenas Stripe

### Futuro desejado

Adicionar placeholders e documentacao para:

- segredo do provider de IA usado pelo Genkit
- flags de billing/beta
- configuracoes de credito, se forem parametrizadas

---

## Observabilidade

## Objetivos

- saber quanto cada flow esta consumindo
- detectar abuso
- detectar falhas por modelo
- reconciliar custo e creditos

## Com Genkit

Usar metricas e traces para observar:

- `flow_name`
- `model`
- latencia
- erros
- volume de chamadas

## Camada de produto

Persistir eventos de credito no Firestore para:

- auditoria de usuario
- suporte
- debug
- validacao de idempotencia

---

## Riscos e mitigacoes

## 1. Custo inesperado apos migracao

### Risco

Mesmo com creditos, o custo real pode ficar desbalanceado.

### Mitigacao

- tabela centralizada
- observabilidade por flow
- capacidade de recalibrar politicas sem mudar UX externa

## 2. Regressao de UX no streaming do assistente

### Risco

Streaming piorar ou ficar mais lento.

### Mitigacao

- usar streaming nativo do Genkit apenas nos fluxos de chat
- manter estados de UI atuais o maximo possivel

## 3. Cobranca duplicada em retry

### Risco

Retry interno ou repeticao de request gerar consumo duplo.

### Mitigacao

- `requestId`
- eventos idempotentes
- reserva + confirmacao

## 4. App Check nao implementado corretamente

### Risco

Backend protegido de forma incompleta.

### Mitigacao

- implementar no client e validar nos flows
- tratar isso como requisito obrigatorio da migracao

## 5. Video ainda sem trava forte

### Risco

Usuario abusar de exportacao de video fora do sistema de creditos.

### Mitigacao

- nao comunicar video como protegido por credito
- tratar como excecao temporaria
- revisar depois em uma fase propria

---

## Estrategia de implementacao sugerida

## Fase 1. Preparacao do backend

- adicionar Genkit
- criar estrutura de pastas
- criar fluxo de teste protegido por auth e App Check
- preparar segredos e envs

## Fase 2. Dominio de creditos

- criar modelos de dados
- criar servico de periodo mensal
- criar reserva/confirmacao/reversao
- criar idempotencia

## Fase 3. Migrar fluxos de IA

- assistant
- inline assistant
- prompts de cena/chunking
- imagem
- TTS

## Fase 4. Integrar frontend

- trocar chamadas client-side por flows
- adicionar leitura de saldo
- adicionar mensagens de bloqueio

## Fase 5. Pausar billing visivel

- esconder badge
- esconder upgrade
- desativar checkout/portal
- ligar flags

## Fase 6. Atualizar textos

- pagina beta
- i18n
- login/cadastro
- FAQ
- paginas legais

## Fase 7. Testes e calibragem

- testes unitarios
- testes de functions
- validacao de App Check
- observabilidade
- ajuste de tabela de creditos

---

## Testes previstos

## Backend

- usuario sem login
- usuario com login sem App Check
- saldo suficiente
- saldo insuficiente
- duas chamadas simultaneas
- reversao de reserva em erro
- confirmacao de gasto menor que reserva
- confirmacao de gasto maior que estimativa, se permitido pela politica
- bonus concedido uma unica vez
- reset mensal correto

## Frontend

- visitante bloqueado para operacoes IA
- usuario logado consome saldo
- saldo exibido corretamente
- mensagens de erro amigaveis
- pagina `/precos` nova
- nenhum CTA de assinatura ativo

## Conteudo

- revisao manual dos tres idiomas
- revisao de consistencia juridica minima

---

## Arquivos que certamente entram no escopo

### Backend

- [functions/package.json](D:/Pictures/ProgML/Script-Master/functions/package.json)
- [functions/src/index.ts](D:/Pictures/ProgML/Script-Master/functions/src/index.ts)
- [functions/.env.example](D:/Pictures/ProgML/Script-Master/functions/.env.example)

### Frontend IA

- [src/hooks/useAssistant.ts](D:/Pictures/ProgML/Script-Master/src/hooks/useAssistant.ts)
- [src/hooks/useInlineAssistant.ts](D:/Pictures/ProgML/Script-Master/src/hooks/useInlineAssistant.ts)
- [src/hooks/useAudioGenerator.ts](D:/Pictures/ProgML/Script-Master/src/hooks/useAudioGenerator.ts)
- [src/hooks/useImageGenerator.ts](D:/Pictures/ProgML/Script-Master/src/hooks/useImageGenerator.ts)
- [src/lib/gemini.ts](D:/Pictures/ProgML/Script-Master/src/lib/gemini.ts)
- [src/lib/env.ts](D:/Pictures/ProgML/Script-Master/src/lib/env.ts)

### Billing/UI

- [src/contexts/AuthContext.tsx](D:/Pictures/ProgML/Script-Master/src/contexts/AuthContext.tsx)
- [src/components/Header.tsx](D:/Pictures/ProgML/Script-Master/src/components/Header.tsx)
- [src/features/billing/hooks/useBillingInit.ts](D:/Pictures/ProgML/Script-Master/src/features/billing/hooks/useBillingInit.ts)
- [src/lib/stripe.ts](D:/Pictures/ProgML/Script-Master/src/lib/stripe.ts)

### Publico e textos

- [src/pages/public/PricingPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/public/PricingPage.tsx)
- [src/data/pricingFaq.ts](D:/Pictures/ProgML/Script-Master/src/data/pricingFaq.ts)
- [src/features/i18n/locales/pt-BR.ts](D:/Pictures/ProgML/Script-Master/src/features/i18n/locales/pt-BR.ts)
- [src/features/i18n/locales/en.ts](D:/Pictures/ProgML/Script-Master/src/features/i18n/locales/en.ts)
- [src/features/i18n/locales/es.ts](D:/Pictures/ProgML/Script-Master/src/features/i18n/locales/es.ts)
- [src/pages/LoginPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/LoginPage.tsx)
- [src/pages/RegisterPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/RegisterPage.tsx)
- [src/pages/public/ContactPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/public/ContactPage.tsx)
- [src/pages/public/PrivacyPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/public/PrivacyPage.tsx)
- [src/pages/public/TermsPage.tsx](D:/Pictures/ProgML/Script-Master/src/pages/public/TermsPage.tsx)
- [src/components/public/PublicHeader.tsx](D:/Pictures/ProgML/Script-Master/src/components/public/PublicHeader.tsx)
- [src/components/public/PublicFooter.tsx](D:/Pictures/ProgML/Script-Master/src/components/public/PublicFooter.tsx)

### Regras

- [firestore.rules](D:/Pictures/ProgML/Script-Master/firestore.rules)

---

## Pendencias explicitas para a fase de execucao

- Definir nomes finais dos documentos/colecoes de credito
- Definir se a leitura do saldo vira store dedicada ou leitura local por pagina
- Validar formato final de retorno do TTS para compatibilidade total com o player
- Validar implementacao de App Check no app web
- Calibrar a tabela inicial de creditos apos observacao real de custo

---

## Conclusao

Este plano muda o projeto de um modelo com billing visivel, mas limites fracos, para um beta aberto com controle real no backend.

O ponto central da migracao nao e apenas trocar UI de planos por UI de beta. O centro da mudanca e:

- tirar a IA do navegador
- colocar Genkit + Cloud Functions como motor oficial
- introduzir uma camada unica de medicao e credito
- comunicar isso de forma simples para o usuario

Com isso, o produto fica mais seguro, mais observavel e melhor preparado para reativar monetizacao no futuro sem recomeçar do zero.
