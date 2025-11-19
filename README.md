# Kinoko Field Notes — PWA Starter

オフライン前提の「撮影だけ / 詳細登録」2モード、IndexedDB保存、**クラウド自動同期**、ZIPエクスポート/インポート、AI判定スタブ入り。

## 🌟 新機能

### オフライン同期
- **山の中（オフライン）でも完全に動作**
- **Wi-Fi接続時に自動的にクラウドと同期**
- 複数デバイス間でのデータ共有
- データのバックアップ

詳しくは [SYNC_SETUP.md](./SYNC_SETUP.md) を参照してください。

### きのこ予報（プレミアムプラス限定）
- **天気予報と過去データからきのこ発生確率を予測**
- OpenWeatherMap APIで5日間の天気予報を取得
- 雨の2〜3日後の狙い目を自動表示
- 去年の同時期のデータと組み合わせた高精度予報
- **エリア別予報**: GPS座標から自動的にエリアを分類し、エリアごとの予報を表示
- OpenStreetMap Nominatim APIで地名を自動取得

## 使い方

### 環境変数の設定

1. `.env.example` をコピーして `.env` を作成
```bash
cp .env.example .env
```

2. OpenWeatherMap APIキーを取得（無料）
   - https://openweathermap.org/api にアクセス
   - アカウント作成後、APIキーを取得
   - `.env` の `VITE_OPENWEATHER_API_KEY` に設定

3. Supabase設定（クラウド同期を使う場合）
   - [SYNC_SETUP.md](./SYNC_SETUP.md) を参照

### 開発サーバー起動

```bash
# Node 18+ 推奨
npm i
npm run dev
# http://localhost:5173 を開く
```

### ビルド & PWA（オフライン）
```bash
npm run build
npm run preview
# プレビューをスマホで開き、「ホーム画面に追加」→ オフラインで起動可
```

## フォルダ構成
- `src/ui/*` UIコンポーネント（CaptureToggle / CameraCapture / DetailForm / SpecimenList）
- `src/usecases/saveSpecimen.ts` 保存ユースケース（写真保存→AIスタブ実行）
- `src/utils/db.ts` Dexieスキーマ & ZIPエクスポート/インポート
- `src/utils/ai.ts` ローカルAI（ダミー）。後で onnxruntime-web に差し替え可。
- `public/sw.js` 開発時の簡易SW（本番は vite-plugin-pwa が生成）

## 追加 ToDo（任意）
- 位置情報 / 方位の付与（Geolocation / DeviceOrientation API）
- 画像圧縮（browser-image-compression）
- 地図（Leaflet + タイルプリキャッシュUI）
- 本格AI（onnxruntime-web + 軽量モデルを /public/model に配置し、Workboxでキャッシュ）
- モードごとの連写/回転最適化、音声メモ
- 免責表示（初回起動）

## ライセンス・注意
食用可否は一切表示しません。観察・記録用アプリとして提供してください。
