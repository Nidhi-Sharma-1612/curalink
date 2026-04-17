const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const Session = require('../models/Session');
const { expandQuery } = require('../services/queryExpansion');
const { fetchPubMed } = require('../services/pubmedService');
const { fetchOpenAlex } = require('../services/openalexService');
const { fetchClinicalTrials } = require('../services/clinicalTrialsService');
const { rankPublications, rankTrials } = require('../services/rankingService');
const { synthesize } = require('../services/llmService');

/**
 * POST /api/chat
 * Body: { sessionId?, message, disease?, patientName?, location? }
 */
router.post('/chat', async (req, res) => {
  try {
    const {
      message,
      disease = '',
      patientName = '',
      location = '',
      sessionId: incomingSessionId,
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    // ── 1. Load or create session ──────────────────────────────────────────
    const sessionId = incomingSessionId || uuidv4();
    let session = await Session.findOne({ sessionId });

    if (!session) {
      session = new Session({
        sessionId,
        context: { patientName, disease, location },
        messages: [],
      });
    } else {
      // Update context if new structured fields provided
      if (disease) session.context.disease = disease;
      if (patientName) session.context.patientName = patientName;
      if (location) session.context.location = location;
    }

    // Resolve effective context (from session, fall back to request body)
    const effectiveDisease = session.context.disease || disease;
    const effectiveLocation = session.context.location || location;
    const effectiveName = session.context.patientName || patientName;

    // ── 2. Query expansion ─────────────────────────────────────────────────
    const recentHistory = session.messages.slice(-8); // last 4 turns for context
    console.log(`[chat] Expanding query: "${message}" | disease: ${effectiveDisease}`);
    const expandedQueries = await expandQuery(message, effectiveDisease, effectiveLocation, recentHistory);
    console.log('[chat] Expanded queries:', expandedQueries);

    // Tokenise for ranking
    const queryTerms = [
      ...new Set(
        [message, effectiveDisease, ...expandedQueries]
          .join(' ')
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3)
      ),
    ];

    // ── 3. Parallel data retrieval — run ALL 3 expanded queries ───────────
    // Each expanded query fetches independently; results are merged before ranking.
    // This gives a candidate pool of up to 300 publications + 150 trials.
    const retrievalJobs = expandedQueries.flatMap((q) => [
      fetchPubMed(q, 100),
      fetchOpenAlex(q, 100),
    ]);
    // Clinical trials fetched once per condition (avoid duplicate NCT IDs from same endpoint)
    // Pass effectiveDisease as the condition (disease name) and the query text as the term.
    // When no disease is set, condition is empty and ClinicalTrials uses query.term only.
    retrievalJobs.push(
      fetchClinicalTrials(effectiveDisease, message, effectiveLocation, 50),
      fetchClinicalTrials(effectiveDisease, expandedQueries[0] || message, effectiveLocation, 50),
    );

    const settled = await Promise.allSettled(retrievalJobs);
    const fulfilled = settled.map((r) => (r.status === 'fulfilled' ? r.value : []));

    // fulfilled layout: [pm0, oa0, pm1, oa1, pm2, oa2, trials0, trials1]
    const pubmed  = [...fulfilled[0], ...fulfilled[2], ...fulfilled[4]];
    const openalex = [...fulfilled[1], ...fulfilled[3], ...fulfilled[5]];
    const trials   = [...fulfilled[6], ...fulfilled[7]];

    console.log(`[chat] Retrieved: PubMed=${pubmed.length}, OpenAlex=${openalex.length}, Trials=${trials.length}`);

    // ── 4. Merge + rank ────────────────────────────────────────────────────
    const allPublications = [...pubmed, ...openalex];
    const topPublications = rankPublications(allPublications, queryTerms, 8);
    const topTrials = rankTrials(trials, queryTerms, 6, effectiveDisease);

    console.log(`[chat] After ranking: pubs=${topPublications.length}, trials=${topTrials.length}`);

    // ── 5. LLM synthesis ───────────────────────────────────────────────────
    const responseText = await synthesize(
      message,
      topPublications,
      topTrials,
      recentHistory,
      { disease: effectiveDisease, patientName: effectiveName, location: effectiveLocation }
    );

    // ── 6. Persist to MongoDB ──────────────────────────────────────────────
    session.messages.push({ role: 'user', content: message });
    session.messages.push({
      role: 'assistant',
      content: responseText,
      research: { publications: topPublications, trials: topTrials },
    });
    await session.save();

    // ── 7. Respond ─────────────────────────────────────────────────────────
    res.json({
      sessionId,
      message: responseText,
      research: {
        publications: topPublications,
        trials: topTrials,
        retrievalStats: {
          pubmedFetched: pubmed.length,
          openalexFetched: openalex.length,
          trialsFetched: trials.length,
          expandedQueries,
        },
      },
    });
  } catch (err) {
    console.error('[chat] Error:', err);
    res.status(500).json({ error: err.message || 'Something went wrong' });
  }
});

/**
 * GET /api/sessions/:sessionId
 * Returns full conversation history for a session.
 */
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Clears a session (start fresh).
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    await Session.deleteOne({ sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
