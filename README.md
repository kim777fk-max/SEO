# SEO診断アプリ（Google公式ガイドライン準拠）

URLを入力すると HTML を取得し、構造解析・スコアリング・AI改善提案を実行するシングルページアプリです。SPA（JavaScriptレンダリング）に対応し、Vercel のサーバーレス関数で動作します。

## 構成
- `index.html` / `style.css` / `app.js`: クライアント UI。SPA モード/AI 提案のトグル、ハイライト付き HTML ビューアを提供。
- `modules/`
  - `fetch_html.js`: サーバー側での HTML 取得（User-Agent 指定）。
  - `parser.js`: DOMParser でタイトル・メタ・見出し・画像・リンク・構造化データを抽出。
  - `scorer.js`: `data/google_seo_guides.json` を読み込み 100 点満点で採点。
  - `domain_power.js`: ドメイン種別・サブドメインの特徴からドメインの強さをスコアリング。
- `api/`
  - `fetch-spa.js`: Puppeteer + @sparticuz/chromium-min で SPA レンダリング。`spa=1` 以外は静的取得。
  - `ai-suggestions.js`: OpenAI（gpt-5.1）/ Claude（Claude 3.5 Sonnet）/ Gemini（Gemini 2.5 Pro）のいずれかで改善提案を生成（キー未設定時は案内メッセージ）。
- `data/google_seo_guides.json`: Google 検索セントラルのベーシックな推奨事項をスコアリングルール化。
- `vercel.json`: Node 18 ランタイム、メモリ/タイムアウト調整済みのデプロイ設定。

### ディレクトリ構造（depth=2 相当）
```
.
├── README.md
├── api
│   ├── ai-suggestions.js
│   └── fetch-spa.js
├── app.js
├── data
│   └── google_seo_guides.json
├── index.html
├── modules
│   ├── fetch_html.js
│   ├── parser.js
│   ├── scorer.js
│   └── domain_power.js
├── package.json
├── style.css
└── vercel.json
```

## 環境変数（Vercel）
```
OPENAI_API_KEY=
CLAUDE_API_KEY=
GEMINI_API_KEY=
```
※ いずれか 1 つが設定されていれば AI 提案が動作します。

## デプロイメモ
- Vercel の Node.js 18 ランタイムを使用。Puppeteer は `@sparticuz/chromium-min` と `puppeteer-core` を `includeFiles` で同梱しているため追加ビルド不要です。
- `vercel.json` のルート設定で `/api/*` をサーバーレスへ、その他は `index.html` へフォールバックさせ SPA を提供します。
- SPA 解析は `GET /api/fetch-spa?url=...&spa=1`、非 SPA は `spa=0` を指定します。

### ビルドは必要？
- GitHub 連携または手動アップロードでデプロイすると、Vercel 側で自動的に `npm install` が走り、サーバーレス関数がビルドされます。
- フロントは静的ファイル（`index.html` / `style.css` / `app.js`）のみなので、追加のビルドコマンドや出力ディレクトリ指定は不要です。
- そのままデプロイすれば SPA モード・AI 提案ともに動作し、環境変数（`OPENAI_API_KEY` など）だけ設定すれば完了です。

## GitHub リポジトリから Vercel にデプロイする手順
1. **GitHub を Vercel にインポート**  
   Vercel の「Add New… > Project」で本リポジトリを選択。フレームワークは「Other」を選び、ビルドコマンド・出力ディレクトリは空のままで OK（静的配信 + サーバーレスのみ）。
2. **環境変数を設定**  
   プロジェクト設定の Environment Variables に `OPENAI_API_KEY` / `CLAUDE_API_KEY` / `GEMINI_API_KEY` を必要に応じて入力（1 つでも可）。
3. **vercel.json をそのまま使用**  
   本リポジトリ同梱の `vercel.json` が `/api/*` をサーバーレス、その他を `index.html` にルーティングし、`@sparticuz/chromium-min` + `puppeteer-core` を `includeFiles` で同梱します。追加設定は不要です。
4. **デプロイをトリガー**  
   「Deploy」を押すだけで Vercel 側が Node.js 18 ランタイムでビルド・デプロイ。完了後、`https://<your-domain>/api/fetch-spa?url=<対象URL>&spa=1` で SPA レンダリングを確認できます。
5. **GitHub Push 時の自動デプロイ**  
   以後は main ブランチへの push（または指定ブランチ）をトリガーに自動で再デプロイされます。環境変数は Vercel 側に保持されるので毎回設定は不要です。

## ローカル開発
静的ファイルとしてブラウザで `index.html` を開けます（AI 提案/SPA モードは Vercel などサーバー環境が必要）。
