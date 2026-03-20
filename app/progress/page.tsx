'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, BookOpen, CheckCircle2, Trophy, Flame, ChevronRight } from 'lucide-react';
import { getReadingHistory } from '@/lib/db';
import { BIBLE_BOOKS } from '@/lib/bible-data';
import { BIBLE_METADATA } from '@/lib/bible-metadata';
import { ThemeToggle } from '@/components/theme-toggle';

type ProgressStats = {
  totalVerses: number;
  totalChapters: number;
  totalBooks: number;
  completedBooks: string[];
  bookProgress: Record<string, {
    chaptersRead: number;
    totalChapters: number;
    versesRead: number;
    percent: number;
  }>;
};

export default function ProgressPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateProgress = async () => {
      setLoading(true);
      const history = await getReadingHistory();
      
      const stats: ProgressStats = {
        totalVerses: 0,
        totalChapters: 0,
        totalBooks: 0,
        completedBooks: [],
        bookProgress: {}
      };

      // Group by book and chapter
      const bookVerseMap: Record<string, Set<string>> = {};
      const completedChapters: Record<string, Set<number>> = {};
      const readVerses = new Set<string>();

      history.forEach((h: { book_id: string; chapter: number; verse?: number | null; is_completed?: boolean }) => {
        if (h.verse !== null && h.verse !== undefined) {
          // Validate verse against metadata
          const maxVerses = BIBLE_METADATA[h.book_id]?.[h.chapter - 1] || 0;
          if (h.verse > 0 && h.verse <= maxVerses) {
            const verseKey = `${h.book_id}-${h.chapter}-${h.verse}`;
            readVerses.add(verseKey);
            
            if (!bookVerseMap[h.book_id]) bookVerseMap[h.book_id] = new Set();
            bookVerseMap[h.book_id].add(verseKey);
          }
        }
        
        if (h.is_completed) {
          // Validate chapter against metadata
          const totalChaptersInBook = BIBLE_METADATA[h.book_id]?.length || 0;
          if (h.chapter > 0 && h.chapter <= totalChaptersInBook) {
            if (!completedChapters[h.book_id]) completedChapters[h.book_id] = new Set();
            completedChapters[h.book_id].add(h.chapter);
          }
        }
      });

      stats.totalVerses = readVerses.size;
      
      let totalCompletedChapters = 0;
      Object.values(completedChapters).forEach(set => {
        totalCompletedChapters += set.size;
      });
      stats.totalChapters = totalCompletedChapters;

      BIBLE_BOOKS.forEach(book => {
        const chaptersRead = completedChapters[book.id]?.size || 0;
        const versesRead = bookVerseMap[book.id]?.size || 0;
        const bookTotalVerses = BIBLE_METADATA[book.id]?.reduce((a, b) => a + b, 0) || 0;
        
        // Use verse-based progress for the percentage to be more granular
        const percent = bookTotalVerses > 0 ? Math.min(100, Math.round((versesRead / bookTotalVerses) * 100)) : 0;
        
        stats.bookProgress[book.id] = {
          chaptersRead,
          totalChapters: book.chapters,
          versesRead,
          percent
        };

        if (percent === 100) {
          stats.completedBooks.push(book.id);
        }
      });

      stats.totalBooks = stats.completedBooks.length;
      
      setStats(stats);
      setLoading(false);
    };

    calculateProgress();
  }, []);

  const totalBibleChapters = BIBLE_BOOKS.reduce((acc, b) => acc + b.chapters, 0);
  const totalBibleVerses = Object.values(BIBLE_METADATA).reduce((acc, book) => acc + book.reduce((a, b) => a + b, 0), 0);
  const overallPercent = stats ? Math.min(100, Math.round((stats.totalVerses / totalBibleVerses) * 100)) : 0;

  return (
    <div className="min-h-screen bg-background relative z-10">
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="text-primary" />
              Meu Progresso
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 flex flex-col gap-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-3xl"></div>
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BookOpen size={64} />
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Bíblia Completa</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-foreground">{overallPercent}%</span>
                  <span className="text-muted-foreground mb-1 text-sm">concluída</span>
                </div>
                <div className="mt-4 w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-1000" 
                    style={{ width: `${overallPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CheckCircle2 size={64} />
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Capítulos Lidos</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-foreground">{stats.totalChapters}</span>
                  <span className="text-muted-foreground mb-1 text-sm">de {totalBibleChapters}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {stats.totalVerses} versículos marcados individualmente
                </p>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Trophy size={64} />
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Livros Concluídos</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-foreground">{stats.totalBooks}</span>
                  <span className="text-muted-foreground mb-1 text-sm">de 66</span>
                </div>
                <div className="mt-4 flex -space-x-2 overflow-hidden">
                   {stats.completedBooks.slice(0, 5).map(id => (
                     <div key={id} className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center text-[10px] font-bold text-white uppercase">
                       {id.substring(0, 2)}
                     </div>
                   ))}
                   {stats.completedBooks.length > 5 && (
                     <div className="w-8 h-8 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                       +{stats.completedBooks.length - 5}
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* Book Progress List */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold">Progresso por Livro</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame size={16} className="text-orange-500" />
                  <span>Continue firme na leitura!</span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {BIBLE_BOOKS.map(book => {
                  const progress = stats.bookProgress[book.id];
                  if (!progress) return null;
                  
                  return (
                    <div key={book.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 hover:bg-secondary/30 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex flex-col">
                            <h3 className="font-bold text-foreground">{book.name}</h3>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                              {progress.versesRead} versículos lidos
                            </span>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {progress.chaptersRead} / {progress.totalChapters} cap.
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${progress.percent === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${progress.percent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end md:w-24 gap-4">
                        <span className={`text-sm font-bold ${progress.percent === 100 ? 'text-emerald-500' : 'text-foreground'}`}>
                          {progress.percent}%
                        </span>
                        <button 
                          onClick={() => router.push(`/bible/${book.id}/1`)}
                          className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
