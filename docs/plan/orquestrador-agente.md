# Plano Arquitetural — Orquestrador Agente (Harness Engineer)

> **Data:** 2026-05-27
> **Versão:** 0.2.0 (unificado)
> **Autor:** Matheus & Nexus
> **Contexto:** Script Master — SPA de produção de roteiro/áudio/vídeo com Firebase + Genkit + Gemini
> **Este documento unifica o plano arquitetural e a análise de impacto.**

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Problema Atual](#2-problema-atual)
3. [Arquitetura Proposta](#3-arquitetura-proposta)
4. [Catálogo de Ferramentas](#4-catálogo-de-ferramentas)
5. [Componente TODO List](#5-componente-todo-list)
6. [Fluxos de Execução](#6-fluxos-de-execução)
7. [Plano de Implementação (Fases)](#7-plano-de-implementação-fases)
8. [Decisões de Design](#8-decisões-de-design)
9. [Decisões Técnicas](#9-decisões-técnicas)
10. [Análise de Impacto](#10-análise-de-impacto)
11. [Mapa de Arquivos Afetados](#11-mapa-de-arquivos-afetados)
12. [Riscos e Mitigações](#12-riscos-e-mitigações)
13. [Glossário](#13-glossário)
14. [Apêndices](#14-apêndices)

---

## 1. Visão Geral

### 1.1 O Que É

Um **orquestrador central de IA** que substitui o modelo atual de múltiplos flows isolados por **um único agente** que:

- Tem acesso a **ferramentas** (tools) para pesquisar, consultar, criar e modificar
- Executa um **loop autônomo de raciocínio**: pensa → usa ferramenta → processa resultado → decide próximo passo
- Mantém **transparência total** com o usuário via uma **TODO list** que mostra o plano e o progresso em tempo real
- Pode **perguntar ao usuário** quando faltar informação
- Só **responde** depois de coletar todas as informações necessárias

### 1.2 Princípios

| Princípio | Descrição |
|-----------|-----------|
| **Uma chamada só** | Frontend chama uma única vez; o modelo decide o que fazer |
| **Tool-first** | Modelo é forçado a usar ferramentas antes de responder |
| **Transparência** | Usuário vê o plano e o progresso em tempo real |
| **Tolerância a falhas** | Se uma ferramenta falha, o modelo tenta outro caminho |
| **Extensível** | Nova funcionalidade = nova tool, sem mexer na arquitetura |
| **Type-safe** | Todas as ferramentas têm schema Zod/Genkit forte |

### 1.3 Inspiração

O padrão arquitetural é inspirado diretamente no **OpenCode**, que usa:

- Um agente primário com tools (`todowrite`, `question`, `task`, `websearch`, etc.)
- TODO list como mecanismo de planejamento e visibilidade
- Tool `question` para interromper e perguntar ao usuário
- Sub-agentes delegados via tool `task` para tarefas especializadas

---

## 2. Problema Atual

### 2.1 Arquitetura Atual (Flow-based)

```
Frontend                          Backend (Cloud Functions)
─────────                         ─────────────────────────
                                    ┌──────────────┐
  assistant() ───────────────────►  │  assistant   │ (chat streaming)
                                    └──────────────┘
                                    ┌──────────────┐
  images() ───────────────────────►  │   images     │ (gerar imagem)
                                    └──────────────┘
                                    ┌──────────────┐
  scenePrompts() ─────────────────►  │scene-prompts │ (gerar cenas)
                                    └──────────────┘
                                    ┌──────────────┐
  audio() ────────────────────────►  │    audio     │ (TTS)
                                    └──────────────┘
                                    ┌──────────────┐
  [...mais 6 flows] ─────────────►  │  ...others   │
                                    └──────────────┘
```

### 2.2 Fluxo Atual do Assistente ("Aplicar JSON")

O diagrama abaixo detalha como o assistente atualmente lida com a aplicação de configurações no estúdio — o fluxo que será substituído pelo orquestrador:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FLUXO ATUAL (ANTES)                                │
│                                                                         │
│  BACKEND                               FRONTEND                         │
│  ───────                               ───────                          │
│                                                                         │
│  assistant.ts                           useAssistant.ts                  │
│  ┌─────────────────┐                   ┌──────────────────┐             │
│  │ 1. Gera texto    │                  │ 1. Envia msg     │             │
│  │    com ```json   │◄────────stream───│ 2. Recebe chunks │             │
│  │    embutido      │───chunks────────►│ 3. Monta texto   │             │
│  │                  │                  │                  │             │
│  │ 2. Extrai JSON   │                  │ AssistantMessages              │
│  │    no final      │                  │ ┌──────────────┐ │             │
│  │ 3. Retorna       │                  │ │ Detecta JSON │ │             │
│  │    jsonSettings  │──finalData──────►│ │ Mostra botão │ │             │
│  └─────────────────┘                  │ │ "Aplicar"    │ │             │
│                                        │ └──────┬───────┘ │             │
│                                        └────────┼─────────┘             │
│                                                 │                       │
│                                        Assistant.ts                     │
│                                        ┌────────┴────────┐              │
│                                        │ onApplySettings │              │
│                                        └────────┬────────┘              │
│                                                 │                       │
│                                        AssistantPage.tsx                │
│                                        ┌────────┴────────┐              │
│                                        │ applySettings   │              │
│                                        │ (studioStore)   │              │
│                                        └────────┬────────┘              │
│                                                 │                       │
│                                        studioStore.ts                   │
│                                        ┌────────┴────────┐              │
│                                        │ set({ ...patch })│              │
│                                        └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Problemas Identificados

1. **Assistente não executa — só sugere.** O usuário pergunta "cria uma imagem de..." e o assistente responde "claro, clique aqui para..." — o frontend precisa chamar outro flow.
2. **Sem planejamento.** O modelo não cria um plano, não mostra progresso, não encadeia passos.
3. **Contexto perdido entre flows.** Cada flow começa do zero — não sabe o que o outro fez.
4. **Frontend orquestrando.** Quem decide qual flow chamar é o frontend, não a IA.
5. **Múltiplos schemas de input/output.** Cada flow tem seu próprio contrato.

---

## 3. Arquitetura Proposta

### 3.1 Visão Geral

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                              │
│                                                                      │
│  ┌──────────────┐     ┌──────────────────────┐                      │
│  │ Chat UI      │     │   TODO List Widget    │                      │
│  │ (mensagens)  │     │ (tarefas em tempo     │                      │
│  │              │     │  real, status, tools) │                      │
│  └──────┬───────┘     └──────────────────────┘                      │
│         │                        ▲                                   │
│         │  orquestrador()        │  Stream de updates da TODO        │
│         ▼                        │                                   │
└─────────┴────────────────────────┴──────────────────────────────────┘
          │                        │
          ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Cloud Function)                         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              FLOW ORQUESTRADOR                                │    │
│  │                                                               │    │
│  │  ┌──────────┐     ┌──────────────────────────────────────┐   │    │
│  │  │ System   │     │      Genkit Tool Loop                │   │    │
│  │  │ Prompt   │     │                                      │   │    │
│  │  │ (regras, │     │  ┌──────────┐  ┌──────────┐         │   │    │
│  │  │  ident.) │     │  │ updatePlan│  │ webSearch │         │   │    │
│  │  └──────────┘     │  └──────────┘  └──────────┘         │   │    │
│  │                   │  ┌──────────┐  ┌──────────┐         │   │    │
│  │  ┌──────────┐     │  │ interview│  │getStudio │         │   │    │
│  │  │ Modelo   │────►│  │          │  │ State    │         │   │    │
│  │  │ Gemini   │◄────│  └──────────┘  └──────────┘         │   │    │
│  │  │ 3.5 Flash│     │  ┌──────────┐  ┌──────────┐         │   │    │
│  │  └──────────┘     │  │getMemories│  │generate  │         │   │    │
│  │                   │  │          │  │ Image    │         │   │    │
│  │                   │  └──────────┘  └──────────┘         │   │    │
│  │                   │  ┌──────────┐  ┌──────────┐         │   │    │
│  │                   │  │update    │  │ respond  │         │   │    │
│  │                   │  │ Studio   │  │ (final)  │         │   │    │
│  │                   │  └──────────┘  └──────────┘         │   │    │
│  │                   └──────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────┐  ┌──────────┐                                        │
│  │ Firestore│  │  Gemini  │                                        │
│  │ (dados)  │  │  Search  │                                        │
│  └──────────┘  └──────────┘                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 O Ciclo de Tool Calling (Genkit Loop)

O Genkit gerencia automaticamente o loop de tool calling:

```
1. Frontend envia: "Cria um vídeo sobre dinossauros"
       │
2. Genkit.invoke() com tools
       │
3. Modelo Gemini recebe prompt + tools
       │
4. Modelo decide: "Preciso pesquisar antes"
       │
5. Modelo retorna ToolCall(webSearch, {query: "..."})
       │
6. Genkit EXECUTA a função webSearch
       │
7. Genkit envia resultado DE VOLTA pro modelo
       │
8. Modelo processa resultado → decide próximo passo
       │
9. Se precisar de mais info → volta ao passo 5
   Se tiver tudo → resposta final
       │
10. Retorna texto + metadados pro frontend
```

**O Genkit faz os passos 6-7 automaticamente** — não precisamos escrever o loop.

### 3.3 Modo de Tool Calling: AUTO vs. ANY

O Gemini oferece dois modos de function calling relevantes:

| Modo | Comportamento |
|------|---------------|
| `AUTO` (padrão) | O modelo decide entre gerar texto ou chamar tools |
| `ANY` | O modelo é **forçado** a sempre chamar tools — nunca gera texto |

**Decisão: Começamos com `AUTO`**, não `ANY`. Motivos:

1. **Simplicidade:** O modelo pode "pensar em voz alta" entre as tools ("Deixa eu pesquisar...", "Interessante!"). Isso melhora a UX.
2. **Menos risco:** `ANY` exige uma tool `respond` como única saída. Se o modelo esquecer de chamá-la, o loop nunca termina.
3. **System prompt bem escrito:** Com instruções claras ("antes de responder, SEMPRE use as ferramentas necessárias"), o modelo já usa tools consistentemente.

**Reserva:** Se durante os testes o modelo ignorar tools com frequência, ativamos `mode: ANY` + tool `respond` como plano B.

**Exemplo de como o modelo se comporta com AUTO:**

```
Usuário: "Analisa meu roteiro e sugere melhorias"

1. Modelo: "Deixa eu ver o que você tem no estúdio..." → getStudioState()
2. Modelo: "E pesquisar técnicas de storytelling..." → webSearch("storytelling 2026")
3. Modelo: "Ótimas referências! Vou escrever as sugestões..."
4. Modelo: "Pronto! 3 sugestões baseadas nas pesquisas..." → [texto final]
```

---

## 4. Catálogo de Ferramentas

### 4.1 `updatePlan` — Criar/Atualizar Plano de Tarefas

**Descrição:** Cria ou atualiza a lista de tarefas que o orquestrador está executando. Cada tarefa tem subtarefas, status, prioridade, dependências e ferramentas associadas. Use esta ferramenta para mostrar ao usuário o que está sendo feito em tempo real.

**Schema:**
```typescript
const SubtaskSchema = z.object({
  id: z.string().describe("ID único da subtarefa (ex: '1.1', '1.2')"),
  title: z.string().describe("Título curto da subtarefa"),
  description: z.string().optional().describe("Descrição detalhada"),
  status: z.enum(["pending", "in_progress", "completed", "failed", "need_help"])
    .describe("Status atual"),
  priority: z.enum(["high", "medium", "low"]).describe("Prioridade"),
  tools: z.array(z.string()).optional()
    .describe("Ferramentas planejadas para executar esta subtarefa"),
});

const TaskSchema = z.object({
  id: z.string().describe("ID único da tarefa principal"),
  title: z.string().describe("Título da tarefa principal"),
  description: z.string().optional().describe("Descrição"),
  status: z.enum(["pending", "in_progress", "completed", "failed", "need_help"]),
  priority: z.enum(["high", "medium", "low"]),
  level: z.number().describe("Nível hierárquico: 0 = principal, 1 = dependente"),
  dependencies: z.array(z.string()).describe("IDs das tarefas das quais esta depende"),
  subtasks: z.array(SubtaskSchema),
});

const UpdatePlanInput = z.object({
  plan: z.array(TaskSchema).describe("Lista completa de tarefas (substitui a anterior)"),
});
```

**Comportamento:**
- Substitui COMPLETAMENTE o plano anterior (não é merge)
- O modelo deve SEMPRE incluir todas as tarefas, com status atualizados
- O frontend renderiza a diferença visualmente (animações de entrada/saída)

**Quando usar:** No início da interação para criar o plano; após cada passo para atualizar status.

---

### 4.2 `webSearch` — Pesquisa na Web

**Descrição:** Pesquisa informações atualizadas na web usando Google Search Grounding. Use quando o usuário perguntar sobre tópicos atuais, tendências, fatos específicos, ou quando precisar de informação que o modelo não tem no treinamento.

**Schema:**
```typescript
const WebSearchInput = z.object({
  query: z.string().describe("Termo de busca na web"),
  numResults: z.number().optional().describe("Número de resultados (default: 5)"),
});
```

**Implementação:** Usar Google Search Grounding nativo do Gemini através do config:
```typescript
config: {
  googleSearchRetrieval: {
    dynamicRetrievalConfig: {
      mode: 'MODE_DYNAMIC',
      dynamicThreshold: 0.7,
    },
  },
}
```

**Retorna:** Resultados da busca com snippets, títulos e URLs.

---

### 4.3 `getStudioState` — Consultar Estado do Estúdio

**Descrição:** Obtém o estado atual do estúdio de produção do usuário: roteiro, voz selecionada, configurações de cena, ritmo, emoção, etc. Use quando o usuário perguntar sobre o projeto atual ou quando precisar entender o contexto antes de sugerir alterações.

**Schema:**
```typescript
const GetStudioStateInput = z.object({
  fields: z.array(z.string()).optional()
    .describe("Campos específicos para buscar (ex: ['script', 'voice']). Vazio = todos."),
});
```

**Retorna:** Objeto com os campos atuais do estúdio (script, selectedVoice, pace, emotion, scene, visualFramework, etc.).

**Nota:** Diferente do modelo atual (que injeta tudo no system prompt), aqui o modelo **decide** se precisa dessa informação.

---

### 4.4 `getUserMemories` — Consultar Memórias do Usuário

**Descrição:** Acessa as memórias persistentes do usuário. Pode listar previews (modo `list`) ou expandir uma memória específica (modo `expand`). Use para lembrar preferências, projetos passados e contexto histórico do usuário.

**Schema:**
```typescript
const GetMemoriesInput = z.object({
  action: z.enum(["list", "expand", "search"]),
  memoryId: z.string().optional()
    .describe("ID da memória (obrigatório se action='expand')"),
  query: z.string().optional()
    .describe("Termo de busca textual (opcional em action='search')"),
});
```

**Estratégia de preview:**
- `list`: retorna apenas `id` + primeiros 80 caracteres de cada memória
- `expand(id)`: retorna o conteúdo completo da memória
- `search(query)`: busca textual nas memórias

Isso economiza tokens — o modelo vê os previews e só expande o que parecer relevante.

---

### 4.5 `interview` — Perguntar ao Usuário

**Descrição:** Faz uma pergunta ao usuário durante a execução. Use quando faltar informação essencial, quando houver ambiguidade, ou quando precisar de uma decisão do usuário antes de prosseguir. O modelo PÁRA e aguarda a resposta.

**Schema:**
```typescript
const InterviewInput = z.object({
  question: z.string().describe("Pergunta clara e direta ao usuário"),
  options: z.array(z.object({
    label: z.string().describe("Texto da opção (máx 5 palavras)"),
    description: z.string().describe("Explicação da escolha"),
  })).optional().describe("Opções pré-definidas para o usuário escolher"),
  multiple: z.boolean().optional()
    .describe("Se permite selecionar múltiplas opções (default: false)"),
});
```

**Implementação via Genkit Interrupts:**
```typescript
const interviewTool = ai.defineTool({
  name: 'interview',
  // ...
}, async (input) => {
  // Genkit interrupt — pausa o loop e retorna controle
  return ai.interrupt({
    type: 'question',
    question: input.question,
    options: input.options,
  });
});
```

**Fluxo:**
1. Modelo chama `interview()`
2. Genkit pausa o loop (interrupt)
3. Backend retorna estado especial pro frontend: `{ status: "awaiting_input", question: "..." }`
4. Frontend exibe UI de pergunta
5. Usuário responde
6. Frontend envia resposta → Genkit retoma o loop
7. Modelo processa a resposta e continua

---

### 4.6 `updateStudio` — Enviar Conteúdo para o Estúdio

**Descrição:** Aplica configurações diretamente no estúdio do usuário. Pode definir roteiro, voz, ritmo, emoção, cenas e outras preferências. Substitui o bloco JSON que o assistente atualmente sugere — agora ele aplica diretamente e o frontend reflete as mudanças.

**Schema:**
```typescript
const UpdateStudioInput = z.object({
  script: z.string().optional().describe("Roteiro completo para o editor"),
  selectedVoice: z.string().optional().describe("ID da voz (ex: 'Leda', 'Zephyr')"),
  pace: z.enum(["very_slow", "slow", "normal", "fast", "very_fast"]).optional()
    .describe("Ritmo de narração"),
  emotion: z.enum(["neutral", "happy", "sad", "angry", "calm", "energetic", "dramatic", "friendly"])
    .optional().describe("Emoção para o TTS"),
  emotionIntensity: z.number().min(0).max(1).optional()
    .describe("Intensidade da emoção (0 a 1)"),
  scene: z.string().optional().describe("Descrição do ambiente/cena"),
  styleNotes: z.string().optional().describe("Notas de direção/estilo"),
  isMultiSpeaker: z.boolean().optional().describe("Ativar modo multi-locutor"),
  speakerAName: z.string().optional().describe("Nome do locutor A"),
  speakerBName: z.string().optional().describe("Nome do locutor B"),
  speakerBVoice: z.string().optional().describe("Voz do locutor B"),
  generateScenes: z.boolean().optional().describe("Gerar cenas visuais"),
  sceneRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]).optional()
    .describe("Proporção das cenas"),
  sceneDensity: z.number().min(5).max(60).optional()
    .describe("Densidade de cenas em segundos"),
  visualFramework: z.enum(["general", "whiteboard"]).optional()
    .describe("Framework visual"),
  imageTextLanguage: z.enum(["pt-BR", "en", "es"]).optional()
    .describe("Idioma dos textos nas imagens"),
});
```

**Comportamento:**
- Faz merge com as configurações atuais (não substitui tudo)
- Retorna o diff aplicado para feedback visual
- O frontend reflete as mudanças em tempo real
- O usuário mantém controle total (pode desfazer/editar)

**Quando usar:** Depois de pesquisar e decidir configurações ideais. Ex: "Baseado na sua pesquisa, apliquei a voz Leda com tom calmo..."

**Preview de confirmação (D1):** O modelo sugere → frontend mostra preview → usuário confirma ou rejeita. Não aplica automaticamente. Ver [Decisão de Design D1](#d1-updatestudio-com-preview-de-confirmação).

---

### 4.7 `respond` — Resposta Final (Tool para modo ANY)

**Descrição:** Tool obrigatória para entregar a resposta final ao usuário quando operando em `mode: ANY`. É a ÚNICA forma do modelo se comunicar com o usuário depois de processar todas as ferramentas necessárias.

**Schema:**
```typescript
const RespondInput = z.object({
  text: z.string().describe("Resposta final em markdown para o usuário"),
  suggestedActions: z.array(z.object({
    label: z.string().describe("Texto do botão"),
    action: z.string().describe("Ação sugerida (ex: 'ir_para_estudio', 'baixar_audio')"),
    params: z.record(z.unknown()).optional()
      .describe("Parâmetros para a ação"),
  })).optional().describe("Ações sugeridas que o frontend pode renderizar como botões"),
  media: z.array(z.object({
    type: z.enum(["audio", "image", "video"]),
    url: z.string(),
    label: z.string().optional(),
  })).optional().describe("Mídias geradas para exibição no frontend"),
});
```

**Nota:** Com `mode: AUTO` (decisão inicial), esta tool é **opcional** — o modelo pode responder diretamente com texto. A tool só se torna obrigatória se migrarmos para `mode: ANY` como plano B.

---

## 5. Componente TODO List

### 5.1 Visão Geral

Componente React para renderizar o plano de execução do orquestrador em tempo real. Inspirado no `todowrite` do OpenCode e no componente Motion que Matheus projetou.

### 5.2 Estados

| Status | Ícone | Cor | Significado |
|--------|-------|-----|-------------|
| `pending` | ○ Circle | Cinza | Ainda não iniciado |
| `in_progress` | ◉ CircleDotDashed | Azul | Executando agora |
| `completed` | ✓ CheckCircle2 | Verde | Concluído com sucesso |
| `failed` | ✗ CircleX | Vermelho | Falhou |
| `need_help` | ⚠ CircleAlert | Amarelo | Precisa de informação externa |

### 5.3 Responsabilidades

1. **Receber updates do backend** via stream (o Genkit manda chunk com metadata da tool)
2. **Renderizar tarefas** com animações (entrada/saída via AnimatePresence)
3. **Mostrar ferramentas** usadas em cada subtarefa (tags estilizadas)
4. **Indicar dependências** entre tarefas (timeline visual com linhas conectando)
5. **Expandir/colapsar** subtarefas
6. **Feedback visual** quando o modelo muda de tarefa (destaque na tarefa ativa)

### 5.4 Posição no Layout

A TODO list fica **entre as mensagens do chat e o composer (input)**, estilo dock colapsável.

**Layout hierárquico (inspirado no OpenCode):**
```
┌─────────────────────────────────┐
│        Chat Messages            │
├─────────────────────────────────┤
│  TodoDock (colapsável)          │ ← ENTRE as mensagens e o input
│  ┌───────────────────────────┐  │
│  │ ▸ 3 of 5 — Pesquisando   │  │ ← collapsed
│  ├───────────────────────────┤  │
│  │ ☐ Pesquisar              │  │ ← expanded
│  │ ◉ Escrever roteiro       │  │
│  │ ☐ Configurar             │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  InterviewDock                  │ ← pergunta do modelo (Fase 2)
├─────────────────────────────────┤
│  SuggestedActions               │ ← botões de ação do respond
├─────────────────────────────────┤
│        Composer (input)         │
└─────────────────────────────────┘
```

**Comportamento (copiado do OpenCode):**

| Estado | Quando | Aparência |
|--------|--------|-----------|
| `hide` | Sem tasks | Invisível |
| `open` | Tasks existem, modelo processando | Lista expandida |
| `close` | Tasks concluídas | Animação de colapso → hide |
| `collapsed` | Usuário recolheu | Barra fina com progresso |

**Referência:** OpenCode `session-todo-dock.tsx` (257 linhas) em `packages/app/src/pages/session/composer/`.

### 5.5 Mock da Árvore de Componentes

```
PlanWidget
├── PlanHeader (título + status geral)
└── TaskList
    ├── TaskItem (tarefa principal)
    │   ├── StatusIcon (check/circle/spinner)
    │   ├── TaskTitle
    │   ├── Dependencies (tags)
    │   └── StatusBadge
    │
    └── SubtaskList (expansível)
        ├── TimelineConnector (linha vertical)
        └── SubtaskItem
            ├── StatusIcon
            ├── Title
            └── ExpandedDetails
                ├── Description
                └── Tools (tags estilizadas)
```

### 5.6 Integração com o Streaming

O Genkit, durante o tool loop, gera chunks de duas naturezas:

1. **Metadata chunks:** Quando o modelo chama uma tool e ela executa, o Genkit emite chunks com metadados. Podemos incluir `type: "plan_update"` e o JSON do plano.
2. **Text chunks:** Quando o modelo está respondendo (após tool loop), o texto é streamado normalmente.

O frontend distingue os dois tipos e renderiza:
- Metadata → atualiza a TODO list
- Texto → mostra no chat

---

## 6. Fluxos de Execução

### 6.1 Fluxo: "Preciso de ajuda com meu roteiro"

```
Usuário: "Analisa meu roteiro e sugere melhorias"

1. updatePlan([
     {id:1, title:"Analisar roteiro", subtasks:[
       {id:1.1, title:"Ler roteiro atual", tools:["getStudioState"]}
     ]},
     {id:2, title:"Pesquisar referências", subtasks:[
       {id:2.1, title:"Buscar técnicas de storytelling", tools:["webSearch"]}
     ]},
     {id:3, title:"Gerar sugestões", status:"pending"}
   ])

2. getStudioState({fields:["script"]})
   → "roteiro sobre fotossíntese, 500 palavras"

3. updatePlan → marca tarefa 1.1 como completed, 2.1 como in_progress

4. webSearch({query: "técnicas de storytelling para vídeos educativos 2026"})
   → resultados: ["use analogias visuais", "comece com uma pergunta", ...]

5. updatePlan → marca 2.1 como completed, 3 como in_progress

6. updatePlan → marca 3 como completed

7. [texto final, pois modo AUTO]:
   "Analisei seu roteiro! Aqui estão 3 sugestões baseadas..."
```

**Tempo estimado:** 3-5s (2 tools + 1 websearch com grounding nativo)

---

### 6.2 Fluxo: "Escreve um roteiro sobre [tema] e prepara o estúdio"

```
Usuário: "Escreve um roteiro sobre buracos negros e deixa o estúdio pronto"

1. updatePlan([
   {id:1, title:"Pesquisar conteúdo", level:0, subtasks:[
     {id:1.1, title:"Buscar informações atuais", tools:["webSearch"]},
   ]},
   {id:2, title:"Criar roteiro", level:0, dependencies:["1"], subtasks:[
     {id:2.1, title:"Escrever roteiro baseado na pesquisa"},
   ]},
   {id:3, title:"Configurar estúdio", level:0, dependencies:["2"], subtasks:[
     {id:3.1, title:"Aplicar roteiro + configurar voz e cenas", tools:["updateStudio"]},
   ]},
 ])

2. webSearch({query: "fatos sobre buracos negros 2026"})
   → resultados da pesquisa

3. → Escreve roteiro baseado na pesquisa
   updatePlan → 1 complete, 2 in_progress

4. updateStudio({
     script: "...roteiro completo...",
     selectedVoice: "Leda",
     pace: "normal",
     emotion: "calm",
     generateScenes: true,
     sceneDensity: 15,
   })
   → Frontend exibe preview → usuário confirma → mudanças aplicadas

5. updatePlan → tudo completed

6. [texto final]:
   "Pronto! O roteiro sobre buracos negros já está no estúdio com a voz Leda..."
```

**Tempo estimado:** 5-8s (webSearch + escrita + updateStudio)

---

### 6.3 Fluxo: "Me ajuda a escolher uma voz" (com Interview)

```
Usuário: "Qual voz combina com meu projeto?"

1. getStudioState({fields:["script", "selectedVoice", "scene"]})
   → roteiro sobre "jardinagem", voz atual "Aoede", cena "jardim"

2. webSearch({query: "melhores vozes para narração de jardinagem"})
   → resultados sobre vozes calmas

3. interview({
     question: "Você prefere uma voz mais tranquila (estilo 'calmo') ou mais animada (estilo 'vibrante')?",
     options: [
       {label: "Calma", description: "Tom sereno, ritmo pausado — ideal para relaxar"},
       {label: "Vibrante", description: "Tom vivo, cheio de energia"},
     ]
   })
   → Usuário escolhe "Calma"

4. [texto final]:
   "Baseado no seu roteiro de jardinagem e sua preferência, recomendo a voz 'Enceladus'..."
```

**Tempo estimado:** 3-5s + tempo de resposta do usuário

---

## 7. Plano de Implementação (Fases)

### Fase 1 — Assistente Aumentado (MVP)

**Objetivo:** Dar ferramentas de consulta ao assistente existente, mantendo ações pesadas separadas.

**Status:** ✔️ Pronto para começar

| Tarefa | Esforço | Depende de |
|--------|---------|------------|
| 1.1 Estudo do Genkit tool calling | 1h | — |
| 1.2 Criar tool `updatePlan` | 4h | 1.1 |
| 1.3 Criar tool `getStudioState` | 2h | 1.1 |
| 1.4 Criar tool `getUserMemories` (com preview) | 3h | 1.1 |
| 1.5 Habilitar Google Search Grounding | 2h | 1.1 |
| 1.6 Atualizar system prompt do assistente | 3h | 1.2-1.5 |
| 1.7 Componente TODO List (MUI + Motion) | 8h | — |
| 1.8 Integrar TODO List com streaming backend | 4h | 1.2, 1.7 |
| 1.9 Sistema de créditos por token | 4h | 1.1 |
| 1.10 Testar fluxos básicos | 4h | 1.6-1.9 |

**Total estimado:** ~33h

**Critérios de sucesso:**
- Assistente consegue pesquisar na web antes de responder
- Assistente mostra plano ao usuário via TODO list em tempo real
- Assistente consulta estúdio e memórias quando relevante
- Créditos contados por tokens (usageMetadata) ao final da interação
- Modo AUTO: modelo usa tools consistentemente via system prompt

---

### Fase 2 — Ações e Interação

**Objetivo:** Adicionar capacidade de interagir com o estúdio e perguntar ao usuário.

| Tarefa | Esforço | Depende de |
|--------|---------|------------|
| 2.1 Criar tool `updateStudio` | 4h | Fase 1 |
| 2.2 Integrar `updateStudio` com o frontend (preview + confirmação) | 6h | 2.1 |
| 2.3 Criar tool `interview` com Genkit Interrupts | 6h | Fase 1 |
| 2.4 UI de perguntas no frontend (dialog/input + fluxo interrupt) | 6h | 2.3 |
| 2.5 Aprimorar TODO List com timeline + tools visíveis | 6h | 1.8 |
| 2.6 Tratamento de erros com fallback (tool falhou) | 4h | 2.1-2.5 |
| 2.7 Testar fluxos completos (updateStudio + interview + pesquisa) | 4h | 2.1-2.6 |

**Total estimado:** ~36h

**Critérios de sucesso:**
- Assistente pode aplicar configurações diretamente no estúdio (com preview + confirmação)
- Assistente pode perguntar e aguardar resposta do usuário
- TODO List mostra ferramentas usadas em cada subtarefa
- Ferramentas com falha não quebram o fluxo inteiro

---

### 7.1 Dependências Entre Mudanças

O diagrama abaixo mostra a ordem e as dependências de implementação dentro de cada fase:

```
Fase 1.1: Estudo do Genkit tool calling
  └── Entender como o Genkit gerencia tool loop, maxTurns, streaming
      
Fase 1.2: Tool updatePlan
  ├── Backend: tool de atualizar plano
  └── Frontend: PlanWidget component
  └── useAssistant: receber/armazenar plan updates
      
Fase 1.3: Tool webSearch (Google Search Grounding)
  ├── Backend: habilitar grounding no config
  └── System prompt: instruir modelo a usar quando necessário

Fase 1.4: Tool getStudioState + getUserMemories
  ├── Backend: tools que consultam Firestore
  └── System prompt: instruir modelo a consultar antes de agir

Fase 1.5: Streaming com tools
  ├── Backend: usar generateStream() com tools
  └── useAssistant: tratar toolRequest/toolResponse/text no stream
  └── AssistantMessages: renderizar resultados visuais de cada tool

Fase 1.6: Atualizar System Prompt
  └── assistant-context.ts: remover JSON, adicionar instrução sobre tools

Fase 1.7: Créditos por token (usageMetadata)
  └── credit-service.ts: novo método debitTokens()
  └── credit-metering.ts: adaptar para token-based

Fase 2.1: Tool updateStudio
  ├── Backend: tool que retorna diff/summary
  ├── useAssistant: receber pendingSettings (preview)
  └── Assistant: UI de preview → confirmar/rejeitar → studioStore

Fase 2.2: Tool interview (Genkit Interrupts)
  ├── Backend: interrupt + schema
  ├── useAssistant: estado "awaiting_input"
  └── Assistant: UI de pergunta/resposta
```

---

## 8. Decisões de Design

### 🎯 D1. `updateStudio` com Preview de Confirmação

**Decisão:** O modelo sugere → frontend mostra preview → usuário confirma ou rejeita. **Não aplica automaticamente.**

**Fluxo detalhado:**
1. Modelo chama `updateStudio({ script: "...", voice: "Leda", ... })`
2. Backend retorna o diff/summary das mudanças
3. Frontend recebe `studio_update` no streaming
4. UI exibe um **banner/preview** entre o chat e a TODO list:
   - "O assistente sugere: alterar voz para Leda, ativar geração de cenas"
   - [Aplicar] [Ignorar]
5. Se usuário confirma → `studioStore.applySettings(patch)`
6. Se ignora → descarta, modelo pode tentar de outro jeito

**Onde implementar:** No componente `Assistant.tsx`, como estado `pendingSettings` que é limpo após confirmação/rejeição.

---

### 🎯 D2. TODO List entre Chat e Composer

**Decisão:** Posicionar o componente TODO list entre as mensagens do chat e o composer (input), exatamente como o OpenCode faz.

**Layout final:**
```
┌──────────────────────────────────────┐
│           Messages (chat)            │
│  ┌────────────────────────────────┐  │
│  │ Bubble mensagem 1              │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Bubble mensagem 2              │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  TodoDock (colapsável)               │
│  ┌────────────────────────────────┐  │
│  │ ▸ 3 of 5 — "Pesquisando..."   │  │ ← collapsed: barra fina
│  ├────────────────────────────────┤  │
│  │ ☐ Pesquisar conteúdo          │  │ ← expanded: lista completa
│  │ ◉ Criar roteiro  ← ativo      │  │
│  │ ☐ Configurar estúdio          │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  InterviewDock (quando aplicável)    │ ← pergunta do modelo
├──────────────────────────────────────┤
│  SuggestedActionsDock               │ ← botões de ação
├──────────────────────────────────────┤
│  Composer (input)                    │
│  ┌────────────────────────────────┐  │
│  │ [Digite sua mensagem...]      │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Comportamento do TodoDock (copiado do OpenCode):**

| Estado | Quando | Aparência |
|--------|--------|-----------|
| `hide` | Sem tasks ativas | Invisível |
| `open` | Tasks existem, modelo trabalhando | Lista expandida |
| `close` | Todas tasks concluídas | Animação de colapso → hide |
| `collapsed` | Usuário clicou pra recolher | Barra fina com progresso |

**Animação:** O dock faz transição suave entre collapsed/expanded usando altura máxima animada.

**Referência:** OpenCode `session-todo-dock.tsx` (257 linhas) em `packages/app/src/pages/session/composer/`.

---

### 🎯 D3. Remover Código Morto

**Decisão:** Remover o fluxo antigo de "Aplicar JSON" assim que o novo sistema estiver estável.

**O que remover progressivamente:**
1. `extractJsonSettings()` em `src/features/assistant/utils.ts` — mantido temporariamente para compatibilidade com mensagens antigas, depois removido
2. `stripJsonSettingsBlock()` — mesmo ciclo de vida
3. Botão "Aplicar" em `AssistantMessages.tsx` — substituído pelo preview do `updateStudio`
4. `jsonSettings` no output do backend (`AssistantOutputSchema`) — removido após transição
5. Instrução sobre bloco JSON no system prompt (`buildStudioBlock`)

---

### 🎯 D4. Transformar o Flow `assistant`, não criar novo

**Decisão:** O flow `assistant` existente ganha tools + `maxTurns`. Aproveita toda a infra já existente (auth, créditos, streaming, contexto).

**Motivo:**
- Já tem toda a infraestrutura: auth, App Check, CORS, créditos, streaming
- Já tem o sistema de contexto (memórias, perfil, estado do estúdio)
- Menos código novo = menos bugs
- Podemos adicionar as tools progressivamente

**O que muda no flow:**
1. Adicionar `tools: [...]` nas chamadas `ai.generateStream()`
2. Usar `mode: AUTO` (padrão) — o modelo pode misturar texto e tools livremente
3. Adicionar `maxTurns: 10`
4. Atualizar system prompt para instruir sobre tools
5. Streaming funciona nativamente com `toolRequest`/`toolResponse` + texto
6. Reserva: Se o modelo ignorar tools, migrar para `mode: ANY` + tool `respond`

---

### 🎯 D5. Créditos por Token (usageMetadata)

**Decisão:** Usar `usageMetadata` do Genkit para contar tokens reais gastos por interação e converter para créditos. Substitui o sistema de reserva/confirmação atual por débito único ao final da interação.

**Como funciona:**
Toda resposta do Genkit (`ai.generate()` / `ai.generateStream()`) retorna `usageMetadata` com:

| Campo | Descrição |
|-------|-----------|
| `prompt_token_count` | Tokens de entrada (prompt + tools + histórico) |
| `candidates_token_count` | Tokens de saída (resposta do modelo) |
| `thoughts_token_count` | Tokens de "pensamento" (thinking models) |
| `total_token_count` | Soma total |

**Fluxo de crédito (substitui o sistema atual de reserva/confirmação):**
1. Antes de iniciar: verificar se usuário tem crédito mínimo
2. Durante execução: contar tokens de cada tool call + resposta
3. Ao final: `credits_gastos = total_token_count / TOKEN_CREDIT_RATE`
4. Confirmar débito no Firestore

**Vantagens sobre o sistema atual:**
- Mais justo: paga-se pelo que usou, não preço fixo por flow
- Transparente: usuário vê quantos tokens gastou
- Único para o orquestrador (em vez de N sistemas de crédito para N flows)

**Armazenamento:** O `total_token_count` é salvo junto com a sessão do chat para auditoria e histórico de uso.

---

### 🎯 D6. Tool Calling com AUTO (não ANY)

**Decisão:** Começar com `mode: AUTO` (padrão do Gemini). O modelo pode misturar texto e tools livremente. Só migrar para `ANY` + `respond` se testes mostrarem que o modelo ignora tools com frequência.

**Por que AUTO em vez de ANY:**
- Modelo pode "pensar em voz alta" entre ferramentas (melhor UX)
- Não precisa de tool `respond` como única saída
- Menos risco de loop infinito
- System prompt bem escrito substitui a necessidade de ANY na maioria dos casos

**Reserva:** Se durante os testes o modelo ignorar tools com frequência, ativamos `mode: ANY` + tool `respond` como plano B.

---

## 9. Decisões Técnicas

### 9.1 Tool Autônoma ou Wrapper de Flow?

**Decisão:** Tools que acessam dados (webSearch, getStudioState, getUserMemories, updateStudio) são implementadas diretamente como ferramentas Genkit. Tools que executam ação pesada (gerar áudio, gerar imagem) continuam como flows separados — o orquestrador não as substitui.

```typescript
// Tool de dados — implementação direta
const getStudioStateTool = ai.defineTool({
  name: 'getStudioState',
  description: 'Consulta o estado atual do estúdio do usuário.',
  inputSchema: z.object({ fields: z.array(z.string()).optional() }),
}, async (input, ctx) => {
  const uid = getCallableUidOrThrow(ctx);
  const doc = await getFirestore().collection('user_settings').doc(uid).get();
  return doc.data() ?? {};
});

// Ação pesada — permanece como flow separado (frontend chama diretamente)
// O orquestrador sugere ao usuário: "Quer gerar o áudio? Clique aqui."
```

**Motivo:** Ações criativas (imagem, áudio) pertencem ao espaço de controle do usuário. O orquestrador informa, sugere e prepara — mas não executa sem supervisão.

### 9.2 Tool Calling com Genkit ou Raw Gemini API?

**Decisão:** Genkit.

**Motivo:**
- Genkit já gerencia o loop automaticamente (fetch → execute → return)
- Já temos toda a infraestrutura Genkit (telemetria, schemas, flows)
- Genkit já integra com Firebase (Auth, App Check, CORS)
- Menos código = menos bugs

### 9.3 Google Search Grounding ou Search API Customizada?

**Decisão:** Google Search Grounding nativo.

**Motivo:**
- Não precisa de API key extra
- É nativo do Gemini — o modelo já sabe usar
- Retorna resultados com citações (grounded results)
- Config simples: só adicionar ao config do modelo

**Reserva:** Se o grounding não for suficiente (ex: precisar de crawling de página específica), podemos adicionar uma tool `fetchUrl` usando webfetch.

### 9.4 Créditos Baseados em Tokens

**Decisão:** Usar `usageMetadata` do Genkit para contar tokens reais gastos por interação e converter para créditos.

**Fluxo detalhado:**

**Atual (por flow):**
1. `startAiRequest(requestId)` — reserva crédito
2. Executa o flow
3. `finishAiRequest(requestId)` — confirma ou reverte

**Novo (por interação do orquestrador):**
1. Verificar saldo mínimo antes de iniciar
2. Executar orquestrador (N tools, 1 interação)
3. Ao final, ler `usageMetadata.total_token_count` da resposta
4. `credits_gasto = total_token_count / TOKEN_CREDIT_RATE`
5. Confirmar débito no Firestore

**Arquivos afetados pelo gap de créditos:**
- `functions/src/usage/credit-service.ts` — novo método `debitTokens(uid, totalTokenCount)`
- `functions/src/genkit/middlewares/credit-metering.ts` — adaptar para token-based
- `src/hooks/useCredits.ts` — frontend pode precisar de adaptação
- `src/components/CreditIndicator.tsx` — pode mostrar tokens em vez de "créditos"

### 9.5 TODO List: Estado Local ou Store Separada?

**Decisão:** Estado local no componente + serial para streaming.

**Motivo:**
- O plano é efêmero (só dura enquanto a requisição está ativa)
- Não precisa persistir entre sessões
- O streaming já entrega o estado completo a cada update

**Recomendação:** Estado local no `useAssistant` inicialmente. Store separada (Zustand) apenas se múltiplos componentes precisarem ler o plano simultaneamente.

### 9.6 Streaming com Tool Calling

**Descoberta:** ✅ O Genkit **suporta streaming nativamente durante o loop de tools**. O stream emite:
- `toolRequest` — quando o modelo decide chamar uma ferramenta
- `toolResponse` — quando a ferramenta retorna resultado
- `text` — texto gerado entre chamadas de ferramenta (no modo AUTO)

Isso significa que o frontend pode reagir a **cada tool em tempo real**:
```
Stream recebido:                         Frontend reage:
─────────────────────────                ────────────────
toolRequest("webSearch")               → 🔍 Pesquisando na web...
toolResponse("webSearch", result)      → 📥 Resultados recebidos
text("Interessante! Deixa eu ver...")  → Texto sendo streamado
toolRequest("getStudioState")          → 📋 Verificando estúdio...
toolResponse("getStudioState", state)  → 📥 Estado carregado
toolRequest("updateStudio", patch)     → 📝 Aplicando mudanças...
toolResponse("updateStudio", result)   → ✅ Aplicado
text("Pronto! Apliquei as mudanças.") → Texto final
```

**Implementação:** Usar `ai.generateStream()` com ferramentas. O iterador do stream fornece `toolRequest`, `toolResponse` e `text` que o frontend consome separadamente para atualizar TODO list e chat.

**Referência:** Genkit docs — "Streaming and tool calling" seção confirma que toolRequest e toolResponse aparecem como partes nos chunks do stream.

---

## 10. Análise de Impacto

### 10.1 Backend — Flows Genkit

#### `functions/src/flows/assistant.ts` 🔴 ALTO IMPACTO (461 linhas)

**Status atual:** Flow de chat com streaming.

**O que faz hoje:**
- Recebe mensagem + histórico + studioState
- Busca memórias e settings do Firestore
- Monta system instruction com contexto completo
- Gera resposta com streaming via `ai.generateStream()`
- Extrai ````json```` da resposta e retorna como `jsonSettings`
- Gerencia créditos manualmente

**O que muda:**
1. **Tool calling** — adicionar `ai.defineTool()` para as 7 tools (updatePlan, webSearch, getStudioState, getUserMemories, updateStudio, interview, respond)
2. **Tool config** — configurar `toolConfig: { functionCallingConfig: { mode: 'AUTO' } }` (inicialmente AUTO; ANY como plano B)
3. **System prompt** — mudar de "inclua um bloco JSON para configurações" para "use as ferramentas disponíveis"
4. **`maxTurns`** — adicionar limite de iterações
5. **Remover** `extractJsonSettings()` — não é mais necessário, o modelo usa `updateStudio` tool
6. **Streaming** — o streaming atual é de texto puro. Com tools, o streaming precisa incluir metadados das tool calls (✅ Genkit já suporta nativamente)
7. **Input schema** — adicionar campo opcional para `plan` (estado atual do plano)

**Arquivos relacionados:**
- `functions/src/genkit/schemas/common.ts` — schemas AssistantInput, AssistantOutput
- `functions/src/genkit/utils/assistant-context.ts` — context builders

#### `functions/src/genkit/utils/assistant-context.ts` 🟡 MÉDIO IMPACTO

**O que muda:**
1. `buildAssistantSystemInstruction()` — remover instrução sobre bloco JSON, adicionar instrução sobre tools
2. `buildStudioBlock()` — remover o exemplo de JSON que instrui o modelo a incluir ```json no texto. Substituir por "use `updateStudio` tool para aplicar mudanças"
3. Manter funções auxiliares que podem ser úteis para as tools (ex: `buildMemoriesText` pode ser usada pela tool `getUserMemories`)

#### `functions/src/genkit/schemas/common.ts` 🟡 MÉDIO IMPACTO

**Schemas que mudam:**
1. `AssistantOutputSchema` — `jsonSettings` se torna opcional/deprecated. Adicionar campos: `plan`, `respondResult`, `toolResults`
2. `AssistantInputSchema` — adicionar `plan` opcional (para o frontend enviar estado do plano atual)
3. NOVOS schemas para as tools: `UpdateStudioSchema`, `UpdatePlanSchema`, `InterviewSchema`, etc.

```typescript
// Novo output schema
const AssistantOutputSchema = z.object({
  text: z.string(), // ainda existe (para modo AUTO)
  jsonSettings: z.record(z.unknown()).optional(), // deprecated — mantido para compatibilidade
  plan: z.array(TaskSchema).optional(), // estado do plano (updatePlan tool)
  appliedSettings: z.record(z.unknown()).optional(), // resultado do updateStudio tool
  interview: z.object({
    question: z.string(),
    options: z.array(...).optional(),
  }).optional(), // estado de entrevista (interview tool)
});
```

#### Demais Flows — NÃO AFETADOS na Fase 1

| Flow | Motivo |
|------|--------|
| `images.ts` | Não muda — o orquestrador não substitui geração de imagem |
| `audio.ts` | Não muda — o orquestrador não substitui TTS |
| `scene-prompts.ts` | Não muda inicialmente (pode ser tool na Fase 2) |
| `chunking.ts` | Interno do audio.ts — não afetado |
| `audio-preflight.ts` | Não afetado |
| `inline-assistant.ts` | Não afetado — fluxo separado de edição inline |
| `feedback.ts` | Não afetado |
| `credit-snapshot.ts` | Não afetado |
| `cancel-ai-request.ts` | Pode ser necessário adaptar para novo request type |

---

### 10.2 Frontend — Hooks e Utilitários

#### `src/hooks/useAssistant.ts` 🔴 ALTO IMPACTO (571 linhas)

**O que faz hoje:**
- Chama `assistantCallable.stream(input)`
- Recebe chunks de texto via streaming
- Extrai `jsonSettings` do `finalData`
- Gerencia estado de loading, streaming, erro
- Auto-save de sessão

**O que muda:**
1. **Novos tipos de chunk** — além de texto, precisa receber metadados das tools:
   - `plan` — atualizações da TODO list
   - `applied_settings` — resultado do `updateStudio`
   - `interview` — quando o modelo quer perguntar algo
2. **Callback para `respond`** — quando o modelo chama `respond`, o frontend precisa tratar a resposta estruturada (text + suggestedActions + media)
3. **Estado do plano** — o hook precisa manter o estado do plano (ou delegar para outro store)
4. **Interview state** — quando o modelo pausa para perguntar, o hook precisa expor o estado e gerenciar o fluxo de resposta
5. **Preview de settings** — quando `updateStudio` é chamado, o frontend exibe preview para confirmação do usuário (D1)
6. **Múltiplos callables** — pode ser necessário um callable separado para o flow orquestrador, ou modificar o atual

**Retorno expandido:**
```typescript
return {
  // ... existentes
  plan: Task[] | null,           // estado do plano
  interview: { question: string, options?: [...] } | null,
  respondResult: { text: string, suggestedActions?: [...], media?: [...] } | null,
  pendingSettings: Record<string, unknown> | null, // preview de updateStudio (D1)
};
```

#### `src/features/assistant/utils.ts` 🟢 BAIXO IMPACTO

**O que faz hoje:**
- `extractJsonSettings(text)` — extrai ```json``` do texto
- `stripJsonSettingsBlock(text)` — remove bloco JSON do texto

**O que muda:**
- As funções se tornam **obsoletas** para o fluxo principal (o modelo não vai mais embutir JSON no texto)
- Mas **mantidas** para compatibilidade com mensagens antigas no histórico
- Opcional: adicionar `extractToolCalls` para debugging

#### `src/features/assistant/types.ts` 🟢 BAIXO IMPACTO

**O que muda:**
- `AssistantSettings` (alias para `StudioSettingsPatch`) continua existindo
- Pode ser necessário adicionar tipos para `Plan`, `Interview`, `RespondResult`

---

### 10.3 Frontend — Componentes

#### `src/features/assistant/components/AssistantMessages.tsx` 🟡 MÉDIO IMPACTO (472 linhas)

**O que faz hoje:**
- Renderiza bubbles de mensagem
- Detecta ```json``` no texto → mostra botão "Aplicar no estúdio"
- Mostra skeleton durante loading

**O que muda:**
1. **Botão "Aplicar"** — se torna menos crítico (as mudanças são sugeridas via preview do `updateStudio` — D1)
   - Opção A: Remover o botão completamente (aplicação via preview)
   - Opção B: Manter como "re-aplicar" manual (fallback)
2. **Mensagem de resultado das tools** — nova renderização para mostrar quando uma tool foi usada:
   - "🔍 Pesquisou na web sobre X"
   - "📋 Aplicou configurações no estúdio"
   - "🧠 Consultou memórias"
3. **Botões de ação sugeridos** — renderizar `suggestedActions` da `respond` tool como chips/botões

#### `src/features/assistant/Assistant.tsx` 🔴 ALTO IMPACTO (514 linhas)

**O que faz hoje:**
- Orquestra o layout do assistente (header, messages, composer, panels)
- Gerencia estado de memórias, histórico, settings
- Passa `onApplySettings` para o botão "Aplicar"

**O que muda:**
1. **TODO List Widget (TodoDock)** — integrar o novo componente `PlanWidget` no layout
   - Posição: entre as mensagens e o composer (D2)
   - Mostrar apenas quando há um plano ativo
2. **Preview de settings (D1)** — quando `useAssistant` retornar `pendingSettings`, exibir preview para confirmação/rejeição
3. **Interview state** — quando `interview` estiver ativo, mostrar UI de pergunta (dialog, input)
4. **Botões de ação** — renderizar ações sugeridas da `respond` tool
5. **Prop `onApplySettings`** — ainda necessária para o fallback manual, mas menos central

**Props expandidas:**
```typescript
interface AssistantProps {
  onApplySettings: (settings: AssistantSettings) => void;
  currentState?: AssistantStudioState;
  // Novas:
  plan?: Task[] | null,                    // do useAssistant
  onApplyPlan?: (plan: Task[]) => void,    // se o frontend precisar confirmar
}
```

#### `src/pages/AssistantPage.tsx` 🟢 BAIXO IMPACTO (25 linhas)

**O que muda:**
- Praticamente nada — o fluxo de `onApplySettings` continua existindo
- Opcional: adicionar listener para `pendingSettings` se o hook não puder chamar o store diretamente

#### NOVO COMPONENTE: `src/features/assistant/components/PlanWidget.tsx` 🆕

**Necessidade:** Renderizar a TODO list do orquestrador.

**Props:**
```typescript
interface PlanWidgetProps {
  tasks: Task[];
  isExpanded?: boolean;
  onToggle?: () => void;
}
```

**Comportamento:**
- Mostra tarefas com status (pending → in_progress → completed)
- Animações de transição (AnimatePresence)
- Cores por status (igual ao mock do Matheus)
- Timeline visual com linhas conectando dependências
- Tools usadas em cada subtarefa (tags)
- Posicionamento: entre as mensagens e o composer, como dock colapsável (D2)

---

### 10.4 Frontend — Stores e Estado

#### `src/features/studio/store/studioStore.ts` 🟢 BAIXO IMPACTO (268 linhas)

**O que muda:**
- `applySettings` já funciona perfeitamente para o `updateStudio` tool
- Nenhuma mudança estrutural necessária
- Opcional: adicionar evento de `settingsApplied` para feedback visual

#### NOVA STORE: `PlanStore` (Zustand) — OPCIONAL 🆕

**Necessidade:** Gerenciar o estado do plano de execução.

```typescript
interface PlanState {
  tasks: Task[];
  activeTaskId: string | null;
  setTasks: (tasks: Task[]) => void;
  clearPlan: () => void;
}
```

**Decisão:** Estado local no `useAssistant` inicialmente (o plano é efêmero). Store separada apenas se múltiplos componentes precisarem ler o plano simultaneamente.

---

### 10.5 Backend → Frontend — Streaming e Metadados

#### Como o Streaming Funciona Hoje

```
Genkit generateStream()
  ├── Chunk 1: "Olá!"
  ├── Chunk 2: " Vou pesquisar..."
  ├── Chunk 3: " Aqui estão os resultados..."
  └── finalData: { jsonSettings: {...} }
```

- Chunks são `string` (definido por `AssistantStreamSchema = z.string()`)
- `finalData` contém `AssistantOutputSchema` (text + jsonSettings)

#### Como Precisa Funcionar com Tools

```
Genkit generateStream() com tools
  ├── Chunk: { type: "text", content: "Olá!" }
  ├── Chunk: { type: "tool_call", tool: "webSearch", params: {...} }
  ├── Chunk: { type: "tool_result", tool: "webSearch", result: {...} }
  ├── Chunk: { type: "plan_update", plan: [...] }
  ├── Chunk: { type: "studio_update", settings: {...} }
  ├── Chunk: { type: "text", content: "Pronto! Apliquei as mudanças." }
  └── finalData: { text: "...", plan: [...], appliedSettings: {...} }
```

**Descoberta:** ✅ O Genkit já suporta nativamente `toolRequest`/`toolResponse` no stream durante o loop de tools + texto normal entre elas (modo AUTO). Podemos reagir a cada tool em tempo real.

**Implementação:** Usar `ai.generateStream()` com ferramentas. O iterador do stream fornece `toolRequest`, `toolResponse` e `text` que o frontend consome separadamente para atualizar TODO list e chat.

---

### 10.6 Resumo das Mudanças por Área

| Área | Arquivos | Esforço |
|------|----------|---------|
| **Backend — Flow assistente** | 1 modificado | 🔴 Alto |
| **Backend — Context builders** | 1 modificado | 🟡 Médio |
| **Backend — Schemas** | 1 modificado | 🟡 Médio |
| **Frontend — Hook useAssistant** | 1 modificado | 🔴 Alto |
| **Frontend — Utilitários** | 1 modificado | 🟢 Baixo |
| **Frontend — Tipos** | 1 modificado | 🟢 Baixo |
| **Frontend — Componentes chat** | 2 modificados | 🟡 Médio |
| **Frontend — Página** | 1 modificado | 🟢 Baixo |
| **Frontend — Store estúdio** | 1 modificado | 🟢 Baixo |
| **Frontend — Novos componentes** | 1-2 novos | 🟡 Médio |
| | **Total: ~12 arquivos** | |

---

### 10.7 Respostas das Perguntas Pendentes (pós-pesquisa)

| Pergunta | Resposta |
|----------|----------|
| **Streaming com tools?** | ✅ **Sim.** Genkit emite `toolRequest` e `toolResponse` no stream durante o loop de tools + texto normal entre elas (modo AUTO). Podemos reagir a cada tool em tempo real. |
| **Token counting?** | ✅ **Sim.** `usageMetadata` do Genkit retorna `prompt_token_count`, `candidates_token_count`, `thoughts_token_count`, `total_token_count`. |
| **`mode: ANY` funciona?** | ✅ Funciona, mas tem pegadinha: com ANY o modelo NUNCA gera texto, só tools. A única saída é via tool `respond`. **Decisão:** começar com `AUTO` (mais simples). |
| **Interrupt do Genkit funciona em GCF?** | ⚠️ **Pendente de teste técnico.** Genkit suporta Interrupts, mas o comportamento em Cloud Functions (serverless) precisa ser verificado durante o estudo da Fase 1.1. |

---

## 11. Mapa de Arquivos Afetados

### Fase 1 — Alterações Diretas

| Arquivo | Impacto | Ação |
|---------|---------|------|
| `functions/src/flows/assistant.ts` | 🔴 Alto | Adicionar tools, mode AUTO, remover extractJsonSettings |
| `functions/src/genkit/utils/assistant-context.ts` | 🟡 Médio | Remover instrução JSON, adicionar instrução tools |
| `functions/src/genkit/schemas/common.ts` | 🟡 Médio | Adicionar schemas das tools, expandir output |
| `src/hooks/useAssistant.ts` | 🔴 Alto | Suportar novos tipos de chunk, plan, interview, respond |
| `src/features/assistant/utils.ts` | 🟢 Baixo | Manter para compatibilidade |
| `src/features/assistant/types.ts` | 🟢 Baixo | Adicionar tipos Plan, Interview, RespondResult |
| `src/features/assistant/Assistant.tsx` | 🔴 Alto | Integrar PlanWidget, preview de settings, interview UI |
| `src/features/assistant/components/AssistantMessages.tsx` | 🟡 Médio | Ajustar botão "Aplicar", mostrar tool calls |
| `src/pages/AssistantPage.tsx` | 🟢 Baixo | Quase nada muda |
| `src/features/studio/store/studioStore.ts` | 🟢 Baixo | applySettings já funciona |

### Fase 1 — Novos Arquivos

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/features/assistant/components/PlanWidget.tsx` | 🆕 Novo | Componente TODO List (TodoDock) |
| `src/features/assistant/hooks/usePlan.ts` | 🆕 Novo | Hook para gerenciar estado do plano (opcional) |

### Fase 2 — Alterações Futuras

| Arquivo | Impacto | Ação |
|---------|---------|------|
| `functions/src/flows/assistant.ts` | 🟡 Médio | Adicionar tool `interview` com Interrupts |
| `functions/src/flows/assistant.ts` | 🟡 Médio | Adicionar tool `updateStudio` com preview |
| `src/hooks/useAssistant.ts` | 🟡 Médio | Suportar Interrupts (estado "awaiting_input") |
| `src/features/assistant/Assistant.tsx` | 🟡 Médio | UI de pergunta (dialog, input, options) + preview de settings |

---

## 12. Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Modelo ignora tools** (responde sem usar) | Alto | Média (AUTO) | System prompt forte com exemplos; se persistir, migrar para `mode: ANY` |
| **Latência alta** (muitas tools em sequência) | Médio | Média | `maxTurns` limite; parallel tool calls se Gemini suportar |
| **Custo excessivo** (muitas iterações) | Alto | Média | Monitorar tokens via `usageMetadata`; `maxTurns` baixo inicialmente |
| **Tool falha** (ex: Firestore timeout) | Médio | Baixa | System prompt instrui fallback; try/catch na tool |
| **Usuário não entende o plano** | Baixo | Média | Plano em linguagem natural; labels claros |
| **Streaming com tools** (múltiplos tipos de chunk) | Médio | Baixa | ✅ Genkit já suporta nativamente `toolRequest`/`toolResponse` no stream |
| **Regressão no assistente atual** | Alto | Baixa | Fase 1 é aditiva — fluxo antigo convive lado a lado |
| **Genkit Interrupt em Cloud Functions** | Médio | Média | ⚠️ Pendente de teste técnico na Fase 1.1 |

---

## 13. Glossário

| Termo | Definição |
|-------|-----------|
| **Tool** | Função que o modelo pode chamar. Tem descrição, schema e implementação. |
| **Tool loop** | Ciclo automático: modelo pede tool → Genkit executa → resultado volta pro modelo. |
| **ToolConfig.AUTO/ANY** | Modos de function calling do Gemini. AUTO: modelo decide entre texto e tools. ANY: modelo é forçado a chamar tools. |
| **`toolRequest`** | Parte do stream indicando que o modelo quer chamar uma tool (com parâmetros). |
| **`toolResponse`** | Parte do stream com o resultado da execução da tool. |
| **Interrupt** | Mecanismo do Genkit que pausa o tool loop e retorna controle pro código (ex: perguntar ao usuário). |
| **`maxTurns`** | Número máximo de iterações do tool loop (padrão Genkit: 5). |
| **`usageMetadata`** | Metadados de uso do Genkit/Gemini com contagem de tokens (prompt, output, thinking). |
| **Orquestrador** | O flow central que coordena todas as tools. |
| **Flow** | Cloud Function Genkit. Cada fluxo atual (assistant, images, audio) é um flow. |
| **Grounded result** | Resposta do Gemini que inclui citações de fontes externas (Google Search). |
| **Harness Engineer** | Metáfora para o orquestrador — um engenheiro que "veste" as ferramentas certas para cada tarefa. |
| **TodoDock** | Componente de UI que renderiza a TODO list entre o chat e o composer. Inspirado no OpenCode. |
| **Preview de confirmação** | Padrão onde mudanças sugeridas pela IA são exibidas ao usuário antes de serem aplicadas (D1). |
| **TOKEN_CREDIT_RATE** | Constante que define a conversão de tokens para créditos no sistema de billing. |

---

## 14. Apêndices

### Apêndice A — Comparativo: Antes vs. Depois

| Aspecto | Antes (flows isolados) | Depois (orquestrador) |
|---------|----------------------|----------------------|
| Chamadas frontend | Múltiplas (`assistant()`, `images()`, etc.) | Uma (`orquestrador()`) |
| Quem orquestra | Frontend (código React) | Modelo Gemini (decide) |
| Contexto entre etapas | Perdido (cada flow recomeça) | Mantido (mesma sessão Genkit) |
| Visibilidade pro usuário | "Gerando..." genérico | TODO list detalhada |
| Pesquisa na web | Não disponível | Google Search Grounding |
| Consulta memórias | Injetada sempre (gasto de tokens) | Tool `getUserMemories` (sob demanda) |
| Aplicar no estúdio | Bloco JSON que o usuário copia | Tool `updateStudio` (preview + confirmação) |
| Perguntar ao usuário | Não disponível | Tool `interview` |
| Plano de execução | Inexistente | Tool `updatePlan` |
| Resposta | Texto direto | Texto (AUTO) ou tool `respond` (ANY) |
| Créditos | Por flow (reserva/confirma) | Por token (usageMetadata) |

---

### Apêndice B — Exemplo de System Prompt do Orquestrador

```
Você é o Orquestrador Inteligente do Script Master, um assistente
que coordena ferramentas especializadas para ajudar o usuário a criar
conteúdo de áudio, vídeo e imagem.

REGRAS FUNDAMENTAIS:
1. Antes de responder, SEMPRE use as ferramentas necessárias para coletar informações.
   Ex: precisa de dados atuais? → webSearch. Precisa do contexto do usuário? → getStudioState.
2. Crie um plano com `updatePlan` mostrando os passos que vai seguir.
3. Atualize o plano (`updatePlan`) a cada mudança de status das tarefas.
4. Se faltar informação essencial, use `interview` para perguntar ao usuário.
5. Depois de pesquisar e decidir as melhores configurações, use `updateStudio`
   para aplicar as mudanças no estúdio — o usuário vai confirmar antes de aplicar.
6. Você pode pensar em voz alta enquanto trabalha. O usuário vê seu raciocínio.
7. Quando tudo estiver pronto, dê a resposta final em linguagem natural.

FERRAMENTAS DISPONÍVEIS:
- updatePlan: Cria/atualiza a lista de tarefas e seu progresso
- webSearch: Pesquisa na web (Google Search) — use para informações atuais
- getStudioState: Consulta o estado atual do estúdio do usuário
- getUserMemories: Lista ou expande memórias do usuário (use list para preview, expand para conteúdo completo)
- updateStudio: Aplica configurações no estúdio (roteiro, voz, cenas, etc.) — o usuário confirma antes
- interview: Faz uma pergunta ao usuário quando faltar informação (pausa e aguarda)
```

---

---

## 15. Guia de Implementação

> **Propósito:** Este guia é o briefing direto para agents de IA (worker, fixer, etc.) implementarem o orquestrador sem precisar re-explorar o projeto. Cada passo contém padrões, imports, caminhos de arquivo e código de referência.

### 15.1 Padrões do Projeto

#### Genkit Tools Pattern
```typescript
// functions/src/genkit/genkit.ts — instância única
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
export const ai = genkit({
  plugins: [googleAI()],
});
```

#### Flow Callable Pattern
```typescript
// functions/src/flows/assistant.ts — estrutura de flow callable
export const assistant = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'assistant',
      inputSchema: AssistantInputSchema,
      outputSchema: AssistantOutputSchema,
      streamSchema: AssistantStreamSchema,
    },
    async (input: AssistantInput, flowContext): Promise<AssistantOutput> => {
      const uid = getCallableUidOrThrow(flowContext);
      const { sendChunk } = flowContext;
      // ... implementação
    },
  ),
);
```

#### Auth em tools dentro de flows
```typescript
// functions/src/genkit/utils/callable-auth.ts
export function getCallableUidOrThrow(flowContext: CallableFlowContext): string {
  const uid = flowContext.context?.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  return uid;
}
```

#### Logger
```typescript
// src/lib/logger.ts
import { createLogger } from '../../../lib/logger';
const log = createLogger('NomeDoComponente');
```

#### Motion (animações)
```typescript
// Import padrão: pacote `motion` (ex-framer-motion)
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
```

#### Ícones MUI por Status
```typescript
import CheckCircle2 from '@mui/icons-material/CheckCircle';
import Circle from '@mui/icons-material/Circle';
import CircleDotDashed from '@mui/icons-material/CircleDotDashed';
import CircleAlert from '@mui/icons-material/ErrorOutline'; // ou WarningAmber
import CircleX from '@mui/icons-material/HighlightOff';
```

#### Studio Store (applySettings)
```typescript
// src/features/studio/store/studioStore.ts
const applySettings = useStudioStore((s) => s.applySettings);
applySettings(patch); // merge parcial — só campos definidos, compara com estado atual
```

---

### 15.2 Componentes Reutilizáveis

| Componente | Localização | Uso no Orquestrador |
|-----------|-------------|---------------------|
| `glassPanelSx` | `src/theme/surfaces.ts:6` | Container do PlanWidget |
| `insetPanelSx` | `src/theme/surfaces.ts:20` | Itens internos do PlanWidget |
| `assistantSuggestionChipSx` | `assistantUi.ts:270` | Chips de ação sugerida |
| `assistantInsetSx` | `assistantUi.ts` | Painéis internos do assistente |
| `assistantBubbleModelSx` | `assistantUi.ts` | Bubbles de mensagem do modelo |
| `DeleteConfirmationDialog` | `src/components/video-library/DeleteConfirmationDialog.tsx` | Dialog de confirmação (D1) |
| `ErrorToast` | `src/components/ErrorToast.tsx` | Notificações de erro |
| `CreditBlockedMessage` | `src/components/CreditBlockedMessage.tsx` | Saldo insuficiente |
| `SelectionCard` | `src/features/onboarding-wizard/components/SelectionCard.tsx` | UI de opções do interview (Fase 2) |
| `stepVariants` | `onboarding-wizard/constants.ts:64` | Animações de transição de tasks |
| `staggerContainer` / `staggerItem` | `onboarding-wizard/constants.ts:85-101` | Stagger animation na task list |
| `containerVariants` | `AssistantComposer.tsx:162` | Colapso/expansão do TodoDock |
| Design tokens | `src/theme/tokens.ts` | BRAND_PRIMARY, SUCCESS_MAIN, ERROR_MAIN, etc. |

---

### 15.3 Passo a Passo de Implementação (Fase 1)

#### 📦 Passo 1: Backend — Schemas das Tools

**Arquivo:** `functions/src/genkit/schemas/common.ts`

**O que fazer:**
1. Adicionar schemas: `SubtaskSchema`, `TaskSchema`, `UpdatePlanInputSchema`, `WebSearchInputSchema`, `GetStudioStateInputSchema`, `GetMemoriesInputSchema`, `UpdateStudioInputSchema`
2. Expandir `AssistantOutputSchema` — adicionar `plan`, `appliedSettings` como opcionais
3. Expandir `AssistantInputSchema` — adicionar `plan` opcional

**Padrão:** Seguir `ChatMessageSchema` como referência de schema Zod exportado.

---

#### 📦 Passo 2: Backend — System Prompt

**Arquivo:** `functions/src/genkit/utils/assistant-context.ts`

**O que fazer:**
1. Em `buildAssistantSystemInstruction()`, remover o parágrafo que instrui o modelo a incluir bloco ```json (linhas 196-214 aproximadamente)
2. Adicionar no final do system prompt a lista de ferramentas disponíveis (texto do Apêndice B)
3. Adicionar instrução: "Antes de responder, use as ferramentas necessárias. Você pode pensar em voz alta."

---

#### 📦 Passo 3: Backend — Ferramentas

**Arquivo:** `functions/src/flows/assistant.ts`

**O que fazer:**
1. Definir tools usando `ai.defineTool()` — começar com `updatePlanTool`, `webSearchTool`, `getStudioStateTool`, `getUserMemoriesTool`
2. Tools que acessam Firestore usam `getCallableUidOrThrow(ctx)` para autenticação
3. Adicionar `tools: [updatePlanTool, webSearchTool, getStudioStateTool, getUserMemoriesTool]` em `ai.generateStream()`
4. Adicionar `maxTurns: 10`
5. Na iteração do stream, enviar metadados das tools via `sendChunk()` como JSON serializado
6. Ao final, retornar `AssistantOutput` expandido com `plan`, `appliedSettings`

**Pattern de tool (copiar):**
```typescript
const getStudioStateTool = ai.defineTool({
  name: 'getStudioState',
  description: 'Obtém o estado atual do estúdio do usuário.',
  inputSchema: z.object({ fields: z.array(z.string()).optional() }),
}, async (input, ctx) => {
  const uid = getCallableUidOrThrow(ctx);
  const doc = await getFirestore().collection('user_settings').doc(uid).get();
  return doc.data() ?? {};
});
```

---

#### 📦 Passo 4: Frontend — Tipos

**Arquivo:** `src/features/assistant/types.ts`

**O que fazer:**
1. Adicionar interfaces `Plan`, `Task`, `Subtask`, `InterviewDatum`, `RespondResult`
2. Exportar para uso nos componentes

---

#### 📦 Passo 5: Frontend — Hook useAssistant

**Arquivo:** `src/hooks/useAssistant.ts`

**O que fazer:**
1. Adicionar `plan`, `pendingSettings`, `interview` no estado do hook
2. No método `sendMessage()`, incluir `plan` no input se existir
3. Ao receber chunks do stream, detectar se é JSON estruturado (tipo `plan_update`, `studio_update`) ou texto normal
4. Expor novos campos no retorno do hook

**Pattern de parsing de chunk (copiar lógica existente do flush):**
```typescript
// Dentro do stream iterator
const chunkText = typeof nextResult.value === 'string' ? nextResult.value : '';
// Tentar parsear como JSON estruturado
if (chunkText.startsWith('{')) {
  try {
    const meta = JSON.parse(chunkText);
    if (meta.type === 'plan_update') setPlan(meta.plan);
    if (meta.type === 'studio_update') setPendingSettings(meta.settings);
  } catch {
    // Não é JSON — é texto normal
    chunkBufferRef.current += chunkText;
  }
} else {
  chunkBufferRef.current += chunkText;
}
```

---

#### 📦 Passo 6: Frontend — PlanWidget (NOVO)

**Criar:** `src/features/assistant/components/PlanWidget.tsx`

**Props:**
```typescript
interface PlanWidgetProps {
  tasks: Task[];
  isExpanded?: boolean;
  onToggle?: () => void;
}
```

**Estados:**
| Estado | Aparência | Quando |
|--------|-----------|--------|
| `hide` | Invisível | Sem tasks |
| `open` | Lista expandida | Tasks existem, modelo trabalhando |
| `close` | Animação → hide | Tasks concluídas |
| `collapsed` | Barra fina "3 de 5" | Usuário recolheu |

**Padrões a seguir:**
- Container: `assistantInsetSx(theme)` ou `glassPanelSx(theme)`
- Animação collapsed/expanded: copiar `containerVariants` de `AssistantComposer.tsx`
- Transições de tasks: copiar `stepVariants` de `onboarding-wizard/constants.ts`
- Stagger: copiar `staggerContainer`/`staggerItem` de `onboarding-wizard/constants.ts`
- Ícones de status: MUI (CheckCircle, Circle, CircleDotDashed, CircleAlert, CircleX)
- Cores: `theme.palette.success.main` (completed), `info.main` (in_progress), `warning.main` (need_help), `error.main` (failed), `text.disabled` (pending)

---

#### 📦 Passo 7: Frontend — Assistant.tsx

**Arquivo:** `src/features/assistant/Assistant.tsx`

**O que fazer:**
1. Importar `PlanWidget` do novo arquivo
2. Extrair `plan` do retorno de `useAssistant()`
3. Inserir `<PlanWidget tasks={plan} />` entre `<AssistantMessages />` e `<AssistantComposer />`
4. Adicionar lógica de preview de settings (D1): quando `pendingSettings` existir, mostrar banner com [Aplicar] [Ignorar]

**Layout final (inserir após AssistantMessages):**
```typescript
<AssistantMessages ... />

{/* TODO List */}
{plan.length > 0 && <PlanWidget tasks={plan} />}

{/* Pending settings preview (D1) */}
{pendingSettings && (
  <Banner>
    O assistente sugere: {resumo das mudanças}
    <Button onClick={() => { applySettings(pendingSettings); clearPending(); }}>Aplicar</Button>
    <Button onClick={() => clearPending()}>Ignorar</Button>
  </Banner>
)}

<AssistantComposer ... />
```

---

#### 📦 Passo 8: Frontend — AssistantMessages.tsx

**Arquivo:** `src/features/assistant/components/AssistantMessages.tsx`

**O que fazer:**
1. Reduzir/remover a detecção de ````json```` (não é mais o fluxo principal)
2. Adicionar renderização opcional de tool calls na bubble do modelo (badges/chips)
3. Manter `extractJsonSettings` para compatibilidade com mensagens antigas

---

#### 📦 Passo 9: Frontend — Limpeza de Código Morto (progressivo)

**Arquivos:** `src/features/assistant/utils.ts`, `src/features/assistant/components/AssistantMessages.tsx`

**O que remover (após validar que novo fluxo funciona):**
1. `extractJsonSettings()` e `stripJsonSettingsBlock()` em utils.ts
2. Botão "Aplicar" no `MessageBubble`
3. `jsonSettings` no schema de output do backend

---

#### 📦 Passo 10: Sistema de Créditos (token-based)

**Arquivos:** `functions/src/usage/credit-service.ts`, `functions/src/genkit/middlewares/credit-metering.ts`

**O que fazer:**
1. No flow, após `await streamResponse`, ler `usageMetadata.total_token_count`
2. `credits_gasto = total_token_count / TOKEN_CREDIT_RATE`
3. Confirmar débito no Firestore

---

### 15.4 Estrutura de Pastas (pós-implementação)

```
src/features/assistant/
├── Assistant.tsx                       ← + PlanWidget, preview D1
├── types.ts                            ← + Task, Plan, InterviewDatum, RespondResult
├── utils.ts                            ← mantido (compatibilidade)
├── components/
│   ├── AssistantMessages.tsx           ← - botão "Aplicar", + tool call badges
│   ├── AssistantComposer.tsx           ← inalterado
│   ├── AssistantHeader.tsx             ← inalterado
│   ├── AssistantHistoryPanel.tsx       ← inalterado
│   ├── AssistantMemoriesPanel.tsx      ← inalterado
│   ├── AssistantSettingsPanel.tsx      ← inalterado
│   ├── assistantUi.ts                 ← + planWidgetSx, planTaskSx (estilos novos)
│   └── PlanWidget.tsx                  ← 🆕 NOVO componente TODO list
└── hooks/
    └── usePlan.ts                      ← 🆕 NOVO (opcional)

functions/src/
├── flows/
│   └── assistant.ts                    ← + tools, mode: AUTO, maxTurns
├── genkit/
│   ├── utils/
│   │   └── assistant-context.ts        ← - JSON block, + tools instruction
│   └── schemas/
│       └── common.ts                   ← + schemas das tools
```

---

### 15.5 Ordem Sugerida de Implementação

```
1. Schemas das tools (common.ts)           ← base para tudo
2. Tools no backend (assistant.ts)         ← coração do sistema
3. System prompt (assistant-context.ts)    ← instrui o modelo
4. Tipos no frontend (types.ts)           ← interface entre backend/frontend
5. Hook useAssistant (useAssistant.ts)     ← conecta streaming + tools
6. PlanWidget (PlanWidget.tsx)             ← TODO list visível
7. Assistant.tsx                           ← integra tudo
8. AssistantMessages.tsx                   ← adapta bubbles
9. Créditos token-based                    ← finaliza Fase 1
10. Limpeza de código morto               ← após validação
```
