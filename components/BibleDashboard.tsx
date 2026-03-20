// components/BibleDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BIBLE_METADATA, getTotalVersesInBook } from '@/lib/bible-metadata';
import { ProgressCircle } from './ProgressCircle';

interface ReadingHistory {
  id: string;
  user_id: string;
  book_id: string;
  chapter: number;
  verse: number;
  created_at: string;
}

export function BibleDashboard({ userId }: { userId: string }) {
  const [history, setHistory] = useState<ReadingHistory[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase.from('reading_history').select('*').eq('user_id', userId);
      setHistory(data || []);
    };
    fetchHistory();
  }, [userId]);

  const getBookProgress = (bookId: string) => {
    const bookReadHistory = history.filter(h => h.book_id === bookId && h.verse !== null);
    const uniqueBookRead = new Set(bookReadHistory.map(h => `${h.chapter}-${h.verse}`));
    const bookReadCount = uniqueBookRead.size;
    const totalVerses = getTotalVersesInBook(bookId);
    return totalVerses > 0 ? Math.round((bookReadCount / totalVerses) * 100) : 0;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Bíblia Sagrada</h1>
      <div className="grid gap-4">
        {Object.keys(BIBLE_METADATA).map(bookId => (
          <div key={bookId} className="flex items-center justify-between p-4 border rounded-xl">
            <span className="capitalize font-medium">{bookId}</span>
            <ProgressCircle percentage={getBookProgress(bookId)} />
          </div>
        ))}
      </div>
    </div>
  );
}
