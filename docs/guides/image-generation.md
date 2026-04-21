# Geração de Imagens — Script Master

Documentação baseada exclusivamente no código-fonte do projeto.

## Modelo Gemini Utilizado

O projeto usa um único modelo para geração de imagens:

| Modelo | Uso | Arquivo |
|--------|-----|---------|
| `gemini-3.1-flash-image-preview` | Geração de imagens (Estúdio de Imagem e pipeline de cenas de vídeo) | `src/hooks/useImageGenerator.ts`, `src/lib/gemini.ts:266` |

Há também um modelo auxiliar para prompts de cena (não gera imagens, apenas texto):

| Modelo | Uso | Arquivo |
|--------|-----|---------|
| `gemini-3.1-flash-lite-preview` | Geração de descrições de cena (prompts) e plano de edição | `src/lib/gemini.ts:214`, `src/lib/gemini.ts:394` |

---

## Fluxos de Geração de Imagem

### Fluxo Único: Estúdio de Imagem e Cenas de Vídeo (`useImageGenerator` + `generateImageFromPrompt`)

Pipeline usado tanto pelo componente `ImageStudio.tsx` quanto pelo pipeline de cenas de vídeo em `gemini.ts`. Ambos usam o mesmo modelo `gemini-3.1-flash-image-preview`.

```
Usuário escreve prompt → [opcional] anexa imagem de referência → hook chama Gemini → extrai inlineData → converte base64 para Blob → exibe via blob URL
```

**Arquivos:** `src/hooks/useImageGenerator.ts`, `src/components/ImageStudio.tsx`

#### Passo a passo

1. **Montagem do conteúdo** (`useImageGenerator.ts:87-109`):
   - Se há `referenceImage`, o arquivo é lido como DataURL via `FileReader`, extraído o base64 puro (sem prefixo) e enviado como `inlineData` **antes** do prompt textual.
   - O prompt do usuário é enviado como `{ text: options.prompt }`.

2. **Chamada ao Gemini** (`useImageGenerator.ts:111-119`):
   ```typescript
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
     contents,
     config: {
       imageConfig: {
         aspectRatio: options.aspectRatio,
       },
     },
   });
   ```

3. **Extração da imagem** (`useImageGenerator.ts:121-139`):
   - Itera sobre `response.candidates?.[0]?.content?.parts`.
   - Filtra partes que possuem `part.inlineData?.data`.
   - Usa `part.inlineData.mimeType || 'image/png'` como fallback de mime.
   - Converte base64 para `Blob` via `base64ToBlobSync` (de `src/lib/audio.ts:94`).
   - Cria blob URL com `URL.createObjectURL(blob)`.
   - Para na primeira imagem encontrada (`break`).

4. **Tratamento de erros** (`useImageGenerator.ts:13-37`):
   - Mapeia erros técnicos para mensagens em pt-BR via `toUserFriendlyImageError`.
   - Erros de quota (429, RESOURCE_EXHAUSTED), autenticação, timeout (504), indisponibilidade (503) e segurança (blocked) têm mensagens dedicadas.
   - Auto-dismiss do erro após 8 segundos.

### Fluxo 2: Geração em Pipeline de Cenas (`generateImageFromPrompt`)

Usado pelo pipeline de vídeo para gerar imagens de cena automaticamente.

**Arquivo:** `src/lib/gemini.ts:247-303`

#### Diferenças em relação ao Fluxo 1

- **Mesmo modelo:** `gemini-3.1-flash-image-preview`.
- **Retorno:** retorna `data URL` (`data:${mimeType};base64,${imageData}`) em vez de Blob.
- **Retry com backoff:** até `MAX_IMAGE_RETRIES = 2` tentativas, com delay crescente (`retries * 3000` ms).
- **Condições de retry:** erros de quota, `Deadline`, `UNAVAILABLE` (503).
- **Referência:** aceita `string` (data URL ou base64 puro) em vez de `File`.

```typescript
export async function generateImageFromPrompt(
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '16:9',
  referenceImage?: string,
): Promise<string | null>
```

---

## Configuração

### `imageConfig`

Ambos os fluxos usam a mesma configuração de imagem:

```typescript
config: {
  imageConfig: {
    aspectRatio: options.aspectRatio, // string passada pelo usuário
  },
}
```

O objeto `imageConfig` contém apenas `aspectRatio`. Não há configuração de `numberOfImages`, `style`, ou outros parâmetros no código.

### Aspect Ratios Suportados

