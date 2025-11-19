import React from "react";
import { db, type Row } from "../utils/db";
import { DetailForm } from "./DetailForm";
import { labelJP, getLabel } from "./labels";
import { t } from "../i18n";

export function SearchView() {
  const [items, setItems] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [previewRow, setPreviewRow] = React.useState<Row | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [sort, setSort] = React.useState<"newest" | "oldest" | "name">(() => {
    const v = localStorage.getItem("search.sort");
    return (v as any) || "newest";
  });
  const [q, setQ] = React.useState<string>(
    () => localStorage.getItem("search.q") || ""
  );

  const [capColor, setCapColor] = React.useState<string>(
    () => localStorage.getItem("search.f.capColor") || ""
  );
  const [terrainAspectF, setTerrainAspectF] = React.useState<string>(
    () => localStorage.getItem("search.f.terrainAspect") || ""
  );
  const [terrainElevationF, setTerrainElevationF] = React.useState<string>(
    () => localStorage.getItem("search.f.terrainElevation") || ""
  );
  const [terrainTypeF, setTerrainTypeF] = React.useState<string>(
    () => localStorage.getItem("search.f.terrainType") || ""
  );
  const [showTerrain, setShowTerrain] = React.useState<boolean>(false);
  const [showTerrainDetail, setShowTerrainDetail] =
    React.useState<boolean>(false);
  const [aspectChip, setAspectChip] = React.useState<string>("");
  const [elevBucket, setElevBucket] = React.useState<string>("");
  const [typeChip, setTypeChip] = React.useState<string>("");
  const [undersideType, setUndersideType] = React.useState<string>(
    () => localStorage.getItem("search.f.undersideType") || ""
  );
  const [stipeCore, setStipeCore] = React.useState<string>(
    () => localStorage.getItem("search.f.stipeCore") || ""
  );
  const [ring, setRing] = React.useState<string>(
    () => localStorage.getItem("search.f.ring") || ""
  );
  const [volva, setVolva] = React.useState<string>(
    () => localStorage.getItem("search.f.volva") || ""
  );
  const [substrate, setSubstrate] = React.useState<string>(
    () => localStorage.getItem("search.f.substrate") || ""
  );
  const [habitat, setHabitat] = React.useState<string>(
    () => localStorage.getItem("search.f.habitat") || ""
  );
  const [weirdShape, setWeirdShape] = React.useState<string>(
    () => localStorage.getItem("search.f.weirdShape") || ""
  );

  const optsCapColor: { value: string; label: string }[] = [
    { value: "", label: t("no_filter") },
    { value: "red", label: getLabel("red") },
    { value: "purple", label: getLabel("purple") },
    { value: "white", label: getLabel("white") },
    { value: "yellow", label: getLabel("yellow") },
    { value: "brown", label: getLabel("brown") },
    { value: "black", label: getLabel("black") },
    { value: "gray", label: getLabel("gray") },
    { value: "orange", label: getLabel("orange") },
    { value: "green", label: getLabel("green") },
    { value: "blue", label: getLabel("blue") },
    { value: "pink", label: getLabel("pink") },
    { value: "other", label: getLabel("other") },
  ];
  const optsUnderside = [
    { value: "", label: t("no_filter") },
    { value: "gills", label: getLabel("gills") },
    { value: "pores", label: getLabel("pores") },
    { value: "spines", label: getLabel("spines") },
    { value: "ridges", label: getLabel("ridges") },
    { value: "other", label: getLabel("other") },
  ];
  const optsStipe = [
    { value: "", label: t("no_filter") },
    { value: "hollow", label: getLabel("hollow") },
    { value: "solid", label: getLabel("solid") },
    { value: "none", label: getLabel("none") },
  ];
  const optsPresentAbsent = [
    { value: "", label: t("no_filter") },
    { value: "present", label: getLabel("present") },
    { value: "absent", label: getLabel("absent") },
  ];
  const optsRing = [
    { value: "", label: t("no_filter") },
    { value: "present", label: getLabel("present") },
    { value: "absent", label: getLabel("absent") },
    { value: "cortina", label: getLabel("cortina") },
  ];
  const optsSubstrate = [
    { value: "", label: t("no_filter") },
    { value: "deadwood", label: getLabel("deadwood") },
    { value: "downed", label: getLabel("downed") },
    { value: "live", label: getLabel("live") },
    { value: "soil", label: getLabel("soil") },
    { value: "other", label: getLabel("other") },
  ];
  const optsHabitat = [
    { value: "", label: t("no_filter") },
    { value: "broadleaf", label: getLabel("broadleaf") },
    { value: "conifer", label: getLabel("conifer") },
    { value: "mixed", label: getLabel("mixed") },
    { value: "bamboo", label: getLabel("bamboo") },
    { value: "park", label: getLabel("park") },
    { value: "other", label: getLabel("other") },
  ];

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
      localStorage.setItem("search.sort", sort);
    } catch {}
  }, [sort]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.q", q);
    } catch {}
  }, [q]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.capColor", capColor);
    } catch {}
  }, [capColor]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.undersideType", undersideType);
    } catch {}
  }, [undersideType]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.stipeCore", stipeCore);
    } catch {}
  }, [stipeCore]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.ring", ring);
    } catch {}
  }, [ring]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.volva", volva);
    } catch {}
  }, [volva]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.substrate", substrate);
    } catch {}
  }, [substrate]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.habitat", habitat);
    } catch {}
  }, [habitat]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.terrainAspect", terrainAspectF);
    } catch {}
  }, [terrainAspectF]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.terrainElevation", terrainElevationF);
    } catch {}
  }, [terrainElevationF]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.terrainType", terrainTypeF);
    } catch {}
  }, [terrainTypeF]);
  React.useEffect(() => {
    try {
      localStorage.setItem("search.f.weirdShape", weirdShape);
    } catch {}
  }, [weirdShape]);

  const getName = (it: Row) =>
    (it as any).meta?.detail?.mushroomName?.trim?.() || "";
  const nk = (s?: string) => {
    if (!s) return "";
    const n = s.normalize("NFKC");
    let out = "";
    for (let i = 0; i < n.length; i++) {
      const code = n.charCodeAt(i);
      if (code >= 0x30a1 && code <= 0x30f6)
        out += String.fromCharCode(code - 0x60);
      else out += n[i];
    }
    return out.toLocaleLowerCase();
  };

  const getElevationMeters = (raw: any): number | null => {
    if (!raw) return null;
    const m = String(raw).match(/(\d{1,5})/);
    if (!m) return null;
    return Number(m[1]);
  };

  const inBucket = (n: number | null, bucket: string): boolean => {
    if (bucket === "" || !bucket) return true;
    if (n == null || isNaN(n)) return false;
    const [a, b] = bucket.split("-");
    if (bucket.endsWith("+")) return n >= Number(bucket.replace("+", ""));
    const lo = Number(a);
    const hi = Number(b);
    return n >= lo && n <= hi;
  };

  const filteredSorted = React.useMemo(() => {
    const term = nk(q.trim());
    let arr = items;
    if (term) arr = arr.filter((it) => nk(getName(it)).includes(term));
    arr = arr.filter((it) => {
      const d = ((it as any).meta?.detail || {}) as any;
      if (capColor && d.capColor !== capColor) return false;
      if (undersideType && d.undersideType !== undersideType) return false;
      if (stipeCore && d.stipeCore !== stipeCore) return false;
      if (ring && d.ring !== ring) return false;
      if (volva && d.volva !== volva) return false;
      if (substrate && d.substrate !== substrate) return false;
      if (habitat && d.habitat !== habitat) return false;
      if (weirdShape && weirdShape === "yes" && !d.weirdShape) return false;
      if (weirdShape && weirdShape === "no" && d.weirdShape) return false;
      // terrain filters (contains match, normalized) + elevation bucket
      const ta = nk(String(d.terrainAspect || ""));
      const teRaw = d.terrainElevation;
      const tt = nk(String(d.terrainType || ""));
      if (terrainAspectF && terrainAspectF !== "" && !ta.includes(nk(terrainAspectF))) return false;
      if (terrainTypeF && terrainTypeF !== "" && !tt.includes(nk(terrainTypeF))) return false;
      const n = getElevationMeters(teRaw);
      if (elevBucket && elevBucket !== "" && !inBucket(n, elevBucket)) return false;
      return true;
    });
    const out = [...arr];
    if (sort === "name") {
      out.sort((a, b) => {
        const na = nk(getName(a));
        const nb = nk(getName(b));
        if (!na && !nb) return 0;
        if (!na) return 1;
        if (!nb) return -1;
        return na.localeCompare(nb);
      });
    } else if (sort === "oldest")
      out.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    else out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return out;
  }, [
    items,
    sort,
    q,
    capColor,
    undersideType,
    stipeCore,
    ring,
    volva,
    substrate,
    habitat,
    weirdShape,
    terrainAspectF,
    terrainTypeF,
    terrainElevationF,
    elevBucket,
  ]);

  // load selected for preview
  React.useEffect(() => {
    if (!previewId) return;
    setPreviewLoading(true);
    setPreviewRow(null);
    db.getRaw(previewId)
      .then((r) => setPreviewRow(r))
      .finally(() => setPreviewLoading(false));
  }, [previewId]);


  const noMatch = filteredSorted.length === 0 && q.trim().length > 0;
  if (loading) return <div>{t("loading")}</div>;

  return (
    <div>
      {/* controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>{t("search_title")}</div>
      </div>
      {/* 詳細フィルタ */}
      <div
        style={{
          display: "grid",
          gap: 12,
          marginTop: 12,
        }}
      >
        {/* 名前で検索（枠内） */}
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{t("search_by_name_label")}</div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              aria-label={t("search_by_name_label")}
              placeholder={t("search_by_name_placeholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                flex: 1,
                minWidth: 220,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid #ddd",
              }}
            />
            <button
              onClick={() => setShowTerrain((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 8,
                border: showTerrain ? "2px solid #86efac" : "1px solid var(--card-border)",
                background: showTerrain ? "#f0fdf4" : "#fff",
                color: "var(--fg)",
                fontSize: 13,
                fontWeight: showTerrain ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s ease",
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
                style={{ display: "block", flexShrink: 0 }}
              >
                <path d="M3 17l5-6 4 4 5-7 4 6" />
                <path d="M3 21h18" />
              </svg>
              <span>{t("filter_by_terrain")}</span>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  display: "block",
                  flexShrink: 0,
                  transform: showTerrain ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t("cap_color_label")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {optsCapColor.map((o) => {
                const sel = capColor === o.value;
                // color chips for non-empty values, neutral for '(指定なし)'
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
                const bg =
                  o.value && colorMap[o.value] ? colorMap[o.value] : undefined;
                const style: React.CSSProperties = bg
                  ? {
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--card-border)",
                      background: sel ? bg : `${bg}33`,
                      color: o.value === "white" ? "#111" : "#fff",
                      fontSize: 13,
                      boxShadow: sel
                        ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                        : undefined,
                    }
                  : {
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--card-border)",
                      background: sel ? "#f5f5f5" : "transparent",
                      color: sel ? "#111" : "var(--fg)",
                      fontSize: 13,
                      boxShadow: sel
                        ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                        : undefined,
                    };
                return (
                  <button
                    key={o.value}
                    onClick={() => setCapColor(o.value)}
                    style={style}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t("underside_label")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {optsUnderside.map((o) => {
                const sel = undersideType === o.value;
                const style: React.CSSProperties = {
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--card-border)",
                  background: sel ? "#f5f5f5" : "transparent",
                  color: sel ? "#111" : "var(--fg)",
                  fontSize: 13,
                  boxShadow: sel
                    ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                    : undefined,
                };
                return (
                  <button
                    key={o.value}
                    onClick={() => setUndersideType(o.value)}
                    style={style}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t("stipe_core_label")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {optsStipe.map((o) => {
                const sel = stipeCore === o.value;
                const style: React.CSSProperties = {
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--card-border)",
                  background: sel ? "#f5f5f5" : "transparent",
                  color: sel ? "#111" : "var(--fg)",
                  fontSize: 13,
                  boxShadow: sel
                    ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                    : undefined,
                };
                return (
                  <button
                    key={o.value}
                    onClick={() => setStipeCore(o.value)}
                    style={style}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t("ring_label")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {optsRing.map((o) => {
                const sel = ring === o.value;
                const style: React.CSSProperties = {
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--card-border)",
                  background: sel ? "#f5f5f5" : "transparent",
                  color: sel ? "#111" : "var(--fg)",
                  fontSize: 13,
                  boxShadow: sel
                    ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                    : undefined,
                };
                const icon =
                  o.value === "present"
                    ? "✔ "
                    : o.value === "absent"
                    ? "✖ "
                    : "";
                return (
                  <button
                    key={o.value}
                    onClick={() => setRing(o.value)}
                    style={style}
                  >
                    {icon}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t("volva_label")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {optsPresentAbsent.map((o) => {
                const sel = volva === o.value;
                const style: React.CSSProperties = {
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--card-border)",
                  background: sel ? "#f5f5f5" : "transparent",
                  color: sel ? "#111" : "var(--fg)",
                  fontSize: 13,
                  boxShadow: sel
                    ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                    : undefined,
                };
                const icon =
                  o.value === "present"
                    ? "✔ "
                    : o.value === "absent"
                    ? "✖ "
                    : "";
                return (
                  <button
                    key={o.value}
                    onClick={() => setVolva(o.value)}
                    style={style}
                  >
                    {icon}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t("substrate_label")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {optsSubstrate.map((o) => {
                const sel = substrate === o.value;
                const style: React.CSSProperties = {
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--card-border)",
                  background: sel ? "#f5f5f5" : "transparent",
                  color: sel ? "#111" : "var(--fg)",
                  fontSize: 13,
                  boxShadow: sel
                    ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                    : undefined,
                };
                return (
                  <button
                    key={o.value}
                    onClick={() => setSubstrate(o.value)}
                    style={style}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t("habitat_label")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {optsHabitat.map((o) => {
                const sel = habitat === o.value;
                const style: React.CSSProperties = {
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--card-border)",
                  background: sel ? "#f5f5f5" : "transparent",
                  color: sel ? "#111" : "var(--fg)",
                  fontSize: 13,
                  boxShadow: sel
                    ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                    : undefined,
                };
                return (
                  <button
                    key={o.value}
                    onClick={() => setHabitat(o.value)}
                    style={style}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div
              role="checkbox"
              tabIndex={0}
              aria-checked={weirdShape === "yes"}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setWeirdShape(weirdShape === "yes" ? "" : "yes");
                }
              }}
              onClick={() => setWeirdShape(weirdShape === "yes" ? "" : "yes")}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: "2px solid var(--card-border)",
                  background: weirdShape === "yes" ? "#fbbf24" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                {weirdShape === "yes" && (
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
              <span style={{ fontWeight: 500 }}>{t("weird_shape_mushroom")}</span>
            </div>
          </div>
          {showTerrain && (
            <div
              style={{
                padding: 12,
                display: "grid",
                gap: 12,
                background: "#f0fdf4",
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>
                {t("terrain_filter")}
              </div>
              {/* 方角 chips */}
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{t("aspect")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { value: "", label: t("no_filter") },
                    { value: "N", label: getLabel("N") },
                    { value: "NE", label: getLabel("NE") },
                    { value: "E", label: getLabel("E") },
                    { value: "SE", label: getLabel("SE") },
                    { value: "S", label: getLabel("S") },
                    { value: "SW", label: getLabel("SW") },
                    { value: "W", label: getLabel("W") },
                    { value: "NW", label: getLabel("NW") },
                  ].map((o) => {
                    const sel = aspectChip === o.value;
                    const style: React.CSSProperties = {
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--card-border)",
                      background: sel ? "#f5f5f5" : "#fff",
                      color: sel ? "#111" : "var(--fg)",
                      fontSize: 13,
                      boxShadow: sel
                        ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                        : undefined,
                    };
                    return (
                      <button
                        key={o.value || "none"}
                        onClick={() => {
                          setAspectChip(o.value);
                          setTerrainAspectF(o.value);
                        }}
                        style={style}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 標高 buckets */}
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{t("elevation_range")}</div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {[
                    { k: "", l: t("no_filter") },
                    { k: "0-300", l: "0–300m" },
                    { k: "301-600", l: "301–600m" },
                    { k: "601-900", l: "601–900m" },
                    { k: "901-1200", l: "901–1200m" },
                    { k: "1201-1500", l: "1201–1500m" },
                    { k: "1501+", l: "1501m+" },
                  ].map(({ k, l }) => {
                    const sel = elevBucket === k;
                    const style: React.CSSProperties = {
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--card-border)",
                      background: sel ? "#f5f5f5" : "#fff",
                      color: sel ? "#111" : "var(--fg)",
                      fontSize: 13,
                      boxShadow: sel
                        ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                        : undefined,
                    };
                    return (
                      <button
                        key={k || "none"}
                        onClick={() => {
                          setElevBucket(k);
                          setTerrainElevationF(k === "" ? "" : l);
                        }}
                        style={style}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 地形 type chips */}
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{t("terrain_type")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { value: "", label: t("no_filter") },
                    { value: "ridge", label: getLabel("ridge") },
                    { value: "valley", label: getLabel("valley") },
                    { value: "slope", label: getLabel("slope") },
                    { value: "flat", label: getLabel("flat") },
                  ].map((o) => {
                    const sel = typeChip === o.value;
                    const style: React.CSSProperties = {
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid var(--card-border)",
                      background: sel ? "#f5f5f5" : "#fff",
                      color: sel ? "#111" : "var(--fg)",
                      fontSize: 13,
                      boxShadow: sel
                        ? "0 0 0 2px rgba(0,0,0,0.06) inset"
                        : undefined,
                    };
                    return (
                      <button
                        key={o.value || "none"}
                        onClick={() => {
                          setTypeChip(o.value);
                          setTerrainTypeF(o.value);
                        }}
                        style={style}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 検索結果のサムネイル表示 */}
      {filteredSorted.length === 0 ? (
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
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600 }}>{t("search_results")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 12,
            }}
          >
          {filteredSorted.map((it) => (
            <button
              key={it.id}
              onClick={() => setPreviewId(it.id)}
              className="card"
              style={{ padding: 8, textAlign: "left", cursor: "pointer" }}
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
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                />
              </div>
              {(() => {
                const name = getName(it);
                return name ? (
                  <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
                    {name}
                  </div>
                ) : null;
              })()}
            </button>
          ))}
          </div>
        </div>
      )}

      {/* 地形 詳細入力モーダル */}
      {showTerrainDetail && (
          <div
            onClick={() => setShowTerrainDetail(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(226,224,255,0.35)",
              display: "grid",
              placeItems: "center",
              padding: 16,
              zIndex: 70,
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
                <div style={{ fontWeight: 700 }}>{t("terrain_detail_input")}</div>
                <button
                  className="icon-btn"
                  aria-label={t("close")}
                  title={t("close")}
                  onClick={() => setShowTerrainDetail(false)}
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
              <div style={{ padding: 12, display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{t("aspect")}</div>
                  <input
                    aria-label={t("aspect")}
                    placeholder={t("aspect_search_placeholder")}
                    value={terrainAspectF}
                    onChange={(e) => {
                      setTerrainAspectF(e.target.value);
                      setAspectChip(e.target.value);
                    }}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                    }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{t("elevation_range")}</div>
                  <input
                    aria-label={t("elevation_range")}
                    placeholder={t("elevation_search_placeholder")}
                    value={terrainElevationF}
                    onChange={(e) => {
                      setTerrainElevationF(e.target.value);
                      setElevBucket("");
                    }}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                    }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{t("terrain_type")}</div>
                  <input
                    aria-label={t("terrain_type")}
                    placeholder={t("terrain_type_search_placeholder")}
                    value={terrainTypeF}
                    onChange={(e) => {
                      setTerrainTypeF(e.target.value);
                      setTypeChip(e.target.value);
                    }}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                    }}
                  />
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn-outline"
                    onClick={() => {
                      setTerrainAspectF("");
                      setTerrainElevationF("");
                      setTerrainTypeF("");
                      setAspectChip("");
                      setElevBucket("");
                      setTypeChip("");
                    }}
                  >
                    {t("clear")}
                  </button>
                  <button
                    className="btn"
                    onClick={() => setShowTerrainDetail(false)}
                  >
                    {t("close")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
              }}
            >
              <div
                style={{
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 600 }}>{t("record_preview")}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      setEditId(previewId);
                      setPreviewId(null);
                    }}
                    aria-label={t("edit")}
                  >
                    {t("edit")}
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => setPreviewId(null)}
                    aria-label={t("close")}
                  >
                    {t("close")}
                  </button>
                </div>
              </div>
              <div style={{ padding: 12 }}>
                {previewLoading ? (
                  <div>{t("loading")}</div>
                ) : previewRow ? (
                  <div>
                    <img
                      src={previewRow.photoUrl}
                      alt=""
                      style={{ width: "100%", height: "auto", borderRadius: 8 }}
                    />
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {new Date(previewRow.createdAt).toLocaleString()}
                    </div>
                    {(() => {
                      const d = (previewRow as any).meta?.detail || {};
                      const lines: { label: string; value: string }[] = [];
                      if (d.mushroomName)
                        lines.push({
                          label: t("mushroom_name"),
                          value: d.mushroomName,
                        });
                      if (d.capColor)
                        lines.push({
                          label: t("cap_color_label"),
                          value: getLabel(d.capColor),
                        });
                      if (d.undersideType)
                        lines.push({
                          label: t("underside_label"),
                          value: getLabel(d.undersideType),
                        });
                      if (d.stipeCore)
                        lines.push({
                          label: t("stipe_core_label"),
                          value: getLabel(d.stipeCore),
                        });
                      if (d.ring)
                        lines.push({ label: t("ring_label"), value: getLabel(d.ring) });
                      if (d.volva)
                        lines.push({ label: t("volva_label"), value: getLabel(d.volva) });
                      if (d.substrate)
                        lines.push({
                          label: t("substrate_label"),
                          value: getLabel(d.substrate),
                        });
                      if (d.habitat)
                        lines.push({
                          label: t("habitat_label"),
                          value: getLabel(d.habitat),
                        });
                      return lines.length ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {lines.map((ln, i) => (
                            <div
                              key={i}
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
                        <div style={{ opacity: 0.8 }}>
                          {t("no_details_yet")}
                        </div>
                      );
                    })()}
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
