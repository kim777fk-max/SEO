export function parseHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const title = doc.querySelector('title')?.textContent?.trim() || '';
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
  const metaViewport = !!doc.querySelector('meta[name="viewport"]');

  const headings = {
    h1: Array.from(doc.querySelectorAll('h1')).map((el) => el.textContent.trim()).filter(Boolean),
    h2: Array.from(doc.querySelectorAll('h2')).map((el) => el.textContent.trim()).filter(Boolean),
    h3: Array.from(doc.querySelectorAll('h3')).map((el) => el.textContent.trim()).filter(Boolean),
    h4: Array.from(doc.querySelectorAll('h4')).map((el) => el.textContent.trim()).filter(Boolean)
  };

  const images = Array.from(doc.querySelectorAll('img'));
  const imageStats = {
    total: images.length,
    withAlt: images.filter((img) => Boolean(img.getAttribute('alt'))).length
  };

  const links = Array.from(doc.querySelectorAll('a'));
  const linkStats = {
    total: links.length,
    withDescriptiveText: links.filter((link) => (link.textContent || '').trim().length >= 4).length,
    nofollow: links.filter((link) => (link.getAttribute('rel') || '').includes('nofollow')).length
  };

  const structuredData = extractStructuredData(doc);

  return {
    title,
    metaDescription,
    metaViewport,
    headings,
    images: imageStats,
    links: linkStats,
    structuredData
  };
}

function extractStructuredData(doc) {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  const items = [];
  let valid = false;

  scripts.forEach((script) => {
    try {
      const json = JSON.parse(script.textContent);
      if (json['@type'] || json['@context']) {
        valid = true;
      }
      items.push(json);
    } catch (error) {
      items.push({ error: 'Invalid JSON-LD', message: error.message });
    }
  });

  return { valid, items };
}
