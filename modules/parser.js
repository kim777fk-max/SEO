/**
 * HTMLパーサーモジュール
 * HTMLからSEO関連情報を抽出
 */

class HTMLParser {
  constructor(html, url) {
    this.html = html;
    this.url = url;
    this.parser = new DOMParser();
    this.doc = null;
    this.parsedData = null;
  }

  /**
   * HTMLをパースして解析結果を返す
   * @returns {Object} 解析結果
   */
  parse() {
    try {
      this.doc = this.parser.parseFromString(this.html, 'text/html');

      this.parsedData = {
        url: this.url,
        title: this.extractTitle(),
        metaDescription: this.extractMetaDescription(),
        headings: this.extractHeadings(),
        images: this.extractImages(),
        links: this.extractLinks(),
        structuredData: this.extractStructuredData(),
        metaTags: this.extractMetaTags(),
        content: this.extractContent(),
        technical: this.extractTechnicalData()
      };

      return this.parsedData;
    } catch (error) {
      console.error('HTMLパースエラー:', error);
      throw new Error('HTMLの解析に失敗しました: ' + error.message);
    }
  }

  /**
   * タイトルタグを抽出
   */
  extractTitle() {
    const titleElement = this.doc.querySelector('title');
    const title = titleElement ? titleElement.textContent.trim() : '';

    return {
      text: title,
      length: title.length,
      exists: !!title
    };
  }

  /**
   * メタディスクリプションを抽出
   */
  extractMetaDescription() {
    const metaDesc = this.doc.querySelector('meta[name="description"]');
    const content = metaDesc ? metaDesc.getAttribute('content').trim() : '';

    return {
      text: content,
      length: content.length,
      exists: !!content
    };
  }

  /**
   * 見出しタグ(H1-H6)を抽出
   */
  extractHeadings() {
    const headings = {
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      hierarchy: []
    };

    for (let i = 1; i <= 6; i++) {
      const hTags = this.doc.querySelectorAll(`h${i}`);
      hTags.forEach(tag => {
        const text = tag.textContent.trim();
        headings[`h${i}`].push(text);
        headings.hierarchy.push({
          level: i,
          text: text
        });
      });
    }

    return headings;
  }

  /**
   * 画像とalt属性を抽出
   */
  extractImages() {
    const images = [];
    const imgElements = this.doc.querySelectorAll('img');

    imgElements.forEach(img => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';

      images.push({
        src: src,
        alt: alt,
        hasAlt: alt.trim().length > 0,
        title: img.getAttribute('title') || ''
      });
    });

    const withAlt = images.filter(img => img.hasAlt).length;
    const withoutAlt = images.length - withAlt;

