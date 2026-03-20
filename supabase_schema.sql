-- Create verse_highlights table
CREATE TABLE IF NOT EXISTS verse_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, book_id, chapter, verse)
);

-- Create reading_history table
CREATE TABLE IF NOT EXISTS reading_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER, -- Optional, if they marked a specific verse as read
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, book_id, chapter, verse)
);

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  photo_url TEXT,
  goals TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create studies table
CREATE TABLE IF NOT EXISTS studies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create study_messages table
CREATE TABLE IF NOT EXISTS study_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID REFERENCES studies(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create verse_of_the_day table
CREATE TABLE IF NOT EXISTS verse_of_the_day (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  reference TEXT NOT NULL,
  text TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Create generated_images table
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies (Row Level Security)
ALTER TABLE verse_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE verse_of_the_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Policies for verse_highlights
DROP POLICY IF EXISTS "Users can view their own highlights" ON verse_highlights;
CREATE POLICY "Users can view their own highlights" ON verse_highlights FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own highlights" ON verse_highlights;
CREATE POLICY "Users can insert their own highlights" ON verse_highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own highlights" ON verse_highlights;
CREATE POLICY "Users can update their own highlights" ON verse_highlights FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own highlights" ON verse_highlights;
CREATE POLICY "Users can delete their own highlights" ON verse_highlights FOR DELETE USING (auth.uid() = user_id);

-- Policies for reading_history
DROP POLICY IF EXISTS "Users can view their own reading history" ON reading_history;
CREATE POLICY "Users can view their own reading history" ON reading_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own reading history" ON reading_history;
CREATE POLICY "Users can insert their own reading history" ON reading_history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own reading history" ON reading_history;
CREATE POLICY "Users can update their own reading history" ON reading_history FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own reading history" ON reading_history;
CREATE POLICY "Users can delete their own reading history" ON reading_history FOR DELETE USING (auth.uid() = user_id);

-- Policies for search_history
DROP POLICY IF EXISTS "Users can view their own search history" ON search_history;
CREATE POLICY "Users can view their own search history" ON search_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own search history" ON search_history;
CREATE POLICY "Users can insert their own search history" ON search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own search history" ON search_history;
CREATE POLICY "Users can delete their own search history" ON search_history FOR DELETE USING (auth.uid() = user_id);

-- Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for studies
DROP POLICY IF EXISTS "Users can view their own studies" ON studies;
CREATE POLICY "Users can view their own studies" ON studies FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own studies" ON studies;
CREATE POLICY "Users can insert their own studies" ON studies FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own studies" ON studies;
CREATE POLICY "Users can update their own studies" ON studies FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own studies" ON studies;
CREATE POLICY "Users can delete their own studies" ON studies FOR DELETE USING (auth.uid() = user_id);

-- Policies for study_messages
DROP POLICY IF EXISTS "Users can view their own study messages" ON study_messages;
CREATE POLICY "Users can view their own study messages" ON study_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM studies WHERE studies.id = study_id AND studies.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert their own study messages" ON study_messages;
CREATE POLICY "Users can insert their own study messages" ON study_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM studies WHERE studies.id = study_id AND studies.user_id = auth.uid())
);

-- Policies for verse_of_the_day
DROP POLICY IF EXISTS "Users can view their own verse of the day" ON verse_of_the_day;
CREATE POLICY "Users can view their own verse of the day" ON verse_of_the_day FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own verse of the day" ON verse_of_the_day;
CREATE POLICY "Users can insert their own verse of the day" ON verse_of_the_day FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for generated_images
DROP POLICY IF EXISTS "Users can view their own generated images" ON generated_images;
CREATE POLICY "Users can view their own generated images" ON generated_images FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own generated images" ON generated_images;
CREATE POLICY "Users can insert their own generated images" ON generated_images FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own generated images" ON generated_images;
CREATE POLICY "Users can delete their own generated images" ON generated_images FOR DELETE USING (auth.uid() = user_id);

-- Storage Policies for 'avatars' bucket
-- Note: You must create the 'avatars' bucket in the Supabase dashboard first.
-- These policies should be run in the SQL Editor.

-- 1. Allow public access to view avatars
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- 2. Allow authenticated users to upload their own avatar
-- CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'avatars' AND 
--   auth.role() = 'authenticated' AND
--   (storage.foldername(name))[1] = 'avatars' -- This depends on your path structure
-- );

-- Simplified Storage Policies (Run these in Supabase SQL Editor)
/*
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);

CREATE POLICY "Avatar Update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);

CREATE POLICY "Avatar Delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);

CREATE POLICY "Avatar View" ON storage.objects FOR SELECT USING (
  bucket_id = 'avatars'
);
*/
