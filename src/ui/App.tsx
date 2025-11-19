// src/ui/App.tsx
import React, { Suspense, useEffect, useState } from "react";
import { t, getLang, setLang, type Lang } from "../i18n";

// ★ default export のコンポーネント
import CameraCapture from "./CameraCapture";

// ★ named export のコンポーネント（もし default なら下のコメント行に変えて）
import { DetailForm } from "./DetailForm"; // ← default の場合:  import DetailForm from "./DetailForm";
import { Paywall } from "./Paywall"; // ← default の場合:  import Paywall from "./Paywall";
import { ContactForm } from "./ContactForm";
import { ZukanView } from "./ZukanView";
import { SearchView } from "./SearchView";
import { SyncIndicator } from "./SyncIndicator";
import { MyPageModal } from "./MyPageModal";
import { StatsView } from "./StatsView";
import { MushroomForecast } from "./MushroomForecast";

// デバッグ用: db を window に公開（あとで消してOK）
import { db, type Row } from "../utils/db";
import { startAutoSync } from "../utils/sync";
if (typeof window !== "undefined") (window as any).db = db;

// 最低限のエラーバウンダリ（ランタイムエラーで真っ黒防止）
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; msg?: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, msg: String(err) };
  }
  componentDidCatch(err: any, info: any) {
    console.error("Render error:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h3>エラーが発生しました</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.msg}</pre>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default function App() {
  const [view, setView] = useState<"camera" | "zukan" | "calendar" | "map" | "stats" | "forecast">("zukan");
  const [lang, _setLang] = useState(getLang());
  const [showPay, setShowPay] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [captureMode, setCaptureMode] = useState<"camera" | "album" | null>(null);
  
  // 有料プラン判定（仮実装：localStorageで管理）
  const [isPremium, setIsPremium] = useState(() => {
    try {
      const plan = localStorage.getItem("premium");
      return plan === "true" || plan === "plus";
    } catch {
      return false;
    }
  });
  
  // プレミアムプラス判定
  const isPremiumPlus = React.useMemo(() => {
    try {
      return localStorage.getItem("premium") === "plus";
    } catch {
      return false;
    }
  }, []);

  const changeLang = (l: "en" | "ja") => {
    setLang(l);
    _setLang(l);
  };

  // 自動同期の開始
  useEffect(() => {
    const cleanup = startAutoSync(5); // 5分ごとに同期
    return cleanup;
  }, []);

  // 統計表示への遷移イベントを処理
  useEffect(() => {
    const handleNavigateToStats = () => {
      setView('stats');
    };
    const handleNavigateToForecast = () => {
      setView('forecast');
    };
    window.addEventListener('navigate-to-stats', handleNavigateToStats);
    window.addEventListener('navigate-to-forecast', handleNavigateToForecast);
    return () => {
      window.removeEventListener('navigate-to-stats', handleNavigateToStats);
      window.removeEventListener('navigate-to-forecast', handleNavigateToForecast);
    };
  }, []);

  console.log("[App] mounted, lang=", lang);

  return (
    <ErrorBoundary>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <header
          className="site-header glass sticky top-0"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            padding: "0 16px",
          }}
        >
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              try {
                (window as any).scrollTo({ top: 0, behavior: "smooth" });
              } catch {}
            }}
            style={{ textDecoration: "none", flex: 1 }}
            aria-label="トップへ戻る"
          >
            <h2
              className="display title-text"
              style={{
                margin: 0,
                fontSize: 34,
                letterSpacing: 0.2,
                color: "var(--muted)",
              }}
            >
              MUSHROOM NOTE
            </h2>
          </a>
          
          {/* マイページボタン（デスクトップ・モバイル共通） */}
          <button
            onClick={() => {
              console.log('[MyPage] Button clicked');
              setShowMyPage(true);
            }}
            className="mypage-button"
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--card-border)",
              background: "rgba(255, 255, 255, 0.8)",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.8,
              transition: "opacity 0.2s ease",
              minWidth: 36,
              height: 36,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.8"}
            onTouchStart={(e) => e.currentTarget.style.opacity = "1"}
            onTouchEnd={(e) => e.currentTarget.style.opacity = "0.8"}
            aria-label="マイページ"
          >
            ⚙️
          </button>
        </header>
        
        <style>{`
          @media (max-width: 639px) {
            .title-text {
              font-size: 28px !important;
            }
            .mypage-button {
              min-width: 28px !important;
              height: 28px !important;
              padding: 4px 6px !important;
              font-size: 14px !important;
            }
          }
        `}</style>

        {/* ランダム写真表示 */}
        <RandomPhotos onPhotoClick={(id) => {
          setView("zukan");
          // ZukanViewに遷移後、該当の記録を開く処理は後で実装
        }} />

        {/* メインカメラボタン */}
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <button
            className="btn"
            onClick={() => {
              console.log('[Camera] Button clicked');
              setCaptureMode("camera");
              setView("camera");
            }}
            style={{
              maxWidth: "400px",
              width: "100%",
              padding: "18px 32px",
              fontSize: "18px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 8h4l2-3h4l2 3h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
              <circle cx="12" cy="14" r="3.5" />
            </svg>
            <span>{t("take_photo")}</span>
          </button>
          <button
            className="btn-outline"
            onClick={() => {
              console.log('[Album] Button clicked');
              setCaptureMode("album");
              setView("camera");
            }}
            style={{
              maxWidth: "400px",
              width: "100%",
              padding: "14px 32px",
              fontSize: "16px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              borderRadius: 12,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span>{t("select_from_album")}</span>
          </button>
        </div>

        {/* サブナビゲーション */}
        <nav className="icon-menu" aria-label="main shortcuts" style={{ marginBottom: 16 }}>
          <button
            className={`icon-btn ${view === "zukan" ? "active" : ""}`}
            aria-label={t("encyclopedia")}
            onClick={() => setView("zukan")}
          >
            <span className="icon" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 4h10a3.5 3.5 0 0 1 3.5 3.5V20h-10A3.5 3.5 0 0 1 4.5 16.5V4Z" />
                <path d="M8 4v16" />
              </svg>
            </span>
            <span className="icon-label">{t("encyclopedia")}</span>
          </button>
          <button
            className={`icon-btn ${view === "calendar" ? "active" : ""}`}
            aria-label={t("calendar")}
            onClick={() => setView("calendar")}
          >
            <span className="icon" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M8 2v4M16 2v4M3 10h18" />
              </svg>
            </span>
            <span className="icon-label">{t("calendar")}</span>
          </button>
          <button
            className={`icon-btn ${view === "map" ? "active" : ""}`}
            aria-label={t("map")}
            onClick={() => setView("map")}
          >
            <span className="icon" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
                <path d="M9 3v15M15 6v15" />
              </svg>
            </span>
            <span className="icon-label">{t("map")}</span>
          </button>
          {isPremiumPlus && (
            <>
              <button
                className={`icon-btn ${view === "stats" ? "active" : ""}`}
                aria-label="統計"
                onClick={() => setView("stats")}
              >
                <span className="icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9M13 17V5M8 17v-3" />
                  </svg>
                </span>
                <span className="icon-label">統計</span>
              </button>
              <button
                className={`icon-btn ${view === "forecast" ? "active" : ""}`}
                aria-label="きのこ予報"
                onClick={() => setView("forecast")}
              >
                <span className="icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                    <circle cx="12" cy="12" r="5" />
                  </svg>
                </span>
                <span className="icon-label">予報</span>
              </button>
            </>
          )}
        </nav>

        {view === "camera" && (
          <section style={{ display: "grid", gap: 12 }}>
            <CameraCapture mode={captureMode} />
          </section>
        )}
        {view === "zukan" && (
          <section style={{ display: "grid", gap: 12 }}>
            <ZukanView />
          </section>
        )}
        {view === "calendar" && (
          <section style={{ display: "grid", gap: 12 }}>
            <CalendarView isPremium={isPremium} onUpgrade={() => setShowPay(true)} lang={lang} />
          </section>
        )}
        {view === "map" && (
          <section style={{ display: "grid", gap: 12 }}>
            <MapView />
          </section>
        )}
        {view === "stats" && isPremiumPlus && (
          <section style={{ display: "grid", gap: 12 }}>
            <StatsView />
          </section>
        )}
        {view === "forecast" && isPremiumPlus && (
          <section style={{ display: "grid", gap: 12 }}>
            <MushroomForecast />
          </section>
        )}

        <footer
          className="glass sticky bottom-0"
          style={{
            marginTop: 24,
            fontSize: 12,
            opacity: 0.85,
          }}
        >
          <div>
            <b>MUSHROOM NOTE</b> —
            {t("footer_description")}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            <a href="/legal.html">利用規約・プライバシー</a>
          </div>
        </footer>
      </div>

      {showPay && <Paywall onClose={() => setShowPay(false)} />}

      {showContact && <ContactForm onClose={() => setShowContact(false)} />}
      
      {showMyPage && (
        <MyPageModal
          onClose={() => setShowMyPage(false)}
          onShowContact={() => {
            setShowMyPage(false);
            setShowContact(true);
          }}
          onShowPaywall={() => {
            setShowMyPage(false);
            setShowPay(true);
          }}
          isPremium={isPremium}
          lang={lang}
          onChangeLang={changeLang}
        />
      )}
    </ErrorBoundary>
  );
}

function CalendarView({ isPremium, onUpgrade, lang }: { isPremium: boolean; onUpgrade: () => void; lang: Lang }) {
  const [items, setItems] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [editSelectMode, setEditSelectMode] = React.useState<boolean>(false);
  const today = new Date();
  const [year, setYear] = React.useState<number>(() => {
    const v = Number(localStorage.getItem("cal.year"));
    return Number.isFinite(v) && v > 0 ? v : today.getFullYear();
  });
  const [month, setMonth] = React.useState<number>(() => {
    const v = Number(localStorage.getItem("cal.month"));
    return Number.isFinite(v) && v >= 0 && v <= 11 ? v : today.getMonth();
  });
  const [project, setProject] = React.useState<boolean>(true);
  const [windowDays, setWindowDays] = React.useState<number>(() => {
    const v = Number(localStorage.getItem("cal.windowDays"));
    return Number.isFinite(v) && v >= 0 && v <= 30 ? v : 7;
  });
  const [yearView, setYearView] = React.useState<boolean>(() => {
    return localStorage.getItem("cal.yearView") === "1";
  });
  const [calSearchQ, setCalSearchQ] = React.useState<string>(
    () => localStorage.getItem("cal.q") || ""
  );
  const [showCalSearch, setShowCalSearch] = React.useState<boolean>(false);
  const [calDraftQ, setCalDraftQ] = React.useState<string>(
    () => localStorage.getItem("cal.q") || ""
  );
  const [showSearchModal, setShowSearchModal] = React.useState<boolean>(false);
  const [showSearchInputModal, setShowSearchInputModal] =
    React.useState<boolean>(false);
  const [showMonthModal, setShowMonthModal] = React.useState<boolean>(false);
  const [modalMonth, setModalMonth] = React.useState<number>(0);
  // Reset to current month when CalendarView mounts
  React.useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setYearView(false);
    setCalSearchQ("");
    setCalDraftQ("");
    setShowCalSearch(false);
    setShowSearchModal(false);
    setShowSearchInputModal(false);
    try {
      localStorage.setItem("cal.year", String(now.getFullYear()));
      localStorage.setItem("cal.month", String(now.getMonth()));
      localStorage.setItem("cal.yearView", "0");
      localStorage.removeItem("cal.q");
    } catch {}
  }, []);
  // Normalize string for search: NFKC + Katakana->Hiragana + lower-case
  const nk = (s?: string) => {
    if (!s) return "";
    const n = s.normalize("NFKC");
    let out = "";
    for (let i = 0; i < n.length; i++) {
      const code = n.charCodeAt(i);
      // Katakana range U+30A1..U+30F6 -> Hiragana by -0x60
      if (code >= 0x30a1 && code <= 0x30f6)
        out += String.fromCharCode(code - 0x60);
      else out += n[i];
    }
    return out.toLocaleLowerCase();
  };
  const filteredItems = React.useMemo(() => {
    const term = nk(calSearchQ?.trim());
    if (!term) return items;
    return items.filter((it) => {
      const name = nk((it as any).meta?.detail?.mushroomName || "");
      return name.includes(term);
    });
  }, [items, calSearchQ]);

  const reload = async () => {
    try {
      const list = await db.list();
      setItems(list);
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => {
    reload();
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("cal.year", String(year));
      localStorage.setItem("cal.month", String(month));
      localStorage.setItem("cal.project", project ? "1" : "0");
      localStorage.setItem("cal.windowDays", String(windowDays));
      localStorage.setItem("cal.yearView", yearView ? "1" : "0");
    } catch {}
  }, [year, month, project, windowDays, yearView]);

  // Occurrence date source (future: EXIF/input)
  const occurDate = (it: Row): Date | null => {
    const t = it.createdAt || 0;
    return t ? new Date(t) : null;
  };

  const startOfMonth = new Date(year, month, 1);
  const startWeekday = startOfMonth.getDay(); // 0..6 (Sun..Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() - 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  // Occurrence date: use createdAt
  const byDateThisMonth = React.useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const it of items) {
      const d = occurDate(it);
      if (!d) continue;
      if (d.getFullYear() === year && d.getMonth() === month) {
        const k = ymd(d);
        (map[k] ||= []).push(it);
      }
    }
    return map;
  }, [items, year, month]);

  // Projection from last year to current view month (same date only)
  const projectionCounts = React.useMemo(() => {
    if (!project) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const it of items) {
      const d = occurDate(it);
      if (!d) continue;
      if (d.getFullYear() === year - 1 && d.getMonth() === month) {
        const k = ymd(new Date(year, d.getMonth(), d.getDate()));
        counts[k] = (counts[k] || 0) + 1;
      }
    }
    return counts;
  }, [items, year, month, project]);

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  // Build 6x7 grid
  const cells: { date: Date; inMonth: boolean }[] = [];
  {
    const firstCell = new Date(year, month, 1 - startWeekday);
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstCell);
      d.setDate(firstCell.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === month });
    }
  }

  if (loading) return <div>{t("loading")}</div>;

  const effectiveYearView = yearView;
  const itemsForCounts = yearView && calSearchQ ? filteredItems : items;
  if (effectiveYearView) {
    // 12-month overview
    const months = new Array(12).fill(0).map((_, m) => m);
    const monthName = (m: number) => `${m + 1}月`;
    // Precompute counts per month/day
    const countsByMonthDay: Record<number, Record<number, number>> = {};
    const projectionCountsByMonthDay: Record<number, Record<number, number>> = {};
    for (const it of items) {
      const d = occurDate(it);
      if (!d) continue;
      
      // Actual data for current year
      if (d.getFullYear() === year) {
        const m = d.getMonth();
        const day = d.getDate();
        countsByMonthDay[m] ||= {};
        countsByMonthDay[m][day] = (countsByMonthDay[m][day] || 0) + 1;
      }
      
      // Projection from last year (same date only)
      if (project && d.getFullYear() === year - 1) {
        const m = d.getMonth();
        const day = d.getDate();
        projectionCountsByMonthDay[m] ||= {};
        projectionCountsByMonthDay[m][day] = (projectionCountsByMonthDay[m][day] || 0) + 1;
      }
    }
    return (
      <div className="card" style={{ padding: 12, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn-outline"
            onClick={() => setYear(year - 1)}
            aria-label={t("prev_year")}
          >
            ←
          </button>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{year}{lang === "ja" ? "年" : ""}</div>
          <button
            className="btn-outline"
            onClick={() => setYear(year + 1)}
            aria-label={t("next_year")}
          >
            →
          </button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="icon-btn"
              aria-label={t("search")}
              title={t("search")}
              onClick={() => setShowSearchInputModal(true)}
              style={{
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                padding: 0,
              }}
            >
              <span style={{ display: "grid", placeItems: "center" }}>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-3.2-3.2" />
                </svg>
              </span>
            </button>
            {showCalSearch && (
              <input
                aria-label={t("search_by_name")}
                placeholder={t("search_by_name")}
                value={calDraftQ}
                onChange={(e) => {
                  const v = e.target.value;
                  setCalDraftQ(v);
                  if (v.trim() === "") {
                    setCalSearchQ("");
                    try {
                      localStorage.removeItem("cal.q");
                    } catch {}
                    setShowSearchModal(false);
                    setYearView(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = calDraftQ.trim();
                    setCalSearchQ(v);
                    try {
                      localStorage.setItem("cal.q", v);
                    } catch {}
                    setYearView(true);
                  }
                }}
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  minWidth: 140,
                }}
              />
            )}
            <button
              className="icon-btn"
              aria-label={t("year_view")}
              title={t("year_view")}
              onClick={() => setYearView(!yearView)}
              style={{
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                padding: 0,
                background: yearView ? "#eefaf1" : "#f9fafb",
                color: "var(--fg)",
              }}
            >
              <span style={{ display: "grid", placeItems: "center" }}>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M8 2v4M16 2v4M3 10h18" />
                  <path d="M7 13h3M12 13h3M17 13h0M7 16h3M12 16h3M17 16h0" />
                </svg>
              </span>
            </button>
          </div>
        </div>
        
        {/* 色の説明 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 12,
            padding: "8px 12px",
            background: "#f9fafb",
            borderRadius: 8,
            fontSize: 13,
            width: "100%",
            boxSizing: "border-box",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: "rgba(34,197,94,0.7)",
              }}
            />
            <span>{t("has_record")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: "rgba(59,130,246,0.5)",
              }}
            />
            <span>{t("prediction_from_last_year")}</span>
          </div>
        </div>
        
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 6,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {months.map((m) => {
            const first = new Date(year, m, 1);
            const start = first.getDay();
            const days = new Date(year, m + 1, 0).getDate();
            const cells: { d: Date; inMonth: boolean }[] = [];
            const firstCell = new Date(year, m, 1 - start);
            for (let i = 0; i < 42; i++) {
              const dd = new Date(firstCell);
              dd.setDate(firstCell.getDate() + i);
              cells.push({ d: dd, inMonth: dd.getMonth() === m });
            }
            return (
              <button
                key={m}
                className="card"
                onClick={() => {
                  setModalMonth(m);
                  setShowMonthModal(true);
                }}
                aria-label={`${m + 1}月を開く`}
                style={{
                  padding: 4,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 4,
                    fontSize: 11,
                  }}
                >
                  {monthName(m)}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 1,
                  }}
                >
                  {cells.map(({ d, inMonth }, idx) => {
                    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                    const count = inMonth
                      ? countsByMonthDay[m]?.[d.getDate()] || 0
                      : 0;
                    const projCount = inMonth
                      ? projectionCountsByMonthDay[m]?.[d.getDate()] || 0
                      : 0;
                    const hasData = count > 0;
                    const hasProjection = projCount > 0;
                    const hasBoth = hasData && hasProjection;
                    
                    let bgStyle: React.CSSProperties = {};
                    let textColor = "#9ca3af";
                    let fontWeight = 400;
                    
                    if (inMonth) {
                      if (hasBoth) {
                        // 両方: グラデーション（緑→青）
                        bgStyle = {
                          background: `linear-gradient(135deg, rgba(34,197,94,${Math.min(0.3 + count * 0.15, 0.9)}) 50%, rgba(59,130,246,${Math.min(0.3 + projCount * 0.1, 0.7)}) 50%)`,
                        };
                        textColor = "#fff";
                        fontWeight = 600;
                      } else if (hasData) {
                        // 実データのみ: 緑色
                        bgStyle = {
                          background: `rgba(34,197,94,${Math.min(0.3 + count * 0.15, 0.9)})`,
                        };
                        textColor = "#fff";
                        fontWeight = 600;
                      } else if (hasProjection) {
                        // 予測データのみ: 青色
                        bgStyle = {
                          background: `rgba(59,130,246,${Math.min(0.3 + projCount * 0.1, 0.7)})`,
                        };
                        textColor = "#fff";
                        fontWeight = 500;
                      } else {
                        bgStyle = { background: "#f3f4f6" };
                      }
                    } else {
                      bgStyle = { background: "#f3f4f6" };
                    }
                    
                    return (
                      <div
                        key={key}
                        style={{
                          height: 14,
                          borderRadius: 2,
                          fontSize: 8,
                          textAlign: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          ...bgStyle,
                          color: textColor,
                          fontWeight: fontWeight,
                        }}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* 月モーダル */}
        {showMonthModal && (
          <div
            onClick={() => setShowMonthModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(226,224,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
              zIndex: 60,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{
                background: "#fff",
                width: "calc(100vw - 16px)",
                maxWidth: "720px",
                height: "calc(100vh - 16px)",
                maxHeight: "90vh",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  borderBottom: "1px solid var(--card-border)",
                  flexShrink: 0,
                }}
              >
                <button
                  className="icon-btn"
                  aria-label={t("back")}
                  title={t("back")}
                  onClick={() => setShowMonthModal(false)}
                  style={{
                    border: "1px solid var(--card-border)",
                    borderRadius: 8,
                    width: 28,
                    height: 28,
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                  }}
                >
                  <span style={{ display: "grid", placeItems: "center" }}>
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: "block" }}
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </span>
                </button>
                <div style={{ fontWeight: 700, fontSize: 16, marginLeft: 8 }}>
                  {year}年 {modalMonth + 1}月
                </div>
              </div>
              <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
                {/* ここに月のカレンダーを表示 */}
                {(() => {
                  const startOfMonth = new Date(year, modalMonth, 1);
                  const startWeekday = startOfMonth.getDay();
                  const daysInMonth = new Date(year, modalMonth + 1, 0).getDate();
                  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
                  const cells: { date: Date; inMonth: boolean }[] = [];
                  const firstCell = new Date(year, modalMonth, 1 - startWeekday);
                  for (let i = 0; i < 42; i++) {
                    const d = new Date(firstCell);
                    d.setDate(firstCell.getDate() + i);
                    cells.push({ date: d, inMonth: d.getMonth() === modalMonth });
                  }
                  
                  const ymd = (d: Date) =>
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
                      d.getDate()
                    ).padStart(2, "0")}`;
                  
                  const byDateThisMonth: Record<string, Row[]> = {};
                  for (const it of items) {
                    const d = occurDate(it);
                    if (!d) continue;
                    if (d.getFullYear() === year && d.getMonth() === modalMonth) {
                      const k = ymd(d);
                      (byDateThisMonth[k] ||= []).push(it);
                    }
                  }
                  
                  const projectionCounts: Record<string, number> = {};
                  const projectionItems: Record<string, Row[]> = {};
                  for (const it of items) {
                    const d = occurDate(it);
                    if (!d) continue;
                    if (d.getFullYear() === year - 1 && d.getMonth() === modalMonth) {
                      const k = ymd(new Date(year, d.getMonth(), d.getDate()));
                      projectionCounts[k] = (projectionCounts[k] || 0) + 1;
                      (projectionItems[k] ||= []).push(it);
                    }
                  }
                  
                  return (
                    <div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(7, 1fr)",
                          gap: 3,
                          marginBottom: 8,
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        {weekdays.map((w) => (
                          <div
                            key={w}
                            style={{ fontSize: 11, textAlign: "center", opacity: 0.75 }}
                          >
                            {w}
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(7, 1fr)",
                          gap: 3,
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        {cells.map(({ date, inMonth }) => {
                          const k = ymd(date);
                          const dayItems = byDateThisMonth[k] || [];
                          const projCount = projectionCounts[k] || 0;
                          const projItems = projectionItems[k] || [];
                          const actual = dayItems.length;
                          const proj = projCount;
                          const hasData = actual > 0;
                          const hasProjection = proj > 0;
                          const isToday = k === ymd(today);
                          const tintActual = Math.min(0.08 + actual * 0.06, 0.35);
                          const tintProj = Math.min(proj * 0.05, 0.25);
                          const bgTint = inMonth
                            ? `linear-gradient(0deg, rgba(52,211,153,${tintActual}), rgba(52,211,153,${tintActual}))`
                            : `linear-gradient(0deg, rgba(246,246,246,1), rgba(246,246,246,1))`;
                          const baseBg = inMonth ? "#fff" : "#f6f6f6";
                          
                          return (
                            <div
                              key={k}
                              className="card"
                              role="button"
                              aria-label={`${date.getMonth() + 1}月${date.getDate()}日の記録を見る`}
                              onClick={() => {
                                if (hasData || hasProjection) {
                                  setSelectedKey(k);
                                }
                              }}
                              style={{
                                padding: 6,
                                borderRadius: 8,
                                background: actual > 0 ? `${bgTint}, ${baseBg}` : baseBg,
                                border: isToday
                                  ? "2px solid #fbbf24"
                                  : proj > 0
                                  ? `1px solid rgba(30,58,138,${0.25 + Math.min(proj * 0.06, 0.35)})`
                                  : "1px solid var(--card-border)",
                                position: "relative",
                                aspectRatio: "1 / 1",
                                display: "flex",
                                flexDirection: "column",
                                cursor: (hasData || hasProjection) ? "pointer" : "default",
                                boxShadow: actual > 0 ? "inset 0 0 0 9999px rgba(52,211,153,0)" : undefined,
                                opacity: inMonth ? 1 : 0.5,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "start",
                                }}
                              >
                                <div style={{ fontSize: 12, opacity: inMonth ? 0.9 : 0.5 }}>
                                  {date.getDate()}
                                </div>
                                {isToday ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      background: "#fde68a",
                                      color: "#78350f",
                                      padding: "2px 6px",
                                      borderRadius: 999,
                                      border: "1px solid rgba(245,158,11,0.4)",
                                    }}
                                  >
                                    {t("today")}
                                  </span>
                                ) : null}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  alignItems: "center",
                                  marginTop: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                {actual > 0 && (
                                  <span
                                    title={`記録: ${actual}`}
                                    style={{
                                      background: "#34d399",
                                      color: "#064e3b",
                                      border: "1px solid rgba(6,78,59,0.2)",
                                      padding: "2px 6px",
                                      borderRadius: 999,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                                    }}
                                  >
                                    {actual}
                                  </span>
                                )}
                                {isPremium && project && proj > 0 && (
                                  <span
                                    title={`予測: ${proj}`}
                                    style={{
                                      background: "#dbeafe",
                                      color: "#1e3a8a",
                                      border: "1px solid rgba(30,58,138,0.25)",
                                      padding: "2px 6px",
                                      borderRadius: 999,
                                      fontSize: 11,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {proj}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* 詳細表示 */}
                      {selectedKey && (() => {
                        const dayItems = byDateThisMonth[selectedKey] || [];
                        const projItems = projectionItems[selectedKey] || [];
                        const hasData = dayItems.length > 0;
                        const hasProjection = projItems.length > 0;
                        
                        if (!hasData && !hasProjection) return null;
                        
                        return (
                          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                            {/* 今年の記録 */}
                            {hasData && (
                              <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14, color: "#16a34a" }}>
                                    {t("this_day_records")}
                                  </div>
                                  <button
                                    className="btn-outline"
                                    onClick={() => setSelectedKey(null)}
                                    style={{ fontSize: 12, padding: "4px 8px" }}
                                  >
                                    {t("close")}
                                  </button>
                                </div>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {dayItems.map((it) => {
                                    const name = (it as any).meta?.detail?.mushroomName || "";
                                    return (
                                      <div
                                        key={it.id}
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 4,
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: "100%",
                                            aspectRatio: "1/1",
                                            overflow: "hidden",
                                            borderRadius: 6,
                                            background: "#eee",
                                          }}
                                        >
                                          <img
                                            src={it.photoUrl}
                                            alt=""
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                            }}
                                            loading="lazy"
                                          />
                                        </div>
                                        {name && (
                                          <div style={{ fontSize: 11, textAlign: "center", opacity: 0.9 }}>
                                            {name}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* 昨年の記録（予測） */}
                            {hasProjection && (
                              <div style={{ padding: 12, background: "#f0f9ff", borderRadius: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14, color: "#2563eb" }}>
                                    {t("last_year_same_day")}
                                  </div>
                                  {!hasData && (
                                    <button
                                      className="btn-outline"
                                      onClick={() => setSelectedKey(null)}
                                      style={{ fontSize: 12, padding: "4px 8px" }}
                                    >
                                      {t("close")}
                                    </button>
                                  )}
                                </div>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {projItems.map((it) => {
                                    const name = (it as any).meta?.detail?.mushroomName || "";
                                    return (
                                      <div
                                        key={it.id}
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 4,
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: "100%",
                                            aspectRatio: "1/1",
                                            overflow: "hidden",
                                            borderRadius: 6,
                                            background: "#eee",
                                          }}
                                        >
                                          <img
                                            src={it.photoUrl}
                                            alt=""
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                            }}
                                            loading="lazy"
                                          />
                                        </div>
                                        {name && (
                                          <div style={{ fontSize: 11, textAlign: "center", opacity: 0.9 }}>
                                            {name}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-outline" onClick={prevMonth} aria-label={t("prev_month")}>
          ←
        </button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          {year}{lang === "ja" ? "年" : ""} {month + 1}{lang === "ja" ? "月" : ""}
        </div>
        <button className="btn-outline" onClick={nextMonth} aria-label={t("next_month")}>
          →
        </button>
        
        {/* 色の説明 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 12,
            opacity: 0.85,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: "#34d399",
              }}
            />
            <span>{t("has_record")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: "#dbeafe",
              }}
            />
            <span>{t("prediction_from_last_year")}</span>
          </div>
        </div>
        
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="icon-btn"
            aria-label={t("search")}
            title={t("search")}
            onClick={() => setShowCalSearch((v) => !v)}
            style={{
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              width: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              padding: 0,
            }}
          >
            <span style={{ display: "grid", placeItems: "center" }}>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "block" }}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-3.2-3.2" />
              </svg>
            </span>
          </button>
          {showCalSearch && (
            <input
              aria-label={t("search_by_name")}
              placeholder={t("search_by_name")}
              value={calDraftQ}
              onChange={(e) => setCalDraftQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = calDraftQ.trim();
                  setCalSearchQ(v);
                  try {
                    localStorage.setItem("cal.q", v);
                  } catch {}
                  setYearView(true);
                }
              }}
              style={{
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid #ddd",
                minWidth: 140,
              }}
            />
          )}
          <button
            className="icon-btn"
            aria-label={t("year_view")}
            title={t("year_view")}
            onClick={() => setYearView(!yearView)}
            style={{
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              width: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              padding: 0,
              background: yearView ? "#eefaf1" : "#f9fafb",
              color: "var(--fg)",
            }}
          >
            <span style={{ display: "grid", placeItems: "center" }}>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "block" }}
              >
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M8 2v4M16 2v4M3 10h18" />
                <path d="M7 13h3M12 13h3M17 13h0M7 16h3M12 16h3M17 16h0" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
          marginTop: 10,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {weekdays.map((w) => (
          <div
            key={w}
            style={{ fontSize: 11, textAlign: "center", opacity: 0.75 }}
          >
            {w}
          </div>
        ))}
        {cells.map(({ date, inMonth }) => {
          const k = ymd(date);
          const actual = (byDateThisMonth[k]?.length || 0) as number;
          const proj = (projectionCounts[k] || 0) as number;
          const isToday = k === ymd(today);
          const tintActual = Math.min(0.08 + actual * 0.06, 0.35); // 0.08..0.35
          const tintProj = Math.min(proj * 0.05, 0.25); // 0..0.25
          const bgTint = inMonth
            ? `linear-gradient(0deg, rgba(52,211,153,${tintActual}), rgba(52,211,153,${tintActual}))`
            : `linear-gradient(0deg, rgba(246,246,246,1), rgba(246,246,246,1))`;
          const baseBg = inMonth ? "#fff" : "#f6f6f6";
          return (
            <div
              key={k}
              className="card"
              role="button"
              aria-label={`${
                date.getMonth() + 1
              }月${date.getDate()}日の記録を見る`}
              onClick={() => setSelectedKey(k)}
              style={{
                padding: 6,
                borderRadius: 8,
                background: actual > 0 ? `${bgTint}, ${baseBg}` : baseBg,
                border: isToday
                  ? "2px solid #fbbf24"
                  : proj > 0
                  ? `1px solid rgba(30,58,138,${
                      0.25 + Math.min(proj * 0.06, 0.35)
                    })`
                  : "1px solid var(--card-border)",
                position: "relative",
                aspectRatio: "1 / 1",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                boxShadow:
                  actual > 0
                    ? "inset 0 0 0 9999px rgba(52,211,153,0)"
                    : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                }}
              >
                <div style={{ fontSize: 12, opacity: inMonth ? 0.9 : 0.5 }}>
                  {date.getDate()}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                  marginTop: "auto",
                  flexWrap: "wrap",
                }}
              >
                {actual > 0 && (
                  <span
                    title={`記録: ${actual}`}
                    style={{
                      background: "#34d399",
                      color: "#064e3b",
                      border: "1px solid rgba(6,78,59,0.2)",
                      padding: "2px 6px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                    }}
                  >
                    {actual}
                  </span>
                )}
                {isPremium && project && proj > 0 && (
                  <span
                    title={`予測: ${proj}`}
                    style={{
                      background: "#dbeafe",
                      color: "#1e3a8a",
                      border: "1px solid rgba(30,58,138,0.25)",
                      padding: "2px 6px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {proj}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day preview modal */}
      {selectedKey && (
        <div
          onClick={() => {
            setSelectedKey(null);
            setPreviewId(null);
            setEditSelectMode(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(226,224,255,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 60,
            top: 56,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              background: "#fff",
              maxWidth: 560,
              width: "100%",
              borderRadius: 12,
              maxHeight: "calc(100vh - 120px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {(() => {
                  const d = new Date(selectedKey);
                  return `${d.getFullYear()}年 ${
                    d.getMonth() + 1
                  }月 ${d.getDate()}日`;
                })()}
              </div>
              {previewId && !editSelectMode && (
                <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                  <button
                    className="icon-btn"
                    aria-label="編集"
                    title="編集"
                    onClick={() => setEditSelectMode(true)}
                  >
                    <span className="icon" aria-hidden>
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </span>
                  </button>
                  <button
                    className="icon-btn"
                    aria-label="サムネイル一覧に戻る"
                    title="サムネイル一覧に戻る"
                    onClick={() => setPreviewId(null)}
                  >
                    <span className="icon" aria-hidden>
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="8" height="8" rx="1" />
                        <rect x="13" y="3" width="8" height="8" rx="1" />
                        <rect x="3" y="13" width="8" height="8" rx="1" />
                        <rect x="13" y="13" width="8" height="8" rx="1" />
                      </svg>
                    </span>
                  </button>
                </div>
              )}
              <button
                className="icon-btn"
                style={{ marginLeft: "auto" }}
                onClick={() => setSelectedKey(null)}
                aria-label={t("close")}
                title={t("close")}
              >
                <span className="icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </span>
              </button>
            </div>
            <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
              {(() => {
                const arr = byDateThisMonth[selectedKey] || [];
                if (!arr.length)
                  return (
                    <div style={{ opacity: 0.8 }}>この日に記録はありません</div>
                  );
                const labelJP = (v?: string) => {
                  const map: Record<string, string> = {
                    gills: "ひだ",
                    pores: "管孔",
                    spines: "針",
                    ridges: "しわひだ",
                    hollow: "中空",
                    solid: "中実",
                    present: "あり",
                    absent: "なし",
                    none: "なし",
                    cortina: "蜘蛛の巣状",
                    deadwood: "枯れ木",
                    downed: "倒木",
                    live: "生木",
                    soil: "地面",
                    broadleaf: "広葉樹",
                    conifer: "針葉樹",
                    mixed: "混生林",
                    bamboo: "竹林",
                    park: "公園",
                    red: "赤",
                    purple: "紫",
                    white: "白",
                    yellow: "黄",
                    brown: "茶",
                    black: "黒",
                    gray: "グレー",
                    orange: "橙",
                    green: "緑",
                    blue: "青",
                    pink: "ピンク",
                    other: "その他",
                  };
                  return map[v ?? ""] ?? v ?? "";
                };
                // If a preview is opened, show detail view for that item
                if (previewId) {
                  const it = arr.find((x) => x.id === previewId);
                  if (!it) {
                    setPreviewId(null);
                    setEditSelectMode(false);
                    return null;
                  }
                  if (editSelectMode) {
                    return (
                      <div className="card" style={{ padding: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>編集対象を選択</div>
                          <button
                            className="btn-outline"
                            onClick={() => setEditSelectMode(false)}
                          >
                            戻る
                          </button>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(120px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {arr.map((x) => (
                            <button
                              key={x.id}
                              onClick={() => setEditId(x.id)}
                              className="card"
                              style={{ padding: 6, cursor: "pointer" }}
                              aria-label="編集する"
                            >
                              <div
                                style={{
                                  width: "100%",
                                  aspectRatio: "1/1",
                                  overflow: "hidden",
                                  borderRadius: 8,
                                  background: "#eee",
                                }}
                              >
                                <img
                                  src={x.photoUrl}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  const d: any = (it as any).meta?.detail || {};
                  const lines: { label: string; value: string }[] = [];
                  if (d.mushroomName)
                    lines.push({
                      label: "きのこの名前",
                      value: d.mushroomName,
                    });
                  if (d.capColor)
                    lines.push({ label: "傘の色", value: labelJP(d.capColor) });
                  if (d.undersideType)
                    lines.push({
                      label: "傘の裏",
                      value: labelJP(d.undersideType),
                    });
                  if (d.stipeCore)
                    lines.push({ label: "柄", value: labelJP(d.stipeCore) });
                  if (d.ring)
                    lines.push({ label: "つば", value: labelJP(d.ring) });
                  if (d.volva)
                    lines.push({ label: "つぼ", value: labelJP(d.volva) });
                  if (d.substrate)
                    lines.push({
                      label: "生え方",
                      value: labelJP(d.substrate),
                    });
                  if (d.habitat)
                    lines.push({ label: "環境", value: labelJP(d.habitat) });
                  return (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "1/1",
                          overflow: "hidden",
                          borderRadius: 8,
                          background: "#eee",
                        }}
                      >
                        <img
                          src={it.photoUrl}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      {lines.length ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {lines.map((ln, idx) => (
                            <div
                              key={idx}
                              style={{ display: "flex", gap: 8, fontSize: 14 }}
                            >
                              <div style={{ width: 92, opacity: 0.75 }}>
                                {ln.label}
                              </div>
                              <div>{ln.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ opacity: 0.8 }}>詳細は未入力です</div>
                      )}
                    </div>
                  );
                }

                // Default: show grid list of items of the day
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {arr.map((it) => {
                      const d: any = (it as any).meta?.detail || {};
                      return (
                        <button
                          key={it.id}
                          onClick={() => {
                            setPreviewId(it.id);
                            setEditSelectMode(false);
                          }}
                          className="card"
                          style={{
                            padding: 8,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          aria-label="記録をプレビュー"
                        >
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "1/1",
                              overflow: "hidden",
                              borderRadius: 8,
                              background: "#eee",
                            }}
                          >
                            <img
                              src={it.photoUrl}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.85 }}>
                            {d.mushroomName ? d.mushroomName : "(名前未入力)"}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.75 }}>
                            {[
                              d.capColor ? `傘: ${labelJP(d.capColor)}` : null,
                              d.habitat ? `環境: ${labelJP(d.habitat)}` : null,
                            ]
                              .filter(Boolean)
                              .join(" ・ ")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {editId && (
        <div
          onClick={() => setEditId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(226,224,255,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
            top: 56,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "transparent", borderRadius: 12 }}
          >
            <DetailForm
              id={editId}
              onClose={() => setEditId(null)}
              onSaved={() => {
                reload();
                setEditId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MapView() {
  const [items, setItems] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [center, setCenter] = React.useState<{ lat: number; lng: number } | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);

  const reload = async () => {
    try {
      const list = await db.list();
      setItems(list);
      
      // 位置情報がある最初のアイテムを中心に設定
      const firstWithLocation = list.find((it: any) => it.meta?.lat && it.meta?.lon);
      if (firstWithLocation) {
        const meta = (firstWithLocation as any).meta;
        setCenter({ lat: meta.lat, lng: meta.lon });
      } else {
        // デフォルト位置（日本の中心付近）
        setCenter({ lat: 36.5, lng: 138.0 });
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    reload();
  }, []);

  // 位置情報があるアイテムのみフィルタ
  const itemsWithLocation = React.useMemo(() => {
    return items.filter((it: any) => it.meta?.lat && it.meta?.lon);
  }, [items]);

  // Leaflet地図の初期化
  React.useEffect(() => {
    if (!mapRef.current || !center || mapInstanceRef.current) return;

    // Leaflet CSSとJSを動的に読み込み
    const loadLeaflet = async () => {
      // CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
        // CSSの読み込みを待つ
        await new Promise(resolve => {
          link.onload = resolve;
          setTimeout(resolve, 1000); // タイムアウト
        });
      }

      // JS
      if (!(window as any).L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const L = (window as any).L;
      if (!L) {
        console.error('Leaflet failed to load');
        return;
      }
      
      // 地図を初期化
      const map = L.map(mapRef.current).setView([center.lat, center.lng], 13);
      
      // 国土地理院の地形図タイル
      L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
      
      // 地図のサイズを調整
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    };

    loadLeaflet().catch(err => {
      console.error('Failed to load Leaflet:', err);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center]);

  // マーカーを更新
  React.useEffect(() => {
    if (!mapInstanceRef.current || itemsWithLocation.length === 0) return;

    const L = (window as any).L;
    if (!L) return;

    // 既存のマーカーを削除
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // 新しいマーカーを追加
    itemsWithLocation.forEach((it: any) => {
      const meta = it.meta;
      const name = meta?.detail?.mushroomName || "名前未登録";
      
      const marker = L.marker([meta.lat, meta.lon], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 32px;
            height: 32px;
            background: ${selectedId === it.id ? '#ef4444' : '#22c55e'};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          "></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="min-width: 150px;">
            <img src="${it.photoUrl}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />
            <div style="font-weight: 600; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 12px; opacity: 0.8;">${new Date(it.createdAt).toLocaleString()}</div>
          </div>
        `)
        .on('click', () => {
          setSelectedId(it.id);
        });

      markersRef.current.push(marker);
    });

    // 全マーカーが見えるように調整
    if (itemsWithLocation.length > 1) {
      const bounds = L.latLngBounds(
        itemsWithLocation.map((it: any) => [it.meta.lat, it.meta.lon])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [itemsWithLocation, selectedId]);

  if (loading) return <div>読み込み中…</div>;

  const selectedItem = selectedId ? items.find(it => it.id === selectedId) : null;

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>地図</div>
      
      {itemsWithLocation.length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", opacity: 0.8 }}>
          位置情報付きの記録がまだありません。<br />
          撮影時に位置情報を許可すると、地図上に表示されます。
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 12, fontSize: 13, opacity: 0.8 }}>
            {itemsWithLocation.length}件の記録を表示中
          </div>
          
          {/* Leaflet地図 */}
          <div
            ref={mapRef}
            style={{
              width: "100%",
              height: "500px",
              borderRadius: 12,
              overflow: "hidden",
              border: "2px solid var(--card-border)",
            }}
          />
          
          {/* 選択されたアイテムの詳細 */}
          {selectedItem && (
            <div
              className="card"
              style={{
                marginTop: 12,
                padding: 12,
                background: "#f0fdf4",
              }}
            >
              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 8,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#eee",
                  }}
                >
                  <img
                    src={selectedItem.photoUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {(selectedItem as any).meta?.detail?.mushroomName || "名前未登録"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {new Date(selectedItem.createdAt).toLocaleString()}
                  </div>
                  {(selectedItem as any).meta?.lat && (
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                      📍 {((selectedItem as any).meta.lat).toFixed(6)}, {((selectedItem as any).meta.lon).toFixed(6)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CalendarPlaceholder() {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        きのこカレンダー（準備中）
      </div>
      <div style={{ opacity: 0.8 }}>
        昨年の観測データを今年のカレンダーに反映して発生予測を可視化予定です。
      </div>
    </div>
  );
}

function RandomPhotos({ onPhotoClick }: { onPhotoClick: (id: string) => void }) {
  const [photos, setPhotos] = React.useState<{ id: string; photoUrl: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    const loadPhotos = async () => {
      try {
        const items = await db.list();
        if (items.length > 0) {
          // ランダムに最大10枚選択
          const shuffled = [...items].sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, Math.min(10, items.length));
          setPhotos(selected.map(it => ({ id: it.id, photoUrl: it.photoUrl })));
        }
      } catch (err) {
        console.error("Failed to load random photos:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPhotos();
  }, []);

  // 自動ページめくり
  React.useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [photos.length]);

  if (loading || photos.length === 0) return null;

  return (
    <>
      <div style={{ marginBottom: 20, overflow: "hidden", position: "relative", width: "90%", margin: "0 auto 20px" }}>
        <div
          className="random-photos-container"
          style={{
            position: "relative",
            width: "100%",
            height: 200,
            perspective: "1000px",
          }}
        >
          {photos.map((photo, index) => {
            const offset = index - currentIndex;
            const isVisible = Math.abs(offset) <= 2;
            
            if (!isVisible) return null;

            return (
              <button
                key={photo.id}
                onClick={() => onPhotoClick(photo.id)}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 280,
                  height: 180,
                  marginLeft: -140,
                  marginTop: -90,
                  transform: `
                    translateX(${offset * 60}px)
                    translateZ(${-Math.abs(offset) * 150}px)
                    rotateY(${offset * -15}deg)
                    scale(${1 - Math.abs(offset) * 0.2})
                  `,
                  opacity: 1 - Math.abs(offset) * 0.3,
                  transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  zIndex: 10 - Math.abs(offset),
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  background: "#fff",
                  border: "3px solid #fff",
                  cursor: "pointer",
                  padding: 0,
                }}
                aria-label="詳細を表示"
              >
                <img
                  src={photo.photoUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
        
        {/* ページインジケーター */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginTop: 12,
          }}
        >
          {photos.map((_, index) => (
            <div
              key={index}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: index === currentIndex ? "#667eea" : "#d1d5db",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      </div>
      
      {/* レスポンシブ対応 */}
      <style>{`
        @media (min-width: 640px) {
          .random-photos-container {
            height: 300px !important;
          }
          .random-photos-container button {
            width: 400px !important;
            height: 260px !important;
            margin-left: -200px !important;
            margin-top: -130px !important;
          }
        }
        @media (max-width: 639px) {
          .random-photos-container {
            height: 200px !important;
          }
          .random-photos-container button {
            width: 280px !important;
            height: 180px !important;
            margin-left: -140px !important;
            margin-top: -90px !important;
          }
        }
      `}</style>
    </>
  );
}

if ("storage" in navigator && "persist" in navigator.storage) {
  navigator.storage.persist?.().then((granted) => {
    console.log("[storage.persist]", granted);
  });
}
