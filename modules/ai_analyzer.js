/**
 * AI分析モジュール
 * OpenAI APIまたはClaude APIを使用してSEO改善提案を生成
 */

class AIAnalyzer {
  constructor(apiKey = null, apiType = 'openai') {
    this.apiKey = apiKey;
    this.apiType = apiType; // 'openai' or 'claude'
    this.apiEndpoints = {
      openai: 'https://api.openai.com/v1/chat/completions',
      claude: 'https://api.anthropic.com/v1/messages'
    };
  }

  /**
   * SEOスコア結果に基づいてAI改善提案を生成
   * @param {Object} scoreResults - スコアリング結果
   * @param {Object} parsedData - パースされたHTML データ
   * @returns {Promise<Object>} AI提案結果
   */
  async generateSuggestions(scoreResults, parsedData) {
    // APIキーが設定されていない場合はルールベースの提案を返す
    if (!this.apiKey) {
      return this.generateRuleBasedSuggestions(scoreResults, parsedData);
    }

    try {
      const prompt = this.buildPrompt(scoreResults, parsedData);

      if (this.apiType === 'openai') {
        return await this.callOpenAI(prompt);
      } else if (this.apiType === 'claude') {
        return await this.callClaude(prompt);
      } else {
        throw new Error('Unsupported API type');
      }
    } catch (error) {
      console.error('AI分析エラー:', error);
      // エラー時はルールベースにフォールバック
      return this.generateRuleBasedSuggestions(scoreResults, parsedData);
    }
  }

  /**
   * プロンプトを構築
   */
  buildPrompt(scoreResults, parsedData) {
    const issues = scoreResults.issues.map(issue => ({
      category: issue.category,
      problem: issue.rule,
      description: issue.description,
      severity: issue.severity
    }));

    const summary = {
      url: parsedData.url,
      score: scoreResults.totalScore,
      grade: scoreResults.grade.label,
      title: parsedData.title.text,
      h1Count: parsedData.headings.h1.length,
      wordCount: parsedData.content.wordCount,
      images: parsedData.images.total,
      internalLinks: parsedData.links.totalInternal,
      externalLinks: parsedData.links.totalExternal
    };

    return `あなたはSEOの専門家です。以下のWebページのSEO診断結果に基づいて、具体的な改善提案を日本語で提供してください。

【診断結果サマリー】
- URL: ${summary.url}
- 総合スコア: ${summary.score}/100 (${summary.grade})
- タイトル: ${summary.title}
- H1タグ数: ${summary.h1Count}
- コンテンツ量: ${summary.wordCount}文字/単語
- 画像数: ${summary.images}
- 内部リンク: ${summary.internalLinks}
- 外部リンク: ${summary.externalLinks}

【検出された問題点】
${issues.map((issue, i) => `${i + 1}. [${issue.severity}] ${issue.problem}: ${issue.description}`).join('\n')}

【依頼内容】
1. 最も重要な問題点TOP3を優先順位付けして説明してください
2. 各問題に対する具体的な改善方法を提案してください
3. 実装が簡単な順に並べてください
4. 可能であれば、改善後の期待効果も記載してください

回答は以下のJSON形式で返してください：
{
  "priorityIssues": [
    {
      "priority": 1,
      "issue": "問題の名前",
      "severity": "critical/high/medium/low",
      "suggestion": "具体的な改善提案",
      "implementation": "実装方法の説明",
      "expectedImpact": "期待される効果"
    }
  ],
  "generalAdvice": "全体的なアドバイス"
}`;
  }

  /**
   * OpenAI APIを呼び出し
   */
  async callOpenAI(prompt) {
    const response = await fetch(this.apiEndpoints.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'あなたはGoogle SEOガイドラインに精通したSEO専門家です。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // JSONをパース
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return {
          success: true,
          suggestions: JSON.parse(jsonMatch[0]),
          source: 'openai'
        };
      }
    } catch (e) {
      console.warn('JSON parse error, using raw content');
    }

