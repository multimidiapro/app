import { supabase } from './supabase';

// Helper to get a persistent device ID for anonymous users or logged in user
let cachedUserId: string | null = null;

const getUserId = async () => {
  if (cachedUserId) return cachedUserId;

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      cachedUserId = session.user.id;
      return cachedUserId;
    }
  }

  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('biblia_ai_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('biblia_ai_user_id', id);
  }
  cachedUserId = id;
  return id;
};

export type Highlight = {
  verse: number;
  color: string;
  text?: string;
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

export async function copyStudy(title: string, messages: Message[]) {
  const newId = crypto.randomUUID();
  const study: StudyHistory = {
    id: newId,
    title,
    date: new Date().toISOString()
  };
  
  await saveStudy(study);
  
  for (const msg of messages) {
    await saveStudyMessage(newId, msg);
  }
  
  return newId;
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

export type ReadingHistory = {
  book_id: string;
  chapter: number;
  verse?: number | null;
  is_completed?: boolean;
  updated_at?: string;
};

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

  // Local storage fallback
  if (typeof window !== 'undefined') {
    const key = `reading_history_${userId}`;
    const existing = localStorage.getItem(key);
    let history: ReadingHistory[] = existing ? JSON.parse(existing) : [];
    
    // Remove existing entry if any
    history = history.filter(h => 
      !(h.book_id === bookId && h.chapter === chapter && h.verse === verse)
    );
    
    history.push({
      book_id: bookId,
      chapter,
      verse,
      is_completed: isCompleted,
      updated_at: new Date().toISOString()
    });
    
    localStorage.setItem(key, JSON.stringify(history));
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

  if (typeof window !== 'undefined') {
    const key = `reading_history_${userId}`;
    const existing = localStorage.getItem(key);
    if (existing) {
      let history: ReadingHistory[] = JSON.parse(existing);
      history = history.filter(h => 
        !(h.book_id === bookId && h.chapter === chapter && h.verse === verse)
      );
      localStorage.setItem(key, JSON.stringify(history));
    }
  }
}

export async function getReadingHistory(): Promise<ReadingHistory[]> {
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

  if (typeof window !== 'undefined') {
    const key = `reading_history_${userId}`;
    const local = localStorage.getItem(key);
    if (local) return JSON.parse(local);
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

export async function getHistorySummary(): Promise<string> {
  const studies = await getStudies();
  if (studies.length === 0) return 'Nenhum estudo anterior.';
  
  const recentTitles = studies.slice(0, 5).map(s => s.title).join(', ');
  return `O usuário já estudou sobre: ${recentTitles}.`;
}

export async function saveGeneratedImage(bookId: string, chapter: number, verse: number, imageUrl: string, prompt?: string) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .insert({ 
          user_id: userId, 
          book_id: bookId, 
          chapter, 
          verse,
          image_url: imageUrl,
          prompt,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (!error && data) return data.id;
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  return null;
}

export async function getGeneratedImageById(id: string) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('id', id)
        .single();
        
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  return null;
}

export async function getAllHighlights(): Promise<(Highlight & { book_id: string; chapter: number })[]> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verse_highlights')
        .select('book_id, chapter, verse, color')
        .eq('user_id', userId);
        
      if (!error && data) {
        const highlights = data as (Highlight & { book_id: string; chapter: number })[];
        // Try to populate text from cache
        for (const h of highlights) {
          const cached = await getChapterCache(h.book_id, h.chapter) as { verses: { verse: number; text: string }[] } | null;
          if (cached && cached.verses) {
            const verse = cached.verses.find((v: { verse: number; text: string }) => v.verse === h.verse);
            if (verse) h.text = verse.text;
          }
        }
        return highlights;
      }
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
    
    // Try to populate text from cache for all highlights
    for (const h of allHighlights) {
      const cached = await getChapterCache(h.book_id, h.chapter) as { verses: { verse: number; text: string }[] } | null;
      if (cached && cached.verses) {
        const verse = cached.verses.find((v: { verse: number; text: string }) => v.verse === h.verse);
        if (verse) h.text = verse.text;
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

  if (typeof window !== 'undefined') {
    const key = `reading_history_${userId}`;
    const local = localStorage.getItem(key);
    if (local) {
      const history: ReadingHistory[] = JSON.parse(local);
      const chapterRead = history
        .filter(h => h.book_id === bookId && h.chapter === chapter && h.verse !== null && h.verse !== undefined)
        .map(h => h.verse as number);
      return Array.from(new Set(chapterRead));
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

  if (typeof window !== 'undefined') {
    const key = `reading_history_${userId}`;
    const existing = localStorage.getItem(key);
    let history: ReadingHistory[] = existing ? JSON.parse(existing) : [];
    
    // Remove existing for this chapter
    history = history.filter(h => !(h.book_id === bookId && h.chapter === chapter));
    
    // Add chapter completion
    history.push({
      book_id: bookId,
      chapter,
      verse: null,
      is_completed: true,
      updated_at: new Date().toISOString()
    });
    
    // Add all verses
    verses.forEach(v => {
      history.push({
        book_id: bookId,
        chapter,
        verse: v,
        is_completed: true,
        updated_at: new Date().toISOString()
      });
    });
    
    localStorage.setItem(key, JSON.stringify(history));
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

export type Profile = {
  id: string;
  display_name: string;
  photo_url: string | null;
  goals: string;
  is_contributor?: boolean;
  is_admin?: boolean;
};

export async function getProfile(): Promise<Profile | null> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (data) return data;
      
      // If not found or error, try to create a default profile if logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && session.user.id === userId) {
        // Get goals from localStorage directly to avoid recursion
        const localGoals = typeof window !== 'undefined' ? localStorage.getItem('biblia_ai_goals') || '' : '';
        
        const defaultProfile = {
          id: userId,
          display_name: session.user.user_metadata?.full_name || '',
          photo_url: session.user.user_metadata?.avatar_url || null,
          goals: localGoals,
          is_contributor: false
        };
        // Use a background update to not block
        updateProfile(defaultProfile).catch(console.error);
        return defaultProfile;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase getProfile error:', error);
      }
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    return {
      id: userId,
      display_name: localStorage.getItem('biblia_ai_name') || '',
      photo_url: localStorage.getItem('biblia_ai_photo') || null,
      goals: localStorage.getItem('biblia_ai_goals') || '',
      is_contributor: localStorage.getItem('biblia_ai_is_contributor') === 'true'
    };
  }
  return null;
}

export async function updateProfile(profile: Partial<Profile>) {
  const userId = await getUserId();
  console.log('updateProfile called for userId:', userId, 'with profile:', profile);
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId, 
          ...profile,
          updated_at: new Date().toISOString()
        });
      if (error) {
        console.error('Supabase updateProfile error:', error);
      } else {
        console.log('Supabase updateProfile success:', data);
      }
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    if (profile.display_name !== undefined) localStorage.setItem('biblia_ai_name', profile.display_name);
    if (profile.photo_url !== undefined) localStorage.setItem('biblia_ai_photo', profile.photo_url || '');
    if (profile.goals !== undefined) localStorage.setItem('biblia_ai_goals', profile.goals);
    if (profile.is_contributor !== undefined) localStorage.setItem('biblia_ai_is_contributor', String(profile.is_contributor));
  }
}

export async function uploadProfileImage(file: File): Promise<string | null> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (e) {
      console.error('Upload error', e);
    }
  }
  return null;
}

export async function getGoals(): Promise<string> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('goals')
        .eq('id', userId)
        .maybeSingle();
        
      if (data) return data.goals;
    } catch (e) {
      console.error('Supabase error getting goals', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    return localStorage.getItem('biblia_ai_goals') || '';
  }
  return '';
}

