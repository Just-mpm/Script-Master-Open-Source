# Assistente IA — Script Master

Documentacao completa da feature de assistente conversacional com Gemini, extraida diretamente do codigo-fonte.

---

## Modelo Gemini Envolvido

| Funcao | Modelo | Arquivo |
|--------|--------|---------|
| Chat / Streaming | `gemini-3.1-flash-lite-preview` | `src/hooks/useAssistant.ts:249` |

Chamada via `@google/genai` (`GoogleGenAI`) diretamente no cliente, com streaming (`generateContentStream`).

---

## Constantes do Assistente

> `src/features/assistant/Assistant.tsx`

| Constante | Valor | Descricao |
|-----------|-------|-----------|
| `MAX_ATTACHMENTS` | `5` | Limite de anexos por mensagem |
| `MAX_IMAGE_SIZE` | 10 MB | Tamanho maximo de imagens anexadas |
| `MAX_DOCUMENT_ATTACHMENT_SIZE` | 5 MB | Tamanho maximo de documentos anexados (chat) |
| `MAX_DOCUMENT_SIZE` | 500 KB | Tamanho maximo de documentos para a Base de Conhecimento (memorias) |
| `MAX_MEMORY_DOCUMENT_TEXT` | 490.000 chars | Truncamento de texto de documentos anexados como memoria |

> `src/lib/db/chats.ts`

| Constante | Valor | Descricao |
|-----------|-------|-----------|
| `FIRESTORE_MAX_DOC_SIZE_BYTES` | 900.000 | Limite seguro do Firestore (~1MB com margem) |

---

## Tipos e Interfaces

> `src/features/assistant/types.ts` — aliases de tipos do DB e do estúdio

```typescript
type AssistantStudioState = StudioDraftState;
type AssistantSettings = StudioSettingsPatch;
type Attachment = AttachmentRecord;
type ChatMessage = ChatMessageRecord;
```

> `src/features/assistant/utils.ts` — retorno discriminado de parse JSON

```typescript
interface ExtractedSettings {
  settings: AssistantSettings;
  parseError: false;
}

interface ExtractedSettingsError {
  settings: null;
  parseError: true;
}

type ExtractedSettingsResult = ExtractedSettings | ExtractedSettingsError;
```

### Tipos do DB utilizados

> `src/lib/db/types.ts`

```typescript
interface AttachmentRecord {
  mimeType: string;
  data: string;
  name?: string;
}

interface ChatMessageRecord {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: AttachmentRecord[];
}

interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  messages: ChatMessageRecord[];
  updatedAt: number;
}
```

### Tipos do Estúdio utilizados

> `src/features/studio/types.ts`

```typescript
interface StudioDraftState {
  script: string;
  selectedVoice: string;
  isMultiSpeaker: boolean;
  audioProfile: string;
  scene: string;
  pace: string;
  styleNotes: string;
  generateScenes: boolean;
  sceneRatio: SceneRatio;
  sceneDensity: number;
  visualFramework: string;
  referenceImage: string | null;
}

interface StudioSettingsPatch {
  script?: string;
  isMultiSpeaker?: boolean;
  selectedVoice?: string;
  speakerAName?: string;
  speakerBVoice?: string;
  speakerBName?: string;
  audioProfile?: string;
  scene?: string;
  pace?: string;
  styleNotes?: string;
  generateScenes?: boolean;
  sceneDensity?: number;
  sceneRatio?: SceneRatio;
  visualFramework?: string;
}
```

---

## Arquitetura

### Componentes

```
AssistantPage
  └── Assistant  (container principal — estado local, drawers, composição)
        ├── AssistantHeader       (botoes: novo chat, histórico, memórias, settings)
        ├── AssistantMessages     (lista de mensagens + markdown + cursor streaming)
        ├── AssistantComposer     (input de texto + anexos + botão enviar)
        ├── AssistantHistoryPanel (drawer: sessões salvas)
        ├── AssistantMemoriesPanel(drawer: memórias + upload de documentos)
        └── AssistantSettingsPanel(drawer: persona/custom system prompt)
```

### Hook central

| Hook | Arquivo | Descricao |
|------|---------|-----------|
| `useAssistant(currentState?)` | `src/hooks/useAssistant.ts` | Coordena mensagens, streaming, sessao, envio ao Gemini |

### Fluxo de dados

```
[Usuario digita + anexa] → AssistantComposer
       │
       ▼
Assistant.handleSubmit()
  → fileToAttachment(file) para cada arquivo
  → useAssistant.sendMessage(text, attachments)
       │
       ▼
useAssistant.sendMessage()
  1. Adiciona mensagem do usuario ao estado local
  2. Carrega memorias, settings do usuario, lista de vozes
  3. Monta systemInstruction (buildSystemInstruction)
  4. Converte historico para formato Gemini (contents[])
  5. Chama ai.models.generateContentStream() com streaming
  6. Processa chunks progressivamente (appendChunkText)
       │
       ▼
Auto-save (useEffect — apos streaming terminar)
  → saveChatSession(session, userId)
       │
       ▼
[Resposta exibida] → AssistantMessages
  → ReactMarkdown para renderizar texto limpo
  → extractJsonSettings() detecta bloco JSON → botao "Aplicar no estúdio"
  → Botao "Salvar insight" persiste texto como memoria
```

