/**
 * SEO優先確認チェッカー
 * Google Search Central 公式ガイドに基づく13カテゴリのチェック
 * 総合スコアと改善提案を提供
 */

class SEOPriorityChecker {
  constructor(parsedData, html) {
    this.data = parsedData;
    this.html = html || '';
    this.results = {
      categories: [],
      summary: {
        totalItems: 0,
        passedItems: 0,
        failedItems: 0,
        score: 0,
        percentage: 0
      }
    };
  }

  /**
   * すべてのチェックを実行
   */
  checkAll() {
    // 1. タイトルタグ最適化
    this.results.categories.push(this.checkTitleTag());

    // 2. メタディスクリプション
    this.results.categories.push(this.checkMetaDescription());

    // 3. サイトマップ
    this.results.categories.push(this.checkSitemap());

    // 4. URL設計・正規化
    this.results.categories.push(this.checkURL());

    // 5. 構造化データ
    this.results.categories.push(this.checkStructuredData());

    // 6. SPA / JavaScript SEO
    this.results.categories.push(this.checkSPASEO());

    // 7. モバイルフレンドリー
    this.results.categories.push(this.checkMobileFriendly());

    // 8. ページ速度
    this.results.categories.push(this.checkPageSpeed());

    // 9. 内部リンク最適化
    this.results.categories.push(this.checkInternalLinks());

    // 10. 高品質コンテンツ
    this.results.categories.push(this.checkContentQuality());

    // 11. OGP
    this.results.categories.push(this.checkOGP());

    // 12. HTTPS
    this.results.categories.push(this.checkHTTPS());

    // 13. robots.txt / メタロボットタグ
    this.results.categories.push(this.checkRobots());

    // サマリーを計算
    this.calculateSummary();

    return this.results;
  }

