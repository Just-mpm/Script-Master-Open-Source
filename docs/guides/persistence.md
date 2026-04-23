# Persistência — Script Master

> Documentação baseada exclusivamente no código-fonte. Arquivos de origem:
> `src/lib/db.ts`, `src/lib/db/index.ts`, `src/lib/db/shared.ts`, `src/lib/db/types.ts`,
> `src/lib/db/memories.ts`, `src/lib/db/user-settings.ts`, `src/lib/db/generations.ts`,
> `src/lib/db/images.ts`, `src/lib/db/projects.ts`, `src/lib/db/chats.ts`,
> `src/lib/db/videos.ts`, `src/lib/db/transcriptions.ts`, `src/lib/db/audio-segments.ts`,
> `src/lib/db/migration.ts`, `firestore.rules`, `storage.rules`

---

## 1. Padrão Dual Storage

O projeto alterna entre dois backends de persistência baseado no estado de autenticação:

- **Autenticado (`userId` presente):** Firestore + Firebase Storage
- **Anônimo (`userId` ausente):** IndexedDB local

Cada função de CRUD recebe `userId?: string` como último parâmetro. Quando o valor é fornecido, a operação vai para o Firestore; caso contrário, vai para o IndexedDB.

```typescript
// Padrão presente em todos os domínios:
export async function saveMemory(content: string, userId?: string): Promise<Memory> {
  if (userId) {
    // Firestore
    await setDoc(doc(memoriesCollection, memory.id), memory);
  } else {
    // IndexedDB
    await putIndexedDbItem(MEMORY_STORE, memory);
  }
  return memory;
}
```

> **Nota:** O exemplo acima mostra `saveMemory` que retorna `Memory`, mas a maioria das funções `save*` retorna `void` (ex: `saveGeneration`, `saveImageGeneration`, `saveChatSession`).

---

## 2. Fachada `db.ts`

`src/lib/db.ts` é um barrel de 1 linha que reexporta tudo de `src/lib/db/index.ts`:

```typescript
export * from './db/index';
```

`src/lib/db/index.ts` reexporta tipos e todos os módulos de domínio. `initDB` **não** é exportado publicamente — é usado internamente pelos módulos de domínio, que importam diretamente de `./shared`. O arquivo `migration.ts` existe em `src/lib/db/` mas **não** é reexportado pelo barrel — é usado apenas internamente:

```typescript
export * from './types';
export * from './memories';
export * from './user-settings';
export * from './generations';
export * from './images';
export * from './projects';
export * from './chats';
export * from './videos';
export * from './transcriptions';
export * from './audio-segments';
```

---

## 3. IndexedDB — Configuração

**Fonte:** `src/lib/db/shared.ts`

| Constante | Valor |
|---|---|
| `DB_NAME` | `'GeminiVoiceStudioDB'` |
| `DB_VERSION` | `9` |

### Stores (Object Stores)

Todas as stores usam `keyPath: 'id'`. Definidas em `STORE_DEFINITIONS`:

| Constante | Nome da Store | Domínio |
|---|---|---|
| `STORE_NAME` | `'generations'` | Gerações de áudio |
| `IMAGE_STORE` | `'image_generations'` | Gerações de imagem |
| `PROJECTS_STORE` | `'projects'` | Projetos |
| `AUDIOS_STORE` | `'audios'` | Áudios de projeto |
| `IMAGES_STORE` | `'project_images'` | Imagens de projeto |
| `MEMORY_STORE` | `'memories'` | Memórias do assistente |
| `CHAT_STORE` | `'chats'` | Sessões de chat |
| `SETTING_STORE` | `'user_settings'` | Configurações do usuário |
| `VIDEOS_STORE` | `'videos'` | Vídeos de projeto |
| `TRANSCRIPTIONS_STORE` | `'transcriptions'` | Transcrições de áudio (apenas local) |

### Indexes

A store `videos` possui dois indexes adicionais criados no upgrade:

- `projectId` (sobre o campo `projectId`)
- `userId` (sobre o campo `userId`)

### Utilitários IndexedDB

