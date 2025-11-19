// src/ui/LoginModal.tsx
import React, { useState } from 'react';
import { supabase } from '../utils/supabase';

export function LoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  // パスワード強度チェック
  const checkPasswordStrength = (pwd: string) => {
    if (pwd.length < 6) return 'weak';
    if (pwd.length < 10) return 'medium';
    if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return 'strong';
    return 'medium';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      console.error('[LoginModal] Supabase not configured');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // 新規登録
        console.log('[LoginModal] Signing up...');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        console.log('[LoginModal] Sign up successful:', data);
        alert('✅ アカウント作成完了！\n\nクラウド同期が有効になりました。\n複数デバイスで同じアカウントでログインすると、データが自動的に同期されます。');
        onSuccess();
      } else {
        // ログイン
        console.log('[LoginModal] Logging in...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        console.log('[LoginModal] Login successful:', data);
        onSuccess();
      }
    } catch (err: any) {
      console.error('[LoginModal] Error:', err);
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          maxWidth: 400,
          width: '100%',
          padding: 24,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(0,0,0,0.05)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 18,
            color: '#666',
          }}
          aria-label="閉じる"
        >
          ✕
        </button>
        <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>
          {isSignUp ? 'アカウント作成' : 'ログイン'}
        </h2>
        {isSignUp && (
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#666', lineHeight: 1.5 }}>
            複数デバイス間でデータを同期するためのアカウントを作成します。確認メールは送信されません。
          </p>
        )}
        {!isSignUp && (
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#666' }}>
            登録したメールアドレスとパスワードでログイン
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              パスワード {isSignUp && '（10文字以上、大文字・数字を含むことを推奨）'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (isSignUp) {
                  setPasswordStrength(checkPasswordStrength(e.target.value));
                }
              }}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
              }}
            />
            {isSignUp && passwordStrength && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                強度: 
                <span style={{ 
                  marginLeft: 8,
                  color: passwordStrength === 'weak' ? '#ef4444' : passwordStrength === 'medium' ? '#f59e0b' : '#10b981',
                  fontWeight: 600
                }}>
                  {passwordStrength === 'weak' ? '弱い' : passwordStrength === 'medium' ? '普通' : '強い'}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '処理中...' : (isSignUp ? '登録' : 'ログイン')}
          </button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {isSignUp ? 'すでにアカウントをお持ちの方' : 'アカウントを作成'}
          </button>
        </form>
      </div>
    </div>
  );
}