---

## System Prompt

> `src/hooks/useAssistant.ts` — funcao `buildSystemInstruction`

O system prompt e montado dinamicamente e inclui:

| Bloco | Fonte | Quando incluido |
|-------|-------|-----------------|
| Identidade do assistente | hardcoded | Sempre |
| Estrutura do prompt TTS | hardcoded | Sempre |
| Geracao de video/cenas | hardcoded | Sempre |
| Memorias do usuario | `getMemories(userId)` | Quando ha memorias |
| Lista de vozes disponiveis | `VOICES` (constants) | Sempre |
| Ritmos disponiveis (pace) | `PACE_INSTRUCTIONS` (constants) | Sempre |
| Estado atual do estúdio | `currentState` prop | Quando acessado via estúdio |
| Diretrizes customizadas | `getUserSettings(userId).customSystemPrompt` | Quando definido |

### Modo Estúdio (bloco condicional)

Quando `currentState` e fornecido, o system prompt inclui o bloco `ESTADO ATUAL DO ESTUDIO` com todos os campos preenchidos do estúdio. O prompt instrui o modelo a sugerir alteracoes e incluir um bloco JSON para que o app gere o botao "Aplicar no estúdio".

Exemplo de bloco JSON esperado:

```json
{
  "script": "Inscreva-se no canal! [laughs]",
  "selectedVoice": "Zephyr",
  "audioProfile": "Narrador de mistério",
  "scene": "Ambiente tenso",
  "pace": "normal",
  "generateScenes": true
}
```

Campos sao opcionais — apenas os desejados precisam ser incluidos.

---

## Configuracoes (Persona / Diretrizes)

> `src/features/assistant/components/AssistantSettingsPanel.tsx`

O usuario pode definir um **system prompt customizado** permanente via Drawer de Settings. Esse texto e concatenado ao system prompt base na secao `DIRETRIZES CUSTOMIZADAS DO USUARIO`.

- Salvo via `saveUserSettings(customSystemPrompt, userId)` — persiste no Firestore/IndexedDB
- Carregado via `getUserSettings(userId)` a cada envio de mensagem

---

## Memorias

> `src/features/assistant/components/AssistantMemoriesPanel.tsx` + `src/lib/db/`

Duas formas de adicionar memorias:

1. **Memória curta** — texto digitado diretamente no campo
2. **Upload de documento** — arquivos `.md`, `.txt`, `.csv` com até 500 KB (texto truncado em 490.000 caracteres)

Memorias sao persistidas via `saveMemory(content, userId)` e carregadas a cada envio de mensagem via `getMemories(userId)`. Cada memoria e injetada no system prompt como:

```
MEMORIAS DO USUARIO (Leve estas preferencias em conta):
- <conteudo da memoria 1>
- <conteudo da memoria 2>
```

Tambem e possivel salvar a resposta de uma mensagem como memoria via botao "Salvar insight" em `AssistantMessages`.

---

## Aplicacao de Ajustes no Estúdio

> `src/features/assistant/utils.ts` + `src/features/assistant/components/AssistantMessages.tsx`

