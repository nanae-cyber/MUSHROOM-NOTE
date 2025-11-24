# Gemini API キー取得方法

MUSHROOM NOTEのAI判定機能を使用するには、Google Gemini APIキーが必要です。

## 手順

### 1. Google AI Studioにアクセス

https://makersuite.google.com/app/apikey

または

https://aistudio.google.com/app/apikey

### 2. Googleアカウントでログイン

- Googleアカウントでサインインします
- まだアカウントがない場合は、新規作成してください

### 3. APIキーを作成

1. 「Create API Key」または「APIキーを作成」ボタンをクリック
2. 既存のGoogle Cloudプロジェクトを選択するか、新規プロジェクトを作成
3. APIキーが生成されます（例: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`）

### 4. APIキーをコピー

- 生成されたAPIキーをコピーします
- **重要**: このキーは一度しか表示されないので、安全な場所に保存してください

### 5. プロジェクトに設定

#### 開発環境の場合:

1. プロジェクトのルートディレクトリに `.env.local` ファイルを作成
2. 以下の内容を記述:

```
VITE_GEMINI_API_KEY=あなたのAPIキー
```

3. 開発サーバーを再起動:

```bash
npm run dev
```

#### 本番環境の場合:

- Vercel、Netlifyなどのホスティングサービスの環境変数設定で `VITE_GEMINI_API_KEY` を設定

## 料金について

### 無料枠（2024年11月時点）

Gemini 1.5 Flashモデル:
- **無料**: 1分あたり15リクエスト、1日あたり1,500リクエスト
- **無料**: 月間100万トークンまで

通常の使用では無料枠で十分です。

### 有料プラン

無料枠を超える場合は、Google Cloud Platformで課金を有効にする必要があります。

詳細: https://ai.google.dev/pricing

## トラブルシューティング

### APIキーが動作しない場合

1. **APIキーが正しいか確認**
   - `.env.local` ファイルの内容を確認
   - 余分なスペースや改行がないか確認

2. **開発サーバーを再起動**
   - 環境変数の変更後は必ず再起動が必要

3. **APIが有効か確認**
   - Google Cloud Consoleで「Generative Language API」が有効になっているか確認
   - https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com

4. **ブラウザのコンソールを確認**
   - F12キーで開発者ツールを開く
   - コンソールタブで `[AI]` で始まるログを確認
   - エラーメッセージを確認

### よくあるエラー

#### `API key not valid`
- APIキーが間違っているか、無効です
- 新しいAPIキーを作成してください

#### `Quota exceeded`
- 無料枠の制限に達しました
- 時間をおいて再試行するか、有料プランに切り替えてください

#### `403 Forbidden`
- APIが有効になっていません
- Google Cloud ConsoleでGenerative Language APIを有効にしてください

## セキュリティ注意事項

⚠️ **重要**: APIキーは秘密情報です

- GitHubなどの公開リポジトリにコミットしないでください
- `.env.local` は `.gitignore` に含まれていることを確認してください
- 他人と共有しないでください
- 漏洩した場合は、すぐに無効化して新しいキーを作成してください

## 参考リンク

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API ドキュメント](https://ai.google.dev/docs)
- [料金ページ](https://ai.google.dev/pricing)
- [クイックスタート](https://ai.google.dev/tutorials/get_started_web)