    return {
      total: images.length,
      withAlt: withAlt,
      withoutAlt: withoutAlt,
      percentage: images.length > 0 ? (withAlt / images.length * 100).toFixed(1) : 0,
      images: images
    };
  }

  /**
   * リンクを抽出（内部リンク・外部リンク）
   */
  extractLinks() {
    const links = {
      internal: [],
      external: [],
      totalInternal: 0,
      totalExternal: 0,
      all: []
    };

    const anchorElements = this.doc.querySelectorAll('a[href]');
    const baseUrl = new URL(this.url);

    anchorElements.forEach(anchor => {
      const href = anchor.getAttribute('href');
      const text = anchor.textContent.trim();

      if (!href) return;

      try {
        const linkUrl = new URL(href, this.url);
        const isInternal = linkUrl.hostname === baseUrl.hostname;

        const linkData = {
          href: linkUrl.href,
          text: text,
          rel: anchor.getAttribute('rel') || '',
          target: anchor.getAttribute('target') || ''
        };

        links.all.push(linkData);

        if (isInternal) {
          links.internal.push(linkData);
          links.totalInternal++;
        } else {
          links.external.push(linkData);
          links.totalExternal++;
        }
      } catch (e) {
        // 無効なURLはスキップ
      }
    });

    return links;
  }

  /**
   * 構造化データ（JSON-LD）を抽出
   */
  extractStructuredData() {
    const structuredData = {
      hasJsonLd: false,
      schemas: [],
      count: 0
    };

    const jsonLdScripts = this.doc.querySelectorAll('script[type="application/ld+json"]');

    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        structuredData.schemas.push(data);
        structuredData.count++;
        structuredData.hasJsonLd = true;
      } catch (e) {
        console.warn('JSON-LDのパースに失敗:', e);
      }
    });

    return structuredData;
  }

  /**
   * メタタグを抽出
   */
  extractMetaTags() {
    const metaTags = {
      viewport: null,
      charset: null,
      robots: null,
      canonical: null,
      ogTags: {},
      twitterTags: {},
      other: []
    };

    // Viewport
    const viewport = this.doc.querySelector('meta[name="viewport"]');
    metaTags.viewport = viewport ? viewport.getAttribute('content') : null;

    // Charset
    const charset = this.doc.querySelector('meta[charset]');
    metaTags.charset = charset ? charset.getAttribute('charset') : null;

    // Robots
    const robots = this.doc.querySelector('meta[name="robots"]');
    metaTags.robots = robots ? robots.getAttribute('content') : null;

    // Canonical
    const canonical = this.doc.querySelector('link[rel="canonical"]');
    metaTags.canonical = canonical ? canonical.getAttribute('href') : null;

    // Open Graph
    const ogTags = this.doc.querySelectorAll('meta[property^="og:"]');
    ogTags.forEach(tag => {
      const property = tag.getAttribute('property');
      const content = tag.getAttribute('content');
      metaTags.ogTags[property] = content;
    });

    // Twitter Card
    const twitterTags = this.doc.querySelectorAll('meta[name^="twitter:"]');
    twitterTags.forEach(tag => {
      const name = tag.getAttribute('name');
      const content = tag.getAttribute('content');
      metaTags.twitterTags[name] = content;
    });

    return metaTags;
  }

  /**
   * コンテンツを抽出
   */
  extractContent() {
    // body内のテキストコンテンツを抽出
    const bodyElement = this.doc.querySelector('body');
    if (!bodyElement) {
      return {
        textLength: 0,
        wordCount: 0,
        paragraphs: 0,
        text: ''
      };
    }

    // scriptとstyleタグを除外
    const clone = bodyElement.cloneNode(true);
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());

    const text = clone.textContent || '';
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // 段落数
    const paragraphs = this.doc.querySelectorAll('p').length;

    // 単語数（日本語の場合は文字数、英語の場合は単語数）
    const wordCount = this.countWords(cleanText);

    return {
      textLength: cleanText.length,
      wordCount: wordCount,
      paragraphs: paragraphs,
      text: cleanText.substring(0, 1000) // 最初の1000文字のみ保存
    };
  }

  /**
   * 単語数をカウント
   */
  countWords(text) {
    // 日本語文字（ひらがな、カタカナ、漢字）を含む場合は文字数
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);

    if (hasJapanese) {
      // 日本語の場合は文字数（空白除く）
      return text.replace(/\s/g, '').length;
    } else {
      // 英語の場合は単語数
      return text.split(/\s+/).filter(word => word.length > 0).length;
    }
  }

  /**
   * 技術的なデータを抽出
   */
  extractTechnicalData() {
    const htmlElement = this.doc.querySelector('html');

    return {
      lang: htmlElement ? htmlElement.getAttribute('lang') : null,
      hasDoctype: this.html.toLowerCase().includes('<!doctype'),
      isHTTPS: this.url.startsWith('https://'),
      hasViewport: !!this.doc.querySelector('meta[name="viewport"]'),
      hasCharset: !!this.doc.querySelector('meta[charset]')
    };
  }

  /**
   * 解析結果のサマリーを取得
   */
  getSummary() {
    if (!this.parsedData) {
      this.parse();
    }

    return {
      url: this.url,
      title: this.parsedData.title.text,
      titleLength: this.parsedData.title.length,
      description: this.parsedData.metaDescription.text,
      descriptionLength: this.parsedData.metaDescription.length,
      h1Count: this.parsedData.headings.h1.length,
      totalImages: this.parsedData.images.total,
      imagesWithAlt: this.parsedData.images.withAlt,
      internalLinks: this.parsedData.links.totalInternal,
      externalLinks: this.parsedData.links.totalExternal,
      hasStructuredData: this.parsedData.structuredData.hasJsonLd,
      wordCount: this.parsedData.content.wordCount,
      isHTTPS: this.parsedData.technical.isHTTPS
    };
  }
}

// エクスポート
if (typeof window !== 'undefined') {
  window.HTMLParser = HTMLParser;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTMLParser;
}
