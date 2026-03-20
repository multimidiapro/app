// components/VerseCheckbox.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function VerseCheckbox({ userId, bookId, chapter, verse, isRead }: { userId: string, bookId: string, chapter: number, verse: number, isRead: boolean }) {
  const [read, setRead] = useState(isRead);

  const toggleRead = async () => {
    const newReadStatus = !read;
    setRead(newReadStatus);

    if (newReadStatus) {
      await supabase.from('reading_history').insert({
        user_id: userId,
        book_id: bookId,
        chapter,
        verse
      });
    } else {
      await supabase.from('reading_history')
        .delete()
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('chapter', chapter)
        .eq('verse', verse);
    }
  };

  return (
    <input 
      type="checkbox" 
      checked={read} 
      onChange={toggleRead}
      className="w-5 h-5 rounded border-border accent-primary cursor-pointer"
    />
  );
}