    return {
      success: true,
      suggestions: { generalAdvice: content, priorityIssues: [] },
      source: 'openai'
    };
  }

  /**
   * Claude APIを呼び出し
   */
  async callClaude(prompt) {
    const response = await fetch(this.apiEndpoints.claude, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // JSONをパース
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return {
          success: true,
          suggestions: JSON.parse(jsonMatch[0]),
          source: 'claude'
        };
      }
    } catch (e) {
      console.warn('JSON parse error, using raw content');
    }

    return {
      success: true,
      suggestions: { generalAdvice: content, priorityIssues: [] },
      source: 'claude'
    };
  }

  /**
   * ルールベースの改善提案を生成（APIなしの場合）
   */
  generateRuleBasedSuggestions(scoreResults, parsedData) {
    const priorityIssues = [];

    // 重大度でソート
    const sortedIssues = [...scoreResults.issues].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // TOP3の問題を抽出
    const topIssues = sortedIssues.slice(0, 3);

    topIssues.forEach((issue, index) => {
      const suggestion = this.getRuleBasedSuggestion(issue, parsedData);
      priorityIssues.push({
        priority: index + 1,
        issue: issue.rule,
        severity: issue.severity,
        category: issue.category,
        suggestion: suggestion.suggestion,
        implementation: suggestion.implementation,
        expectedImpact: suggestion.expectedImpact
      });
    });

    return {
      success: true,
      suggestions: {
        priorityIssues: priorityIssues,
        generalAdvice: this.getGeneralAdvice(scoreResults, parsedData)
      },
      source: 'rule-based'
    };
  }

  /**
   * 問題別のルールベース提案
   */
  getRuleBasedSuggestion(issue, parsedData) {
    const suggestions = {
      'Title Tag Exists': {
        suggestion: 'ページにタイトルタグを追加してください。タイトルタグはSEOで最も重要な要素の一つです。',
        implementation: '<head>内に<title>ページタイトル</title>を追加します。ページの内容を正確に表す、ユニークで魅力的なタイトルを設定してください。',
        expectedImpact: '検索結果での表示が改善され、クリック率が向上します。'
      },
      'Title Tag Length': {
        suggestion: 'タイトルタグの長さを最適化してください。50-60文字が理想的です。',
        implementation: `現在のタイトル（${parsedData.title.length}文字）を50-60文字に調整します。重要なキーワードを前半に配置してください。`,
        expectedImpact: '検索結果で完全に表示され、ユーザーの注目を集めやすくなります。'
      },
      'Meta Description Exists': {
        suggestion: 'メタディスクリプションを追加してください。検索結果のスニペットに表示される重要な要素です。',
        implementation: '<head>内に<meta name="description" content="ページの説明">を追加します。150-160文字でページの内容を魅力的に説明してください。',
        expectedImpact: '検索結果でのクリック率が向上します。'
      },
      'H1 Tag Exists': {
        suggestion: 'ページにH1タグを追加してください。H1タグはページの主題を示す重要な要素です。',
        implementation: 'ページの最も重要な見出しに<h1>タグを使用します。ページごとに1つだけ設定してください。',
        expectedImpact: 'ページの構造が明確になり、検索エンジンがコンテンツを理解しやすくなります。'
      },
      'Single H1 Tag': {
        suggestion: 'H1タグは1ページに1つだけにしてください。',
        implementation: `現在${parsedData.headings.h1.length}個のH1タグがあります。最も重要な見出し以外はH2以下に変更してください。`,
        expectedImpact: 'ページの階層構造が明確になり、SEO効果が向上します。'
      },
      'Viewport Meta Tag': {
        suggestion: 'モバイル対応のためにViewportメタタグを追加してください。',
        implementation: '<head>内に<meta name="viewport" content="width=device-width, initial-scale=1.0">を追加します。',
        expectedImpact: 'モバイルデバイスでの表示が最適化され、モバイルSEOスコアが向上します。'
      },
      'Images Have Alt Text': {
        suggestion: 'すべての画像にalt属性を追加してください。',
        implementation: `現在${parsedData.images.withoutAlt}枚の画像にalt属性がありません。各画像に<img src="..." alt="画像の説明">のように追加してください。`,
        expectedImpact: 'アクセシビリティが向上し、画像検索での表示機会が増えます。'
      },
      'HTTPS Protocol': {
        suggestion: 'サイトをHTTPSに移行してください。',
        implementation: 'SSL証明書を取得し、サーバー設定でHTTPSを有効化します。すべてのHTTPリンクをHTTPSにリダイレクトしてください。',
        expectedImpact: 'セキュリティが向上し、検索ランキングにプラスの影響があります。'
      },
      'JSON-LD Present': {
        suggestion: '構造化データ（JSON-LD）を追加してください。',
        implementation: 'Schema.orgの適切なタイプ（Article, Product, LocalBusinessなど）を選び、<script type="application/ld+json">で追加します。',
        expectedImpact: 'リッチリザルト（リッチスニペット）として表示される可能性が高まります。'
      }
    };

    return suggestions[issue.rule] || {
      suggestion: `${issue.description}について改善が必要です。`,
      implementation: 'Google Search Centralのガイドラインを参照してください。',
      expectedImpact: 'SEOスコアが向上します。'
    };
  }

  /**
   * 全体的なアドバイスを生成
   */
  getGeneralAdvice(scoreResults, parsedData) {
    const score = scoreResults.totalScore;
    const criticalIssues = scoreResults.issues.filter(i => i.severity === 'critical').length;
    const highIssues = scoreResults.issues.filter(i => i.severity === 'high').length;

    let advice = '';

    if (score >= 90) {
      advice = '優秀なSEOスコアです！現在の施策を継続しつつ、コンテンツの質をさらに高めていくことをお勧めします。';
    } else if (score >= 75) {
      advice = '良好なSEO状態です。いくつかの改善点を修正することで、さらにスコアを向上させることができます。';
    } else if (score >= 60) {
      advice = '平均的なSEO状態です。重要度の高い問題から優先的に対応していきましょう。';
    } else if (score >= 40) {
      advice = '改善の余地が多くあります。特に技術的なSEO要素（タイトル、メタタグ、見出し構造）を優先的に修正してください。';
    } else {
      advice = '重大な問題が多数検出されています。基本的なSEO要素から順番に修正していく必要があります。';
    }

    if (criticalIssues > 0) {
      advice += ` 特に${criticalIssues}件のクリティカルな問題を最優先で対応してください。`;
    }

    if (parsedData.content.wordCount < 300) {
      advice += ' コンテンツ量が少ないため、ユーザーに価値ある情報を追加することをお勧めします。';
    }

    return advice;
  }
}

// エクスポート
if (typeof window !== 'undefined') {
  window.AIAnalyzer = AIAnalyzer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAnalyzer;
}
