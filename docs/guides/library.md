# Biblioteca & Projetos — Script Master

Documentacao completa da area de biblioteca, extraida diretamente do codigo-fonte.

---

## Visao Geral

A Biblioteca centraliza o acesso a projetos e geracoes salvas, oferecendo duas interfaces complementares:

| Componente | Rota | Funcao principal |
|---|---|---|
| `Library` | `/biblioteca` | Lista projetos com detalhes expandidos (audios, cenas, roteiro) |
| `VideoLibrary` | `/video` (abaixo do player) | Galeria horizontal para selecao rapida + download em lote |

Ambas consomem os mesmos modulos de persistencia (`projects.ts`, `generations.ts`) e o utilitario de download (`download.ts`).

---

## Arquitetura

```
src/
  pages/
    LibraryPage.tsx          # Thin wrapper → <Library />
    VideoPage.tsx            # Render + <VideoLibrary /> (abaixo do player)
  components/
    Library.tsx              # Biblioteca principal (expansivel, CRUD)
    VideoLibrary.tsx         # Galeria horizontal com selecao + batch download
  lib/
    db/
      projects.ts            # CRUD de projetos + subcolecoes (audios/images)
      generations.ts         # CRUD de geracoes de audio
      types.ts               # Project, AudioSource, ProjectImage, SavedAudio...
    download.ts              # downloadFile() — client-side
```

### Dependencias externas do componente

| Context/Hook | Arquivo | Uso |
|---|---|---|
| `useAuth` | `src/contexts/AuthContext.ts` | `user?.uid` para persistencia condicional |
| `useGlobalAudioState` | `src/contexts/AudioContext.ts` | play/pause na Library |

---

## Tipos e Interfaces

> `src/lib/db/types.ts`

### Entidades principais

```typescript
export interface Project {
  id: string;
  userId?: string;
  name: string;
  script: string;
  createdAt: number;
  settings: ProjectSettings;
}

export interface AudioSource {
  id: string;
  projectId: string;
  userId?: string;
  audioUrl: string;
  createdAt: number;
  audioBlob?: Blob;
  audioSegments?: AudioSegment[];
}

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

export interface SavedAudioScene {
  imageUrl: string;
  timestamp: number;
}

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

### Tipos internos (componentes)

```typescript
// Library.tsx
interface ProjectDataState {
  audios: AudioSource[];
  images: ProjectImage[];
}

// VideoLibrary.tsx
interface VideoLibraryScene {
  imageUrl: string;
  timestamp: number;
}

interface VideoLibraryItem extends Project {
  thumbnail?: string;
  isGeneration?: boolean;
  audioUrl?: string;
  scenes?: VideoLibraryScene[];
}

interface VideoLibraryProps {
  onSelect: (
    projectId: string,
    audioUrl: string,
    scenes: { imageUrl: string; timestamp: number }[],
    script: string
  ) => void;
  activeProjectId?: string | null;
}
```

---

## Persistencia (Dual Storage)

Todas as funcoes de persistencia seguem o padrao **Firestore primeiro, IndexedDB como fallback**:
- Se `userId` existe → Firestore (com upload de blobs para Storage)
- Se nao → IndexedDB local

Veja `docs/guides/persistence.md` para detalhes completos do dual storage.

### Projetos

Firestore usa subcolecoes aninhadas:

```
projects/{projectId}           ← documento principal (Project)
  audios/{audioId}             ← subcolecao (AudioSource)
  images/{imageId}             ← subcolecao (ProjectImage)