| Função | Descrição |
|---|---|
| `initDB()` | Abre/cria o banco, retorna `Promise<IDBDatabase>` |
| `putIndexedDbItem<T>(storeName, value)` | Insert ou update (via `store.put`) |
| `getAllIndexedDbItems<T>(storeName)` | Retorna todos os itens da store |
| `getIndexedDbItem<T>(storeName, key)` | Busca item por chave, retorna `null` se não encontrado |
| `deleteIndexedDbItem(storeName, key)` | Remove item por chave |
| `updateIndexedDbItem<T>(storeName, key, updater)` | Lê, aplica `updater`, e salva de volta |
| `countIndexedDbItems(storeName)` | Conta itens de uma store sem carregar dados (ideal para checagens leves) |

---

## 4. Tipos Compartilhados

**Fonte:** `src/lib/db/types.ts`

### `SavedAudioScene`

```typescript
export interface SavedAudioScene {
  imageUrl: string;
  timestamp: number;
}
```

### `SavedAudio`

```typescript
export interface SavedAudio {
  id: string;
  userId?: string;
  name: string;
  createdAt: number;
  audioBlob?: Blob;
  audioUrl?: string;
  script: string;
  voice: string;
  scenes?: SavedAudioScene[];
}
```

### `ProjectSettings`

```typescript
export interface ProjectSettings {
  selectedVoice: string;
  pace: string;
  styleNotes: string;
  isMultiSpeaker: boolean;
  speakerAName: string;
  speakerBName: string;
  speakerBVoice: string;
  audioProfile: string;
  scene: string;
  sceneDensity: number;
  sceneRatio: string;
  visualFramework?: string;
}
```

### `Project`

```typescript
export interface Project {
  id: string;
  userId?: string;
  name: string;
  script: string;
  createdAt: number;
  settings: ProjectSettings;
}
```

### `AudioSource`

```typescript
export interface AudioSource {
  id: string;
  projectId: string;
  userId?: string;
  audioUrl: string;
  createdAt: number;
  audioBlob?: Blob;
  /** Mapeamento chunk→timestamp do áudio gerado */
  audioSegments?: AudioSegment[];
}
```

### `AudioSegment`

```typescript
/** Segmento de áudio gerado a partir de um chunk do roteiro.
 *  Permite reconstruir o mapeamento texto→tempo sem depender de Whisper. */
export interface AudioSegment {
  /** Texto do roteiro enviado ao TTS para este chunk */
  text: string;
  /** Timestamp de início em segundos (relativo ao áudio final) */
  startSec: number;
  /** Timestamp de fim em segundos */
  endSec: number;
  /** Índice do chunk na sequência de geração */
  chunkIndex: number;
}
```

### `ProjectImage`

```typescript
export interface ProjectImage {
  id: string;
  projectId: string;
  userId?: string;
  imageUrl: string;
  prompt: string;
  timestamp: number;
  createdAt: number;
  imageBlob?: Blob;
}
```

### `Memory`

```typescript
export interface Memory {
  id: string;
  userId?: string;
  content: string;
  createdAt: number;
}
```

### `SavedImage`

```typescript
export interface SavedImage {
  id: string;
  userId?: string;
  name: string;
  imageUrl?: string;
  prompt: string;
  createdAt: number;
  imageBlob?: Blob;
  aspectRatio: string;
}
```

### `UserSetting`

```typescript
export interface UserSetting {
  id: string;
  userId?: string;
  customSystemPrompt: string;
  updatedAt: number;
}
```

### `AttachmentRecord` e `ChatMessageRecord`

```typescript
export interface AttachmentRecord {
  mimeType: string;
  data: string;
  name?: string;
}

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: AttachmentRecord[];
}
```

### `ChatSession`

```typescript
export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  messages: ChatMessageRecord[];
  updatedAt: number;
}
```

### `ProjectVideo`

```typescript
export interface ProjectVideo {
  id: string;
  projectId: string;
  userId: string;
  videoUrl: string;
  format: 'mp4' | 'webm';
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  fileSizeBytes: number;
  createdAt: number;
  videoBlob?: Blob;
}
```

---

## 5. Domínios de Persistência

### 5.1 Memories

**Fonte:** `src/lib/db/memories.ts`

| | Valor |
|---|---|
| Coleção Firestore | `memories` |
| Store IndexedDB | `'memories'` |
| Tipo | `Memory` |
| Converter | `memoryConverter` |

**Operações:**

| Função | Descrição |
|---|---|
| `saveMemory(content, userId?)` | Cria memória com `crypto.randomUUID()`, retorna `Memory` |
| `getMemories(userId?)` | Lista todas as memórias (Firestore filtra por `userId`) |
| `deleteMemory(id, userId?)` | Remove por ID |

