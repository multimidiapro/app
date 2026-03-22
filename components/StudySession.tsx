'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Send, ArrowLeft, Share2, Check, Menu, X, Search, Clock, AlertCircle, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import LZString from 'lz-string';
import { generateBibleStudy } from '@/lib/ai';
import { ThemeToggle } from '@/components/theme-toggle';
import { linkifyBibleReferencesMarkdown } from '@/lib/bible-utils';
import { getStudies, deleteStudy, updateStudyTitle, getStudyMessages, saveStudyMessage, copyStudy, getProfile, type StudyHistory, type Profile } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { ProfileMenu } from '@/components/ProfileMenu';
import { FeedbackModal } from '@/components/FeedbackModal';
import { DonationModal } from '@/components/DonationModal';
import Image from 'next/image';
import { User } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function StudySession() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const id = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState<StudyHistory[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [similarStudy, setSimilarStudy] = useState<StudyHistory | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editingSidebarId, setEditingSidebarId] = useState<string | null>(null);
  const [editingSidebarTitle, setEditingSidebarTitle] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const handleHashLink = (href: string) => {
    if (href === '#profile') {
      setShowProfile(true);
      return true;
    }
    if (href === '#donation' || href === '#donate') {
      setShowDonation(true);
      return true;
    }
    if (href === '#feedback' || href === '#support') {
      setShowFeedback(true);
      return true;
    }
    return false;
  };

  const MarkdownContent = ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        components={{
          a: ({ ...props }) => {
            const isHash = props.href?.startsWith('#');
            if (isHash) {
              return (
                <button
                  onClick={() => handleHashLink(props.href!)}
                  className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium no-underline my-1"
                >
                  {props.children}
                </button>
              );
            }
            return (
              <a 
                {...props} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium no-underline my-1"
              />
            );
          },
          strong: ({...props}) => <strong className="text-primary font-bold" {...props} />
        }}
      >
        {linkifyBibleReferencesMarkdown(content)}
      </ReactMarkdown>
    );
  };

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      const studies = await getStudies();
      setHistory(studies);
    };
    loadHistory();
    
    if (searchParams.get('sidebar') === 'open') {
      setIsSidebarOpen(true);
    }
  }, [searchParams]);

  const checkSimilarStudy = (query: string, currentHistory: StudyHistory[]) => {
    if (currentHistory.length === 0 || messages.length > 0) return;
    
    const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const words = normalizedQuery.split(/\s+/).filter(w => w.length > 3);
    
    for (const study of currentHistory) {
      if (study.id === id) continue; // Skip current
      
      const normalizedTitle = study.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matchCount = words.filter(w => normalizedTitle.includes(w)).length;
      
      // If we have a decent match (e.g. at least 1 significant word matches in a short query, or 2 in a longer one)
      if ((words.length <= 2 && matchCount >= 1) || matchCount >= 2) {
        setSimilarStudy(study);
        return;
      }
    }
  };

  const handleSend = async (text: string, currentMessages: Message[] = messages) => {
    if (!text.trim()) return;
    
    if (currentMessages.length === 0) {
      checkSimilarStudy(text, history);
    }
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    const newMessages = [...currentMessages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    if (!isSharedView) {
      await saveStudyMessage(id, { role: 'user', parts: [{ text }] });
    }

    try {
      // Format history for AI
      const aiHistory = newMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      // Remove the last message from history since it's the prompt itself
      aiHistory.pop();

      const responseText = await generateBibleStudy(text, aiHistory, profile ? { display_name: profile.display_name } : undefined);
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
      setMessages(prev => [...prev, aiMsg]);
      
      if (!isSharedView) {
        await saveStudyMessage(id, { role: 'model', parts: [{ text: responseText }] });
      }
    } catch (error) {
      console.error('Failed to generate response', error);
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.' 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sharedData = searchParams.get('share');
    if (sharedData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(sharedData);
        if (decompressed) {
          const parsed = JSON.parse(decompressed);
          setMessages(parsed);
          setIsSharedView(true);
          return;
        }
      } catch (e) {
        console.error('Failed to parse shared study', e);
      }
    }

    // Load from Supabase/Local
    const loadStudy = async () => {
      const studies = await getStudies();
      setHistory(studies);
      
      const p = await getProfile();
      setProfile(p);
      
      const studyMessages = await getStudyMessages(id);
      if (studyMessages.length > 0) {
        setMessages(studyMessages.map((m, idx) => ({
          id: `${id}_${idx}`,
          role: m.role,
          text: m.parts[0].text
        })));
      } else {
        // New study, check if there's an initial query
        const initialQuery = searchParams.get('q');
        if (initialQuery && !initialized.current) {
          initialized.current = true;
          handleSend(initialQuery, []);
        }
      }
    };

    loadStudy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams, isSharedView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleShare = async () => {
    setIsCopying(true);
    try {
      const title = history.find(h => h.id === id)?.title || 'Estudo Bíblico';
      const dbMessages = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const newId = await copyStudy(title, dbMessages);
      
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${baseUrl}/study/${newId}`;
      const shareText = `Confira meu estudo bíblico no IA Bíblia: ${url}\n\nCadastre-se para iniciar seus próprios estudos e acompanhar seu progresso bíblico! ✨`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Meu Estudo Bíblico - IA Bíblia',
          text: shareText,
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }
    } catch (error) {
      console.error('Failed to share study', error);
      alert('Erro ao gerar link de compartilhamento. Tente novamente.');
    } finally {
      setIsCopying(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }
    
    await updateStudyTitle(id, editTitle.trim());
    const studies = await getStudies();
    setHistory(studies);
    setIsEditingTitle(false);
  };

  const handleSaveSidebarTitle = async (studyId: string) => {
    if (!editingSidebarTitle.trim()) {
      setEditingSidebarId(null);
      return;
    }
    
    await updateStudyTitle(studyId, editingSidebarTitle.trim());
    const studies = await getStudies();
    setHistory(studies);
    
    if (studyId === id) {
      setEditTitle(editingSidebarTitle.trim());
    }
    
    setEditingSidebarId(null);
  };

  const handleDeleteStudy = async (studyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este estudo?')) {
      await deleteStudy(studyId);
      const studies = await getStudies();
      setHistory(studies);
      if (studyId === id) {
        router.push('/');
      }
    }
  };

  const handleCopyStudy = async () => {
    if (!user) {
      // If not logged in, redirect to login with a return path
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(messages));
      router.push(`/?share=${compressed}&action=copy`);
      return;
    }

    setIsCopying(true);
    try {
      const title = history.find(h => h.id === id)?.title || 'Estudo Bíblico';
      const dbMessages = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const newId = await copyStudy(title, dbMessages);
      router.push(`/study/${newId}`);
    } catch (error) {
      console.error('Failed to copy study', error);
      alert('Erro ao copiar estudo. Tente novamente.');
    } finally {
      setIsCopying(false);
    }
  };

  const filteredHistory = history.filter(h => 
    h.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .includes(searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );

  return (
    <div className="flex h-screen bg-background relative z-10 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-card border-r border-border transform transition-transform duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 ${!isSidebarOpen ? 'md:hidden' : 'md:flex'}`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            Seus Estudos
          </h2>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-secondary rounded-full md:hidden"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        
        <div className="p-4 border-b border-border">
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              router.push(`/study/${crypto.randomUUID()}`);
            }}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Novo Estudo
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar estudos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-secondary border-none rounded-lg text-sm focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredHistory.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground p-4">Nenhum estudo encontrado.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredHistory.map((study) => (
                <div key={study.id} className="group relative">
                  {editingSidebarId === study.id ? (
                    <div className="w-full p-2 bg-secondary rounded-xl flex items-center gap-2">
                      <input
                        type="text"
                        value={editingSidebarTitle}
                        onChange={(e) => setEditingSidebarTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSidebarTitle(study.id);
                          if (e.key === 'Escape') setEditingSidebarId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button 
                        onClick={() => handleSaveSidebarTitle(study.id)}
                        className="p-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsSidebarOpen(false);
                          router.push(`/study/${study.id}`);
                        }}
                        className={`w-full p-3 rounded-xl text-left transition-colors pr-16 ${
                          study.id === id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-secondary border border-transparent'
                        }`}
                      >
                        <p className={`text-sm font-medium truncate ${study.id === id ? 'text-primary' : 'text-foreground'}`}>
                          {study.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(study.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </button>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSidebarId(study.id);
                            setEditingSidebarTitle(study.title);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors bg-card/80 backdrop-blur-sm rounded-md shadow-sm border border-border"
                          title="Editar título"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteStudy(study.id, e)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors bg-card/80 backdrop-blur-sm rounded-md shadow-sm border border-border"
                          title="Excluir estudo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full relative">
        {/* Header */}
        <header className="flex items-center justify-between p-3 md:p-4 bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-20">
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-secondary rounded-full transition-colors bg-card shadow-sm border border-border"
            >
              <Menu size={20} className="text-muted-foreground" />
            </button>
            <button 
              onClick={() => router.push('/')}
              className="p-2 hover:bg-secondary rounded-full transition-colors bg-card shadow-sm border border-border hidden sm:block"
            >
              <ArrowLeft size={20} className="text-muted-foreground" />
            </button>
            <div className="flex items-center gap-1 md:gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-1 md:gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="font-outfit text-lg md:text-xl font-bold bg-secondary border border-primary/50 rounded-md px-2 py-1 text-foreground max-w-[120px] sm:max-w-[250px] focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button 
                    onClick={handleSaveTitle}
                    className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="font-outfit text-lg md:text-xl font-bold text-foreground truncate max-w-[100px] sm:max-w-[300px]">
                    {isSharedView ? 'Estudo Compartilhado' : (history.find(h => h.id === id)?.title || 'Estudo Bíblico')}
                  </h1>
                  {!isSharedView && messages.length > 0 && (
                    <button 
                      onClick={() => {
                        setEditTitle(history.find(h => h.id === id)?.title || 'Estudo Bíblico');
                        setIsEditingTitle(true);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-md transition-colors"
                      title="Editar título"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            <ThemeToggle />
            {user && (
              <button 
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors p-1.5 hover:bg-secondary rounded-full"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border border-primary/20">
                  {profile?.photo_url ? (
                    <Image src={profile.photo_url} alt="Profile" width={32} height={32} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-2 md:px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-full text-xs md:text-sm font-medium transition-colors border border-border"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 flex flex-col gap-4 md:gap-6">
          {similarStudy && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-primary shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-medium text-foreground">Estudo similar encontrado</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você já tem um estudo sobre &quot;{similarStudy.title}&quot;. Deseja continuar de onde parou?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button 
                  onClick={() => setSimilarStudy(null)}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
                >
                  Ignorar
                </button>
                <button 
                  onClick={() => router.push(`/study/${similarStudy.id}`)}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Continuar estudo
                </button>
              </div>
            </div>
          )}

          {messages.length === 0 && !loading && !similarStudy && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground font-serif text-xl text-center px-4">
              Faça uma pergunta para começar seu estudo.
            </div>
          )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[90%] sm:max-w-[75%] rounded-2xl p-4 md:p-5 ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-md shadow-primary/20' 
                  : 'bg-card border border-border text-foreground rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-base md:text-lg">{msg.text}</p>
              ) : (
                <div className="markdown-body prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-a:text-primary text-sm md:text-base">
                  <MarkdownContent content={msg.text} />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-5 shadow-sm flex gap-2 items-center">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      {!isSharedView && (
        <footer className="p-3 md:p-4 bg-card border-t border-border">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex gap-2 max-w-4xl mx-auto relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Faça uma pergunta..."
              className="flex-1 pl-4 pr-12 py-3 md:py-4 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-card transition-all text-foreground placeholder:text-muted-foreground text-sm md:text-base"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors shadow-sm shadow-primary/20"
            >
              <Send size={18} />
            </button>
          </form>
        </footer>
      )}
      
      {isSharedView && (
        <footer className="p-6 bg-card border-t border-border text-center">
          <p className="text-muted-foreground mb-4 font-medium">Você está visualizando um estudo compartilhado.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCopyStudy}
              disabled={isCopying}
              className="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isCopying ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {user ? 'Salvar em meus estudos' : 'Cadastre-se para continuar este estudo'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full sm:w-auto px-8 py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              Ir para o início
            </button>
          </div>
        </footer>
      )}
      {/* Modals */}
      <ProfileMenu isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      <DonationModal isOpen={showDonation} onClose={() => setShowDonation(false)} />
      </div>
    </div>
  );
}
