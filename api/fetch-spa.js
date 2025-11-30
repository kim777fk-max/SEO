import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import { fetchHtml } from "../modules/fetch_html.js";

export default async function handler(request, response) {
  const { url, spa } = request.query;

  if (!url) {
    return response.status(400).json({ error: "url is required" });
  }

  try {
    const useSpa = spa === "1";
    const html = useSpa ? await renderSpa(url) : await fetchHtml(url);
    response.status(200).json({ html });
  } catch (error) {
    console.error("SPA render error:", error);
    response
      .status(500)
      .json({ error: error.message || "failed to fetch html" });
  }
}

async function renderSpa(url) {
  // chromium 設定
  chromium.setGraphicsMode(false);

  const executablePath = await chromium.executablePath(
    "https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar",
  );
  if (!executablePath) {
    throw new Error("Chromium executable path not resolved.");
  }

  const browser = await puppeteer.launch({
    args: puppeteer.defaultArgs({
      args: chromium.args,
      headless: "shell",
    }),
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: "shell",
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

  const content = await page.content();
  await browser.close();
  return content;
}
