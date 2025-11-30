/**
 * HTML取得モジュール
 * URLからHTMLを取得する機能を提供
 */

class HTMLFetcher {
  constructor() {
    this.corsProxyUrl = 'https://api.allorigins.win/raw?url=';
  }

  /**
   * URLからHTMLを取得
   * @param {string} url - 取得するURL
   * @param {boolean} useCorsProxy - CORSプロキシを使用するか
   * @returns {Promise<Object>} { success: boolean, html: string, url: string, error?: string }
   */
  async fetchHTML(url, useCorsProxy = true) {
    try {
      // URLのバリデーション
      const validatedUrl = this.validateURL(url);
      if (!validatedUrl.valid) {
        return {
          success: false,
          url: url,
          error: validatedUrl.error
        };
      }

      let fetchUrl = validatedUrl.url;

      if (useCorsProxy) {
        // CORSプロキシを使用
        fetchUrl = this.corsProxyUrl + encodeURIComponent(validatedUrl.url);
      }

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml',
        },
        mode: useCorsProxy ? 'cors' : 'no-cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      if (!html || html.trim().length === 0) {
        return {
          success: false,
          url: validatedUrl.url,
          error: 'HTMLコンテンツが空です'
        };
      }

      return {
        success: true,
        html: html,
        url: validatedUrl.url,
        fetchedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('HTML取得エラー:', error);
      return {
        success: false,
        url: url,
        error: `取得エラー: ${error.message}`
      };
    }
  }

  /**
   * URLのバリデーション
   * @param {string} url - 検証するURL
   * @returns {Object} { valid: boolean, url?: string, error?: string }
   */
  validateURL(url) {
    if (!url || typeof url !== 'string') {
      return {
        valid: false,
        error: 'URLを入力してください'
      };
    }

    // URLの前後の空白を削除
    url = url.trim();

    // プロトコルがない場合はhttpsを追加
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      const urlObj = new URL(url);

      // HTTPまたはHTTPSのみ許可
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          valid: false,
          error: 'HTTPまたはHTTPSのURLを入力してください'
        };
      }

      return {
        valid: true,
        url: urlObj.href
      };
    } catch (error) {
      return {
        valid: false,
        error: '無効なURL形式です'
      };
    }
  }

  /**
   * HTMLを直接パース（ユーザーが貼り付けた場合）
   * @param {string} html - HTMLコンテンツ
   * @param {string} url - 元のURL（オプション）
   * @returns {Object}
   */
  parseDirectHTML(html, url = 'Direct Input') {
    if (!html || typeof html !== 'string' || html.trim().length === 0) {
      return {
        success: false,
        error: 'HTMLコンテンツを入力してください'
      };
    }

    return {
      success: true,
      html: html,
      url: url,
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * 複数のCORSプロキシを試行
   * @param {string} url - 取得するURL
   * @returns {Promise<Object>}
   */
  async fetchWithFallback(url) {
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      ''  // プロキシなし（直接アクセス）
    ];

    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      const useCorsProxy = proxy !== '';

      console.log(`試行 ${i + 1}/${proxies.length}: ${useCorsProxy ? 'プロキシ使用' : '直接アクセス'}`);

      const result = await this.fetchHTML(url, useCorsProxy);

      if (result.success) {
        console.log(`成功: ${useCorsProxy ? 'プロキシ経由' : '直接アクセス'}`);
        return result;
      }

      // 最後の試行でない場合は少し待機
      if (i < proxies.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      success: false,
      url: url,
      error: 'すべての取得方法が失敗しました。HTMLを直接貼り付けてください。'
    };
  }
}

// エクスポート（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.HTMLFetcher = HTMLFetcher;
}

// Node.js環境用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTMLFetcher;
}
