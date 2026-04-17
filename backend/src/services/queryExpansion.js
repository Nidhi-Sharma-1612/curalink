const axios = require('axios');

const OLLAMA_URL  = process.env.OLLAMA_URL  || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile';

/**
 * Build the expansion prompt including recent conversation history so
 * follow-up queries ("Can I take Vitamin D?") are expanded in context
 * ("vitamin D supplementation lung cancer", etc.).
 */
function buildPrompt(query, disease, location, history) {
  const diseaseClause  = disease  ? ` in the context of ${disease}`  : '';
  const locationClause = location ? ` (location: ${location})` : '';

  const historyText = history.length > 0
    ? `\nConversation context (most recent):\n${history
        .slice(-4)
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 200)}`)
        .join('\n')}\n`
    : '';

  return `You are a medical research query expansion expert.
Given the following user query${diseaseClause}${locationClause}, generate exactly 3 diverse and specific search queries suitable for retrieving relevant medical research publications and clinical trials.
${historyText}
User query: "${query}"
Primary disease: "${disease || 'unknown — infer from conversation context above'}"

Rules:
- Each query must be on its own line, prefixed with a number and period (e.g. "1. query text")
- Do NOT include explanations, just the 3 queries
- Use the conversation context to infer the disease/condition if not explicitly stated
- Expand abbreviations and include synonyms
- Make each query distinct — cover treatment, mechanism, and clinical aspects
- Keep each query under 15 words

Output:`;
}

/**
 * Parse numbered lines from LLM output into a clean string array.
 */
function parseLines(text) {
  return text
    .split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter((l) => l.length > 5);
}

/**
 * Keyword-only fallback — used only when both Ollama and Groq are unavailable.
 */
function keywordFallback(query, disease) {
  const stopWords = new Set([
    'latest', 'recent', 'new', 'top', 'best', 'what', 'how', 'for',
    'the', 'and', 'or', 'in', 'of', 'a', 'an', 'i', 'is', 'are', 'with',
    'about', 'give', 'show', 'find', 'tell', 'me', 'can', 'should', 'take',
  ]);
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
  const keyQuery = keywords.join(' ') || query;
  const d = disease || '';

  return [
    d ? `${d} ${keyQuery}`.trim() : keyQuery,
    d ? `${d} treatment therapy` : `${keyQuery} treatment therapy`,
    d ? `${d} clinical trials` : `${keyQuery} clinical trials`,
  ];
}

/**
 * Expand a user query into 3 search strings.
 * Priority: Ollama → Groq → keyword fallback
 *
 * @param {string}   query    - user's raw message
 * @param {string}   disease  - primary disease (may be empty for NL mode)
 * @param {string}   location - optional location
 * @param {object[]} history  - recent session messages for context
 * @returns {Promise<string[]>} 3 expanded query strings
 */
async function expandQuery(query, disease = '', location = '', history = []) {
  const prompt = buildPrompt(query, disease, location, history);

  // ── Tier 1: Ollama ──────────────────────────────────────────────────────────
  try {
    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      { model: OLLAMA_MODEL, prompt, stream: false, options: { temperature: 0.3, num_predict: 200 } },
      { timeout: 30000 }
    );
    const lines = parseLines(response.data.response || '');
    if (lines.length > 0) {
      const expanded = lines.slice(0, 3);
      while (expanded.length < 3) expanded.push(disease ? `${query} ${disease}` : query);
      console.log('[queryExpansion] Expanded via Ollama');
      return expanded;
    }
  } catch (err) {
    console.warn('[queryExpansion] Ollama unavailable:', err.message);
  }

  // ── Tier 2: Groq ────────────────────────────────────────────────────────────
  if (GROQ_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
        },
        {
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          timeout: 20000,
        }
      );
      const text = response.data?.choices?.[0]?.message?.content || '';
      const lines = parseLines(text);
      if (lines.length > 0) {
        const expanded = lines.slice(0, 3);
        while (expanded.length < 3) expanded.push(disease ? `${query} ${disease}` : query);
        console.log('[queryExpansion] Expanded via Groq');
        return expanded;
      }
    } catch (err) {
      console.warn('[queryExpansion] Groq unavailable:', err.message);
    }
  }

  // ── Tier 3: Keyword fallback ────────────────────────────────────────────────
  console.warn('[queryExpansion] Using keyword fallback');
  return keywordFallback(query, disease);
}

module.exports = { expandQuery };
