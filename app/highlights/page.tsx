'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, Trash2, ExternalLink, BookMarked } from 'lucide-react';
import { getAllHighlights, removeHighlight, fetchAndCacheChapter } from '@/lib/db';
import { BIBLE_BOOKS } from '@/lib/bible-data';
import { ThemeToggle } from '@/components/theme-toggle';

const HIGHLIGHT_COLORS = [
  { value: '#fef08a', label: 'Amarelo' },
  { value: '#bbf7d0', label: 'Verde' },
  { value: '#bfdbfe', label: 'Azul' },
  { value: '#fbcfe8', label: 'Rosa' }
];

type Highlight = {
  book_id: string;
  chapter: number;
  verse: number;
  color: string;
  text?: string;
};

export default function HighlightsPage() {
  const router = useRouter();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [verseTexts, setVerseTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    getAllHighlights().then(data => {
      if (isMounted) {
        setHighlights(data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (highlights.length === 0) return;

    const fetchTexts = async () => {
      const newTexts = { ...verseTexts };
      const chaptersToFetch = new Set<string>();

      highlights.forEach(h => {
        const key = `${h.book_id}-${h.chapter}-${h.verse}`;
        if (!newTexts[key]) {
          chaptersToFetch.add(`${h.book_id}-${h.chapter}`);
        }
      });

      if (chaptersToFetch.size === 0) return;

      for (const chapterKey of Array.from(chaptersToFetch)) {
        const [bookId, chapter] = chapterKey.split('-');
        const bookName = BIBLE_BOOKS.find(b => b.id === bookId)?.name || bookId;
        try {
          const data = await fetchAndCacheChapter(bookId, bookName, parseInt(chapter));
          data.verses.forEach((v: { verse: number; text: string; book_id: string; book_name: string; chapter: number }) => {
            newTexts[`${bookId}-${chapter}-${v.verse}`] = v.text;
          });
        } catch (e) {
          console.error(`Failed to fetch text for ${chapterKey}`, e);
        }
      }
      setVerseTexts(newTexts);
    };

    fetchTexts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights]);

  const handleDelete = async (h: Highlight) => {
    await removeHighlight(h.book_id, h.chapter, h.verse);
    setHighlights(prev => prev.filter(item => 
      !(item.book_id === h.book_id && item.chapter === h.chapter && item.verse === h.verse)
    ));
  };

  const filteredHighlights = filterColor 
    ? highlights.filter(h => h.color === filterColor)
    : highlights;

  const getBookName = (id: string) => {
    return BIBLE_BOOKS.find(b => b.id === id)?.name || id;
  };

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
              <BookMarked className="text-primary" />
              Meus Destaques
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8 bg-card p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mr-2">
            <Filter size={18} />
            <span className="text-sm font-medium">Filtrar por cor:</span>
          </div>
          <button
            onClick={() => setFilterColor(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterColor === null 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            Todos
          </button>
          {HIGHLIGHT_COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => setFilterColor(color.value)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                filterColor === color.value 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-transparent bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color.value }}></div>
              {color.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : filteredHighlights.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
            <BookMarked size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground">Nenhum destaque encontrado com este filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHighlights.map((h, idx) => (
              <div 
                key={`${h.book_id}-${h.chapter}-${h.verse}-${idx}`}
                className="group bg-card border border-border rounded-2xl p-5 hover:shadow-xl transition-all relative overflow-hidden"
              >
                <div 
                  className="absolute top-0 left-0 w-1.5 h-full" 
                  style={{ backgroundColor: h.color }}
                ></div>
                
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-primary">
                    {getBookName(h.book_id)} {h.chapter}:{h.verse}
                  </h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => router.push(`/bible/${h.book_id}/${h.chapter}#v${h.verse}`)}
                      className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-primary transition-colors"
                      title="Ver na Bíblia"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(h)}
                      className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover destaque"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <p className="font-serif text-lg leading-relaxed text-foreground line-clamp-3 italic">
                  {verseTexts[`${h.book_id}-${h.chapter}-${h.verse}`] 
                    ? `"${verseTexts[`${h.book_id}-${h.chapter}-${h.verse}`]}"`
                    : '"Carregando texto..."'}
                </p>
                
                <div className="mt-4 flex justify-end">
                   <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                     Destaque {HIGHLIGHT_COLORS.find(c => c.value === h.color)?.label}
                   </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
