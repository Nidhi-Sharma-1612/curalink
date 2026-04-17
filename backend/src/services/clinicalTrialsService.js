const axios = require('axios');

const BASE = 'https://clinicaltrials.gov/api/v2/studies';

/**
 * Fetches clinical trials from ClinicalTrials.gov v2 API.
 *
 * @param {string} condition  - disease / condition query
 * @param {string} query      - additional search terms
 * @param {string} location   - optional location filter
 * @param {number} limit      - max results (default 50)
 * @returns {Promise<object[]>}
 */
async function fetchClinicalTrials(condition, query = '', location = '', limit = 50) {
  try {
    const params = {
      pageSize: Math.min(limit, 100),
      format: 'json',
    };

    // query.cond is for disease/condition names (e.g. "lung cancer") — not full sentences.
    // query.term is a general keyword search — use it when condition is absent.
    if (condition) {
      params['query.cond'] = condition;
    }
    if (query) {
      params['query.term'] = query;
    }
    if (!condition && !query) return [];

    if (location) {
      params['query.locn'] = location;
    }

    const res = await axios.get(BASE, { params, timeout: 30000 });
    const studies = res.data?.studies || [];

    return studies.map((s) => {
      const p = s.protocolSection || {};
      const id = p.identificationModule || {};
      const status = p.statusModule || {};
      const desc = p.descriptionModule || {};
      const eligibility = p.eligibilityModule || {};
      const contacts = p.contactsLocationsModule || {};
      const condModule = p.conditionsModule || {};

      const nctId = id.nctId || '';
      const locations = (contacts.locations || []).slice(0, 3).map((l) => ({
        facility: l.facility || '',
        city: l.city || '',
        country: l.country || '',
      }));

      const centralContacts = (contacts.centralContacts || []).slice(0, 2).map((c) => ({
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
      }));

      return {
        source: 'ClinicalTrials.gov',
        nctId,
        title: id.briefTitle || 'No title',
        status: status.overallStatus || 'Unknown',
        summary: desc.briefSummary || '',
        eligibility: eligibility.eligibilityCriteria || '',
        phase: (p.designModule?.phases || []).join(', ') || 'N/A',
        studyType: p.designModule?.studyType || '',
        startDate: status.startDateStruct?.date || '',
        completionDate: status.completionDateStruct?.date || '',
        conditions: (condModule.conditions || []).join(', '),
        locations,
        contacts: centralContacts,
        url: `https://clinicaltrials.gov/study/${nctId}`,
      };
    });
  } catch (err) {
    console.error('ClinicalTrials fetch error:', err.message);
    return [];
  }
}

module.exports = { fetchClinicalTrials };
