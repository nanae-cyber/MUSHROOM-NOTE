import React, { useEffect, useState } from "react";
import { db, type Row } from "../utils/db";
import { DetailForm } from "./DetailForm";
import AIPredictModal from "./AIPredictModal";

// 日本語ラベル
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

export default function SpecimenList() {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [aiId, setAiId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const reload = async () => {
    const list = await db.list();
    setRows(list);
  };

  useEffect(() => {
    (async () => {
      try {
        const rows = await db.list(); // ← ★ db.list() → list()
        setItems(rows);
      } finally {
        setLoading(false);
      }
    })();
    reload();
  }, []);

  if (loading) return <div>読み込み中…</div>;
  if (!items.length) return <div>まだ保存されたきのこはありません</div>;

  return (
    <>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((it) => (
          <div key={it.id} style={{ border: "1px solid #555", padding: 8 }}>
            <img
              src={it.photoUrl}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 8,
                cursor: "zoom-in",
              }}
              alt=""
              onClick={() => setLightboxUrl(it.photoUrl)}
            />
            {it.extraUrls?.length ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
                  marginTop: 8,
                }}
              >
                {it.extraUrls.map((u: string, idx: number) => (
                  <div key={idx} style={{ position: "relative" }}>
                    <img
                      src={u}
                      alt=""
                      style={{
                        width: "100%",
                        height: "auto",
                        borderRadius: 6,
                        cursor: "zoom-in",
                      }}
                      onClick={() => setLightboxUrl(u)}
                    />
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await db.removeExtraPhoto(it.id, idx);
                        await reload();
                      }}
                      title="削除"
                      style={{
                        position: "absolute",
                        right: 4,
                        top: 4,
                        background: "#000a",
                        color: "#fff",
                        border: "1px solid #444",
                        borderRadius: 6,
                        fontSize: 12,
                        padding: "2px 6px",
                      }}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {new Date(it.createdAt).toLocaleString()}
            </div>

            {/* 既存のメタがあれば抜粋表示 */}
            {it.meta?.detail && (
              <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>
                <div>傘の色: {labelJP(it.meta.detail.capColor) || "—"}</div>
                <div>
                  傘の裏: {labelJP(it.meta.detail.undersideType) || "—"}
                </div>
                <div>柄: {labelJP(it.meta.detail.stipeCore) || "—"}</div>
                <div>つば: {labelJP(it.meta.detail.ring) || "—"}</div>
                <div>つぼ: {labelJP(it.meta.detail.volva) || "—"}</div>
                <div>生え方: {labelJP(it.meta.detail.substrate) || "—"}</div>
                <div>環境: {labelJP(it.meta.detail.habitat) || "—"}</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn-outline" onClick={() => setEditId(it.id)}>
                詳細を追加/編集
              </button>

              <button className="btn" onClick={() => setAiId(it.id)}>
                AI判定
              </button>
            </div>
          </div>
        ))}
      </div>

      {aiId && <AIPredictModal id={aiId} onClose={() => setAiId(null)} />}
      {/* 簡易モーダル */}
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
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "transparent", borderRadius: 12 }}
          >
            <DetailForm
              id={editId}
              onClose={() => setEditId(null)}
              onSaved={reload}
            />
          </div>
        </div>
      )}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.85)",
            display: "grid",
            placeItems: "center",
            zIndex: 80,
          }}
        >
          <img
            src={lightboxUrl}
            alt="preview"
            style={{ maxWidth: "95vw", maxHeight: "90vh", borderRadius: 8 }}
          />
        </div>
      )}
    </>
  );
}
