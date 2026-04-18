import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Calendar, Clock, Film, Download } from 'lucide-react';
import { getProjects, getProjectDetails, getGenerations, Project, SavedAudio } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

interface VideoLibraryProps {
  onSelect: (projectId: string, audioUrl: string, scenes: { imageUrl: string; timestamp: number }[], script: string) => void;
  activeProjectId?: string | null;
}

export function VideoLibrary({ onSelect, activeProjectId }: VideoLibraryProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const [projectsData, generationsData] = await Promise.all([
        getProjects(user?.uid),
        getGenerations(user?.uid)
      ]);

      // Combine and unify data
      const unified: (Project & { thumbnail?: string; isGeneration?: boolean; audioUrl?: string; scenes?: any[] })[] = [
        ...projectsData.map(p => ({ ...p, isGeneration: false })),
        ...generationsData.filter(g => g.scenes && g.scenes.length > 0).map(g => ({
          id: g.id,
          name: g.name,
          script: g.script,
          createdAt: g.createdAt,
          userId: g.userId,
          isGeneration: true,
          audioUrl: g.audioUrl,
          scenes: g.scenes,
          settings: {
            selectedVoice: g.voice,
            pace: 'normal',
            styleNotes: '',
            isMultiSpeaker: false,
            speakerAName: '',
            speakerBName: '',
            speakerBVoice: '',
            audioProfile: '',
            scene: '',
            sceneDensity: 15,
            sceneRatio: '16:9'
          }
        }))
      ];

      // Sort by date
      const sorted = unified.sort((a, b) => b.createdAt - a.createdAt);
      
      // Fetch details/thumbnails
      const finalItems = await Promise.all(sorted.map(async (item) => {
        if (item.isGeneration) {
           return {
             ...item,
             thumbnail: item.scenes?.[0]?.imageUrl
           };
        }
        try {
          const details = await getProjectDetails(item.id, user?.uid);
          return {
            ...item,
            thumbnail: details.images[0]?.imageUrl || (details.images[0]?.imageBlob ? URL.createObjectURL(details.images[0].imageBlob) : undefined),
            audioUrl: details.audios[0]?.audioUrl || (details.audios[0]?.audioBlob ? URL.createObjectURL(details.audios[0].audioBlob) : ''),
            scenes: details.images.map(img => ({ imageUrl: img.imageUrl || (img.imageBlob ? URL.createObjectURL(img.imageBlob) : ''), timestamp: img.timestamp }))
          };
        } catch {
          return item;
        }
      }));

      setProjects(finalItems);
    } catch (error) {
      console.error('Failed to load video library:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
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

      // Usando o nosso próprio proxy do backend para evitar os bloqueios de CORS do Storage
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
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback
      if (url.startsWith('blob:') || url.startsWith('data:')) return;
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const a = document.createElement('a');
      a.href = proxyUrl;
      a.download = filename;
      a.target = "_blank";
      a.click();
    }
  };

  const handleDownloadSequence = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (downloadingId) return;
    
    setDownloadingId(item.id);
    const safeName = item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    try {
      // 1. Download Audio
      if (item.audioUrl) {
        await downloadFile(item.audioUrl, `${safeName}-audio.wav`);
      }

      // 2. Download Images
      if (item.scenes && item.scenes.length > 0) {
        for (let i = 0; i < item.scenes.length; i++) {
          // Small delay to prevent browser block
          await new Promise(r => setTimeout(r, 400));
          const sceneFilename = `${safeName}-cena-${String(i + 1).padStart(2, '0')}.png`;
          await downloadFile(item.scenes[i].imageUrl, sceneFilename);
        }
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSelect = async (item: any) => {
    if (item.audioUrl && item.scenes) {
      onSelect(item.id, item.audioUrl, item.scenes, item.script);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
        {[1, 2, 3].map(i => (
          <div key={i} className="min-w-[200px] h-28 bg-[var(--bg-elevated)] animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
         <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] flex items-center gap-2">
           <Film className="w-3.5 h-3.5" />
           Sua Galeria
         </h3>
      </div>
      
      <div className="flex items-center gap-4 overflow-x-auto pb-6 pt-1 px-1 no-scrollbar -mx-1">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ y: -4 }}
            className={`flex-shrink-0 w-64 text-left glass-panel rounded-2xl border transition-all overflow-hidden group/card relative ${
              activeProjectId === project.id 
                ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/50 shadow-[0_10px_25px_var(--accent-glow)]' 
                : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--bg-surface)]'
            }`}
          >
            {/* Clickable Area for Selection */}
            <div 
              onClick={() => handleSelect(project)}
              className="cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full bg-[var(--bg-elevated)] overflow-hidden">
                 {project.thumbnail ? (
                   <img 
                     src={project.thumbnail} 
                     alt={project.name}
                     className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                     referrerPolicy="no-referrer"
                   />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center">
                     <Film className="w-8 h-8 text-[var(--text-tertiary)] opacity-20" />
                   </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                 
                 <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-[var(--accent)] text-white scale-0 group-hover/card:scale-100 transition-transform">
                    <Play className="w-3 h-3 fill-current" />
                 </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`text-sm font-bold truncate ${activeProjectId === project.id ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                    {project.name}
                  </h4>
                </div>
                
                <p className="text-[10px] text-[var(--text-tertiary)] line-clamp-2 italic mb-3 opacity-60">
                  "{project.script}"
                </p>
                
                <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]/50">
                  <div className="flex items-center gap-1 text-[9px] text-[var(--text-tertiary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded-md">
                     <Calendar className="w-2.5 h-2.5" />
                     {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-[var(--text-tertiary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded-md">
                     <Clock className="w-2.5 h-2.5" />
                     {new Date(project.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Overlay (Not affected by main click) */}
            <div className="absolute top-2 right-2 flex flex-col gap-2">
              <button 
                onClick={(e) => handleDownloadSequence(e, project)}
                disabled={downloadingId === project.id}
                className={`p-1.5 rounded-full backdrop-blur-md border border-white/10 transition-all ${
                  downloadingId === project.id 
                    ? 'bg-[var(--accent)] text-white animate-pulse' 
                    : 'bg-black/40 hover:bg-[var(--accent)] text-white opacity-0 group-hover/card:opacity-100'
                }`}
                title="Sincronizar e baixar todos os arquivos"
              >
                <Download className={`w-3.5 h-3.5 ${downloadingId === project.id ? 'animate-bounce' : ''}`} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
