/**
 * AIキーワード分析API
 * DataForSEOデータと抽出キーワードを元にAIが改善提案を生成
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
    const { extractedKeywords, dataforSeoData, parsedData, apiType = 'openai' } = req.body;

    if (!extractedKeywords || !parsedData) {
      return res.status(400).json({ error: '必要なデータが不足しています' });
    }

    console.log('AI Keyword Analysis - Starting...');

    // AI APIキーの確認
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let suggestions = null;

    // OpenAI優先で試行
    if (openaiKey && (apiType === 'openai' || !apiType)) {
      try {
        console.log('Trying OpenAI API for keyword analysis...');
        suggestions = await callOpenAIAPI(openaiKey, extractedKeywords, dataforSeoData, parsedData);
        console.log('✅ OpenAI API succeeded');
      } catch (error) {
        console.error('OpenAI API failed:', error.message);
      }
    }

    // Claude API
    if (!suggestions && anthropicKey && apiType === 'claude') {
      try {
        console.log('Trying Claude API for keyword analysis...');
        suggestions = await callClaudeAPI(anthropicKey, extractedKeywords, dataforSeoData, parsedData);
        console.log('✅ Claude API succeeded');
      } catch (error) {
        console.error('Claude API failed:', error.message);
      }
    }

    // Gemini API
    if (!suggestions && geminiKey && apiType === 'gemini') {
      try {
        console.log('Trying Gemini API for keyword analysis...');
        suggestions = await callGeminiAPI(geminiKey, extractedKeywords, dataforSeoData, parsedData);
        console.log('✅ Gemini API succeeded');
      } catch (error) {
        console.error('Gemini API failed:', error.message);
      }
    }

    if (!suggestions) {
      return res.status(500).json({
        error: 'すべてのAI APIが利用できません',
        message: 'APIキーを確認してください'
      });
    }

    res.status(200).json({ suggestions });

  } catch (error) {
    console.error('Keyword analysis error:', error);
    res.status(500).json({
      error: 'キーワード分析エラー',
      message: error.message
    });
  }
}

/**
 * プロンプトを構築
 */
function buildPrompt(extractedKeywords, dataforSeoData, parsedData) {
  const { mainKeywords, titleKeywords, h1Keywords, metaKeywords, phrases, density, recommendations } = extractedKeywords;

  let prompt = `あなたはSEOとキーワード戦略の専門家です。以下のウェブページのキーワード分析結果を元に、具体的な改善提案を行ってください。

【ページ情報】
URL: ${parsedData.url}
タイトル: ${parsedData.title?.text || 'なし'}
メタディスクリプション: ${parsedData.meta?.description || 'なし'}
H1: ${parsedData.headings?.h1?.join(', ') || 'なし'}

【抽出された主要キーワード（頻出順）】
${mainKeywords.slice(0, 10).map((kw, i) => `${i + 1}. ${kw.word} (出現回数: ${kw.count}, 密度: ${kw.density})`).join('\n')}

【タイトルのキーワード】
${titleKeywords.length > 0 ? titleKeywords.join(', ') : 'なし'}

【H1のキーワード】
${h1Keywords.length > 0 ? h1Keywords.join(', ') : 'なし'}

【メタディスクリプションのキーワード】
${metaKeywords.length > 0 ? metaKeywords.join(', ') : 'なし'}

【ロングテールキーワード候補（2-3語のフレーズ）】
${phrases.slice(0, 10).map((p, i) => `${i + 1}. ${p.phrase} (${p.count}回)`).join('\n')}
`;

  // DataForSEOデータがある場合
  if (dataforSeoData && dataforSeoData.keywords && dataforSeoData.keywords.length > 0) {
    prompt += `\n【キーワードの検索データ（DataForSEO）】\n`;
    dataforSeoData.keywords.forEach(kw => {
      if (kw.search_volume) {
        prompt += `- ${kw.keyword}: 検索ボリューム ${kw.search_volume}/月, 競合度 ${kw.competition_level}, CPC ¥${kw.cpc || 'N/A'}\n`;
      }
    });

    if (dataforSeoData.relatedKeywords && dataforSeoData.relatedKeywords.length > 0) {
      prompt += `\n【関連キーワード（DataForSEO）】\n`;
      dataforSeoData.relatedKeywords.slice(0, 10).forEach((kw, i) => {
        prompt += `${i + 1}. ${kw.keyword} (検索ボリューム: ${kw.search_volume}/月, 競合: ${kw.competition_level})\n`;
      });
    }
  }

  // 基本的な推奨事項
  if (recommendations.length > 0) {
    prompt += `\n【基本的な問題点】\n`;
    recommendations.forEach((rec, i) => {
      prompt += `${i + 1}. [${rec.priority}] ${rec.message}\n`;
    });
  }

  prompt += `

【依頼内容】
以下の観点でキーワード改善提案を行ってください：

1. **ターゲットキーワードの選定**
   - 現在の主要キーワードの評価
   - 検索ボリュームと競合度を考慮した最適なキーワード
   - 狙うべき新しいキーワード候補（3-5個）

2. **タイトルの最適化**
   - 現在のタイトルの評価
   - キーワードを効果的に含めた改善案（具体的な文言）
   - 最適な文字数（30-60文字）を考慮

3. **H1の最適化**
   - 現在のH1の評価
   - キーワードを効果的に含めた改善案（具体的な文言）

4. **メタディスクリプションの最適化**
   - 現在のメタディスクリプションの評価
   - キーワードを効果的に含めた改善案（具体的な文言）
   - 最適な文字数（120-160文字）を考慮

5. **ロングテールキーワード戦略**
   - 検索意図に合ったロングテールキーワード
   - コンテンツに追加すべきフレーズ

6. **キーワード密度の調整**
   - 過度なキーワード使用の警告
   - 自然な文章での適切な配置方法

7. **実装の優先順位**
   - 最も効果的な改善施策TOP3

**回答形式**
各項目について、具体的かつ実行可能な提案を日本語で記載してください。
改善案は必ず具体的な文言例を含めてください。
`;

  return prompt;
}

/**
 * OpenAI APIを呼び出し
 */
async function callOpenAIAPI(apiKey, extractedKeywords, dataforSeoData, parsedData) {
  const prompt = buildPrompt(extractedKeywords, dataforSeoData, parsedData);

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
          content: 'あなたはSEOとキーワード戦略の専門家です。検索ボリューム、競合度、ユーザー意図を考慮した実践的なアドバイスを提供します。'
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
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Claude APIを呼び出し
 */
async function callClaudeAPI(apiKey, extractedKeywords, dataforSeoData, parsedData) {
  const prompt = buildPrompt(extractedKeywords, dataforSeoData, parsedData);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
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
    const errorData = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Gemini APIを呼び出し
 */
async function callGeminiAPI(apiKey, extractedKeywords, dataforSeoData, parsedData) {
  const prompt = buildPrompt(extractedKeywords, dataforSeoData, parsedData);

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
          maxOutputTokens: 2000
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
