import React from "react";
import { db, type Row } from "../utils/db";
import { DetailForm } from "./DetailForm";
import { getLabel } from "./labels";
import { SearchView } from "./SearchView";
import AIPredictModal from "./AIPredictModal";
import { t } from "../i18n";

export function ZukanView() {
  const [items, setItems] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [previewRow, setPreviewRow] = React.useState<Row | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [showAIPredict, setShowAIPredict] = React.useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = React.useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showMapModal, setShowMapModal] = React.useState(false);
  const [mapGPS, setMapGPS] = React.useState<{ lat: number; lon: number } | null>(null);
  const [sort, setSort] = React.useState<"newest" | "oldest" | "name">(() => {
    const v = localStorage.getItem("zukan.sort");
    return (v as any) || "newest";
  });
  const [q, setQ] = React.useState<string>(
    () => localStorage.getItem("zukan.q") || ""
  );
  const [showZukanSearch, setShowZukanSearch] = React.useState<boolean>(false);

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
    
    // 詳細を開くイベントを処理
    const handleOpenRecordDetail = (e: CustomEvent) => {
      const id = e.detail?.id;
      if (id) {
        setEditId(id);
      }
    };
    window.addEventListener('open-record-detail', handleOpenRecordDetail as any);
    return () => {
      window.removeEventListener('open-record-detail', handleOpenRecordDetail as any);
    };
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("zukan.sort", sort);
    } catch {}
  }, [sort]);
  React.useEffect(() => {
    try {
      localStorage.setItem("zukan.q", q);
    } catch {}
  }, [q]);

  const getName = (it: Row) =>
    (it as any).meta?.detail?.mushroomName?.trim?.() || "";
  // Normalize string for search/sort: NFKC + Katakana->Hiragana + lower-case
  const nk = (s?: string) => {
    if (!s) return "";
    const n = s.normalize("NFKC");
    let out = "";
    for (let i = 0; i < n.length; i++) {
      const code = n.charCodeAt(i);
      // Katakana range U+30A1..U+30F6 -> Hiragana by -0x60
      if (code >= 0x30a1 && code <= 0x30f6) {
        out += String.fromCharCode(code - 0x60);
      } else {
        out += n[i];
      }
    }
    return out.toLocaleLowerCase();
  };

  const filteredSorted = React.useMemo(() => {
    const term = nk(q.trim());
    let arr = items;
    if (term) {
      arr = arr.filter((it) => nk(getName(it)).includes(term));
    }
    const out = [...arr];
    if (sort === "name") {
      out.sort((a, b) => {
        const na = nk(getName(a));
        const nb = nk(getName(b));
        if (!na && !nb) return 0;
        if (!na) return 1; // 空は後ろ
        if (!nb) return -1;
        return na.localeCompare(nb);
      });
    } else if (sort === "oldest") {
      out.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else {
      // newest
      out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return out;
  }, [items, sort, q]);

  // load selected for preview
  React.useEffect(() => {
    if (!previewId) return;
    setPreviewLoading(true);
    setPreviewRow(null);
    setCurrentPhotoIndex(0);
    db.getRaw(previewId)
      .then((r) => setPreviewRow(r))
      .finally(() => setPreviewLoading(false));
  }, [previewId]);


  if (loading) return <div>{t("loading")}</div>;
  if (!items.length)
    return (
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {t("encyclopedia_title")}
        </div>
        <div style={{ opacity: 0.85 }}>{t("no_records_yet")}</div>
      </div>
    );

  const noMatch = filteredSorted.length === 0 && q.trim().length > 0;

  return (
    <div>
      {/* controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1f2937" }}>{t("encyclopedia_title")}</div>
        <div style={{ fontSize: 13, opacity: 0.65 }}>
          {t("saved_records")}
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="icon-btn"
          aria-label={t("advanced_search")}
          title={t("advanced_search")}
          onClick={() => setShowZukanSearch(true)}
          style={{
            border: "1px solid var(--card-border)",
            borderRadius: 8,
            width: 36,
            height: 36,
            display: "grid",
            placeItems: "center",
            padding: 0,
          }}
        >
          <span className="icon" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-3.2-3.2" />
            </svg>
          </span>
        </button>
      </div>

      {noMatch ? (
        <div className="card" style={{ padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            {t("no_matching_records")}
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.8 }}>{t("sort_order")}</div>
            <select
              aria-label={t("sort_order")}
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              style={{
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid #ddd",
              }}
            >
              <option value="newest">{t("newest_first")}</option>
              <option value="oldest">{t("oldest_first")}</option>
              <option value="name">{t("by_name")}</option>
            </select>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 12,
              marginTop: 8,
            }}
          >
            {filteredSorted.map((it) => (
              <button
                key={it.id}
                onClick={() => setPreviewId(it.id)}
                className="card"
                style={{
                  padding: 8,
                  textAlign: "left",
                  cursor: "pointer",
                  position: "relative",
                }}
                aria-label={t("preview_record")}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
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
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                  {getName(it) ? (
                    <div style={{ fontSize: 12, opacity: 0.9, flex: 1 }}>
                      {getName(it)}
                    </div>
                  ) : <div style={{ flex: 1 }} />}
                  {/* GPS アイコン */}
                  {((it.meta as any)?.gps?.lat && (it.meta as any)?.gps?.lon) && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const gps = (it.meta as any).gps;
                        window.open(
                          `https://www.google.com/maps?q=${gps.lat},${gps.lon}`,
                          '_blank'
                        );
                      }}
                      style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: 4,
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        width: 24,
                        height: 24,
                      }}
                      title="地図で見る"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          const gps = (it.meta as any).gps;
                          window.open(
                            `https://www.google.com/maps?q=${gps.lat},${gps.lon}`,
                            '_blank'
                          );
                        }
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewId && (
        <div
          onClick={() => setPreviewId(null)}
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
              maxWidth: 520,
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              maxHeight: "calc(100vh - 80px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--card-border)",
                flexShrink: 0,
              }}
            >
              <div style={{ fontWeight: 600 }}>{t("mushroom_record")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-outline"
                  onClick={() => setShowAIPredict(true)}
                  aria-label={t("ai_prediction")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
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
                <button
                  className="btn"
                  onClick={() => {
                    setEditId(previewId);
                    setPreviewId(null);
                  }}
                  aria-label={t("edit")}
                  style={{
                    background: "#d1fae5",
                    color: "#065f46",
                  }}
                >
                  {t("edit")}
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setPreviewId(null)}
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
            </div>
            <div style={{ 
              padding: 16, 
              display: "grid", 
              gap: 16,
              overflowY: "auto",
              flex: 1,
            }}>
              {previewLoading ? (
                <div>{t("loading")}</div>
              ) : previewRow ? (
                <div style={{ display: "grid", gap: 16 }}>
                  {(() => {
                    const allPhotos = [previewRow.photoUrl, ...((previewRow as any).extraUrls || [])];
                    const currentPhoto = allPhotos[currentPhotoIndex] || previewRow.photoUrl;
                    const isExtraPhoto = currentPhotoIndex > 0;
                    
                    return (
                      <div>
                        <div style={{ position: "relative" }}>
                          <img
                            src={currentPhoto}
                            alt=""
                            style={{ 
                              width: "100%", 
                              height: "auto", 
                              borderRadius: 10,
                              touchAction: "pan-y",
                              boxShadow: allPhotos.length > 1 ? "0 0 0 3px rgba(34, 197, 94, 0.3)" : undefined,
                            }}
                            onTouchStart={(e) => {
                              const touch = e.touches[0];
                              (e.currentTarget as any)._startX = touch.clientX;
                            }}
                            onTouchEnd={(e) => {
                              const touch = e.changedTouches[0];
                              const startX = (e.currentTarget as any)._startX;
                              if (startX === undefined) return;
                              const diff = touch.clientX - startX;
                              if (Math.abs(diff) > 50) {
                                if (diff > 0 && currentPhotoIndex > 0) {
                                  setCurrentPhotoIndex(currentPhotoIndex - 1);
                                } else if (diff < 0 && currentPhotoIndex < allPhotos.length - 1) {
                                  setCurrentPhotoIndex(currentPhotoIndex + 1);
                                }
                              }
                            }}
                          />
                          {allPhotos.length > 1 && (
                            <>
                              <div
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: 10,
                                  transform: "translateY(-50%)",
                                  background: currentPhotoIndex > 0 ? "rgba(34, 197, 94, 0.9)" : "rgba(0,0,0,0.3)",
                                  color: "#fff",
                                  width: 40,
                                  height: 40,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  fontSize: 20,
                                  fontWeight: "bold",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                  transition: "all 0.2s",
                                  pointerEvents: currentPhotoIndex > 0 ? "auto" : "none",
                                }}
                                onClick={() => currentPhotoIndex > 0 && setCurrentPhotoIndex(currentPhotoIndex - 1)}
                              >
                                ‹
                              </div>
                              <div
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  right: 10,
                                  transform: "translateY(-50%)",
                                  background: currentPhotoIndex < allPhotos.length - 1 ? "rgba(34, 197, 94, 0.9)" : "rgba(0,0,0,0.3)",
                                  color: "#fff",
                                  width: 40,
                                  height: 40,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  fontSize: 20,
                                  fontWeight: "bold",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                  transition: "all 0.2s",
                                  pointerEvents: currentPhotoIndex < allPhotos.length - 1 ? "auto" : "none",
                                }}
                                onClick={() => currentPhotoIndex < allPhotos.length - 1 && setCurrentPhotoIndex(currentPhotoIndex + 1)}
                              >
                                ›
                              </div>
                              <div
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  right: 10,
                                  background: "rgba(34, 197, 94, 0.9)",
                                  color: "#fff",
                                  padding: "6px 12px",
                                  borderRadius: 20,
                                  fontSize: 13,
                                  backdropFilter: "blur(8px)",
                                  fontWeight: 600,
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                }}
                              >
                                {currentPhotoIndex + 1} / {allPhotos.length}
                              </div>
                            </>
                          )}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 10,
                              right: 10,
                              background: "rgba(0,0,0,0.75)",
                              color: "#fff",
                              padding: "6px 10px",
                              borderRadius: 8,
                              fontSize: 12,
                              backdropFilter: "blur(8px)",
                              fontWeight: 500,
                            }}
                          >
                            {new Date(
                              (previewRow.meta as any)?.occurAt || 
                              (previewRow.meta as any)?.capturedAt || 
                              (previewRow.meta as any)?.shotAt || 
                              previewRow.createdAt
                            ).toLocaleString()}
                          </div>
                        </div>
                        
                        {/* 削除ボタン */}
                        {allPhotos.length > 1 && isExtraPhoto && (
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "flex-end",
                            marginTop: 8,
                          }}>
                            {isExtraPhoto && (
                              <button
                                className="btn-outline"
                                onClick={async () => {
                                  if (!confirm(t("delete_warning"))) return;
                                  try {
                                    await db.removeExtraPhoto(previewId!, currentPhotoIndex - 1);
                                    setCurrentPhotoIndex(0);
                                    await reload();
                                    const updated = await db.getRaw(previewId!);
                                    setPreviewRow(updated);
                                  } catch (err: any) {
                                    alert("削除に失敗しました: " + (err?.message ?? String(err)));
                                  }
                                }}
                                style={{
                                  fontSize: 11,
                                  padding: "4px 8px",
                                  color: "#dc2626",
                                  borderColor: "#dc2626",
                                }}
                              >
                                {t("delete_image")}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {(() => {
                    const d = (previewRow as any).meta?.detail || {};
                    const sections: { title: string; items: { label: string; value: string; memo?: string }[]; hasDeleteButton?: boolean }[] = [];
                    
                    // きのこの名前
                    if (d.mushroomName) {
                      sections.push({
                        title: t("mushroom_name"),
                        items: [{ label: "", value: d.mushroomName }],
                      });
                    }
                    
                    // 基本情報
                    const basicItems: { label: string; value: string; memo?: string }[] = [];
                    if (d.capColor) basicItems.push({ label: t("cap_color"), value: getLabel(d.capColor), memo: d.capNote });
                    if (d.undersideType) basicItems.push({ label: t("underside"), value: getLabel(d.undersideType), memo: d.undersideNote });
                    if (d.stipeCore) basicItems.push({ label: t("stipe"), value: getLabel(d.stipeCore), memo: d.stipeNote });
                    if (d.ring) basicItems.push({ label: t("ring"), value: getLabel(d.ring), memo: d.ringNote });
                    if (d.volva) basicItems.push({ label: t("volva"), value: getLabel(d.volva), memo: d.volvaNote });
                    if (d.weirdShape) basicItems.push({ label: "", value: `✓ ${t("weird_shape_mushroom")}`, memo: "weirdShapeCheckbox" });
                    if (basicItems.length) sections.push({ title: t("characteristics"), items: basicItems });
                    
                    // 環境情報
                    const envItems: { label: string; value: string; memo?: string }[] = [];
                    if (d.substrate) envItems.push({ label: t("growth_pattern"), value: getLabel(d.substrate), memo: d.substrateNote });
                    if (d.habitat) envItems.push({ label: t("habitat"), value: getLabel(d.habitat), memo: d.habitatNote });
                    if (envItems.length) sections.push({ title: t("environment"), items: envItems });
                    
                    // 地形情報
                    const terrainItems: { label: string; value: string; memo?: string }[] = [];
                    if (d.terrainAspect) terrainItems.push({ label: t("direction"), value: d.terrainAspect });
                    if (d.terrainElevation) terrainItems.push({ label: t("elevation"), value: `${d.terrainElevation}m` });
                    if (d.terrainType) terrainItems.push({ label: t("terrain_type"), value: getLabel(d.terrainType) });
                    if (d.terrainNote) terrainItems.push({ label: t("memo"), value: d.terrainNote });
                    if (terrainItems.length) sections.push({ title: t("terrain"), items: terrainItems });
                    
                    // GPS情報
                    const gps = (previewRow as any).meta?.gps;
                    if (gps?.lat && gps?.lon) {
                      sections.push({
                        title: "📍 GPS情報",
                        items: [
                          { 
                            label: "座標", 
                            value: `${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}`,
                            memo: "map-link"
                          }
                        ],
                      });
                    }
                    
                    // AI判定結果
                    const aiData = (previewRow as any).meta?.ai;
                    if (aiData && aiData.candidates && aiData.candidates.length > 0) {
                      const aiItems = aiData.candidates.slice(0, 3).map((c: any, idx: number) => ({
                        label: `${t("candidate")} ${idx + 1}`,
                        value: `${c.name} (${(c.confidence * 100).toFixed(0)}%)`,
                        memo: c.rationale,
                      }));
                      sections.push({ 
                        title: t("ai_result"), 
                        items: aiItems,
                        hasDeleteButton: true,
                      });
                    }
                    
                    // その他のメモ
                    if (d.note) {
                      sections.push({
                        title: t("other_notes"),
                        items: [{ label: "", value: d.note }],
                      });
                    }
                    
                    return sections.length ? (
                      <div style={{ display: "grid", gap: 16 }}>
                        {sections.map((section, i) => (
                          <div key={i} style={{ display: "grid", gap: 8 }}>
                            {section.title && (
                              <div style={{ 
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontSize: 13, 
                                fontWeight: 700, 
                                color: "#059669",
                                borderBottom: "2px solid #d1fae5",
                                paddingBottom: 4,
                              }}>
                                <span>{section.title}</span>
                                {section.hasDeleteButton && (
                                  <button
                                    className="btn-outline"
                                    onClick={async () => {
                                      if (!confirm("AI判定結果を削除しますか？")) return;
                                      try {
                                        const currentMeta = (previewRow as any).meta || {};
                                        const { ai, ...restMeta } = currentMeta;
                                        await db.update(previewId!, { meta: restMeta });
                                        await reload();
                                        const updated = await db.getRaw(previewId!);
                                        setPreviewRow(updated);
                                      } catch (err: any) {
                                        alert("削除に失敗しました: " + (err?.message ?? String(err)));
                                      }
                                    }}
                                    style={{
                                      fontSize: 10,
                                      padding: "3px 6px",
                                      color: "#ef4444",
                                      borderColor: "#fca5a5",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 3,
                                      opacity: 0.8,
                                    }}
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      width="12"
                                      height="12"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    {t("delete_ai_result")}
                                  </button>
                                )}
                              </div>
                            )}
                            <div style={{ display: "grid", gap: 8 }}>
                              {section.items.map((item, j) => (
                                <div key={j} style={{ display: "grid", gap: 4 }}>
                                  <div style={{ display: "flex", gap: 10, fontSize: 14, alignItems: "center" }}>
                                    {item.label && (
                                      <div style={{ 
                                        minWidth: 80, 
                                        opacity: 0.7,
                                        fontSize: 13,
                                        fontWeight: 500,
                                      }}>
                                        {item.label}
                                      </div>
                                    )}
                                    {item.memo === "weirdShapeCheckbox" ? (
                                      <div style={{ 
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}>
                                        <div style={{
                                          width: 14,
                                          height: 14,
                                          borderRadius: 3,
                                          border: "1.5px solid #d1d5db",
                                          background: "#f9fafb",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          flexShrink: 0,
                                        }}>
                                          <svg
                                            viewBox="0 0 24 24"
                                            width="10"
                                            height="10"
                                            fill="none"
                                            stroke="#6b7280"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                        </div>
                                        <span style={{ fontSize: 13, opacity: 0.7 }}>
                                          {t("weird_shape_mushroom")}
                                        </span>
                                      </div>
                                    ) : item.memo === "map-link" ? (
                                      <button
                                        onClick={() => {
                                          const gps = (previewRow as any).meta?.gps;
                                          if (gps?.lat && gps?.lon) {
                                            setMapGPS({ lat: gps.lat, lon: gps.lon });
                                            setShowMapModal(true);
                                          }
                                        }}
                                        style={{
                                          fontWeight: 600,
                                          fontSize: 14,
                                          color: '#667eea',
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          textDecoration: 'underline',
                                          padding: 0,
                                        }}
                                      >
                                        {item.value} 📍
                                      </button>
                                    ) : (
                                      <div style={{ 
                                        fontWeight: item.label ? 400 : 600,
                                        fontSize: 14,
                                      }}>
                                        {item.value || "(未入力)"}
                                      </div>
                                    )}
                                  </div>
                                  {item.memo && item.memo !== "weirdShapeCheckbox" && (
                                    <div style={{ 
                                      fontSize: 12, 
                                      opacity: 0.75,
                                      paddingLeft: item.label ? 90 : 0,
                                      fontStyle: "italic",
                                      color: "#6b7280",
                                    }}>
                                      💬 {item.memo}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ 
                        opacity: 0.7,
                        textAlign: "center",
                        padding: "20px 0",
                        fontSize: 14,
                      }}>
                        {t("no_details_yet")}
                      </div>
                    );
                  })()}
                  
                  {/* 削除ボタン */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <button
                      className="btn-outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        color: "#dc2626",
                        borderColor: "#dc2626",
                      }}
                    >
                      {t("delete_this_record")}
                    </button>
                  </div>
                </div>
              ) : (
                <div>{t("record_not_found")}</div>
              )}
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
            // Avoid header overlap on small screens
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
                setPreviewId(null);
              }}
            />
          </div>
        </div>
      )}
      
      {/* 削除確認モーダル */}
      {showDeleteConfirm && previewId && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
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
              borderRadius: 12,
              padding: 24,
              maxWidth: "90vw",
              width: "min(400px, 90vw)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              {t("delete_confirmation")}
            </div>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 24 }}>
              {t("delete_warning")}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                className="btn-outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await db.delete(previewId);
                    setShowDeleteConfirm(false);
                    setPreviewId(null);
                    await reload();
                  } catch (err: any) {
                    alert("削除に失敗しました: " + (err?.message ?? String(err)));
                  }
                }}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                }}
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 詳細検索モーダル */}
      {showZukanSearch && (
        <div
          onClick={() => setShowZukanSearch(false)}
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
              maxWidth: 720,
              width: "100%",
              borderRadius: 12,
              maxHeight: "calc(100vh - 96px)",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 12,
                borderBottom: "1px solid var(--card-border)",
              }}
            >
              <div style={{ fontWeight: 700 }}>{t("advanced_search")}</div>
              <button
                className="icon-btn"
                aria-label={t("close")}
                title={t("close")}
                onClick={() => setShowZukanSearch(false)}
                style={{ marginLeft: "auto" }}
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
            <div style={{ padding: 12 }}>
              <SearchView />
            </div>
          </div>
        </div>
      )}
      
      {/* AI判定モーダル */}
      {showAIPredict && previewId && (
        <AIPredictModal
          id={previewId}
          onClose={() => setShowAIPredict(false)}
        />
      )}
      
      {/* 地図モーダル */}
      {showMapModal && mapGPS && (
        <div
          onClick={() => setShowMapModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>📍 観察地点</h3>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 12, fontSize: 14, color: '#666' }}>
                座標: {mapGPS.lat.toFixed(6)}, {mapGPS.lon.toFixed(6)}
              </div>
              <iframe
                width="100%"
                height="400"
                style={{ border: 0, borderRadius: 8 }}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapGPS.lon-0.01},${mapGPS.lat-0.01},${mapGPS.lon+0.01},${mapGPS.lat+0.01}&layer=mapnik&marker=${mapGPS.lat},${mapGPS.lon}`}
              />
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${mapGPS.lat}&mlon=${mapGPS.lon}#map=15/${mapGPS.lat}/${mapGPS.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  OpenStreetMapで開く →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
