// src/utils/location.ts
// 位置情報とエリア分類

export interface Location {
  lat: number;
  lon: number;
  name?: string;
}

export interface Area {
  id: string;
  name: string;
  center: Location;
  radius: number; // km
  count: number; // 観察記録数
}

/**
 * 2点間の距離を計算（Haversine formula）
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 地球の半径（km）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * GPS座標からエリアを自動分類
 * 近い位置（5km以内）をグループ化
 */
export function classifyAreas(locations: Location[]): Area[] {
  if (locations.length === 0) return [];
  
  const areas: Area[] = [];
  const processed = new Set<number>();
  const clusterRadius = 5; // 5km以内を同じエリアとする
  
  locations.forEach((loc, index) => {
    if (processed.has(index)) return;
    
    // 新しいエリアを作成
    const cluster: Location[] = [loc];
    processed.add(index);
    
    // 近い位置を探す
    locations.forEach((otherLoc, otherIndex) => {
      if (processed.has(otherIndex)) return;
      
      const distance = calculateDistance(
        loc.lat,
        loc.lon,
        otherLoc.lat,
        otherLoc.lon
      );
      
      if (distance <= clusterRadius) {
        cluster.push(otherLoc);
        processed.add(otherIndex);
      }
    });
    
    // エリアの中心を計算
    const centerLat = cluster.reduce((sum, l) => sum + l.lat, 0) / cluster.length;
    const centerLon = cluster.reduce((sum, l) => sum + l.lon, 0) / cluster.length;
    
    areas.push({
      id: `area-${areas.length + 1}`,
      name: `エリア ${areas.length + 1}`,
      center: { lat: centerLat, lon: centerLon },
      radius: clusterRadius,
      count: cluster.length,
    });
  });
  
  // 観察記録数でソート
  return areas.sort((a, b) => b.count - a.count);
}

/**
 * 位置情報から地名を取得（逆ジオコーディング）
 * OpenStreetMap Nominatim API使用（無料）
 */
export async function getLocationName(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MushroomNote/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    const address = data.address;
    
    // 市区町村レベルの地名を取得
    const name =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.state ||
      '不明なエリア';
    
    return name;
  } catch (err) {
    console.error('[Location] Failed to get location name:', err);
    return '不明なエリア';
  }
}

/**
 * エリアに地名を付与
 */
export async function enrichAreasWithNames(areas: Area[]): Promise<Area[]> {
  const enrichedAreas = await Promise.all(
    areas.map(async (area) => {
      const name = await getLocationName(area.center.lat, area.center.lon);
      return {
        ...area,
        name: `${name}周辺`,
      };
    })
  );
  
  return enrichedAreas;
}

/**
 * 位置情報が特定のエリアに含まれるかチェック
 */
export function isInArea(location: Location, area: Area): boolean {
  const distance = calculateDistance(
    location.lat,
    location.lon,
    area.center.lat,
    area.center.lon
  );
  return distance <= area.radius;
}

/**
 * エリアの簡易表示名を生成
 */
export function getAreaDisplayName(area: Area, index: number): string {
  if (area.name && area.name !== '不明なエリア周辺') {
    return area.name;
  }
  return `エリア ${index + 1}（${area.count}件）`;
}
