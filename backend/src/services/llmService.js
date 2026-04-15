const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Calls Ollama to synthesize a structured medical research response.
 *
 * @param {string}   userMessage      - current user query
 * @param {object[]} publications     - top-ranked publications
 * @param {object[]} trials           - top-ranked clinical trials
 * @param {object[]} history          - last N conversation turns [{role, content}]
 * @param {object}   context          - { disease, patientName, location }
 * @returns {Promise<string>}         - the assistant's response text
 */
async function synthesize(userMessage, publications, trials, history = [], context = {}) {
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
    .slice(-6) // last 3 turns (user + assistant pairs)
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

  try {
    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 1500,
          top_p: 0.9,
        },
      },
      { timeout: 120000 } // LLM can take time
    );

    return response.data.response || 'Unable to generate a response at this time.';
  } catch (err) {
    console.error('LLM synthesis error:', err.message);
    return generateFallbackResponse(userMessage, publications, trials, disease);
  }
}

/**
 * Simple fallback when Ollama is unreachable — structured text built from raw data.
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
