# SEO診断アプリ

Google公式ガイドラインに基づくSEO診断・スコアリング・AI改善提案ツール

[![Deploy to GitHub Pages](https://github.com/kim777fk-max/SEO/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/kim777fk-max/SEO/actions)

## 🌐 デモサイト

**https://kim777fk-max.github.io/SEO/**

上記URLから直接アクセスして、すぐにSEO診断を試すことができます！

## 概要

このアプリケーションは、URLを入力するだけでGoogle Search Centralの公式ガイドラインに基づいてSEO診断を行い、100点満点でスコア化し、AI（OpenAI/Claude）による改善提案を提供します。

## 主な機能

### 1. SEO診断
- **URLからHTML取得**: 任意のWebページのHTMLを自動取得して解析
- **HTML直接入力**: HTMLコンテンツを直接貼り付けて診断
- **包括的な解析**: タイトル、メタタグ、見出し構造、画像、リンク、構造化データなど

### 2. スコアリング（100点満点）
以下のカテゴリ別に採点：
- **Technical SEO (30点)**: タイトル、メタディスクリプション、見出し構造、Canonicalタグ、Viewport等
- **Helpful Content (25点)**: コンテンツ量、画像のalt属性、リンク構造、読みやすさ
- **E-E-A-T (20点)**: 著者情報、公開日、HTTPS、連絡先情報
- **Structured Data (15点)**: JSON-LD、Schema.org
- **Page Experience (10点)**: モバイル対応、言語属性、文字エンコーディング

### 3. AI改善提案
- **OpenAI GPT-4**: より詳細な改善提案（APIキー必要）
- **Claude AI**: Anthropic Claudeによる分析（APIキー必要）
- **ルールベース分析**: API未設定でも基本的な改善提案を提供

### 4. ビジュアル化
- 円グラフによるスコア表示
- カテゴリ別のプログレスバー
- 重要度別の問題点一覧
- レスポンシブデザイン対応

## ファイル構成

```
/
├── index.html                      # メインUI
├── style.css                       # レスポンシブ対応スタイルシート
├── app.js                          # メインアプリケーションロジック
├── data/
│   └── google_seo_guides.json     # Google SEOガイドラインルール定義
└── modules/
    ├── fetch_html.js              # HTML取得モジュール
    ├── parser.js                  # HTML解析モジュール
    ├── scorer.js                  # 採点ロジックモジュール
    └── ai_analyzer.js             # AI分析モジュール
```

## 使い方

### オンラインで使用（推奨）

GitHub Pagesで公開されているので、すぐに使えます：

👉 **https://kim777fk-max.github.io/SEO/**

### ローカルで使用

1. **リポジトリをクローン**
   ```bash
   git clone https://github.com/kim777fk-max/SEO.git
   cd SEO
   ```

2. **ローカルサーバーを起動**
   ```bash
   # ローカルサーバーを起動（推奨）
   python -m http.server 8000
   # または
   npx serve
   ```

3. **ブラウザで開く**
   - http://localhost:8000 にアクセス

### アプリの使用方法

1. **URLまたはHTMLを入力**
   - URLモード: 診断したいWebページのURLを入力
   - HTMLモード: HTMLコンテンツを直接貼り付け

2. **診断を実行**
   - 「SEO診断を開始」ボタンをクリック

3. **結果を確認**
   - 総合スコア
   - カテゴリ別スコア
   - 検出された問題点
   - AI改善提案
   - 詳細データ

### AI機能の設定（オプション）

より詳細な改善提案を得るには、以下のいずれかのAPIキーを設定してください：

#### OpenAI APIの場合
1. [OpenAI Platform](https://platform.openai.com/)でAPIキーを取得
2. アプリの「AI設定」セクションで「OpenAI (GPT-4)」を選択
3. APIキーを入力して保存

#### Claude APIの場合
1. [Anthropic Console](https://console.anthropic.com/)でAPIキーを取得
2. アプリの「AI設定」セクションで「Claude (Anthropic)」を選択
3. APIキーを入力して保存

**注意**: APIキーはブラウザのLocalStorageに保存されます。

## Google SEOガイドラインの準拠

このアプリは以下のGoogle公式ガイドラインに基づいています：

- [Helpful Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [E-E-A-T](https://developers.google.com/search/docs/fundamentals/creating-helpful-content#who-when-how)
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Structured Data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Page Experience](https://developers.google.com/search/docs/appearance/page-experience)

## 技術スタック

- **フロントエンド**: Vanilla JavaScript (ES6+)
- **スタイル**: CSS3 (CSS Variables, Flexbox, Grid)
- **HTML解析**: DOMParser API
- **AI統合**: OpenAI API / Claude API
- **データストレージ**: LocalStorage

## 特徴

- ✅ 完全ローカル動作（API部分を除く）
- ✅ レスポンシブデザイン（モバイル/タブレット/デスクトップ対応）
- ✅ CORS制限に対応（複数のプロキシフォールバック）
- ✅ API未設定でも基本機能が利用可能
- ✅ モダンでクリーンなUI/UX
- ✅ アクセシビリティ対応
- ✅ 印刷対応

## デプロイ

### GitHub Pagesでの公開

このリポジトリはGitHub Actionsで自動デプロイされます。

#### 初回設定

1. **GitHub Pagesを有効化**
   - GitHubリポジトリページにアクセス
   - `Settings` > `Pages` に移動
   - `Source` を `GitHub Actions` に設定

2. **自動デプロイ**
   - `main` ブランチまたは `claude/seo-diagnostic-app-*` ブランチにプッシュすると自動的にデプロイされます
   - デプロイ状況は `Actions` タブで確認できます

3. **公開URL**
   - https://kim777fk-max.github.io/SEO/

#### カスタムドメインの設定（オプション）

1. リポジトリの `Settings` > `Pages` で `Custom domain` を設定
2. DNSレコードを設定
3. `Enforce HTTPS` を有効化

## 今後の拡張予定

- [ ] Google Search Console API連携
- [ ] Google Analytics 4 (GA4) 連携
- [ ] PageSpeed Insights API統合
- [ ] Core Web Vitals計測
- [ ] レポートのPDFエクスポート
- [ ] 履歴管理機能
- [ ] 複数URL一括診断
- [ ] スケジュール診断

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題が発生した場合は、GitHubのIssuesセクションで報告してください。

---

**注意**: このツールはあくまで診断ツールです。実際のSEO改善には、コンテンツの質の向上、技術的な最適化、継続的な改善が必要です。