export async function saveGoals(goals: string) {
  await updateProfile({ goals });
}

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'update' | 'event' | 'admin' | 'info';
  date: string;
  is_read?: boolean;
  link?: string;
};

export async function getNotifications(): Promise<AppNotification[]> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('date', { ascending: false });
        
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase error getting notifications', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('biblia_ai_notifications') || '[]');
  }
  return [];
}

export async function markNotificationAsRead(id: string) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId);
    } catch (e) {
      console.error('Supabase error marking notification as read', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    const notifications = JSON.parse(localStorage.getItem('biblia_ai_notifications') || '[]');
    const updated = notifications.map((n: AppNotification) => 
      n.id === id ? { ...n, is_read: true } : n
    );
    localStorage.setItem('biblia_ai_notifications', JSON.stringify(updated));
  }
}

export async function sendNotification(notification: Omit<AppNotification, 'id' | 'date' | 'is_read'>, targetUserId?: string) {
  if (supabase) {
    try {
      await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: targetUserId || null,
          date: new Date().toISOString(),
          is_read: false
        });
    } catch (e) {
      console.error('Supabase error sending notification', e);
    }
  }
}

export type BackgroundTemplate = {
  id: string;
  url: string;
  name: string;
};

export async function getBackgroundTemplates(): Promise<BackgroundTemplate[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('background_templates')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase error getting templates', e);
    }
  }
  
  // Fallback templates
  return [
    { id: '1', url: 'https://picsum.photos/seed/bible1/1080/1080', name: 'Natureza 1' },
    { id: '2', url: 'https://picsum.photos/seed/bible2/1080/1080', name: 'Natureza 2' },
    { id: '3', url: 'https://picsum.photos/seed/bible3/1080/1080', name: 'Montanha' },
    { id: '4', url: 'https://picsum.photos/seed/bible4/1080/1080', name: 'Mar' },
  ];
}

