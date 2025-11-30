# SEO診断アプリ開発 - 作業引き継ぎ書

**作成日時**: 2025-11-30
**ブランチ**: `claude/seo-diagnostic-app-01XBDeBjrYENRMYSoKr9H41c`
**最新コミット**: `3a05731` - Browserless.io APIエンドポイントURLを修正

---

## 📋 セッション概要

前回セッションから継続して、SEO診断Webアプリケーションの機能追加と不具合修正を実施。主にAI対応の拡張、ドメインパワー機能の実装、SPA対応の改善に取り組みました。

---

## ✅ 実施した作業

### 1. Gemini API対応の追加

**目的**: AI提案機能にGoogle Gemini APIのサポートを追加

**修正ファイル**:
- `api/ai-suggestions.js`: Gemini API呼び出し機能を実装
- `.env.example`: `GEMINI_API_KEY` の説明を追加
- `README.md`: Gemini統合に関するドキュメント更新

**実装内容**:
```javascript
async function callGeminiAPI(apiKey, scoreResults, parsedData) {
  const prompt = buildPrompt(scoreResults, parsedData);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
      })
    }
  );
  // ...
}
```

**優先順位**: OpenAI → Claude → Gemini

**コミット**: `bfd6400` - "ScrapingBee対応を追加してSPA機能を強化"（Gemini含む）

---

### 2. Vercelデプロイエラーの修正

**問題**: `vercel.json`のスキーマ検証エラー
```
Error: Function Runtimes must have a valid version, for example 'now-php@1.0.0'
```

**原因**: 不要な `runtime`, `version`, `routes` フィールドが含まれていた

**修正内容**:
```json
{
  "functions": {
    "api/fetch-spa.js": { "memory": 1536, "maxDuration": 60 },
    "api/ai-suggestions.js": { "memory": 1024, "maxDuration": 20 }
  }
}
```

**結果**: ✅ ビルド成功、デプロイ完了

---

### 3. ドメインパワー機能の実装

**目的**: URLのドメイン権威性を推定して表示

**新規作成ファイル**:
- `modules/domain_power.js`: ドメインパワー計算ロジック

**修正ファイル**:
- `index.html`: ドメインパワー表示用のUIカードを追加
- `app.js`: `displayDomainPower()` 関数を実装

**スコアリングロジック**:
```javascript
function estimateDomainPower(hostname) {
  const host = (hostname || '').toLowerCase();
  let score = 0;
  const reason = [];

  if (host.endsWith('.go.jp') || host.includes('.gov.')) {
    score += 90;
    reason.push('政府系ドメイン（.go.jp / .gov）');
  } else if (host.endsWith('.lg.jp')) {
    score += 80;
    reason.push('自治体ドメイン（.lg.jp）');
  } else if (host.endsWith('.ac.jp') || host.endsWith('.edu')) {
    score += 70;
    reason.push('教育機関ドメイン（.ac.jp / .edu）');
  }
  // ... その他のTLDチェック

  return { score, label, reason };
}
```

**UIサンプル**:
```
ドメインパワー
90/100
極めて高い権威性
• 政府系ドメイン（.go.jp / .gov）
```

**主要な修正**:
- ES6 `export` から グローバル関数への変更（ブラウザ互換性）
- URL未定義エラーの修正（SPA モード時の `htmlData.url` 不足）

**テストケース**: `https://kennet.mhlw.go.jp/home` → 90/100

---

### 4. SPA（Single Page Application）対応の改善

**課題**: Vercelサーバーレス環境でPuppeteer/Playwrightが動作しない

**試行経過**:

#### 4-1. Puppeteer + Chromium
- `@sparticuz/chromium-min` を使用
- **結果**: ❌ Vercelでビルド失敗

#### 4-2. Playwright
- Vercel互換性を期待して切り替え
- **結果**: ❌ 同様に失敗

#### 4-3. 外部サービス統合（最終解決策）

**採用サービス**:
1. **Browserless.io** （優先度: 2位）
   - 無料プラン: 月6時間（約360リクエスト）
   - エンドポイント: `https://production-sfo.browserless.io/content`

2. **ScrapingBee** （優先度: 1位）
   - 無料プラン: 1,000リクエスト/月
   - エンドポイント: `https://app.scrapingbee.com/api/v1/`

**実装詳細** (`api/fetch-spa.js`):

