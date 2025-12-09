import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const configured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));
  if (!configured) {
    console.log('[Supabase] Not configured - URL:', !!supabaseUrl, 'Key:', !!supabaseAnonKey);
  }
  return configured;
};

