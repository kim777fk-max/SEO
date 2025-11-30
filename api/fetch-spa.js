import { chromium } from 'playwright-core';

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
        const html = await renderSpaWithPlaywright(url);
        return response.status(200).json({ success: true, html });
      } catch (spaError) {
        console.error("SPA rendering failed, falling back to simple fetch:", spaError);

        // SPAモードが失敗した場合、シンプルなfetchにフォールバック
        const html = await simpleFetch(url);
        return response.status(200).json({
          success: true,
          html,
          warning: "SPAモードは現在Vercel環境で制限があるため、通常モードで取得しました。JavaScriptで生成されるコンテンツは含まれていない可能性があります。"
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
 * SPAレンダリング（Playwright + Chromium）
 * Playwrightはサーバーレス環境での動作が最適化されている
 */
async function renderSpaWithPlaywright(url) {
  console.log("Starting Playwright SPA rendering for:", url);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu',
      '--single-process',
      '--no-zygote'
    ]
  });

  console.log("Browser launched successfully");

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // JavaScriptの実行を待つ
    await page.waitForTimeout(2000);

    const content = await page.content();
    console.log("Page content retrieved, length:", content.length);

    return content;
  } finally {
    await browser.close();
    console.log("Browser closed");
  }
}
