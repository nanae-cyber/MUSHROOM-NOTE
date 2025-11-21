// オフライン地図タイル管理
const DB_NAME = 'offline-map-tiles';
const STORE_NAME = 'tiles';
const METADATA_STORE = 'metadata';

export interface TileMetadata {
  area: string;
  zoom: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  tileCount: number;
  downloadedAt: number;
}

// IndexedDBを開く
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // タイルストア
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
      
      // メタデータストア
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'area' });
      }
    };
  });
}

// タイルキーを生成
function getTileKey(z: number, x: number, y: number, mapType: string): string {
  return `${mapType}-${z}-${x}-${y}`;
}

// タイルを保存
export async function saveTile(
  z: number,
  x: number,
  y: number,
  mapType: string,
  blob: Blob
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const key = getTileKey(z, x, y, mapType);
  await store.put({ key, blob, savedAt: Date.now() });
}

// タイルを取得
export async function getTile(
  z: number,
  x: number,
  y: number,
  mapType: string
): Promise<Blob | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  const key = getTileKey(z, x, y, mapType);
  const result = await new Promise<any>((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  return result?.blob || null;
}

// エリアのタイルをダウンロード
export async function downloadAreaTiles(
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  zoom: number,
  mapType: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  // 緯度経度からタイル座標に変換
  const getTileCoords = (lat: number, lon: number, z: number) => {
    const x = Math.floor(((lon + 180) / 360) * Math.pow(2, z));
    const y = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
        Math.pow(2, z)
    );
    return { x, y };
  };

  const minTile = getTileCoords(bounds.maxLat, bounds.minLon, zoom);
  const maxTile = getTileCoords(bounds.minLat, bounds.maxLon, zoom);

  const tiles: Array<{ x: number; y: number }> = [];
  for (let x = minTile.x; x <= maxTile.x; x++) {
    for (let y = minTile.y; y <= maxTile.y; y++) {
      tiles.push({ x, y });
    }
  }

  const total = tiles.length;
  let current = 0;

  const tileUrl = mapType === 'std'
    ? 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
    : 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';

  for (const tile of tiles) {
    try {
      const url = tileUrl
        .replace('{z}', zoom.toString())
        .replace('{x}', tile.x.toString())
        .replace('{y}', tile.y.toString());

      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        await saveTile(zoom, tile.x, tile.y, mapType, blob);
      }

      current++;
      if (onProgress) {
        onProgress(current, total);
      }

      // レート制限対策（100msの遅延）
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to download tile ${tile.x},${tile.y}:`, error);
    }
  }

  // メタデータを保存
  const db = await openDB();
  const tx = db.transaction(METADATA_STORE, 'readwrite');
  const store = tx.objectStore(METADATA_STORE);
  
  const metadata: TileMetadata = {
    area: `${bounds.minLat.toFixed(2)},${bounds.minLon.toFixed(2)}-${bounds.maxLat.toFixed(2)},${bounds.maxLon.toFixed(2)}`,
    zoom,
    bounds,
    tileCount: total,
    downloadedAt: Date.now(),
  };
  
  await store.put(metadata);
}

// ダウンロード済みエリアを取得
export async function getDownloadedAreas(): Promise<TileMetadata[]> {
  const db = await openDB();
  const tx = db.transaction(METADATA_STORE, 'readonly');
  const store = tx.objectStore(METADATA_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// エリアを削除
export async function deleteArea(area: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(METADATA_STORE, 'readwrite');
  const store = tx.objectStore(METADATA_STORE);
  
  await store.delete(area);
}

// すべてのタイルを削除
export async function clearAllTiles(): Promise<void> {
  const db = await openDB();
  
  const tx1 = db.transaction(STORE_NAME, 'readwrite');
  await tx1.objectStore(STORE_NAME).clear();
  
  const tx2 = db.transaction(METADATA_STORE, 'readwrite');
  await tx2.objectStore(METADATA_STORE).clear();
}