---

### 5.2 User Settings

**Fonte:** `src/lib/db/user-settings.ts`

| | Valor |
|---|---|
| Coleção Firestore | `user_settings` |
| Store IndexedDB | `'user_settings'` |
| Tipo | `UserSetting` |
| Converter | `userSettingConverter` |

**Detalhe:** No modo anônimo, o ID do documento é `'local_settings'` (constante `LOCAL_SETTINGS_ID`). No modo autenticado, o ID é o `userId`.

**Operações:**

| Função | Descrição |
|---|---|
| `saveUserSettings(customSystemPrompt, userId?)` | Cria/atualiza configurações |
| `getUserSettings(userId?)` | Retorna `UserSetting | null` |

---

### 5.3 Generations (Gerações de Áudio)

**Fonte:** `src/lib/db/generations.ts`

| | Valor |
|---|---|
| Coleção Firestore | `generations` |
| Store IndexedDB | `'generations'` |
| Tipo | `SavedAudio` |
| Tipo Firestore | `FirestoreSavedAudio` (`Omit<SavedAudio, 'audioBlob'> & { audioUrl: string; scenes: SavedAudioScene[] }`) |
| Converter | `generationConverter` |

**Storage paths:**
- Áudio: `audios/{userId}/{id}.wav`
- Cenas de imagem: `generations_images/{userId}/{id}_scene_{index}.png`

**Comportamento especial:** Ao salvar, faz upload de `audioBlob` para Storage e processa cenas cujo `imageUrl` comece com `data:image` (faz fetch do data URI, upload para Storage, retorna URL https).

**Operações:**

| Função | Descrição |
|---|---|
| `saveGeneration(item, userId?)` | Upload de blob + save Firestore/IndexedDB |
| `getGenerations(userId?)` | Lista ordenada por `createdAt` descendente |

---

### 5.4 Image Generations

**Fonte:** `src/lib/db/images.ts`

| | Valor |
|---|---|
| Coleção Firestore | `image_generations` |
| Store IndexedDB | `'image_generations'` |
| Tipo | `SavedImage` |
| Tipo Firestore | `FirestoreSavedImage` (`Omit<SavedImage, 'imageBlob'> & { imageUrl: string }`) |
| Converter | `imageGenerationConverter` |

**Storage path:** `images/{userId}/{id}.png`

**Operações:**

| Função | Descrição |
|---|---|
| `saveImageGeneration(item, userId?)` | Upload de `imageBlob` para Storage + save |
| `getImageGenerations(userId?)` | Lista ordenada por `createdAt` descendente |
| `deleteImageGeneration(id, userId?)` | Remove do Firestore + Storage e/ou IndexedDB |

---

### 5.5 Projects

**Fonte:** `src/lib/db/projects.ts`

| | Valor |
|---|---|
| Coleção Firestore | `projects` |
| Store IndexedDB | `'projects'` |
| Tipo | `Project` |
| Converter | `projectConverter` |

**Subcoleções Firestore:**

| Subcoleção | Store IndexedDB | Tipo | Converter |
|---|---|---|---|
| `projects/{id}/audios` | `'audios'` | `AudioSource` / `FirestoreAudioSource` | `audioSourceConverter` |
| `projects/{id}/images` | `'project_images'` | `ProjectImage` / `FirestoreProjectImage` | `projectImageConverter` |
| `projects/{id}/videos` | `'videos'` | `ProjectVideo` / `FirestoreProjectVideo` | `videoConverter` (definido em `videos.ts`) |

**Storage paths:**

| Recurso | Path |
|---|---|
| Áudio do projeto | `projects/{userId}/{projectId}/audios/{id}.wav` |
| Imagem do projeto | `projects/{userId}/{projectId}/images/{id}.png` |
| Vídeo do projeto | `projects/{userId}/{projectId}/videos/{id}.{ext}` |

**Operações:**

