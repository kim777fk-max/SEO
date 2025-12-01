/**
 * SEOスコアリングモジュール
 * Google SEOガイドラインに基づいて採点
 */

class SEOScorer {
  constructor(parsedData, seoGuides) {
    this.parsedData = parsedData;
    this.seoGuides = seoGuides;
    this.results = {
      totalScore: 0,
      maxScore: 100,
      categories: {},
      issues: [],
      passed: [],
      warnings: []
    };
  }

  /**
   * 全カテゴリの採点を実行
   * @returns {Object} 採点結果
   */
  score() {
    const categories = this.seoGuides.categories;

    for (const [categoryKey, category] of Object.entries(categories)) {
      const categoryResult = this.scoreCategory(categoryKey, category);
      this.results.categories[categoryKey] = categoryResult;
    }

    // 総合スコアを計算
    this.calculateTotalScore();

    // グレード判定
    this.results.grade = this.getGrade(this.results.totalScore);

    return this.results;
  }

  /**
   * カテゴリ別の採点
   */
  scoreCategory(categoryKey, category) {
    const result = {
      name: category.name,
      weight: category.weight,
      score: 0,
      maxScore: 0,
      percentage: 0,
      rules: []
    };

    category.rules.forEach(rule => {
      const ruleResult = this.checkRule(rule);
      result.rules.push(ruleResult);

      if (ruleResult.passed) {
        result.score += rule.points;
        this.results.passed.push({
          category: category.name,
          rule: rule.name,
          description: rule.description
        });
      } else {
        this.results.issues.push({
          category: category.name,
          rule: rule.name,
          description: rule.description,
          severity: rule.severity,
          points: rule.points,
          finding: ruleResult.finding
        });

        if (rule.severity === 'medium' || rule.severity === 'low') {
          this.results.warnings.push({
            category: category.name,
            rule: rule.name,
            finding: ruleResult.finding
          });
        }
      }

      result.maxScore += rule.points;
    });

    result.percentage = result.maxScore > 0
      ? Math.round((result.score / result.maxScore) * 100)
      : 0;

    return result;
  }

  /**
   * 個別ルールのチェック
   */
  checkRule(rule) {
    const checkMethod = rule.check;
    const result = {
      id: rule.id,
      name: rule.name,
      passed: false,
      finding: ''
    };

    try {
      // チェックメソッドを実行
      const checkResult = this[checkMethod](rule.params);
      result.passed = checkResult.passed;
      result.finding = checkResult.finding;
    } catch (error) {
      console.error(`Rule check error for ${rule.id}:`, error);
      result.passed = false;
      result.finding = 'チェック実行エラー';
    }

    return result;
  }

  /**
   * 総合スコアを計算
   */
  calculateTotalScore() {
    let totalScore = 0;
    let totalMaxScore = 0;

    for (const category of Object.values(this.results.categories)) {
      totalScore += category.score;
      totalMaxScore += category.maxScore;
    }

    this.results.totalScore = totalMaxScore > 0
      ? Math.round((totalScore / totalMaxScore) * 100)
      : 0;
  }

  /**
   * グレード判定
   */
  getGrade(score) {
    const scoring = this.seoGuides.scoring;

    for (const [grade, range] of Object.entries(scoring)) {
      if (score >= range.min && score <= range.max) {
        return {
          grade: grade,
          label: range.label,
          color: range.color,
          score: score
        };
      }
    }

    return {
      grade: 'unknown',
      label: '不明',
      color: '#999',
      score: score
    };
  }

  // ===== チェックメソッド =====

  hasTitle() {
    const exists = this.parsedData.title.exists && this.parsedData.title.length > 0;
    return {
      passed: exists,
      finding: exists ? `タイトル: "${this.parsedData.title.text}"` : 'タイトルタグが見つかりません'
    };
  }

