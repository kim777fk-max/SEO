import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

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
        const html = await renderSpa(url);
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
 * SPAレンダリング（Puppeteer + Chromium）
 */
async function renderSpa(url) {
  console.log("Starting SPA rendering for:", url);

  // chromium 設定
  chromium.setGraphicsMode(false);
  chromium.setHeadlessMode(true);

  const executablePath = await chromium.executablePath(
    "https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar",
  );

  console.log("Chromium executable path:", executablePath);

  if (!executablePath) {
    throw new Error("Chromium executable path not resolved.");
  }

  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  });

  console.log("Browser launched successfully");

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    const content = await page.content();
    console.log("Page content retrieved, length:", content.length);
    return content;
  } finally {
    await browser.close();
    console.log("Browser closed");
  }
}
