import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Check, Paperclip, X, FileText, Image as ImageIcon, Brain, Plus, Trash2, History, MessageSquarePlus, BookmarkPlus } from 'lucide-react';
import { useAssistant, AssistantSettings, Attachment } from '../hooks/useAssistant';
import { getMemories, saveMemory, deleteMemory, Memory, getChatSessions, deleteChatSession, ChatSession, getUserSettings, saveUserSettings } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

export interface AssistantStudioState {
  script: string;
  selectedVoice: string;
  isMultiSpeaker: boolean;
  audioProfile: string;
  scene: string;
  pace: string;
  styleNotes: string;
  generateScenes: boolean;
  sceneRatio: string;
  sceneDensity: number;
  visualFramework: string;
  referenceImage: string | null;
}

interface AssistantProps {
  onApplySettings: (settings: AssistantSettings) => void;
  currentState?: AssistantStudioState;
}

export function Assistant({ onApplySettings, currentState }: AssistantProps) {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, startNewChat, loadSession, messagesEndRef } = useAssistant(currentState);
  const [input, setInput] = useState('');
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null);
  const [savedToMemoryId, setSavedToMemoryId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showMemories) {
      loadMemories();
    }
  }, [showMemories, user]);

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory, user]);

  useEffect(() => {
    if (showSettings) {
      loadSettings();
    }
  }, [showSettings, user]);

  const loadSettings = async () => {
    const data = await getUserSettings(user?.uid);
    if (data) {
      setCustomSystemPrompt(data.customSystemPrompt);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    await saveUserSettings(customSystemPrompt, user?.uid);
    setIsSavingSettings(false);
    setTimeout(() => setShowSettings(false), 500);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Validar tamanho max do arquivo: ~500KB (em bytes)
    const MAX_SIZE = 500 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`O arquivo ${file.name} é muito grande. O limite máximo é de 500KB para garantir a segurança da Base de Conhecimento.`);
      if (documentInputRef.current) documentInputRef.current.value = '';
      return;
    }

    // Ler o arquivo localmente sem gastar cloud storage
    const reader = new FileReader();
    reader.onload = async (event) => {
      const textContent = event.target?.result as string;
      if (textContent) {
        const truncatedText = textContent.length > 490000 ? textContent.substring(0, 490000) : textContent;
        const formattedMemory = `[Documento Anexado: ${file.name}]\n${truncatedText}`;
        await saveMemory(formattedMemory, user?.uid);
        loadMemories();
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (documentInputRef.current) documentInputRef.current.value = '';
  };

  const loadMemories = async () => {
    const data = await getMemories(user?.uid);
    setMemories(data);
  };

  const loadHistory = async () => {
    const data = await getChatSessions(user?.uid);
    setHistory(data);
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.trim()) return;
    await saveMemory(newMemory, user?.uid);
    setNewMemory('');
    loadMemories();
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id, user?.uid);
    loadMemories();
  };

  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteChatSession(id, user?.uid);
    loadHistory();
  };

  const handleSaveMessageToMemory = async (text: string, messageId: string) => {
    await saveMemory(text, user?.uid);
    setSavedToMemoryId(messageId);
    setTimeout(() => setSavedToMemoryId(null), 3000);
  };

  const handleSelectSession = (session: ChatSession) => {
    loadSession(session);
    setShowHistory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && pendingFiles.length === 0) || isLoading) return;

    const attachments: Attachment[] = await Promise.all(
      pendingFiles.map(async (file) => {
        return new Promise<Attachment>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({
              mimeType: file.type,
              data: base64String,
              name: file.name
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    sendMessage(input, attachments);
    setInput('');
    setPendingFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPendingFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const extractJsonSettings = (text: string): AssistantSettings | null => {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const handleApply = (settings: AssistantSettings, messageId: string) => {
    onApplySettings(settings);
    setAppliedMessageId(messageId);
    setTimeout(() => setAppliedMessageId(null), 3000);
  };

  const QUICK_PROMPTS = [
    { label: 'Ideia de Roteiro', text: 'Me dê uma ideia de roteiro curto para um vídeo de tecnologia.' },
    { label: 'Melhor Voz', text: 'Qual voz você recomenda para um podcast de meditação?' },
    { label: 'Dicas de Ritmo', text: 'Como posso usar as notas de estilo para deixar a voz mais natural?' },
  ];

  return (
    <div className="flex flex-col h-full w-full glass-panel overflow-hidden border-t border-[var(--border)] relative">
      {/* Memory Panel Overlay */}
      {showMemories && (
        <div className="absolute inset-0 z-20 bg-[var(--bg-base)]/95 backdrop-blur-md p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-lg font-semibold">Memórias do Assistente</h3>
            </div>
            <button 
              onClick={() => setShowMemories(false)}
              className="p-2 rounded-full hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <form onSubmit={handleAddMemory} className="flex gap-2">
              <input 
                type="text"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                placeholder="Adicionar fato curto (Ex: Eu prefiro roteiros...)"
                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
              <button 
                type="submit"
                className="p-2 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            <div className="flex items-center gap-2">
              <div className="h-px bg-[var(--border)] flex-1"></div>
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium px-2 uppercase">Ou suba sua base de conhecimento</span>
              <div className="h-px bg-[var(--border)] flex-1"></div>
            </div>

            <input
              type="file"
              ref={documentInputRef}
              onChange={handleDocumentUpload}
              accept=".md,.txt,.csv"
              className="hidden"
            />
            <button
              onClick={() => documentInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--accent)]/5 hover:border-[var(--accent)]/50 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 opacity-70" />
              Anexar Documento (.md, .txt)
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {memories.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-tertiary)]">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma memória salva ainda.</p>
                <p className="text-xs">Adicione preferências para o assistente lembrar.</p>
              </div>
            ) : (
              memories.map((memory) => (
                <div key={memory.id} className="group flex items-start justify-between gap-4 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words">
                    {memory.content.length > 250 ? memory.content.slice(0, 250) + '... (Clique para ver mais se o arquivo for grande)' : memory.content}
                  </p>
                  <button 
                    onClick={() => handleDeleteMemory(memory.id)}
                    className="p-2 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* History Panel Overlay */}
      {showHistory && (
        <div className="absolute inset-0 z-20 bg-[var(--bg-base)]/95 backdrop-blur-md p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-lg font-semibold">Histórico de Chats</h3>
            </div>
            <button 
              onClick={() => setShowHistory(false)}
              className="p-2 rounded-full hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {history.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-tertiary)]">
                <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum chat salvo ainda.</p>
              </div>
            ) : (
              history.map((session) => (
                <div 
                  key={session.id} 
                  onClick={() => handleSelectSession(session)}
                  className="group flex items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-base)] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-[var(--accent)]" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{session.title}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{new Date(session.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteHistory(e, session.id)}
                    className="p-2 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Panel Overlay */}
      {showSettings && (
        <div className="absolute inset-0 z-20 bg-[var(--bg-base)]/95 backdrop-blur-md p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-lg font-semibold">Persona da IA (Diretrizes)</h3>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="p-2 rounded-full hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Defina regras globais de comportamento para a IA. Isso garante que ela sempre responda no tom da sua marca.
            </p>
            <textarea
              className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-4 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
              placeholder="Ex: Como Diretor de Arte, você deve sempre criar roteiros acelerados para TikTok, usando um tom sarcástico. Nunca crie cenas escuras, prefira o modo Whiteboard com cores vibrantes."
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
            />
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="w-full mt-auto py-3 rounded-xl bg-[var(--accent)] text-white font-medium shadow-[0_0_15px_var(--accent-glow)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isSavingSettings ? 'Salvando...' : 'Aplicar Diretrizes'}
            </button>
          </div>
        </div>
      )}

      {/* Chat Header with Memory Toggle */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-elevated)]/50">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[var(--accent)]" />
          <span className="font-medium text-sm">Assistente Criativo</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={startNewChat}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-medium hover:border-[var(--accent)]/50 transition-all"
            title="Novo Chat"
          >
            <MessageSquarePlus className="w-4 h-4 text-[var(--accent)]" />
            <span className="hidden sm:inline">Novo Chat</span>
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-medium hover:border-[var(--accent)]/50 transition-all"
            title="Histórico"
          >
            <History className="w-4 h-4 text-[var(--accent)]" />
            <span className="hidden sm:inline">Histórico</span>
          </button>
          <button 
            onClick={() => setShowMemories(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-medium hover:border-[var(--accent)]/50 transition-all"
            title="Memórias e Arquivos"
          >
            <Brain className="w-4 h-4 text-[var(--accent)]" />
            <span className="hidden lg:inline">Conhecimento</span>
          </button>
          
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-medium hover:border-[var(--accent)]/50 transition-all"
            title="Persona e Configurações"
          >
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <span className="hidden lg:inline">Persona</span>
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg) => {
          const isModel = msg.role === 'model';
          const settings = isModel ? extractJsonSettings(msg.text) : null;
          const cleanText = msg.text.replace(/```json\n[\s\S]*?\n```/, '').trim();

          return (
            <div key={msg.id} className={`flex gap-4 ${isModel ? '' : 'flex-row-reverse'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isModel ? 'bg-[var(--bg-elevated)] border border-[var(--border)]' : 'accent-gradient'}`}>
                {isModel ? <Bot className="w-4 h-4 text-[var(--accent)]" /> : <User className="w-4 h-4 text-white" />}
              </div>
              
              <div className={`max-w-[80%] flex flex-col gap-2 ${isModel ? 'items-start' : 'items-end'}`}>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-1">
                    {msg.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs">
                        {att.mimeType.startsWith('image/') ? (
                          <img src={`data:${att.mimeType};base64,${att.data}`} alt={att.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <FileText className="w-4 h-4 text-[var(--accent)]" />
                        )}
                        <span className="max-w-[100px] truncate text-[var(--text-secondary)]">{att.name || 'Arquivo'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`p-4 rounded-2xl ${isModel ? 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)]' : 'accent-gradient text-white'}`}>
                  <div className="prose prose-invert max-w-none text-sm">
                    <ReactMarkdown>{cleanText}</ReactMarkdown>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {settings && (
                    <button
                      onClick={() => handleApply(settings, msg.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 border border-[var(--accent)]/20 transition-colors text-sm font-medium"
                    >
                      {appliedMessageId === msg.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Aplicado!
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Aplicar
                        </>
                      )}
                    </button>
                  )}
                  {isModel && msg.id !== 'welcome' && (
                    <button
                      onClick={() => handleSaveMessageToMemory(cleanText, msg.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--accent)] border border-[var(--border)] hover:border-[var(--accent)]/20 transition-colors text-sm font-medium"
                      title="Salvar nas memórias"
                    >
                      {savedToMemoryId === msg.id ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          Salvo!
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-4 h-4" />
                          Lembrar
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {messages.length === 1 && !isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => sendMessage(prompt.text)}
                className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-left hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-all group"
              >
                <div className="text-xs font-semibold text-[var(--accent)] mb-1 uppercase tracking-wider">{prompt.label}</div>
                <div className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] line-clamp-2">{prompt.text}</div>
              </button>
            ))}
          </div>
        )}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-[var(--accent)] animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border)]">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {pendingFiles.map((file, i) => (
              <div key={i} className="relative group flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-xs">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-[var(--accent)]" />
                ) : (
                  <FileText className="w-4 h-4 text-[var(--accent)]" />
                )}
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button 
                  onClick={() => removeFile(i)}
                  className="p-1 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept="image/*,.pdf,.txt"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all shrink-0"
            title="Anexar arquivo"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Peça ajuda com o roteiro, ideias de vozes..."
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-xl py-3 px-4 pr-12 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-none min-h-[52px] max-h-[150px] flex items-center"
              rows={1}
            />
            <button
              type="submit"
              disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
              aria-label="Enviar mensagem"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:hover:bg-[var(--accent)] transition-colors"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
