'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, X, MessageSquare, Eraser, BookOpen, CheckCircle2, CheckCircle } from 'lucide-react';
import { BIBLE_BOOKS } from '@/lib/bible-data';
import { generateVerseExplanation, generateBibleText } from '@/lib/ai';
import { ThemeToggle } from '@/components/theme-toggle';
import { formatBibleText } from '@/lib/bible-utils';
import { getHighlights, saveHighlight, removeHighlight, saveStudy, saveReadingHistory, getVerseReadHistory, markChapterCompleted, removeReadingHistory } from '@/lib/db';
import { ShareVerse } from '@/components/ShareVerse';

type Verse = {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
};

type ChapterData = {
  reference: string;
  verses: Verse[];
  text: string;
};

const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8'];

type Explanation = {
  explanation: string;
  relatedVerses?: {
    reference: string;
    text: string;
    reason: string;
  }[];
};

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = decodeURIComponent(params.book as string);
  const chapterNum = parseInt(params.chapter as string);

  const [data, setData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [highlights, setHighlights] = useState<Record<number, string>>({});
  const [readVerses, setReadVerses] = useState<number[]>([]);
  const [chapterCompleted, setChapterCompleted] = useState(false);
  const [showStudyPanel, setShowStudyPanel] = useState(false);
  
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const bookInfo = BIBLE_BOOKS.find((b: { id: string; name: string }) => 
    b.id === bookId || 
    b.id.replace(/\s+/g, '') === bookId.replace(/\s+/g, '')
  );

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Try Portuguese name first with encoding
        if (!bookInfo) throw new Error('Livro não encontrado');
        
        const url = `https://bible-api.com/${encodeURIComponent(`${bookInfo.name} ${chapterNum}`)}?translation=almeida`;
        let res = await fetch(url);
        
        if (!res.ok) {
          // Try English ID as fallback
          const fallbackUrl = `https://bible-api.com/${encodeURIComponent(`${bookInfo.id} ${chapterNum}`)}?translation=almeida`;
          res = await fetch(fallbackUrl);
        }

        if (!res.ok) {
          // Try without translation parameter as last resort (might return KJV or default)
          const lastResortUrl = `https://bible-api.com/${encodeURIComponent(`${bookInfo.id} ${chapterNum}`)}`;
          res = await fetch(lastResortUrl);
        }

        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          // AI Fallback as last resort
          console.log('API failed, falling back to AI for text');
          const aiText = await generateBibleText(`${bookInfo.name} ${chapterNum}`);
          if (aiText && aiText.verses && aiText.verses.length > 0) {
            setData(aiText);
          } else {
            throw new Error('Falha ao carregar o capítulo via API e AI');
          }
        }
      } catch (err) {
        console.error('Error fetching chapter:', err);
        setError('Não foi possível carregar o capítulo. Verifique se o livro e capítulo existem ou tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    if (bookInfo) {
      fetchChapter();
    }
  }, [bookId, chapterNum, bookInfo]);

  // Load highlights and reading history
  useEffect(() => {
    if (bookId && chapterNum) {
      getHighlights(bookId, chapterNum).then(data => {
        const hlMap: Record<number, string> = {};
        data.forEach(h => { hlMap[h.verse] = h.color; });
        setHighlights(hlMap);
      });

      getVerseReadHistory(bookId, chapterNum).then(data => {
        setReadVerses(data);
      });

      // Silent tracking: save that user accessed this chapter
      saveReadingHistory(bookId, chapterNum);
    }
  }, [bookId, chapterNum]);

  // Scroll to hash
  useEffect(() => {
    if (data && window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('animate-highlight-pulse');
          setTimeout(() => el.classList.remove('animate-highlight-pulse'), 3000);
        }
      }, 500);
    }
  }, [data]);

  const handleVerseClick = (verseNum: number) => {
    setSelectedVerses(prev => 
      prev.includes(verseNum) ? prev.filter(v => v !== verseNum) : [...prev, verseNum]
    );
  };

  const toggleReadStatus = async () => {
    const newRead = [...readVerses];
    for (const v of selectedVerses) {
      if (newRead.includes(v)) {
        // Unmark as read
        const idx = newRead.indexOf(v);
        if (idx > -1) newRead.splice(idx, 1);
        await removeReadingHistory(bookId, chapterNum, v);
      } else {
        newRead.push(v);
        await saveReadingHistory(bookId, chapterNum, v, true);
      }
    }
    setReadVerses(newRead);
    setSelectedVerses([]);
  };

  const handleCompleteChapter = async () => {
    if (!data) return;
    const allVerses = data.verses.map(v => v.verse);
    await markChapterCompleted(bookId, chapterNum, allVerses);
    setChapterCompleted(true);
    // Also mark all verses as read locally for UI consistency
    setReadVerses(allVerses);
  };

  const applyHighlight = async (color: string | null) => {
    const newHighlights = { ...highlights };
    for (const v of selectedVerses) {
      if (color) {
        newHighlights[v] = color;
        await saveHighlight(bookId, chapterNum, v, color);
      } else {
        delete newHighlights[v];
        await removeHighlight(bookId, chapterNum, v);
      }
    }
    setHighlights(newHighlights);
    setSelectedVerses([]);
  };

  const handleGenerateStudy = async () => {
    if (selectedVerses.length === 0 || loadingExplanation) return;
    setLoadingExplanation(true);
    setShowStudyPanel(true);
    
    const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
    const versesText = sortedVerses.map(v => data?.verses.find(x => x.verse === v)?.text).join(' ');
    const reference = `${bookInfo?.name} ${chapterNum}:${sortedVerses.join(',')}`;
    
    try {
      const exp = await generateVerseExplanation(reference, versesText);
      setExplanation(exp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleDeepStudy = async () => {
    if (selectedVerses.length === 0) return;
    const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
    const reference = `${bookInfo?.name} ${chapterNum}:${sortedVerses.join(',')}`;
    const query = `Gostaria de estudar mais sobre ${reference}`;
    
    const id = crypto.randomUUID();
    const newStudy = {
      id,
      title: `Estudo: ${reference}`,
      date: new Date().toISOString()
    };
    
    await saveStudy(newStudy);
    
    router.push(`/study/${id}?q=${encodeURIComponent(query)}`);
  };

  if (!bookInfo) return <div className="p-8 text-center">Livro não encontrado.</div>;

  const sortedSelectedVerses = [...selectedVerses].sort((a, b) => a - b);
  const selectedReference = `${bookInfo.name} ${chapterNum}:${sortedSelectedVerses.join(',')}`;
  const selectedText = sortedSelectedVerses.map(v => data?.verses.find(x => x.verse === v)?.text).join(' ');

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative z-10">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showStudyPanel ? 'md:mr-[400px]' : ''}`}>
        <header className="flex items-center justify-between p-3 md:p-4 bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-10">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => router.push('/bible')}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-muted-foreground" />
            </button>
            <h1 className="font-serif text-lg md:text-xl font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
              {bookInfo.name} {chapterNum}
            </h1>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5 md:p-1">
              <button
                onClick={() => chapterNum > 1 && router.push(`/bible/${bookId}/${chapterNum - 1}`)}
                disabled={chapterNum <= 1}
                className="p-1.5 md:p-2 hover:bg-background rounded-full disabled:opacity-30 transition-colors text-foreground"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs md:text-sm font-medium text-muted-foreground w-10 md:w-16 text-center">
                {chapterNum}/{bookInfo.chapters}
              </span>
              <button
                onClick={() => chapterNum < bookInfo.chapters && router.push(`/bible/${bookId}/${chapterNum + 1}`)}
                disabled={chapterNum >= bookInfo.chapters}
                className="p-1.5 md:p-2 hover:bg-background rounded-full disabled:opacity-30 transition-colors text-foreground"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-12 max-w-3xl mx-auto w-full pb-32">
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-6 bg-muted rounded w-full"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-destructive text-center p-8 bg-destructive/10 rounded-2xl">{error}</div>
          ) : (
            <>
              <div className="font-serif text-xl leading-loose text-foreground">
                {data?.verses.map((verse) => {
                  const isSelected = selectedVerses.includes(verse.verse);
                  const isRead = readVerses.includes(verse.verse);
                  const highlightColor = highlights[verse.verse];
                  
                  return (
                    <div key={verse.verse} className="flex gap-3 items-start group mb-2">
                      <div className="pt-2">
                        <input 
                          type="checkbox" 
                          checked={isRead} 
                          onChange={async () => {
                            if (isRead) {
                              await removeReadingHistory(bookId, chapterNum, verse.verse);
                              setReadVerses(prev => prev.filter(v => v !== verse.verse));
                            } else {
                              await saveReadingHistory(bookId, chapterNum, verse.verse, true);
                              setReadVerses(prev => [...prev, verse.verse]);
                            }
                          }}
                          className="w-5 h-5 rounded border-border accent-primary cursor-pointer opacity-40 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <span 
                        id={`v${verse.verse}`}
                        onClick={() => handleVerseClick(verse.verse)}
                        className={`cursor-pointer transition-all duration-200 rounded px-1 py-0.5 relative flex-1 ${
                          isSelected ? 'ring-2 ring-primary bg-primary/20' : 'hover:bg-secondary'
                        } ${isRead ? 'opacity-70' : ''}`}
                        style={!isSelected && highlightColor ? { backgroundColor: highlightColor, color: '#0f172a' } : {}}
                      >
                        <sup className="text-xs font-sans font-bold text-muted-foreground mr-1">
                          {isRead && <CheckCircle2 size={10} className="inline mr-0.5 text-emerald-500" />}
                          {verse.verse}
                        </sup>
                        {verse.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {!loading && !error && data && (
                <div className="mt-12 pt-8 border-t border-border flex flex-col items-center gap-6">
                  <button
                    onClick={handleCompleteChapter}
                    disabled={chapterCompleted}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 ${
                      chapterCompleted 
                        ? 'bg-emerald-500/20 text-emerald-500 cursor-default' 
                        : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90'
                    }`}
                  >
                    {chapterCompleted ? (
                      <><CheckCircle size={24} /> Capítulo Concluído</>
                    ) : (
                      <><BookOpen size={24} /> Marcar Capítulo como Concluído</>
                    )}
                  </button>
                  
                  <div className="flex items-center gap-4 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span>{readVerses.length} de {data.verses.length} versículos lidos</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Toolbar for Selection */}
      {selectedVerses.length > 0 && !showStudyPanel && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-2xl rounded-2xl md:rounded-full px-4 md:px-6 py-3 flex flex-col md:flex-row items-center gap-3 md:gap-4 z-40 animate-in slide-in-from-bottom-10 w-[90%] md:w-auto">
          <div className="flex items-center gap-3 md:border-r md:border-border md:pr-4 w-full md:w-auto justify-center">
            {HIGHLIGHT_COLORS.map(color => (
              <button 
                key={color} 
                className="w-8 h-8 md:w-6 md:h-6 rounded-full border border-black/10 hover:scale-110 transition-transform shadow-sm" 
                style={{ backgroundColor: color }} 
                onClick={() => applyHighlight(color)} 
                aria-label={`Destacar com cor`}
              />
            ))}
            <button 
              onClick={toggleReadStatus}
              className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-secondary text-emerald-500 transition-colors"
              title="Marcar como lido"
            >
              <CheckCircle2 size={18} />
            </button>
            <button 
              onClick={() => applyHighlight(null)}
              className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground transition-colors"
              aria-label="Remover destaque"
            >
              <Eraser size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto mt-2 md:mt-0">
            <ShareVerse 
              text={selectedText} 
              reference={selectedReference} 
              className="flex-1 md:flex-none justify-center py-2 md:py-0 text-primary hover:text-primary/80"
            />
            <button 
              onClick={handleGenerateStudy} 
              className="flex-1 md:flex-none flex items-center justify-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors py-2 md:py-0 border-l border-border md:border-none"
            >
              <BookOpen size={18}/> Estudar {selectedVerses.length} {selectedVerses.length === 1 ? 'versículo' : 'versículos'}
            </button>
          </div>
        </div>
      )}

      {/* Side Panel for Verse Explanation */}
      {showStudyPanel && (
        <aside className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-card shadow-2xl border-l border-border flex flex-col z-50 transform transition-transform duration-300">
          <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen size={18} />
              <h2 className="font-semibold text-sm uppercase tracking-wider">Luz sobre a Palavra</h2>
            </div>
            <button 
              onClick={() => { setShowStudyPanel(false); setSelectedVerses([]); }}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <div className="bg-secondary p-5 rounded-2xl border border-border">
              <p className="font-bold text-primary mb-2">
                {selectedReference}
              </p>
              <p className="font-serif text-lg leading-relaxed text-foreground">
                &quot;{selectedText}&quot;
              </p>
            </div>

            {loadingExplanation ? (
              <div className="flex flex-col gap-4 animate-pulse mt-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
                <div className="h-4 bg-muted rounded w-full mt-4"></div>
              </div>
            ) : explanation ? (
              <div className="flex flex-col gap-8 animate-in fade-in duration-500">
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Explicação</h3>
                  <p className="text-foreground leading-relaxed">
                    {formatBibleText(explanation.explanation)}
                  </p>
                </div>

                {explanation.relatedVerses && explanation.relatedVerses.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Textos Relacionados</h3>
                    <div className="flex flex-col gap-4">
                      {explanation.relatedVerses.map((rel: { reference: string; text: string; reason: string }, idx: number) => (
                        <div key={idx} className="border-l-2 border-primary pl-4 py-1">
                          <p className="font-bold text-sm text-foreground">{formatBibleText(rel.reference)}</p>
                          <p className="font-serif text-foreground my-1">&quot;{rel.text}&quot;</p>
                          <p className="text-sm text-muted-foreground">{formatBibleText(rel.reason)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <footer className="p-4 border-t border-border bg-card">
            <button
              onClick={handleDeepStudy}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
            >
              <MessageSquare size={18} />
              Aprofundar em Estudo
            </button>
          </footer>
        </aside>
      )}
    </div>
  );
}
