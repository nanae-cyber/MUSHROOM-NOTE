import React, { useEffect, useState } from "react";
import { db } from "../utils/db";
import { identifyMushroom } from "../utils/ai";
import { t } from "../i18n";

type Props = { id: string; onClose: () => void };
type Cand = { name: string; confidence: number; rationale?: string };

export default function AIPredictModal({ id, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cands, setCands] = useState<Cand[]>([]);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let revoked = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // ✅ DBから “生のBlob” を安全に取得
        const row = await db.getRaw(id);
        if (!row) throw new Error("not found");

        // 表示用URLを保持（閉じるときだけ revoke）
        setThumbUrl(row.photoUrl ?? "");

        const blob: Blob = (row as any).photoBlob;
        if (!(blob instanceof Blob)) throw new Error("invalid image");

        // ✅ 本物 or モックで推定
        const res = await identifyMushroom(blob);
        setCands(res);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      // ✅ revoke は“URL 経由で作った blob: のときだけ”
      if (thumbUrl && thumbUrl.startsWith("blob:") && !revoked) {
        try {
          URL.revokeObjectURL(thumbUrl);
        } catch {}
        revoked = true;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          color: "var(--fg)",
          borderRadius: 12,
          width: "min(560px,96vw)",
          maxHeight: "calc(100vh - 80px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: 16,
            alignItems: "center",
            borderBottom: "1px solid var(--card-border)",
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0 }}>{t("ai_prediction")}</h3>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn-outline" onClick={onClose}>
              {t("close")}
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 16,
            overflowY: "auto",
            flex: 1,
          }}
        >
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt=""
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 8,
                marginBottom: 12,
              }}
            />
          )}
          {loading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              gap: 20,
            }}>
              {/* アニメーション付きローディングスピナー */}
              <div style={{
                width: 60,
                height: 60,
                border: '4px solid #f3f4f6',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              
              {/* ローディングテキスト */}
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#667eea',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                🤖 AI判定中...
              </div>
              
              <div style={{
                fontSize: 13,
                color: '#666',
                textAlign: 'center',
                lineHeight: 1.6,
              }}>
                画像を解析しています<br />
                しばらくお待ちください
              </div>
              
              {/* CSSアニメーション */}
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>
          )}
          {err && <div style={{ color: "#ff8080" }}>エラー: {err}</div>}
          {!loading && !err && (
            <div style={{ display: "grid", gap: 12 }}>
              {cands.map((c, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--card-border)",
                    borderRadius: 10,
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "#f9fafb",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
                    >
                      {i + 1}. {c.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {t("confidence")}: {(c.confidence * 100).toFixed(0)}%
                      {c.rationale ? ` — ${c.rationale}` : ""}
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    disabled={running || !cands.length}
                    onClick={async () => {
                      setRunning(true);
                      try {
                        await (
                          await import("../utils/db")
                        ).db.update(id, {
                          meta: {
                            ...((
                              await (await import("../utils/db")).db.getRaw(id)
                            )?.meta ?? {}),
                            detail: {
                              ...((
                                await (
                                  await import("../utils/db")
                                ).db.getRaw(id)
                              )?.meta?.detail ?? {}),
                              mushroomName: c.name,
                            },
                          },
                        });
                        alert(`「${c.name}」${t("saved_to_mushroom_name")}`);
                        onClose();
                        location.reload();
                      } catch (e: any) {
                        alert(
                          `${t("save_failed")}: ` + (e?.message ?? String(e))
                        );
                      } finally {
                        setRunning(false);
                      }
                    }}
                    aria-label={t("save_this_candidate")}
                    title={t("save_as_mushroom_name")}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#3b82f6",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  </button>
                </div>
              ))}
              {!cands.length && <div>{t("no_candidates")}</div>}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--card-border)",
            }}
          >
            <button
              className="icon-btn"
              onClick={async () => {
                try {
                  const top = cands[0];
                  if (!top) return alert(t("no_candidates"));
                  await (
                    await import("../utils/db")
                  ).db.update(id, {
                    meta: {
                      ...((
                        await (await import("../utils/db")).db.getRaw(id)
                      )?.meta ?? {}),
                      ai: {
                        model: import.meta.env.VITE_GEMINI_API_KEY
                          ? "gemini-2.5-flash"
                          : "mock",
                        at: Date.now(),
                        candidates: cands,
                      },
                    },
                  });
                  alert(t("ai_results_saved"));
                  onClose();
                  location.reload();
                } catch (e: any) {
                  alert(`${t("save_failed")}: ` + (e?.message ?? String(e)));
                }
              }}
              aria-label={t("save_all_results")}
              title={t("save_all_results")}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#10b981",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#059669" }}>
              {t("save_all_results")}
            </div>
          </div>
          {!import.meta.env.VITE_GEMINI_API_KEY && (
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
              {t("ai_mock_notice")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
