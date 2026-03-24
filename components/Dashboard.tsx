'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, BookOpen, Clock, ChevronRight, User, Lock, Calendar, X, MessageSquare, Heart } from 'lucide-react';
import { generateVerseOfTheDay } from '@/lib/ai';
import { formatBibleText } from '@/lib/bible-utils';
import { getStudies, saveStudy, getGoals, saveSearchHistory, getVerseOfTheDayForDate, saveVerseOfTheDayForDate, getVerseHistory, copyStudy, type StudyHistory, getProfile, type Profile } from '@/lib/db';
import { ShareVerse } from '@/components/ShareVerse';
import { useAuth } from '@/hooks/useAuth';
import { BIBLE_BOOKS } from '@/lib/bible-data';
import LZString from 'lz-string';
import { ProfileMenu } from '@/components/ProfileMenu';
import { FeedbackModal } from '@/components/FeedbackModal';
import { DonationModal } from '@/components/DonationModal';
import { NotificationCenter } from '@/components/NotificationCenter';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [verse, setVerse] = useState<{ reference: string; text: string; explanation: string } | null>(null);
  const [loadingVerse, setLoadingVerse] = useState(true);
  const [history, setHistory] = useState<StudyHistory[]>([]);
  const [similarStudy, setSimilarStudy] = useState<StudyHistory | null>(null);
  const [pendingQuery, setPendingQuery] = useState('');
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [verseHistory, setVerseHistory] = useState<string[]>([]);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;

      try {
        const [p, studies, vHistory] = await Promise.all([
          getProfile(),
          getStudies(),
          getVerseHistory()
        ]);

        setProfile(p);
        setHistory(studies);
        setVerseHistory(vHistory);
      } catch (e) {
        console.error('Failed to load initial data', e);
      }
    };

    loadInitialData();
  }, [user]);

  useEffect(() => {
    const handleSharedAction = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const sharedData = searchParams.get('share');
      const action = searchParams.get('action');

      if (sharedData && action === 'copy' && user) {
        try {
          const decompressed = LZString.decompressFromEncodedURIComponent(sharedData);
          if (decompressed) {
            const messages = JSON.parse(decompressed);
            const title = 'Estudo Bíblico Compartilhado';
            const dbMessages = messages.map((m: { role: 'user' | 'model'; text: string }) => ({
              role: m.role,
              parts: [{ text: m.text }]
            }));
            const newId = await copyStudy(title, dbMessages);
            // Clear URL params and redirect to the new study
            router.replace(`/study/${newId}`);
          }
        } catch (e) {
          console.error('Failed to auto-copy shared study', e);
        }
      }
    };

    if (user) {
      handleSharedAction();
    }
  }, [user, router]);

  useEffect(() => {
    const loadVerse = async () => {
      setLoadingVerse(true);
      const savedVerse = await getVerseOfTheDayForDate(selectedDate);
      
      if (savedVerse) {
        setVerse(savedVerse);
        setLoadingVerse(false);
      } else if (selectedDate === todayStr) {
        // Generate new verse for today based on history
        try {
          const [userGoals, currentHistory] = await Promise.all([
            getGoals(),
            getStudies()
          ]);
          
          const historySummary = currentHistory.map(h => h.title).join(', ');
          const v = await generateVerseOfTheDay(userGoals, historySummary);
          setVerse(v);
          await saveVerseOfTheDayForDate(selectedDate, v);
          setVerseHistory(prev => prev.includes(selectedDate) ? prev : [...prev, selectedDate]);
        } catch (e) {
          console.error('Failed to generate verse:', e);
          const fallbackVerse = {
            reference: "Salmos 119:105",
            text: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.",
            explanation: "A Palavra de Deus nos guia em todas as decisões."
          };
          setVerse(fallbackVerse);
          await saveVerseOfTheDayForDate(selectedDate, fallbackVerse);
          setVerseHistory(prev => prev.includes(selectedDate) ? prev : [...prev, selectedDate]);
        } finally {
          setLoadingVerse(false);
        }
      } else {
        // No verse for this date and it's not today
        setVerse(null);
        setLoadingVerse(false);
      }
    };

    loadVerse();
  }, [selectedDate, todayStr]);

  const getWeekDays = () => {
    const days = [];
    const now = new Date();
    const first = now.getDate() - now.getDay();
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), first + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const formatted = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    // Capitalize first letter and remove "-feira" for a cleaner look
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace('-feira', '');
  };

  const checkSimilarStudy = (query: string, currentHistory: StudyHistory[]) => {
    if (currentHistory.length === 0) return null;
    
    const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Simple synonym map for common bible study topics
    const synonyms: Record<string, string[]> = {
      'riqueza': ['rico', 'dinheiro', 'prosperidade', 'prospero', 'bens', 'financas'],
      'rico': ['riqueza', 'dinheiro', 'prosperidade', 'prospero', 'bens', 'financas'],
      'prosperidade': ['rico', 'riqueza', 'dinheiro', 'prospero', 'bens', 'financas'],
      'prospero': ['rico', 'riqueza', 'dinheiro', 'prosperidade', 'bens', 'financas'],
      'ansiedade': ['medo', 'preocupacao', 'angustia', 'depressao', 'panico'],
      'luto': ['morte', 'perda', 'tristeza', 'consolo', 'saudade', 'suicidio'],
      'amor': ['casamento', 'relacionamento', 'namoro', 'amar', 'caridade'],
      'pecado': ['tentacao', 'culpa', 'perdao', 'arrependimento'],
    };

    const words = normalizedQuery.split(/\s+/).filter(w => w.length > 3);
    
    // Expand words with synonyms
    const expandedWords = [...words];
    words.forEach(w => {
      for (const [key, syns] of Object.entries(synonyms)) {
        if (w.includes(key) || key.includes(w)) {
          expandedWords.push(...syns);
        }
      }
    });

    for (const study of currentHistory) {
      const normalizedTitle = study.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const matchCount = expandedWords.filter(w => normalizedTitle.includes(w)).length;
      
      if ((words.length <= 2 && matchCount >= 1) || matchCount >= 2) {
        return study;
      }
    }
    return null;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    const similar = checkSimilarStudy(query, history);
    if (similar) {
      setSimilarStudy(similar);
      setPendingQuery(query);
      return;
    }
    
    await saveSearchHistory(query);
    await createNewStudy(query);
  };

  const createNewStudy = async (studyQuery: string) => {
    // Create a new study session
    const id = Date.now().toString();
    const newStudy = { id, title: studyQuery, date: new Date().toISOString() };
    
    await saveStudy(newStudy);
    
    router.push(`/study/${id}?q=${encodeURIComponent(studyQuery)}`);
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-4 md:py-8 flex flex-col gap-8 md:gap-12 relative z-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden shadow-md border border-primary/20">
            <Image 
              src="https://dpceyubrwftpxuddlzmc.supabase.co/storage/v1/object/public/assets/IA%20Biblia%20em%20Cristo.png"
              alt="IA Bíblia Logo"
              fill
              priority
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-outfit text-2xl md:text-3xl font-bold tracking-tight text-foreground hidden md:block">IA Bíblia</h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => router.push('/bible')}
            className="p-2 md:px-4 md:py-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-primary flex items-center gap-2 whitespace-nowrap"
            aria-label="Bíblia"
          >
            <BookOpen size={20} className="md:w-4 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Bíblia</span>
          </button>

          <button
            onClick={() => setShowFeedback(true)}
            className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Sugestões ou Bugs"
          >
            <MessageSquare size={20} />
          </button>

          <button
            onClick={() => setShowDonation(true)}
            className="p-2 rounded-full hover:bg-secondary transition-colors text-red-500 hover:text-red-600"
            aria-label="Doar"
          >
            <Heart size={20} />
          </button>

          <NotificationCenter />

          {user ? (
            <button 
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border border-primary/20">
                {profile?.photo_url ? (
                  <Image src={profile.photo_url} alt="Profile" width={32} height={32} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={16} />
                )}
              </div>
            </button>
          ) : (
            <button 
              onClick={() => router.push('/login')}
              className="text-xs md:text-sm font-medium bg-primary/10 text-primary px-4 py-2 rounded-full hover:bg-primary/20 transition-colors whitespace-nowrap"
            >
              Entrar
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-12">
        {/* Search / Start Study */}
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-3xl md:text-5xl font-medium leading-tight text-center max-w-2xl mx-auto">
            O que você gostaria de estudar na Palavra hoje?
          </h2>
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto w-full mt-4 md:mt-6">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Ansiedade ou João 3"
              className="w-full pl-12 pr-24 md:pr-32 py-3 md:py-4 bg-card border border-border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base md:text-lg transition-all text-foreground placeholder:text-muted-foreground"
            />
            <button 
              type="submit"
              className="absolute inset-y-1.5 right-1.5 px-4 md:px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 text-sm md:text-base"
            >
              Estudar
            </button>
          </form>
        </section>

        {/* Verse of the Day */}
        <section className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-primary shadow-[0_0_10px_rgba(241,23,23,0.5)]"></div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500"></div>
          
          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-muted-foreground">Versículo do Dia</h3>
                <p className="text-sm font-medium text-foreground mt-1 capitalize">
                  {formatDateLong(selectedDate)}
                </p>
              </div>
              <button 
                onClick={() => setShowFullCalendar(true)}
                className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-primary"
                title="Ver calendário completo"
              >
                <Calendar size={20} />
              </button>
            </div>

            {/* Day Selector */}
            <div className="flex justify-start items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
              {weekDays.map((dateStr) => {
                const date = new Date(dateStr + 'T12:00:00');
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const hasVerse = verseHistory.includes(dateStr);
                const isFuture = dateStr > todayStr;
                const isUnlocked = !isFuture && (isToday || hasVerse);
                const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                const dayNum = date.getDate();

                return (
                  <button
                    key={dateStr}
                    disabled={!isUnlocked}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex flex-col items-center gap-1.5 min-w-[40px] md:min-w-[48px] p-1.5 md:p-2 rounded-2xl transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105' 
                        : 'hover:bg-secondary text-muted-foreground'
                    } ${!isUnlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tighter">{dayName}</span>
                    <div className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-primary-foreground/30' : 'border-transparent'
                    }`}>
                      {!isUnlocked ? (
                        <Lock size={10} className="md:w-3 md:h-3" />
                      ) : (
                        <span className="text-xs md:text-sm font-bold">{dayNum}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border w-full"></div>
            
            {loadingVerse ? (
              <div className="animate-pulse flex flex-col gap-3">
                <div className="h-8 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full mt-4"></div>
              </div>
            ) : verse ? (
              <div className="flex flex-col gap-3 md:gap-4 animate-in fade-in duration-500">
                <p className="font-serif text-xl md:text-3xl font-medium leading-snug text-foreground">
                  &quot;{verse.text}&quot;
                </p>
                <p className="font-bold text-primary text-sm md:text-base">{verse.reference}</p>
                <div className="h-px bg-border w-full my-1 md:my-2"></div>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {formatBibleText(verse.explanation)}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() => {
                      const match = verse.reference.match(/^(\d?\s?[a-zA-ZÀ-ÿ]+)\s+(\d+):(\d+)/);
                      if (match) {
                        const bookName = match[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const chapter = match[2];
                        const verseNum = match[3];
                        const book = BIBLE_BOOKS.find((b: { id: string; name: string }) => 
                          b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === bookName ||
                          b.id.replace(/\s+/g, '') === bookName.replace(/\s+/g, '')
                        );
                        if (book) router.push(`/bible/${book.id}/${chapter}#v${verseNum}`);
                      }
                    }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline w-fit"
                  >
                    <BookOpen size={16} />
                    Ler no capítulo
                  </button>
                  <ShareVerse 
                    text={verse.text} 
                    reference={verse.reference} 
                    {...(() => {
                      const parts = verse.reference.split(' ');
                      const lastPart = parts.pop();
                      const bookName = parts.join(' ');
                      const [chapter, verseNum] = lastPart?.split(':').map(Number) || [1, 1];
                      const book = BIBLE_BOOKS.find(b => b.name === bookName);
                      return {
                        bookId: book?.id || 'joao',
                        chapter: chapter || 1,
                        verse: verseNum || 1
                      };
                    })()}
                    className="text-primary hover:underline"
                  />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Lock size={20} />
                </div>
                <p className="text-muted-foreground text-sm">Este versículo ainda não está disponível.</p>
              </div>
            )}
          </div>
        </section>

        {/* Recent Studies */}
        {history.length > 0 && (
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground">
                <Clock size={20} className="text-primary" />
                <h3 className="font-semibold text-lg">Estudos Recentes</h3>
              </div>
              {history.length > 5 && (
                <button 
                  onClick={() => router.push('/study')}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todos
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/study/${item.id}`)}
                  className="flex items-center justify-between p-5 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-md hover:shadow-primary/10 transition-all text-left group"
                >
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <p className="font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Full Calendar Modal */}
      {showFullCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-[2rem] p-6 md:p-8 max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <button 
              onClick={() => setShowFullCalendar(false)}
              className="absolute top-6 right-6 p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground">Calendário de Versículos</h3>
                <p className="text-muted-foreground">Explore os versículos de cada dia.</p>
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 py-2">
                    {day}
                  </div>
                ))}
                
                {/* Empty slots for month start alignment - simplified for current month view */}
                {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {/* Days of the current month */}
                {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(new Date().getFullYear(), new Date().getMonth(), day);
                  const dStr = date.toISOString().split('T')[0];
                  const isToday = dStr === todayStr;
                  const isSelected = dStr === selectedDate;
                  const isFuture = dStr > todayStr;
                  const hasVerse = verseHistory.includes(dStr);
                  const isUnlocked = !isFuture && (isToday || hasVerse);

                  return (
                    <button
                      key={dStr}
                      disabled={!isUnlocked}
                      onClick={() => {
                        setSelectedDate(dStr);
                        setShowFullCalendar(false);
                      }}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl md:rounded-3xl transition-all border-2 ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-110 z-10' 
                          : isToday
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-secondary/50 text-foreground border-transparent hover:border-primary/30'
                      } ${!isUnlocked ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                    >
                      <span className="text-sm md:text-lg font-bold">{day}</span>
                      {hasVerse && !isSelected && !isFuture && (
                        <div className="absolute bottom-2 w-1 h-1 rounded-full bg-primary"></div>
                      )}
                      {!isUnlocked && <Lock size={10} className="mt-1 opacity-50" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span>Hoje / Selecionado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center"><Lock size={8} /></div>
                  <span>Futuro (Bloqueado)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Similar Study Modal */}
      {similarStudy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold text-foreground mb-2">Estudo Similar Encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Você já tem um estudo sobre <span className="font-semibold text-foreground">&quot;{similarStudy.title}&quot;</span>. 
              Deseja continuar este estudo ou criar um novo?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setSimilarStudy(null);
                  createNewStudy(pendingQuery);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
              >
                Criar Novo
              </button>
              <button
                onClick={() => router.push(`/study/${similarStudy.id}`)}
                className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                Continuar Estudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Menu */}
      <ProfileMenu isOpen={showProfile} onClose={() => setShowProfile(false)} />
      
      {/* Feedback Modal */}
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      
      {/* Donation Modal */}
      <DonationModal isOpen={showDonation} onClose={() => setShowDonation(false)} />
    </div>
  );
}
