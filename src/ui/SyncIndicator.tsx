// src/ui/SyncIndicator.tsx
import React, { useEffect, useState } from 'react';
import { getSyncStatus, getLastSyncTime, onSyncStatusChange, setSyncEnabled, isSyncEnabled } from '../utils/sync';
import { isSupabaseConfigured, supabase } from '../utils/supabase';
import { LoginModal } from './LoginModal';

export function SyncIndicator() {
  const [status, setStatus] = useState(getSyncStatus());
  const [lastSync, setLastSync] = useState(getLastSyncTime());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [enabled, setEnabled] = useState(isSyncEnabled());
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // ログイン状態を確認
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[SyncIndicator] Current session:', session);
      
      // 匿名ユーザーの場合はログアウト
      if (session?.user?.is_anonymous) {
        console.log('[SyncIndicator] Anonymous user detected, logging out...');
        await supabase.auth.signOut();
        setIsLoggedIn(false);
        return;
      }
      
      // メールアドレスがある場合のみログイン状態とする
      const hasEmail = !!session?.user?.email;
      console.log('[SyncIndicator] Has email:', hasEmail, 'Email:', session?.user?.email);
      setIsLoggedIn(hasEmail);
    };
    checkAuth();
  }, []);
  
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'success') {
        setLastSync(getLastSyncTime());
      }
    });
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Supabaseが設定されていない場合は表示しない
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  // プレミアムプラン限定
  const isPremium = (() => {
    try {
      return localStorage.getItem('premium') === 'true';
    } catch {
      return false;
    }
  })();
  
  if (!isPremium) {
    return null;
  }
  
  const toggleSync = () => {
    console.log('[SyncIndicator] Toggle clicked, isLoggedIn:', isLoggedIn);
    
    // ログインしていない場合はログインモーダルを表示
    if (!isLoggedIn) {
      console.log('[SyncIndicator] Showing login modal');
      setShowLogin(true);
      return;
    }
    
    const newEnabled = !enabled;
    console.log('[SyncIndicator] Toggling sync:', newEnabled);
    setEnabled(newEnabled);
    setSyncEnabled(newEnabled);
  };
  
  const formatLastSync = () => {
    if (!lastSync) return '';
    const now = Date.now();
    const diff = now - lastSync;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '今';
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    return `${Math.floor(hours / 24)}日前`;
  };
  
  const getStatusText = () => {
    if (!isLoggedIn) return 'ログインして同期';
    if (!enabled) return 'クラウド同期: OFF';
    if (!isOnline) return 'オフライン';
    switch (status) {
      case 'syncing': return '同期中...';
      case 'success': return '同期完了';
      case 'error': return '同期エラー';
      default: return 'クラウド同期: ON';
    }
  };
  
  const getIcon = () => {
    if (!isLoggedIn) return null; // ログインボタンはアイコンなし
    if (!enabled) return '☁️';
    if (!isOnline) return '📡';
    switch (status) {
      case 'syncing': return '🔄';
      case 'success': return '✅';
      case 'error': return '⚠️';
      default: return '☁️';
    }
  };
  
  const handleLogout = async () => {
    if (!supabase) return;
    if (confirm('ログアウトしますか？\n\nローカルのデータは保持されますが、クラウド同期は停止します。')) {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setEnabled(false);
      setSyncEnabled(false);
      window.location.reload();
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={toggleSync}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--card-border)',
            background: enabled && isLoggedIn
              ? (status === 'error' ? '#fee' : 'rgba(34, 197, 94, 0.1)')
              : 'rgba(156, 163, 175, 0.1)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          title={!isLoggedIn
            ? 'クリックしてログイン'
            : enabled 
              ? `クラウド同期: ON ${lastSync ? `(最終: ${formatLastSync()})` : ''}\nクリックでOFF`
              : 'クラウド同期: OFF\nクリックでON'
          }
        >
          {getIcon() && (
            <span style={{ 
              animation: status === 'syncing' && enabled ? 'spin 1s linear infinite' : 'none',
              display: 'inline-block',
            }}>
              {getIcon()}
            </span>
          )}
          <span style={{ fontWeight: 500 }}>
            {!isLoggedIn ? 'ログイン' : getStatusText()}
          </span>
          {enabled && isLoggedIn && lastSync > 0 && status !== 'syncing' && (
            <span style={{ opacity: 0.6, fontSize: 11 }}>
              ({formatLastSync()})
            </span>
          )}
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </button>
        
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--card-border)',
              background: 'rgba(239, 68, 68, 0.1)',
              fontSize: 12,
              cursor: 'pointer',
              color: '#dc2626',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
            title="ログアウト"
          >
            ログアウト
          </button>
        )}
      </div>
      
      {showLogin && (
        <LoginModal
          onClose={() => {
            console.log('[SyncIndicator] Login modal closed');
            setShowLogin(false);
          }}
          onSuccess={() => {
            console.log('[SyncIndicator] Login successful');
            setShowLogin(false);
            setIsLoggedIn(true);
            setEnabled(true);
            setSyncEnabled(true);
            // ログイン後すぐに同期を開始
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }}
        />
      )}
    </>
  );
}
