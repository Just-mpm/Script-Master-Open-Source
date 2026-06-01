import { describe, expect, it } from 'vitest';
import {
  buildAssistantSystemInstruction,
  buildChunkingInstruction,
  buildImageInstruction,
  buildInlineAssistantInstruction,
  buildMemoriesSummary,
  buildScenePromptsInstruction,
  buildStudioBlock,
  buildStudioSummary,
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
  it('monta instrução do assistente com contexto e regra de updateStudio aplicável', () => {
    const instruction = buildAssistantSystemInstruction({
      memoriesText: '- Prefere tom direto',
      userProfileBlock: '- Perfil: criador',
      studioBlock: 'ESTÚDIO: roteiro ativo',
      customPromptBlock: 'DIRETRIZ CUSTOM: responda com clareza',
    });

    expect(instruction).toContain('Trate a última mensagem do usuário como a tarefa principal');
    expect(instruction).toContain('Use updateStudio apenas se houver uma mudança concreta');
    expect(instruction).toContain('updatePlan');
    expect(instruction).toContain('ESTÚDIO: roteiro ativo');
  });

  it('monta instrução inline como substituição direta do trecho', () => {
    const instruction = buildInlineAssistantInstruction({
      memoriesText: '',
      userProfileBlock: '',
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

    expect(instruction).toContain('Máximo 500 caracteres');
    expect(instruction).toContain('NÃO altere, reescreva, adicione ou remova palavras');
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
      timestamps: [0, 15, 30, 45, 60, 75, 90, 105],
    });

    expect(instruction).toContain('exatamente 8 cenas');
    expect(instruction).toContain('texto renderizado na imagem deve estar em português brasileiro');
    expect(instruction).toContain('FRAMEWORK WHITEBOARD');
    expect(instruction).toContain('Cena 1: 0s');
    expect(instruction).toContain('Cena 8: 105s');
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

describe('buildMemoriesSummary', () => {
  it('retorna resumo com contagem quando há memórias', () => {
    const summary = buildMemoriesSummary(15);

    expect(summary).toContain('15 memória(s) salva(s)');
    expect(summary).toContain('getUserMemories');
    expect(summary).not.toContain('Prefere tom direto');
  });

  it('retorna mensagem de vazio quando não há memórias', () => {
    const summary = buildMemoriesSummary(0);

    expect(summary).toContain('ainda não salvou memórias');
    expect(summary).toContain('getUserMemories');
  });
});

describe('buildStudioSummary', () => {
  it('retorna resumo curto com voz e roteiro quando estúdio tem dados', () => {
    const summary = buildStudioSummary({
      script: 'Um roteiro de teste com mais de cem caracteres para verificar o resumo',
      selectedVoice: 'Zephyr',
      generateScenes: true,
    });

    expect(summary).toContain('Voz: Zephyr');
    expect(summary).toContain('Roteiro:');
    expect(summary).toContain('caracteres');
    expect(summary).toContain('Cenas visuais: ligado');
    expect(summary).toContain('getStudioState');
    expect(summary).not.toContain('Roteiro atual: "');
  });

  it('retorna mensagem de vazio quando não há estado', () => {
    const summary = buildStudioSummary(undefined);

    expect(summary).toContain('Nenhum estado do estúdio');
  });
});

describe('buildAssistantSystemInstruction — tool-first', () => {
  it('usa resumos em vez de contexto completo quando toolFirst é true', () => {
    const instruction = buildAssistantSystemInstruction({
      memoriesText: '- Prefere tom direto\n- Gosta de ritmo rápido',
      userProfileBlock: '- Perfil: criador',
      studioBlock: 'ESTÚDIO COMPLETO: roteiro ativo, voz Zephyr...',
      customPromptBlock: 'DIRETRIZ CUSTOM: responda com clareza',
      toolFirst: true,
      memoryCount: 5,
      studioState: { script: 'Roteiro de teste', selectedVoice: 'Zephyr' },
    });

    // Deve conter resumos (tool-first)
    expect(instruction).toContain('5 memória(s) salva(s)');
    expect(instruction).toContain('getUserMemories');
    expect(instruction).toContain('getStudioState');

    // NÃO deve conter o conteúdo completo das memórias ou estúdio
    expect(instruction).not.toContain('Prefere tom direto');
    expect(instruction).not.toContain('ESTÚDIO COMPLETO: roteiro ativo');
    expect(instruction).not.toContain('Roteiro atual: "');
  });

  it('usa contexto completo quando toolFirst é false (comportamento legado)', () => {
    const instruction = buildAssistantSystemInstruction({
      memoriesText: '- Prefere tom direto',
      userProfileBlock: '- Perfil: criador',
      studioBlock: 'ESTÚDIO: roteiro ativo',
      customPromptBlock: 'DIRETRIZ CUSTOM: responda com clareza',
      toolFirst: false,
    });

    // Deve conter o conteúdo completo (legado)
    expect(instruction).toContain('Prefere tom direto');
    expect(instruction).toContain('ESTÚDIO: roteiro ativo');
  });

  it('inclui regras de tools e princípios de resposta em ambos os modos', () => {
    const toolFirstInstruction = buildAssistantSystemInstruction({
      memoriesText: '',
      userProfileBlock: '',
      studioBlock: '',
      customPromptBlock: '',
      toolFirst: true,
      memoryCount: 0,
      studioState: undefined,
    });

    expect(toolFirstInstruction).toContain('Trate a última mensagem do usuário como a tarefa principal');
    expect(toolFirstInstruction).toContain('updateStudio');
    expect(toolFirstInstruction).toContain('updatePlan');
    expect(toolFirstInstruction).toContain('interview');
    expect(toolFirstInstruction).toContain('respond');
  });
});
