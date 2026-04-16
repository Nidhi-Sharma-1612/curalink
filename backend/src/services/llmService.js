const axios = require('axios');

const OLLAMA_URL  = process.env.OLLAMA_URL  || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || '';
const HF_MODEL = process.env.HUGGINGFACE_MODEL || 'google/gemma-4-E4B-it';

/**
 * Builds the shared system + user prompts used by all LLM backends.
 */
function buildPrompts(userMessage, publications, trials, history, context) {
  const { disease = '', patientName = '', location = '' } = context;

  const pubContext = publications
    .slice(0, 8)
    .map(
      (p, i) =>
        `[P${i + 1}] "${p.title}" (${p.source}, ${p.year})
Authors: ${p.authors.slice(0, 3).join(', ')}
Abstract: ${p.abstract.substring(0, 300)}
URL: ${p.url}`
    )
    .join('\n\n');

  const trialContext = trials
    .slice(0, 6)
    .map(
      (t, i) =>
        `[T${i + 1}] "${t.title}" (${t.nctId})
Status: ${t.status} | Phase: ${t.phase}
Summary: ${t.summary.substring(0, 250)}
URL: ${t.url}`
    )
    .join('\n\n');

  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 400)}`)
    .join('\n');

  const systemPrompt = `You are Curalink, an expert AI medical research assistant.
You provide structured, evidence-based insights grounded in real research publications and clinical trials.
You always cite the specific publications and trials you reference using their reference numbers.
You never fabricate data or make up study results.
Include a disclaimer that responses are for informational purposes and not medical advice.

Patient context:${patientName ? ` Patient: ${patientName}.` : ''}${disease ? ` Primary condition: ${disease}.` : ''}${location ? ` Location: ${location}.` : ''}`;

  const userPrompt = `${historyText ? `Conversation history:\n${historyText}\n\n` : ''}Current question: ${userMessage}

---
RESEARCH PUBLICATIONS (use these as your evidence base):
${pubContext || 'No publications retrieved.'}

---
CLINICAL TRIALS:
${trialContext || 'No clinical trials retrieved.'}

---
Based on the above research, provide a comprehensive, structured response with these exact sections:

## Condition Overview
(2-3 sentences summarizing the condition/topic in the context of the question)

## Research Insights
(4-6 bullet points citing specific publications with [P1], [P2] etc. references)

## Clinical Trials
(Brief summary of relevant trials with status and [T1], [T2] references — skip if none relevant)

## Source Attribution
(List each cited publication/trial: Title | Authors | Year | Source | URL | Key finding)

## Disclaimer
(One line: for informational purposes only, not medical advice)`;

  return { systemPrompt, userPrompt };
}

/**
 * Tier 1: Ollama (local).
 */
async function callOllama(systemPrompt, userPrompt) {
  const response = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model: OLLAMA_MODEL,
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      stream: false,
      options: { temperature: 0.2, num_predict: 1500, top_p: 0.9 },
    },
    { timeout: 120000 }
  );
  const text = response.data.response || '';
  if (!text.trim()) throw new Error('Ollama returned empty response');
  return text;
}

/**
 * Tier 2: Hugging Face Inference API (free serverless).
 * Uses OpenAI-compatible chat completions endpoint (required for Gemma 4 and other modern models).
 */
async function callHuggingFace(systemPrompt, userPrompt) {
  if (!HF_TOKEN) throw new Error('HUGGINGFACE_TOKEN not set');

  const response = await axios.post(
    `https://api-inference.huggingface.co/models/${HF_MODEL}/v1/chat/completions`,
    {
      model: HF_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 90000,
    }
  );

  // Chat completions format: choices[0].message.content
  const text = response.data?.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error('HuggingFace returned empty response');
  return text;
}

/**
 * Main entry point.
 * Priority: Ollama → HuggingFace → static fallback
 *
 * @param {string}   userMessage
 * @param {object[]} publications
 * @param {object[]} trials
 * @param {object[]} history
 * @param {object}   context      - { disease, patientName, location }
 * @returns {Promise<string>}
 */
async function synthesize(userMessage, publications, trials, history = [], context = {}) {
  const { systemPrompt, userPrompt } = buildPrompts(userMessage, publications, trials, history, context);

  // ── Tier 1: Ollama ─────────────────────────────────────────────────────────
  try {
    const text = await callOllama(systemPrompt, userPrompt);
    console.log('[llm] Response from Ollama');
    return text;
  } catch (err) {
    console.warn('[llm] Ollama unavailable:', err.message);
  }

  // ── Tier 2: HuggingFace ────────────────────────────────────────────────────
  try {
    const text = await callHuggingFace(systemPrompt, userPrompt);
    console.log('[llm] Response from HuggingFace');
    return text;
  } catch (err) {
    console.warn('[llm] HuggingFace unavailable:', err.message);
  }

  // ── Tier 3: Static fallback ────────────────────────────────────────────────
  console.warn('[llm] Using static fallback response');
  return generateFallbackResponse(userMessage, publications, trials, context.disease);
}

/**
 * Static fallback — structured response built directly from ranked data.
 * Used only when both Ollama and HuggingFace are unreachable.
 */
function generateFallbackResponse(query, publications, trials, disease) {
  const pubList = publications
    .slice(0, 5)
    .map(
      (p, i) =>
        `- [P${i + 1}] **${p.title}** (${p.source}, ${p.year}) — ${p.abstract.substring(0, 150)}... [Read more](${p.url})`
    )
    .join('\n');

  const trialList = trials
    .slice(0, 3)
    .map(
      (t, i) =>
        `- [T${i + 1}] **${t.title}** | Status: ${t.status} | [View trial](${t.url})`
    )
    .join('\n');

  const attributionList = publications
    .slice(0, 5)
    .map(
      (p, i) =>
        `- [P${i + 1}] **${p.title}** | ${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' et al.' : ''} | ${p.year || 'N/A'} | ${p.source} | [${p.url}](${p.url})`
    )
    .join('\n');

  return `## Condition Overview
Here is a summary of current research related to "${query}"${disease ? ` and ${disease}` : ''}.

## Research Insights
${pubList || 'No publications available.'}

## Clinical Trials
${trialList || 'No clinical trials found.'}

## Source Attribution
${attributionList || 'No sources available.'}

## Disclaimer
This information is for research and educational purposes only. It is not medical advice. Consult a qualified healthcare professional for medical decisions.`;
}

module.exports = { synthesize };
