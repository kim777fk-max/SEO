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
        // Browserless.ioを優先的に使用
        if (process.env.BROWSERLESS_TOKEN) {
          const html = await renderWithBrowserless(url);
          return response.status(200).json({ success: true, html });
        }

        // Browserless.ioが設定されていない場合、通常fetchにフォールバック
        console.warn("BROWSERLESS_TOKEN not set, falling back to simple fetch");
        const html = await simpleFetch(url);
        return response.status(200).json({
          success: true,
          html,
          warning: "SPAモード用のBROWSERLESS_TOKENが設定されていません。通常モードで取得しました。完全なSPA対応にはBrowserless.ioのAPIキーが必要です。"
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
 * Browserless.ioを使用したSPAレンダリング
 * 無料プラン: 月6時間（約360リクエスト）
 * https://www.browserless.io/
 */
async function renderWithBrowserless(url) {
  const token = process.env.BROWSERLESS_TOKEN;
  const browserlessUrl = `https://chrome.browserless.io/content?token=${token}`;

  console.log("Starting Browserless.io rendering for:", url);

  const response = await fetch(browserlessUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      gotoOptions: {
        waitUntil: 'networkidle0',
        timeout: 60000
      },
      waitFor: 2000 // JavaScriptの実行を2秒待つ
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Browserless.io error:", response.status, errorText);
    throw new Error(`Browserless.io error: ${response.status}`);
  }

  const html = await response.text();
  console.log("Browserless.io content retrieved, length:", html.length);

  return html;
}

