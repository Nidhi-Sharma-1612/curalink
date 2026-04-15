import { useState } from 'react';

const ELIGIBILITY_PREVIEW_CHARS = 300;

const STATUS_COLORS = {
  RECRUITING: 'var(--green)',
  'ACTIVE, NOT RECRUITING': 'var(--yellow)',
  COMPLETED: 'var(--text-muted)',
  TERMINATED: 'var(--red)',
  UNKNOWN: 'var(--text-muted)',
};

export default function TrialCard({ trial, index }) {
  const [showEligibility, setShowEligibility] = useState(false);
  const statusColor = STATUS_COLORS[(trial.status || '').toUpperCase()] || 'var(--text-muted)';
  const loc = trial.locations?.[0];
  const contact = trial.contacts?.[0];
  const eligibility = (trial.eligibility || '').trim();

  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid var(--trial)`,
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <a
          href={trial.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.4 }}
        >
          [T{index + 1}] {trial.title}
        </a>
        <span style={{
          color: statusColor,
          fontSize: '0.68rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          border: `1px solid ${statusColor}`,
          padding: '1px 6px',
          borderRadius: 10,
          flexShrink: 0,
        }}>
          {trial.status}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4 }}>
        {trial.phase && trial.phase !== 'N/A' && <span>Phase: {trial.phase}</span>}
        {trial.studyType && <span>Type: {trial.studyType}</span>}
        {trial.nctId && <span style={{ color: 'var(--accent)' }}>{trial.nctId}</span>}
      </div>

      {trial.summary && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: 4 }}>
          {trial.summary.substring(0, 200)}…
        </p>
      )}

      {/* Eligibility criteria */}
      {eligibility && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={() => setShowEligibility(!showEligibility)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '0.73rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {showEligibility ? '▲ Hide' : '▼ Show'} Eligibility Criteria
          </button>
          {showEligibility && (
            <div style={{
              marginTop: 5,
              padding: '7px 10px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {eligibility.length > ELIGIBILITY_PREVIEW_CHARS
                ? eligibility.substring(0, ELIGIBILITY_PREVIEW_CHARS) + '…'
                : eligibility}
            </div>
          )}
        </div>
      )}

      {(loc || contact) && (
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 5, marginTop: 6 }}>
          {loc && <div>📍 {[loc.facility, loc.city, loc.country].filter(Boolean).join(', ')}</div>}
          {contact && contact.name && <div>👤 {contact.name}{contact.email ? ` · ${contact.email}` : ''}</div>}
        </div>
      )}
    </div>
  );
}
