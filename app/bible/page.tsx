'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  ChevronRight,
  Hash
} from 'lucide-react';
import { BIBLE_BOOKS } from '@/lib/bible-data';
import { ThemeToggle } from '@/components/theme-toggle';
import { supabase } from '@/lib/supabase';
import { BIBLE_METADATA, getTotalVersesInBook } from '@/lib/bible-metadata';
import Link from 'next/link';

export default function BiblePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'VT' | 'NT'>('VT');
  const [bookProgress, setBookProgress] = useState<Record<string, number>>({});
  const [showGoToVerse, setShowGoToVerse] = useState(false);
  const [goToRef, setGoToRef] = useState('');

  useEffect(() => {
    // Load progress from Supabase
    const checkAuthAndLoadProgress = async () => {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch read verses
      const { data: history, error: historyError } = await supabase
        .from('reading_history')
        .select('book_id, chapter, verse')
        .eq('user_id', session.user.id);

      if (historyError) {
        console.error('Error fetching history:', historyError);
        return;
      }

      if (history) {
        // Optimize: Pre-calculate unique read verses once
        const uniqueRead = new Set();
        const bookMap: Record<string, number> = {};
        const bookReadCounts: Record<string, Set<string>> = {};

        history.forEach(h => {
          if (h.verse !== null) {
            const key = `${h.book_id}-${h.chapter}-${h.verse}`;
            
            // Validate verse exists in metadata
            const maxVerses = BIBLE_METADATA[h.book_id]?.[h.chapter - 1] || 0;
            if (h.verse > 0 && h.verse <= maxVerses) {
              uniqueRead.add(key);
              
              if (!bookReadCounts[h.book_id]) {
                bookReadCounts[h.book_id] = new Set();
              }
              bookReadCounts[h.book_id].add(`${h.chapter}-${h.verse}`);
            }
          }
        });

        // Calculate per-book progress efficiently
        BIBLE_BOOKS.forEach(book => {
          const bookReadCount = bookReadCounts[book.id]?.size || 0;
          const bookTotalVerses = getTotalVersesInBook(book.id);
          bookMap[book.id] = bookTotalVerses > 0 ? Math.min(100, Math.round((bookReadCount / bookTotalVerses) * 100)) : 0;
        });
        setBookProgress(bookMap);
      }
    };

    checkAuthAndLoadProgress();
  }, [router]);

  const handleGoToVerse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goToRef) return;
    
    // Simple parser: "Joao 3:16" or "Joao 3"
    const parts = goToRef.trim().split(' ');
    if (parts.length < 2) return;
    
    const bookName = parts.slice(0, parts.length - 1).join(' ');
    const ref = parts[parts.length - 1];
    const [chapter, verse] = ref.split(':');
    
    const book = BIBLE_BOOKS.find(b => 
      b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
      bookName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );
    
    if (book) {
      router.push(`/bible/${book.id}/${chapter}${verse ? `?v=${verse}` : ''}`);
    }
  };

  const filteredBooks = BIBLE_BOOKS.filter(b => 
    b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .includes(searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );

  const displayedBooks = filteredBooks.filter(b => b.testament === activeTab);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-4">
        <div className="flex-none">
          <Link 
            href="/" 
            className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:bg-secondary transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
        </div>
        <h1 className="text-xl font-bold flex-1">Bíblia</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowGoToVerse(!showGoToVerse)}
            className={`p-2 rounded-full transition-colors ${showGoToVerse ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
          >
            <Hash size={20} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-20">
        {showGoToVerse && (
          <form onSubmit={handleGoToVerse} className="mb-6 animate-in fade-in slide-in-from-top-4">
            <div className="relative">
              <input
                type="text"
                value={goToRef}
                onChange={(e) => setGoToRef(e.target.value)}
                placeholder="Ex: João 3:16 ou Romanos 12"
                className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 pr-12 font-bold focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                autoFocus
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 px-2 uppercase font-bold tracking-wider">Ir para versículo</p>
          </form>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Pesquisar livros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/30 border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('VT')}
            className={`flex-1 py-2 rounded-full text-sm font-normal transition-all border ${
              activeTab === 'VT' ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-transparent text-muted-foreground border-white/10 hover:bg-secondary'
            }`}
          >
            Velho Testamento
          </button>
          <button
            onClick={() => setActiveTab('NT')}
            className={`flex-1 py-2 rounded-full text-sm font-normal transition-all border ${
              activeTab === 'NT' ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-transparent text-muted-foreground border-white/10 hover:bg-secondary'
            }`}
          >
            Novo Testamento
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {displayedBooks.map((book) => (
            <button
              key={book.id}
              onClick={() => router.push(`/bible/${book.id}`)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:bg-secondary/30 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                {book.id.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{book.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: `${bookProgress[book.id] || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">{bookProgress[book.id] || 0}%</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
