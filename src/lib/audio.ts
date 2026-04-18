export function isWavFormat(data: Uint8Array): boolean {
  return data.length >= 44 && 
         data[0] === 82 && data[1] === 73 && data[2] === 70 && data[3] === 70 && // RIFF
         data[8] === 87 && data[9] === 65 && data[10] === 86 && data[11] === 69; // WAVE
}

export function extractPcmFromData(data: Uint8Array): Uint8Array {
  if (!isWavFormat(data)) return data;
  
  // Find 'data' chunk
  let offset = 12;
  while (offset < data.length - 8) {
    const chunkId = String.fromCharCode(data[offset], data[offset+1], data[offset+2], data[offset+3]);
    const chunkSize = data[offset+4] | (data[offset+5] << 8) | (data[offset+6] << 16) | (data[offset+7] << 24);
    
    if (chunkId === 'data') {
      return data.slice(offset + 8, offset + 8 + chunkSize);
    }
    offset += 8 + chunkSize;
  }
  
  // Fallback to strip first 44 bytes
  return data.slice(44);
}

export function createWavBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  // Validate if the pcmData ALREADY has a WAV header to prevent double headers
  if (isWavFormat(pcmData)) {
    return new Blob([pcmData as BlobPart], { type: 'audio/wav' });
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16)
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true); // Subchunk2Size

  return new Blob([wavHeader, pcmData as BlobPart], { type: 'audio/wav' });
}

/**
 * Converte uma string Base64 para Blob de forma otimizada usando a API nativa do browser.
 * Isso evita bloqueios na thread principal que ocorrem com atob() em strings grandes.
 */
export async function base64ToBlob(base64: string, mimeType: string = 'audio/pcm'): Promise<Blob> {
  const response = await fetch(`data:${mimeType};base64,${base64}`);
  return await response.blob();
}

/**
 * Converte uma string Base64 para Uint8Array de forma otimizada.
 */
export async function base64ToUint8Array(base64: string): Promise<Uint8Array> {
  const blob = await base64ToBlob(base64);
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// Mantendo a versão síncrona para compatibilidade se necessário, mas marcando como depreciada internamente
export function base64ToUint8ArraySync(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