Quando a resposta do modelo contem um bloco `` ```json ``` `:

1. `extractJsonSettings(text)` tenta parsear — retorna `ExtractedSettings` (valido) ou `ExtractedSettingsError` (malformado) ou `null` (nao encontrado)
2. `stripJsonSettingsBlock(text)` remove o bloco JSON do texto exibido ao usuario
3. Se valido, o botao "Aplicar no estúdio" aparece na mensagem
4. Ao clicar, `onApplySettings(settings)` e chamado — atualiza o estúdio com `StudioSettingsPatch`
5. Feedback visual: botao muda para "Aplicado" por 3 segundos

---

## Persistência de Sessoes

> `src/lib/db/chats.ts`

**Dual storage** (Firestore + IndexedDB fallback), seguindo o padrao de persistencia do projeto:

### Fluxo de salvamento (`saveChatSession`)

1. Se usuario logado, estima tamanho do documento (`estimateDocumentSize`)
2. Se excede 900 KB (limite Firestore), salva apenas no IndexedDB (loga warning)
3. Se dentro do limite, tenta Firestore primeiro; em caso de erro, recai para IndexedDB

### Fluxo de leitura (`getChatSessions`)

1. Se usuario logado, consulta Firestore ordenado por `updatedAt` descendente
2. Em caso de erro, recai para IndexedDB

### Fluxo de exclusao (`deleteChatSession`)

1. Se usuario logado, deleta do Firestore
2. Em caso de erro, deleta do IndexedDB

### Auto-save

O hook `useAssistant` salva automaticamente apos cada resposta (quando `isStreaming` passa para `false`). O titulo da sessao e extraido da primeira mensagem do usuario (40 caracteres).

---

## Streaming e Tratamento de Erros

### Streaming

- Usa `ai.models.generateContentStream()` com `AbortController`
- Novos tokens sao acumulados via `appendChunkText` — atualiza o estado da mensagem progressivamente
- Scroll automatico a cada 200ms durante streaming
- Cursor animado (CSS `@keyframes assistantCursorBlink`) durante geracao
- Skeleton de loading exibido enquanto `isLoading && !isStreaming` (antes do primeiro token)

### Abort

- Novo envio aborta chamada anterior
- Desmontagem do componente aborta chamada em andamento
- Erros de aborto sao silenciosamente ignorados

### Mapeamento de erros

> `src/hooks/useAssistant.ts` — `toUserFriendlyAssistantError`

| Erro detectado | Mensagem pt-BR |
|----------------|----------------|
| `quota` / `resource_exhausted` / `429` | Limite de uso atingido |
| `api key` / `key not valid` / `permission_denied` | Erro de autenticacao |
| `deadline_exceeded` / `504` | Servidor demorou demais |
| `unavailable` / `503` | Servico temporariamente indisponivel |
| `safety` / `blocked` | Conteudo bloqueado por filtros |
| `abort` / `cancelled` | (vazio — silencioso) |
| Outros | Nao foi possivel concluir |

Em caso de erro, mensagem de fallback e adicionada ao chat removendo a mensagem vazia de streaming.

---

## Anexos

### No chat (mensagens)

- Acepta `image/*`, `.pdf`, `.txt`
- Limite: 5 arquivos por mensagem
- Imagens: ate 10 MB cada | Documentos: ate 5 MB cada
- Convertidos para `AttachmentRecord` via `fileToAttachment()` (FileReader → base64)
- Enviados ao Gemini como `inlineData` (mimeType + base64)
- Anexos sem dados sao ignorados no envio

### Na Base de Conhecimento (memorias)

- Acepta `.md`, `.txt`, `.csv`
- Limite: 500 KB por arquivo
- Conteudo e lido como texto e salvo como memoria (com prefixo `[Documento Anexado: nome]`)
- Truncado em 490.000 caracteres

---

## Componente de Compatibilidade

> `src/components/Assistant.tsx`

Re-export simples para uso externo sem expor a estrutura de features:

```typescript
export { Assistant } from '../features/assistant/Assistant';
export type { AssistantStudioState } from '../features/assistant/types';
```

---

## UI Helpers

> `src/features/assistant/components/assistantUi.ts`

| Export | Descricao |
|--------|-----------|
| `assistantDrawerPaperSx(theme)` | Estilo do paper dos drawers (glass, blur, borda, sombra) |
| `assistantInsetSx(theme)` | Estilo de paineis recuados (inset) dentro dos drawers |
| `assistantMarkdownSx` | Estilos para conteudo Markdown renderizado pelo ReactMarkdown |

---

## Referencia Rapida de Arquivos

| Arquivo | Categoria | Descricao |
|---------|-----------|-----------|
| `src/features/assistant/types.ts` | Tipo | Aliases: `AssistantStudioState`, `AssistantSettings`, `Attachment`, `ChatMessage` |
| `src/features/assistant/utils.ts` | Util | `fileToAttachment`, `extractJsonSettings`, `stripJsonSettingsBlock` |
| `src/features/assistant/Assistant.tsx` | Componente | Container principal — estado local, drawers, orquestracao |
| `src/features/assistant/components/AssistantHeader.tsx` | Componente | Header com botoes de acao (novo chat, historico, memorias, settings) |
| `src/features/assistant/components/AssistantMessages.tsx` | Componente | Lista de mensagens — markdown, streaming, botoes aplicar/salvar |
| `src/features/assistant/components/AssistantComposer.tsx` | Componente | Input de texto multiline + anexos + envio |
| `src/features/assistant/components/AssistantHistoryPanel.tsx` | Componente | Drawer lateral de sessoes salvas |
| `src/features/assistant/components/AssistantMemoriesPanel.tsx` | Componente | Drawer lateral de memorias + upload de documentos |
| `src/features/assistant/components/AssistantSettingsPanel.tsx` | Componente | Drawer lateral de persona/diretrizes customizadas |
| `src/features/assistant/components/assistantUi.ts` | Util | Estilos reutilizaveis dos drawers e markdown |
| `src/hooks/useAssistant.ts` | Hook | Logica central: mensagens, streaming, sessao, system prompt, Gemini |
| `src/lib/db/chats.ts` | Util | Persistencia de sessoes (dual storage Firestore/IndexedDB) |
| `src/lib/db/types.ts` | Tipo | `AttachmentRecord`, `ChatMessageRecord`, `ChatSession` |
| `src/features/studio/types.ts` | Tipo | `StudioDraftState`, `StudioSettingsPatch` |
| `src/pages/AssistantPage.tsx` | Pagina | Wrapper com Container para rota dedicada |
| `src/components/Assistant.tsx` | Componente | Re-export de compatibilidade |