```

Storage paths:
- Audio: `projects/{userId}/{projectId}/audios/{audioId}.wav`
- Imagem: `projects/{userId}/{projectId}/images/{imageId}.png`

### Geracoes

```
generations/{generationId}     ← documento unico (SavedAudio + scenes)
```

Storage paths:
- Audio: `audios/{userId}/{generationId}.wav`
- Cena: `generations_images/{userId}/{generationId}_scene_{index}.png`

---

## Funcoes Exportadas

### `src/lib/db/projects.ts`

| Funcao | Assinatura | Descricao |
|---|---|---|
| `saveProject` | `(project, userId?) → Promise<void>` | Salva projeto no Firestore ou IndexedDB |
| `getProjects` | `(userId?) → Promise<Project[]>` | Lista projetos ordenados por `createdAt` decrescente |
| `saveAudioToProject` | `(audio, userId?) → Promise<string>` | Salva audio na subcolecao; retorna `audioUrl` |
| `saveImageToProject` | `(image, userId?) → Promise<string>` | Salva imagem na subcolecao; retorna `imageUrl` |
| `getProjectDetails` | `(projectId, userId?) → Promise<{audios, images}>` | Detalhes de um projeto (audios + imagens) |
| `getProjectsDetailsMap` | `(userId?) → Promise<Record<string, {audios, images}>>` | Detalhes de todos os projetos em um mapa |
| `deleteProject` | `(projectId, userId?) → Promise<void>` | Exclui projeto + audios + imagens + videos + Storage |
| `updateProjectName` | `(projectId, newName, userId?) → Promise<void>` | Atualiza nome do projeto |

### `src/lib/db/generations.ts`

| Funcao | Assinatura | Descricao |
|---|---|---|
| `saveGeneration` | `(item, userId?) → Promise<void>` | Salva geracao com upload de audio + cenas |
| `getGenerations` | `(userId?) → Promise<SavedAudio[]>` | Lista geracoes ordenadas por `createdAt` decrescente |

### `src/lib/download.ts`

| Funcao | Assinatura | Descricao |
|---|---|---|
| `downloadFile` | `(url, filename) → Promise<void>` | Download client-side com fallback |

---

## Fluxo de Dados

### Library (pagina `/biblioteca`)

```
montagem
  → useAuth() obtém user?.uid
  → loadProjects() chama getProjects(userId)
  → renderiza lista de projetos (ordenados por data)

ao expandir um projeto
  → handleExpandProject(projectId)
  → getProjectDetails(projectId, userId)
  → exibe: versoes de audio, cenas geradas, roteiro original

ao reproduzir audio
  → handlePlay(audio) cria blob URL se necessario
  → play(url, audio.id) via useGlobalAudioState

ao renomear
  → saveEdit(id) → updateProjectName() → loadProjects()

ao excluir
  → confirmDelete() → deleteProject() → loadProjects()
```

### VideoLibrary (galeria na pagina `/video`)

```
montagem
  → Promise.all([getProjects, getGenerations, getProjectsDetailsMap])
  → mescla projetos + geracoes (com cenas) em lista unificada
  → ordena por createdAt decrescente
  → resolve thumbnails e blob URLs

ao selecionar
  → handleSelect(item) → onSelect(projectId, audioUrl, scenes, script)
  → VideoPage recebe e carrega dados no Remotion Player

download em lote
  → handleDownloadSequence(item)
  → 1. download audio (.wav)
  → 2. download cada cena (.png) com delay de 400ms entre eles
```

---

## Downloads Client-side

> `src/lib/download.ts:14`

```typescript
export async function downloadFile(url: string, filename: string): Promise<void>
```

Estrategia de download em 3 etapas:

1. **URLs locais** (`blob:` ou `data:`) — trigger direto via `<a download>`
2. **URLs remotas** — `fetch` → `blob` → `createObjectURL` → trigger → `revokeObjectURL`
3. **Fallback** — se o fetch falhar, abre a URL diretamente no navegador

Nomes de arquivo gerados automaticamente:
- Audio: `{projectName}-{audioId}.wav`
- Cena: `{projectName}-cena-{numero}.png` (Library) ou `{safeName}-cena-{nn}.png` (VideoLibrary, com slug do nome)

---

## Gerenciamento de Blob URLs

Ambos os componentes rastreiam blob URLs criados para limpeza ao desmontar:

| Componente | Estrategia |
|---|---|
| `Library` | `blobUrlsRef: useRef<string[]>` — push manual + cleanup via `cleanupBlobUrls()` |
| `VideoLibrary` | `blobUrlsRef: useRef<Set<string>>` — `createTrackedBlobUrl()` + `revokeAllBlobUrls()` automatico |

---

## Referencia Rapida de Arquivos

| Arquivo | Linhas | Responsabilidade |
|---|---|---|
| `src/pages/LibraryPage.tsx` | 5 | Wrapper — renderiza `<Library />` |
| `src/components/Library.tsx` | 562 | Biblioteca principal (listar, expandir, reproduzir, renomear, excluir) |
| `src/components/VideoLibrary.tsx` | 451 | Galeria horizontal com selecao e batch download |
| `src/lib/db/projects.ts` | 300 | CRUD de projetos e subcolecoes (audios/images) |
| `src/lib/db/generations.ts` | 90 | CRUD de geracoes de audio |
| `src/lib/db/types.ts` | 137 | Tipos: Project, AudioSource, ProjectImage, SavedAudio, etc. |
| `src/lib/download.ts` | 43 | Utilitario de download client-side |
