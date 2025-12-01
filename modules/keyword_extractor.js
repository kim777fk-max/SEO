/**
 * キーワード抽出モジュール
 * ページからSEOキーワードを抽出・分析
 */

class KeywordExtractor {
  constructor(parsedData, html) {
    this.data = parsedData;
    this.html = html || '';

    // 日本語・英語のストップワード（除外する一般的な単語）
    this.stopwords = new Set([
      // 日本語
      'この', 'その', 'あの', 'どの', 'これ', 'それ', 'あれ', 'どれ',
      'ここ', 'そこ', 'あそこ', 'どこ', 'です', 'ます', 'である', 'ある',
      'いる', 'する', 'なる', 'できる', 'いく', 'くる', 'れる', 'られる',
      'せる', 'させる', 'ない', 'たい', 'だろう', 'でしょう', 'かもしれない',
      // 英語
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what'
    ]);
  }

  /**
   * すべてのキーワード分析を実行
   */
  extract() {
    const results = {
      // 主要キーワード（頻出単語）
      mainKeywords: this.extractMainKeywords(),

      // タイトルのキーワード
      titleKeywords: this.extractTitleKeywords(),

      // H1のキーワード
      h1Keywords: this.extractH1Keywords(),

      // メタディスクリプションのキーワード
      metaKeywords: this.extractMetaKeywords(),

      // 2-3語のフレーズ（ロングテールキーワード候補）
      phrases: this.extractPhrases(),

      // キーワード密度
      density: this.calculateKeywordDensity(),

      // 推奨キーワード（各所に配置すべきキーワード）
      recommendations: []
    };

    // 推奨事項を生成
    results.recommendations = this.generateRecommendations(results);

    return results;
  }

