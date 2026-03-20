import { supabase } from './supabase';

// Helper to get a persistent device ID for anonymous users or logged in user
const getUserId = async () => {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session.user.id;
    }
  }

  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('biblia_ai_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('biblia_ai_user_id', id);
  }
  return id;
};

export type Highlight = {
  verse: number;
  color: string;
};

export type StudyHistory = {
  id: string;
  title: string;
  date: string;
};

export type Message = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

export async function getHighlights(bookId: string, chapter: number): Promise<Highlight[]> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verse_highlights')
        .select('verse, color')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('chapter', chapter);
        
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase error, falling back to local', e);
    }
  }
  
  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`highlights_${userId}_${bookId}_${chapter}`);
    if (local) return JSON.parse(local);
  }
  return [];
}

export async function saveHighlight(bookId: string, chapter: number, verse: number, color: string) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('verse_highlights')
        .upsert({ 
          user_id: userId, 
          book_id: bookId, 
          chapter, 
          verse, 
          color,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,book_id,chapter,verse' });
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  // Always save to local as fallback/cache
  if (typeof window !== 'undefined') {
    const key = `highlights_${userId}_${bookId}_${chapter}`;
    const existing = localStorage.getItem(key);
    let highlights: Highlight[] = existing ? JSON.parse(existing) : [];
    
    highlights = highlights.filter(h => h.verse !== verse);
    highlights.push({ verse, color });
    localStorage.setItem(key, JSON.stringify(highlights));
  }
}

export async function removeHighlight(bookId: string, chapter: number, verse: number) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('verse_highlights')
        .delete()
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('chapter', chapter)
        .eq('verse', verse);
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    const key = `highlights_${userId}_${bookId}_${chapter}`;
    const existing = localStorage.getItem(key);
    if (existing) {
      let highlights: Highlight[] = JSON.parse(existing);
      highlights = highlights.filter(h => h.verse !== verse);
      localStorage.setItem(key, JSON.stringify(highlights));
    }
  }
}

// Studies & History
export async function getStudies(): Promise<StudyHistory[]> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('studies')
        .select('id, title, date')
        .eq('user_id', userId)
        .order('date', { ascending: false });
        
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('biblia_ai_history');
    if (local) return JSON.parse(local);
  }
  return [];
}

export async function saveStudy(study: StudyHistory) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('studies')
        .upsert({ 
          id: study.id,
          user_id: userId, 
          title: study.title,
          date: study.date,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    const existing = localStorage.getItem('biblia_ai_history');
    let history: StudyHistory[] = existing ? JSON.parse(existing) : [];
    history = history.filter(h => h.id !== study.id);
    history.unshift(study);
    localStorage.setItem('biblia_ai_history', JSON.stringify(history.slice(0, 50)));
  }
}

export async function deleteStudy(id: string) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('studies')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      // Also delete messages
      await supabase
        .from('study_messages')
        .delete()
        .eq('study_id', id);
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    const existing = localStorage.getItem('biblia_ai_history');
    if (existing) {
      let history: StudyHistory[] = JSON.parse(existing);
      history = history.filter(h => h.id !== id);
      localStorage.setItem('biblia_ai_history', JSON.stringify(history));
    }
    localStorage.removeItem(`study_messages_${id}`);
  }
}

export async function updateStudyTitle(id: string, title: string) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('studies')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    const existing = localStorage.getItem('biblia_ai_history');
    if (existing) {
      const history: StudyHistory[] = JSON.parse(existing);
      const idx = history.findIndex(h => h.id === id);
      if (idx >= 0) {
        history[idx].title = title;
        localStorage.setItem('biblia_ai_history', JSON.stringify(history));
      }
    }
  }
}

export async function getStudyMessages(studyId: string): Promise<Message[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('study_messages')
        .select('role, content')
        .eq('study_id', studyId)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        return data.map(m => ({
          role: m.role as 'user' | 'model',
          parts: [{ text: m.content }]
        }));
      }
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`study_messages_${studyId}`);
    if (local) return JSON.parse(local);
  }
  return [];
}

