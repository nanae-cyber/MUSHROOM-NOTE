// オフライン地図タイル管理
const DB_NAME = 'offline-map-tiles';
const STORE_NAME = 'tiles';
const METADATA_STORE = 'metadata';

export interface TileMetadata {
  area: string;
  cityName: string;
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

// 日本の主要市町村の境界データ
export interface CityBounds {
  name: string;
  prefecture: string;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export const JAPAN_CITIES: CityBounds[] = [
  // 北海道
  { name: '札幌市', prefecture: '北海道', bounds: { minLat: 42.8, maxLat: 43.2, minLon: 141.1, maxLon: 141.6 } },
  { name: '函館市', prefecture: '北海道', bounds: { minLat: 41.7, maxLat: 42.0, minLon: 140.6, maxLon: 140.9 } },
  { name: '旭川市', prefecture: '北海道', bounds: { minLat: 43.6, maxLat: 43.9, minLon: 142.2, maxLon: 142.6 } },
  
  // 東北
  { name: '青森市', prefecture: '青森県', bounds: { minLat: 40.7, maxLat: 40.9, minLon: 140.6, maxLon: 140.9 } },
  { name: '盛岡市', prefecture: '岩手県', bounds: { minLat: 39.6, maxLat: 39.8, minLon: 141.0, maxLon: 141.3 } },
  { name: '仙台市', prefecture: '宮城県', bounds: { minLat: 38.2, maxLat: 38.4, minLon: 140.8, maxLon: 141.0 } },
  { name: '秋田市', prefecture: '秋田県', bounds: { minLat: 39.6, maxLat: 39.8, minLon: 140.0, maxLon: 140.2 } },
  { name: '山形市', prefecture: '山形県', bounds: { minLat: 38.2, maxLat: 38.3, minLon: 140.3, maxLon: 140.4 } },
  { name: '福島市', prefecture: '福島県', bounds: { minLat: 37.7, maxLat: 37.8, minLon: 140.4, maxLon: 140.5 } },
  
  // 関東
  { name: '水戸市', prefecture: '茨城県', bounds: { minLat: 36.3, maxLat: 36.4, minLon: 140.4, maxLon: 140.5 } },
  { name: '宇都宮市', prefecture: '栃木県', bounds: { minLat: 36.5, maxLat: 36.6, minLon: 139.8, maxLon: 140.0 } },
  { name: '前橋市', prefecture: '群馬県', bounds: { minLat: 36.3, maxLat: 36.5, minLon: 139.0, maxLon: 139.2 } },
  { name: 'さいたま市', prefecture: '埼玉県', bounds: { minLat: 35.8, maxLat: 36.0, minLon: 139.5, maxLon: 139.7 } },
  { name: '千葉市', prefecture: '千葉県', bounds: { minLat: 35.5, maxLat: 35.7, minLon: 140.0, maxLon: 140.2 } },
  { name: '東京23区', prefecture: '東京都', bounds: { minLat: 35.6, maxLat: 35.8, minLon: 139.6, maxLon: 139.9 } },
  { name: '八王子市', prefecture: '東京都', bounds: { minLat: 35.6, maxLat: 35.7, minLon: 139.2, maxLon: 139.4 } },
  { name: '横浜市', prefecture: '神奈川県', bounds: { minLat: 35.3, maxLat: 35.6, minLon: 139.5, maxLon: 139.7 } },
  { name: '川崎市', prefecture: '神奈川県', bounds: { minLat: 35.5, maxLat: 35.6, minLon: 139.6, maxLon: 139.8 } },
  
  // 中部
  { name: '新潟市', prefecture: '新潟県', bounds: { minLat: 37.8, maxLat: 38.0, minLon: 139.0, maxLon: 139.2 } },
  { name: '富山市', prefecture: '富山県', bounds: { minLat: 36.6, maxLat: 36.8, minLon: 137.1, maxLon: 137.3 } },
  { name: '金沢市', prefecture: '石川県', bounds: { minLat: 36.5, maxLat: 36.6, minLon: 136.6, maxLon: 136.7 } },
  { name: '福井市', prefecture: '福井県', bounds: { minLat: 36.0, maxLat: 36.1, minLon: 136.2, maxLon: 136.3 } },
  { name: '甲府市', prefecture: '山梨県', bounds: { minLat: 35.6, maxLat: 35.7, minLon: 138.5, maxLon: 138.6 } },
  { name: '長野市', prefecture: '長野県', bounds: { minLat: 36.6, maxLat: 36.7, minLon: 138.1, maxLon: 138.3 } },
  { name: '岐阜市', prefecture: '岐阜県', bounds: { minLat: 35.4, maxLat: 35.5, minLon: 136.7, maxLon: 136.8 } },
  { name: '静岡市', prefecture: '静岡県', bounds: { minLat: 34.9, maxLat: 35.1, minLon: 138.3, maxLon: 138.5 } },
  { name: '浜松市', prefecture: '静岡県', bounds: { minLat: 34.7, maxLat: 34.9, minLon: 137.6, maxLon: 137.8 } },
  { name: '名古屋市', prefecture: '愛知県', bounds: { minLat: 35.0, maxLat: 35.3, minLon: 136.8, maxLon: 137.0 } },
  
  // 近畿
  { name: '津市', prefecture: '三重県', bounds: { minLat: 34.7, maxLat: 34.8, minLon: 136.5, maxLon: 136.6 } },
  { name: '大津市', prefecture: '滋賀県', bounds: { minLat: 35.0, maxLat: 35.1, minLon: 135.8, maxLon: 136.0 } },
  { name: '京都市', prefecture: '京都府', bounds: { minLat: 34.9, maxLat: 35.1, minLon: 135.6, maxLon: 135.8 } },
  { name: '大阪市', prefecture: '大阪府', bounds: { minLat: 34.6, maxLat: 34.7, minLon: 135.4, maxLon: 135.6 } },
  { name: '堺市', prefecture: '大阪府', bounds: { minLat: 34.5, maxLat: 34.6, minLon: 135.4, maxLon: 135.5 } },
  { name: '神戸市', prefecture: '兵庫県', bounds: { minLat: 34.6, maxLat: 34.8, minLon: 135.0, maxLon: 135.3 } },
  { name: '奈良市', prefecture: '奈良県', bounds: { minLat: 34.6, maxLat: 34.7, minLon: 135.8, maxLon: 135.9 } },
  { name: '和歌山市', prefecture: '和歌山県', bounds: { minLat: 34.2, maxLat: 34.3, minLon: 135.1, maxLon: 135.2 } },
  
  // 中国
  { name: '鳥取市', prefecture: '鳥取県', bounds: { minLat: 35.4, maxLat: 35.6, minLon: 134.1, maxLon: 134.3 } },
  { name: '松江市', prefecture: '島根県', bounds: { minLat: 35.4, maxLat: 35.5, minLon: 133.0, maxLon: 133.1 } },
  { name: '岡山市', prefecture: '岡山県', bounds: { minLat: 34.6, maxLat: 34.7, minLon: 133.8, maxLon: 134.0 } },
  { name: '広島市', prefecture: '広島県', bounds: { minLat: 34.3, maxLat: 34.5, minLon: 132.4, maxLon: 132.6 } },
  { name: '山口市', prefecture: '山口県', bounds: { minLat: 34.1, maxLat: 34.2, minLon: 131.4, maxLon: 131.5 } },
  
  // 四国
  { name: '徳島市', prefecture: '徳島県', bounds: { minLat: 34.0, maxLat: 34.1, minLon: 134.5, maxLon: 134.6 } },
  { name: '高松市', prefecture: '香川県', bounds: { minLat: 34.3, maxLat: 34.4, minLon: 134.0, maxLon: 134.1 } },
  { name: '松山市', prefecture: '愛媛県', bounds: { minLat: 33.8, maxLat: 33.9, minLon: 132.7, maxLon: 132.8 } },
  { name: '高知市', prefecture: '高知県', bounds: { minLat: 33.5, maxLat: 33.6, minLon: 133.5, maxLon: 133.6 } },
  
  // 九州・沖縄
  { name: '福岡市', prefecture: '福岡県', bounds: { minLat: 33.5, maxLat: 33.7, minLon: 130.3, maxLon: 130.5 } },
  { name: '北九州市', prefecture: '福岡県', bounds: { minLat: 33.8, maxLat: 34.0, minLon: 130.8, maxLon: 131.0 } },
  { name: '佐賀市', prefecture: '佐賀県', bounds: { minLat: 33.2, maxLat: 33.3, minLon: 130.2, maxLon: 130.4 } },
  { name: '長崎市', prefecture: '長崎県', bounds: { minLat: 32.7, maxLat: 32.8, minLon: 129.8, maxLon: 130.0 } },
  { name: '熊本市', prefecture: '熊本県', bounds: { minLat: 32.7, maxLat: 32.9, minLon: 130.6, maxLon: 130.8 } },
  { name: '大分市', prefecture: '大分県', bounds: { minLat: 33.2, maxLat: 33.3, minLon: 131.5, maxLon: 131.7 } },
  { name: '宮崎市', prefecture: '宮崎県', bounds: { minLat: 31.9, maxLat: 32.0, minLon: 131.4, maxLon: 131.5 } },
  { name: '鹿児島市', prefecture: '鹿児島県', bounds: { minLat: 31.5, maxLat: 31.7, minLon: 130.5, maxLon: 130.6 } },
  { name: '那覇市', prefecture: '沖縄県', bounds: { minLat: 26.2, maxLat: 26.3, minLon: 127.6, maxLon: 127.7 } },
];

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
  cityName: string,
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
    area: `${cityName}-${mapType}-z${zoom}`,
    cityName,
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