  /**
   * メインコンテンツから主要キーワードを抽出（TF-IDF風）
   */
  extractMainKeywords() {
    const text = this.data.content && this.data.content.text ? this.data.content.text : '';
    if (!text) return [];

    // 単語を抽出（日本語・英語対応）
    const words = this.tokenize(text.toLowerCase());

    // 単語の出現回数をカウント
    const wordFreq = {};
    words.forEach(word => {
      if (this.isValidKeyword(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    // 頻度順にソート
    const sorted = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20) // 上位20個
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / words.length) * 100).toFixed(2) + '%'
      }));

    return sorted;
  }

  /**
   * タイトルからキーワードを抽出
   */
  extractTitleKeywords() {
    const title = this.data.title && this.data.title.text ? this.data.title.text : '';
    if (!title) return [];

    const words = this.tokenize(title.toLowerCase());
    return words.filter(w => this.isValidKeyword(w));
  }

  /**
   * H1からキーワードを抽出
   */
  extractH1Keywords() {
    const h1s = this.data.headings && this.data.headings.h1 ? this.data.headings.h1 : [];
    if (h1s.length === 0) return [];

    const allWords = [];
    h1s.forEach(h1 => {
      const words = this.tokenize(h1.toLowerCase());
      words.forEach(w => {
        if (this.isValidKeyword(w)) {
          allWords.push(w);
        }
      });
    });

    return [...new Set(allWords)]; // 重複を除去
  }

  /**
   * メタディスクリプションからキーワードを抽出
   */
  extractMetaKeywords() {
    const description = this.data.meta && this.data.meta.description ? this.data.meta.description : '';
    if (!description) return [];

    const words = this.tokenize(description.toLowerCase());
    return words.filter(w => this.isValidKeyword(w));
  }

  /**
   * 2-3語のフレーズを抽出（ロングテールキーワード候補）
   */
  extractPhrases() {
    const text = this.data.content && this.data.content.text ? this.data.content.text : '';
    if (!text) return [];

    const sentences = text.split(/[。．.!！?？\n]/);
    const phrases = [];

    sentences.forEach(sentence => {
      const words = this.tokenize(sentence.toLowerCase());

      // 2語のフレーズ
      for (let i = 0; i < words.length - 1; i++) {
        if (this.isValidKeyword(words[i]) && this.isValidKeyword(words[i + 1])) {
          phrases.push(words[i] + ' ' + words[i + 1]);
        }
      }

      // 3語のフレーズ
      for (let i = 0; i < words.length - 2; i++) {
        if (this.isValidKeyword(words[i]) &&
            this.isValidKeyword(words[i + 1]) &&
            this.isValidKeyword(words[i + 2])) {
          phrases.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
        }
      }
    });

    // 頻度をカウント
    const phraseFreq = {};
    phrases.forEach(phrase => {
      phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
    });

    // 頻度順にソート（2回以上出現したもののみ）
    return Object.entries(phraseFreq)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([phrase, count]) => ({ phrase, count }));
  }

  /**
   * キーワード密度を計算
   */
  calculateKeywordDensity() {
    const mainKeywords = this.extractMainKeywords();
    const totalWords = this.data.content && this.data.content.wordCount ? this.data.content.wordCount : 0;

    return mainKeywords.slice(0, 10).map(kw => ({
      keyword: kw.word,
      count: kw.count,
      density: kw.density,
      optimal: this.isOptimalDensity(parseFloat(kw.density))
    }));
  }

  /**
   * キーワード密度が適切かチェック（1-3%が理想）
   */
  isOptimalDensity(density) {
    return density >= 1.0 && density <= 3.0;
  }

  /**
   * テキストをトークン化（単語分割）
   */
  tokenize(text) {
    // 日本語と英語の両方に対応
    // 英語: スペースで分割
    // 日本語: 簡易的に1-3文字の単語として扱う（本来はMeCabなどが必要）

    const words = [];

    // 英数字の単語を抽出
    const englishWords = text.match(/[a-z0-9]+/g) || [];
    words.push(...englishWords);

    // 日本語の単語を抽出（簡易版：2-4文字のひらがな・カタカナ・漢字）
    const japaneseWords = text.match(/[ぁ-んァ-ヶー一-龠]{2,4}/g) || [];
    words.push(...japaneseWords);

    return words;
  }

  /**
   * 有効なキーワードかチェック
   */
  isValidKeyword(word) {
    // 長さチェック
    if (word.length < 2 || word.length > 20) return false;

    // ストップワードチェック
    if (this.stopwords.has(word)) return false;

    // 数字のみは除外
    if (/^\d+$/.test(word)) return false;

    return true;
  }

  /**
   * キーワード配置の推奨事項を生成
   */
  generateRecommendations(results) {
    const recommendations = [];
    const mainKws = results.mainKeywords.slice(0, 5).map(k => k.word);
    const titleKws = results.titleKeywords;
    const h1Kws = results.h1Keywords;
    const metaKws = results.metaKeywords;

    // タイトルに主要キーワードがない
    mainKws.forEach(kw => {
      if (!titleKws.includes(kw)) {
        recommendations.push({
          type: 'title',
          priority: 'high',
          message: `主要キーワード「${kw}」をタイトルに含めることを検討してください`
        });
      }
    });

    // H1に主要キーワードがない
    if (h1Kws.length === 0) {
      recommendations.push({
        type: 'h1',
        priority: 'high',
        message: 'H1タグが見つかりません。主要キーワードを含むH1を追加してください'
      });
    } else {
      mainKws.forEach(kw => {
        if (!h1Kws.includes(kw)) {
          recommendations.push({
            type: 'h1',
            priority: 'medium',
            message: `主要キーワード「${kw}」をH1に含めることを検討してください`
          });
        }
      });
    }

    // メタディスクリプションに主要キーワードがない
    if (metaKws.length === 0) {
      recommendations.push({
        type: 'meta',
        priority: 'high',
        message: 'メタディスクリプションが設定されていません'
      });
    } else {
      mainKws.slice(0, 3).forEach(kw => {
        if (!metaKws.includes(kw)) {
          recommendations.push({
            type: 'meta',
            priority: 'medium',
            message: `主要キーワード「${kw}」をメタディスクリプションに含めることを検討してください`
          });
        }
      });
    }

    // キーワード密度が高すぎる
    results.density.forEach(kw => {
      const density = parseFloat(kw.density);
      if (density > 5.0) {
        recommendations.push({
          type: 'density',
          priority: 'high',
          message: `キーワード「${kw.keyword}」の密度が高すぎます（${kw.density}）。キーワードスタッフィングに注意してください`
        });
      }
    });

    return recommendations;
  }
}

// グローバルエクスポート（ブラウザ用）
if (typeof window !== 'undefined') {
  window.KeywordExtractor = KeywordExtractor;
}

// Node.jsエクスポート（サーバー用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeywordExtractor;
}