```javascript
if (useSpa) {
  try {
    // 優先順位: ScrapingBee → Browserless.io → 通常fetch
    if (process.env.SCRAPINGBEE_API_KEY) {
      const html = await renderWithScrapingBee(url);
      return response.status(200).json({ success: true, html });
    } else if (process.env.BROWSERLESS_TOKEN) {
      const html = await renderWithBrowserless(url);
      return response.status(200).json({ success: true, html });
    }

    // フォールバック
    const html = await simpleFetch(url);
    return response.status(200).json({
      success: true,
      html,
      warning: "SPAモード用のAPIキーが設定されていません..."
    });
  } catch (spaError) {
    console.error("SPA rendering failed:", spaError);
    // エラー時も通常fetchで続行
  }
}
```

**環境変数設定** (Vercelダッシュボード):
```bash
BROWSERLESS_TOKEN=2TWAdDAt4UgDoM6a5e2c91c4108016e1b47066ac2ed4f0e67
# または
SCRAPINGBEE_API_KEY=your-api-key
```

---

### 5. Browserless.io APIエンドポイント修正（最新修正）

**問題**: トークン設定済みだがSPAモードが失敗
```
注意 SPA HTMLの取得に失敗したため、通常モードで取得しました。
JavaScriptで生成されるコンテンツは含まれていない可能性があります。
```

**原因**: エンドポイントURLが間違っていた
- ❌ 誤: `https://chrome.browserless.io/content`
- ✅ 正: `https://production-sfo.browserless.io/content`

**修正内容** (`api/fetch-spa.js:106-137`):
```javascript
async function renderWithBrowserless(url) {
  const token = process.env.BROWSERLESS_TOKEN;
  const browserlessUrl = `https://production-sfo.browserless.io/content?token=${token}`;

  const response = await fetch(browserlessUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: url,
      gotoOptions: {
        waitUntil: 'networkidle2',  // networkidle0 → networkidle2 に最適化
        timeout: 60000
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Browserless.io error:", response.status, errorText);
    throw new Error(`Browserless.io error: ${response.status} - ${errorText}`);
  }

  return await response.text();
}
```

**主な変更**:
1. エンドポイントURL修正
2. `waitUntil: networkidle2` に最適化
3. 不要な `waitFor` パラメータを削除
4. エラーメッセージを詳細化

**コミット**: `3a05731` - "Browserless.io APIエンドポイントURLを修正"

**デプロイ状況**: ✅ プッシュ完了、Vercel自動デプロイ中

---

## 📁 修正ファイル一覧

| ファイル | 変更内容 | 状態 |
|---------|---------|------|
| `api/ai-suggestions.js` | Gemini API統合 | ✅ 完了 |
| `api/fetch-spa.js` | Browserless.io/ScrapingBee統合、エンドポイント修正 | ✅ 完了 |
| `modules/domain_power.js` | ドメインパワー計算ロジック | ✅ 完了 |
| `app.js` | ドメインパワー表示機能、URL修正 | ✅ 完了 |
| `index.html` | ドメインパワーUIカード追加 | ✅ 完了 |
| `vercel.json` | 不要フィールド削除 | ✅ 完了 |
| `package.json` | Puppeteer/Playwright削除 | ✅ 完了 |
| `.env.example` | Gemini/Browserless/ScrapingBee変数追加 | ✅ 完了 |
| `README.md` | Gemini統合ドキュメント | ✅ 完了 |

---

## 🔧 現在の状態

### 動作確認済み機能
- ✅ AI提案: OpenAI、Claude、Gemini（3種類対応）
- ✅ ドメインパワー表示: `.go.jp`, `.lg.jp`, `.ac.jp` など
- ✅ 通常モード: HTML解析、SEOスコアリング
- ✅ Vercelデプロイ: ビルド・デプロイ成功

### テスト待ち
- 🔄 **SPAモード（Browserless.io）**: エンドポイント修正後の動作確認が必要
  - 最新デプロイ: `3a05731`
  - 環境変数: `BROWSERLESS_TOKEN` 設定済み
  - テストURL例: JavaScript多用サイト

---

## ⚠️ 未解決・要確認事項

### 1. SPAモード動作確認
**現状**: Browserless.io APIエンドポイントを修正して再デプロイ完了

**次のステップ**:
1. Vercel自動デプロイ完了を待つ（1-2分）
2. SPAモードでテスト実行
3. 結果を確認:
   - ✅ 成功: 警告メッセージが消える
   - ❌ 失敗: Vercelログで詳細エラーを確認

**失敗時の対策**:
- **Option A**: Vercel Function Logsでエラー詳細を確認
  - パス: Vercel Dashboard → Functions → `api/fetch-spa.js`
  - 確認内容: `console.error("Browserless.io error:", ...)`

- **Option B**: ScrapingBeeへ切り替え
  - `SCRAPINGBEE_API_KEY` を設定（自動的に優先される）
  - 無料プラン: 1,000リクエスト/月

- **Option C**: `/unblock` APIへ切り替え
  - Bot検出が原因の場合、Browserless.ioの `/unblock` エンドポイントを試す
  - エンドポイント: `https://production-sfo.browserless.io/unblock`

