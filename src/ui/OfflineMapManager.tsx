// オフライン地図管理UI
import React, { useState, useEffect } from 'react';
import { downloadAreaTiles, getDownloadedAreas, deleteArea, clearAllTiles } from '../utils/offlineMap';

interface Props {
  onClose: () => void;
}

export function OfflineMapManager({ onClose }: Props) {
  const [areas, setAreas] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [newArea, setNewArea] = useState({
    minLat: 35.0,
    maxLat: 36.0,
    minLon: 139.0,
    maxLon: 140.0,
    zoom: 13,
    mapType: 'std',
  });

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    const downloaded = await getDownloadedAreas();
    setAreas(downloaded);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setProgress({ current: 0, total: 0 });

    try {
      await downloadAreaTiles(
        {
          minLat: newArea.minLat,
          maxLat: newArea.maxLat,
          minLon: newArea.minLon,
          maxLon: newArea.maxLon,
        },
        newArea.zoom,
        newArea.mapType,
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
                  <div>
                    <div style={{ fontWeight: 600 }}>{area.area}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      ズーム: {area.zoom} | タイル数: {area.tileCount}
                    </div>
                  </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>最小緯度</label>
                <input
                  type="number"
                  step="0.1"
                  value={newArea.minLat}
                  onChange={(e) => setNewArea({ ...newArea, minLat: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>最大緯度</label>
                <input
                  type="number"
                  step="0.1"
                  value={newArea.maxLat}
                  onChange={(e) => setNewArea({ ...newArea, maxLat: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>最小経度</label>
                <input
                  type="number"
                  step="0.1"
                  value={newArea.minLon}
                  onChange={(e) => setNewArea({ ...newArea, minLon: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>最大経度</label>
                <input
                  type="number"
                  step="0.1"
                  value={newArea.maxLon}
                  onChange={(e) => setNewArea({ ...newArea, maxLon: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>ズームレベル (13推奨)</label>
              <input
                type="number"
                min="10"
                max="15"
                value={newArea.zoom}
                onChange={(e) => setNewArea({ ...newArea, zoom: parseInt(e.target.value) })}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                ※ズームレベルが高いほどタイル数が増えます
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>地図タイプ</label>
              <select
                value={newArea.mapType}
                onChange={(e) => setNewArea({ ...newArea, mapType: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
              >
                <option value="std">標準地図</option>
                <option value="pale">淡色地図</option>
              </select>
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
