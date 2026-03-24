'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Globe, 
  Download, 
  Search,
  Volume2,
  MoreVertical,
  ChevronRight,
  Check
} from 'lucide-react';
import { getSelectedVersion, setSelectedVersion } from '@/lib/db';

const VERSIONS = [
  { id: 'almeida', name: 'ARA', fullName: 'Almeida Revista e Atualizada', language: 'Português (Brasil)', hasAudio: true, hasUpdate: false },
  { id: 'nvi', name: 'NVI', fullName: 'Nova Versão Internacional - Português', language: 'Português (Brasil)', hasAudio: true, hasUpdate: true },
  { id: 'arc', name: 'ARC', fullName: 'Almeida Revista e Corrigida', language: 'Português (Brasil)', hasAudio: true, hasUpdate: false },
  { id: 'ntlh', name: 'NTLH', fullName: 'Nova Tradução na Linguagem de Hoje', language: 'Português (Brasil)', hasAudio: true, hasUpdate: false },
  { id: 'aa', name: 'AA', fullName: 'Almeida Antiga', language: 'Português (Brasil)', hasAudio: false, hasUpdate: false },
  { id: 'a21', name: 'A21', fullName: 'Almeida Século 21', language: 'Português (Brasil)', hasAudio: false, hasUpdate: false },
  { id: 'kjv', name: 'KJV', fullName: 'King James Version', language: 'English', hasAudio: true, hasUpdate: false },
  { id: 'nbv', name: 'NBV', fullName: 'Nova Bíblia Viva', language: 'Português (Brasil)', hasAudio: true, hasUpdate: false },
  { id: 'nvt', name: 'NVT', fullName: 'Nova Versão Transformadora', language: 'Português (Brasil)', hasAudio: false, hasUpdate: false },
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

  const filteredVersions = VERSIONS.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-medium flex-1">Versões</h1>
        <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
          <Search size={24} />
        </button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-20">
        <div className="mb-8">
          <button className="w-full flex items-center justify-between p-5 rounded-3xl bg-[#1a1a1a] hover:bg-[#222] transition-colors">
            <div className="flex items-center gap-4">
              <Globe size={20} className="text-muted-foreground" />
              <p className="font-medium text-lg">Idioma</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">Português (Brasil)</span>
              <ChevronRight size={20} className="rotate-0" />
            </div>
          </button>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-bold mb-6 px-2">Baixado</h2>
          <div className="flex flex-col gap-6">
            {VERSIONS.filter(v => downloaded.includes(v.id)).map(v => (
              <div 
                key={v.id}
                className="group cursor-pointer"
                onClick={() => handleSelect(v.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold tracking-tight">{v.name}</span>
                      {v.hasAudio && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Volume2 size={18} />
                          <span className="text-xs font-bold">2</span>
                        </div>
                      )}
                      {selected === v.id && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check size={12} className="text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-base text-muted-foreground font-light">{v.fullName}</p>
                    {v.hasUpdate && (
                      <div className="mt-1">
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                          Atualização disponível
                        </span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Show menu
                    }}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MoreVertical size={24} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {Object.keys(downloading).length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-6 px-2">Baixando</h2>
            <div className="flex flex-col gap-6">
              {VERSIONS.filter(v => downloading[v.id] !== undefined).map(v => (
                <div key={v.id} className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold tracking-tight">{v.name}</span>
                      <Volume2 size={18} className="text-muted-foreground" />
                    </div>
                    <p className="text-base text-muted-foreground font-light">{v.fullName}</p>
                    <div className="mt-3 w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-300" 
                        style={{ width: `${downloading[v.id]}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">Baixando Versão</p>
                  </div>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        className="text-white/10"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 24}
                        strokeDashoffset={2 * Math.PI * 24 * (1 - downloading[v.id] / 100)}
                        className="text-red-500 transition-all duration-300"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                      {downloading[v.id]}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold mb-6 px-2">
            Português (Brasil) Versões ({filteredVersions.length})
          </h2>
          <div className="flex flex-col gap-8">
            {filteredVersions.filter(v => !downloaded.includes(v.id) && downloading[v.id] === undefined).map(v => (
              <div 
                key={v.id}
                className="flex items-center justify-between group cursor-pointer"
                onClick={() => startDownload(v.id)}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold tracking-tight">{v.name}</span>
                    <button className="p-1.5 bg-white/10 rounded-lg text-white">
                      <Download size={14} />
                    </button>
                  </div>
                  <p className="text-base text-muted-foreground font-light">{v.fullName}</p>
                </div>
                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <MoreVertical size={24} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
