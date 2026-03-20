'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, BookOpen, Clock, ChevronRight, User } from 'lucide-react';
import { generateVerseOfTheDay } from '@/lib/ai';
import { ThemeToggle } from '@/components/theme-toggle';
import { formatBibleText } from '@/lib/bible-utils';
import { getStudies, saveStudy, getGoals, saveSearchHistory, type StudyHistory } from '@/lib/db';
import { ShareVerse } from '@/components/ShareVerse';
import { useAuth } from '@/hooks/useAuth';
import { BIBLE_BOOKS } from '@/lib/bible-data';

export default function Dashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [verse, setVerse] = useState<{ reference: string; text: string; explanation: string } | null>(null);
  const [loadingVerse, setLoadingVerse] = useState(true);
  const [history, setHistory] = useState<StudyHistory[]>([]);
  const [similarStudy, setSimilarStudy] = useState<StudyHistory | null>(null);
  const [pendingQuery, setPendingQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Load history from Supabase/Local
      const studies = await getStudies();
      setHistory(studies);

      // Load or generate verse of the day
      const today = new Date().toISOString().split('T')[0];
      const savedVerse = localStorage.getItem(`biblia_ai_verse_${today}`);
      
      if (savedVerse) {
        setVerse(JSON.parse(savedVerse));
        setLoadingVerse(false);
      } else {
        // Generate new verse based on history
        const userGoals = await getGoals();
        const historySummary = studies.map(h => h.title).join(', ');
        
        try {
          const v = await generateVerseOfTheDay(userGoals, historySummary);
          setVerse(v);
          localStorage.setItem(`biblia_ai_verse_${today}`, JSON.stringify(v));
        } catch (e) {
          console.error('Failed to generate verse:', e);
          const fallbackVerse = {
            reference: "Salmos 119:105",
            text: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.",
            explanation: "A Palavra de Deus nos guia em todas as decisões."
          };
          setVerse(fallbackVerse);
          localStorage.setItem(`biblia_ai_verse_${today}`, JSON.stringify(fallbackVerse));
        } finally {
          setLoadingVerse(false);
        }
      }
    };

    loadData();
  }, []);

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
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <h1 className="font-outfit text-2xl md:text-3xl font-bold tracking-tight text-foreground">IA Bíblia</h1>
          <div className="sm:hidden">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-end overflow-x-auto pb-2 sm:pb-0">
          <button 
            onClick={() => router.push('/study')}
            className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            Estudos
          </button>
          <button 
            onClick={() => router.push('/highlights')}
            className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            Destaques
          </button>
          <button 
            onClick={() => router.push('/bible')}
            className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap"
          >
            <BookOpen size={16} />
            <span>Bíblia</span>
          </button>
          <button 
            onClick={() => router.push('/goals')}
            className="text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            Objetivos
          </button>

          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          
          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User size={16} />
                </div>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                <div className="p-1">
                  <button 
                    onClick={() => signOut()}
                    className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </div>
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
          <div className="absolute top-0 left-0 w-2 h-full bg-primary shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500"></div>
          
          <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 relative z-10">Versículo do Dia</h3>
          
          {loadingVerse ? (
            <div className="animate-pulse flex flex-col gap-3 relative z-10">
              <div className="h-6 bg-muted rounded w-1/4"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full mt-4"></div>
            </div>
          ) : verse ? (
            <div className="flex flex-col gap-3 md:gap-4 relative z-10">
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
                    // Parse reference like "João 3:16" or "1 João 3:16"
                    const match = verse.reference.match(/^(\d?\s?[a-zA-ZÀ-ÿ]+)\s+(\d+):(\d+)/);
                    if (match) {
                      const bookName = match[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      const chapter = match[2];
                      const verseNum = match[3];
                      
                      // Find book ID
                      const book = BIBLE_BOOKS.find((b: { id: string; name: string }) => 
                        b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === bookName ||
                        b.id.replace(/\s+/g, '') === bookName.replace(/\s+/g, '')
                      );
                      
                      if (book) {
                        router.push(`/bible/${book.id}/${chapter}#v${verseNum}`);
                      }
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
                  className="text-primary hover:underline"
                />
              </div>
            </div>
          ) : null}
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
    </div>
  );
}
