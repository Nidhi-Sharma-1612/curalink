/**
 * Ranking Service
 *
 * Merges, deduplicates, scores, and returns the top N publications
 * and clinical trials from the raw retrieval results.
 *
 * Composite score formula:
 *   score = 0.5 * relevance + 0.3 * recency + 0.2 * citations
 */

const CURRENT_YEAR = new Date().getFullYear();
const BASELINE_YEAR = 2015;

/**
 * Score + rank publications, return top N.
 *
 * @param {object[]} publications  - merged array from PubMed + OpenAlex
 * @param {string[]} queryTerms    - list of keywords to score relevance against
 * @param {number} topN            - how many to return
 * @returns {object[]}
 */
function rankPublications(publications, queryTerms, topN = 8) {
  const seen = new Set();
  const unique = publications.filter((p) => {
    const key = normalizeTitle(p.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const scored = unique.map((p) => ({
    ...p,
    _score: compositeScore(p, queryTerms),
  }));

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, topN).map(({ _score, ...rest }) => rest);
}

/**
 * Score + rank clinical trials, return top N.
 *
 * @param {object[]} trials
 * @param {string[]} queryTerms
 * @param {number} topN
 * @param {string} primaryDisease  - used to penalize off-topic trials via conditions field
 * @returns {object[]}
 */
function rankTrials(trials, queryTerms, topN = 6, primaryDisease = '') {
  const seen = new Set();
  const unique = trials.filter((t) => {
    if (seen.has(t.nctId)) return false;
    seen.add(t.nctId);
    return true;
  });

  // Boost recruiting / active trials
  const statusBoost = { RECRUITING: 0.2, 'ACTIVE, NOT RECRUITING': 0.1, COMPLETED: 0.05 };

  const scored = unique.map((t) => {
    const titleText = t.title.toLowerCase();
    const bodyText = `${t.summary} ${t.conditions}`.toLowerCase();

    const titleRel = keywordRelevance(titleText, queryTerms);
    const bodyRel = keywordRelevance(bodyText, queryTerms);

    // Title match is weighted 3× — trials that only mention query terms
    // incidentally in a long summary (e.g. "lung" in a breast cancer trial)
    // won't outscore trials that are actually about the condition.
    const rel = titleRel > 0
      ? (titleRel * 3 + bodyRel) / 4
      : bodyRel * 0.25;

    const boost = statusBoost[(t.status || '').toUpperCase()] || 0;

    // If the trial has conditions populated, require all primary disease words
    // to appear in conditions — otherwise apply a 0.25× penalty to push
    // off-topic trials (e.g. breast cancer in a lung cancer query) to the bottom.
    let conditionPenalty = 1.0;
    if (primaryDisease && t.conditions && t.conditions.length > 0) {
      const condText = t.conditions.toLowerCase();
      const diseaseWords = primaryDisease.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const allMatch = diseaseWords.length > 0 && diseaseWords.every((w) => condText.includes(w));
      if (!allMatch) conditionPenalty = 0.25;
    }

    return { ...t, _score: (rel + boost) * conditionPenalty };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, topN).map(({ _score, ...rest }) => rest);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function compositeScore(pub, queryTerms) {
  const text = `${pub.title} ${pub.abstract}`.toLowerCase();
  const relevance = keywordRelevance(text, queryTerms);
  const recency = recencyScore(pub.year);
  const citations = citationScore(pub.citedByCount || 0);
  return 0.5 * relevance + 0.3 * recency + 0.2 * citations;
}

function keywordRelevance(text, terms) {
  if (!terms || terms.length === 0) return 0;
  const hits = terms.reduce((acc, term) => {
    const regex = new RegExp(term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    return acc + (text.match(regex) || []).length;
  }, 0);
  // Normalize: cap at 10 hits = score 1.0
  return Math.min(hits / 10, 1);
}

function recencyScore(year) {
  if (!year || year < BASELINE_YEAR) return 0;
  return Math.min((year - BASELINE_YEAR) / (CURRENT_YEAR - BASELINE_YEAR), 1);
}

function citationScore(count) {
  // 500+ citations = max score
  return Math.min(count / 500, 1);
}

function normalizeTitle(title = '') {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60);
}

module.exports = { rankPublications, rankTrials };