Definidos no componente `ImageStudio.tsx:40-49`:

```typescript
const ASPECT_RATIOS = [
  { id: '1:1',  label: 'Quadrado (1:1)' },
  { id: '16:9', label: 'Paisagem (16:9)' },
  { id: '9:16', label: 'Retrato (9:16)' },
  { id: '4:3',  label: 'Clássico (4:3)' },
  { id: '3:4',  label: 'Retrato clássico (3:4)' },
  { id: '3:2',  label: 'Foto (3:2)' },
  { id: '2:3',  label: 'Foto retrato (2:3)' },
  { id: '21:9', label: 'Cinemático (21:9)' },
] as const;
```

O tipo literal na assinatura de `generateImageFromPrompt` é mais restritivo:

```typescript
aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
```

Ou seja, o pipeline de cenas suporta 5 ratios, enquanto o Estúdio de Imagem (que usa `string`) aceita todos os 8.

---

## Image Editing com Referência

O projeto suporta enviar uma imagem de referência junto com o prompt para editar/mantecer consistência visual.

### No Estúdio de Imagem (`useImageGenerator`)

- O usuário anexa um `File` via input `<input type="file" accept="image/*">`.
- O hook converte para base64 via `FileReader.readAsDataURL` e extrai a parte após a vírgula.
- A referência é enviada como `inlineData` **antes** do texto do prompt.

```typescript
// useImageGenerator.ts:88-109
const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

if (options.referenceImage) {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(options.referenceImage!);
  });
  contents.push({
    inlineData: { mimeType: options.referenceImage.type, data: base64Data },
  });
}

contents.push({ text: options.prompt });
```

### No pipeline de cenas (`generateImageFromPrompt`)

- A referência é uma `string` (data URL ou base64 puro).
- Usa `parseReferenceImage` para extrair mimeType e dados.

```typescript
// gemini.ts:41-55
function parseReferenceImage(referenceImage: string): ReferenceImagePayload {
  const dataUriMatch = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUriMatch) {
    return { mimeType: dataUriMatch[1], data: dataUriMatch[2] };
  }
  return { mimeType: 'image/jpeg', data: referenceImage };
}
```

---

## Tipos TypeScript

### `ImageGenerationOptions` — opções do hook

**Arquivo:** `src/hooks/useImageGenerator.ts:43-47`

```typescript
export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio: string;
  referenceImage?: File;
}
```

### `SavedImage` — documento persistido

**Arquivo:** `src/lib/db/types.ts:69-78`

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

### `ProjectImage` — imagem vinculada a um projeto

**Arquivo:** `src/lib/db/types.ts:51-60`

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

### `ScenePrompt` — prompt de cena gerado pela IA

**Arquivo:** `src/lib/gemini.ts:18-21`

```typescript
export interface ScenePrompt {
  timestamp: number;
  prompt: string;
}
```

### `SceneImagePayload` — imagem de cena como base64

**Arquivo:** `src/lib/gemini.ts:29-36`

```typescript
export interface SceneImagePayload {
  timestamp: number;
  mimeType: string;
  base64: string;
}
```

### `ReferenceImagePayload` — referência parseada

**Arquivo:** `src/lib/gemini.ts:23-26`

```typescript
interface ReferenceImagePayload {
  mimeType: string;
  data: string;
}
```

---

## Tratamento da Resposta do Gemini

A resposta é percorrida em `response.candidates?.[0]?.content?.parts` procurando partes com `inlineData.data`:

```typescript
for (const part of response.candidates?.[0]?.content?.parts ?? []) {
  if (!part.inlineData?.data) {
    continue;
  }
  const imageData = part.inlineData.data;
  const mimeType = part.inlineData.mimeType || 'image/png';
  // ...
}
```

**Comportamento:** partes sem `inlineData` (como texto ou `thought`) são ignoradas com `continue`. O código usa `||` no mime type, então caso o campo venha vazio, assume `image/png`.

No Estúdio de Imagem, se nenhuma imagem for encontrada, lança erro: `"Nenhuma imagem foi retornada pelo modelo."`. No pipeline de cenas, retorna `null`.

---

## Geração de Prompts de Cena

A função `generateScenePrompts` (`src/lib/gemini.ts:181-245`) não gera imagens — gera **descrições textuais** que depois alimentam `generateImageFromPrompt`.

### Parâmetros

```typescript
export async function generateScenePrompts(
  script: string,
  durationInSeconds: number,
  style: string,
  densitySeconds: number = 15,
  visualFramework: string = 'general',
): Promise<ScenePrompt[]>
```

