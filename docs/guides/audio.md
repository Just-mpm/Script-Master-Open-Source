# Audio & TTS — Script Master

Documentacao completa do pipeline de audio do projeto, extraida diretamente do codigo-fonte.

---

## Modelos Gemini Envolvidos

| Funcao | Modelo | Arquivo |
|--------|--------|---------|
| TTS (fala) | `gemini-3.1-flash-tts-preview` | `src/hooks/useAudioGenerator.ts:391` |
| Chunking via LLM | `gemini-3.1-flash-lite-preview` | `src/hooks/useAudioGenerator.ts:283` |
| Prompts de cena | `gemini-3.1-flash-lite-preview` | `src/lib/gemini.ts:215` |

Todas as chamadas usam `@google/genai` (`GoogleGenAI`) diretamente no cliente.

---

## Constantes Principais

> `src/lib/constants.ts`

```typescript
export const MAX_CHARS = 50000;
export const CHUNK_LIMIT = 500;
```

- **`MAX_CHARS`** (50.000): limite maximo de caracteres do roteiro. Roteiros maiores sao rejeitados com erro.
- **`CHUNK_LIMIT`** (500): limite de caracteres por chunk enviado ao TTS. Esse e o tamanho maximo que o modelo TTS aceita por chamada.

---

## Voze Disponiveis

> `src/lib/constants.ts` — array `VOICES`

Cada voz segue a interface `Voice` (`src/lib/types.ts`):

```typescript
export interface Voice {
  id: string;
  name: string;
  style: string;
}
```

Lista completa (30 vozes):

| id | style |
|----|-------|
| Aoede | Descontraida |
| Zephyr | Brilhante |
| Puck | Animada |
| Charon | Informativa |
| Kore | Firme |
| Fenrir | Entusiasmada |
| Leda | Jovem |
| Orus | Firme |
| Callirrhoe | Tranquila |
| Autonoe | Brilhante |
| Enceladus | Suave/Aerea |
| Iapetus | Clara |
| Umbriel | Tranquila |
| Algieba | Suave |
| Despina | Suave |
| Erinome | Clara |
| Algenib | Rouca |
| Rasalgethi | Informativa |
| Laomedeia | Animada |
| Achernar | Macia |
| Alnilam | Firme |
| Schedar | Equilibrada |
| Gacrux | Madura |
| Pulcherrima | Direta |
| Achird | Amigavel |
| Zubenelgenubi | Casual |
| Vindemiatrix | Gentil |
| Sadachbia | Vibrante |
| Sadaltager | Especialista |
| Sulafat | Acolhedora |

**Nota:** o hook `useVoicePreviews` reproduz previews de voz estaticas via `/voice-previews/{voiceId}.wav`.

---

## Instruccoes de Ritmo (Pace)

> `src/lib/constants.ts` — `PACE_INSTRUCTIONS`

```typescript
export const PACE_INSTRUCTIONS: Record<string, string> = {
  'very_slow': 'Fale em um ritmo muito lento e deliberado consistentemente.',
  'slow': 'Fale em um ritmo lento e relaxado consistentemente.',
  'normal': '',
  'fast': 'Fale em um ritmo rapido e energetico consistentemente.',
  'very_fast': 'Fale em um ritmo muito rapido e veloz consistentemente.'
};
```

O pace e combinado com `styleNotes` no prompt final:

```typescript
const paceNote = PACE_INSTRUCTIONS[pace];
const combinedNotes = [styleNotes, paceNote].filter(Boolean).join('\n* ');
```

---

## Pipeline Completo de Geracao de Audio

> `src/hooks/useAudioGenerator.ts` — funcao `generateAudio`

### Fluxo geral

1. **Validacao** — checa se roteiro esta vazio ou excede `MAX_CHARS`
2. **Criacao de projeto** — gera UUID e salva metadados no DB
3. **Divisao em chunks** (se necessario)
4. **Geracao TTS chunk a chunk**
5. **Montagem do WAV final** — concatenacao PCM + header WAV
6. **Auto-save** do audio no Firebase/IndexedDB
7. **Geracao de cenas visuais** (opcional, apos o audio)

### 3. Divisao em Chunks

Se `script.length <= CHUNK_LIMIT`, o roteiro inteiro vai em um unico chunk.
Caso contrario, usa LLM para divisao inteligente com fallback programatico.

**Via LLM** (`gemini-3.1-flash-lite-preview`):

