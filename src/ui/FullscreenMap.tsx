// シンプルなオンライン地図ビュー
import React, { useEffect, useState } from 'react';
import { db, type Row } from '../utils/db';

interface Props {
  onClose: () => void;
}

export function FullscreenMap({ onClose }: Props) {
  console.log('[FullscreenMap] Component mounted');
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 36.5, lng: 138.0 });
  const [selectedItem, setSelectedItem] = useState<Row | null>(null);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const list = await db.list();
        const withGps = list.filter((it: any) => it.meta?.gps?.lat && it.meta?.gps?.lon);
        console.log('[Map] Loaded items with GPS:', withGps.length);
        setItems(withGps);

        // 現在地を取得（タイムアウト付き）
        if (navigator.geolocation) {
          const timeoutId = setTimeout(() => {
            console.log('[Map] Geolocation timeout');
            if (withGps.length > 0) {
              const gps = (withGps[0].meta as any).gps;
              setCenter({ lat: gps.lat, lng: gps.lon });
            }
            setLoading(false);
          }, 2000);

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timeoutId);
              console.log('[Map] Got current location');
              setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              setLoading(false);
            },
            (err) => {
              clearTimeout(timeoutId);
              console.log('[Map] Geolocation error:', err.message);
              if (withGps.length > 0) {
                const gps = (withGps[0].meta as any).gps;
                setCenter({ lat: gps.lat, lng: gps.lon });
              }
              setLoading(false);
            },
            { timeout: 2000 }
          );
        } else {
          if (withGps.length > 0) {
            const gps = (withGps[0].meta as any).gps;
            setCenter({ lat: gps.lat, lng: gps.lon });
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('[Map] Failed to load data:', err);
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
      }}>
        <div style={{ marginBottom: 20 }}>地図を読み込み中...</div>
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
        background: '#fff',
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

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: '#f3f4f6',
            fontSize: 13,
            fontWeight: 600,
          }}>
            📍 {items.length}件
          </div>
        </div>
      </div>

      {/* 地図 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <SimpleMap
          center={center}
          items={items}
          onMarkerClick={(item) => setSelectedItem(item)}
        />
      </div>

      {/* 詳細パネル */}
      {selectedItem && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          maxWidth: 400,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: 16,
          zIndex: 1000,
        }}>
          <button
            onClick={() => setSelectedItem(null)}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: 4,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 20,
              opacity: 0.6,
            }}
            aria-label="閉じる"
          >
            ×
          </button>
          <img
            src={selectedItem.photoUrl}
            alt="きのこの写真"
            style={{
              width: '100%',
              height: 150,
              objectFit: 'cover',
              borderRadius: 8,
              marginBottom: 12,
            }}
          />
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
            {(selectedItem.meta as any)?.detail?.mushroomName || '名前未登録'}
          </div>
          <div style={{ fontSize: 13, color: '#666' }}>
            {new Date((selectedItem.meta as any)?.occurAt || selectedItem.createdAt).toLocaleString('ja-JP')}
          </div>
        </div>
      )}
    </div>
  );
}

// シンプルな地図コンポーネント（OpenStreetMap使用）
function SimpleMap({ center, items, onMarkerClick }: {
  center: { lat: number; lng: number };
  items: Row[];
  onMarkerClick: (item: Row) => void;
}) {
  const [map, setMap] = useState<any>(null);
  const [zoom, setZoom] = useState(10);

  useEffect(() => {
    console.log('[SimpleMap] Initializing with center:', center);
    // 地図の初期化は次のuseEffectで行う
  }, []);

  useEffect(() => {
    if (!map) return;
    console.log('[SimpleMap] Updating markers, count:', items.length);
  }, [items, map]);

  // タイル座標からピクセル座標への変換
  const latLngToPixel = (lat: number, lng: number, zoom: number, mapWidth: number, mapHeight: number) => {
    const scale = 256 * Math.pow(2, zoom);
    const worldX = (lng + 180) / 360 * scale;
    const worldY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale;
    
    const centerWorldX = (center.lng + 180) / 360 * scale;
    const centerWorldY = (1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * scale;
    
    return {
      x: mapWidth / 2 + (worldX - centerWorldX),
      y: mapHeight / 2 + (worldY - centerWorldY),
    };
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#e5e3df' }}>
      {/* OpenStreetMapのタイル表示 */}
      <div style={{
        width: '100%',
        height: '100%',
        background: `url('https://tile.openstreetmap.org/${zoom}/${Math.floor((center.lng + 180) / 360 * Math.pow(2, zoom))}/${Math.floor((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))}.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }} />

      {/* マーカー */}
      {items.map((item) => {
        const gps = (item.meta as any).gps;
        const pos = latLngToPixel(gps.lat, gps.lon, zoom, window.innerWidth, window.innerHeight - 60);
        
        return (
          <button
            key={item.id}
            onClick={() => onMarkerClick(item)}
            style={{
              position: 'absolute',
              left: pos.x - 12,
              top: pos.y - 24,
              width: 24,
              height: 24,
              background: '#ef4444',
              border: '2px solid #fff',
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              padding: 0,
              zIndex: 100,
            }}
            aria-label={`${(item.meta as any)?.detail?.mushroomName || '名前未登録'}の位置`}
          >
            <div style={{
              transform: 'rotate(45deg)',
              fontSize: 12,
            }}>
              🍄
            </div>
          </button>
        );
      })}

      {/* 現在地マーカー */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 16,
        height: 16,
        background: '#3b82f6',
        border: '3px solid #fff',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 50,
      }} />

      {/* コントロールボタン */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 200,
      }}>
        <button
          onClick={() => {
            // 現在地を再取得
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  window.location.reload(); // 簡易的に再読み込み
                },
                (err) => {
                  alert('現在地を取得できませんでした');
                }
              );
            }
          }}
          style={{
            width: 40,
            height: 40,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          aria-label="現在地に戻る"
          title="現在地に戻る"
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
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
        <button
          onClick={() => setZoom(Math.min(18, zoom + 1))}
          style={{
            width: 40,
            height: 40,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 20,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          aria-label="ズームイン"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(3, zoom - 1))}
          style={{
            width: 40,
            height: 40,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 20,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          aria-label="ズームアウト"
        >
          −
        </button>
      </div>
    </div>
  );
}
