import type { UploadAttachment } from '../../lib/db';
import type { AssistantSettings } from './types';

/** Retorno discriminado de extractJsonSettings — distingue "não encontrado" de "malformado" */
export interface ExtractedSettings {
  settings: AssistantSettings;
  parseError: false;
}

export interface ExtractedSettingsError {
  settings: null;
  parseError: true;
}

export type ExtractedSettingsResult = ExtractedSettings | ExtractedSettingsError;

export async function fileToAttachment(file: File): Promise<UploadAttachment> {
  return new Promise<UploadAttachment>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        reject(new Error(`Não foi possível ler o arquivo ${file.name}.`));
        return;
      }

      const [, data = ''] = result.split(',');

      resolve({
        mimeType: file.type,
        data,
        name: file.name,
      });
    };

    reader.onerror = () => {
      reject(new Error(`Erro ao carregar o arquivo ${file.name}.`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Extrai configurações de um bloco ```json``` no texto.
 * Retorna `{ settings, parseError: false }` quando encontrado e válido.
 * Retorna `{ settings: null, parseError: true }` quando bloco existe mas JSON é inválido.
 * Retorna `null` quando nenhum bloco JSON é encontrado.
 */
export function extractJsonSettings(text: string): ExtractedSettingsResult | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

  if (!jsonMatch?.[1]) {
    return null;
  }

  try {
    return { settings: JSON.parse(jsonMatch[1]) as AssistantSettings, parseError: false };
  } catch {
    return { settings: null, parseError: true };
  }
}

export function stripJsonSettingsBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
}
