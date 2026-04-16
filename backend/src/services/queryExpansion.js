const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Uses Ollama to expand a user query into 3 diverse search strings.
 * Falls back to simple concatenation if Ollama is unavailable.
 *
 * @param {string} query  - user's raw query
 * @param {string} disease - primary disease context
 * @param {string} location - optional location context
 * @returns {Promise<string[]>} array of 3 expanded query strings
 */
async function expandQuery(query, disease = '', location = '') {
  const diseaseClause = disease ? ` in the context of ${disease}` : '';
  const locationClause = location ? ` (location: ${location})` : '';

  const prompt = `You are a medical research query expansion expert.
Given the following user query${diseaseClause}${locationClause}, generate exactly 3 diverse and specific search queries suitable for retrieving relevant medical research publications and clinical trials.

User query: "${query}"
Primary disease: "${disease}"

Rules:
- Each query must be on its own line, prefixed with a number and period (e.g. "1. query text")
- Do NOT include explanations, just the 3 queries
- Expand abbreviations and include synonyms
- Make each query distinct — cover treatment, mechanism, and clinical aspects
- Keep each query under 15 words

Output:`;

  try {
    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 200 },
      },
      { timeout: 30000 }
    );

    const text = response.data.response || '';
    const lines = text
      .split('\n')
      .map((l) => l.replace(/^\d+\.\s*/, '').trim())
      .filter((l) => l.length > 5);

    // Return up to 3; pad with fallback if Ollama returned fewer
    const expanded = lines.slice(0, 3);
    while (expanded.length < 3) {
      expanded.push(disease ? `${query} ${disease}` : query);
    }
    return expanded;
  } catch (err) {
    console.warn('Query expansion failed, using fallback:', err.message);
    // Extract meaningful keywords by removing filler words
    const stopWords = new Set([
      'latest', 'recent', 'new', 'top', 'best', 'what', 'how', 'for',
      'the', 'and', 'or', 'in', 'of', 'a', 'an', 'is', 'are', 'with',
      'about', 'give', 'show', 'find', 'tell', 'me',
    ]);
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    const keyQuery = keywords.join(' ') || query;
    const d = disease || '';

    return [
      d ? `${d} ${keyQuery}`.trim() : keyQuery,
      d ? `${d} treatment therapy` : `${keyQuery} treatment therapy`,
      d ? `${d} clinical trials` : `${keyQuery} clinical trials`,
    ];
  }
}

module.exports = { expandQuery };
