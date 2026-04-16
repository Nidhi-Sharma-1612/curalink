const axios = require('axios');

const BASE = 'https://api.openalex.org/works';

/**
 * Fetches up to `limit` papers from OpenAlex for a given query.
 * Pulls 2 pages of 50 sorted by relevance, then 1 page of 50 by date.
 *
 * @param {string} query
 * @param {number} limit  - total max results to return (default 100)
 * @returns {Promise<object[]>}
 */
async function fetchOpenAlex(query, limit = 100) {
  const perPage = 50;
  const pages = Math.ceil(Math.min(limit, 100) / perPage);
  const results = [];

  try {
    for (let page = 1; page <= pages; page++) {
      const res = await axios.get(BASE, {
        params: {
          search: query,
          'per-page': perPage,
          page,
          sort: 'relevance_score:desc',
          filter: 'from_publication_date:2015-01-01',
        },
        headers: { 'User-Agent': 'Curalink/1.0 (mailto:curalink@example.com)' },
        timeout: 30000,
      });

      const works = res.data?.results || [];
      results.push(...works);
      if (works.length < perPage) break; // no more pages
    }

    return results.slice(0, limit).map((w) => {
      const authors = (w.authorships || [])
        .slice(0, 5)
        .map((a) => a?.author?.display_name)
        .filter(Boolean);

      const year = w.publication_year || 0;
      const doi = w.doi ? `https://doi.org/${w.doi.replace('https://doi.org/', '')}` : null;
      const url = doi || w.id || '';

      const abstract =
        w.abstract_inverted_index
          ? rebuildAbstract(w.abstract_inverted_index)
          : 'No abstract available';

      return {
        source: 'OpenAlex',
        id: w.id || '',
        title: w.title || 'No title',
        abstract: abstract.substring(0, 800),
        authors,
        year,
        url,
        citedByCount: w.cited_by_count || 0,
      };
    });
  } catch (err) {
    console.error('OpenAlex fetch error:', err.message);
    return [];
  }
}

/**
 * Reconstructs abstract from OpenAlex inverted index format.
 * { word: [position, ...], ... }
 */
function rebuildAbstract(invertedIndex) {
  const positions = {};
  for (const [word, locs] of Object.entries(invertedIndex)) {
    for (const pos of locs) {
      positions[pos] = word;
    }
  }
  const maxPos = Math.max(...Object.keys(positions).map(Number));
  return Array.from({ length: maxPos + 1 }, (_, i) => positions[i] || '')
    .join(' ')
    .trim();
}

module.exports = { fetchOpenAlex };
