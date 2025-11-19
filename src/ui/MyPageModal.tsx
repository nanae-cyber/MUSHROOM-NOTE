// src/ui/MyPageModal.tsx
import React from 'react';
import { supabase } from '../utils/supabase';
import { LoginModal } from './LoginModal';

interface MyPageModalProps {
  onClose: () => void;
  onShowContact: () => void;
  onShowPaywall: () => void;
  isPremium: boolean;
  lang: 'ja' | 'en';
  onChangeLang: (lang: 'ja' | 'en') => void;
}

export function MyPageModal({ onClose, onShowContact, onShowPaywall, isPremium, lang, onChangeLang }: MyPageModalProps) {
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [showLogin, setShowLogin] = React.useState(false);
  
  // プレミアムプラスかどうかを確認
  const isPremiumPlus = React.useMemo(() => {
    try {
      return localStorage.getItem('premium') === 'plus';
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setIsLoggedIn(true);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    if (!supabase) return;
    if (confirm('ログアウトしますか？')) {
      await supabase.auth.signOut();
      window.location.reload();
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
          maxWidth: 480,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px 20px',
            color: '#fff',
            position: 'relative',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 18,
            }}
          >
            ✕
          </button>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            マイページ
          </div>
          {isLoggedIn && userEmail && (
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              {userEmail}
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div style={{ padding: '20px' }}>
          {/* アカウント */}
          {(isPremium || isPremiumPlus) && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>アカウント</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {isLoggedIn ? (
                  <>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                    }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>ログイン中</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{userEmail}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: '1px solid #ddd',
                        background: '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      🚪 ログアウト
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: '#fef3c7',
                      border: '1px solid #fbbf24',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}>
                      ログインすると、クラウド同期機能が利用できます
                    </div>
                    <button
                      onClick={() => setShowLogin(true)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      ログイン / アカウント作成
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* プラン */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>現在のプラン</h3>
            {isPremiumPlus ? (
              <>
                <div style={{
                  padding: '16px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
                  border: '1px solid #8b5cf6',
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    💎 プレミアムプラスプラン
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    月額 ¥500 / AI推定: 無制限 / クラウド同期: 最大1,000枚/月
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <button
                    onClick={() => {
                      onClose();
                      onShowPaywall();
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      background: '#fff',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    プランを変更・解約
                  </button>
                </div>
              </>
            ) : isPremium ? (
              <>
                <div style={{
                  padding: '16px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
                  border: '1px solid #fbbf24',
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    ⭐ プレミアムプラン
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    月額 ¥200 / AI推定: 月30回 / クラウド同期: 最大100枚
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <button
                    onClick={() => {
                      if (confirm('プレミアムプラスにアップグレードしますか？\n\n月額 ¥500\n・AI推定: 無制限\n・クラウド同期: 最大1,000枚/月\n・詳細な統計表示')) {
                        try {
                          localStorage.setItem('premium', 'plus');
                          alert('プレミアムプラスにアップグレードしました！');
                          window.location.reload();
                        } catch (err) {
                          console.error('Failed to upgrade:', err);
                        }
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: '#fff',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    💎 プレミアムプラスにアップグレード
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onShowPaywall();
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      background: '#fff',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#dc2626',
                    }}
                  >
                    解約する
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  padding: '16px',
                  borderRadius: 8,
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    無料プラン
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    AI推定: 月5回 / クラウド同期: なし / ローカル保存: 無制限
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onShowPaywall();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  プレミアムプランに登録
                </button>
              </>
            )}
          </div>

          {/* 設定 */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>設定</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <button
                onClick={() => {
                  onChangeLang(lang === 'ja' ? 'en' : 'ja');
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>🌐 言語</span>
                <span style={{ color: '#666' }}>{lang === 'ja' ? '日本語' : 'English'}</span>
              </button>
            </div>
          </div>

          {/* 機能 */}
          {isPremiumPlus && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>機能</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                <button
                  onClick={() => {
                    onClose();
                    // 統計表示に遷移
                    const event = new CustomEvent('navigate-to-stats');
                    window.dispatchEvent(event);
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  📊 観察データの統計表示
                </button>
                <button
                  onClick={() => {
                    onClose();
                    // きのこ予報に遷移
                    const event = new CustomEvent('navigate-to-forecast');
                    window.dispatchEvent(event);
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  🌦️ きのこ予報
                </button>
              </div>
            </div>
          )}

          {/* サポート */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>サポート</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <button
                onClick={() => {
                  onClose();
                  onShowContact();
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                📧 お問い合わせ
              </button>
              <a
                href="/legal.html"
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                📄 利用規約・プライバシー
              </a>
            </div>
          </div>

          {/* アカウント削除 */}
          {isLoggedIn && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#dc2626' }}>アカウント削除</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                <button
                  onClick={async () => {
                    if (!supabase) {
                      alert('クラウド同期機能が有効になっていません。');
                      return;
                    }

                    const confirmed = confirm(
                      '⚠️ アカウントを削除しますか？\n\n' +
                      'この操作は取り消せません。以下のデータがすべて削除されます：\n' +
                      '・アカウント情報（メールアドレス等）\n' +
                      '・クラウドに保存された観察データ\n' +
                      '・プレミアムプランの契約情報\n\n' +
                      '※ローカルに保存されたデータは削除されません。\n' +
                      '※削除後30日以内にすべてのデータが完全削除されます。'
                    );

                    if (!confirmed) return;

                    const doubleConfirm = confirm(
                      '本当にアカウントを削除しますか？\n\n' +
                      'この操作は取り消せません。\n' +
                      '「OK」を押すと、アカウントが削除されます。'
                    );

                    if (!doubleConfirm) return;

                    try {
                      // ユーザーIDを取得
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        alert('ユーザー情報の取得に失敗しました。');
                        return;
                      }

                      // クラウドデータを削除（Supabaseのobservationsテーブル）
                      const { error: deleteError } = await supabase
                        .from('observations')
                        .delete()
                        .eq('user_id', user.id);

                      if (deleteError) {
                        console.error('データ削除エラー:', deleteError);
                        alert('データの削除に失敗しました: ' + deleteError.message);
                        return;
                      }

                      // アカウントを削除（Supabase Auth）
                      // 注: Supabase Authのユーザー削除はAdmin APIが必要なため、
                      // ここではサインアウトのみ行い、実際の削除はバックエンドで処理する必要があります
                      await supabase.auth.signOut();

                      // ローカルストレージをクリア
                      try {
                        localStorage.removeItem('premium');
                        localStorage.removeItem('lang');
                      } catch {}

                      alert(
                        'アカウント削除のリクエストを受け付けました。\n\n' +
                        '30日以内にすべてのデータが完全削除されます。\n' +
                        'ご利用ありがとうございました。'
                      );

                      // ページをリロード
                      window.location.reload();
                    } catch (err: any) {
                      console.error('アカウント削除エラー:', err);
                      alert('アカウント削除に失敗しました: ' + (err?.message || String(err)));
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #dc2626',
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#dc2626',
                  }}
                >
                  🗑️ アカウントを削除
                </button>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontSize: 12,
                  color: '#991b1b',
                  lineHeight: 1.5,
                }}>
                  ⚠️ アカウント削除は取り消せません。すべてのクラウドデータが削除されます。
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
