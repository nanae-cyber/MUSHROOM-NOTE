import React from "react";

export function CalendarPlaceholder() {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        きのこカレンダー（準備中）
      </div>
      <div style={{ opacity: 0.8 }}>
        昨年の観測データを今年のカレンダーに反映して発生予測を可視化予定です。
      </div>
    </div>
  );
}