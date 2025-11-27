// オフライン地図管理UI
import React, { useState, useEffect, useMemo } from 'react';
import { downloadAreaTiles, getDownloadedAreas, deleteArea, clearAllTiles, JAPAN_CITIES } from '../utils/offlineMap';

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

interface Props {
  onClose: () => void;
  onViewArea?: (cityName: string, bounds: any) => void;
}

export function OfflineMapManager({ onClose, onViewArea }: Props) {
  const [areas, setAreas] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedPrefecture, setSelectedPrefecture] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    const downloaded = await getDownloadedAreas();
    setAreas(downloaded);
  };

  const handleDownload = async () => {
    if (!selectedCity) {
      alert('市町村を選択してください');
      return;
    }

    const city = JAPAN_CITIES.find(c => c.name === selectedCity);
    if (!city) return;

    setDownloading(true);
    setProgress({ current: 0, total: 0 });

    try {
      await downloadAreaTiles(
        city.name,
        city.bounds,
        zoom,
        'pale', // 淡色地図のみ
        (current, total) => {
          setProgress({ current, total });
        }
      );

      alert('ダウンロード完了！');
      await loadAreas();
    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロードに失敗しました');
    } finally {
      setDownloading(false);
    }
  };

  // 地域の都道府県リスト
  const prefectures = useMemo(() => {
    if (!selectedRegion) return [];
    return REGIONS[selectedRegion as keyof typeof REGIONS] || [];
  }, [selectedRegion]);
  
  // 選択された都道府県の市町村リスト
  const cities = useMemo(() => {
    if (!selectedPrefecture) return [];
    return JAPAN_CITIES.filter(c => c.prefecture === selectedPrefecture);
  }, [selectedPrefecture]);

  const handleDelete = async (area: string) => {
    if (confirm('このエリアを削除しますか？')) {
      await deleteArea(area);
      await loadAreas();
    }
  };

  const handleClearAll = async () => {
    if (confirm('すべてのオフライン地図を削除しますか？')) {
      await clearAllTiles();
      await loadAreas();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>オフライン地図管理</h2>
          <button onClick={onClose} style={{ fontSize: 24, border: 'none', background: 'none', cursor: 'pointer' }}>
            ×
          </button>
        </div>

        {/* ダウンロード済みエリア */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>ダウンロード済みエリア</h3>
          {areas.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', opacity: 0.6 }}>
              ダウンロード済みのエリアはありません
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {areas.map((area) => (
                <div
                  key={area.area}
                  style={{
                    padding: 12,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{area.cityName || area.area}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      ズーム: {area.zoom} | タイル数: {area.tileCount} | 淡色地図
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {onViewArea && (
                      <button
                        onClick={() => {
                          onViewArea(area.cityName, area.bounds);
                          onClose();
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #10b981',
                          background: '#fff',
                          color: '#10b981',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
                          <path d="M9 3v15M15 6v15" />
                        </svg>
                        地図を見る
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(area.area)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #dc2626',
                        background: '#fff',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {areas.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #dc2626',
                background: '#fff',
                color: '#dc2626',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              すべて削除
            </button>
          )}
        </div>

        {/* 新規ダウンロード */}
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>新規ダウンロード</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>地域</label>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedPrefecture('');
                  setSelectedCity('');
                }}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
              >
                <option value="">地域を選択</option>
                {Object.keys(REGIONS).map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>都道府県</label>
              <select
                value={selectedPrefecture}
                onChange={(e) => {
                  setSelectedPrefecture(e.target.value);
                  setSelectedCity('');
                }}
                disabled={!selectedRegion}
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  borderRadius: 6, 
                  border: '1px solid #ddd',
                  background: selectedRegion ? '#fff' : '#f5f5f5',
                  cursor: selectedRegion ? 'pointer' : 'not-allowed'
                }}
              >
                <option value="">都道府県を選択</option>
                {prefectures.map(pref => (
                  <option key={pref} value={pref}>{pref}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>市町村</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!selectedPrefecture}
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  borderRadius: 6, 
                  border: '1px solid #ddd',
                  background: selectedPrefecture ? '#fff' : '#f5f5f5',
                  cursor: selectedPrefecture ? 'pointer' : 'not-allowed'
                }}
              >
                <option value="">市町村を選択</option>
                {cities.map(city => (
                  <option key={city.name} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>ズームレベル (13推奨)</label>
              <input
                type="number"
                min="10"
                max="15"
                value={zoom}
                onChange={(e) => setZoom(parseInt(e.target.value))}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                ※ズームレベルが高いほどタイル数が増えます（淡色地図のみ）
              </div>
            </div>

            {downloading && (
              <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  ダウンロード中: {progress.current} / {progress.total}
                </div>
                <div style={{ width: '100%', height: 8, background: '#ddd', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                      height: '100%',
                      background: '#3b82f6',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                padding: '12px',
                borderRadius: 8,
                border: 'none',
                background: downloading ? '#ccc' : '#10b981',
                color: '#fff',
                cursor: downloading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {downloading ? 'ダウンロード中...' : 'ダウンロード開始'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