export async function saveStudyMessage(studyId: string, message: Message) {
  if (supabase) {
    try {
      await supabase
        .from('study_messages')
        .insert({ 
          study_id: studyId,
          role: message.role,
          content: message.parts[0].text,
          created_at: new Date().toISOString()
        });
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    const key = `study_messages_${studyId}`;
    const existing = localStorage.getItem(key);
    const messages: Message[] = existing ? JSON.parse(existing) : [];
    messages.push(message);
    localStorage.setItem(key, JSON.stringify(messages));
  }
}

// --- New Phase 1 Tables ---

export async function saveReadingHistory(bookId: string, chapter: number, verse?: number, isCompleted: boolean = false) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('reading_history')
        .upsert({ 
          user_id: userId, 
          book_id: bookId, 
          chapter, 
          verse,
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,book_id,chapter,verse' });
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
}

export async function removeReadingHistory(bookId: string, chapter: number, verse: number) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('reading_history')
        .delete()
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('chapter', chapter)
        .eq('verse', verse);
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
}

export async function getReadingHistory() {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
        
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  return [];
}

export async function saveSearchHistory(query: string) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('search_history')
        .insert({ 
          user_id: userId, 
          query,
          created_at: new Date().toISOString()
        });
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
}

export async function getSearchHistory() {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('query, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  return [];
}

export async function saveGeneratedImage(bookId: string, chapter: number, verse: number, imageUrl: string, prompt?: string) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('generated_images')
        .insert({ 
          user_id: userId, 
          book_id: bookId, 
          chapter, 
          verse,
          image_url: imageUrl,
          prompt,
          created_at: new Date().toISOString()
        });
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
}

export async function getAllHighlights(): Promise<(Highlight & { book_id: string; chapter: number })[]> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verse_highlights')
        .select('book_id, chapter, verse, color')
        .eq('user_id', userId);
        
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  // Fallback to localStorage (this is more complex as they are stored by book/chapter)
  if (typeof window !== 'undefined') {
    const allHighlights: (Highlight & { book_id: string; chapter: number })[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`highlights_${userId}_`)) {
        const parts = key.split('_');
        const bookId = parts[2];
        const chapter = parseInt(parts[3]);
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        data.forEach((h: Highlight) => {
          allHighlights.push({ ...h, book_id: bookId, chapter });
        });
      }
    }
    return allHighlights;
  }
  return [];
}

export async function getVerseReadHistory(bookId: string, chapter: number): Promise<number[]> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('reading_history')
        .select('verse')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('chapter', chapter)
        .not('verse', 'is', null);
        
      if (!error && data) {
        const uniqueVerses = Array.from(new Set(data.map(d => d.verse)));
        return uniqueVerses;
      }
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  return [];
}

export async function markChapterCompleted(bookId: string, chapter: number, verses: number[]) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      // Mark the chapter as completed (verse null)
      const rows = [
        { 
          user_id: userId, 
          book_id: bookId, 
          chapter, 
          verse: null,
          is_completed: true,
          updated_at: new Date().toISOString()
        },
        // And mark all verses as read
        ...verses.map(v => ({
          user_id: userId,
          book_id: bookId,
          chapter,
          verse: v,
          is_completed: true,
          updated_at: new Date().toISOString()
        }))
      ];

      await supabase
        .from('reading_history')
        .upsert(rows, { onConflict: 'user_id,book_id,chapter,verse' });
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
}

export async function getGeneratedImages(bookId: string, chapter: number, verse: number) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('chapter', chapter)
        .eq('verse', verse)
        .order('created_at', { ascending: false });
        
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  return [];
}

// Goals
export async function getGoals(): Promise<string> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select('goals')
        .eq('user_id', userId)
        .single();
        
      if (!error && data) return data.goals;
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    return localStorage.getItem('biblia_ai_goals') || '';
  }
  return '';
}

export async function saveGoals(goals: string) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('user_goals')
        .upsert({ 
          user_id: userId, 
          goals,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('biblia_ai_goals', goals);
  }
}
