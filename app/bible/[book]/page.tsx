'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, CheckCircle } from 'lucide-react';
import { BIBLE_BOOKS } from '@/lib/bible-data';
import { ThemeToggle } from '@/components/theme-toggle';
import { supabase } from '@/lib/supabase';
import { BIBLE_METADATA } from '@/lib/bible-metadata';

export default function BookSelectionPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = decodeURIComponent(params.book as string);
  const bookInfo = BIBLE_BOOKS.find(b => 
    b.id === bookId || 
    b.id.replace(/\s+/g, '') === bookId.replace(/\s+/g, '')
  );

  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [versesCount, setVersesCount] = useState<number | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [chapterProgress, setChapterProgress] = useState<Record<number, number>>({});
  const [readVersesByChapter, setReadVersesByChapter] = useState<Record<number, number[]>>({});

  useEffect(() => {
    const loadChapterProgress = async () => {
      if (!supabase || !bookInfo) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: history } = await supabase
        .from('reading_history')
        .select('chapter, verse')
        .eq('user_id', session.user.id)
        .eq('book_id', bookInfo.id);

      if (history) {
        const progressMap: Record<number, number> = {};
        const readMap: Record<number, number[]> = {};
        const bookMeta = BIBLE_METADATA[bookInfo.id];
        
        if (bookMeta) {
          bookMeta.forEach((totalVerses, idx) => {
            const chapterNum = idx + 1;
            const chapterRead = history.filter(h => h.chapter === chapterNum).map(h => h.verse);
            readMap[chapterNum] = chapterRead;
            progressMap[chapterNum] = Math.round((chapterRead.length / totalVerses) * 100);
          });
        }
        setChapterProgress(progressMap);
        setReadVersesByChapter(readMap);
      }
    };

    loadChapterProgress();
  }, [bookInfo]);

  if (!bookInfo) return <div className="p-8 text-center">Livro não encontrado.</div>;

  const handleChapterSelect = async (chapter: number) => {
    setSelectedChapter(chapter);
    setLoadingVerses(true);
    try {
      // Try Portuguese name first with encoding
      const url = `https://bible-api.com/${encodeURIComponent(`${bookInfo.name} ${chapter}`)}?translation=almeida`;
      let res = await fetch(url);
      
      if (!res.ok) {
        // Try English ID as fallback
        const fallbackUrl = `https://bible-api.com/${encodeURIComponent(`${bookInfo.id} ${chapter}`)}?translation=almeida`;
        res = await fetch(fallbackUrl);
      }

      if (res.ok) {
        const data = await res.json();
        setVersesCount(data.verses.length);
      } else {
        // fallback if fetch fails
        router.push(`/bible/${bookId}/${chapter}`);
      }
    } catch {
      router.push(`/bible/${bookId}/${chapter}`);
    } finally {
      setLoadingVerses(false);
    }
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-4 md:py-8 flex flex-col gap-4 md:gap-8 relative z-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => selectedChapter ? setSelectedChapter(null) : router.push('/bible')}
            className="p-2 hover:bg-secondary rounded-full transition-colors bg-card shadow-sm border border-border"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-[0_0_10px_rgba(14,165,233,0.5)] hidden sm:flex">
              <BookOpen size={16} />
            </div>
            <h1 className="font-serif text-lg md:text-2xl font-semibold text-foreground truncate max-w-[150px] sm:max-w-none">
              {bookInfo.name} {selectedChapter ? ` - Cap. ${selectedChapter}` : ''}
            </h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 bg-card border border-border rounded-2xl md:rounded-3xl p-4 md:p-10 shadow-sm">
        {!selectedChapter ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-base md:text-lg font-medium text-muted-foreground mb-4 md:mb-6 text-center">Selecione um capítulo</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
              {Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map(chapter => (
                <button
                  key={chapter}
                  onClick={() => handleChapterSelect(chapter)}
                  className="aspect-square flex flex-col items-center justify-center rounded-xl bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors font-medium text-foreground relative overflow-hidden group"
                >
                  <span className="text-base md:text-lg relative z-10">{chapter}</span>
                  {chapterProgress[chapter] > 0 && (
                    <span className="text-[10px] text-muted-foreground group-hover:text-primary-foreground/80 relative z-10">
                      {chapterProgress[chapter]}%
                    </span>
                  )}
                  {chapterProgress[chapter] > 0 && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-primary group-hover:bg-primary-foreground/30 transition-all" 
                      style={{ width: `${chapterProgress[chapter]}%` }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
              <h2 className="text-base md:text-lg font-medium text-muted-foreground">Selecione um versículo</h2>
              <button
                onClick={() => router.push(`/bible/${bookId}/${selectedChapter}`)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ler capítulo completo
              </button>
            </div>

            {loadingVerses ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando versículos...</p>
              </div>
            ) : versesCount ? (
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
                {Array.from({ length: versesCount }, (_, i) => i + 1).map(verse => {
                  const isRead = readVersesByChapter[selectedChapter!]?.includes(verse);
                  return (
                    <button
                      key={verse}
                      onClick={() => router.push(`/bible/${bookId}/${selectedChapter}#v${verse}`)}
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all font-medium text-base md:text-lg relative overflow-hidden group ${
                        isRead 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200 hover:bg-emerald-500/20' 
                          : 'bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground'
                      }`}
                    >
                      <span>{verse}</span>
                      {isRead && <CheckCircle size={10} className="absolute top-1 right-1" />}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