```typescript
const chunkingResponse = await ai.models.generateContent({
  model: 'gemini-3.1-flash-lite-preview',
  contents: [{
    role: 'user',
    parts: [{ text: `Divida o seguinte roteiro em partes sequenciais. E CRITICO que cada parte tenha no MAXIMO ${CHUNK_LIMIT} caracteres. Faca as quebras em pausas logicas (pontos finais, fim de paragrafo). NAO altere, adicione ou remova nenhuma palavra do texto original, apenas divida-o.\n\nRoteiro:\n${script}` }],
  }],
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
});
```

O response e parseado como `string[]`. Se algum chunk exceder `CHUNK_LIMIT`, e subdividido via `splitTextProgrammatically`. Se a LLM falhar, o fallback e `splitTextProgrammatically` no roteiro inteiro.

**Fallback programatico** — `splitTextProgrammatically`:

```typescript
function splitTextProgrammatically(text: string, limit: number): string[] {
  const result: string[] = [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > limit) {
      if (current) { result.push(current.trim()); current = ''; }
      let remaining = sentence;
      while (remaining.length > 0) {
        result.push(remaining.slice(0, limit).trim());
        remaining = remaining.slice(limit);
      }
    } else if (current.length + sentence.length > limit) {
      if (current) result.push(current.trim());
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence.trim();
    }
  }

  if (current) result.push(current.trim());
  return result;
}
```

Divide por sentencas (`.`, `!`, `?`, `\n`) e agrupa ate atingir o limite.

### 4. Geracao TTS por Chunk

Para cada chunk, o hook constroi um prompt e envia ao `gemini-3.1-flash-tts-preview`:

**Construcao do prompt:**

```typescript
const finalPrompt = [
  'Gere a fala para a seguinte transcrição, interpretando a persona e as notas de direção fornecidas. NÃO leia o perfil, a cena ou as notas em voz alta. APENAS fale a transcrição.',
  continuityContext,
  multiCtx,
  audioProfile ? `# PERFIL DE ÁUDIO: ${audioProfile}` : '',
  scene ? `## A CENA: ${scene}` : '',
  combinedNotes ? `### NOTAS DE DIREÇÃO\n* ${combinedNotes}` : '',
  `#### TRANSCRIÇÃO\n${chunk}`,
].filter(Boolean).join('\n\n');
```

**Contexto de continuidade** — a partir do chunk 2, injeta instrucao para manter consistencia:

```typescript
const continuityContext = i > 0
  ? `[CRÍTICO] TAKES CONTÍNUOS: Você está renderizando a parte ${i + 1} de um único roteiro. MANTENHA estritamente o mesmo tom, humor, energia, velocidade e volume da parte anterior. Evite entonações de início ou fim de frase onde não houver pontuação.`
  : '';
```

**Chamada ao modelo:**

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-tts-preview',
  contents: [{ parts: [{ text: finalPrompt }] }],
  config: {
    responseModalities: [Modality.AUDIO],
    speechConfig,
  },
});

base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
```

### 5. Montagem do WAV Final

Os dados PCM de cada chunk sao acumulados em `pcmChunks: Uint8Array[]`. Apos todos os chunks:

```typescript
const combinedPcm = new Uint8Array(totalLength);
let offset = 0;
for (const pcm of pcmChunks) {
  combinedPcm.set(pcm, offset);
  offset += pcm.length;
}

const wavBlob = createWavBlob(combinedPcm, 24000);
const url = URL.createObjectURL(wavBlob);
```

---

## Formato de Saida

> `src/lib/audio.ts` — `createWavBlob`

| Parametro | Valor |
|-----------|-------|
| Sample Rate | **24.000 Hz** (24 kHz) |
| Canais | **1** (mono) |
| Bits per Sample | **16** |
| Audio Format | **1** (PCM linear) |
| Byte Rate | 48.000 (24000 * 1 * 16/8) |
| Block Align | 2 (1 * 16/8) |
| Header | 44 bytes (RIFF/WAVE padrao) |

```typescript
export function createWavBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  if (isWavFormat(pcmData)) {
    return new Blob([pcmData as BlobPart], { type: 'audio/wav' });
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // ... (header RIFF/WAVE de 44 bytes)
  view.setUint16(22, 1, true);              // NumChannels: 1
  view.setUint32(24, sampleRate, true);     // SampleRate: 24000
  view.setUint32(28, sampleRate * 2, true); // ByteRate: 48000
  view.setUint16(32, 2, true);              // BlockAlign: 2
  view.setUint16(34, 16, true);             // BitsPerSample: 16

  return new Blob([wavHeader, pcmData as BlobPart], { type: 'audio/wav' });
}
```

**Extracao de PCM** — quando o Gemini retorna dados que ja tem header WAV, o PCM e extraido:

