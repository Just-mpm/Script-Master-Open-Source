import { useCallback, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from '../lib/env';
import { getMemories, getUserSettings } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { withRetry } from '../lib/rate-limiter';
import { createLogger } from '../lib/logger';
import { buildSystemInstruction } from '../features/assistant/systemPrompt';
import { VOICES, PACE_INSTRUCTIONS } from '../lib/constants';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';
import { useLocale } from '../features/i18n';

const log = createLogger('useInlineAssistant');

export function useInlineAssistant() {
  const { user } = useAuth();
  const { t } = useLocale();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorMapper = createErrorMapper({
    nonErrorMessage: t('studio.scriptEditor.inlineAI.errorGeneric') || 'Erro inesperado',
    defaultMessage: t('studio.scriptEditor.inlineAI.errorGeneric') || 'Erro ao processar',
    rules: sharedErrorRules,
  });

  const rewrite = useCallback(
    async (selectedText: string, instruction: string, fullScript: string): Promise<string | null> => {
      if (!selectedText.trim() || !instruction.trim()) return null;

      setIsProcessing(true);
      setError(null);

      try {
        const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

        const [memories, userSettings] = await Promise.all([
          getMemories(user?.uid),
          getUserSettings(user?.uid),
        ]);

        const memoriesText = memories.length > 0
          ? `\nMEMÓRIAS DO USUÁRIO:\n${memories.map(m => `- ${m.content}`).join('\n')}`
          : '';

        const voicesList = VOICES.map(v => `- ${v.name} (${v.style})`).join('\n');
        const paceList = Object.keys(PACE_INSTRUCTIONS).join(', ');
        const customPromptBlock = userSettings?.customSystemPrompt
          ? `\n\nDIRETRIZES CUSTOMIZADAS DO USUÁRIO:\n${userSettings.customSystemPrompt}`
          : '';

        const baseSystemPrompt = buildSystemInstruction(memoriesText, voicesList, paceList, customPromptBlock);

        const inlineInstruction = `
${baseSystemPrompt}

=======================================
MODO DE EDIÇÃO INLINE (IDE-LIKE)
Você está ajudando o usuário a reescrever um trecho específico do roteiro atual.

ROTEIRO COMPLETO (Para contexto do tom/história, NÃO modifique nem retorne este texto inteiro):
"""
${fullScript}
"""

INSTRUÇÃO DO USUÁRIO PARA O TRECHO SELECIONADO:
"${instruction}"

TRECHO ORIGINAL SELECIONADO PELO USUÁRIO (Reescreva apenas isto baseado na instrução):
"""
${selectedText}
"""

REGRA CRÍTICA:
Retorne APENAS o trecho reescrito, sem explicações extras, sem formatação markdown envolvendo todo o texto (como \`\`\`markdown), sem aspas adicionais, sem "Aqui está o texto" e sem formatar o restante do roteiro.
Sua resposta será um DROP-IN REPLACEMENT para o trecho selecionado, substituindo exatamente onde estava.`;

        const { value: response } = await withRetry(async () => {
          return await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: inlineInstruction,
            config: {
              temperature: 0.7,
            },
          });
        });

        if (!response.text) {
          throw new Error('Resposta vazia da IA.');
        }

        // Limpa possíveis marcações de markdown se a IA colocar
        let cleanText = response.text.trim();
        if (cleanText.startsWith('```') && cleanText.endsWith('```')) {
          const firstLineBreak = cleanText.indexOf('\n');
          const lastLineBreak = cleanText.lastIndexOf('\n');
          if (firstLineBreak !== -1 && lastLineBreak !== -1 && firstLineBreak !== lastLineBreak) {
            cleanText = cleanText.substring(firstLineBreak + 1, lastLineBreak).trim();
          } else {
            cleanText = cleanText.replace(/^```(markdown|text|md)?/, '').replace(/```$/, '').trim();
          }
        }

        return cleanText;
      } catch (err: unknown) {
        log.error('Erro na geração inline', { error: err });
        setError(errorMapper(err));
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [user, errorMapper]
  );

  return {
    isProcessing,
    error,
    rewrite,
  };
}
