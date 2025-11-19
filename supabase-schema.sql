-- Supabaseで実行するSQL
-- きのこ観察データを保存するテーブル

-- specimens テーブル作成
CREATE TABLE IF NOT EXISTS specimens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  photo_base64 TEXT NOT NULL,
  extra_photos_base64 JSONB DEFAULT '[]'::jsonb,
  view TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じユーザーの同じlocal_idは1つだけ
  UNIQUE(user_id, local_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_specimens_user_id ON specimens(user_id);
CREATE INDEX IF NOT EXISTS idx_specimens_created_at ON specimens(created_at);
CREATE INDEX IF NOT EXISTS idx_specimens_updated_at ON specimens(updated_at);

-- Row Level Security (RLS) 有効化
ALTER TABLE specimens ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分のデータのみ読み書き可能
CREATE POLICY "Users can read own specimens"
  ON specimens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own specimens"
  ON specimens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own specimens"
  ON specimens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own specimens"
  ON specimens FOR DELETE
  USING (auth.uid() = user_id);

-- メール認証を有効にする設定
-- Supabaseダッシュボード > Authentication > Providers > Email を有効化してください
-- 確認メールを無効にする場合: Authentication > Settings > Enable email confirmations をOFFにする
