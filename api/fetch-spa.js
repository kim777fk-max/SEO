export default async function handler(request, response) {
  const { url, spa } = request.query;

  if (!url) {
    return response.status(400).json({
      success: false,
      error: "url is required"
    });
  }

  try {
    const useSpa = spa === "1";

    if (useSpa) {
      // SPAモードを試行
      try {
        // 優先順位: ScrapingBee → Browserless.io → 通常fetch
        if (process.env.SCRAPINGBEE_API_KEY) {
          const html = await renderWithScrapingBee(url);
          return response.status(200).json({ success: true, html });
        } else if (process.env.BROWSERLESS_TOKEN) {
          const html = await renderWithBrowserless(url);
          return response.status(200).json({ success: true, html });
        }

        // どちらも設定されていない場合、通常fetchにフォールバック
        console.warn("SCRAPINGBEE_API_KEY or BROWSERLESS_TOKEN not set, falling back to simple fetch");
        const html = await simpleFetch(url);
        return response.status(200).json({
          success: true,
          html,
          warning: "SPAモード用のAPIキー（SCRAPINGBEE_API_KEY または BROWSERLESS_TOKEN）が設定されていません。完全なSPA対応には、いずれかのサービスのAPIキーが必要です。無料プランはこちら: https://www.scrapingbee.com/ または https://www.browserless.io/"
        });
      } catch (spaError) {
        console.error("SPA rendering failed:", spaError);

        // エラー時は通常fetchにフォールバック
        const html = await simpleFetch(url);
        return response.status(200).json({
          success: true,
          html,
          warning: "SPA HTMLの取得に失敗したため、通常モードで取得しました。JavaScriptで生成されるコンテンツは含まれていない可能性があります。"
        });
      }
    } else {
      // 通常モード
      const html = await simpleFetch(url);
      return response.status(200).json({ success: true, html });
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return response.status(500).json({
      success: false,
      error: error.message || "failed to fetch html"
    });
  }
}

/**
 * シンプルなHTMLフェッチ（JavaScriptレンダリングなし）
 */
async function simpleFetch(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SEO-Diagnostic-Bot/1.0)'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}

/**
 * ScrapingBeeを使用したSPAレンダリング
 * 無料プラン: 1,000リクエスト/月
 * https://www.scrapingbee.com/
 */
async function renderWithScrapingBee(url) {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  // JavaScript実行完了を待つ: 8秒
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${apiKey}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=false&wait=8000&wait_for=networkidle`;

  console.log("Starting ScrapingBee rendering for:", url);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ScrapingBee error:", response.status, errorText);
    throw new Error(`ScrapingBee error: ${response.status}`);
  }

  const html = await response.text();
  console.log("ScrapingBee content retrieved, length:", html.length);

  return html;
}

/**
 * Browserless.ioを使用したSPAレンダリング
 * 無料プラン: 月6時間（約360リクエスト）
 * https://www.browserless.io/
 */
async function renderWithBrowserless(url) {
  const token = process.env.BROWSERLESS_TOKEN;
  // 正しいエンドポイント: production-sfo.browserless.io
  const browserlessUrl = `https://production-sfo.browserless.io/content?token=${token}`;

  console.log("Starting Browserless.io rendering for:", url);

  const response = await fetch(browserlessUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      gotoOptions: {
        waitUntil: 'networkidle0',  // ネットワークが完全に安定するまで待機（500ms間リクエスト0件）
        timeout: 90000  // タイムアウト: 90秒
      }
      // 注: waitForパラメータは/content APIではサポートされていないため削除
      // networkidle0で十分な待機時間が確保されます
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Browserless.io error:", response.status, errorText);
    throw new Error(`Browserless.io error: ${response.status} - ${errorText}`);
  }

  const html = await response.text();
  console.log("Browserless.io content retrieved, length:", html.length);

  return html;
}