  titleLength(params) {
    const length = this.parsedData.title.length;
    const isOptimal = length >= params.ideal_min && length <= params.max;
    const isAcceptable = length >= params.min && length <= params.max;

    return {
      passed: isOptimal || isAcceptable,
      finding: isOptimal
        ? `適切な長さです (${length}文字)`
        : isAcceptable
          ? `許容範囲内ですが、${params.ideal_min}-${params.max}文字が推奨です (現在: ${length}文字)`
          : `推奨範囲外です (${length}文字、推奨: ${params.min}-${params.max}文字)`
    };
  }

  hasMetaDescription() {
    const exists = this.parsedData.metaDescription.exists;
    return {
      passed: exists,
      finding: exists
        ? `メタディスクリプション: "${this.parsedData.metaDescription.text.substring(0, 50)}..."`
        : 'メタディスクリプションが設定されていません'
    };
  }

  metaDescriptionLength(params) {
    const length = this.parsedData.metaDescription.length;
    if (length === 0) {
      return { passed: false, finding: 'メタディスクリプションが設定されていません' };
    }

    const isOptimal = length >= params.ideal_min && length <= params.max;
    const isAcceptable = length >= params.min && length <= params.max;

    return {
      passed: isOptimal || isAcceptable,
      finding: isOptimal
        ? `適切な長さです (${length}文字)`
        : `推奨: ${params.min}-${params.max}文字 (現在: ${length}文字)`
    };
  }

  hasH1() {
    const h1Count = this.parsedData.headings.h1.length;
    return {
      passed: h1Count > 0,
      finding: h1Count > 0
        ? `H1タグ: "${this.parsedData.headings.h1[0]}"`
        : 'H1タグが見つかりません'
    };
  }

  singleH1() {
    const h1Count = this.parsedData.headings.h1.length;
    return {
      passed: h1Count === 1,
      finding: h1Count === 1
        ? 'H1タグは1つです'
        : `H1タグが${h1Count}個あります（推奨: 1個）`
    };
  }

  headingHierarchy() {
    const hierarchy = this.parsedData.headings.hierarchy;
    let prevLevel = 0;
    let hasIssue = false;
    let issueText = '';

    for (let i = 0; i < hierarchy.length; i++) {
      const current = hierarchy[i];

      if (prevLevel > 0 && current.level > prevLevel + 1) {
        hasIssue = true;
        issueText = `H${prevLevel}の後にH${current.level}があります（H${prevLevel + 1}が推奨）`;
        break;
      }

      prevLevel = current.level;
    }

    return {
      passed: !hasIssue,
      finding: hasIssue ? issueText : '見出しの階層構造は適切です'
    };
  }

  hasCanonical() {
    const canonical = this.parsedData.metaTags.canonical;
    return {
      passed: !!canonical,
      finding: canonical
        ? `Canonicalタグ: ${canonical}`
        : 'Canonicalタグが設定されていません'
    };
  }

  hasRobotsMeta() {
    const robots = this.parsedData.metaTags.robots;
    return {
      passed: true, // オプショナルなのでパス扱い
      finding: robots
        ? `Robotsメタタグ: ${robots}`
        : 'Robotsメタタグは設定されていません（オプション）'
    };
  }

  hasViewport() {
    const viewport = this.parsedData.metaTags.viewport;
    return {
      passed: !!viewport,
      finding: viewport
        ? `Viewportメタタグ: ${viewport}`
        : 'Viewportメタタグが設定されていません（モバイル対応に必須）'
    };
  }

  contentLength(params) {
    const length = this.parsedData.content.textLength;
    const wordCount = this.parsedData.content.wordCount;

    return {
      passed: wordCount >= params.min,
      finding: wordCount >= params.recommended
        ? `十分なコンテンツ量です (${wordCount}文字/単語)`
        : wordCount >= params.min
          ? `最低限のコンテンツ量です (${wordCount}文字/単語、推奨: ${params.recommended}以上)`
          : `コンテンツ量が不足しています (${wordCount}文字/単語、最低: ${params.min}以上)`
    };
  }

