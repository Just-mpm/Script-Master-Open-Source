import React, { useState, useEffect } from 'react';
import { Play, Pause, Download, Trash2, Edit2, Check, X, Library as LibraryIcon, Mic, Image as ImageIcon, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { getProjects, deleteProject, updateProjectName, getProjectAudios, getProjectImages, Project, AudioSource, ProjectImage } from '../lib/db';
import { useGlobalAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';

export function Library() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<{ audios: AudioSource[], images: ProjectImage[] }>({ audios: [], images: [] });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const { isPlaying, activeId, play, toggle, currentTime } = useGlobalAudio();

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects(user?.uid);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandProject = async (projectId: string) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
      setProjectData({ audios: [], images: [] });
      return;
    }

    setExpandedProjectId(projectId);
    try {
      const [audios, images] = await Promise.all([
        getProjectAudios(projectId, user?.uid),
        getProjectImages(projectId, user?.uid)
      ]);
      setProjectData({ audios, images });
    } catch (err) {
      console.error('Error loading project details:', err);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) throw new Error('Proxy falhou');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      if (url.startsWith('blob:') || url.startsWith('data:')) return;
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      window.open(proxyUrl, '_blank');
    }
  };

  const handlePlay = (audio: AudioSource, name: string) => {
    if (activeId === audio.id) {
      toggle(audio.id);
    } else {
      const url = audio.audioUrl || (audio.audioBlob ? URL.createObjectURL(audio.audioBlob) : '');
      if (url) {
        play(url, audio.id);
      }
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    await deleteProject(itemToDelete, user?.uid);
    setItemToDelete(null);
    await loadProjects();
  };

  const saveEdit = async (id: string) => {
    if (editName.trim()) {
      await updateProjectName(id, editName.trim(), user?.uid);
      await loadProjects();
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[var(--accent)]" />
          Projetos Salvos
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-12" role="status">
          <div className="animate-pulse text-[var(--text-secondary)]">Carregando projetos...</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-[var(--text-secondary)] glass-panel rounded-2xl border border-[var(--border)]">
          <LibraryIcon className="w-12 h-12 mb-4 opacity-50" aria-hidden="true" />
          <p>Sua biblioteca está vazia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(project => (
            <div 
              key={project.id}
              className="glass-panel rounded-2xl border border-[var(--border)] overflow-hidden transition-all hover:border-[var(--border-hover)]"
            >
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  {editingId === project.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 max-w-sm bg-[var(--bg-base)] border border-[var(--accent)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(project.id)}
                      />
                      <button onClick={() => saveEdit(project.id)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="group flex items-center gap-3">
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">{project.name}</h3>
                      <button onClick={() => { setEditingId(project.id); setEditName(project.name); }} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><Edit2 className="w-4 h-4" /></button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)] font-medium">
                    <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Áudio</span>
                    <span>•</span>
                    <time>{new Date(project.createdAt).toLocaleString()}</time>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleExpandProject(project.id)}
                    className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium flex items-center gap-2 hover:bg-[var(--border)] transition-colors"
                  >
                    {expandedProjectId === project.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedProjectId === project.id ? 'Ocultar' : 'Ver Detalhes'}
                  </button>
                  <button
                    onClick={() => setItemToDelete(project.id)}
                    className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedProjectId === project.id && (
                <div className="border-t border-[var(--border)] bg-[var(--bg-base)]/30 p-6 space-y-8 animate-in fade-in slide-in-from-top-2">
                  {/* Audio Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Versões de Áudio
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projectData.audios.map(audio => (
                        <div key={audio.id} className="glass-panel rounded-xl p-4 border border-[var(--border)] flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{new Date(audio.createdAt).toLocaleTimeString()}</span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handlePlay(audio, project.name)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  activeId === audio.id 
                                    ? 'bg-[var(--accent)] text-white shadow-lg' 
                                    : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--border)]'
                                }`}
                              >
                                {isPlaying && activeId === audio.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                              </button>
                              <button 
                                onClick={() => {
                                  const url = audio.audioUrl || (audio.audioBlob ? URL.createObjectURL(audio.audioBlob) : '');
                                  if (url) {
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${project.name}-${audio.id}.wav`;
                                    a.click();
                                  }
                                }}
                                className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center justify-center hover:text-[var(--text-primary)]"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {projectData.audios.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">Nenhum áudio encontrado.</p>}
                    </div>
                  </div>

                  {/* Images Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Cenas Geradas
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {projectData.images.map((img, idx) => (
                        <div key={img.id} className="group relative aspect-video rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-elevated)]">
                          <img 
                            src={img.imageUrl || (img.imageBlob ? URL.createObjectURL(img.imageBlob) : '')} 
                            alt={`Cena ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button 
                              onClick={() => {
                                const url = img.imageUrl || (img.imageBlob ? URL.createObjectURL(img.imageBlob) : '');
                                if (url) {
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${project.name}-cena-${idx + 1}.png`;
                                  a.click();
                                }
                              }}
                              className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[8px] font-mono text-white">
                            {idx + 1}
                          </div>
                        </div>
                      ))}
                      {projectData.images.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">Nenhuma imagem encontrada.</p>}
                    </div>
                  </div>

                  {/* Script Details */}
                  <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                    <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em]">Roteiro Original</h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                      "{project.script}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Confirmar Exclusão</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Tem certeza que deseja excluir todo o projeto? Esta ação apagará permanentemente todos os áudios e imagens vinculados a ele.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Excluir Projeto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
