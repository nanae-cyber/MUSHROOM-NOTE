// src/ui/DetailForm.tsx
import React, { useEffect, useRef, useState } from "react";
import { db, type Detail, type Row } from "../utils/db";
import { normalizeImageToJpeg } from "../utils/image";
import AIPredictModal from "./AIPredictModal";
import { t } from "../i18n";
import { getLabel } from "./labels";

type Props = { id: string; onSaved: () => void; onClose: () => void };

// 選択肢（undefinedを含まない型に明示）
const CAP_COLORS = [
  "red",
  "pink",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "brown",
  "gray",
  "black",
  "white",
  "other",
] as const;

const UNDER_TYPES = ["gills", "pores", "spines", "ridges", "other"] as const;
const STIPE_CORE = ["hollow", "solid", "none"] as const;
const RING_OPTS = ["present", "absent", "cortina"] as const;
const YESNO = ["present", "absent"] as const;
const SUBSTRATE = ["deadwood", "downed", "live", "soil", "other"] as const;
const HABITAT = [
  "broadleaf",
  "conifer",
  "mixed",
  "bamboo",
  "park",
  "other",
] as const;

// 地形用オプション
const ASPECT_OPTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const TERRAIN_TYPES = ["valley", "ridge", "flat", "slope"] as const;

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
    cortina: "蜘蛛の巣状膜",
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
    // 地形ラベル
    N: "北",
    NE: "北東",
    E: "東",
    SE: "南東",
    S: "南",
    SW: "南西",
    W: "西",
    NW: "北西",
    valley: "沢",
    ridge: "尾根",
    flat: "平地",
    slope: "斜面",
  };
  return map[v ?? ""] ?? v ?? "";
};

// ひらがな・カタカナ変換関数
const toHiragana = (str: string): string => {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
};

const toKatakana = (str: string): string => {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
};

// 検索用の正規化（ひらがな・カタカナ・大文字小文字を統一）
const normalizeForSearch = (str: string): string => {
  return toHiragana(str.toLowerCase());
};

