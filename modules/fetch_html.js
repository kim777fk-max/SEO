export async function fetchHtml(url) {
  if (!url) {
    throw new Error('URL is required');
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit/1.0)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HTML: ${response.status}`);
  }

  return response.text();
}
