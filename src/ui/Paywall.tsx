import React from "react";
import { PAID_AI_LINK } from "../config";
import { t } from "../i18n";
import { LoginModal } from "./LoginModal";

export function Paywall({ onClose }: { onClose: () => void }) {
  const [showLogin, setShowLogin] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<"monthly" | "annual">("monthly");
  
  // プレミアム会員かどうかを確認
  const premiumStatus = React.useMemo(() => {
    try {
      const status = localStorage.getItem("premium");
      return status; // "true" = プレミアム, "plus" = プレミアムプラス, null = 無料
    } catch {
      return null;
    }
  }, []);
  
  const isPremium = premiumStatus === "true";
  const isPremiumPlus = premiumStatus === "plus";
  
  // デモ用：プレミアムを有効化する関数
  const handleSubscribe = () => {
    try {
      const plan = selectedPlan === "annual" ? "plus" : "true";
      localStorage.setItem("premium", plan);
      const planName = selectedPlan === "annual" ? "プレミアムプラス" : "プレミアム";
      
      // アカウント作成画面に進む
      onClose();
      setShowLogin(true);
    } catch (err) {
      console.error("Failed to set premium:", err);
    }
  };
  
  // 解約処理
  const handleCancel = () => {
    if (confirm("プレミアムプランを解約しますか？\n\n解約すると、AI推定機能とクラウド同期が利用できなくなります。")) {
      try {
        localStorage.removeItem("premium");
        alert("プレミアムプランを解約しました。無料プランに変更されました。");
        window.location.reload();
      } catch (err) {
        console.error("Failed to cancel subscription:", err);
      }
    }
  };
  
  // ダウングレード処理
  const handleDowngrade = () => {
    if (confirm("プレミアムプランにダウングレードしますか？\n\n月額 ¥500 → ¥200\nAI推定が月30回に制限されます。")) {
      try {
        localStorage.setItem("premium", "true");
        alert("プレミアムプランにダウングレードしました。");
        window.location.reload();
      } catch (err) {
        console.error("Failed to downgrade:", err);
      }
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            background: isPremium 
              ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "24px 20px",
            color: "#fff",
            textAlign: "center",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
            }}
            aria-label={t("close")}
          >
            ✕
          </button>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            {isPremium || isPremiumPlus ? "💭" : "⭐"} 
            {isPremiumPlus ? " プレミアムプラス" : isPremium ? " プレミアムプラン" : " プレミアムプラン"}
          </div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            {isPremium || isPremiumPlus ? "プラン管理" : "プレミアム機能"}
          </div>
        </div>

        {/* コンテンツ */}
        <div style={{ padding: "24px 20px" }}>
          {isPremiumPlus ? (
            // プレミアムプラス解約ページ
            <>
              <div style={{ marginBottom: 24, textAlign: "center" }}>
                <div style={{ fontSize: 16, marginBottom: 16, lineHeight: 1.6 }}>
                  プレミアムプラスプランを変更しますか？
                </div>
                <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>
                  現在のプラン: 月額 ¥500（AI推定無制限）
                </div>
              </div>

              <button
                onClick={handleDowngrade}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 12,
                  border: "1px solid #fbbf24",
                  background: "#fff",
                  color: "#f59e0b",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                プレミアムにダウングレード（¥200/月）
              </button>

              <button
                onClick={handleCancel}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#6b7280",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                無料プランに変更
              </button>

              <button
                onClick={onClose}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                プランを継続する
              </button>
            </>
          ) : isPremium ? (
            // プレミアム解約ページ
            <>
              <div style={{ marginBottom: 24, textAlign: "center" }}>
                <div style={{ fontSize: 16, marginBottom: 16, lineHeight: 1.6 }}>
                  プレミアムプランを解約すると、以下の機能が利用できなくなります：
                </div>
                <ul style={{ textAlign: "left", marginBottom: 16, lineHeight: 1.8 }}>
                  <li>AI推定機能</li>
                  <li>クラウド同期</li>
                  <li>複数デバイス間の同期</li>
                </ul>
                <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>
                  現在のプラン: 月額 ¥200
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                  marginBottom: 12,
                }}
              >
                プランを継続する
              </button>

              <button
                onClick={handleCancel}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#6b7280",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                解約する
              </button>
            </>
          ) : (
            // 登録ページ
            <>
              <div style={{ display: "grid", gap: 16, marginBottom: 16 }}>
                {[
                  { icon: "🤖", text: "AI推定機能：月30回まで" },
                  { icon: "☁️", text: "クラウド同期：複数デバイス間でデータを自動同期" },
                  { icon: "📊", text: "詳細な分析：観察データの統計表示" },
                ].map((feature, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      background: "#f9fafb",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{feature.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{feature.text}</div>
                  </div>
                ))}
              </div>
              
              <a
                href="/plans.html"
                target="_blank"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px",
                  marginBottom: 24,
                  color: "#667eea",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                📋 詳しいプラン比較を見る →
              </a>

              {/* プラン選択 */}
              <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
                <div
                  onClick={() => setSelectedPlan("monthly")}
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: selectedPlan === "monthly" ? "2px solid #667eea" : "2px solid #e5e7eb",
                    background: selectedPlan === "monthly" ? "#f0f4ff" : "#fff",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                    ⭐ プレミアム
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#667eea", marginBottom: 4 }}>
                    ¥200
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.7 }}>
                    月額 / AI推定30回
                  </div>
                </div>
                
                <div
                  onClick={() => setSelectedPlan("annual")}
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: selectedPlan === "annual" ? "2px solid #8b5cf6" : "2px solid #e5e7eb",
                    background: selectedPlan === "annual" ? "#faf5ff" : "#fff",
                    textAlign: "center",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <div style={{ 
                    position: "absolute",
                    top: -10,
                    right: 20,
                    background: "#8b5cf6",
                    color: "#fff",
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    おすすめ
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                    💎 プレミアムプラス
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#8b5cf6", marginBottom: 4 }}>
                    ¥500
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.7 }}>
                    月額 / AI推定無制限
                  </div>
                </div>
              </div>

              {/* 登録ボタン */}
              <button
                onClick={handleSubscribe}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                }}
              >
                {t("subscribe_now")}
              </button>
            </>
          )}
        </div>
      </div>
      
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            const planName = selectedPlan === "annual" ? "プレミアムプラス" : "プレミアム";
            alert(`${planName}プランに登録しました！`);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
