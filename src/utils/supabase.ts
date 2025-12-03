// src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] Initializing...');
console.log('[Supabase] URL configured:', !!supabaseUrl);
console.log('[Supabase] Key configured:', !!supabaseAnonKey);

// Supabaseクライアントの初期化
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Supabaseが設定されているかチェック
export const isSupabaseConfigured = () => {
  const configured = !!(supabaseUrl && supabaseAnonKey && supabase);
  console.log('[Supabase] Configuration check:', configured);
  return configured;
};

if (supabase) {
  console.log('[Supabase] Client initialized successfully');
} else {
  console.warn('[Supabase] Client not initialized - cloud sync disabled');
}