  wordCount() {
    const wordCount = this.parsedData.content.wordCount;
    return {
      passed: wordCount >= 300,
      finding: `${wordCount}文字/単語のコンテンツ`
    };
  }

  imagesWithAlt() {
    const images = this.parsedData.images;
    const percentage = parseFloat(images.percentage);

    if (images.total === 0) {
      return { passed: true, finding: '画像がありません' };
    }

    return {
      passed: percentage >= 90,
      finding: `${images.withAlt}/${images.total}枚の画像にalt属性あり (${percentage}%)`
    };
  }

  hasInternalLinks() {
    const count = this.parsedData.links.totalInternal;
    return {
      passed: count >= 3,
      finding: count >= 3
        ? `${count}個の内部リンク`
        : `内部リンクが少ないです (${count}個、推奨: 3個以上)`
    };
  }

  hasExternalLinks() {
    const count = this.parsedData.links.totalExternal;
    return {
      passed: count >= 1,
      finding: count >= 1
        ? `${count}個の外部リンク`
        : '外部リンクがありません'
    };
  }

  readability() {
    const paragraphs = this.parsedData.content.paragraphs;
    return {
      passed: paragraphs >= 3,
      finding: paragraphs >= 3
        ? `${paragraphs}個の段落で構成されています`
        : `段落が少ないです (${paragraphs}個)`
    };
  }

  hasAuthorInfo() {
    // author, by-line などの要素をチェック
    const hasAuthor = this.parsedData.metaTags.ogTags['og:author'] || false;
    return {
      passed: hasAuthor,
      finding: hasAuthor ? '著者情報が設定されています' : '著者情報が見つかりません'
    };
  }

  hasPublishDate() {
    const hasDate = this.parsedData.metaTags.ogTags['og:published_time'] ||
                    this.parsedData.metaTags.ogTags['article:published_time'] ||
                    false;
    return {
      passed: hasDate,
      finding: hasDate ? '公開日が設定されています' : '公開日情報が見つかりません'
    };
  }

  isHTTPS() {
    const isSecure = this.parsedData.technical.isHTTPS;
    return {
      passed: isSecure,
      finding: isSecure ? 'HTTPSを使用しています' : 'HTTPSを使用していません（セキュリティリスク）'
    };
  }

  hasContactInfo() {
    // 簡易チェック（実際のページでは連絡先リンクなどをチェック）
    return {
      passed: true,
      finding: '連絡先情報のチェックはマニュアル確認が推奨されます'
    };
  }

  hasJsonLd() {
    const hasSchema = this.parsedData.structuredData.hasJsonLd;
    const count = this.parsedData.structuredData.count;

    return {
      passed: hasSchema,
      finding: hasSchema
        ? `${count}個のJSON-LD構造化データが設定されています`
        : 'JSON-LD構造化データが見つかりません'
    };
  }

  hasSchemaOrg() {
    const hasSchema = this.parsedData.structuredData.hasJsonLd;
    return {
      passed: hasSchema,
      finding: hasSchema
        ? 'Schema.org構造化データが設定されています'
        : 'Schema.org構造化データが見つかりません'
    };
  }

  isMobileFriendly() {
    const hasViewport = this.parsedData.technical.hasViewport;
    return {
      passed: hasViewport,
      finding: hasViewport
        ? 'モバイル対応のViewportメタタグが設定されています'
        : 'モバイル対応が不十分です（Viewportメタタグがありません）'
    };
  }

  hasLangAttribute() {
    const lang = this.parsedData.technical.lang;
    return {
      passed: !!lang,
      finding: lang
        ? `言語属性: ${lang}`
        : '言語属性が設定されていません'
    };
  }

  hasCharset() {
    const hasCharset = this.parsedData.technical.hasCharset;
    return {
      passed: hasCharset,
      finding: hasCharset
        ? '文字エンコーディングが設定されています'
        : '文字エンコーディングが設定されていません'
    };
  }
}

// エクスポート
if (typeof window !== 'undefined') {
  window.SEOScorer = SEOScorer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SEOScorer;
}