### Comportamento

- Calcula `imageCount = Math.max(1, Math.ceil(durationInSeconds / densitySeconds))`.
- Constrói system prompt com instruções em português, pedindo prompts de cena em **inglês**.
- Suporta dois modos de `visualFramework`:
  - **`whiteboard`**: instruções para estilo whiteboard animation (fundo branco, ilustrações coloridas, texto integrado).
  - **`general`** (padrão): foco em fotografia e cinemática.
- Usa `responseMimeType: "application/json"` com schema estruturado (`Type.ARRAY` de objetos com `timestamp` e `prompt`).
- Em caso de erro, retorna fallback com prompt genérico a partir das primeiras 100 letras do roteiro.

---

## Análise Visual de Cenas (Plano de Edição)

A função `generateEditingPlan` (`src/lib/gemini.ts:315-474`) pode receber imagens reais das cenas para análise visual multimodal.

### Fluxo

1. `loadSceneImagesForAnalysis` (`gemini.ts:121-146`) carrega até `MAX_IMAGES_FOR_ANALYSIS = 8` imagens como base64.
2. Seleção representativa: sempre inclui primeira e última cena, distribui intermediárias uniformemente.
3. Imagens são enviadas como `inlineData` **antes** do texto do prompt.
4. O modelo analisa composição visual (framing, mood, profundidade, iluminação) para refinar transições, câmera e efeitos.

---

## Persistência

### Dual Storage

O projeto segue o padrão dual storage:

| Condição | Destino |
|----------|---------|
| Usuário autenticado (`userId`) | Firestore + Firebase Storage |
| Usuário anônimo | IndexedDB local |

### Salvando uma imagem gerada

**Função:** `saveImageGeneration` (`src/lib/db/images.ts:28-48`)

**Autenticado:**
1. Faz upload do blob para Firebase Storage em `images/{userId}/{id}.png`.
2. Armazena metadados no Firestore collection `image_generations` com `imageUrl` (download URL).
3. O blob **não** é persistido no Firestore (removido antes do setDoc).

**Anônimo:**
1. Salva o objeto completo (incluindo `imageBlob`) no IndexedDB store `image_generations`.

### Operações disponíveis

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `saveImageGeneration` | `src/lib/db/images.ts:28` | Cria nova geração |
| `getImageGenerations` | `src/lib/db/images.ts:50` | Lista todas, ordenadas por `createdAt` decrescente |
| `deleteImageGeneration` | `src/lib/db/images.ts:63` | Remove (Firestore + Storage ou IndexedDB) |
| `updateImageGenerationName` | `src/lib/db/images.ts:80` | Atualiza apenas o nome |

### Dados salvos no Estúdio de Imagem

Construído em `ImageStudio.tsx:125-132`:

```typescript
const newItem = {
  id: crypto.randomUUID(),
  name: `Imagem - ${new Date().toLocaleDateString()}`,
  createdAt: Date.now(),
  imageBlob,
  prompt,
  aspectRatio,
};
await saveImageGeneration(newItem, user?.uid);
```

### IndexedDB

- **Database:** `GeminiVoiceStudioDB` (versão 8)
- **Store:** `image_generations` (keyPath: `id`)

---

## Utilitário `base64ToBlobSync`

**Arquivo:** `src/lib/audio.ts:94-101`

Reutilizado tanto pelo hook de áudio quanto pelo de imagem:

```typescript
export function base64ToBlobSync(base64: string, mimeType: string = 'image/png'): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
```

---

## Referência Rápida de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/hooks/useImageGenerator.ts` | Hook React para geração interativa de imagens |
| `src/components/ImageStudio.tsx` | UI do Estúdio de Imagem (prompt, ratio, referência, preview) |
| `src/lib/gemini.ts` | Integração Gemini: `generateImageFromPrompt`, `generateScenePrompts`, `generateEditingPlan`, análise visual |
| `src/lib/db/images.ts` | CRUD de `image_generations` (Firestore + IndexedDB) |
| `src/lib/db/types.ts` | Tipos: `SavedImage`, `ProjectImage` |
| `src/lib/db/shared.ts` | Utilitários de persistência, `uploadBlobAndGetUrl`, IndexedDB helpers |
| `src/lib/audio.ts` | `base64ToBlobSync` (reutilizado para imagens) |
| `src/lib/env.ts` | `getGeminiApiKey()` — leitura da chave de API |