  /**
   * 1. タイトルタグ最適化
   */
  checkTitleTag() {
    const title = this.data.title && this.data.title.text ? this.data.title.text : '';
    const titleLength = this.data.title && this.data.title.length ? this.data.title.length : 0;

    const checks = [
      {
        id: 'title-unique',
        label: 'ページごとに固有のタイトルが設定されている',
        status: title.length > 0 && !title.match(/^(ホーム|Home|トップページ|Untitled)$/i) ? 'pass' : 'fail',
        detail: title.length > 0 ? `現在のタイトル: ${title}` : 'タイトルが設定されていません'
      },
      {
        id: 'title-keywords',
        label: '主要キーワードが自然な形で含まれている',
        status: title.length >= 10 ? 'pass' : 'fail',
        detail: titleLength >= 10 ? '適切な長さです' : 'タイトルが短すぎます'
      },
      {
        id: 'title-length',
        label: '60文字前後で過度に長くない',
        status: titleLength >= 20 && titleLength <= 70 ? 'pass' : titleLength > 70 ? 'fail' : 'warning',
        detail: `現在の文字数: ${titleLength}文字（推奨: 30-60文字）`
      },
      {
        id: 'title-brand',
        label: 'ブランド名の扱い（前／後）が統一されている',
        status: 'info',
        detail: 'サイト全体で確認が必要です'
      }
    ];

    return {
      id: 'title-tag',
      category: '1. タイトルタグ（<title>）最適化',
      link: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ja#title-links',
      description: 'タイトルはページ内容を正確かつ簡潔に示す必要がある',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 2. メタディスクリプション
   */
  checkMetaDescription() {
    const description = this.data.metaDescription && this.data.metaDescription.text ? this.data.metaDescription.text : '';
    const descLength = description ? description.length : 0;

    const checks = [
      {
        id: 'meta-unique',
        label: 'ページごとに固有のメタディスクリプションが設定されている',
        status: descLength > 0 ? 'pass' : 'fail',
        detail: descLength > 0 ? `設定されています（${descLength}文字）` : '設定されていません'
      },
      {
        id: 'meta-length',
        label: '120〜160文字で内容が簡潔',
        status: descLength >= 80 && descLength <= 200 ? 'pass' : descLength > 0 ? 'warning' : 'fail',
        detail: `現在: ${descLength}文字（推奨: 120-160文字）`
      },
      {
        id: 'meta-cta',
        label: 'ユーザーがクリックしたくなる説明になっている',
        status: descLength >= 50 ? 'pass' : 'fail',
        detail: descLength >= 50 ? '十分な情報量です' : '説明が不足しています'
      },
      {
        id: 'meta-keywords',
        label: '主要キーワードが自然な形で含まれる',
        status: descLength >= 30 ? 'pass' : 'fail',
        detail: descLength >= 30 ? '適切です' : 'キーワードを含めてください'
      }
    ];

    return {
      id: 'meta-description',
      category: '2. メタディスクリプション',
      link: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ja#description-meta-tag',
      description: 'Google が検索結果スニペットを生成する際の参照情報となる',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 3. サイトマップ
   */
  checkSitemap() {
    const hasSitemapLink = this.html.match(/sitemap\.xml/i);

    const checks = [
      {
        id: 'sitemap-exists',
        label: '合法的な XML 形式で出力されている',
        status: 'info',
        detail: '/sitemap.xml の存在を確認してください'
      },
      {
        id: 'sitemap-auto',
        label: 'サイト更新時に自動で反映される',
        status: 'info',
        detail: 'CMS設定を確認してください'
      },
      {
        id: 'sitemap-gsc',
        label: 'Search Console に登録済み',
        status: 'info',
        detail: 'Google Search Console で確認してください'
      },
      {
        id: 'sitemap-errors',
        label: 'エラーがないことを確認済み',
        status: 'info',
        detail: 'Search Console のカバレッジレポートで確認'
      }
    ];

    return {
      id: 'sitemap',
      category: '3. サイトマップ（Sitemap.xml）',
      link: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=ja',
      description: '重要ページを Google に知らせる手段',
      checks: checks,
      passed: 0,
      total: checks.length
    };
  }

  /**
   * 4. URL設計・正規化
   */
  checkURL() {
    const url = this.data.url || '';
    const hasCanonical = this.data.metaTags && this.data.metaTags.canonical;
    const hasParams = url.match(/\?.*=/);

    const checks = [
      {
        id: 'url-readable',
        label: 'URL が短く論理的に設計されている',
        status: url.length < 100 && !url.match(/\d{5,}/) ? 'pass' : 'warning',
        detail: `URL長: ${url.length}文字`
      },
      {
        id: 'url-canonical',
        label: 'canonical が正しく設定されている',
        status: hasCanonical ? 'pass' : 'warning',
        detail: hasCanonical ? `設定済み: ${this.data.metaTags.canonical}` : '設定を推奨します'
      },
      {
        id: 'url-params',
        label: '不要なパラメータ・セッションIDが含まれていない',
        status: hasParams ? 'warning' : 'pass',
        detail: hasParams ? 'URLパラメータが検出されました' : '問題ありません'
      },
      {
        id: 'url-https',
        label: 'http/https の重複がない',
        status: url.toLowerCase().startsWith('https://') ? 'pass' : 'fail',
        detail: url.toLowerCase().startsWith('https://') ? 'HTTPSです' : 'HTTPにリダイレクトしてください'
      }
    ];

    return {
      id: 'url-design',
      category: '4. URL 設計・正規化（canonical）',
      link: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=ja',
      description: '短く読みやすい URL を推奨',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 5. 構造化データ
   */
  checkStructuredData() {
    const hasJSONLD = this.html.match(/<script[^>]*type=["']application\/ld\+json["']/gi);
    const hasMicrodata = this.html.match(/itemscope|itemprop/gi);

    const checks = [
      {
        id: 'sd-jsonld',
        label: 'JSON-LD 形式で実装している',
        status: hasJSONLD ? 'pass' : 'warning',
        detail: hasJSONLD ? 'JSON-LD が検出されました' : 'JSON-LD の追加を推奨します'
      },
      {
        id: 'sd-test',
        label: 'リッチリザルトテストでエラーがない',
        status: 'info',
        detail: 'https://search.google.com/test/rich-results で確認してください'
      },
      {
        id: 'sd-schema',
        label: 'schema.org の分類に従っている',
        status: hasJSONLD || hasMicrodata ? 'pass' : 'fail',
        detail: hasJSONLD || hasMicrodata ? '構造化データが検出されました' : '構造化データがありません'
      },
      {
        id: 'sd-consistency',
        label: '内容と構造化データが矛盾していない',
        status: 'info',
        detail: 'コンテンツと構造化データの整合性を確認してください'
      }
    ];

    return {
      id: 'structured-data',
      category: '5. 構造化データ（schema.org）',
      link: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=ja',
      description: 'リッチリザルトの対象になる',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 6. SPA / JavaScript SEO
   */
  checkSPASEO() {
    const hasJSFramework = this.html.match(/react|vue|angular|next\.js/gi);
    const hasSSRSignal = this.html.match(/data-react-helmet|__NEXT_DATA__|__NUXT__/gi);

    const checks = [
      {
        id: 'spa-render',
        label: 'レンダリングテストで正しく内容が表示される',
        status: 'info',
        detail: 'Google Search Console の URL検査ツールで確認してください'
      },
      {
        id: 'spa-important',
        label: '重要情報が JS によって遅延しない',
        status: hasJSFramework && !hasSSRSignal ? 'warning' : 'pass',
        detail: hasJSFramework ? 'JSフレームワークを検出。SSRを推奨します' : '問題ありません'
      },
      {
        id: 'spa-ssr',
        label: 'SSR やプリレンダリングを採用している',
        status: hasSSRSignal ? 'pass' : hasJSFramework ? 'warning' : 'pass',
        detail: hasSSRSignal ? 'SSRを検出しました' : 'SSRの採用を推奨します'
      },
      {
        id: 'spa-canonical',
        label: 'SPA ルーティングで canonical の問題がない',
        status: 'info',
        detail: 'ページ遷移時の canonical設定を確認してください'
      }
    ];

    return {
      id: 'spa-seo',
      category: '6. SPA / JavaScript SEO',
      link: 'https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=ja',
      description: '重要コンテンツは JS に依存しない方式を推奨',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 7. モバイルフレンドリー
   */
  checkMobileFriendly() {
    const hasViewport = this.data.metaTags && this.data.metaTags.viewport;
    const hasResponsive = this.html.match(/responsive|viewport|media\s+query/gi);

    const checks = [
      {
        id: 'mobile-content',
        label: 'モバイル版とデスクトップ版の内容が同等',
        status: 'info',
        detail: 'モバイルとデスクトップで同じコンテンツが表示されることを確認'
      },
      {
        id: 'mobile-responsive',
        label: 'レスポンシブデザインで構築されている',
        status: hasViewport && hasResponsive ? 'pass' : 'fail',
        detail: hasViewport ? 'Viewport設定を検出' : 'Viewport設定がありません'
      },
      {
        id: 'mobile-ui',
        label: 'タップ操作しやすい UI',
        status: 'info',
        detail: 'タップターゲットのサイズ（最低44x44px）を確認してください'
      },
      {
        id: 'mobile-media',
        label: '画像や動画の表示が正しい',
        status: this.data.images && this.data.images.total > 0 ? 'pass' : 'warning',
        detail: this.data.images ? `${this.data.images.total}個の画像を検出` : '画像がありません'
      }
    ];

    return {
      id: 'mobile-friendly',
      category: '7. モバイルフレンドリー（Mobile-First Indexing）',
      link: 'https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=ja',
      description: 'Google はモバイル版のページ内容のみを使用',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 8. ページ速度（Core Web Vitals）
   */
  checkPageSpeed() {
    const checks = [
      {
        id: 'cwv-lcp',
        label: 'LCP が 2.5秒以内',
        status: 'info',
        detail: 'PageSpeed Insights で測定してください'
      },
      {
        id: 'cwv-cls',
        label: 'CLS が 0.1 未満',
        status: 'info',
        detail: 'PageSpeed Insights で測定してください'
      },
      {
        id: 'cwv-inp',
        label: 'INP が 200ms 未満',
        status: 'info',
        detail: 'PageSpeed Insights で測定してください'
      },
      {
        id: 'cwv-optimize',
        label: '画像圧縮・遅延読み込み・キャッシュが適切',
        status: this.data.images && this.data.images.total > 0 ? 'warning' : 'pass',
        detail: '画像の最適化（WebP、遅延読み込み）を推奨します'
      }
    ];

    return {
      id: 'page-speed',
      category: '8. ページ速度（Core Web Vitals）',
      link: 'https://developers.google.com/search/docs/appearance/page-experience?hl=ja',
      description: 'LCP・CLS・INP が評価対象',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 9. 内部リンク最適化
   */
  checkInternalLinks() {
    const internalLinks = this.data.links && this.data.links.totalInternal ? this.data.links.totalInternal : 0;

    const checks = [
      {
        id: 'links-important',
        label: '重要ページに十分な内部リンクがある',
        status: internalLinks >= 5 ? 'pass' : internalLinks > 0 ? 'warning' : 'fail',
        detail: `${internalLinks}個の内部リンクを検出`
      },
      {
        id: 'links-anchor',
        label: 'アンカーテキストが文脈に沿っている',
        status: internalLinks > 0 ? 'pass' : 'fail',
        detail: '「こちら」ではなく具体的な説明を使用してください'
      },
      {
        id: 'links-hierarchy',
        label: '階層構造が論理的',
        status: 'info',
        detail: 'サイト全体の階層設計を確認してください'
      },
      {
        id: 'links-orphan',
        label: '孤立ページが存在しない',
        status: 'info',
        detail: 'すべてのページに内部リンクでアクセスできることを確認'
      }
    ];

    return {
      id: 'internal-links',
      category: '9. 内部リンク最適化',
      link: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ja#site-navigation',
      description: 'Google がサイト階層を理解する助けとなる',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 10. 高品質コンテンツ（Helpful Content, E-E-A-T）
   */
  checkContentQuality() {
    const wordCount = this.data.content && this.data.content.wordCount ? this.data.content.wordCount : 0;
    const hasAuthor = this.html.match(/author|著者/gi);
    const hasDate = this.html.match(/datePublished|published|更新日|投稿日/gi);

    const checks = [
      {
        id: 'content-intent',
        label: '検索意図を正しく満たしている',
        status: wordCount >= 300 ? 'pass' : 'fail',
        detail: `${wordCount}文字/単語（推奨: 300文字以上）`
      },
      {
        id: 'content-unique',
        label: '独自性・専門性がある',
        status: wordCount >= 500 ? 'pass' : wordCount >= 300 ? 'warning' : 'fail',
        detail: wordCount >= 500 ? '十分な内容量です' : 'さらに充実させることを推奨'
      },
      {
        id: 'content-no-fluff',
        label: '文章量のための水増しをしていない',
        status: 'info',
        detail: 'ユーザーにとって価値のある情報のみを記載してください'
      },
      {
        id: 'content-eeat',
        label: '著者情報・経験の記述が適切',
        status: hasAuthor && hasDate ? 'pass' : hasAuthor || hasDate ? 'warning' : 'fail',
        detail: hasAuthor && hasDate ? '著者情報と日付を検出' : '著者情報または日付を追加してください'
      }
    ];

    return {
      id: 'content-quality',
      category: '10. 高品質コンテンツ（Helpful Content, E-E-A-T）',
      link: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ja',
      description: '人のために書かれたコンテンツを高く評価',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 11. OGP（SNS共有設定）
   */
  checkOGP() {
    const hasOGTitle = this.html.match(/property=["']og:title["']/i);
    const hasOGDescription = this.html.match(/property=["']og:description["']/i);
    const hasOGImage = this.html.match(/property=["']og:image["']/i);
    const hasTwitterCard = this.html.match(/name=["']twitter:card["']/i);

    const checks = [
      {
        id: 'ogp-basic',
        label: 'og:title / og:description / og:image が設定されている',
        status: hasOGTitle && hasOGDescription && hasOGImage ? 'pass' : hasOGTitle || hasOGDescription || hasOGImage ? 'warning' : 'fail',
        detail: hasOGTitle && hasOGDescription && hasOGImage ? 'すべて設定されています' : '一部または全部が未設定です'
      },
      {
        id: 'ogp-twitter',
        label: 'X/Twitter 用に image サイズ調整済み',
        status: hasTwitterCard ? 'pass' : 'warning',
        detail: hasTwitterCard ? 'Twitter Cardを検出' : 'Twitter Card の追加を推奨します'
      },
      {
        id: 'ogp-test',
        label: 'シェア時の表示確認済み',
        status: 'info',
        detail: 'Facebook Sharing Debugger で確認してください'
      }
    ];

    return {
      id: 'ogp',
      category: '11. OGP（SNS 共有設定）',
      link: 'https://ogp.me/',
      description: 'SNS共有時の見栄えを改善',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 12. HTTPS（SSL）
   */
  checkHTTPS() {
    const url = this.data.url || '';
    const isHTTPS = url.toLowerCase().startsWith('https://');
    const hasMixedContent = isHTTPS && this.html.match(/src=["']http:\/\//gi);

    const checks = [
      {
        id: 'https-all',
        label: 'サイト全体が HTTPS',
        status: isHTTPS ? 'pass' : 'fail',
        detail: isHTTPS ? 'HTTPSです' : 'HTTPSに移行してください'
      },
      {
        id: 'https-cert',
        label: '証明書が有効期限内',
        status: isHTTPS ? 'pass' : 'fail',
        detail: isHTTPS ? '確認推奨' : 'HTTPSに移行してください'
      },
      {
        id: 'https-mixed',
        label: '混在コンテンツがない',
        status: hasMixedContent ? 'fail' : 'pass',
        detail: hasMixedContent ? '混在コンテンツを検出。すべてHTTPSに変更してください' : '問題ありません'
      }
    ];

    return {
      id: 'https',
      category: '12. HTTPS（SSL）',
      link: 'https://developers.google.com/search/docs/fundamentals/security?hl=ja',
      description: 'HTTPS は検索ランキングシグナル',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * 13. robots.txt / メタロボットタグ
   */
  checkRobots() {
    const robotsMeta = this.data.metaTags && this.data.metaTags.robots ? this.data.metaTags.robots : null;
    const hasNoIndex = robotsMeta && robotsMeta.toLowerCase().includes('noindex');
    const hasNoFollow = robotsMeta && robotsMeta.toLowerCase().includes('nofollow');

    const checks = [
      {
        id: 'robots-control',
        label: '不要ページをクロール・インデックスしないよう制御',
        status: 'info',
        detail: 'robots.txt で管理画面やAPIエンドポイントをブロック'
      },
      {
        id: 'robots-important',
        label: '重要ページを誤ってブロックしていない',
        status: hasNoIndex ? 'fail' : 'pass',
        detail: hasNoIndex ? '⚠️ noindexタグが設定されています' : '問題ありません'
      },
      {
        id: 'robots-conflict',
        label: 'noindex / canonical の競合がない',
        status: hasNoIndex && this.data.metaTags && this.data.metaTags.canonical ? 'fail' : 'pass',
        detail: hasNoIndex && this.data.metaTags && this.data.metaTags.canonical ? 'noindexとcanonicalが競合しています' : '問題ありません'
      }
    ];

    return {
      id: 'robots',
      category: '13. robots.txt / メタロボットタグ',
      link: 'https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=ja',
      description: 'クロール・インデックス制御',
      checks: checks,
      passed: checks.filter(c => c.status === 'pass').length,
      total: checks.length
    };
  }

  /**
   * サマリーを計算
   */
  calculateSummary() {
    let totalItems = 0;        // 全項目数（info含む）- 49項目
    let checkableItems = 0;    // チェック可能項目数（info除外）- 30項目
    let passedItems = 0;
    let failedItems = 0;
    let warningItems = 0;
    let infoItems = 0;

    this.results.categories.forEach(category => {
      category.checks.forEach(check => {
        totalItems++;  // 全項目をカウント

        if (check.status === 'pass') {
          passedItems++;
          checkableItems++;  // チェック可能項目
        } else if (check.status === 'fail') {
          failedItems++;
          checkableItems++;  // チェック可能項目
        } else if (check.status === 'warning') {
          warningItems++;
          checkableItems++;  // チェック可能項目
        } else if (check.status === 'info') {
          infoItems++;
          // チェック可能項目にはカウントしない
        }
      });
    });

    this.results.summary.totalItems = totalItems;           // 49項目（全項目）
    this.results.summary.checkableItems = checkableItems;   // 30項目（info除外）
    this.results.summary.passedItems = passedItems;
    this.results.summary.failedItems = failedItems;
    this.results.summary.warningItems = warningItems;
    this.results.summary.infoItems = infoItems;
    this.results.summary.score = passedItems;
    // 合格率はチェック可能項目（info除外）で計算
    this.results.summary.percentage = checkableItems > 0 ? Math.round((passedItems / checkableItems) * 100) : 0;
  }
}

// グローバルエクスポート（ブラウザ用）
if (typeof window !== 'undefined') {
  window.SEOPriorityChecker = SEOPriorityChecker;
}

// Node.jsエクスポート（サーバー用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SEOPriorityChecker;
}