export function DetailForm({ id, onSaved, onClose }: Props) {
  const [detail, setDetail] = useState<Detail>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showWeirdHint, setShowWeirdHint] = useState(true);
  const [hintMounted, setHintMounted] = useState(false);
  const [showSubHint, setShowSubHint] = useState(false);
  const [weirdHover, setWeirdHover] = useState(false);
  const [weirdPressed, setWeirdPressed] = useState(false);
  const [originalMeta, setOriginalMeta] = useState<Record<string, any>>({});
  const [occurAtIso, setOccurAtIso] = useState<string>("");
  const [inputAtIso, setInputAtIso] = useState<string>("");
  const [editOccur, setEditOccur] = useState(false);
  const [occurError, setOccurError] = useState<string>("");
  const [showOccurModal, setShowOccurModal] = useState(false);
  const [tempDate, setTempDate] = useState<string>("");
  const [tempTime, setTempTime] = useState<string>("");
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showTerrainModal, setShowTerrainModal] = useState(false);
  const [terrainAspect, setTerrainAspect] = useState<string>("");
  const [terrainElevation, setTerrainElevation] = useState<string>("");
  const [terrainType, setTerrainType] = useState<string>("");
  const [terrainNote, setTerrainNote] = useState<string>("");
  const [showPhotoAddedModal, setShowPhotoAddedModal] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [mushroomSuggestions, setMushroomSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dtLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };
  const validateOccur = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return "";
    const t = Date.parse(`${dateStr}T${timeStr}`);
    if (!isNaN(t) && t > Date.now()) return "未来の日時は設定できません";
    return "";
  };
  const [gps, setGps] = useState<{
    lat: number;
    lon: number;
    acc?: number;
    ts?: number;
  } | null>(null);
  const [gpsFetching, setGpsFetching] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHintMounted(true), 280);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!hintMounted) return;
    const t = setTimeout(() => setShowSubHint(true), 600);
    return () => clearTimeout(t);
  }, [hintMounted]);

  useEffect(() => {
    (async () => {
      try {
        const cur = await db.getRaw(id); // 修正：get → getRaw に変更
        const meta = (cur?.meta as any) || {};
        setOriginalMeta(meta);
        setGps((meta as any).gps ?? null);
        // 画像データを取得
        if (cur?.photoBlob) {
          console.log("🖼️ photoBlob取得:", cur.photoBlob.size, "bytes");
          setPhotoBlob(cur.photoBlob);
        } else {
          console.log("⚠️ photoがありません");
        }
        const t = (meta as any).terrain || {};
        const d = meta?.detail as Detail | undefined;
        if (d) {
          setDetail(d);
          // detailから地形データを読み込む（後方互換性のためterrainからも読み込む）
          setTerrainAspect(d.terrainAspect || t.aspect || "");
          setTerrainElevation(d.terrainElevation || (t.elevation ? String(t.elevation) : ""));
          setTerrainType(d.terrainType || t.type || "");
          setTerrainNote(d.terrainNote || t.note || "");
        } else {
          setTerrainAspect(t.aspect || "");
          setTerrainElevation(t.elevation ? String(t.elevation) : "");
          setTerrainType(t.type || "");
          setTerrainNote(t.note || "");
        }
        // Prefill occurrence fields (prefer occurAt > capturedAt > shotAt > createdAt)
        const fallbackCreatedAt = Number(cur?.createdAt || 0);
        const occurAt = Number(
          meta.occurAt || meta.capturedAt || meta.shotAt || fallbackCreatedAt || 0
        );
        if (Number.isFinite(occurAt) && occurAt > 0) {
          const dt = new Date(occurAt);
          const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(dt.getDate()).padStart(2, "0")}T${String(
            dt.getHours()
          ).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
          setOccurAtIso(iso);
        }
        const inputAt = Number(meta.inputAt || 0);
        if (Number.isFinite(inputAt) && inputAt > 0) {
          const dt = new Date(inputAt);
          const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(dt.getDate()).padStart(2, "0")}`;
          setInputAtIso(iso);
        }
        
        // 過去に入力したきのこの名前を取得
        const allRecords = await db.list();
        const names = new Set<string>();
        allRecords.forEach((record) => {
          const name = (record.meta as any)?.detail?.mushroomName;
          if (name && typeof name === 'string' && name.trim()) {
            names.add(name.trim());
          }
        });
        setMushroomSuggestions(Array.from(names).sort());
      } catch (err) {
        console.error("ロード中にエラー:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const pick = <K extends keyof Detail>(k: K, v: Detail[K]) =>
    setDetail((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedDetail: Detail = {
        ...detail,
        terrainAspect: terrainAspect || undefined,
        terrainElevation: terrainElevation || undefined,
        terrainType: terrainType || undefined,
        terrainNote: terrainNote || undefined,
        updatedAt: Date.now(),
      };
      const nextMeta = { ...originalMeta, detail: updatedDetail } as any;
      // Store occurrence fields（撮影日時は任意）
      if (occurAtIso) nextMeta.occurAt = Date.parse(occurAtIso);
      else delete nextMeta.occurAt;
      if (inputAtIso) nextMeta.inputAt = Date.parse(inputAtIso);
      else delete nextMeta.inputAt;
      if (gps) (nextMeta as any).gps = gps;
      else delete (nextMeta as any).gps;
      const hasTerrain =
        !!terrainAspect || !!terrainElevation || !!terrainType || !!terrainNote;
      if (hasTerrain) {
        (nextMeta as any).terrain = {
          aspect: terrainAspect || undefined,
          elevation: terrainElevation ? Number(terrainElevation) : undefined,
          type: terrainType || undefined,
          note: terrainNote || undefined,
        };
      } else {
        delete (nextMeta as any).terrain;
      }
      console.log("💾 保存データ", {
        detail: updatedDetail,
        occurAt: nextMeta.occurAt,
        inputAt: nextMeta.inputAt,
      });
      await db.update(id, { meta: nextMeta });
      onSaved();
      onClose();
    } catch (err) {
      console.error("保存エラー:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 56,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(226,224,255,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 70,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          color: "var(--fg)",
          borderRadius: 12,
          width: "min(720px,96vw)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid var(--card-border)",
          }}
        >
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setAddingPhoto(true);
              try {
                console.log(
                  "📎 gallery input:",
                  f.type,
                  Math.round(f.size / 1024),
                  "KB"
                );
                let blob = await normalizeImageToJpeg(f, 1400, 0.85);
                if (blob.size > 4 * 1024 * 1024) {
                  try {
                    blob = await normalizeImageToJpeg(blob, 1280, 0.8);
                  } catch {}
                }
                console.log(
                  "📎 normalized:",
                  (blob as any).type,
                  Math.round(blob.size / 1024),
                  "KB"
                );
                await db.addExtraPhoto(id, blob);
                setShowPhotoAddedModal(true);
              } catch (err: any) {
                const name = err?.name ?? "Error";
                const msg = err?.message ?? String(err);
                console.error("❌ addExtraPhoto error", { name, msg, err });
                alert(
                  `保存に失敗: ${name} / ${msg}\n\n対処例: 1) 画像サイズを小さくする 2) プライベートブラウズをOFF 3) ストレージ空き容量を確保`
                );
              } finally {
                setAddingPhoto(false);
                e.currentTarget.value = "";
              }
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setAddingPhoto(true);
              try {
                const blob = await normalizeImageToJpeg(f);
                await db.addExtraPhoto(id, blob);
                setShowPhotoAddedModal(true);
              } finally {
                setAddingPhoto(false);
                e.currentTarget.value = "";
              }
            }}
          />
          
          {/* 閉じるボタン（右上） */}
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="閉じる"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(0,0,0,0.5)",
              border: "none",
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              zIndex: 10,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          {/* 画像とテキストを中央に配置 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px 14px 14px",
              gap: 12,
            }}
          >
            {/* 画像表示（画像追加ボタン付き） */}
            {(photoBlob || loading) && (
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "3px solid #e5e7eb",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    background: loading ? "#f0f0f0" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {loading ? (
                    <div style={{ fontSize: 12, color: "#999" }}>読み込み中...</div>
                  ) : photoBlob ? (
                    <img
                      src={URL.createObjectURL(photoBlob)}
                      alt="編集中の画像"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : null}
                </div>
                
                {/* 画像追加ボタン（画像の右下） */}
                <div
                  style={{
                    position: "absolute",
                    bottom: -12,
                    right: -12,
                    display: "flex",
                    gap: 6,
                    background: "#fff",
                    borderRadius: 20,
                    padding: "4px 6px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={addingPhoto || saving || loading}
                    aria-label="ギャラリーから追加"
                    title="ギャラリーから追加"
                    style={{
                      background: "transparent",
                      border: "none",
                      borderRadius: "50%",
                      padding: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      width: 28,
                      height: 28,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#666"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4.5" width="18" height="15" rx="2" />
                      <path d="m7 13 3-3 3 3 3-3 3 3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={addingPhoto || saving || loading}
                    aria-label="カメラで撮影"
                    title="カメラで撮影"
                    style={{
                      background: "transparent",
                      border: "none",
                      borderRadius: "50%",
                      padding: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      width: 28,
                      height: 28,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#666"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 8h4l2-3h4l2 3h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
                      <circle cx="12" cy="14" r="3.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            {/* タイトルとサブテキスト */}
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {t("specimen_details")}
              </h3>
              {photoBlob && (
                <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                  この画像の詳細を編集中
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 16 }}>
          {loading ? (
            <div>読み込み中…</div>
          ) : (
            <>
              {/* アイコンボタン */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div style={{ opacity: 0.95, fontWeight: 700 }}>
                  {t("capture_datetime")}
                </div>
                <div style={{ marginLeft: 10, fontSize: 12, opacity: 0.9 }}>
                  {occurAtIso
                    ? new Date(occurAtIso).toLocaleString()
                    : "未設定"}
                </div>
                <button
                  type="button"
                  aria-label="日時を変更"
                  title="日時を変更"
                  onClick={() => {
                    const base = occurAtIso || dtLocal(new Date());
                    setTempDate(base.slice(0, 10));
                    setTempTime(base.slice(11, 16));
                    setOccurError("");
                    setShowOccurModal(true);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    padding: 0,
                    borderRadius: 8,
                    border: "1px solid var(--card-border)",
                    background: "#f9fafb",
                    color: "var(--fg)",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="地形情報を記録"
                  title="地形情報を記録"
                  onClick={() => setShowTerrainModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    padding: 0,
                    borderRadius: 8,
                    border: "1px solid var(--card-border)",
                    background:
                      terrainType ||
                      terrainAspect ||
                      terrainElevation ||
                      terrainNote
                        ? "#eefaf1"
                        : "#f9fafb",
                    color: "var(--fg)",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 18h18" />
                    <path d="M3 18l5-6 4 3 5-7 4 5" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={
                    gps
                      ? `位置情報更新: ${gps.lat.toFixed(
                          5
                        )}, ${gps.lon.toFixed(5)}${
                          gps.acc ? ` ±${Math.round(gps.acc)}m` : ""
                        }`
                      : "現在地を記録"
                  }
                  title={
                    gps
                      ? `${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}${
                          gps.acc ? ` ±${Math.round(gps.acc)}m` : ""
                        }`
                      : "現在地を記録"
                  }
                  onClick={() => {
                    if (!window.isSecureContext) {
                      alert(
                        "位置情報はHTTPSまたはlocalhostでのみ取得できます"
                      );
                      return;
                    }
                    if (!navigator.geolocation) {
                      alert("この端末では位置情報が利用できません");
                      return;
                    }
                    setGpsFetching(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const { latitude, longitude, accuracy } =
                          pos.coords;
                        setGps({
                          lat: latitude,
                          lon: longitude,
                          acc: accuracy,
                          ts: Date.now(),
                        });
                        setGpsFetching(false);
                      },
                      (err) => {
                        console.warn("geolocation error", err);
                        setGpsFetching(false);
                        alert("位置情報の取得に失敗しました");
                      },
                      {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 0,
                      }
                    );
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    padding: 0,
                    borderRadius: 8,
                    border: "1px solid var(--card-border)",
                    background: gps ? "#eefaf1" : "#f9fafb",
                    color: "var(--fg)",
                    cursor: gpsFetching ? "wait" : "pointer",
                    opacity: gpsFetching ? 0.7 : 1,
                  }}
                >
                  <span className="icon" aria-hidden>
                    {gpsFetching ? (
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
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" />
                      </svg>
                    ) : (
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
                        <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
                        <circle cx="12" cy="11" r="2.5" />
                      </svg>
                    )}
                  </span>
                </button>
              </div>

              {/* きのこの名前 */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>
                    {t("mushroom_name")}
                  </div>
                  <button
                    className="btn-outline"
                    aria-label={t("ai_prediction")}
                    onClick={() => setShowAI(true)}
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      fontSize: 13,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h-1.5c-.28 0-.5.22-.5.5s.22.5.5.5H21v1h-1.5c-.28 0-.5.22-.5.5s.22.5.5.5H21v1h-1.5c-.28 0-.5.22-.5.5s.22.5.5.5H21a7 7 0 0 1-7 7h-1v-1.27c.6-.34 1-.99 1-1.73a2 2 0 0 0-4 0c0 .74.4 1.39 1 1.73V21h-1a7 7 0 0 1-7-7h1.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H3v-1h1.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H3v-1h1.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    </svg>
                    {t("ai_prediction")}
                  </button>
                </div>
                <div style={{ display: "grid", gap: 8, position: "relative" }}>
                  <input
                    type="text"
                    value={detail.mushroomName ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      pick("mushroomName", value as any);
                      setShowSuggestions(value.length > 0);
                    }}
                    onFocus={() => {
                      if ((detail.mushroomName ?? "").length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // 少し遅延させてクリックイベントを処理できるようにする
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder={t("mushroom_name_placeholder")}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--card-border)",
                      fontSize: 14,
                      background: "#fff",
                    }}
                  />
                  {/* オートコンプリート候補 */}
                  {showSuggestions && (detail.mushroomName ?? "").length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid var(--card-border)",
                        borderRadius: 8,
                        marginTop: 4,
                        maxHeight: 200,
                        overflowY: "auto",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        zIndex: 10,
                      }}
                    >
                      {mushroomSuggestions
                        .filter((name) => {
                          const normalizedName = normalizeForSearch(name);
                          const normalizedInput = normalizeForSearch(detail.mushroomName ?? "");
                          return normalizedName.includes(normalizedInput);
                        })
                        .map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              pick("mushroomName", name as any);
                              setShowSuggestions(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              textAlign: "left",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontSize: 14,
                              borderBottom: "1px solid #f0f0f0",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f9fafb";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {name}
                          </button>
                        ))}
                      {mushroomSuggestions.filter((name) => {
                        const normalizedName = normalizeForSearch(name);
                        const normalizedInput = normalizeForSearch(detail.mushroomName ?? "");
                        return normalizedName.includes(normalizedInput);
                      }).length === 0 && (
                        <div
                          style={{
                            padding: "10px 12px",
                            fontSize: 13,
                            color: "#999",
                            textAlign: "center",
                          }}
                        >
                          候補なし
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  alignItems: "start",
                }}
              >
                <Section title={t("cap_color_label")}>
                  <ChipGroup
                    value={detail.capColor}
                    options={CAP_COLORS}
                    onChange={(v) => pick("capColor", v)}
                    colorize
                  />
                  <MemoBox
                    value={detail.capNote ?? ""}
                    onChange={(v) => pick("capNote", v)}
                    placeholder={t("cap_note_placeholder")}
                  />
                </Section>
                <Section title={t("underside_label")}>
                  <ChipGroup
                    value={detail.undersideType}
                    options={UNDER_TYPES}
                    onChange={(v) => pick("undersideType", v)}
                  />
                  <MemoBox
                    value={detail.undersideNote ?? ""}
                    onChange={(v) => pick("undersideNote", v)}
                    placeholder={t("underside_note_placeholder")}
                  />
                </Section>
                <Section title={t("stipe_core_label")}>
                  <ChipGroup
                    value={detail.stipeCore}
                    options={STIPE_CORE}
                    onChange={(v) => pick("stipeCore", v)}
                  />
                  <MemoBox
                    value={detail.stipeNote ?? ""}
                    onChange={(v) => pick("stipeNote", v)}
                    placeholder={t("stipe_note_placeholder")}
                  />
                </Section>
                <Section title={t("ring_label")}>
                  <ChipGroup
                    value={detail.ring}
                    options={RING_OPTS}
                    onChange={(v) => pick("ring", v)}
                    withIcons
                  />
                  <MemoBox
                    value={detail.ringNote ?? ""}
                    onChange={(v) => pick("ringNote", v)}
                    placeholder={t("ring_note_placeholder")}
                  />
                </Section>
                <Section title={t("volva_label")}>
                  <ChipGroup
                    value={detail.volva}
                    options={YESNO}
                    onChange={(v) => pick("volva", v)}
                    withIcons
                  />
                  <MemoBox
                    value={detail.volvaNote ?? ""}
                    onChange={(v) => pick("volvaNote", v)}
                    placeholder={t("volva_note_placeholder")}
                  />
                </Section>
                <Section title={t("substrate_label")}>
                  <ChipGroup
                    value={detail.substrate}
                    options={SUBSTRATE}
                    onChange={(v) => pick("substrate", v)}
                  />
                  <MemoBox
                    value={detail.substrateNote ?? ""}
                    onChange={(v) => pick("substrateNote", v)}
                    placeholder={t("substrate_note_placeholder")}
                  />
                </Section>
                <Section title={t("habitat_label")}>
                  <ChipGroup
                    value={detail.habitat}
                    options={HABITAT}
                    onChange={(v) => pick("habitat", v)}
                  />
                  <MemoBox
                    value={detail.habitatNote ?? ""}
                    onChange={(v) => pick("habitatNote", v)}
                    placeholder={t("habitat_note_placeholder")}
                  />
                </Section>
                <Section title="">
                  <div
                    role="switch"
                    tabIndex={0}
                    aria-checked={detail.weirdShape ? true : false}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        pick("weirdShape", !detail.weirdShape as any);
                      }
                    }}
                    onClick={() => pick("weirdShape", !detail.weirdShape as any)}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--card-border)",
                      borderRadius: 8,
                      background: detail.weirdShape ? "#eefaf1" : "#f9fafb",
                      color: "var(--fg)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: "1.5px solid var(--card-border)",
                        background: detail.weirdShape ? "#22c55e" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {detail.weirdShape && (
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      )}
                    </span>
                    <span>{t("weird_shape_question")}</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                    {t("weird_shape_hint")}
                  </div>
                </Section>
              </div>
            </>
          )}
          {/* end of scrollable content */}
        </div>
      </div>
      {showAI && <AIPredictModal id={id} onClose={() => setShowAI(false)} />}
      {showOccurModal && (
        <div
          onClick={() => setShowOccurModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 90,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              color: "var(--fg)",
              width: "min(420px, 92vw)",
              maxHeight: "85vh",
              borderRadius: 12,
              boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              padding: 16,
              borderBottom: "1px solid var(--card-border)",
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {t("edit_capture_datetime")}
              </div>
              <button
                type="button"
                aria-label={showYearPicker ? "日付/時刻ビューへ" : "年ビュー"}
                title={showYearPicker ? "日付/時刻ビューへ" : "年ビュー"}
                onClick={() => setShowYearPicker((v) => !v)}
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  padding: 0,
                  borderRadius: 8,
                  border: "1px solid var(--card-border)",
                  background: showYearPicker ? "#eef2ff" : "#f9fafb",
                  color: "var(--fg)",
                  cursor: "pointer",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M8 2v4M16 2v4M3 10h18" />
                </svg>
              </button>
            </div>

            <div style={{ 
              padding: 16,
              overflowY: "auto",
              flex: showYearPicker ? 0 : 1,
              minHeight: showYearPicker ? 'auto' : 0,
            }}>
            {showYearPicker ? (
              <div>
                {(() => {
                  const base = tempDate || dtLocal(new Date()).slice(0, 10);
                  const d = new Date(base + "T" + (tempTime || "00:00"));
                  const [y, m, dd] = [
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate(),
                  ];
                  const applyYear = (yy: number) => {
                    const nd = new Date(yy, m, dd);
                    const yyyy = String(nd.getFullYear());
                    const mm = String(nd.getMonth() + 1).padStart(2, "0");
                    const ddp = String(nd.getDate()).padStart(2, "0");
                    const v = `${yyyy}-${mm}-${ddp}`;
                    setTempDate(v);
                    setOccurError(validateOccur(v, tempTime));
                  };
                  return (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <button
                          className="btn-outline"
                          onClick={() => applyYear(y - 1)}
                          aria-label="前年"
                          style={{ padding: "8px 16px" }}
                        >
                          ←
                        </button>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{y}年</div>
                        <button
                          className="btn-outline"
                          onClick={() => applyYear(y + 1)}
                          aria-label="翌年"
                          style={{ padding: "8px 16px" }}
                        >
                          →
                        </button>
                      </div>
                      <div
                        style={{ 
                          fontSize: 14, 
                          opacity: 0.75, 
                          textAlign: "center",
                          padding: "12px",
                          background: "#f9fafb",
                          borderRadius: 8,
                        }}
                      >
                        選択中: {String(m + 1).padStart(2, "0")}月{String(dd).padStart(2, "0")}日
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>日付</span>
                  <input
                    type="date"
                    value={tempDate}
                    max={dtLocal(new Date()).slice(0, 10)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTempDate(v);
                      setOccurError(validateOccur(v, tempTime));
                    }}
                    style={{
                      padding: "6px 8px",
                      border: "1px solid var(--card-border)",
                      borderRadius: 8,
                    }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>時刻</span>
                  <input
                    type="time"
                    value={tempTime}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTempTime(v);
                      setOccurError(validateOccur(tempDate, v));
                    }}
                    style={{
                      padding: "6px 8px",
                      border: "1px solid var(--card-border)",
                      borderRadius: 8,
                    }}
                  />
                </label>
                {occurError && (
                  <div style={{ color: "#dc2626", fontSize: 12 }}>
                    {occurError}
                  </div>
                )}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 14,
              }}
            >
              <button
                className="btn"
                onClick={() => setShowOccurModal(false)}
                style={{ background: "#f3f4f6", color: "var(--fg)" }}
              >
                {t("cancel")}
              </button>
              <button
                className="btn"
                disabled={!tempDate || !tempTime || !!occurError}
                onClick={() => {
                  const err = validateOccur(tempDate, tempTime);
                  if (err) {
                    setOccurError(err);
                    return;
                  }
                  const iso = `${tempDate}T${tempTime}`;
                  setOccurAtIso(iso);
                  setInputAtIso(iso);
                  setShowOccurModal(false);
                }}
              >
                {t("save")}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {showTerrainModal && (
        <div
          onClick={() => setShowTerrainModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 90,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 92vw)",
              background: "#fff",
              color: "var(--fg)",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t("terrain_section")}</div>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 700 }}>
                  {t("terrain_aspect_label")}
                </span>
                <div>
                  <ChipGroup
                    value={terrainAspect as any}
                    options={ASPECT_OPTS as any}
                    onChange={(v) => setTerrainAspect(v as string)}
                  />
                </div>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 700 }}>
                  {t("terrain_elevation_label")}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={terrainElevation}
                  onChange={(e) => setTerrainElevation(e.target.value)}
                  placeholder="850"
                  style={{
                    padding: "6px 8px",
                    border: "1px solid var(--card-border)",
                    borderRadius: 8,
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 700 }}>
                  {t("terrain_type_label")}
                </span>
                <div>
                  <ChipGroup
                    value={terrainType as any}
                    options={TERRAIN_TYPES as any}
                    onChange={(v) => setTerrainType(v as string)}
                  />
                </div>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 700 }}>
                  {t("terrain_note_label")}
                </span>
                <input
                  type="text"
                  value={terrainNote}
                  onChange={(e) => setTerrainNote(e.target.value)}
                  placeholder={t("terrain_note_placeholder")}
                  style={{
                    padding: "6px 8px",
                    border: "1px solid var(--card-border)",
                    borderRadius: 8,
                  }}
                />
              </label>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "end",
                gap: 8,
                marginTop: 14,
              }}
            >
              <button
                className="btn-outline"
                onClick={() => setShowTerrainModal(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="btn"
                onClick={() => setShowTerrainModal(false)}
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 画像登録完了モーダル */}
      {showPhotoAddedModal && (
        <div
          onClick={() => {
            setShowPhotoAddedModal(false);
            onSaved();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              color: "var(--fg)",
              borderRadius: 16,
              padding: "32px 24px",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              maxWidth: "90vw",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              登録完了
            </div>
            <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 24 }}>
              画像が追加されました
            </div>
            <button
              className="btn"
              onClick={() => {
                setShowPhotoAddedModal(false);
                onSaved();
              }}
              style={{
                background: "#10b981",
                color: "#fff",
                padding: "10px 24px",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      {/* Save button at fixed bottom right */}
      <button
        className="btn"
        onClick={handleSave}
        disabled={saving || loading}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 80,
          background: "var(--button)",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 999,
          fontWeight: 600,
          boxShadow: "var(--shadow)",
        }}
      >
        {saving ? t("saving") : t("save")}
      </button>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card"
      style={{
        border: "1px solid var(--card-border)",
        borderRadius: 10,
        padding: 10,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          marginBottom: 8,
          color: "var(--fg)",
          letterSpacing: 0.2,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ChipGroup<T extends string>({
  value,
  options,
  onChange,
  colorize,
  withIcons,
}: {
  value?: T;
  options: readonly T[];
  onChange: (v: T) => void;
  colorize?: boolean;
  withIcons?: boolean;
}) {
  const colorMap: Record<string, string> = {
    red: "#ef4444",
    pink: "#ec4899",
    orange: "#f59e0b",
    yellow: "#eab308",
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#a855f7",
    brown: "#8b5e3c",
    gray: "#9ca3af",
    black: "#1f2937",
    white: "#f3f4f6",
  };
  const icon = (op: string) => {
    if (!withIcons) return "";
    if (op === "present") return "✔";
    if (op === "absent") return "✖";
    return "";
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((op) => {
        const bg =
          colorize && colorMap[String(op)] ? colorMap[String(op)] : undefined;
        const sel = value === op;
        return (
          <button
            key={op}
            onClick={() => onChange(sel ? undefined as any : op)}
            style={{
              padding: "6px 8px",
              borderRadius: 999,
              border: "1px solid var(--card-border)",
              background: bg
                ? sel
                  ? bg
                  : `${bg}33`
                : sel
                ? "#f5f5f5"
                : "transparent",
              color: bg
                ? String(op) === "white"
                  ? "#111"
                  : "#fff"
                : sel
                ? "#111"
                : "var(--fg)",
              fontSize: 13,
              boxShadow: sel ? "0 0 0 2px rgba(0,0,0,0.06) inset" : undefined,
            }}
          >
            {icon(String(op))} {getLabel(String(op))}
          </button>
        );
      })}
    </div>
  );
}

function MemoBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        marginTop: 6,
        background: "rgba(255,255,255,0.92)",
        color: "var(--fg)",
        border: "1px solid var(--card-border)",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 14,
      }}
    />
  );
}
