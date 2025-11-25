// src/utils/supabase.ts
// Supabaseを完全に無効化（オフライン優先アプリのため）

console.log('[Supabase] Disabled - using offline-first mode');

// Supabaseクライアントは無効
export const supabase = null;

// 以下はSupabaseを有効化する場合のコード（現在は無効）
/*
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;
*/

// Supabaseが設定されているかチェック
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

// デバッグ用: windowオブジェクトに公開
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = async () => {
    if (!supabase) {
      console.error('Supabase client is not initialized');
      return { error: 'Not configured' };
    }
    
    try {
      console.log('[Test] Testing Supabase connection...');
      
      // 1. 匿名認証テスト
      console.log('[Test] Testing anonymous auth...');
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        console.error('[Test] Auth error:', authError);
        return { error: 'Auth failed', details: authError };
      }
      console.log('[Test] Auth successful, user ID:', authData.user?.id);
      
      // 2. テーブルアクセステスト
      console.log('[Test] Testing table access...');
      const { data, error } = await supabase
        .from('specimens')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('[Test] Table access error:', error);
        return { error: 'Table access failed', details: error };
      }
      
      console.log('[Test] Table access successful');
      return { success: true, userId: authData.user?.id };
    } catch (err) {
      console.error('[Test] Unexpected error:', err);
      return { error: 'Unexpected error', details: err };
    }
  };
}