```typescript
export function extractPcmFromData(data: Uint8Array): Uint8Array {
  if (!isWavFormat(data)) return data;

  let offset = 12;
  while (offset < data.length - 8) {
    const chunkId = String.fromCharCode(data[offset], data[offset+1], data[offset+2], data[offset+3]);
    const chunkSize = data[offset+4] | (data[offset+5] << 8) | (data[offset+6] << 16) | (data[offset+7] << 24);
    if (chunkId === 'data') {
      return data.slice(offset + 8, offset + 8 + chunkSize);
    }
    offset += 8 + chunkSize;
  }
  return data.slice(44);
}
```

---

## Multi-Speaker

> `src/hooks/useAudioGenerator.ts:371-388`

Quando `isMultiSpeaker` e `true`, o `speechConfig` muda para `multiSpeakerVoiceConfig` com dois locutores:

```typescript
const speechConfig = isMultiSpeaker ? {
  multiSpeakerVoiceConfig: {
    speakerVoiceConfigs: [
      {
        speaker: speakerAName || 'Speaker1',
        voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
      },
      {
        speaker: speakerBName || 'Speaker2',
        voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerBVoice || 'Puck' } },
      },
    ],
  },
} : {
  voiceConfig: {
    prebuiltVoiceConfig: { voiceName: selectedVoice },
  },
};
```

- **Speaker A:** usa `selectedVoice` (voz principal do usuario)
- **Speaker B:** usa `speakerBVoice` com fallback para `'Puck'`
- Nomes dos locutores vêm de `speakerAName` e `speakerBName`

O prompt tambem recebe contexto adicional quando multi-speaker esta ativo:

```typescript
const multiCtx = isMultiSpeaker
  ? `## MÚLTIPLOS LOCUTORES\nAtenção: a transcrição é um diálogo. Fale o texto de "${speakerAName}" com a Voz A e o texto de "${speakerBName}" com a Voz B.`
  : '';
```

---

## Retry Logic

> `src/lib/rate-limiter.ts` — `withRetry`

O retry de cada chunk TTS usa o wrapper `withRetry` do `rate-limiter.ts`, que implementa exponential backoff com jitter. O hook passa overrides especificos para o TTS:

```typescript
const { value: response } = await withRetry(
  async () => {
    const ttsResponse = await ai.models.generateContent({ /* ... */ });
    const data = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
    if (!data) {
      throw new Error('O modelo retornou texto em vez de audio (comportamento intermitente conhecido).');
    }
    return data;
  },
  { maxRetries: 3, baseDelayMs: 1500, jitterMs: 500 },
);
```

**Parametros passados ao TTS:**

| Parametro | Valor | Descricao |
|-----------|-------|-----------|
| `maxRetries` | `3` | Numero maximo de tentativas (incluindo a primeira) |
| `baseDelayMs` | `1500` | Delay base em ms — dobrado a cada retry |
| `jitterMs` | `500` | Jitter maximo adicionado ao delay (0–500ms) |

**Formula do delay:** `delay = baseDelayMs * 2^attempt + random(0, jitterMs)`

- Tentativa 1 (falha): aguarda ~1500ms + 0-500ms
- Tentativa 2 (falha): aguarda ~3000ms + 0-500ms
- Tentativa 3 (falha): lanca o ultimo erro

**Detecao automatica de erros retryaveis** — `isRetryableError`:

- Códigos HTTP: **429** (quota), **503** (unavailable), **504** (gateway timeout)
- Instancias de `ApiError` do `@google/genai` verificadas por `.status`
- Keywords em mensagens de erro: `quota`, `resource_exhausted`, `deadline`, `unavailable`
- Erros definitivos (400, 403, 404) falham imediatamente sem retry

> O `withRetry` e reutilizavel — o hook de TTS passa overrides especificos, enquanto outros consumidores podem usar os defaults (`baseDelayMs: 1000`, `jitterMs: 1000`).

### Mapeamento de Erros para o Usuario

> `src/hooks/useAudioGenerator.ts:46-74` — `toUserFriendlyError`

| Padrao detectado | Mensagem (pt-BR) |
|------------------|-------------------|
| `quota`, `resource_exhausted`, `429` | "Limite de uso atingido. Aguarde alguns minutos e tente novamente." |
| `api key`, `key not valid`, `permission_denied` | "Erro de autenticacao. Verifique sua chave de API nas configuracoes." |
| `deadline_exceeded`, `504` | "O servidor demorou demais para responder. Tente um roteiro menor ou aguarde." |
| `unavailable`, `503` | "Servico temporariamente indisponivel. Tente novamente em instantes." |
| `safety`, `blocked` | "Conteudo bloqueado por filtros de seguranca. Altere o roteiro e tente novamente." |
| `contexto` + `longo` | "O roteiro e muito longo para o modelo atual. Reduza o texto ou divida em partes." |
| Qualquer outro | "Nao foi possivel concluir a geracao. Verifique o roteiro e tente novamente." |

---

## Conversao Base64

> `src/lib/audio.ts`

O Gemini retorna audio como base64. O projeto usa conversao otimizada via `fetch` + data URI (evita bloqueio da thread principal com `atob` em strings grandes):

```typescript
export async function base64ToBlob(base64: string, mimeType: string = 'audio/pcm'): Promise<Blob> {
  const response = await fetch(`data:${mimeType};base64,${base64}`);
  return await response.blob();
}

