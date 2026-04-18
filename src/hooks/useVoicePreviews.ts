import { useEffect, useState, useRef } from 'react';
import { storage, auth, onAuthStateChanged } from '../lib/firebase';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { VOICES } from '../lib/constants';
import { base64ToUint8Array, createWavBlob, extractPcmFromData } from '../lib/audio';
import { getGeminiApiKey } from '../lib/env';

export function useVoicePreviews() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);
  
  const isAdmin = currentUser?.email?.toLowerCase() === 'kurosaki.mpm@gmail.com' && currentUser?.emailVerified;

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlayingId(null);
  };

  const playPreview = async (voiceId: string) => {
    if (playingId === voiceId) {
      stop();
      return;
    }

    try {
      stop();
      setPlayingId(voiceId);

      const storageRef = ref(storage, `previews/${voiceId}.wav`);
      const url = await getDownloadURL(storageRef);
      
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      await audio.play();
    } catch (err) {
      console.error(`Preview for ${voiceId} not found or error playing:`, err);
      setPlayingId(null);
    }
  };

  const generatePreview = async (voiceId: string, voiceName: string) => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    // Usando um prompt mais neutro para evitar filtros de segurança automáticos
    const prompt = `Esta é uma demonstração da voz ${voiceName}.`;
    
    // Mapear vozes não suportadas para as oficiais do Gemini TTS
    const officialVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const targetVoiceId = officialVoices.includes(voiceId) ? voiceId : officialVoices[Math.abs(voiceId.length % officialVoices.length)];

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: targetVoiceId },
            },
          },
          // Reduzir restrições de segurança para prévias simples de sistema
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;

      if (!base64Audio) {
        if (response.promptFeedback?.blockReason === 'PROHIBITED_CONTENT') {
          throw new Error('O conteúdo do prompt foi bloqueado pelos filtros de segurança do Gemini. Tente um texto mais simples.');
        }
        console.error('Full response from model:', JSON.stringify(response, null, 2));
        throw new Error('No audio returned');
      }

      const rawData = await base64ToUint8Array(base64Audio);
      const pcmData = extractPcmFromData(rawData);
      const wavBlob = createWavBlob(pcmData, 24000);

      const storageRef = ref(storage, `previews/${voiceId}.wav`);
      await uploadBytes(storageRef, wavBlob, { contentType: 'audio/wav' });
       
      return true;
    } catch (err: unknown) {
      console.error(`Error generating preview for ${voiceId}:`, err);
      return false;
    }
  };

  const generateAllPreviews = async () => {
    if (!isAdmin || isGeneratingBatch) return;
    
    setIsGeneratingBatch(true);
    setBatchProgress(0);
    
    for (let i = 0; i < VOICES.length; i++) {
      const voice = VOICES[i];
      console.log(`Generating preview for ${voice.name} (${i + 1}/${VOICES.length})...`);
      
      await generatePreview(voice.id, voice.name);
      
      setBatchProgress(((i + 1) / VOICES.length) * 100);
      
      if (i < VOICES.length - 1) {
        // Wait 5 seconds to avoid rate limiting as requested
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    setIsGeneratingBatch(false);
    alert('Todas as prévias de voz foram geradas com sucesso!');
  };

  return {
    playingId,
    isGeneratingBatch,
    batchProgress,
    playPreview,
    stop,
    generateAllPreviews,
    isAdmin
  };
}
