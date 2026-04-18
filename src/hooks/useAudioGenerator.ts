import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { createWavBlob, base64ToUint8Array, extractPcmFromData } from '../lib/audio';
import { CHUNK_LIMIT, MAX_CHARS, PACE_INSTRUCTIONS } from '../lib/constants';
import { generateScenePrompts, generateImageFromPrompt } from '../lib/gemini';
import { saveProject, saveAudioToProject, saveImageToProject, Project, AudioSource, ProjectImage } from '../lib/db';
import { getGeminiApiKey } from '../lib/env';

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

export function useAudioGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [scenes, setScenes] = useState<{ imageUrl: string; timestamp: number }[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProjectData = (url: string, scenesData: { imageUrl: string; timestamp: number }[], audioBlobData?: Blob, id?: string) => {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(url);
    if (audioBlobData) setAudioBlob(audioBlobData);
    setScenes(scenesData);
    if (id) setProjectId(id);
  };
  
  const cancelRef = useRef(false);
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const lastSuccessfulStateRef = useRef<{
    audioUrl: string | null;
    audioBlob: Blob | null;
    scenes: { imageUrl: string; timestamp: number }[];
  }>({
    audioUrl: null,
    audioBlob: null,
    scenes: [],
  });

  // Cleanup object URL to prevent memory leaks when component unmounts or url changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const restoreLastSuccessfulState = () => {
    setAudioUrl(lastSuccessfulStateRef.current.audioUrl);
    setAudioBlob(lastSuccessfulStateRef.current.audioBlob);
    setScenes(lastSuccessfulStateRef.current.scenes);
  };

  const generateAudio = async (options: GenerateOptions, onStart?: () => void) => {
    const { userId, projectName, script, selectedVoice, audioProfile, scene, pace, styleNotes, generateScenes, isMultiSpeaker, speakerAName, speakerBVoice, speakerBName, sceneDensity = 15, sceneRatio = '16:9', visualFramework = 'general', referenceImage } = options;

    if (!script.trim()) {
      setError('Por favor, insira um roteiro antes de gerar o áudio.');
      return;
    }

    if (script.length > MAX_CHARS) {
      setError(`O roteiro excede o limite de ${MAX_CHARS} caracteres. Por favor, divida o texto.`);
      return;
    }

    cancelRef.current = false;
    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);
    setStatusText('Iniciando...');
    
    // Create Project ID early
    const currentProjectId = crypto.randomUUID();
    setProjectId(currentProjectId);
    
    // Initialize project in DB
    const projectMetadata: Project = {
      id: currentProjectId,
      userId,
      name: projectName || `Projeto - ${new Date().toLocaleDateString()}`,
      script,
      createdAt: Date.now(),
      settings: {
        selectedVoice,
        pace,
        styleNotes,
        isMultiSpeaker: !!isMultiSpeaker,
        speakerAName: speakerAName || '',
        speakerBName: speakerBName || '',
        speakerBVoice: speakerBVoice || '',
        audioProfile,
        scene,
        sceneDensity,
        sceneRatio,
        visualFramework
      }
    };
    
    await saveProject(projectMetadata, userId);
    
    if (onStart) onStart();

    const previousState = {
      audioUrl,
      audioBlob,
      scenes,
    };
    lastSuccessfulStateRef.current = previousState;
    setAudioUrl(null);
    setAudioBlob(null);
    setScenes([]);

    let generatedAudioUrl: string | null = null;

    try {
      let chunks: string[] = [];

      const splitTextProgrammatically = (text: string, limit: number): string[] => {
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
      };
      
      if (script.length <= CHUNK_LIMIT) {
        chunks = [script];
      } else {
        setStatusText('Analisando e dividindo o roteiro longo...');
        try {
          const chunkingResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [{ 
              role: 'user', 
              parts: [{ text: `Divida o seguinte roteiro em partes sequenciais. É CRÍTICO que cada parte tenha no MÁXIMO ${CHUNK_LIMIT} caracteres. Faça as quebras em pausas lógicas (pontos finais, fim de parágrafo). NÃO altere, adicione ou remova nenhuma palavra do texto original, apenas divida-o.\n\nRoteiro:\n${script}` }] 
            }],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          });
          
          let chunkText = chunkingResponse.text;
          if (chunkText) {
            // Robust JSON parsing (strip markdown)
            chunkText = chunkText.replace(/```json\n?|```/g, '').trim();
            const parsed = JSON.parse(chunkText);
            if (!Array.isArray(parsed)) throw new Error("Resposta não é um array");
            
            // Validate chunk sizes and split any oversized chunks programmatically
            for (const c of parsed) {
              if (c.length > CHUNK_LIMIT) {
                chunks.push(...splitTextProgrammatically(c, CHUNK_LIMIT));
              } else {
                chunks.push(c);
              }
            }
          } else {
            throw new Error("Resposta vazia do modelo de divisão.");
          }
        } catch (e) {
          console.warn("Erro na divisão via LLM, usando fallback programático", e);
          chunks = splitTextProgrammatically(script, CHUNK_LIMIT);
        }
      }

      // Filter out any empty chunks
      chunks = chunks.filter(c => c.trim().length > 0);

      let currentStep = 0;
      const totalAudioSteps = chunks.length;
      const totalSceneSteps = generateScenes ? 5 : 0; // Estimation for prompts + scenes
      const totalSteps = totalAudioSteps + totalSceneSteps + 1; // +1 for assembly

      const updateProgress = (stepIncrement = 1) => {
        currentStep += stepIncrement;
        const percent = Math.min(Math.round((currentStep / totalSteps) * 100), 99);
        setGenerationProgress(percent);
      };

      const pcmChunks: Uint8Array[] = [];
      let totalLength = 0;

      const paceNote = PACE_INSTRUCTIONS[pace];
      const combinedNotes = [styleNotes, paceNote].filter(Boolean).join('\n* ');

      for (let i = 0; i < chunks.length; i++) {
        if (cancelRef.current) throw new Error('Geração cancelada pelo usuário.');
        setStatusText(`Gerando áudio (parte ${i + 1} de ${chunks.length})...`);
        
        // Show immediate jump for starting a new part
        updateProgress(0.2);
        
        const chunk = chunks[i];
        
        const continuityContext = i > 0 ? `[CRÍTICO] TAKES CONTÍNUOS: Você está renderizando a parte ${i + 1} de um único roteiro. MANTENHA estritamente o mesmo tom, humor, energia, velocidade e volume da parte anterior. Evite entonações de início ou fim de frase onde não houver pontuação.` : '';
        const multiCtx = isMultiSpeaker ? `## MÚLTIPLOS LOCUTORES\nAtenção: a transcrição é um diálogo. Fale o texto de "${speakerAName}" com a Voz A e o texto de "${speakerBName}" com a Voz B.` : '';

        // Preamble is CRITICAL to prevent the model from reading the instructions aloud
        const finalPrompt = [
          "Gere a fala para a seguinte transcrição, interpretando a persona e as notas de direção fornecidas. NÃO leia o perfil, a cena ou as notas em voz alta. APENAS fale a transcrição.",
          continuityContext,
          multiCtx,
          audioProfile ? `# PERFIL DE ÁUDIO: ${audioProfile}` : '',
          scene ? `## A CENA: ${scene}` : '',
          combinedNotes ? `### NOTAS DE DIREÇÃO\n* ${combinedNotes}` : '',
          `#### TRANSCRIÇÃO\n${chunk}`
        ].filter(Boolean).join('\n\n');

        let base64Audio: string | null = null;
        let retries = 0;
        const MAX_RETRIES = 3;

        while (retries < MAX_RETRIES && !base64Audio) {
          if (cancelRef.current) throw new Error('Geração cancelada pelo usuário.');
          try {
            const speechConfig = isMultiSpeaker ? {
              multiSpeakerVoiceConfig: {
                 speakerVoiceConfigs: [
                    {
                       speaker: speakerAName || 'Speaker1',
                       voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
                    },
                    {
                       speaker: speakerBName || 'Speaker2',
                       voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerBVoice || 'Puck' } }
                    }
                 ]
              }
            } : {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            };

            const response = await ai.models.generateContent({
              model: "gemini-3.1-flash-tts-preview",
              contents: [{ parts: [{ text: finalPrompt }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig,
              },
            });

            base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
            
            if (!base64Audio) {
              throw new Error('O modelo retornou texto em vez de áudio (comportamento intermitente conhecido).');
            }
          } catch (chunkErr: unknown) {
            retries++;
            console.warn(`Tentativa ${retries} falhou para a parte ${i + 1}:`, chunkErr);
            const chunkErrorMessage = chunkErr instanceof Error ? chunkErr.message : 'Erro desconhecido';
            if (retries >= MAX_RETRIES) {
              throw new Error(
                `Falha ao gerar a parte ${i + 1} após ${MAX_RETRIES} tentativas. Erro: ${chunkErrorMessage}`,
                { cause: chunkErr },
              );
            }
            setStatusText(`Falha na parte ${i + 1}, tentando novamente (${retries}/${MAX_RETRIES})...`);
            await new Promise(r => setTimeout(r, 1500)); // Wait before retry
          }
        }
        
        if (base64Audio) {
          const rawData = await base64ToUint8Array(base64Audio);
          const pcmData = extractPcmFromData(rawData);
          pcmChunks.push(pcmData);
          totalLength += pcmData.length;
          // Finish the other 0.8 of the step
          updateProgress(0.8);
        }
      }

      setStatusText('Montando áudio final...');
      updateProgress(0.5);
      
      const combinedPcm = new Uint8Array(totalLength);
      let offset = 0;
      for (const pcm of pcmChunks) {
        combinedPcm.set(pcm, offset);
        offset += pcm.length;
      }

      const wavBlob = createWavBlob(combinedPcm, 24000);
      const url = URL.createObjectURL(wavBlob);
      generatedAudioUrl = url;
      setAudioBlob(wavBlob);
      setAudioUrl(url);

      // --- AUTO-SAVE AUDIO ---
      try {
        setStatusText('Salvando áudio na nuvem...');
        const audioSource: AudioSource = {
          id: crypto.randomUUID(),
          projectId: currentProjectId,
          userId,
          audioUrl: '', // Will be updated by saveAudioToProject
          audioBlob: wavBlob,
          createdAt: Date.now()
        };
        await saveAudioToProject(audioSource, userId);
      } catch (saveError) {
        console.warn('Erro no auto-save do áudio:', saveError);
      }

      if (generateScenes) {
        setStatusText('Criando roteiro visual...');
        setGenerationProgress(75);
        const durationInSeconds = totalLength / 48000; // 24000 sample rate * 2 bytes per sample (16-bit)
        const style = `${scene} ${styleNotes}`.trim();
        
        const prompts = await generateScenePrompts(script, durationInSeconds, style, sceneDensity, visualFramework);
        updateProgress(0.5);
        
        const generatedScenes: { imageUrl: string; timestamp: number }[] = [];
        
        const scenesToGenerate = prompts.length;
        const stepPerScene = 4 / scenesToGenerate; // 4 remaining units for scenes if totalSceneSteps is 5

        for (let i = 0; i < prompts.length; i++) {
          if (cancelRef.current) throw new Error('Geração cancelada pelo usuário.');
          setStatusText(`Pintando cena ${i + 1} de ${prompts.length}...`);
          
          updateProgress(stepPerScene * 0.2);

          const imageUrl = await generateImageFromPrompt(prompts[i].prompt, sceneRatio, referenceImage || undefined);
          if (imageUrl) {
            generatedScenes.push({
              imageUrl,
              timestamp: prompts[i].timestamp
            });

            // --- AUTO-SAVE IMAGE ---
            try {
              const res = await fetch(imageUrl);
              const blob = await res.blob();
              const projectImage: ProjectImage = {
                id: crypto.randomUUID(),
                projectId: currentProjectId,
                userId,
                imageUrl: '', // Updated by save
                imageBlob: blob,
                prompt: prompts[i].prompt,
                timestamp: prompts[i].timestamp,
                createdAt: Date.now()
              };
              await saveImageToProject(projectImage, userId);
            } catch (imageSaveErr) {
              console.warn('Erro no auto-save da imagem:', imageSaveErr);
            }
          }
          updateProgress(stepPerScene * 0.8);
        }

        setScenes(generatedScenes);
        lastSuccessfulStateRef.current = {
          audioUrl: url,
          audioBlob: wavBlob,
          scenes: generatedScenes,
        };
      } else {
        lastSuccessfulStateRef.current = {
          audioUrl: url,
          audioBlob: wavBlob,
          scenes: [],
        };
      }

      if (previousState.audioUrl && previousState.audioUrl.startsWith('blob:') && previousState.audioUrl !== url) {
        URL.revokeObjectURL(previousState.audioUrl);
      }
      
      setGenerationProgress(100);
    } catch (err: unknown) {
      const errorMessageText = err instanceof Error ? err.message : 'Ocorreu um erro inesperado ao gerar o áudio.';

      if (errorMessageText === 'Geração cancelada pelo usuário.') {
        if (generatedAudioUrl && generatedAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(generatedAudioUrl);
        }
        restoreLastSuccessfulState();
        setIsGenerating(false);
        setStatusText('');
        return;
      }

      console.error('Error generating audio:', err);
      let errorMessage = 'Ocorreu um erro inesperado ao gerar o áudio.';
      
      if (errorMessageText.includes('quota')) {
        errorMessage = 'Limite de cota excedido. Tente novamente mais tarde.';
      } else if (errorMessageText.includes('API key') || errorMessageText.includes('key not valid')) {
        errorMessage = 'Erro de autenticação. Verifique sua chave de API.';
      } else if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }
      
      if (generatedAudioUrl && generatedAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
      restoreLastSuccessfulState();
      setError(errorMessage);
      setTimeout(() => setError(''), 8000); // Auto-dismiss after 8 seconds
    } finally {
      setIsGenerating(false);
      setStatusText('');
    }
  };

  return {
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    audioBlob,
    scenes,
    projectId,
    error,
    setError,
    generateAudio,
    handleCancel,
    loadProjectData
  };
}
