// src/ui/SpecimenCard.tsx
import React from "react";
import type { Row } from "../utils/db";
import { shortLatLon, timeAgo } from "../utils/format";

// 日本語ラベル変換
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

type Props = {
  it: Row;
  onOpen?: (r: Row) => void; // 省略可：渡せばカードクリックで詳細を開ける
};

export default function SpecimenCard({ it, onOpen }: Props) {
  const lat = it.meta?.lat as number | undefined;
  const lon = it.meta?.lon as number | undefined;
  const heading = it.meta?.heading as number | undefined;

  // AI候補（あれば先頭3件）
  const cands = (it.meta?.ai as any)?.candidates as
    | { name: string; confidence?: number; rationale?: string }[]
    | undefined;

  const Container: React.ElementType = onOpen ? "button" : "div";

  return (
    <Container
      className="specimen-card"
      onClick={onOpen ? () => onOpen(it) : undefined}
      style={{
        textAlign: "left",
        background: "var(--card-bg, #111)",
        border: "1px solid var(--card-border, #333)",
        borderRadius: 12,
        padding: 12,
        width: "100%",
      }}
    >
      {/* サムネイル */}
      <div className="thumb" style={{ position: "relative", marginBottom: 8 }}>
        {it.photoUrl ? (
          <img
            src={it.photoUrl}
            alt=""
            style={{ width: "100%", height: "auto", borderRadius: 8 }}
          />
        ) : (
          <div
            style={{
              height: 160,
              borderRadius: 8,
              background: "#222",
              display: "grid",
              placeItems: "center",
              color: "#888",
            }}
          >
            No Photo
          </div>
        )}

        {/* 小さなチップ */}
        <span
          className="chip view"
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            background: "#000a",
            color: "#fff",
            fontSize: 12,
            padding: "2px 6px",
            borderRadius: 6,
          }}
        >
          {it.view ?? "cap"}
        </span>
        <span
          className="chip time"
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            background: "#000a",
            color: "#fff",
            fontSize: 12,
            padding: "2px 6px",
            borderRadius: 6,
          }}
        >
          {timeAgo(it.createdAt)}
        </span>
      </div>

      {/* メタ情報 */}
      <div className="meta" style={{ display: "grid", gap: 6 }}>
        {/* AI 推定 */}
        {cands?.length ? (
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>AI 推定</div>
            <ul style={{ margin: "0 0 0 16px" }}>
              {cands.slice(0, 3).map((c, i) => (
                <li key={i}>
                  {c.name}
                  {"（"}
                  {Math.round((c.confidence ?? 0) * 100)}%{"）"}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>AI 推定: pending</div>
        )}

        {/* 位置情報 */}
        <div className="row small" style={{ fontSize: 12, opacity: 0.9 }}>
          <span className="label" style={{ fontWeight: 600, marginRight: 6 }}>
            Geo
          </span>
          <span className="val">
            {shortLatLon(lat, lon)}
            {typeof heading === "number" ? ` · ${heading}°` : ""}
          </span>
        </div>

        {/* 傘の色・環境（簡易表示） */}
        {it.meta?.detail && (
          <div style={{ marginTop: 8 }}>
            <div>傘の色: {labelJP(it.meta.detail.capColor)}</div>
            <div>環境: {labelJP(it.meta.detail.habitat)}</div>
          </div>
        )}
      </div>
    </Container>
  );
}
