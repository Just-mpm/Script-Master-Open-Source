import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, X, Download, Sparkles, Loader2, Save, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useImageGenerator } from '../hooks/useImageGenerator';
import { saveImageGeneration } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Quadrado (1:1)' },
  { id: '16:9', label: 'Paisagem (16:9)' },
  { id: '9:16', label: 'Retrato (9:16)' },
  { id: '4:3', label: 'Clássico (4:3)' },
  { id: '3:4', label: 'Retrato Clássico (3:4)' },
  { id: '3:2', label: 'Foto (3:2)' },
  { id: '2:3', label: 'Foto Retrato (2:3)' },
  { id: '21:9', label: 'Cinemático (21:9)' },
];

export function ImageStudio() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isGenerating,
    imageUrl,
    imageBlob,
    error,
    setError,
    generateImage,
    clearImage
  } = useImageGenerator();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceImage(file);
      setReferencePreview(URL.createObjectURL(file));
    }
  };

  const clearReference = () => {
    setReferenceImage(null);
    setReferencePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsSaved(false);
    generateImage({
      prompt,
      aspectRatio,
      referenceImage: referenceImage || undefined
    });
  };

  const handleDownload = () => {
    if (imageUrl) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `imagem-gerada-${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!imageBlob || isSaved) return;
    try {
      const newItem = {
        id: crypto.randomUUID(),
        name: `Imagem - ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        imageBlob: imageBlob,
        prompt,
        aspectRatio
      };
      
      await saveImageGeneration(newItem, user?.uid);
      setIsSaved(true);
      setSuccessMsg(user ? 'Imagem salva na nuvem com sucesso!' : 'Imagem salva na biblioteca local!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar na biblioteca.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      {/* Sidebar - Configurações */}
      <div className="lg:col-span-4 xl:col-span-3">
        <div className="glass-panel rounded-2xl overflow-hidden border border-[var(--border)]">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-between p-6 lg:cursor-default"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[var(--accent)]" />
              Configurações
            </h2>
            <div className="lg:hidden">
              {isSidebarCollapsed ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                  <span>{aspectRatio}</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
              ) : <ChevronUp className="w-4 h-4" />}
            </div>
          </button>

          <div className={`p-6 pt-0 space-y-6 ${isSidebarCollapsed ? 'hidden lg:block' : 'block'}`}>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Proporção (Aspect Ratio)
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
              >
                {ASPECT_RATIOS.map(ratio => (
                  <option key={ratio.id} value={ratio.id}>{ratio.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Imagem de Referência (Opcional)
              </label>
              <p className="text-xs text-[var(--text-tertiary)] mb-3">
                Use para edição (Image-to-Image) ou transferência de estilo.
              </p>
              
              {referencePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-[var(--border)] h-32 bg-[var(--bg-base)] flex items-center justify-center">
                  <img src={referencePreview} alt="Referência" className="max-w-full max-h-full object-contain" />
                  <button
                    onClick={clearReference}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-500/80 transition-colors backdrop-blur-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-colors cursor-pointer bg-[var(--bg-base)]"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm text-center">Clique para enviar uma imagem</span>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Area - Prompt e Preview */}
      <div className="lg:col-span-8 xl:col-span-9 space-y-6">
        <div className="glass-panel rounded-2xl p-6 border border-[var(--border)] flex flex-col h-full min-h-[600px]">
          
          {/* Prompt Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              O que você quer gerar?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva a imagem em detalhes. Ex: Um gato fofo usando um chapéu de mago, estilo aquarela..."
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none h-32"
              disabled={isGenerating}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:hover:bg-[var(--accent)] shadow-lg shadow-[var(--accent-glow)]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar Imagem
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 bg-[var(--bg-base)] rounded-xl border border-[var(--border)] flex flex-col items-center justify-center overflow-hidden relative min-h-[300px]">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-[var(--text-secondary)]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                <p className="text-sm animate-pulse">Criando sua obra de arte...</p>
              </div>
            ) : imageUrl ? (
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 p-4 flex items-center justify-center">
                  <img src={imageUrl} alt="Imagem gerada" className="max-w-full max-h-[400px] object-contain rounded-lg shadow-2xl" />
                </div>
                
                {/* Actions Bar */}
                <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-elevated)]/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveToLibrary}
                      disabled={isSaved}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isSaved 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)]/50'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      {isSaved ? 'Salvo' : 'Salvar na Biblioteca'}
                    </button>
                  </div>
                  
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-[var(--text-tertiary)]">
                <ImageIcon className="w-12 h-12 opacity-20" />
                <p className="text-sm">Sua imagem gerada aparecerá aqui</p>
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <X className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-3">
              <Check className="w-5 h-5 shrink-0" />
              <p>{successMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
