// src/utils/db.ts
// --- 追加: 詳細フィールド定義 ---
export type Detail = {
  // ① 傘
  capColor?:
    | "red"
    | "purple"
    | "white"
    | "yellow"
    | "brown"
    | "black"
    | "gray"
    | "orange"
    | "green"
    | "blue"
    | "pink"
    | "other";
  capNote?: string;

  // ② 傘の裏
  undersideType?: "gills" | "pores" | "spines" | "ridges" | "other"; // ひだ/管孔/針/しわひだ/その他
  undersideNote?: string;

  // ③ 柄
  stipeCore?: "hollow" | "solid" | "none"; // 中空/中実/なし
  stipeNote?: string;

  // ④ つば
  ring?: "present" | "absent" | "cortina"; // あり/なし/蜘蛛の巣状
  ringNote?: string;

  // ④ つぼ
  volva?: "present" | "absent"; // あり/なし
  volvaNote?: string;

  // ⑥ 生え方
  substrate?: "deadwood" | "downed" | "live" | "soil" | "other"; // 枯れ木/倒木/生木/地面/その他
  substrateNote?: string;

  // ⑦ 環境
  habitat?: "broadleaf" | "conifer" | "mixed" | "bamboo" | "park" | "other"; // 広葉樹/針葉樹/混生林/竹林/公園/その他
  habitatNote?: string;

  // 特別カテゴリ
  weirdShape?: boolean; // 変な形のきのこ

  // 派生結果
  mushroomName?: string; // きのこの名前
  mushroomNameNote?: string; // きのこの名前メモ

  // 地形情報
  terrainAspect?: string; // 方角
  terrainElevation?: string; // 標高
  terrainType?: string; // 地形タイプ
  terrainNote?: string; // 地形メモ

  updatedAt?: number;
};

// きのこ観察データ用 IndexedDB ユーティリティ（Vite/モバイル対応）
const DB_NAME = "mushroom-note";
const STORE = "specimens";
let _dbPromise: Promise<IDBDatabase> | null = null;

function safeUUID(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const buf = new Uint8Array(16);
    c.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40; // version
    buf[8] = (buf[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join(
      ""
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    // Bump version to ensure we can add missing indexes on existing stores
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      let os: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE)) {
        os = db.createObjectStore(STORE, { keyPath: "id" });
      } else {
        os = (req.transaction as IDBTransaction).objectStore(STORE);
      }
      // Ensure createdAt index exists even on existing stores
      if (!(os.indexNames as any).contains?.("createdAt")) {
        try {
          os.createIndex("createdAt", "createdAt");
        } catch {}
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

type AddInput = {
  firstPhoto: Blob; // ★必須：写真（Blob/File OK）
  view?: "cap" | "gills" | "stem" | string;
  meta?: Record<string, any>; // lat/lon/heading 等
};

export type Row = {
  id: string;
  createdAt: number;
  photoBlob: Blob;
  photoUrl: string; // 表示用 ObjectURL（list() 時に生成）
  extraBlobs?: Blob[];
  extraUrls?: string[];
  view?: string;
  meta?: Record<string, any>;
};

export async function add(input: AddInput): Promise<string> {
  const db = await openDB();
  const id = safeUUID();
  const row = {
    id,
    createdAt: Date.now(),
    photoBlob: input.firstPhoto, // Blob として保存
    extraBlobs: [],
    view: input.view ?? "cap",
    meta: input.meta ?? {},
  };

  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.objectStore(STORE).put(row);
  });
  return id;
}

export async function update(id: string, patch: Partial<Row>): Promise<void> {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const g = store.get(id);
    g.onsuccess = () => {
      const cur = g.result;
      if (!cur) return rej(new Error("not found"));
      store.put({ ...cur, ...patch });
    };
    g.onerror = () => rej(g.error);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function list(): Promise<Row[]> {
  const db = await openDB();
  const rows: Row[] = [];
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    let cursorReq: IDBRequest<IDBCursorWithValue | null>;
    try {
      const idx = store.index("createdAt");
      cursorReq = idx.openCursor(null, "prev");
    } catch {
      // Fallback when index is missing: iterate over store directly
      cursorReq = store.openCursor(null, "prev");
    }
    cursorReq.onsuccess = () => {
      const cur = cursorReq.result;
      if (!cur) return;
      const r = cur.value as Omit<Row, "photoUrl"> & { extraBlobs?: Blob[] };
      try {
        rows.push({
          ...r,
          photoUrl: URL.createObjectURL(r.photoBlob),
          extraUrls: (r.extraBlobs ?? []).map((b) => URL.createObjectURL(b)),
        } as any);
      } catch {
        // In case of corrupted row without blobs, push minimal shape
        rows.push({ ...(r as any), photoUrl: "", extraUrls: [] } as any);
      }
      cur.continue();
    };
    cursorReq.onerror = () => rej(cursorReq.error as any);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  return rows;
}

export async function exportZip(): Promise<Blob> {
  // 省略してOK（既存機能使っているならそのまま）— 必要なら後で実装
  return new Blob();
}

export async function importZip(_zip: Blob): Promise<void> {
  // 同上
}

// ★ 新規: 追加画像を1枚足すためのヘルパー
export async function addExtraPhoto(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const g = store.get(id);
    g.onsuccess = () => {
      const cur = g.result;
      if (!cur) return rej(new Error("not found"));
      const next = {
        ...cur,
        extraBlobs: [...(cur.extraBlobs ?? []), blob],
      };
      store.put(next);
    };
    g.onerror = () => rej(g.error);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function removeExtraPhoto(
  id: string,
  index: number
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const g = store.get(id);
    g.onsuccess = () => {
      const cur = g.result as { extraBlobs?: Blob[] } | undefined;
      if (!cur) return rej(new Error("not found"));
      const list = [...(cur.extraBlobs ?? [])];
      if (index < 0 || index >= list.length)
        return rej(new Error("index out of range"));
      list.splice(index, 1);
      store.put({ ...(g.result as any), extraBlobs: list });
    };
    g.onerror = () => rej(g.error);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// レコードを削除
export async function deleteRecord(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
    tx.onerror = () => rej(tx.error);
  });
}

// 画像の Blob も含めて返す（安全な取得）
export async function getRaw(id: string): Promise<Row | null> {
  const db = await openDB();
  return await new Promise<Row | null>((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const st = tx.objectStore(STORE);
    const req = st.get(id);
    req.onsuccess = () => {
      const r = req.result as (Row & { extraBlobs?: Blob[] }) | undefined;
      if (!r) return res(null);
      res({
        ...r,
        photoUrl: URL.createObjectURL((r as any).photoBlob),
        extraUrls: (r.extraBlobs ?? []).map((b) => URL.createObjectURL(b)),
      } as any);
    };
    req.onerror = () => rej(req.error);
  });
}

// 既存のエクスポートに getRaw を足す
export const db = {
  add,
  update,
  list,
  exportZip,
  importZip,
  addExtraPhoto,
  removeExtraPhoto,
  delete: deleteRecord,
  getRaw,
};
export default db;
