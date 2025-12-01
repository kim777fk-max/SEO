/**
 * DataForSEO API連携
 * キーワードの検索ボリューム、競合度、関連キーワードを取得
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
    const { keywords, location = 'Japan', language = 'ja' } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'キーワードを指定してください（配列形式）' });
    }

    // DataForSEO認証情報
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      console.warn('DataForSEO API credentials not found');
      return res.status(200).json({
        warning: 'DataForSEO APIの認証情報が設定されていません',
        keywords: keywords.map(kw => ({
          keyword: kw,
          search_volume: null,
          competition: null,
          cpc: null,
          trend: null
        })),
        relatedKeywords: []
      });
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    // キーワードデータを取得（検索ボリューム、CPC、競合度）
    console.log('Fetching keyword data from DataForSEO...');
    const keywordData = await getKeywordData(keywords, location, language, auth);

    // 関連キーワードを取得（最初のキーワードのみ）
    console.log('Fetching related keywords from DataForSEO...');
    const relatedKeywords = await getRelatedKeywords(keywords[0], location, language, auth);

    res.status(200).json({
      keywords: keywordData,
      relatedKeywords: relatedKeywords,
      location: location,
      language: language
    });

  } catch (error) {
    console.error('DataForSEO API error:', error);
    res.status(500).json({
      error: 'DataForSEO APIエラー',
      message: error.message
    });
  }
}

/**
 * キーワードデータを取得（検索ボリューム、CPC、競合度）
 */
async function getKeywordData(keywords, location, language, auth) {
  const url = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';

  // DataForSEOのロケーションコード（日本=2392）
  const locationCode = getLocationCode(location);

  const requestBody = [{
    keywords: keywords.slice(0, 10), // 最大10個まで
    location_code: locationCode,
    language_code: language === 'ja' ? 'ja' : 'en',
    search_partners: false,
    date_from: getDateOneYearAgo(),
    date_to: getCurrentDate()
  }];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DataForSEO error:', response.status, errorText);
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    // レスポンスをパース
    if (data.tasks && data.tasks[0] && data.tasks[0].result) {
      return data.tasks[0].result.map(item => ({
        keyword: item.keyword,
        search_volume: item.search_volume,
        competition: item.competition,
        competition_level: getCompetitionLevel(item.competition),
        cpc: item.cpc,
        trend: item.monthly_searches ? item.monthly_searches.slice(-3) : null // 直近3ヶ月
      }));
    }

    return keywords.map(kw => ({
      keyword: kw,
      search_volume: null,
      competition: null,
      cpc: null,
      trend: null
    }));

  } catch (error) {
    console.error('Error fetching keyword data:', error);
    // エラー時は空データを返す
    return keywords.map(kw => ({
      keyword: kw,
      search_volume: null,
      competition: null,
      cpc: null,
      trend: null,
      error: error.message
    }));
  }
}

/**
 * 関連キーワードを取得
 */
async function getRelatedKeywords(keyword, location, language, auth) {
  const url = 'https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live';

  const locationCode = getLocationCode(location);

  const requestBody = [{
    keywords: [keyword],
    location_code: locationCode,
    language_code: language === 'ja' ? 'ja' : 'en',
    include_seed_keyword: false,
    sort_by: 'search_volume',
    limit: 20 // 上位20個
  }];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('DataForSEO related keywords error:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.tasks && data.tasks[0] && data.tasks[0].result) {
      return data.tasks[0].result
        .slice(0, 15)
        .map(item => ({
          keyword: item.keyword,
          search_volume: item.search_volume,
          competition: item.competition,
          competition_level: getCompetitionLevel(item.competition),
          cpc: item.cpc
        }));
    }

    return [];

  } catch (error) {
    console.error('Error fetching related keywords:', error);
    return [];
  }
}

/**
 * ロケーションコードを取得
 */
function getLocationCode(location) {
  const locationMap = {
    'Japan': 2392,
    'United States': 2840,
    'United Kingdom': 2826,
    'Canada': 2124,
    'Australia': 2036
  };
  return locationMap[location] || 2392; // デフォルトは日本
}

/**
 * 競合度のレベルを取得
 */
function getCompetitionLevel(competition) {
  if (!competition) return 'unknown';
  if (competition < 0.33) return 'low';
  if (competition < 0.66) return 'medium';
  return 'high';
}

/**
 * 1年前の日付を取得（YYYY-MM-DD形式）
 */
function getDateOneYearAgo() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * 現在の日付を取得（YYYY-MM-DD形式）
 */
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}
