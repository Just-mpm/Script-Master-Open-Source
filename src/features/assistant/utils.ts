import type { AssistantSettings, Attachment } from './types';

export async function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise<Attachment>((resolve, reject) => {
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

export function extractJsonSettings(text: string): AssistantSettings | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

  if (!jsonMatch?.[1]) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[1]) as AssistantSettings;
  } catch {
    return null;
  }
}

export function stripJsonSettingsBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
}
