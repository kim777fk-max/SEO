/**
 * 詳細SEOチェッカー
 * Google検索セントラルのガイドラインに基づいた詳細チェック
 * 優先度: S (必須) > A (最重要) > B (技術) > C (外観) > D (長期運用)
 */

class DetailedSEOChecker {
  constructor(parsedData, html) {
    this.data = parsedData;
    this.html = html || '';
    this.results = {
      priorityS: [],
      priorityA: [],
      priorityB: [],
      priorityC: [],
      priorityD: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  /**
   * すべてのチェックを実行
   */
  checkAll() {
    this.checkPriorityS();
    this.checkPriorityA();
    this.checkPriorityB();
    this.checkPriorityC();
    this.checkPriorityD();
    this.calculateSummary();
    return this.results;
  }

  /**
   * 優先度S: 必須要件とスパム回避
   */
  checkPriorityS() {
    // 1. スパムポリシーの遵守
    this.results.priorityS.push(this.checkNoSpam());

    // 2. Googlebotがブロックされていないか
    this.results.priorityS.push(this.checkRobotsTxt());

    // 3. ページが正常に機能しているか
    this.results.priorityS.push(this.checkPageStatus());

    // 4. インデックス登録が許可されているか
    this.results.priorityS.push(this.checkNoIndex());

    // 5. 不正なコンテンツがないか
    this.results.priorityS.push(this.checkMaliciousContent());

    // 6. AI生成コンテンツの適切な使用
    this.results.priorityS.push(this.checkAIContent());
  }

  /**
   * 優先度A: コンテンツの品質
   */
  checkPriorityA() {
    // 1. 有用で信頼性の高いコンテンツ
    this.results.priorityA.push(this.checkContentQuality());

    // 2. E-E-A-T (専門性・権威性・信頼性)
    this.results.priorityA.push(this.checkEEAT());

    // 3. 読みやすさと構成
    this.results.priorityA.push(this.checkReadability());

    // 4. HTTPS (セキュリティ)
    this.results.priorityA.push(this.checkHTTPS());

    // 5. モバイル対応
    this.results.priorityA.push(this.checkMobileOptimization());

    // 6. 気が散る広告の回避
    this.results.priorityA.push(this.checkDistractionFreeAds());
  }

  /**
   * 優先度B: 技術的最適化
   */
  checkPriorityB() {
    // 1. サイトマップ
    this.results.priorityB.push(this.checkSitemap());

    // 2. わかりやすいURL
    this.results.priorityB.push(this.checkURLStructure());

    // 3. クロール可能なリンク
    this.results.priorityB.push(this.checkCrawlableLinks());

    // 4. 重複コンテンツの正規化
    this.results.priorityB.push(this.checkCanonical());

    // 5. 重要なリソースへのアクセス
    this.results.priorityB.push(this.checkResourceAccess());
  }

  /**
   * 優先度C: 検索結果での見え方
   */
  checkPriorityC() {
    // 1. タイトルリンクの最適化
    this.results.priorityC.push(this.checkTitleOptimization());

    // 2. メタディスクリプションの最適化
    this.results.priorityC.push(this.checkMetaDescription());

    // 3. 画像の代替テキスト
    this.results.priorityC.push(this.checkImageAlt());

    // 4. 構造化データ
    this.results.priorityC.push(this.checkStructuredData());

    // 5. 画像と動画の配置
    this.results.priorityC.push(this.checkMediaPlacement());
  }

  /**
   * 優先度D: 長期的な管理
   */
  checkPriorityD() {
    // 1. ユーザー作成コンテンツの管理
    this.results.priorityD.push(this.checkUGCManagement());

    // 2. 外部リンクのnofollow
    this.results.priorityD.push(this.checkExternalLinksNofollow());
  }

  // ==================== 優先度S チェック関数 ====================

  checkNoSpam() {
    const issues = [];

    // 隠しテキスト・隠しリンクのチェック
    if (this.html.match(/style\s*=\s*["'].*display\s*:\s*none/i) ||
        this.html.match(/style\s*=\s*["'].*visibility\s*:\s*hidden/i)) {
      issues.push('隠しテキストまたは隠しリンクの可能性');
    }

    // キーワードの過度な繰り返し
    const text = this.data.content.textContent.toLowerCase();
    const words = text.split(/\s+/);
    const wordCount = {};
    words.forEach(word => {
      if (word.length > 3) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    const maxRepeat = Math.max(...Object.values(wordCount));
    const totalWords = words.length;
    if (maxRepeat > totalWords * 0.05 && totalWords > 100) {
      issues.push('特定キーワードの過度な繰り返し（キーワードスタッフィングの可能性）');
    }

    return {
      id: 'no-spam',
      title: 'スパムポリシーの遵守',
      priority: 'S',
      status: issues.length === 0 ? 'pass' : 'warning',
      message: issues.length === 0
        ? 'スパム的な要素は検出されませんでした'
        : `以下の懸念事項が見つかりました: ${issues.join(', ')}`,
      details: 'クローキング、誘導ページ、隠しテキスト、キーワードの乱用などのスパム行為を避けてください',
      source: 'Google スパムに関するポリシー'
    };
  }

  checkRobotsTxt() {
    // robots metaタグのチェック
    const robotsMeta = this.data.meta.robots;
    const isBlocked = robotsMeta && (
      robotsMeta.includes('noindex') ||
      robotsMeta.includes('nofollow') ||
      robotsMeta.includes('none')
    );

    return {
      id: 'robots-txt',
      title: 'Googlebotアクセス許可',
      priority: 'S',
      status: isBlocked ? 'fail' : 'pass',
      message: isBlocked
        ? `robots metaタグでクロールが制限されています: ${robotsMeta}`
        : 'Googlebotのアクセスが許可されています',
      details: 'robots.txtやrobots metaタグで重要なページをブロックしないでください',
      source: 'Google検索セントラル - robots.txt'
    };
  }

  checkPageStatus() {
    // この情報はクライアント側では取得できないため、推奨事項として表示
    return {
      id: 'page-status',
      title: 'ページステータスコード',
      priority: 'S',
      status: 'info',
      message: 'ページがHTTP 200ステータスを返すことを確認してください',
      details: '削除済みページは404エラーを返し、soft 404を避けてください。Server-side redirects(301/302)を適切に使用してください',
      source: 'Google検索セントラル - HTTP ステータス コード'
    };
  }

  checkNoIndex() {
    const hasNoIndex = this.data.meta.robots && this.data.meta.robots.includes('noindex');
    const hasIndexNofollow = this.data.meta.robots && this.data.meta.robots.includes('noindex, nofollow');

    return {
      id: 'no-index',
      title: 'インデックス登録の許可',
      priority: 'S',
      status: hasNoIndex ? 'fail' : 'pass',
      message: hasNoIndex
        ? '⚠️ noindexタグが設定されています - このページは検索結果に表示されません'
        : 'インデックス登録が許可されています',
      details: '検索結果に表示させたいページには noindex タグを使用しないでください',
      source: 'Google検索セントラル - noindex'
    };
  }

  checkMaliciousContent() {
    const suspiciousPatterns = [];

    // 不審なスクリプトのチェック
    if (this.html.match(/eval\s*\(/i)) {
      suspiciousPatterns.push('eval()関数の使用');
    }

    if (this.html.match(/document\.write\s*\(/i)) {
      suspiciousPatterns.push('document.write()の使用');
    }

    // Base64エンコードされたスクリプトのチェック
    if (this.html.match(/base64/i) && this.html.match(/<script/i)) {
      suspiciousPatterns.push('Base64エンコードされた可能性のあるスクリプト');
    }

    return {
      id: 'malicious-content',
      title: '不正なコンテンツの検出',
      priority: 'S',
      status: suspiciousPatterns.length === 0 ? 'pass' : 'warning',
      message: suspiciousPatterns.length === 0
        ? '不正なコンテンツは検出されませんでした'
        : `以下の懸念事項が見つかりました: ${suspiciousPatterns.join(', ')}`,
      details: 'ハッキングされたコンテンツ、マルウェア、不正なリダイレクトがないか確認してください',
      source: 'Google検索セントラル - ハッキングされたコンテンツ'
    };
  }

  checkAIContent() {
    // AI生成コンテンツの検出は困難なため、推奨事項として表示
    return {
      id: 'ai-content',
      title: 'AI生成コンテンツの適切な使用',
      priority: 'S',
      status: 'info',
      message: 'AI生成コンテンツを使用する場合は、ユーザーに価値を付加してください',
      details: '大量生成されたコンテンツの不正使用（ユーザーに価値のない自動生成コンテンツ）は避けてください',
      source: 'Google検索セントラル - AI 生成コンテンツ'
    };
  }

  // ==================== 優先度A チェック関数 ====================

  checkContentQuality() {
    const wordCount = this.data.content.wordCount;
    const hasUniqueContent = wordCount >= 300;
    const headingsCount = this.data.headings.h1.length + this.data.headings.h2.length + this.data.headings.h3.length;

    let status = 'pass';
    let message = '';

    if (wordCount < 300) {
      status = 'fail';
      message = `コンテンツ量が不足しています（${wordCount}文字/単語）。最低300文字を推奨`;
    } else if (wordCount < 500) {
      status = 'warning';
      message = `コンテンツ量は十分ですが、さらに充実させることをお勧めします（${wordCount}文字/単語）`;
    } else {
      status = 'pass';
      message = `十分なコンテンツ量があります（${wordCount}文字/単語）`;
    }

    return {
      id: 'content-quality',
      title: '有用で信頼性の高いコンテンツ',
      priority: 'A',
      status: status,
      message: message,
      details: '独自の情報、実体験、深い知識に基づいたコンテンツを提供してください。ユーザー第一のコンテンツ作成を心がけてください',
      source: 'Google検索セントラル - 有用で信頼性の高い、ユーザー第一のコンテンツの作成'
    };
  }

  checkEEAT() {
    const hasAuthor = this.html.match(/author/i) || this.html.match(/著者/i);
    const hasPublishDate = this.html.match(/datePublished/i) || this.html.match(/published/i);
    const hasSource = this.data.links.totalExternal > 0;

    let score = 0;
    if (hasAuthor) score++;
    if (hasPublishDate) score++;
    if (hasSource) score++;

    let status = 'pass';
    let message = '';

    if (score === 0) {
      status = 'fail';
      message = 'E-E-A-Tシグナルが不足しています';
    } else if (score <= 1) {
      status = 'warning';
      message = 'E-E-A-Tシグナルを強化することをお勧めします';
    } else {
      status = 'pass';
      message = 'E-E-A-Tシグナルが適切に設定されています';
    }

    return {
      id: 'eeat',
      title: 'E-E-A-T（専門性・権威性・信頼性）',
      priority: 'A',
      status: status,
      message: message,
      details: '著者情報、公開日、情報源の明示、専門性の証明などを追加してください',
      source: 'Google検索セントラル - E-E-A-T'
    };
  }

  checkReadability() {
    const hasHeadings = this.data.headings.h2.length > 0 || this.data.headings.h3.length > 0;
    const hasParagraphs = this.html.match(/<p/gi)?.length || 0;
    const hasLists = this.html.match(/<ul|<ol/gi)?.length || 0;

    let score = 0;
    if (hasHeadings) score++;
    if (hasParagraphs >= 3) score++;
    if (hasLists > 0) score++;

    let status = 'pass';
    let message = '';

    if (score <= 1) {
      status = 'fail';
      message = 'ページの構造が不十分です';
    } else if (score === 2) {
      status = 'warning';
      message = 'ページの構造を改善できます';
    } else {
      status = 'pass';
      message = 'ページが適切に構造化されています';
    }

    return {
      id: 'readability',
      title: '読みやすさと構成',
      priority: 'A',
      status: status,
      message: message,
      details: '見出し、段落、リストを使用して読みやすく整理してください',
      source: 'Google検索セントラル - コンテンツの品質'
    };
  }

  checkHTTPS() {
    const isHTTPS = this.data.url.startsWith('https://');

    return {
      id: 'https',
      title: 'HTTPS（セキュリティ）',
      priority: 'A',
      status: isHTTPS ? 'pass' : 'fail',
      message: isHTTPS
        ? 'HTTPSで安全に接続されています'
        : '⚠️ HTTPSを使用していません - セキュリティリスクがあります',
      details: 'ウェブサイトの接続をHTTPSにして安全性を高めてください',
      source: 'Google検索セントラル - HTTPS'
    };
  }

  checkMobileOptimization() {
    const hasViewport = this.data.meta.viewport !== null;
    const hasResponsiveImages = this.html.match(/srcset|sizes/i);

    let status = 'pass';
    let message = '';

    if (!hasViewport) {
      status = 'fail';
      message = 'Viewportメタタグが設定されていません';
    } else {
      status = 'pass';
      message = 'モバイル対応の基本設定がされています';
    }

    return {
      id: 'mobile-optimization',
      title: 'モバイル対応',
      priority: 'A',
      status: status,
      message: message,
      details: 'レスポンシブデザイン、適切なフォントサイズ、タッチ操作に適したボタンサイズを確保してください',
      source: 'Google検索セントラル - モバイルフレンドリー'
    };
  }

  checkDistractionFreeAds() {
    // インタースティシャル広告の検出
    const hasPopup = this.html.match(/popup|modal|overlay/gi)?.length || 0;

    return {
      id: 'distraction-free',
      title: '気が散る広告の回避',
      priority: 'A',
      status: hasPopup > 5 ? 'warning' : 'pass',
      message: hasPopup > 5
        ? 'ポップアップやモーダルが多く検出されました'
        : 'ユーザー体験を妨げる要素は少ないようです',
      details: 'コンテンツを読む邪魔になるインタースティシャルや過度な広告を避けてください',
      source: 'Google検索セントラル - インタースティシャル'
    };
  }

  // ==================== 優先度B チェック関数 ====================

  checkSitemap() {
    // サイトマップへのリンクのチェック
    const hasSitemapLink = this.html.match(/sitemap\.xml/i);

    return {
      id: 'sitemap',
      title: 'サイトマップの作成',
      priority: 'B',
      status: 'info',
      message: 'サイトマップを作成してSearch Consoleに送信してください',
      details: 'サイト内の重要なURLをすべて含めたサイトマップ（sitemap.xml）を作成し、Googleに送信してください',
      source: 'Google検索セントラル - サイトマップ'
    };
  }

  checkURLStructure() {
    const url = this.data.url;
    const hasDescriptiveURL = !url.match(/\?id=|&id=|\d{5,}/);
    const hasShortURL = url.length < 100;
    const hasCleanURL = !url.match(/%20|%2F|%3A/);

    let status = 'pass';
    let message = '';

    if (!hasDescriptiveURL) {
      status = 'warning';
      message = 'URLに説明的な単語を含めることをお勧めします';
    } else if (!hasShortURL) {
      status = 'warning';
      message = 'URLが長すぎます（100文字未満を推奨）';
    } else {
      status = 'pass';
      message = 'URLが適切に構成されています';
    }

    return {
      id: 'url-structure',
      title: 'わかりやすいURL構造',
      priority: 'B',
      status: status,
      message: message,
      details: 'ユーザーの役に立つ言葉をURLに含め、ランダムな識別子を避けてください',
      source: 'Google検索セントラル - URL 構造'
    };
  }

  checkCrawlableLinks() {
    const totalLinks = this.data.links.totalInternal + this.data.links.totalExternal;
    const hasLinks = totalLinks > 0;

    return {
      id: 'crawlable-links',
      title: 'クロール可能なリンク',
      priority: 'B',
      status: hasLinks ? 'pass' : 'warning',
      message: hasLinks
        ? `${totalLinks}個のリンクが見つかりました`
        : 'リンクが少ないようです',
      details: '<a>要素を使用し、適切なアンカーテキストでリンク先の内容を示してください',
      source: 'Google検索セントラル - リンク'
    };
  }

  checkCanonical() {
    const hasCanonical = this.data.meta.canonical !== null;

    return {
      id: 'canonical',
      title: '重複コンテンツの正規化',
      priority: 'B',
      status: hasCanonical ? 'pass' : 'info',
      message: hasCanonical
        ? 'canonicalタグが設定されています'
        : 'canonicalタグの設定を検討してください',
      details: '重複コンテンツがある場合は、rel="canonical"で正規URLを指定してください',
      source: 'Google検索セントラル - canonical'
    };
  }

  checkResourceAccess() {
    const hasCSSLinks = this.html.match(/<link[^>]*stylesheet/gi)?.length || 0;
    const hasJSScripts = this.html.match(/<script[^>]*src/gi)?.length || 0;

    return {
      id: 'resource-access',
      title: '重要なリソースへのアクセス',
      priority: 'B',
      status: 'info',
      message: `CSS: ${hasCSSLinks}個、JavaScript: ${hasJSScripts}個のリソースが検出されました`,
      details: 'CSS、JavaScriptなどの重要なリソースがGooglebotからアクセスできることを確認してください',
      source: 'Google検索セントラル - JavaScript'
    };
  }

  // ==================== 優先度C チェック関数 ====================

  checkTitleOptimization() {
    const title = this.data.title.text;
    const titleLength = this.data.title.length;
    const hasTitle = title && title.length > 0;
    const isOptimalLength = titleLength >= 30 && titleLength <= 60;
    const hasUnique = !title.match(/^(ホーム|Home|トップページ)$/i);

    let status = 'pass';
    let message = '';

    if (!hasTitle) {
      status = 'fail';
      message = 'タイトルが設定されていません';
    } else if (!isOptimalLength) {
      status = 'warning';
      message = `タイトルの長さを最適化してください（現在: ${titleLength}文字、推奨: 30-60文字）`;
    } else if (!hasUnique) {
      status = 'warning';
      message = 'タイトルが一般的すぎます。ページ固有の内容を含めてください';
    } else {
      status = 'pass';
      message = 'タイトルが適切に最適化されています';
    }

    return {
      id: 'title-optimization',
      title: 'タイトルリンクの最適化',
      priority: 'C',
      status: status,
      message: message,
      details: 'ページ固有で、明確かつ簡潔、内容を正確に説明するタイトルを設定してください',
      source: 'Google検索セントラル - タイトルリンク'
    };
  }

  checkMetaDescription() {
    const description = this.data.meta.description;
    const descLength = description ? description.length : 0;
    const hasDescription = description && description.length > 0;
    const isOptimalLength = descLength >= 120 && descLength <= 160;

    let status = 'pass';
    let message = '';

    if (!hasDescription) {
      status = 'fail';
      message = 'メタディスクリプションが設定されていません';
    } else if (!isOptimalLength) {
      status = 'warning';
      message = `メタディスクリプションの長さを最適化してください（現在: ${descLength}文字、推奨: 120-160文字）`;
    } else {
      status = 'pass';
      message = 'メタディスクリプションが適切に設定されています';
    }

    return {
      id: 'meta-description',
      title: 'メタディスクリプション',
      priority: 'C',
      status: status,
      message: message,
      details: 'ページ固有で、的確な要点が簡潔に記載されたメタディスクリプションを設定してください',
      source: 'Google検索セントラル - メタディスクリプション'
    };
  }

  checkImageAlt() {
    const totalImages = this.data.images.total;
    const imagesWithAlt = this.data.images.withAlt;
    const imagesWithoutAlt = this.data.images.withoutAlt;
    const altCoverage = totalImages > 0 ? (imagesWithAlt / totalImages * 100).toFixed(1) : 0;

    let status = 'pass';
    let message = '';

    if (totalImages === 0) {
      status = 'info';
      message = '画像が見つかりませんでした';
    } else if (altCoverage < 50) {
      status = 'fail';
      message = `alt属性の設定率が低いです（${altCoverage}%）`;
    } else if (altCoverage < 90) {
      status = 'warning';
      message = `alt属性をすべての画像に設定してください（現在: ${altCoverage}%）`;
    } else {
      status = 'pass';
      message = `すべての画像にalt属性が設定されています（${altCoverage}%）`;
    }

    return {
      id: 'image-alt',
      title: '画像の代替テキスト',
      priority: 'C',
      status: status,
      message: message,
      details: 'すべての画像に、内容を説明するわかりやすいalt属性を追加してください',
      source: 'Google検索セントラル - 画像の最適化'
    };
  }

  checkStructuredData() {
    const hasJSONLD = this.html.match(/<script[^>]*type=["']application\/ld\+json["']/gi);
    const hasMicrodata = this.html.match(/itemscope|itemprop/gi);

    let status = 'pass';
    let message = '';

    if (hasJSONLD) {
      status = 'pass';
      message = 'JSON-LD形式の構造化データが検出されました';
    } else if (hasMicrodata) {
      status = 'pass';
      message = 'Microdata形式の構造化データが検出されました';
    } else {
      status = 'info';
      message = '構造化データの追加を検討してください';
    }

    return {
      id: 'structured-data',
      title: '構造化データ',
      priority: 'C',
      status: status,
      message: message,
      details: 'Schema.orgの構造化データを使用して、リッチリザルトを有効にしてください',
      source: 'Google検索セントラル - 構造化データ'
    };
  }

  checkMediaPlacement() {
    const hasImages = this.data.images.total > 0;
    const hasVideos = this.html.match(/<video|<iframe[^>]*youtube|<iframe[^>]*vimeo/gi);

    return {
      id: 'media-placement',
      title: '画像と動画の配置',
      priority: 'C',
      status: hasImages ? 'pass' : 'info',
      message: hasImages
        ? '画像が適切に配置されています'
        : '画像や動画の追加を検討してください',
      details: '高画質の画像や動画を、関連するテキストの近くに配置してください',
      source: 'Google検索セントラル - 画像と動画'
    };
  }

  // ==================== 優先度D チェック関数 ====================

  checkUGCManagement() {
    const hasCommentForm = this.html.match(/comment|コメント/gi);
    const hasForum = this.html.match(/forum|掲示板/gi);

    return {
      id: 'ugc-management',
      title: 'ユーザー作成コンテンツの管理',
      priority: 'D',
      status: 'info',
      message: hasCommentForm || hasForum
        ? 'ユーザー作成コンテンツを受け付けている場合は、適切に管理してください'
        : 'ユーザー作成コンテンツは検出されませんでした',
      details: 'フォーラムやコメントのリンクには rel="ugc" または rel="nofollow" を付けてください',
      source: 'Google検索セントラル - UGC'
    };
  }

  checkExternalLinksNofollow() {
    const externalLinks = this.data.links.totalExternal;

    return {
      id: 'external-links-nofollow',
      title: '外部リンクの管理',
      priority: 'D',
      status: 'info',
      message: `${externalLinks}個の外部リンクが見つかりました`,
      details: '信頼できない外部リンクには rel="nofollow" を付けることを検討してください',
      source: 'Google検索セントラル - リンクの品質'
    };
  }

  // ==================== サマリー計算 ====================

  calculateSummary() {
    const allChecks = [
      ...this.results.priorityS,
      ...this.results.priorityA,
      ...this.results.priorityB,
      ...this.results.priorityC,
      ...this.results.priorityD
    ];

    this.results.summary.total = allChecks.length;
    this.results.summary.passed = allChecks.filter(c => c.status === 'pass').length;
    this.results.summary.failed = allChecks.filter(c => c.status === 'fail').length;
    this.results.summary.warnings = allChecks.filter(c => c.status === 'warning').length;
  }
}

// グローバルエクスポート（ブラウザ用）
if (typeof window !== 'undefined') {
  window.DetailedSEOChecker = DetailedSEOChecker;
}

// Node.jsエクスポート（サーバー用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetailedSEOChecker;
}
