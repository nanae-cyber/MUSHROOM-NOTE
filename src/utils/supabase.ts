// src/utils/supabase.ts
// Supabaseを完全に無効化（オフライン優先アプリのため）

console.log('[Supabase] Disabled - using offline-first mode');

// Supabaseクライアントは無効（型定義のみ）
export const supabase: null = null;

// Supabaseが設定されているかチェック
export const isSupabaseConfigured = () => {
  return false; // 常にfalse
};
