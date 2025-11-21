// src/ui/StatsView.tsx
import React, { useEffect, useState } from 'react';
import { db, type Row } from '../utils/db';

export function StatsView() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await db.list();
        setItems(data);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>読み込み中...</div>;

  // 統計データを計算
  const totalCount = items.length;
  
  // 撮影日を取得する関数（occurAt > capturedAt > shotAt > createdAt）
  const getCaptureDate = (item: any): number => {
    return (
      (item.meta as any)?.occurAt ||
      (item.meta as any)?.capturedAt ||
      (item.meta as any)?.shotAt ||
      item.createdAt
    );
  };

  // 月別の観察数（撮影日ベース）
  const monthlyData = items.reduce((acc, item) => {
    const date = new Date(getCaptureDate(item));
    const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 最近6ヶ月のデータ
  const sortedMonths = Object.entries(monthlyData)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .reverse();

  const maxCount = Math.max(...sortedMonths.map(([, count]) => count), 1);

  // きのこの名前別の統計（未分類を除外）
  const nameStats = items.reduce((acc, item) => {
    const name = (item.meta as any)?.detail?.mushroomName;
    if (name && name.trim() !== '') {
      acc[name] = (acc[name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topNames = Object.entries(nameStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* サマリー */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600 }}>
          📊 観察統計
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: 16, background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#667eea' }}>{totalCount}</div>
            <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>総観察数</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>{Object.keys(nameStats).length}</div>
            <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>種類数</div>
          </div>
        </div>
      </div>

      {/* 月別グラフ */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
          📈 月別観察数
        </h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {sortedMonths.map(([month, count]) => (
            <div key={month} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 60, fontSize: 13, color: '#666' }}>{month}</div>
              <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 32, position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${(count / maxCount) * 100}%`,
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
                <div style={{ position: 'relative', padding: '0 12px', lineHeight: '32px', fontSize: 14, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  {count}回
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* きのこ別ランキング */}
      {topNames.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
            🏆 よく観察したきのこ TOP5
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {topNames.map(([name, count], index) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  background: index === 0 ? '#fbbf24' : index === 1 ? '#d1d5db' : index === 2 ? '#f59e0b' : '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  color: index < 3 ? '#fff' : '#666',
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#667eea' }}>
                  {count}回
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