export async function base64ToUint8Array(base64: string): Promise<Uint8Array> {
  const blob = await base64ToBlob(base64);
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
```

Versao sincrona disponivel para compatibilidade (`base64ToBlobSync`), que usa `atob` diretamente — utilizada internamente quando o destino final e um Blob.

---

## Voice Previews

> `src/hooks/useVoicePreviews.ts`

Previews de voz sao arquivos WAV estaticos servidos via `/voice-previews/{voiceId}.wav`:

```typescript
export function useVoicePreviews() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playPreview = (voiceId: string): void => {
    if (playingId === voiceId) {
      stop(); // toggle: clicar na voz que esta tocando para ela
      return;
    }
    stop();
    setPlayingId(voiceId);
    const audio = new Audio(`/voice-previews/${voiceId}.wav`);
    audioRef.current = audio;
    audio.onerror = () => {
      console.error(`Preview para ${voiceId} nao encontrado.`);
      setPlayingId(null);
    };
    audio.onended = () => setPlayingId(null);
    void audio.play();
  };
}
```

- **Toggle:** clicar na mesma voz que esta tocando a para
- **Erros:** se o arquivo nao existe, loga erro e reseta o estado

---

---

## Calculo de Duracao

> `src/hooks/useAudioGenerator.ts:558-563`

A duracao e calculada de duas formas com prioridade:

1. **Via blob WAV** (preciso): usa `calculateDurationFromWav(blob.size, 24000)` quando o blob esta disponivel
2. **Via metadados do audio** (fallback): usa `duration` do elemento `<audio>` ao carregar projetos da galeria (Firebase Storage)

```typescript
const durationInSeconds = useMemo(() => {
  if (audioBlob && audioBlob.size > 44) {
    return calculateDurationFromWav(audioBlob.size, 24000);
  }
  return audioDuration;
}, [audioBlob, audioDuration]);
```

---

## Estrutura de Dados — GenerateOptions

> `src/hooks/useAudioGenerator.ts:80-98`

```typescript
interface GenerateOptions {
  userId?: string;
  projectName?: string;
  script: string;
  isMultiSpeaker?: boolean;
  selectedVoice: string;
  speakerAName?: string;
  speakerBVoice?: string;
  speakerBName?: string;
  audioProfile: string;
  scene: string;
  pace: string;
  styleNotes: string;
  generateScenes?: boolean;
  sceneDensity?: number;
  sceneRatio?: '16:9' | '9:16' | '1:1';
  visualFramework?: string;
  referenceImage?: string | null;
}
```

---

## Cancelamento

O hook suporta cancelamento a qualquer momento via `handleCancel()`:

```typescript
const cancelRef = useRef(false);

const handleCancel = () => {
  cancelRef.current = true;
};
```

O flag e checado antes de cada chunk TTS e antes de cada geracao de cena. Se cancelado, o blob URL e revogado e o estado anterior e restaurado.

---

## Mapa de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/constants.ts` | `CHUNK_LIMIT`, `MAX_CHARS`, `VOICES`, `PACE_INSTRUCTIONS` |
| `src/lib/types.ts` | Interface `Voice` |
| `src/lib/audio.ts` | `isWavFormat`, `extractPcmFromData`, `createWavBlob`, `base64ToBlob`, `base64ToUint8Array`, `base64ToBlobSync` |
| `src/lib/gemini.ts` | `generateScenePrompts`, `generateImageFromPrompt` |
| `src/lib/env.ts` | `getGeminiApiKey()` |
| `src/lib/rate-limiter.ts` | `withRetry` — retry com exponential backoff + jitter |
| `src/hooks/useAudioGenerator.ts` | Hook principal: chunking, TTS, montagem WAV, progresso, retry, cancelamento |
| `src/hooks/useVoicePreviews.ts` | Preview de vozes via arquivos WAV estaticos |
