/**
 * Vercel Serverless Function
 * SPA（Single Page Application）対応のHTML取得
 * JavaScriptをレンダリングした後のHTMLを返す
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONSリクエスト（プリフライト）への応答
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let browser = null;

  try {
    const { url, waitTime = 3000, waitUntil = 'networkidle0' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // URLのバリデーション
    let validatedUrl;
    try {
      validatedUrl = new URL(url);
      if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
        return res.status(400).json({ error: 'Invalid URL protocol' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log('Launching browser for:', validatedUrl.href);

    // Puppeteerブラウザを起動
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // User-Agentを設定（Googlebot風）
    await page.setUserAgent(
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    );

    // ページに移動
    console.log('Navigating to:', validatedUrl.href);
    await page.goto(validatedUrl.href, {
      waitUntil: waitUntil,
      timeout: 30000
    });

    // 追加の待機時間（JavaScriptの実行完了を待つ）
    if (waitTime > 0) {
      console.log(`Waiting ${waitTime}ms for JavaScript execution...`);
      await page.waitForTimeout(waitTime);
    }

    // レンダリング後のHTMLを取得
    const html = await page.content();

    // ページタイトルも取得
    const title = await page.title();

    // メタ情報を取得
    const metaData = await page.evaluate(() => {
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        charset: document.characterSet || '',
        lang: document.documentElement.lang || ''
      };
    });

    console.log('HTML fetched successfully, length:', html.length);

    await browser.close();
    browser = null;

    return res.status(200).json({
      success: true,
      html: html,
      url: validatedUrl.href,
      title: title,
      metaData: metaData,
      renderedAt: new Date().toISOString(),
      htmlLength: html.length
    });

  } catch (error) {
    console.error('SPA fetch error:', error);

    // ブラウザをクリーンアップ
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Browser close error:', closeError);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch SPA content',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
