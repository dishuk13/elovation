import { createClient } from '@supabase/supabase-js';

// You'll need to provide your own Supabase URL and anon key
// from your Supabase project settings -> API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 