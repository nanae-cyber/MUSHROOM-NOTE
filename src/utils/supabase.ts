// src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 環境変数から取得（後で設定）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('[Supabase] Initializing...');
console.log('[Supabase] URL exists:', !!supabaseUrl);
console.log('[Supabase] Key exists:', !!supabaseAnonKey);

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (supabase) {
  console.log('[Supabase] Client created successfully');
} else {
  console.log('[Supabase] Client not created - missing URL or Key');
}

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
