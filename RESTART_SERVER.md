# 開発サーバーの再起動が必要です

## 理由
.env.local ファイルに VITE_GEMINI_API_KEY を設定しましたが、環境変数の変更は開発サーバーの再起動が必要です。

## 手順

1. 現在実行中の開発サーバーを停止（Ctrl+C）
2. 以下のコマンドで再起動：

```bash
npm run dev
```

または

```bash
yarn dev
```

## 確認方法

再起動後、ブラウザのコンソール（F12キー）を開いて、以下のログを確認：

```
[ENV] has gemini key? true
[AI] API key found, length: 39
```

APIキーの長さが39文字であれば正しく読み込まれています。

## トラブルシューティング

もしまだ動かない場合：

1. ブラウザのコンソールで「Available models:」のログを確認
2. 利用可能なモデルのリストが表示されているか確認
3. 表示されていない場合は、APIキーが無効な可能性があります

### APIキーの再生成

1. https://aistudio.google.com/app/apikey にアクセス
2. 「Create API key」をクリック
3. 新しいキーを .env.local に設定
4. 開発サーバーを再起動
