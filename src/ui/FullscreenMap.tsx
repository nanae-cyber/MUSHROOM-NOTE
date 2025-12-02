// インタラクティブな地図ビュー（Leaflet使用）
import React, { useEffect, useRef, useState } from 'react';
import { db, type Row } from '../utils/db';
import { t, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  onClose: () => void;
}

export function FullscreenMap({ lang, onClose }: Props) {
  console.log('[FullscreenMap] Component mounted');
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 36.5, lng: 138.0 });
  const [selectedItem, setSelectedItem] = useState<Row | null>(null);
  const [showList, setShowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const list = await db.list();
        const withGps = list.filter((it: any) => it.meta?.gps?.lat && it.meta?.gps?.lon);
        console.log('[Map] Loaded items with GPS:', withGps.length);
        setItems(withGps);

        // 現在地を取得
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

  // Leaflet地図の初期化
  useEffect(() => {
    if (!mapRef.current || !center || loading) return;

    const initMap = async () => {
      console.log('[Map] Initializing Leaflet...');

      // Leaflet CSSを読み込み
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Leaflet JSを読み込み
      if (!(window as any).L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => {
            console.log('[Map] Leaflet loaded');
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const L = (window as any).L;
      if (!L || mapInstanceRef.current) return;

      console.log('[Map] Creating map instance');
      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom: 13,
        zoomControl: false,
      });

      // 国土地理院の地形図
      L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        maxZoom: 18,
      }).addTo(map);

      // 現在地マーカー
      const currentIcon = L.divIcon({
        className: 'current-location-marker',
        html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.2)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([center.lat, center.lng], { icon: currentIcon }).addTo(map);

      mapInstanceRef.current = map;
      console.log('[Map] Map ready');

      // マーカーを追加
      updateMarkers(map, items);
    };

    initMap().catch(err => {
      console.error('[Map] Failed to initialize:', err);
      alert('地図の初期化に失敗しました');
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, loading]);

  // マーカーを更新
  const updateMarkers = (map: any, itemsToShow: Row[]) => {
    const L = (window as any).L;
    if (!L || !map) return;

    // 既存のマーカーを削除
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // 新しいマーカーを追加
    itemsToShow.forEach((item) => {
      const gps = (item.meta as any).gps;
      const name = (item.meta as any)?.detail?.mushroomName || '名前未登録';

      const icon = L.divIcon({
        className: 'mushroom-marker',
        html: '<div style="width:24px;height:24px;background:#ef4444;border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(45deg);font-size:12px">🍄</div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      const marker = L.marker([gps.lat, gps.lon], { icon })
        .addTo(map)
        .on('click', () => {
          setSelectedItem(item);
          setShowList(false);
        });

      markersRef.current.push(marker);
    });
  };

  // 検索フィルター
  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const name = ((item.meta as any)?.detail?.mushroomName || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // 現在地に戻る
  const recenterMap = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 13);
          }
        },
        () => {
          alert('現在地を取得できませんでした');
        }
      );
    }
  };

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
        <div style={{ marginBottom: 20 }}>{t('map_loading')}</div>
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
          {t('close')}
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
        zIndex: 1001,
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

        <div style={{ fontWeight: 600, fontSize: 16 }}>{t('map_title')}</div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowList(!showList)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: showList ? '#f3f4f6' : '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
            }}
            aria-label="きのこ一覧"
          >
            📍 {items.length}{lang === 'ja' ? '件' : ''}
          </button>
        </div>
      </div>

      {/* 地図 */}
      <div ref={mapRef} style={{ flex: 1, position: 'relative' }} />

      {/* コントロールボタン */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
      }}>
        <button
          onClick={recenterMap}
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
      </div>

      {/* きのこ一覧パネル */}
      {showList && (
        <div style={{
          position: 'absolute',
          top: 60,
          right: 12,
          bottom: 12,
          width: 'min(400px, calc(100% - 24px))',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
        }}>
          {/* 検索バー */}
          <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
            <input
              type="text"
              placeholder={t('search_mushroom')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 14,
              }}
            />
          </div>

          {/* 一覧 */}
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {filteredItems.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                {searchQuery ? '該当するきのこが見つかりません' : 'GPSデータ付きのきのこがありません'}
              </div>
            ) : (
              filteredItems.map((item) => {
                const name = (item.meta as any)?.detail?.mushroomName || '名前未登録';
                const date = new Date((item.meta as any)?.occurAt || item.createdAt);
                const gps = (item.meta as any).gps;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setShowList(false);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([gps.lat, gps.lon], 15);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 8,
                      marginBottom: 8,
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      textAlign: 'left',
                    }}
                  >
                    <img
                      src={item.photoUrl}
                      alt={name}
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {date.toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 詳細パネル */}
      {selectedItem && !showList && (
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
