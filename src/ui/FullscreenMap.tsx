// 全画面地図ビュー - オフライン対応版
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { db, type Row } from '../utils/db';
import { JAPAN_CITIES, getDownloadedAreas, getTile } from '../utils/offlineMap';
import { OfflineMapManager } from './OfflineMapManager';

interface Props {
  onClose: () => void;
}

// 地域と都道府県のマッピング
const REGIONS = {
  '北海道': ['北海道'],
  '東北': ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  '関東': ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  '中部': ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
  '近畿': ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  '中国': ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  '四国': ['徳島県', '香川県', '愛媛県', '高知県'],
  '九州・沖縄': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
};

export function FullscreenMap({ onClose }: Props) {
  console.log('[FullscreenMap] Component mounted');
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [downloadedAreas, setDownloadedAreas] = useState<any[]>([]);
  const [useOfflineMap, setUseOfflineMap] = useState(false);
  const [showOfflineManager, setShowOfflineManager] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const tileLayerRef = useRef<any>(null);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const list = await db.list();
        const withGps = list.filter((it: any) => it.meta?.gps?.lat && it.meta?.gps?.lon);
        setItems(withGps);

        // ダウンロード済みエリアを取得
        const areas = await getDownloadedAreas();
        setDownloadedAreas(areas);
        console.log('[Map] Downloaded areas:', areas);

        // オフライン地図があるかチェック
        const hasOfflineMap = areas.length > 0;
        setUseOfflineMap(hasOfflineMap);

        // 現在地または最初のアイテムの位置を中心に
        const setDefaultCenter = () => {
          if (withGps.length > 0) {
            const gps = (withGps[0].meta as any).gps;
            console.log('[Map] Using first item location:', gps);
            setCenter({ lat: gps.lat, lng: gps.lon });
          } else if (areas.length > 0) {
            // ダウンロード済みエリアの中心を使用
            const firstArea = areas[0];
            const centerLat = (firstArea.bounds.minLat + firstArea.bounds.maxLat) / 2;
            const centerLng = (firstArea.bounds.minLon + firstArea.bounds.maxLon) / 2;
            console.log('[Map] Using downloaded area center:', centerLat, centerLng);
            setCenter({ lat: centerLat, lng: centerLng });
          } else {
            // デフォルト: 日本の中心
            console.log('[Map] Using default center (Japan)');
            setCenter({ lat: 36.5, lng: 138.0 });
          }
          setLoading(false);
        };

        if (navigator.geolocation) {
          console.log('[Map] Requesting current location...');
          const timeoutId = setTimeout(() => {
            console.log('[Map] Geolocation timeout, using default');
            setDefaultCenter();
          }, 3000); // 3秒でタイムアウト

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timeoutId);
              console.log('[Map] Got current location:', pos.coords.latitude, pos.coords.longitude);
              setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              setLoading(false);
            },
            (err) => {
              clearTimeout(timeoutId);
              console.log('[Map] Geolocation error:', err.message);
              setDefaultCenter();
            },
            { timeout: 3000, maximumAge: 60000 }
          );
        } else {
          console.log('[Map] Geolocation not available');
          setDefaultCenter();
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // フィルタリングされたアイテム
  const filteredItems = useMemo(() => {
    if (!selectedCity) return items;
    
    const city = JAPAN_CITIES.find(c => c.name === selectedCity);
    if (!city) return items;

    return items.filter((it: any) => {
      const gps = it.meta?.gps;
      if (!gps?.lat || !gps?.lon) return false;
      const { minLat, maxLat, minLon, maxLon } = city.bounds;
      return gps.lat >= minLat && gps.lat <= maxLat && gps.lon >= minLon && gps.lon <= maxLon;
    });
  }, [items, selectedCity]);

  // 地域の都道府県リスト
  const prefectures = useMemo(() => {
    if (!selectedRegion) return [];
    return REGIONS[selectedRegion as keyof typeof REGIONS] || [];
  }, [selectedRegion]);

  // 都道府県の市町村リスト（ダウンロード済みのみ）
  const cities = useMemo(() => {
    if (!selectedPrefecture) return [];
    const allCities = JAPAN_CITIES.filter(c => c.prefecture === selectedPrefecture);
    
    // オフラインモードの場合、ダウンロード済みの市町村のみ表示
    if (useOfflineMap && downloadedAreas.length > 0) {
      return allCities.filter(city => 
        downloadedAreas.some(area => area.cityName === city.name)
      );
    }
    
    return allCities;
  }, [selectedPrefecture, useOfflineMap, downloadedAreas]);

  // Leaflet地図の初期化（遅延読み込み）
  useEffect(() => {
    if (!mapRef.current || !center || mapReady) return;

    const initMap = async () => {
      // Leaflet CSSを動的に読み込み
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Leaflet JSを動的に読み込み
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
      if (!L || mapInstanceRef.current) return;

      // 地図を初期化
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([center.lat, center.lng], 10);

      // オフライン対応タイルレイヤー
      const OfflineTileLayer = L.TileLayer.extend({
        createTile: function(coords: any, done: any) {
          const tile = document.createElement('img');
          const url = this.getTileUrl(coords);
          
          // エラーハンドリング
          tile.onerror = function() {
            console.warn(`[Map] Failed to load tile: ${coords.z}/${coords.x}/${coords.y} from ${url}`);
            // 空白タイルを表示
            tile.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
          };
          
          // オフラインタイルを試す
          getTile(coords.z, coords.x, coords.y, 'pale')
            .then((blob) => {
              if (blob) {
                console.log(`[Map] ✓ Using offline tile: ${coords.z}/${coords.x}/${coords.y}`);
                tile.src = URL.createObjectURL(blob);
                done(null, tile);
              } else {
                // オフラインタイルがない場合はオンラインから取得
                if (navigator.onLine) {
                  console.log(`[Map] → Loading online tile: ${coords.z}/${coords.x}/${coords.y}`);
                  tile.src = url;
                  done(null, tile);
                } else {
                  console.warn(`[Map] ✗ Offline and no cached tile: ${coords.z}/${coords.x}/${coords.y}`);
                  tile.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
                  done(null, tile);
                }
              }
            })
            .catch((err) => {
              console.error(`[Map] Error getting tile ${coords.z}/${coords.x}/${coords.y}:`, err);
              if (navigator.onLine) {
                tile.src = url;
              } else {
                tile.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
              }
              done(null, tile);
            });
          
          return tile;
        }
      });

      const tileLayer = new OfflineTileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
        maxZoom: 18,
      }).addTo(map);
      
      tileLayerRef.current = tileLayer;

      // 現在地マーカー
      const currentLocationMarker = L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: 'current-location-marker',
          html: `<div style="
            width: 16px;
            height: 16px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(map).bindPopup('現在地');

      // 現在地へ戻るボタン
      const recenterControl = L.control({ position: 'bottomright' });
      recenterControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        div.innerHTML = `
          <a href="#" style="
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            text-decoration: none;
            color: #333;
            font-size: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          " title="現在地へ戻る">📍</a>
        `;
        div.onclick = (e: Event) => {
          e.preventDefault();
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([center.lat, center.lng], 13);
            currentLocationMarker.openPopup();
          }
        };
        return div;
      };
      recenterControl.addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);

      // サイズ調整
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    };

    initMap().catch(err => console.error('Failed to init map:', err));

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, mapReady]);

  // マーカーを更新
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    const L = (window as any).L;
    if (!L) return;

    // 既存のマーカーを削除
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // 新しいマーカーを追加
    filteredItems.forEach((it: any) => {
      const gps = it.meta.gps;
      const name = it.meta?.detail?.mushroomName || '名前未登録';

      const marker = L.marker([gps.lat, gps.lon], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 28px;
            height: 28px;
            background: #22c55e;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="min-width: 150px;">
            <img src="${it.photoUrl}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />
            <div style="font-weight: 600; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 12px; opacity: 0.8;">${new Date(
              (it.meta as any)?.occurAt || it.createdAt
            ).toLocaleString()}</div>
          </div>
        `);

      markersRef.current.push(marker);
    });

    // 全マーカーが見えるように調整
    if (filteredItems.length > 1) {
      const bounds = L.latLngBounds(
        filteredItems.map((it: any) => [it.meta.gps.lat, it.meta.gps.lon])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [filteredItems, mapReady]);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}>
        <div style={{ marginBottom: 20, fontSize: 16 }}>地図を読み込み中...</div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
          位置情報の取得を待っています
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#fff',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ヘッダー */}
      <div style={{
        padding: 12,
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            padding: 8,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="閉じる"
        >
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
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div style={{ fontWeight: 600, fontSize: 16 }}>きのこマップ</div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {useOfflineMap && (
            <div style={{
              padding: '4px 8px',
              borderRadius: 6,
              background: '#dcfce7',
              color: '#166534',
              fontSize: 11,
              fontWeight: 600,
            }}>
              オフライン
            </div>
          )}

          <select
            value={selectedRegion}
            onChange={(e) => {
              setSelectedRegion(e.target.value);
              setSelectedPrefecture('');
              setSelectedCity('');
            }}
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: 13,
            }}
          >
            <option value="">地域</option>
            {Object.keys(REGIONS).map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>

          <select
            value={selectedPrefecture}
            onChange={(e) => {
              setSelectedPrefecture(e.target.value);
              setSelectedCity('');
            }}
            disabled={!selectedRegion}
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: 13,
              background: selectedRegion ? '#fff' : '#f5f5f5',
              cursor: selectedRegion ? 'pointer' : 'not-allowed',
            }}
          >
            <option value="">都道府県</option>
            {prefectures.map(pref => (
              <option key={pref} value={pref}>{pref}</option>
            ))}
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            disabled={!selectedPrefecture}
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: 13,
              background: selectedPrefecture ? '#fff' : '#f5f5f5',
              cursor: selectedPrefecture ? 'pointer' : 'not-allowed',
            }}
          >
            <option value="">市町村</option>
            {cities.map(city => (
              <option key={city.name} value={city.name}>{city.name}</option>
            ))}
          </select>

          <div style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: '#f3f4f6',
            fontSize: 13,
            fontWeight: 600,
          }}>
            📍 {filteredItems.length}件
          </div>
        </div>
      </div>

      {/* 地図 */}
      <div ref={mapRef} style={{ flex: 1, width: '100%' }} />
    </div>
  );
}
