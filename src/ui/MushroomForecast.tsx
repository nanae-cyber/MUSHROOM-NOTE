// src/ui/MushroomForecast.tsx
import React, { useEffect, useState } from 'react';
import { db, type Row } from '../utils/db';
import {
  getCurrentWeather,
  getWeatherForecast,
  calculateMushroomProbability,
  getCurrentPosition,
  getWeatherEmoji,
  type WeatherData,
  type ForecastData as WeatherForecastData,
} from '../utils/weather';
import {
  classifyAreas,
  enrichAreasWithNames,
  isInArea,
  getAreaDisplayName,
  type Area,
  type Location,
} from '../utils/location';

interface ForecastData {
  probability: 'high' | 'medium' | 'low';
  reason: string;
  recommendedSpecies: string[];
  lastYearData: { name: string; count: number }[];
  bestDays: string[];
}

import { t, type Lang } from '../i18n';

interface MushroomForecastProps {
  lang: Lang;
}

export function MushroomForecast({ lang }: MushroomForecastProps) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecastData[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [areasLoading, setAreasLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await db.list();
        setItems(data);
        
        // GPS座標を抽出してエリア分類
        const locations: Location[] = data
          .map(item => {
            const gps = (item.meta as any)?.gps;
            if (gps?.lat && gps?.lon) {
              return { lat: gps.lat, lon: gps.lon };
            }
            return null;
          })
          .filter((loc): loc is Location => loc !== null);
        
        if (locations.length > 0) {
          const classifiedAreas = classifyAreas(locations);
          const enrichedAreas = await enrichAreasWithNames(classifiedAreas);
          setAreas(enrichedAreas);
          
          // デフォルトで最も観察記録が多いエリアを選択
          if (enrichedAreas.length > 0) {
            setSelectedArea(enrichedAreas[0]);
          }
        }
        setAreasLoading(false);
        
        // 位置情報を取得して天気を取得
        const position = await getCurrentPosition();
        if (position) {
          const [weather, forecast] = await Promise.all([
            getCurrentWeather(position.lat, position.lon),
            getWeatherForecast(position.lat, position.lon),
          ]);
          setCurrentWeather(weather);
          setWeatherForecast(forecast);
        }
        setWeatherLoading(false);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);
  
  // エリアが変更されたら天気を取得
  useEffect(() => {
    if (!selectedArea) return;
    
    const fetchWeatherForArea = async () => {
      setWeatherLoading(true);
      try {
        const [weather, forecast] = await Promise.all([
          getCurrentWeather(selectedArea.center.lat, selectedArea.center.lon),
          getWeatherForecast(selectedArea.center.lat, selectedArea.center.lon),
        ]);
        setCurrentWeather(weather);
        setWeatherForecast(forecast);
      } catch (err) {
        console.error('[Forecast] Failed to fetch weather for area:', err);
      } finally {
        setWeatherLoading(false);
      }
    };
    
    fetchWeatherForArea();
  }, [selectedArea]); // selectedAreaのみに依存
  
  // 天気データが更新されたら予報を再計算
  useEffect(() => {
    if (items.length === 0) return;
    
    if (selectedArea) {
      const areaItems = items.filter(item => {
        const gps = (item.meta as any)?.gps;
        if (!gps?.lat || !gps?.lon) return false;
        return isInArea({ lat: gps.lat, lon: gps.lon }, selectedArea);
      });
      
      const forecastData = calculateForecast(areaItems, currentWeather, weatherForecast);
      setForecast(forecastData);
    } else {
      // エリアが選択されていない場合は全データで予報
      const forecastData = calculateForecast(items, currentWeather, weatherForecast);
      setForecast(forecastData);
    }
  }, [items, selectedArea, currentWeather, weatherForecast]);

  const calculateForecast = (
    data: Row[],
    weather: WeatherData | null,
    forecast: WeatherForecastData[]
  ): ForecastData => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // 去年の同時期（±2週間）のデータを取得
    const lastYearStart = new Date(now.getFullYear() - 1, currentMonth, currentDay - 14);
    const lastYearEnd = new Date(now.getFullYear() - 1, currentMonth, currentDay + 14);
    
    const lastYearItems = data.filter(item => {
      const date = new Date(item.createdAt);
      return date >= lastYearStart && date <= lastYearEnd;
    });
    
    // きのこの種類別カウント
    const speciesCount: Record<string, number> = {};
    lastYearItems.forEach(item => {
      const name = (item.meta as any)?.detail?.mushroomName;
      if (name && name.trim() !== '') {
        speciesCount[name] = (speciesCount[name] || 0) + 1;
      }
    });
    
    const lastYearData = Object.entries(speciesCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // 季節判定
    const season = getSeasonInfo(currentMonth);
    
    // 天気を考慮した発生確率の判定
    const weatherProbability = calculateMushroomProbability(
      weather,
      forecast,
      lastYearItems.length
    );
    
    const reason = `${weatherProbability.reason}。${season.description}`;
    
    // おすすめの種類
    const recommendedSpecies = lastYearData.slice(0, 3).map(d => d.name);
    
    return {
      probability: weatherProbability.probability,
      reason,
      recommendedSpecies,
      lastYearData,
      bestDays: weatherProbability.bestDays,
    };
  };

  const getSeasonInfo = (month: number) => {
    if (month >= 3 && month <= 5) {
      return { name: '春', description: '春は多くのきのこが発生する季節です。' };
    } else if (month >= 6 && month <= 8) {
      return { name: '夏', description: '梅雨明け後はきのこの発生が活発になります。' };
    } else if (month >= 9 && month <= 11) {
      return { name: '秋', description: '秋はきのこのベストシーズンです！' };
    } else {
      return { name: '冬', description: '冬はきのこの発生が少ない季節です。' };
    }
  };

  if (loading) return <div style={{ padding: 20 }}>{t('loading_forecast')}</div>;
  if (!forecast) return null;

  const probabilityColor = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#6b7280',
  };

  const probabilityLabel = {
    high: t('probability_high'),
    medium: t('probability_medium'),
    low: t('probability_low'),
  };

  const probabilityIcon = {
    high: '🍄🍄🍄',
    medium: '🍄🍄',
    low: '🍄',
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* エリア選択 */}
      {!areasLoading && areas.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
            📍 {t('select_area')}
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <button
              onClick={() => setSelectedArea(null)}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: selectedArea === null ? '2px solid #667eea' : '1px solid #e5e7eb',
                background: selectedArea === null ? '#f0f4ff' : '#fff',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: selectedArea === null ? 600 : 400,
              }}
            >
              🌍 全エリア（{items.length}件）
            </button>
            {areas.map((area, index) => (
              <button
                key={area.id}
                onClick={() => setSelectedArea(area)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: selectedArea?.id === area.id ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: selectedArea?.id === area.id ? '#f0f4ff' : '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: selectedArea?.id === area.id ? 600 : 400,
                }}
              >
                📍 {getAreaDisplayName(area, index)}
              </button>
            ))}
          </div>
          <div style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: '#f9fafb',
            fontSize: 12,
            color: '#666',
            lineHeight: 1.5,
          }}>
            💡 GPS座標から自動的にエリアを分類しています。5km以内の観察記録を同じエリアとしてグループ化しています。
          </div>
        </div>
      )}

      {/* きのこ予報 */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600 }}>
          🌦️ {t('forecast_title')}
          {selectedArea && (
            <span style={{ fontSize: 14, fontWeight: 400, color: '#666', marginLeft: 8 }}>
              - {selectedArea.name}
            </span>
          )}
        </h2>
        
        <div style={{
          padding: 20,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${probabilityColor[forecast.probability]}15 0%, ${probabilityColor[forecast.probability]}05 100%)`,
          border: `2px solid ${probabilityColor[forecast.probability]}40`,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 32 }}>{probabilityIcon[forecast.probability]}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: probabilityColor[forecast.probability] }}>
                {probabilityLabel[forecast.probability]}
              </div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                今日のきのこ発生確率
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#666' }}>
            {forecast.reason}
          </div>
        </div>

        {/* おすすめの種類 */}
        {forecast.recommendedSpecies.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              🎯 今の時期によく見られるきのこ
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {forecast.recommendedSpecies.map((name, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    background: '#f3f4f6',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 現在の天気 */}
        {!weatherLoading && currentWeather && (
          <div style={{
            padding: 16,
            borderRadius: 8,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
              {getWeatherEmoji(currentWeather.icon)} {t('current_weather')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#666' }}>
              <div>{t('temperature')}: {currentWeather.temp}°C</div>
              <div>{t('humidity')}: {currentWeather.humidity}%</div>
              <div>{currentWeather.description}</div>
            </div>
            {currentWeather.humidity > 70 && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#0284c7', fontWeight: 500 }}>
                ✨ 湿度が高く、きのこの発生に適した条件です
              </div>
            )}
          </div>
        )}

        {/* 狙い目の日 */}
        {forecast.bestDays.length > 0 && (
          <div style={{
            padding: 16,
            borderRadius: 8,
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
              🎯 きのこ狩りの狙い目
            </div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              雨の予報があります。以下の日が狙い目です：
              <div style={{ marginTop: 4, fontWeight: 600, color: '#f59e0b' }}>
                {forecast.bestDays.join('、')}
              </div>
            </div>
          </div>
        )}

        {/* 5日間の天気予報 */}
        {!weatherLoading && weatherForecast.length > 0 && (
          <div style={{
            padding: 16,
            borderRadius: 8,
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
              📅 5日間の天気予報
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {weatherForecast.map((day, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 8,
                    background: '#fff',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ fontSize: 24 }}>{getWeatherEmoji(day.icon)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {day.description}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(day.temp)}°C</div>
                    <div style={{ fontSize: 11, color: '#666' }}>湿度{day.humidity}%</div>
                  </div>
                  {day.rain > 5 && (
                    <div style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: '#dbeafe',
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#0284c7',
                    }}>
                      雨
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 天気情報のヒント */}
        <div style={{
          padding: 16,
          borderRadius: 8,
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
            💡 きのこ狩りのヒント
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: '#666' }}>
            <li>雨の2〜3日後がベストタイミング</li>
            <li>湿度が高い日は発生確率UP</li>
            <li>朝早い時間帯がおすすめ</li>
            <li>同じ場所に定期的に通うと発見率UP</li>
          </ul>
        </div>
      </div>

      {/* 去年の同時期のデータ */}
      {forecast.lastYearData.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
            📅 去年の同時期によく採れたきのこ
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {forecast.lastYearData.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: '#f9fafb',
                  borderRadius: 8,
                }}
              >
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
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    去年の同時期に{item.count}回観察
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 注意事項 */}
      <div style={{
        padding: 16,
        borderRadius: 8,
        background: 'rgba(239, 68, 68, 0.05)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#dc2626' }}>
          ⚠️ 注意事項
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#666' }}>
          {t('forecast_disclaimer')}
        </div>
      </div>
    </div>
  );
}
