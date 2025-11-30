/**
 * Vercel Serverless Function
 * AI改善提案APIエンドポイント
 *
 * 環境変数（いずれか1つ以上を設定）:
 * - OPENAI_API_KEY: OpenAI APIキー（優先順位1）
 * - ANTHROPIC_API_KEY: Claude APIキー（優先順位2）
 * - GEMINI_API_KEY: Google Gemini APIキー（優先順位3）
 *
 * 利用可能なAPIを自動検出して使用します。
 * すべてのAPIが利用不可の場合、ルールベース分析にフォールバックします。
 */

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

  try {
    const { scoreResults, parsedData, apiType } = req.body;

    if (!scoreResults || !parsedData) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 利用可能なAPIプロバイダーを自動選択（優先順位: OpenAI → Claude → Gemini）
    let result = null;
    let usedProvider = null;

    console.log('AI Analysis - Available API Keys:', {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    });

    // 優先順位1: OpenAI
    if (process.env.OPENAI_API_KEY && (!apiType || apiType === 'openai')) {
      console.log('Trying OpenAI API...');
      try {
        result = await callOpenAIAPI(process.env.OPENAI_API_KEY, scoreResults, parsedData);
        usedProvider = 'openai';
        console.log('✅ OpenAI API succeeded');
      } catch (error) {
        console.warn('❌ OpenAI API failed:', error.message);
      }
    }

    // 優先順位2: Claude (Anthropic)
    if (!result && process.env.ANTHROPIC_API_KEY && (!apiType || apiType === 'claude')) {
      console.log('Trying Claude API...');
      try {
        result = await callClaudeAPI(process.env.ANTHROPIC_API_KEY, scoreResults, parsedData);
        usedProvider = 'claude';
        console.log('✅ Claude API succeeded');
      } catch (error) {
        console.warn('❌ Claude API failed:', error.message);
      }
    }

    // 優先順位3: Gemini
    if (!result && process.env.GEMINI_API_KEY && (!apiType || apiType === 'gemini')) {
      console.log('Trying Gemini API...');
      try {
        result = await callGeminiAPI(process.env.GEMINI_API_KEY, scoreResults, parsedData);
        usedProvider = 'gemini';
        console.log('✅ Gemini API succeeded');
      } catch (error) {
        console.warn('❌ Gemini API failed:', error.message);
      }
    }

    // すべてのAI APIが失敗した場合、ルールベース分析にフォールバック
    if (!result) {
      console.log('⚠️ All AI APIs unavailable, using rule-based suggestions');
      const ruleBasedResult = generateRuleBasedSuggestions(scoreResults, parsedData);
      return res.status(200).json(ruleBasedResult);
    }

    console.log(`✅ Using ${usedProvider} for AI analysis`);
    return res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);

    // エラー時はルールベース分析にフォールバック
    try {
      const { scoreResults, parsedData } = req.body;
      const ruleBasedResult = generateRuleBasedSuggestions(scoreResults, parsedData);
      return res.status(200).json({
        ...ruleBasedResult,
        warning: 'AI APIエラーのため、ルールベース分析を使用しています'
      });
    } catch (fallbackError) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

/**
 * OpenAI APIを呼び出し
 */
async function callOpenAIAPI(apiKey, scoreResults, parsedData) {
  const prompt = buildPrompt(scoreResults, parsedData);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
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
async function callClaudeAPI(apiKey, scoreResults, parsedData) {
  const prompt = buildPrompt(scoreResults, parsedData);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
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
 * Google Gemini APIを呼び出し
 */
async function callGeminiAPI(apiKey, scoreResults, parsedData) {
  const prompt = buildPrompt(scoreResults, parsedData);

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;

  // JSONをパース
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return {
        success: true,
        suggestions: JSON.parse(jsonMatch[0]),
        source: 'gemini'
      };
    }
  } catch (e) {
    console.warn('JSON parse error, using raw content');
  }

  return {
    success: true,
    suggestions: { generalAdvice: content, priorityIssues: [] },
    source: 'gemini'
  };
}

/**
 * プロンプトを構築
 */
function buildPrompt(scoreResults, parsedData) {
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
 * ルールベースの改善提案を生成
 */
function generateRuleBasedSuggestions(scoreResults, parsedData) {
  const priorityIssues = [];

  // 重大度でソート
  const sortedIssues = [...scoreResults.issues].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // TOP3の問題を抽出
  const topIssues = sortedIssues.slice(0, 3);

  topIssues.forEach((issue, index) => {
    const suggestion = getRuleBasedSuggestion(issue, parsedData);
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
      generalAdvice: getGeneralAdvice(scoreResults, parsedData)
    },
    source: 'rule-based'
  };
}

/**
 * 問題別のルールベース提案
 */
function getRuleBasedSuggestion(issue, parsedData) {
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
function getGeneralAdvice(scoreResults, parsedData) {
  const score = scoreResults.totalScore;
  const criticalIssues = scoreResults.issues.filter(i => i.severity === 'critical').length;

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
