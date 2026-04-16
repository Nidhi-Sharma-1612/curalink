const axios = require('axios');
const xml2js = require('xml2js');

const ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

// NCBI requires tool + email for production requests to avoid rate limiting.
// API key is optional but raises limit from 3 req/s to 10 req/s (free at https://www.ncbi.nlm.nih.gov/account/)
const NCBI_BASE_PARAMS = {
  tool: 'curalink',
  email: process.env.NCBI_EMAIL || 'curalink@example.com',
  ...(process.env.NCBI_API_KEY ? { api_key: process.env.NCBI_API_KEY } : {}),
};

/**
 * Fetches up to `limit` PubMed articles for a given query.
 * Performs esearch (get IDs) then efetch (get full XML).
 *
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
async function fetchPubMed(query, limit = 100) {
  try {
    // Step 1 — get IDs
    const searchRes = await axios.get(ESEARCH, {
      params: {
        ...NCBI_BASE_PARAMS,
        db: 'pubmed',
        term: query,
        retmax: limit,
        sort: 'pub date',
        retmode: 'json',
      },
      timeout: 30000,
    });

    const ids = searchRes.data?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Step 2 — fetch details (batch in groups of 100)
    const batchIds = ids.slice(0, 100).join(',');
    const fetchRes = await axios.get(EFETCH, {
      params: { ...NCBI_BASE_PARAMS, db: 'pubmed', id: batchIds, retmode: 'xml' },
      timeout: 40000,
    });

    const parsed = await xml2js.parseStringPromise(fetchRes.data, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    const articles = parsed?.PubmedArticleSet?.PubmedArticle;
    if (!articles) return [];

    const list = Array.isArray(articles) ? articles : [articles];

    return list.map((item) => {
      const medline = item?.MedlineCitation;
      const article = medline?.Article;
      const pmid = medline?.PMID || '';
      const title = article?.ArticleTitle || 'No title';
      const abstract =
        typeof article?.Abstract?.AbstractText === 'string'
          ? article.Abstract.AbstractText
          : article?.Abstract?.AbstractText?._ || 'No abstract available';

      // Authors
      const authorList = article?.AuthorList?.Author;
      let authors = [];
      if (authorList) {
        const arr = Array.isArray(authorList) ? authorList : [authorList];
        authors = arr
          .slice(0, 5)
          .map((a) => `${a.LastName || ''} ${a.ForeName || ''}`.trim())
          .filter(Boolean);
      }

      // Year
      const pubDate = article?.Journal?.JournalIssue?.PubDate;
      const year = pubDate?.Year || pubDate?.MedlineDate?.substring(0, 4) || '';

      return {
        source: 'PubMed',
        id: String(pmid),
        title: String(title),
        abstract: String(abstract).substring(0, 800),
        authors,
        year: Number(year) || 0,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        citedByCount: 0, // PubMed doesn't expose this directly
      };
    });
  } catch (err) {
    console.error('PubMed fetch error:', err.message);
    return [];
  }
}

module.exports = { fetchPubMed };