export async function checkAppUpdate(): Promise<{ hasUpdate: boolean; version?: string }> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const localVersion = localStorage.getItem('biblia_ai_app_version');
      if (localVersion && localVersion !== data.version) {
        return { hasUpdate: true, version: data.version };
      }
      localStorage.setItem('biblia_ai_app_version', data.version);
    }
  } catch (e) {
    console.error('Error checking for update', e);
  }
  return { hasUpdate: false };
}

export async function getChapterCache(bookId: string, chapter: number): Promise<unknown | null> {
  if (typeof window === 'undefined') return null;
  const key = `bible_cache_${bookId}_${chapter}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      // Cache for 7 days
      if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
        return data;
      }
      localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  }
  return null;
}

export async function saveChapterCache(bookId: string, chapter: number, data: unknown) {
  if (typeof window === 'undefined') return;
  const key = `bible_cache_${bookId}_${chapter}`;
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // If quota exceeded, clear some old cache
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('bible_cache_')) {
          localStorage.removeItem(k);
          break;
        }
      }
    }
  }
}

export async function getVerseOfTheDayForDate(date: string): Promise<{ reference: string; text: string; explanation: string } | null> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data } = await supabase
        .from('verse_of_the_day')
        .select('reference, text, explanation')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();
        
      if (data) return data;
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`biblia_ai_verse_${userId}_${date}`);
    if (local) return JSON.parse(local);
  }
  return null;
}

export async function saveVerseOfTheDayForDate(date: string, verse: { reference: string; text: string; explanation: string }) {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      await supabase
        .from('verse_of_the_day')
        .upsert({ 
          user_id: userId, 
          date, 
          reference: verse.reference, 
          text: verse.text, 
          explanation: verse.explanation,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id,date' });
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(`biblia_ai_verse_${userId}_${date}`, JSON.stringify(verse));
    
    // Also track which dates have verses in a separate list for easy lookup
    const historyKey = `biblia_ai_verse_history_${userId}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    if (!history.includes(date)) {
      history.push(date);
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  }
}

export async function getVerseHistory(): Promise<string[]> {
  const userId = await getUserId();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verse_of_the_day')
        .select('date')
        .eq('user_id', userId);
        
      if (!error && data) return data.map(d => d.date);
    } catch (e) {
      console.error('Supabase error', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(`biblia_ai_verse_history_${userId}`) || '[]');
  }
  return [];
}

export async function fetchAndCacheChapter(bookId: string, bookName: string, chapter: number): Promise<{ reference: string; verses: { book_id: string; book_name: string; chapter: number; verse: number; text: string }[]; text: string }> {
  // Check cache first
  const cached = await getChapterCache(bookId, chapter);
  if (cached) return cached as { reference: string; verses: { book_id: string; book_name: string; chapter: number; verse: number; text: string }[]; text: string };

  const url = `https://bible-api.com/${encodeURIComponent(`${bookName} ${chapter}`)}?translation=almeida`;
  let res = await fetch(url);
  
  if (!res.ok) {
    // Try English ID as fallback
    const fallbackUrl = `https://bible-api.com/${encodeURIComponent(`${bookId} ${chapter}`)}?translation=almeida`;
    res = await fetch(fallbackUrl);
  }

  if (!res.ok) {
    // Try without translation parameter as last resort
    const lastResortUrl = `https://bible-api.com/${encodeURIComponent(`${bookId} ${chapter}`)}`;
    res = await fetch(lastResortUrl);
  }

  if (res.ok) {
    const json = await res.json();
    await saveChapterCache(bookId, chapter, json);
    return json;
  }
  
  throw new Error('Falha ao carregar o capítulo');
}
