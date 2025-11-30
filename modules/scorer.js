import guidelines from '../data/google_seo_guides.json' assert { type: 'json' };

export function scoreAudit({
  title,
  metaDescription,
  metaViewport,
  headings,
  images,
  links,
  structuredData,
  url
}) {
  const startsWithHttps = typeof url === 'string' ? url.startsWith('https://') : false;
  let total = 0;
  const breakdown = guidelines.map((rule) => {
    const context = {
      title,
      metaDescription,
      metaViewport,
      headings,
      images,
      links,
      structuredData,
      startsWithHttps
    };

    let passed = false;
    try {
      // eslint-disable-next-line no-new-func
      const evaluator = new Function(...Object.keys(context), `return ${rule.evaluate};`);
      passed = Boolean(evaluator(...Object.values(context)));
    } catch (error) {
      passed = false;
    }

    if (passed) {
      total += rule.weight;
    }

    return {
      id: rule.id,
      description: rule.description,
      weight: rule.weight,
      passed
    };
  });

  return { total, breakdown };
}
