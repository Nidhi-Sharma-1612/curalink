import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ResearchCard from './ResearchCard';
import TrialCard from './TrialCard';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [showPubs, setShowPubs] = useState(false);
  const [showTrials, setShowTrials] = useState(false);

  const pubs = message.research?.publications || [];
  const trials = message.research?.trials || [];
  const stats = message.research?.retrievalStats;

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div style={{
          background: 'var(--accent-dim)',
          color: '#fff',
          borderRadius: '14px 14px 4px 14px',
          padding: '10px 14px',
          maxWidth: '70%',
          fontSize: '0.87rem',
          lineHeight: 1.5,
        }}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Main response */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '4px 14px 14px 14px',
        padding: '14px 16px',
        maxWidth: '88%',
      }}>
        <div className="prose" style={{ fontSize: '0.87rem' }}>
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Retrieval stats */}
        {stats && (
          <div style={{
            marginTop: 10,
            padding: '6px 10px',
            background: 'var(--surface2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <span>PubMed: {stats.pubmedFetched}</span>
            <span>OpenAlex: {stats.openalexFetched}</span>
            <span>Trials: {stats.trialsFetched}</span>
          </div>
        )}

        {/* Publications toggle */}
        {pubs.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setShowPubs(!showPubs)}
              style={toggleBtnStyle}
            >
              📄 {showPubs ? 'Hide' : 'Show'} {pubs.length} Publications
            </button>
            {showPubs && (
              <div style={{ marginTop: 8 }}>
                {pubs.map((p, i) => <ResearchCard key={p.id || i} pub={p} index={i} />)}
              </div>
            )}
          </div>
        )}

        {/* Trials toggle */}
        {trials.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <button
              onClick={() => setShowTrials(!showTrials)}
              style={toggleBtnStyle}
            >
              🧪 {showTrials ? 'Hide' : 'Show'} {trials.length} Clinical Trials
            </button>
            {showTrials && (
              <div style={{ marginTop: 8 }}>
                {trials.map((t, i) => <TrialCard key={t.nctId || i} trial={t} index={i} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const toggleBtnStyle = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
  borderRadius: 'var(--radius-sm)',
  padding: '4px 10px',
  fontSize: '0.75rem',
  cursor: 'pointer',
  marginRight: 6,
};