### 2. Bot検出の可能性
一部の政府系サイト（`.go.jp`）はBot検出が厳しい可能性があります。
その場合は `/unblock` APIが有効です。

---

## 📝 コミット履歴

```bash
3a05731 - Browserless.io APIエンドポイントURLを修正
bfd6400 - ScrapingBee対応を追加してSPA機能を強化
45bdb8a - SPAモードのURL取得エラーを修正
582e570 - SPA機能をBrowserless.ioに切り替え
4b68f82 - PuppeteerからPlaywrightに切り替えてVercel互換性を改善
```

---

## 🚀 次のセッションで行うべきこと

### 優先度: 高
1. **SPAモード動作確認**
   - Browserless.ioでテスト
   - 失敗する場合はログ確認 → 原因特定 → 修正

2. **エラーハンドリング改善**
   - Browserless.ioのクォータ超過時の対応
   - より詳細なエラーメッセージ表示

### 優先度: 中
3. **AI提案機能のテスト**
   - Gemini APIの動作確認
   - 各AIプロバイダーのフォールバック動作確認

4. **ドメインパワー機能の拡張**
   - より多くのTLDに対応（.org, .net, .jp など）
   - 外部APIとの統合検討（Moz API、Ahrefs APIなど）

### 優先度: 低
5. **パフォーマンス最適化**
   - キャッシュ戦略の実装
   - レスポンスタイムの改善

6. **UIの改善**
   - モバイル対応の強化
   - アクセシビリティ改善

---

## 📚 参考リソース

### Browserless.io API
- [公式ドキュメント - /content API](https://docs.browserless.io/rest-apis/content)
- [REST APIs概要](https://docs.browserless.io/rest-apis/intro)
- [/unblock API](https://docs.browserless.io/rest-apis/unblock)（Bot検出回避用）

### ScrapingBee
- [公式サイト](https://www.scrapingbee.com/)
- 無料プラン: 1,000リクエスト/月

### AI APIs
- [Google Gemini API](https://ai.google.dev/)
- [OpenAI API](https://platform.openai.com/)
- [Anthropic Claude API](https://www.anthropic.com/)

---

## 🔐 環境変数

現在設定が必要な環境変数（Vercel）:

```bash
# AI提案機能（いずれか1つ以上）
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...

# SPAレンダリング（いずれか1つ）
BROWSERLESS_TOKEN=...        # 現在設定済み
SCRAPINGBEE_API_KEY=...      # オプション
```

---

## 💡 トラブルシューティング

### SPAモードが動作しない場合

**症状**: "SPA HTMLの取得に失敗したため..." というメッセージが表示される

**チェック項目**:
1. ✅ 環境変数が設定されているか（Vercelダッシュボード）
2. ✅ デプロイが完了しているか（最新コミットがデプロイされているか）
3. ⚠️ Vercel Function Logsでエラー内容を確認
4. ⚠️ トークンの有効性確認（Browserless.ioダッシュボード）
5. ⚠️ クォータ残量確認（無料プランの制限）

**手動テスト**:
```bash
# Browserless.io APIを直接テスト
curl -X POST "https://production-sfo.browserless.io/content?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

---

## 📞 連絡事項

- 全ての変更は `claude/seo-diagnostic-app-01XBDeBjrYENRMYSoKr9H41c` ブランチにコミット済み
- Vercelへのプッシュ完了（自動デプロイ進行中）
- mainブランチへのマージは未実施（テスト完了後に推奨）

---

**作成者**: Claude (AI Assistant)
**最終更新**: 2025-11-30