| Função | Descrição |
|---|---|
| `saveProject(project, userId?)` | Cria/atualiza projeto |
| `getProjects(userId?)` | Lista ordenada por `createdAt` descendente |
| `saveAudioToProject(audio, userId?)` | Salva áudio na subcoleção, retorna `audioUrl` |
| `saveImageToProject(image, userId?)` | Salva imagem na subcoleção, retorna `imageUrl` |
| `getProjectDetails(projectId, userId?)` | Retorna `{ audios, images }` de um projeto |
| `getProjectsDetailsMap(userId?)` | Retorna `Record<projectId, { audios, images }>` para todos os projetos (usa `collectionGroup` no Firestore) |
| `deleteProject(projectId, userId?)` | Remove projeto + todos os áudios, imagens e vídeos associados (inclusive Storage) |
| `updateProjectName(projectId, newName, userId?)` | Atualiza apenas o campo `name` |

**Detalhe do `deleteProject`:** No Firestore, deleta o documento do projeto + todas as subcoleções + arquivos do Storage em paralelo. No IndexedDB, busca todos os itens e filtra por `projectId`.

---

### 5.6 Chats

**Fonte:** `src/lib/db/chats.ts`

| | Valor |
|---|---|
| Coleção Firestore | `chats` |
| Store IndexedDB | `'chats'` |
| Tipo | `ChatSession` |
| Converter | `chatSessionConverter` |

**Operações:**

| Função | Descrição |
|---|---|
| `saveChatSession(session, userId?)` | Cria/atualiza sessão (setDoc com userId). Se o documento estimado exceder `FIRESTORE_MAX_DOC_SIZE_BYTES` (900 000 bytes), faz fallback para IndexedDB sem salvar no Firestore |
| `getChatSessions(userId?)` | Lista ordenada por `updatedAt` descendente |
| `deleteChatSession(id, userId?)` | Remove por ID |

---

### 5.7 Videos (Subcoleção de Projeto)

**Fonte:** `src/lib/db/videos.ts`

| | Valor |
|---|---|
| Coleção Firestore | `projects/{projectId}/videos` |
| Store IndexedDB | `'videos'` |
| Tipo | `ProjectVideo` |
| Tipo Firestore | `FirestoreProjectVideo` (`Omit<ProjectVideo, 'videoBlob'>`) |
| Converter | `videoConverter` |

**Storage path:** `projects/{userId}/{projectId}/videos/{id}.{ext}` (extensão baseada no `format`: `mp4` ou `webm`)

**Operações:**

| Função | Descrição |
|---|---|
| `saveVideoToProject(video, userId?)` | Cria vídeo com `crypto.randomUUID()`, upload do blob, retorna `ProjectVideo` |
| `getProjectVideos(projectId, userId?)` | Lista por projeto, ordenada por `createdAt` descendente (Firestore usa `orderBy`) |
| `deleteVideoFromProject(videoId, projectId, userId?)` | Lê formato do doc, deleta Firestore + Storage |

---

### 5.8 Transcriptions

**Fonte:** `src/lib/db/transcriptions.ts`

> **Apenas IndexedDB.** Transcrições são dados temporários por projeto e não fazem sync com Firestore.

| | Valor |
|---|---|
| Store IndexedDB | `'transcriptions'` |
| Tipo | `StoredTranscription` (definido em `src/lib/db/transcriptions.ts`) |

**Tipo:**

```typescript
export interface StoredTranscription {
  id: string;          // projectId
  result: TranscriptionResult;
  createdAt: number;
}
```

> `TranscriptionResult` é importado de `src/features/video-render/types`.

**Operações:**

| Função | Descrição |
|---|---|
| `saveTranscription(projectId, result)` | Salva transcrição no IndexedDB (usa `projectId` como chave) |
| `loadTranscription(projectId)` | Carrega transcrição de um projeto, retorna `StoredTranscription \| null` |
| `deleteTranscription(projectId)` | Remove transcrição persistida de um projeto |

---

### 5.9 Audio Segments

**Fonte:** `src/lib/db/audio-segments.ts`

> **Apenas IndexedDB.** Segmentos de áudio são metadados de mapeamento texto→tempo e não fazem sync com Firestore.

| | Valor |
|---|---|
| Store IndexedDB | `'audios'` (reutiliza `AUDIOS_STORE`) |
| Tipo | `AudioSegment` |

> Segmentos são armazenados como campo `audioSegments` dentro de um documento `AudioSource` existente. Usa `updateIndexedDbItem` para preservar os demais campos (audioBlob, etc).

**Operações:**

