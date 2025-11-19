// src/utils/weather.ts
// OpenWeatherMap API連携

export interface WeatherData {
  temp: number;
  humidity: number;
  description: string;
  icon: string;
  rain?: number; // 降水量（mm）
}

export interface ForecastData {
  date: Date;
  temp: number;
  humidity: number;
  description: string;
  icon: string;
  rain: number;
}

// OpenWeatherMap APIキー（環境変数から取得）
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

/**
 * 現在の天気を取得
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
  if (!API_KEY) {
    console.warn('[Weather] API key not configured');
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ja`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      rain: data.rain?.['1h'] || 0,
    };
  } catch (err) {
    console.error('[Weather] Failed to fetch current weather:', err);
    return null;
  }
}

/**
 * 5日間の天気予報を取得
 */
export async function getWeatherForecast(lat: number, lon: number): Promise<ForecastData[]> {
  if (!API_KEY) {
    console.warn('[Weather] API key not configured');
    return [];
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ja`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 3時間ごとのデータを1日ごとに集約
    const dailyData: Record<string, ForecastData> = {};
    
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date,
          temp: item.main.temp,
          humidity: item.main.humidity,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          rain: item.rain?.['3h'] || 0,
        };
      } else {
        // 降水量を累積
        dailyData[dateKey].rain += item.rain?.['3h'] || 0;
      }
    });
    
    return Object.values(dailyData).slice(0, 5);
  } catch (err) {
    console.error('[Weather] Failed to fetch forecast:', err);
    return [];
  }
}

/**
 * 天気アイコンの絵文字を取得
 */
export function getWeatherEmoji(icon: string): string {
  const iconMap: Record<string, string> = {
    '01d': '☀️', // 晴れ（昼）
    '01n': '🌙', // 晴れ（夜）
    '02d': '⛅', // 少し曇り（昼）
    '02n': '☁️', // 少し曇り（夜）
    '03d': '☁️', // 曇り
    '03n': '☁️', // 曇り
    '04d': '☁️', // 曇り
    '04n': '☁️', // 曇り
    '09d': '🌧️', // にわか雨
    '09n': '🌧️', // にわか雨
    '10d': '🌦️', // 雨
    '10n': '🌧️', // 雨
    '11d': '⛈️', // 雷雨
    '11n': '⛈️', // 雷雨
    '13d': '❄️', // 雪
    '13n': '❄️', // 雪
    '50d': '🌫️', // 霧
    '50n': '🌫️', // 霧
  };
  
  return iconMap[icon] || '🌤️';
}

/**
 * きのこ発生確率を計算（天気データを考慮）
 */
export function calculateMushroomProbability(
  currentWeather: WeatherData | null,
  forecast: ForecastData[],
  lastYearCount: number
): {
  probability: 'high' | 'medium' | 'low';
  reason: string;
  bestDays: string[];
} {
  let probability: 'high' | 'medium' | 'low' = 'low';
  let reasons: string[] = [];
  const bestDays: string[] = [];
  
  // 過去データによる基本確率
  if (lastYearCount > 10) {
    probability = 'high';
    reasons.push(`去年の同時期に${lastYearCount}件の観察記録`);
  } else if (lastYearCount > 5) {
    probability = 'medium';
    reasons.push(`去年の同時期に${lastYearCount}件の観察記録`);
  } else {
    reasons.push('去年の同時期の観察記録は少なめ');
  }
  
  // 現在の天気を考慮
  if (currentWeather) {
    if (currentWeather.humidity > 70) {
      if (probability === 'low') probability = 'medium';
      else if (probability === 'medium') probability = 'high';
      reasons.push('湿度が高い（きのこに最適）');
    }
    
    if (currentWeather.rain && currentWeather.rain > 0) {
      reasons.push('雨が降っている（2〜3日後が狙い目）');
    }
  }
  
  // 予報から雨の日を検出
  forecast.forEach((day, index) => {
    if (day.rain > 5) {
      const daysAfter = index + 2; // 雨の2日後
      if (daysAfter <= 5) {
        const date = new Date(day.date);
        date.setDate(date.getDate() + 2);
        bestDays.push(`${date.getMonth() + 1}/${date.getDate()}`);
        
        if (index <= 1) {
          // 今日・明日の雨なら確率UP
          if (probability === 'low') probability = 'medium';
          else if (probability === 'medium') probability = 'high';
          reasons.push(`${index === 0 ? '今日' : '明日'}雨予報（2〜3日後が狙い目）`);
        }
      }
    }
  });
  
  return {
    probability,
    reason: reasons.join('、'),
    bestDays,
  };
}

/**
 * 位置情報を取得
 */
export async function getCurrentPosition(): Promise<{ lat: number; lon: number } | null> {
  if (!navigator.geolocation) {
    console.warn('[Weather] Geolocation not supported');
    return null;
  }
  
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.error('[Weather] Failed to get position:', error);
        resolve(null);
      },
      {
        timeout: 10000,
        maximumAge: 300000, // 5分間キャッシュ
      }
    );
  });
}
