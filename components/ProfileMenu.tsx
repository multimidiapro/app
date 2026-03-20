'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Camera, X, LogOut, ChevronRight, Clock, Save, Loader2, MessageSquare, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getProfile, updateProfile, uploadProfileImage, type Profile, getStudies, getAllHighlights, type StudyHistory, type Highlight } from '@/lib/db';
import Cropper, { type Point, type Area } from 'react-easy-crop';
import { useRouter } from 'next/navigation';
import { FeedbackModal } from './FeedbackModal';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function ProfileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  
  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  // Image upload & crop
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Embedded content
  const [studies, setStudies] = useState<StudyHistory[]>([]);
  const [highlights, setHighlights] = useState<(Highlight & { book_id: string; chapter: number })[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'studies' | 'highlights' | 'settings'>('profile');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getProfile(),
        getStudies(),
        getAllHighlights()
      ]);
      
      const p = results[0].status === 'fulfilled' ? results[0].value : null;
      const s = results[1].status === 'fulfilled' ? results[1].value : [];
      const h = results[2].status === 'fulfilled' ? results[2].value : [];

      setProfile(p);
      if (p) {
        setName(p.display_name);
        setGoals(p.goals);
      }
      setStudies(s as StudyHistory[]);
      setHighlights(h as (Highlight & { book_id: string; chapter: number })[]);
    } catch (e) {
      console.error('Failed to load profile data', e);
    } finally {
      setLoading(false);
    }
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImage(reader.result as string);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Canvas is empty');
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleSaveCrop = async () => {
    if (!image || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      const file = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });
      const url = await uploadProfileImage(file);
      if (url) {
        await updateProfile({ photo_url: url });
        setProfile(prev => prev ? { ...prev, photo_url: url } : null);
      }
      setShowCropper(false);
      setImage(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile({ display_name: name, goals });
    setProfile(prev => prev ? { ...prev, display_name: name, goals } : null);
    setIsEditing(false);
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <header className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold font-outfit">Perfil</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <div className="p-6 flex flex-col gap-8">
              {/* Profile Header */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div 
                    className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-primary/20 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {profile?.photo_url ? (
                      <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-bold">{profile?.display_name || user?.email?.split('@')[0]}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Perfil
                </button>
                <button 
                  onClick={() => setActiveTab('studies')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'studies' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Estudos
                </button>
                <button 
                  onClick={() => setActiveTab('highlights')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'highlights' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Destaques
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Ajustes
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1">
                {activeTab === 'profile' && (
                  <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Sobre Mim</h4>
                        {!isEditing && (
                          <button onClick={() => setIsEditing(true)} className="text-xs font-medium text-primary hover:underline">
                            Editar
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-muted-foreground">Nome de Exibição</label>
                            <input 
                              type="text" 
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full p-2 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-muted-foreground">Meus Objetivos Espirituais</label>
                            <textarea 
                              value={goals}
                              onChange={(e) => setGoals(e.target.value)}
                              rows={4}
                              className="w-full p-2 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                              placeholder="Quais são seus objetivos de estudo bíblico?"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setIsEditing(false)}
                              className="flex-1 py-2 text-sm font-medium bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={handleSaveProfile}
                              disabled={saving}
                              className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            >
                              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="p-4 bg-secondary/30 rounded-xl border border-border">
                            <p className="text-sm text-foreground italic">
                              {profile?.goals || 'Nenhum objetivo definido ainda. Clique em editar para adicionar.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'studies' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Meus Estudos</h4>
                    {studies.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {studies.map(study => (
                          <button 
                            key={study.id}
                            onClick={() => {
                              router.push(`/study/${study.id}`);
                              onClose();
                            }}
                            className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border hover:border-primary transition-all text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Clock size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-medium truncate max-w-[200px]">{study.title}</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(study.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground" />
                          </button>
                        ))}
                        <button 
                          onClick={() => {
                            router.push('/study');
                            onClose();
                          }}
                          className="py-2 text-xs font-medium text-primary hover:underline text-center"
                        >
                          Ver todos os estudos
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        <p className="text-sm">Você ainda não tem estudos salvos.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'highlights' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Versículos Destacados</h4>
                    {highlights.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {highlights.slice(0, 10).map((h, i) => (
                          <button 
                            key={i}
                            onClick={() => {
                              router.push(`/bible/${h.book_id}/${h.chapter}#v${h.verse}`);
                              onClose();
                            }}
                            className="flex flex-col gap-1 p-3 bg-secondary/30 rounded-xl border border-border hover:border-primary transition-all text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-primary">{h.book_id} {h.chapter}:{h.verse}</span>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">&quot;{h.text}&quot;</p>
                          </button>
                        ))}
                        <button 
                          onClick={() => {
                            router.push('/highlights');
                            onClose();
                          }}
                          className="py-2 text-xs font-medium text-primary hover:underline text-center"
                        >
                          Ver todos os destaques
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        <p className="text-sm">Você ainda não destacou nenhum versículo.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Configurações</h4>
                    <div className="flex flex-col gap-2">
                      {canInstall && (
                        <button 
                          onClick={handleInstallApp}
                          className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-primary/20 text-primary hover:bg-primary/20 transition-all"
                        >
                          <Download size={18} />
                          <span className="text-sm font-medium">Instalar Aplicativo</span>
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          setShowFeedback(true);
                        }}
                        className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border hover:bg-secondary/50 transition-all"
                      >
                        <MessageSquare size={18} className="text-primary" />
                        <span className="text-sm font-medium">Sugestões ou Bugs</span>
                      </button>
                      
                      <button 
                        onClick={() => signOut()}
                        className="flex items-center gap-3 p-3 bg-destructive/5 rounded-xl border border-destructive/10 text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Sair da Conta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cropper Modal */}
      {showCropper && image && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90">
          <div className="bg-card w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">Ajustar Foto</h3>
              <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-secondary rounded-full">
                <X size={20} />
              </button>
            </header>
            
            <div className="relative flex-1 min-h-[300px] bg-black">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <footer className="p-4 border-t border-border flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowCropper(false)}
                  className="flex-1 py-2 text-sm font-medium bg-secondary rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveCrop}
                  disabled={saving}
                  className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar Foto
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
      {/* Feedback Modal */}
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
}
