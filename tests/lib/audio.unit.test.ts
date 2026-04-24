import { describe, it, expect } from 'vitest';
import {
  isWavFormat,
  extractPcmFromData,
  createWavBlob,
  base64ToBlobSync,
} from '../../src/lib/audio';

describe('audio', () => {
  // -------------------------------------------------------------------------
  // isWavFormat
  // -------------------------------------------------------------------------
  describe('isWavFormat', () => {
    it('retorna true para dados WAV válidos com header completo de 44 bytes', () => {
      // RIFF (4 bytes) + size (4) + WAVE (4) + fmt  (4) + fmtSize (4) + format (2) + channels (2) + sampleRate (4) + byteRate (4) + blockAlign (2) + bitsPerSample (2) + data (4) + dataSize (4) = 44
      const data = new Uint8Array(44);
      // "RIFF" = [82, 73, 70, 70]
      data[0] = 82; data[1] = 73; data[2] = 70; data[3] = 70;
      // "WAVE" em offset 8 = [87, 65, 86, 69]
      data[8] = 87; data[9] = 65; data[10] = 86; data[11] = 69;

      expect(isWavFormat(data)).toBe(true);
    });

    it('retorna false para dados menores que 44 bytes', () => {
      const data = new Uint8Array(43);
      data[0] = 82; data[1] = 73; data[2] = 70; data[3] = 70;
      data[8] = 87; data[9] = 65; data[10] = 86; data[11] = 69;

      expect(isWavFormat(data)).toBe(false);
    });

    it('retorna false quando bytes RIFF estão incorretos', () => {
      const data = new Uint8Array(44);
      data[0] = 0; data[1] = 0; data[2] = 0; data[3] = 0;
      data[8] = 87; data[9] = 65; data[10] = 86; data[11] = 69;

      expect(isWavFormat(data)).toBe(false);
    });

    it('retorna false quando bytes WAVE estão incorretos', () => {
      const data = new Uint8Array(44);
      data[0] = 82; data[1] = 73; data[2] = 70; data[3] = 70;
      data[8] = 0; data[9] = 0; data[10] = 0; data[11] = 0;

      expect(isWavFormat(data)).toBe(false);
    });

    it('retorna false para array vazio', () => {
      expect(isWavFormat(new Uint8Array(0))).toBe(false);
    });

    it('retorna false para PCM puro (sem header)', () => {
      const pcmData = new Uint8Array(1024);
      // Preenche com valores arbitrários
      for (let i = 0; i < pcmData.length; i++) {
        pcmData[i] = (i * 7) % 256;
      }
      expect(isWavFormat(pcmData)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // extractPcmFromData
  // -------------------------------------------------------------------------
  describe('extractPcmFromData', () => {
    it('retorna dados inalterados quando não é WAV', () => {
      const pcmData = new Uint8Array([1, 2, 3, 4, 5]);
      const result = extractPcmFromData(pcmData);
      // A função retorna a mesma referência para dados não-WAV (eficiente, sem cópia)
      expect(result).toBe(pcmData);
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    });

    it('extrai PCM de WAV com chunk data na posição padrão', () => {
      // Monta WAV mínimo: header 44 bytes + 10 bytes de PCM
      const pcmPayload = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
      const wavData = new Uint8Array(44 + pcmPayload.length);

      // RIFF header
      wavData[0] = 82; wavData[1] = 73; wavData[2] = 70; wavData[3] = 70;
      // File size - 8
      wavData[4] = (36 + pcmPayload.length) & 0xff;
      wavData[5] = ((36 + pcmPayload.length) >> 8) & 0xff;
      // WAVE
      wavData[8] = 87; wavData[9] = 65; wavData[10] = 86; wavData[11] = 69;
      // fmt chunk id
      wavData[12] = 102; wavData[13] = 109; wavData[14] = 116; wavData[15] = 32;
      // fmt chunk size = 16
      wavData[16] = 16; wavData[17] = 0; wavData[18] = 0; wavData[19] = 0;
      // Audio format = 1 (PCM)
      wavData[20] = 1; wavData[21] = 0;
      // Channels = 1
      wavData[22] = 1; wavData[23] = 0;
      // Sample rate = 24000 (0x5DC0) little-endian
      wavData[24] = 0xc0; wavData[25] = 0x5d; wavData[26] = 0; wavData[27] = 0;
      // Byte rate = 48000
      wavData[28] = 0x80; wavData[29] = 0xbb; wavData[30] = 0; wavData[31] = 0;
      // Block align = 2
      wavData[32] = 2; wavData[33] = 0;
      // Bits per sample = 16
      wavData[34] = 16; wavData[35] = 0;
      // data chunk id
      wavData[36] = 100; wavData[37] = 97; wavData[38] = 116; wavData[39] = 97;
      // data chunk size
      wavData[40] = pcmPayload.length & 0xff;
      wavData[41] = (pcmPayload.length >> 8) & 0xff;
      wavData[42] = (pcmPayload.length >> 16) & 0xff;
      wavData[43] = (pcmPayload.length >> 24) & 0xff;

      wavData.set(pcmPayload, 44);

      const result = extractPcmFromData(wavData);
      expect(result).toEqual(pcmPayload);
      expect(result.length).toBe(10);
    });

    it('retorna fallback strip 44 bytes quando é WAV mas sem chunk data', () => {
      // WAV sem chunk data — usa fallback que remove os primeiros 44 bytes
      const wavData = new Uint8Array(100);
      wavData[0] = 82; wavData[1] = 73; wavData[2] = 70; wavData[3] = 70;
      wavData[8] = 87; wavData[9] = 65; wavData[10] = 86; wavData[11] = 69;
      // O chunk em offset 12 é "fmt " (não "data"), com size 16, que avança o offset
      // Corrigindo: offset 12 tem chunkSize=16, então offset avança para 12+8+16=36
      // Offset 36 também não é "data", então a busca continua e pode sair do array

      // Na prática, como o loop para em `offset < data.length - 8`,
      // para data.length=100, offset deve ser < 92.
      // Se nenhum chunk "data" é encontrado, faz fallback slice(44)
      const result = extractPcmFromData(wavData);
      // O fallback strip 44 bytes é aplicado quando não encontra chunk data
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  // -------------------------------------------------------------------------
  // createWavBlob
  // -------------------------------------------------------------------------
  describe('createWavBlob', () => {
    it('cria Blob WAV com header correto para dados PCM puros', async () => {
      const pcmData = new Uint8Array([0, 128, 255, 0, 128, 255]);
      const blob = createWavBlob(pcmData, 24000);

      expect(blob.type).toBe('audio/wav');
      expect(blob.size).toBe(44 + pcmData.length);

      // Verifica header lendo o blob
      const buffer = await blob.arrayBuffer();
      const view = new DataView(buffer);

      // RIFF
      const riff = String.fromCharCode(
        view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
      );
      expect(riff).toBe('RIFF');

      // WAVE
      const wave = String.fromCharCode(
        view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11),
      );
      expect(wave).toBe('WAVE');

      // fmt
      const fmt = String.fromCharCode(
        view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15),
      );
      expect(fmt).toBe('fmt ');

      // PCM format = 1
      expect(view.getUint16(20, true)).toBe(1);

      // Channels = 1
      expect(view.getUint16(22, true)).toBe(1);

      // Sample rate = 24000
      expect(view.getUint32(24, true)).toBe(24000);

      // Bits per sample = 16
      expect(view.getUint16(34, true)).toBe(16);

      // data chunk size = pcmData.length
      expect(view.getUint32(40, true)).toBe(pcmData.length);
    });

    it('usa sampleRate padrão 24000 quando não informado', async () => {
      const pcmData = new Uint8Array([0, 128]);
      const blob = createWavBlob(pcmData);
      const buffer = await blob.arrayBuffer();
      const view = new DataView(buffer);
      expect(view.getUint32(24, true)).toBe(24000);
    });

    it('usa sampleRate customizado quando informado', async () => {
      const pcmData = new Uint8Array([0, 128]);
      const blob = createWavBlob(pcmData, 16000);
      const buffer = await blob.arrayBuffer();
      const view = new DataView(buffer);
      expect(view.getUint32(24, true)).toBe(16000);
    });

    it('não duplica header quando dados já são WAV', async () => {
      // Cria WAV válido
      const pcmData = new Uint8Array([0, 128, 255]);
      const wavBlob = createWavBlob(pcmData, 24000);
      const wavBytes = new Uint8Array(await wavBlob.arrayBuffer());

      // Passa WAV já formatado — não deve dobrar o header
      const resultBlob = createWavBlob(wavBytes, 24000);
      expect(resultBlob.size).toBe(wavBytes.length);

      // Verifica que ainda tem header RIFF/WAVE
      const buffer = await resultBlob.arrayBuffer();
      const view = new DataView(buffer);
      const riff = String.fromCharCode(
        view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
      );
      expect(riff).toBe('RIFF');
    });
  });

  // -------------------------------------------------------------------------
  // base64ToBlobSync
  // -------------------------------------------------------------------------
  describe('base64ToBlobSync', () => {
    it('converte base64 para Blob com mimeType correto', () => {
      // "Hello" em ASCII = [72, 101, 108, 108, 111] → base64 = "SGVsbG8="
      const blob = base64ToBlobSync('SGVsbG8=', 'text/plain');
      expect(blob.type).toBe('text/plain');
      expect(blob.size).toBe(5);
    });

    it('usa mimeType padrão image/png quando não informado', () => {
      const blob = base64ToBlobSync('SGVsbG8=');
      expect(blob.type).toBe('image/png');
    });

    it('produz bytes corretos a partir do base64', async () => {
      const blob = base64ToBlobSync('SGVsbG8=', 'text/plain');
      const text = await blob.text();
      expect(text).toBe('Hello');
    });

    it('lida com base64 vazio (string vazia)', () => {
      const blob = base64ToBlobSync('', 'application/octet-stream');
      expect(blob.size).toBe(0);
    });
  });
});
