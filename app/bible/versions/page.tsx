'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Globe, 
  Download, 
  Trash2, 
  Search,
  Volume2
} from 'lucide-react';
import { getSelectedVersion, setSelectedVersion } from '@/lib/db';

const VERSIONS = [
  { id: 'almeida', name: 'ARA', fullName: 'Almeida Revista e Atualizada', language: 'Português (Brasil)', hasAudio: true },
  { id: 'nvi', name: 'NVI', fullName: 'Nova Versão Internacional', language: 'Português (Brasil)', hasAudio: true },
  { id: 'arc', name: 'ARC', fullName: 'Almeida Revista e Corrigida', language: 'Português (Brasil)', hasAudio: true },
  { id: 'ntlh', name: 'NTLH', fullName: 'Nova Tradução na Linguagem de Hoje', language: 'Português (Brasil)', hasAudio: true },
  { id: 'aa', name: 'AA', fullName: 'Almeida Antiga', language: 'Português (Brasil)', hasAudio: false },
  { id: 'kjv', name: 'KJV', fullName: 'King James Version', language: 'English', hasAudio: true },
];

export default function VersionsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState('almeida');
  const [downloaded, setDownloaded] = useState<string[]>(['almeida']);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [searchQuery] = useState('');

  useEffect(() => {
    const loadVersion = async () => {
      const v = await getSelectedVersion();
      setSelected(v);
    };
    loadVersion();
    
    // Load downloaded versions from localStorage
    const saved = localStorage.getItem('biblia_ai_downloaded_versions');
    if (saved) {
      setDownloaded(JSON.parse(saved));
    }
  }, []);

  const handleSelect = async (id: string) => {
    await setSelectedVersion(id);
    setSelected(id);
    router.back();
  };

  const startDownload = (id: string) => {
    if (downloaded.includes(id)) return;
    
    setDownloading(prev => ({ ...prev, [id]: 0 }));
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDownloaded(prev => {
          const next = [...prev, id];
          localStorage.setItem('biblia_ai_downloaded_versions', JSON.stringify(next));
          return next;
        });
        setDownloading(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        setDownloading(prev => ({ ...prev, [id]: Math.floor(progress) }));
      }
    }, 400);
  };

  const removeDownload = (id: string) => {
    if (id === 'almeida') return; // Keep default
    setDownloaded(prev => {
      const next = prev.filter(v => v !== id);
      localStorage.setItem('biblia_ai_downloaded_versions', JSON.stringify(next));
      return next;
    });
  };

  const filteredVersions = VERSIONS.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex-1">Versões</h1>
        <button className="p-2 rounded-full hover:bg-secondary transition-colors">
          <Search size={24} />
        </button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-20">
        <div className="mb-8">
          <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-muted-foreground" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Idioma</p>
                <p className="font-bold">Português (Brasil)</p>
              </div>
            </div>
            <ArrowLeft size={20} className="rotate-180 text-muted-foreground" />
          </button>
        </div>

        <section className="mb-8">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Baixado</h2>
          <div className="flex flex-col gap-2">
            {VERSIONS.filter(v => downloaded.includes(v.id)).map(v => (
              <div 
                key={v.id}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  selected === v.id ? 'border-primary bg-primary/5' : 'border-transparent bg-card hover:bg-secondary/30'
                }`}
                onClick={() => handleSelect(v.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black">{v.name}</span>
                    {v.hasAudio && <Volume2 size={16} className="text-muted-foreground" />}
                    {v.id === 'almeida' && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">PADRÃO</span>}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDownload(v.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{v.fullName}</p>
              </div>
            ))}
          </div>
        </section>

        {Object.keys(downloading).length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Baixando</h2>
            <div className="flex flex-col gap-2">
              {VERSIONS.filter(v => downloading[v.id] !== undefined).map(v => (
                <div key={v.id} className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black">{v.name}</span>
                      <Volume2 size={16} className="text-muted-foreground" />
                    </div>
                    <span className="text-sm font-bold text-primary">{downloading[v.id]}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${downloading[v.id]}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Baixando Versão...</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">
            Português (Brasil) Versões ({filteredVersions.length})
          </h2>
          <div className="flex flex-col gap-2">
            {filteredVersions.filter(v => !downloaded.includes(v.id) && downloading[v.id] === undefined).map(v => (
              <div 
                key={v.id}
                className="p-4 rounded-2xl bg-card border border-border hover:bg-secondary/30 transition-colors cursor-pointer group"
                onClick={() => startDownload(v.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black">{v.name}</span>
                    {v.hasAudio && <Volume2 size={16} className="text-muted-foreground" />}
                  </div>
                  <Download size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground">{v.fullName}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
