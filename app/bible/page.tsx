'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, BookOpen } from 'lucide-react';
import { BIBLE_BOOKS } from '@/lib/bible-data';
import { ThemeToggle } from '@/components/theme-toggle';
import { supabase } from '@/lib/supabase';
import { ProgressCircle } from '@/components/ProgressCircle';
import { BIBLE_METADATA, getTotalVersesInBook } from '@/lib/bible-metadata';

export default function BiblePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'VT' | 'NT'>('VT');
  const [progress, setProgress] = useState({ totalRead: 0, totalVerses: 0 });
  const [bookProgress, setBookProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndLoadProgress = async () => {
      if (!supabase) {
        console.error('Supabase client not initialized');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Calculate total verses in Bible
      const totalVerses = Object.values(BIBLE_METADATA).reduce((acc, book) => acc + book.reduce((a, b) => a + b, 0), 0);

      // Fetch read verses
      const { data: history } = await supabase
        .from('reading_history')
        .select('book_id, chapter, verse')
        .eq('user_id', session.user.id);

      if (history) {
        // Use a Set to ensure we only count unique verses (book-chapter-verse)
        const uniqueRead = new Set(history.filter(h => h.verse !== null).map(h => `${h.book_id}-${h.chapter}-${h.verse}`));
        
        // FILTER: Only count verses that exist in our metadata to avoid overcounting
        const validRead = Array.from(uniqueRead).filter(key => {
          const [bookId, chapter, verse] = key.split('-');
          const c = parseInt(chapter);
          const v = parseInt(verse);
          const maxVerses = BIBLE_METADATA[bookId]?.[c - 1] || 0;
          return v > 0 && v <= maxVerses;
        });
        
        const readCount = validRead.length;
        setProgress({ totalRead: readCount, totalVerses });

        // Calculate per-book progress
        const bookMap: Record<string, number> = {};
        BIBLE_BOOKS.forEach(book => {
          const bookReadHistory = history.filter(h => h.book_id === book.id && h.verse !== null);
          const uniqueBookRead = new Set(bookReadHistory.map(h => `${h.chapter}-${h.verse}`));
          
          // Filter valid verses for this book
          const validBookRead = Array.from(uniqueBookRead).filter(key => {
            const [chapter, verse] = key.split('-');
            const c = parseInt(chapter);
            const v = parseInt(verse);
            const maxVerses = BIBLE_METADATA[book.id]?.[c - 1] || 0;
            return v > 0 && v <= maxVerses;
          });
          
          const bookReadCount = validBookRead.length;
          const bookTotalVerses = getTotalVersesInBook(book.id);
          bookMap[book.id] = bookTotalVerses > 0 ? Math.min(100, Math.round((bookReadCount / bookTotalVerses) * 100)) : 0;
        });
        setBookProgress(bookMap);
      }
      
      setLoading(false);
    };

    checkAuthAndLoadProgress();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  const percentage = progress.totalVerses > 0 ? Math.min(100, Math.round((progress.totalRead / progress.totalVerses) * 100)) : 0;
  
  const filteredBooks = BIBLE_BOOKS.filter(b => 
    b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .includes(searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );

  const displayedBooks = filteredBooks.filter(b => b.testament === activeTab);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse query like "João 3" or "1 João 3:16"
    const match = searchQuery.match(/^(\d?\s?[a-zA-ZÀ-ÿ]+)\s+(\d+)(?::(\d+))?/);
    if (match) {
      const bookName = match[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const chapter = match[2];
      
      const book = BIBLE_BOOKS.find((b) => 
        b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === bookName ||
        b.id.replace(/\s+/g, '') === bookName.replace(/\s+/g, '')
      );
      
      if (book) {
        // If verse is provided, we could pass it as a query param, but for now just go to chapter
        router.push(`/bible/${book.id}/${chapter}${match[3] ? `#v${match[3]}` : ''}`);
        return;
      }
    }
    
    // If it's just a book name and there's exactly one match, go to book page
    if (filteredBooks.length === 1) {
      router.push(`/bible/${filteredBooks[0].id}`);
    }
  };

  const renderBooks = (books: typeof BIBLE_BOOKS) => {
    if (books.length === 0) return null;
    
    return (
      <section className="mb-12 animate-in fade-in duration-300">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => router.push(`/bible/${book.id}`)}
              className="flex flex-col items-center justify-center p-4 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-md hover:shadow-primary/10 transition-all text-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="mb-3 relative z-10">
                <ProgressCircle percentage={bookProgress[book.id] || 0} size={48} />
              </div>
              <span className="font-medium text-foreground group-hover:text-primary transition-colors relative z-10">{book.name}</span>
              <span className="text-xs text-muted-foreground mt-1 relative z-10">{book.chapters} cap.</span>
            </button>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-4 md:py-8 flex flex-col gap-4 md:gap-8 relative z-10">
      <header className="flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => router.push('/')}
              className="p-2 hover:bg-secondary rounded-full transition-colors bg-card shadow-sm border border-border"
            >
              <ArrowLeft size={20} className="text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="font-outfit text-xl md:text-2xl font-bold text-foreground">Bíblia Sagrada</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BookOpen size={16} />
              <span>{percentage}% lido</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
        
        {/* Mobile progress bar */}
        <div className="md:hidden flex items-center gap-2 text-sm font-medium text-muted-foreground bg-card p-3 rounded-xl border border-border">
          <BookOpen size={16} />
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${percentage}%` }}></div>
          </div>
          <span>{percentage}%</span>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar livro ou ir direto (ex: João 3)"
            className="w-full pl-12 pr-4 py-3 md:py-4 bg-card border border-border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base md:text-lg transition-all text-foreground placeholder:text-muted-foreground"
          />
        </form>
      </header>

      <main className="flex-1">
        <div className="flex bg-secondary p-1 rounded-xl w-full max-w-md mx-auto mb-8">
          <button
            onClick={() => setActiveTab('VT')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'VT' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Antigo Testamento
          </button>
          <button
            onClick={() => setActiveTab('NT')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'NT' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Novo Testamento
          </button>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum livro encontrado para &quot;{searchQuery}&quot;
          </div>
        ) : (
          renderBooks(displayedBooks)
        )}
      </main>
    </div>
  );
}
