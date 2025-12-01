/**
 * AI SEO優先分析API
 * Google Search Central 公式ガイドに基づくSEOチェック結果をAIが分析
 */

export default async function handler(req, res) {
  // CORSヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priorityResults, parsedData, apiType = 'openai' } = req.body;

    if (!priorityResults || !parsedData) {
      return res.status(400).json({ error: '必要なデータが不足しています' });
    }

    console.log('AI SEO Priority Analysis - Starting...');

    // AI APIキーの確認
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let analysis = null;

    // OpenAI優先で試行
    if (openaiKey && (apiType === 'openai' || !apiType)) {
      try {
        console.log('Trying OpenAI API for SEO priority analysis...');
        analysis = await callOpenAIAPI(openaiKey, priorityResults, parsedData);
        console.log('✅ OpenAI API succeeded');
      } catch (error) {
        console.error('OpenAI API failed:', error.message);
      }
    }

    // Claude API
    if (!analysis && anthropicKey && apiType === 'claude') {
      try {
        console.log('Trying Claude API for SEO priority analysis...');
        analysis = await callClaudeAPI(anthropicKey, priorityResults, parsedData);
        console.log('✅ Claude API succeeded');
      } catch (error) {
        console.error('Claude API failed:', error.message);
      }
    }

    // Gemini API
    if (!analysis && geminiKey && apiType === 'gemini') {
      try {
        console.log('Trying Gemini API for SEO priority analysis...');
        analysis = await callGeminiAPI(geminiKey, priorityResults, parsedData);
        console.log('✅ Gemini API succeeded');
      } catch (error) {
        console.error('Gemini API failed:', error.message);
      }
    }

    if (!analysis) {
      return res.status(500).json({
        error: 'すべてのAI APIが利用できません',
        message: 'APIキーを確認してください'
      });
    }

    res.status(200).json({ analysis });

  } catch (error) {
    console.error('SEO priority analysis error:', error);
    res.status(500).json({
      error: 'SEO優先分析エラー',
      message: error.message
    });
  }
}

/**
 * プロンプトを構築
 */
function buildPrompt(priorityResults, parsedData) {
  const { categories, summary } = priorityResults;

  // 失敗・警告項目を抽出
  const failedChecks = [];
  const warningChecks = [];

  categories.forEach(category => {
    category.checks.forEach(check => {
      if (check.status === 'fail') {
        failedChecks.push({
          category: category.category,
          check: check.label,
          detail: check.detail,
          link: category.link
        });
      } else if (check.status === 'warning') {
        warningChecks.push({
          category: category.category,
          check: check.label,
          detail: check.detail,
          link: category.link
        });
      }
    });
  });

  let prompt = `あなたはGoogle Search Central公式ガイドラインに精通したSEO専門家です。以下のSEO優先確認チェックの結果を分析し、具体的な改善提案を行ってください。

【ページ情報】
URL: ${parsedData.url}
タイトル: ${parsedData.title?.text || 'なし'}
メタディスクリプション: ${parsedData.meta?.description || 'なし'}

【チェック結果サマリー】
総合スコア: ${summary.score}/${summary.totalItems}点（${summary.percentage}%）
合格項目: ${summary.passedItems}
不合格項目: ${summary.failedItems}

【不合格項目（優先度：高）】
${failedChecks.length > 0 ? failedChecks.map((item, i) => `
${i + 1}. [${item.category}]
   チェック項目: ${item.check}
   詳細: ${item.detail}
   公式リンク: ${item.link}
`).join('\n') : 'なし'}

【警告項目（優先度：中）】
${warningChecks.length > 0 ? warningChecks.map((item, i) => `
${i + 1}. [${item.category}]
   チェック項目: ${item.check}
   詳細: ${item.detail}
   公式リンク: ${item.link}
`).join('\n') : 'なし'}

【依頼内容】
以下の観点で改善提案を行ってください：

1. **最優先改善項目TOP3**
   - 不合格項目の中で最も重要な3つを選定
   - それぞれの改善方法を具体的に記載
   - Google公式ガイドラインへのリンクを含める

2. **中期的改善項目**
   - 警告項目の改善方法
   - 実装の難易度と効果を記載

3. **具体的な実装手順**
   - 各改善項目について、具体的なコード例や設定方法
   - 優先順位付き（高／中／低）

4. **期待される効果**
   - 改善後のSEO効果
   - 検索順位やCTRへの影響

5. **実装時の注意点**
   - よくある間違い
   - Google公式ガイドラインで推奨されている方法

**回答形式**
マークダウン形式で、見出しと箇条書きを使って分かりやすく記載してください。
コード例がある場合は、コードブロックで囲んでください。
`;

  return prompt;
}

/**
 * OpenAI APIを呼び出し
 */
async function callOpenAIAPI(apiKey, priorityResults, parsedData) {
  const prompt = buildPrompt(priorityResults, parsedData);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたはGoogle Search Central公式ガイドラインに精通したSEO専門家です。具体的で実行可能な改善提案を提供します。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Claude APIを呼び出し
 */
async function callClaudeAPI(apiKey, priorityResults, parsedData) {
  const prompt = buildPrompt(priorityResults, parsedData);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Gemini APIを呼び出し
 */
async function callGeminiAPI(apiKey, priorityResults, parsedData) {
  const prompt = buildPrompt(priorityResults, parsedData);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
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
          maxOutputTokens: 2500
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