| Função | Descrição |
|---|---|
| `saveAudioSegments(projectId, segments)` | Atualiza o campo `audioSegments` de um `AudioSource` existente via merge. Se o documento não existir, loga warning e ignora |
| `loadAudioSegments(projectId)` | Retorna `AudioSegment[] \| null` (null se não houver documento ou campo) |

---

## 6. Utilitários Compartilhados

**Fonte:** `src/lib/db/shared.ts`

### Firestore Converter Genérico

```typescript
export function createFirestoreConverter<T extends DocumentData>(): FirestoreDataConverter<T>
```

Remove campos `undefined` na serialização via `removeUndefinedFields()`, que faz cleanup recursivo mantendo `Blob` e `Date` intactos.

### Storage Helpers

| Função | Descrição |
|---|---|
| `uploadBlobAndGetUrl(storagePath, blob)` | Upload para Storage + retorna `getDownloadURL` |
| `deleteStorageObjectSafely(storagePath, warningMessage)` | Deleta do Storage, captura erro como `console.warn` |

### Tratamento de Erros

| Função | Descrição |
|---|---|
| `handleFirestoreError(error, operationType, path)` | Loga erro detalhado (incluindo auth info) e lança `Error` com JSON |

`OperationType`: enum com membros `CREATE`, `UPDATE`, `DELETE`, `LIST`, `GET`, `WRITE` (valores string: `'create'`, `'update'`, `'delete'`, `'list'`, `'get'`, `'write'`)

---

## 7. Firestore Rules

**Fonte:** `firestore.rules`

### Helpers

| Função | Lógica |
|---|---|
| `isAuthenticated()` | `request.auth != null` |
| `isOwner(userId)` | Autenticado + `request.auth.uid == userId` |
| `isAdmin()` | Autenticado + (campo `role == 'admin'` no doc `users/{uid}` OU email `kurosaki.mpm@gmail.com` verificado) |

### Validação por Coleção

| Coleção | Função de validação | Campos obrigatórios | Restrições |
|---|---|---|---|
| `memories` | `isValidMemory` | `id`, `userId`, `content`, `createdAt` | `content`: string, 1-500000 chars |
| `user_settings` | `isValidUserSetting` | `id`, `userId`, `customSystemPrompt`, `updatedAt` | `customSystemPrompt`: string, < 500000 chars |
| `chats` | `isValidChat` | `id`, `userId`, `title`, `messages`, `updatedAt` | `title`: string, 1-500 chars; `messages`: list |
| `generations` | `isValidGeneration` | `id`, `userId`, `name`, `script`, `voice`, `audioUrl`, `createdAt` | `name`: string, `size() > 0`; `script`: string, `size() > 0`; `audioUrl`: regex `^https://.*` ou `^blob:.*`; `scenes`: list, max 100 |
| `image_generations` | `isValidImageGeneration` | `id`, `userId`, `name`, `prompt`, `aspectRatio`, `imageUrl`, `createdAt` | `name`: string, `size() > 0`; `prompt`: string, `size() > 0`; `imageUrl`: regex `^https://.*` ou `^data:image/.*` |
| `projects` | `isValidProject` | `id`, `userId`, `name`, `script`, `createdAt` | `name`: string, `size() > 0` |
| Subcoleção `audios` | `isValidAudio` | `id`, `projectId`, `userId`, `audioUrl`, `createdAt` | `audioUrl`: regex `^https://.*` ou `^blob:.*` |
| Subcoleção `images` | `isValidProjectImage` | `id`, `projectId`, `userId`, `imageUrl`, `prompt`, `timestamp`, `createdAt` | `imageUrl`: regex `^https://.*` ou `^data:image/.*` |
| Subcoleção `videos` | `isValidProjectVideo` | `id`, `projectId`, `userId`, `videoUrl`, `format`, `width`, `height`, `fps`, `durationInSeconds`, `fileSizeBytes`, `createdAt` | `format`: `'mp4'` ou `'webm'`; `videoUrl`: regex `^https://.*` ou `^blob:.*` |

### Ownership por Coleção

