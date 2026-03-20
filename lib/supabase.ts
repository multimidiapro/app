import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dpceyubrwftpxuddlzmc.supabase.co';
const supabaseAnonKey = 'sb_publishable_6cGgGCtWJbwfFRoIf41zHg_90O9iCum';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
