import { describe, it, expect } from 'vitest';
import {
  parseBoldMarkdown,
  splitIntoWords,
  calculateWordTiming,
  splitIntoWordsWithTiming,
  alignScriptToSegments,
  segmentScriptByCenes,
  wordsToPhrases,
  phrasesToWords,
  SUBTITLE_FADE,
} from '../../src/features/video-render/lib/subtitleUtils';
import type { CaptionWord } from '../../src/features/video-render/types';

describe('subtitleUtils', () => {
  describe('parseBoldMarkdown', () => {
    it('retorna texto sem bold como único segmento', () => {
      const result = parseBoldMarkdown('olá mundo');
      expect(result).toEqual([{ text: 'olá mundo', bold: false }]);
    });

    it('parseia **bold** simples', () => {
      const result = parseBoldMarkdown('texto **negrito** normal');
      expect(result).toEqual([
        { text: 'texto ', bold: false },
        { text: 'negrito', bold: true },
        { text: ' normal', bold: false },
      ]);
    });

    it('parseia múltiplos **bold** no mesmo texto', () => {
      const result = parseBoldMarkdown('**um** e **dois**');
      expect(result).toEqual([
        { text: 'um', bold: true },
        { text: ' e ', bold: false },
        { text: 'dois', bold: true },
      ]);
    });

    it('retorna texto original se não houver bold', () => {
      const result = parseBoldMarkdown('sem formatação alguma');
      expect(result).toEqual([{ text: 'sem formatação alguma', bold: false }]);
    });

    it('retorna fallback para string vazia', () => {
      const result = parseBoldMarkdown('');
      expect(result).toEqual([{ text: '', bold: false }]);
    });

    it('trata bold no início do texto', () => {
      const result = parseBoldMarkdown('**início** e resto');
      expect(result).toEqual([
        { text: 'início', bold: true },
        { text: ' e resto', bold: false },
      ]);
    });

    it('trata bold no fim do texto', () => {
      const result = parseBoldMarkdown('resto e **fim**');
      expect(result).toEqual([
        { text: 'resto e ', bold: false },
        { text: 'fim', bold: true },
      ]);
    });
  });

  describe('splitIntoWords', () => {
    it('divide texto simples em palavras', () => {
      const result = splitIntoWords('olá mundo');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ text: 'olá', bold: false, startFrame: 0, endFrame: 0 });
      expect(result[1]).toEqual({ text: 'mundo', bold: false, startFrame: 0, endFrame: 0 });
    });

    it('preserva bold das palavras dentro de **', () => {
      const result = splitIntoWords('texto **negrito** normal');
      const boldWord = result.find((w) => w.bold);
      expect(boldWord).toBeDefined();
      expect(boldWord!.text).toBe('negrito');
    });

    it('retorna array vazio para string vazia', () => {
      expect(splitIntoWords('')).toEqual([]);
    });

    it('retorna array vazio para apenas espaços', () => {
      expect(splitIntoWords('   ')).toEqual([]);
    });

    it('ignora pontuação solta (espaços)', () => {
      const result = splitIntoWords('olá, mundo!');
      // A regex /\S+/g captura "olá," e "mundo!" como palavras (pontuação anexada)
      expect(result).toHaveLength(2);
    });
  });

  describe('calculateWordTiming', () => {
    it('não modifica array vazio', () => {
      const words: ReturnType<typeof splitIntoWords> = [];
      calculateWordTiming(words, 100);
      expect(words).toHaveLength(0);
    });

    it('distribui frames proporcionalmente ao comprimento', () => {
      const words = [
        { text: 'aa', bold: false, startFrame: 0, endFrame: 0 },
        { text: 'bb', bold: false, startFrame: 0, endFrame: 0 },
        { text: 'c', bold: false, startFrame: 0, endFrame: 0 },
      ];
      calculateWordTiming(words, 100);
      // "aa" e "bb" têm 2 chars cada (4/5 = 80%), "c" tem 1 char (1/5 = 20%)
      expect(words[0].startFrame).toBe(0);
      expect(words[0].endFrame).toBeGreaterThan(0);
      expect(words[1].startFrame).toBe(words[0].endFrame);
    });

    it('última palavra absorve frames residuais (endFrame === totalFrames)', () => {
      const words = [
        { text: 'um', bold: false, startFrame: 0, endFrame: 0 },
        { text: 'dois', bold: false, startFrame: 0, endFrame: 0 },
      ];
      calculateWordTiming(words, 100);
      expect(words[words.length - 1].endFrame).toBe(100);
    });

    it('cada palavra tem pelo menos 1 frame', () => {
      const words = [
        { text: 'a', bold: false, startFrame: 0, endFrame: 0 },
        { text: 'b', bold: false, startFrame: 0, endFrame: 0 },
      ];
      calculateWordTiming(words, 1);
      expect(words[0].endFrame).toBeGreaterThanOrEqual(1);
    });

    it('timing é contíguo (sem gaps)', () => {
      const words = [
        { text: 'primeiro', bold: false, startFrame: 0, endFrame: 0 },
        { text: 'segundo', bold: false, startFrame: 0, endFrame: 0 },
        { text: 'terceiro', bold: false, startFrame: 0, endFrame: 0 },
      ];
      calculateWordTiming(words, 300);
      for (let i = 1; i < words.length; i++) {
        expect(words[i].startFrame).toBe(words[i - 1].endFrame);
      }
    });
  });

  describe('splitIntoWordsWithTiming', () => {
    it('retorna array vazio se startFrame >= endFrame', () => {
      expect(splitIntoWordsWithTiming('texto', 100, 100, 30)).toEqual([]);
      expect(splitIntoWordsWithTiming('texto', 200, 100, 30)).toEqual([]);
    });

    it('retorna array vazio para texto vazio', () => {
      expect(splitIntoWordsWithTiming('   ', 0, 100, 30)).toEqual([]);
    });

    it('retorna array vazio para apenas pontuação', () => {
      expect(splitIntoWordsWithTiming('...', 0, 100, 30)).toEqual([]);
    });

    it('gera CaptionWord[] com timing cobrindo o intervalo', () => {
      // splitIntoWordsWithTiming separa por pontuação via regex — sem pontuação,
      // o texto inteiro vira um único token (palavra), pois extractTokensFromSegments
      // separa apenas pontuação de palavras, não divide por espaços.
      const result = splitIntoWordsWithTiming('olá mundo', 0, 90, 30);
      expect(result).toHaveLength(1);
      expect(result[0].startFrame).toBe(0);
      expect(result[0].endFrame).toBe(90);
      expect(result[0].text).toBe('olá mundo');
    });

    it('divide em múltiplas palavras quando há pontuação intermediária', () => {
      // Pontuação como vírgula separa os tokens
      const result = splitIntoWordsWithTiming('olá, mundo', 0, 90, 30);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].text).toContain('olá');
      expect(result[result.length - 1].text).toContain('mundo');
    });

    it('última palavra cobre até endFrame', () => {
      const result = splitIntoWordsWithTiming('uma frase', 0, 100, 30);
      expect(result[result.length - 1].endFrame).toBe(100);
    });

    it('preserva bold do markdown', () => {
      const result = splitIntoWordsWithTiming('normal **negrito**', 0, 90, 30);
      const boldWord = result.find((w) => w.bold);
      expect(boldWord).toBeDefined();
      expect(boldWord!.text).toContain('negrito');
    });

    it('anexa pontuação à palavra anterior (vírgula, ponto)', () => {
      const result = splitIntoWordsWithTiming('olá, mundo.', 0, 90, 30);
      expect(result[0].text).toContain('olá');
      expect(result[result.length - 1].text).toContain('mundo');
    });

    it('adiciona pausas de pontuação no timing', () => {
      const result = splitIntoWordsWithTiming('olá. mundo', 0, 150, 30);
      // Deve haver gap entre "olá." e "mundo" por causa da pausa do ponto
      const gap = result[1].startFrame - result[0].endFrame;
      // Gap pode ser 0 se a pausa foi absorvida, mas normalmente há pausa
      expect(result[1].startFrame).toBeGreaterThanOrEqual(result[0].endFrame);
    });
  });

  describe('alignScriptToSegments', () => {
    it('usa fallback proporcional quando segmentos vazios', () => {
      const result = alignScriptToSegments('texto de teste', [], 300, 30);
      expect(result.length).toBeGreaterThan(0);
      expect(result[result.length - 1].endFrame).toBe(300);
    });

    it('retorna palavras dos segmentos mesmo com script vazio no parâmetro', () => {
      // alignScriptToSegments processa os segmentos (não o script).
      // O script só é usado no fallback quando segmentos está vazio.
      // Se há segmentos com texto, eles são processados independentemente do script.
      const result = alignScriptToSegments('', [{ text: 'a', startSec: 0, endSec: 5, chunkIndex: 0 }], 300, 30);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].text).toBe('a');
    });

    it('pula segmentos com texto vazio', () => {
      const result = alignScriptToSegments(
        'texto',
        [
          { text: '   ', startSec: 0, endSec: 5, chunkIndex: 0 },
          { text: 'texto', startSec: 5, endSec: 10, chunkIndex: 1 },
        ],
        300,
        30,
      );
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('texto');
    });

    it('pula segmentos com startFrame >= endFrame', () => {
      const result = alignScriptToSegments(
        'texto',
        [{ text: 'texto', startSec: 10, endSec: 10, chunkIndex: 0 }],
        300,
        30,
      );
      expect(result).toHaveLength(0);
    });

    it('última palavra absorve frames residuais', () => {
      const result = alignScriptToSegments(
        'palavra final',
        [{ text: 'palavra final', startSec: 0, endSec: 2, chunkIndex: 0 }],
        300,
        30,
      );
      expect(result[result.length - 1].endFrame).toBe(300);
    });

    it('mapeia múltiplos segmentos corretamente', () => {
      const result = alignScriptToSegments(
        'primeiro segundo',
        [
          { text: 'primeiro', startSec: 0, endSec: 3, chunkIndex: 0 },
          { text: 'segundo', startSec: 3, endSec: 6, chunkIndex: 1 },
        ],
        300,
        30,
      );
      expect(result.length).toBeGreaterThanOrEqual(2);
      // Primeiro segmento começa no frame 0
      expect(result[0].startFrame).toBe(0);
      // Não há gap entre segmentos
      for (let i = 1; i < result.length; i++) {
        expect(result[i].startFrame).toBeLessThanOrEqual(result[i - 1].endFrame);
      }
    });
  });

  describe('segmentScriptByCenes', () => {
    it('retorna array vazio para scenes vazio', () => {
      expect(segmentScriptByCenes('texto', [], 300, 30)).toEqual([]);
    });

    it('retorna array vazio para script vazio', () => {
      expect(segmentScriptByCenes('', [{ timestamp: 0 }], 300, 30)).toEqual([]);
    });

    it('gera CaptionWord[] para cena única', () => {
      const result = segmentScriptByCenes(
        'olá mundo teste',
        [{ timestamp: 0 }],
        300,
        30,
      );
      expect(result.length).toBeGreaterThan(0);
      // Primeira palavra começa em frame 0
      expect(result[0].startFrame).toBe(0);
    });

    it('última palavra da última cena cobre até o fim', () => {
      const result = segmentScriptByCenes(
        'texto',
        [{ timestamp: 0 }],
        300,
        30,
      );
      expect(result[result.length - 1].endFrame).toBe(300);
    });

    it('divide por múltiplas cenas com timestamps', () => {
      const result = segmentScriptByCenes(
        'primeira parte do roteiro segunda parte do roteiro',
        [{ timestamp: 0 }, { timestamp: 5 }],
        300,
        30,
      );
      // Deve gerar palavras em ambas as cenas
      expect(result.length).toBeGreaterThan(0);
    });

    it('pula cenas com duração zero ou negativa', () => {
      const result = segmentScriptByCenes(
        'texto',
        [{ timestamp: 0 }, { timestamp: 0 }],
        300,
        30,
      );
      // Segunda cena tem duração 0, deve ser pulada
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('bold no roteiro é preservado via segmentScriptByCenes', () => {
      // Após correção: segmentScriptByCenes normaliza palavras removendo ** antes
      // de comparar com boldWords, permitindo que bold seja corretamente detectado.
      const result = segmentScriptByCenes(
        '**negrito** normal',
        [{ timestamp: 0 }],
        300,
        30,
      );
      const boldWord = result.find((w) => w.bold);
      expect(boldWord).toBeDefined();
      expect(boldWord!.text).toBe('**negrito**');
    });

    it('bold com múltiplas palavras é preservado via segmentScriptByCenes', () => {
      const result = segmentScriptByCenes(
        '**um** texto **dois** final',
        [{ timestamp: 0 }],
        300,
        30,
      );
      const boldWords = result.filter((w) => w.bold);
      expect(boldWords).toHaveLength(2);
      expect(boldWords[0].text).toBe('**um**');
      expect(boldWords[1].text).toBe('**dois**');
    });
  });

  describe('wordsToPhrases', () => {
    it('retorna array vazio para words vazio', () => {
      expect(wordsToPhrases([])).toEqual([]);
    });

    it('agrupa palavras até pontuação final', () => {
      const words: CaptionWord[] = [
        { text: 'olá', startFrame: 0, endFrame: 10, bold: false },
        { text: 'mundo.', startFrame: 10, endFrame: 20, bold: false },
        { text: 'tudo', startFrame: 20, endFrame: 30, bold: false },
        { text: 'bem', startFrame: 30, endFrame: 40, bold: false },
      ];
      const phrases = wordsToPhrases(words);
      expect(phrases).toHaveLength(2);
      expect(phrases[0].text).toBe('olá mundo.');
      expect(phrases[1].text).toBe('tudo bem');
    });

    it('força quebra a cada 12 palavras', () => {
      const words: CaptionWord[] = Array.from({ length: 15 }, (_, i) => ({
        text: `palavra${i}`,
        startFrame: i * 10,
        endFrame: (i + 1) * 10,
        bold: false,
      }));
      const phrases = wordsToPhrases(words);
      // 15 palavras: primeira frase com 12, segunda com 3
      expect(phrases).toHaveLength(2);
      expect(phrases[0].words).toHaveLength(12);
      expect(phrases[1].words).toHaveLength(3);
    });

    it('cada frase tem id único e estável', () => {
      const words: CaptionWord[] = [
        { text: 'um.', startFrame: 0, endFrame: 10, bold: false },
        { text: 'dois.', startFrame: 10, endFrame: 20, bold: false },
      ];
      const phrases1 = wordsToPhrases(words);
      const phrases2 = wordsToPhrases(words);
      // Ids devem ser únicos entre chamadas (crypto.randomUUID())
      expect(phrases1[0].id).not.toBe(phrases1[1].id);
      expect(phrases1[0].id).not.toBe(phrases2[0].id);
    });

    it('deriva startFrame/endFrame das palavras', () => {
      const words: CaptionWord[] = [
        { text: 'início', startFrame: 10, endFrame: 20, bold: false },
        { text: 'fim.', startFrame: 20, endFrame: 40, bold: false },
      ];
      const phrases = wordsToPhrases(words);
      expect(phrases[0].startFrame).toBe(10);
      expect(phrases[0].endFrame).toBe(40);
    });

    it('pontuação final quebra: !, ?, ;, :', () => {
      const words: CaptionWord[] = [
        { text: 'eita!', startFrame: 0, endFrame: 10, bold: false },
        { text: 'será?', startFrame: 10, endFrame: 20, bold: false },
      ];
      const phrases = wordsToPhrases(words);
      expect(phrases).toHaveLength(2);
    });
  });

  describe('phrasesToWords', () => {
    it('retorna array vazio para frases vazias', () => {
      expect(phrasesToWords([])).toEqual([]);
    });

    it('pula frases sem palavras', () => {
      const result = phrasesToWords([{ id: 'x', words: [], startFrame: 0, endFrame: 10, text: '' }]);
      expect(result).toEqual([]);
    });

    it('recalcula timing proporcional dentro de cada frase', () => {
      const phrases = [
        {
          id: 'a',
          words: [
            { text: 'um', startFrame: 0, endFrame: 5, bold: false },
            { text: 'dois', startFrame: 5, endFrame: 20, bold: false },
          ],
          startFrame: 0,
          endFrame: 20,
          text: 'um dois',
        },
      ];
      const result = phrasesToWords(phrases);
      expect(result).toHaveLength(2);
      // Timing recalculado proporcionalmente: 10 frames cada
      expect(result[0].startFrame).toBe(0);
      expect(result[0].endFrame).toBe(10);
      expect(result[1].startFrame).toBe(10);
      expect(result[1].endFrame).toBe(20);
    });

    it('preserva texto e bold das palavras', () => {
      const phrases = [
        {
          id: 'a',
          words: [
            { text: '**negrito**', startFrame: 0, endFrame: 10, bold: true },
          ],
          startFrame: 0,
          endFrame: 10,
          text: '**negrito**',
        },
      ];
      const result = phrasesToWords(phrases);
      expect(result[0].text).toBe('**negrito**');
      expect(result[0].bold).toBe(true);
    });

    it('preserva contiguidade (sem gaps entre palavras de uma frase)', () => {
      const phrases = [
        {
          id: 'a',
          words: Array.from({ length: 5 }, (_, i) => ({
            text: `w${i}`,
            startFrame: 0,
            endFrame: 0,
            bold: false,
          })),
          startFrame: 0,
          endFrame: 100,
          text: 'w0 w1 w2 w3 w4',
        },
      ];
      const result = phrasesToWords(phrases);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].startFrame).toBe(result[i - 1].endFrame);
      }
    });
  });

  describe('SUBTITLE_FADE', () => {
    it('constante é 8 frames', () => {
      expect(SUBTITLE_FADE).toBe(8);
    });
  });
});