| Coleção | Read | Create | Update | Delete |
|---|---|---|---|---|
| `memories` | `userId == auth.uid` | `isValidMemory` | `isOwner` + `isValidMemory` | `isOwner` |
| `user_settings` | `settingId == auth.uid` | `settingId == auth.uid` + valid | `settingId == auth.uid` + valid | `settingId == auth.uid` |
| `generations` | `userId == auth.uid` | `isValidGeneration` | `isOwner` + `isValidGeneration` | `isOwner` |
| `chats` | `userId == auth.uid` | `isValidChat` | `isOwner` + `isValidChat` | `isOwner` |
| `image_generations` | `userId == auth.uid` | `isValidImageGeneration` | `isOwner` + `isValidImageGeneration` | `isOwner` |
| `projects` | `isOwner` ou `isAdmin` | `isValidProject` | `isOwner` ou `isAdmin` + valid | `isOwner` ou `isAdmin` |
| `projects/*/audios` | Owner do projeto ou `isAdmin` | Owner do projeto ou `isAdmin` + valid | — | Owner do projeto ou `isAdmin` |
| `projects/*/images` | Owner do projeto ou `isAdmin` | Owner do projeto ou `isAdmin` + valid | — | Owner do projeto ou `isAdmin` |
| `projects/*/videos` | Owner do projeto ou `isAdmin` | Owner do projeto ou `isAdmin` + valid | — | Owner do projeto ou `isAdmin` |

### Collection Groups

Existem regras de collection group para `audios`, `images` e `videos` (`audios` e `images` usadas por `getProjectsDetailsMap`; `videos` é mantida para consistência):

```
match /{path=**}/audios/{audioId}  → read/delete com isOwner ou isAdmin; create com isValidAudio (sem isAdmin)
match /{path=**}/images/{imageId}  → read/delete com isOwner ou isAdmin; create com isValidProjectImage (sem isAdmin)
match /{path=**}/videos/{videoId}  → read/delete com isOwner ou isAdmin; create com isValidProjectVideo (sem isAdmin)
```

> As funções `isValid*` verificam internamente se `data.userId == request.auth.uid`, garantindo ownership no create sem necessidade de checagem explícita.

---

## 8. Storage Rules

**Fonte:** `storage.rules`

### Admin Override

`kurosaki.mpm@gmail.com` (email verificado) tem permissão de **leitura e deleção** (sem escrita) em áudios e projetos. Escrita (create/update/write) requer `isOwner`.

### Limites por Path

| Path | Tipos permitidos | Tamanho máximo | Leitura/Deleção | Escrita (create/update) |
|---|---|---|---|---|
| `audios/{userId}/{audioId}` | `audio/*` | **50 MB** | Owner ou Admin | Owner |
| `images/{userId}/{imageId}` | `image/*` | **10 MB** | Owner | Owner |
| `generations_images/{userId}/{imageId}` | `image/*` | **10 MB** | Owner | Owner |
| `projects/{userId}/{projectId}/videos/{videoId}` | `video/mp4` ou `video/webm` | **200 MB** | Owner ou Admin | Owner |
| `projects/{userId}/{allPaths=**}` | qualquer | **50 MB** | Owner ou Admin | Owner |
| `previews/{allPaths=**}` | qualquer | sem limite | **público** (`true`) | Admin only |

> A regra de vídeos (200 MB) é avaliada **antes** do wildcard de projetos, pois as rules são avaliadas por especificidade e ordem.

---

## 9. Observações

### `firebase-blueprint.json`

Existe no repositório como documentação/schema de referência, mas **não é config ativa** em runtime. O código real de persistência é `src/lib/db/`. Se houver divergência entre o blueprint e o código, o código é a fonte de verdade.

### Diferença entre `userId` obrigatório e opcional nos tipos

Na maioria dos tipos, `userId` é `string | undefined` (opcional). Exceção: `ProjectVideo.userId` é `string` (obrigatório). No modo IndexedDB, `userId` pode não ser preenchido ou ser string vazia.

### Operações de update

Apenas alguns domínios suportam update parcial:
- **Projects:** `updateProjectName` (atualiza `name` via `setDoc` com `merge: true` no Firestore)
- **User Settings:** `saveUserSettings` reescreve o documento inteiro
- **Memories, Chats:** sem update — reescrevem o documento inteiro via `save*`

### Ordenação

Todas as operações de listagem retornam dados ordenados:

| Domínio | Ordenação |
|---|---|
| Generations | `createdAt` descendente |
| Image Generations | `createdAt` descendente |
| Projects | `createdAt` descendente |
| Project Audios | `createdAt` ascendente |
| Project Images | `timestamp` ascendente |
| Chats | `updatedAt` descendente |
| Project Videos | `createdAt` descendente (Firestore usa `orderBy`) |
