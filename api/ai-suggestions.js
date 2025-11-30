const PROVIDERS = {
  openai: process.env.OPENAI_API_KEY,
  claude: process.env.CLAUDE_API_KEY,
  gemini: process.env.GEMINI_API_KEY
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { url, html, parsed, score } = request.body || {};
  if (!html) {
    response.status(400).json({ error: 'html is required' });
    return;
  }

  try {
    const message = await generateSuggestion({ url, html, parsed, score });
    response.status(200).json({ message });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: error.message || 'failed to generate suggestion' });
  }
}

async function generateSuggestion(payload) {
  const prompt = buildPrompt(payload);

  if (PROVIDERS.openai) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PROVIDERS.openai}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [
          { role: 'system', content: 'You are an SEO consultant following Google guidelines.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!res.ok) throw new Error('OpenAI API error');
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response from OpenAI';
  }

  if (PROVIDERS.claude) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PROVIDERS.claude,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 600,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!res.ok) throw new Error('Claude API error');
    const data = await res.json();
    return data.content?.[0]?.text || 'No response from Claude';
  }

  if (PROVIDERS.gemini) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${PROVIDERS.gemini}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }]}]
        })
      }
    );

    if (!res.ok) throw new Error('Gemini API error');
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
  }

  return 'APIキーが設定されていないため、AI提案を生成できません。Vercel環境変数に OPENAI_API_KEY / CLAUDE_API_KEY / GEMINI_API_KEY を設定してください。';
}

function buildPrompt({ url, parsed, score }) {
  const issues = (score?.breakdown || []).filter((item) => !item.passed);
  const issueText = issues.length
    ? issues.map((i) => `- ${i.description}`).join('\n')
    : 'No issues detected; suggest further enhancements based on best practices.';

  return `You are an SEO expert. Review the following findings for ${url || 'the page'} and provide prioritized improvements that align with Google Search Essentials.\n\nScore: ${score?.total || '-'}\nIssues:\n${issueText}\n\nKeep suggestions concise with bullet points and actionable steps.`;
}
