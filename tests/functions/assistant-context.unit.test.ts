import { describe, expect, it } from 'vitest';
import {
  buildAssistantSystemInstruction,
  buildChunkingInstruction,
  buildImageInstruction,
  buildInlineAssistantInstruction,
  buildScenePromptsInstruction,
  buildStudioBlock,
  buildTtsInstruction,
} from '../../functions/src/genkit/utils/assistant-context';

describe('buildStudioBlock', () => {
  it('orienta o assistente a usar o roteiro ativo quando ele já existe', () => {
    const block = buildStudioBlock({
      script: 'Um roteiro já preenchido',
      selectedVoice: 'Zephyr',
      isMultiSpeaker: false,
      speakerAName: 'Narrador',
      speakerBName: '',
      speakerBVoice: '',
      audioProfile: 'Misterioso',
      scene: 'Noite chuvosa',
      pace: 'normal',
      styleNotes: 'Tom grave',
      generateScenes: true,
      sceneRatio: '16:9',
      sceneDensity: 15,
      visualFramework: 'general',
      emotion: 'dramatic',
      emotionIntensity: 0.8,
      imageTextLanguage: 'pt-BR',
      referenceImage: null,
    });

    expect(block).toContain('Existe um roteiro preenchido no estúdio agora.');
    expect(block).toContain('Não assuma que o usuário está começando do zero.');
    expect(block).toContain('Roteiro atual: "Um roteiro já preenchido"');
  });

  it('orienta o assistente a oferecer um novo projeto quando o estúdio está vazio', () => {
    const block = buildStudioBlock({
      script: '',
      selectedVoice: 'Zephyr',
      isMultiSpeaker: false,
      speakerAName: '',
      speakerBName: '',
      speakerBVoice: '',
      audioProfile: '',
      scene: '',
      pace: '',
      styleNotes: '',
      generateScenes: false,
      sceneRatio: '16:9',
      sceneDensity: 15,
      visualFramework: 'general',
      emotion: 'neutral',
      emotionIntensity: 0,
      imageTextLanguage: 'pt-BR',
      referenceImage: null,
    });

    expect(block).toContain('O estúdio está sem roteiro preenchido no momento.');
  });
});

describe('prompt builders', () => {
  it('monta instrução do assistente com contexto e regra de JSON aplicável', () => {
    const instruction = buildAssistantSystemInstruction({
      memoriesText: '- Prefere tom direto',
      userProfileBlock: '- Perfil: criador',
      voicesList: '- Zephyr (Brilhante)',
      paceList: 'normal (Normal)',
      studioBlock: 'ESTÚDIO: roteiro ativo',
      customPromptBlock: 'DIRETRIZ CUSTOM: responda com clareza',
    });

    expect(instruction).toContain('Trate a última mensagem do usuário como a tarefa principal');
    expect(instruction).toContain('Explique primeiro o raciocínio em linguagem natural');
    expect(instruction).toContain('ESTÚDIO: roteiro ativo');
  });

  it('monta instrução inline como substituição direta do trecho', () => {
    const instruction = buildInlineAssistantInstruction({
      memoriesText: '',
      userProfileBlock: '',
      voicesList: '- Zephyr',
      paceList: 'normal',
      customPromptBlock: '',
      selectedText: 'Texto original',
      instruction: 'Resuma em uma frase',
      fullScript: 'Roteiro completo para contexto',
    });

    expect(instruction).toContain('RETORNE APENAS O TRECHO FINAL REESCRITO');
    expect(instruction).toContain('Texto original');
    expect(instruction).toContain('Resuma em uma frase');
  });

  it('monta prompt de chunking com limite explícito', () => {
    const instruction = buildChunkingInstruction('Um roteiro qualquer', 500);

    expect(instruction).toContain('no máximo 500 caracteres');
    expect(instruction).toContain('Não altere, reescreva, resuma');
  });

  it('monta prompt de cena respeitando idioma visual e quantidade', () => {
    const instruction = buildScenePromptsInstruction({
      durationLabel: '120.0',
      imageCount: 8,
      densitySeconds: 15,
      frameworkInstructions: 'FRAMEWORK WHITEBOARD',
      style: 'Didático',
      languageName: 'português brasileiro',
      languageNameUpper: 'PORTUGUÊS BRASILEIRO',
      script: 'Roteiro narrado',
    });

    expect(instruction).toContain('Gerar exatamente 8 descrições de cenas');
    expect(instruction).toContain('texto renderizado na imagem deve estar em português brasileiro');
    expect(instruction).toContain('FRAMEWORK WHITEBOARD');
  });

  it('monta prompt de imagem com contexto de referência', () => {
    const instruction = buildImageInstruction({
      prompt: 'Crie uma cena cinematográfica',
      aspectRatio: '16:9',
      hasReferenceImage: true,
    });

    expect(instruction).toContain('proporção 16:9');
    expect(instruction).toContain('REFERÊNCIA ANEXADA: sim');
  });

  it('monta prompt de TTS sem perder transcrição final', () => {
    const instruction = buildTtsInstruction({
      continuityContext: 'TAKE CONTÍNUO',
      multiSpeakerContext: 'DIÁLOGO',
      audioProfile: 'Narrador calmo',
      scene: 'Estúdio noturno',
      emotionInstruction: 'Tom melancólico',
      directionNotes: 'Fale pausadamente',
      chunk: 'Trecho narrado final',
    });

    expect(instruction).toContain('Trecho narrado final');
    expect(instruction).toContain('Narrador calmo');
    expect(instruction).toContain('Fale pausadamente');
  });
});
