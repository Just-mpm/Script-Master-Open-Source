const fs = require('fs');
const path = require('path');

const files = [
  'src/App.tsx',
  'src/components/DataMigrationDialog.tsx',
  'src/components/video-library/GalleryCard.tsx',
  'src/components/video-library/useBatchDownload.ts',
  'src/components/VideoLibrary.tsx',
  'src/contexts/AudioContext.tsx',
  'src/features/assistant/Assistant.tsx',
  'src/features/billing/components/UsageIndicator.tsx',
  'src/features/speed-paint/components/AnimationDurationSelector.tsx',
  'src/features/speed-paint/components/upload/ImageUpload.tsx',
  'src/features/video-render/components/CaptionEditorPanel.tsx',
  'src/features/video-render/components/export/ExportProgressBar.tsx',
  'src/features/video-render/components/export/ExportQualitySelector.tsx',
  'src/features/video-render/components/SceneSequence.tsx',
  'src/features/video-render/components/SpeedPaintControls.tsx'
];

files.forEach(file => {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  const depth = file.split('/').length - 2;
  const relativePrefix = depth === 0 ? './' : '../'.repeat(depth);
  const correctImport = `import { useLocale } from '${relativePrefix}features/i18n';`;
  const correctImportSafe = `import { useLocaleSafe } from '${relativePrefix}features/i18n';`;

  content = content.replace(/import \{ useLocale \} from '@\/features\/i18n';/g, correctImport);
  content = content.replace(/import \{ useLocaleSafe \} from '@\/features\/i18n';/g, correctImportSafe);
  
  fs.writeFileSync(fullPath, content);
  console.log('Fixed', file, 'with', correctImport);
});
