import { useState } from 'react';

const EXAMPLE_QUERIES = [
  'Latest treatment for lung cancer',
  'Clinical trials for diabetes',
  'Top researchers in Alzheimer\'s disease',
  'Recent studies on heart disease',
  'Deep brain stimulation for Parkinson\'s',
];

export default function InputPanel({ onSubmit, loading, disabled }) {
  const [mode, setMode] = useState('natural'); // 'natural' | 'structured'
  const [message, setMessage] = useState('');
  const [disease, setDisease] = useState('');
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text || loading) return;
    onSubmit({ message: text, disease, patientName, location });
    setMessage('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div style={{
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      padding: '12px 16px',
    }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {['natural', 'structured'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: '1px solid var(--border)',
              background: mode === m ? 'var(--accent)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: mode === m ? 600 : 400,
            }}
          >
            {m === 'natural' ? '💬 Natural Language' : '📋 Structured Input'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Structured fields */}
        {mode === 'structured' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <input
              placeholder="Patient name (optional)"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Disease / Condition *"
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        {/* Message input */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'structured'
                ? 'Enter your specific query (e.g. "deep brain stimulation")…'
                : 'Ask anything about medical research… (e.g. "Latest treatments for lung cancer")'
            }
            disabled={disabled || loading}
            rows={2}
            style={{
              ...inputStyle,
              flex: 1,
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
          <button
            type="submit"
            disabled={!message.trim() || loading || disabled}
            style={{
              background: loading ? 'var(--surface2)' : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '0 18px',
              height: 52,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s',
            }}
          >
            {loading ? '⏳ Searching…' : '🔍 Research'}
          </button>
        </div>
      </form>

      {/* Example queries */}
      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => { setMessage(q); }}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  padding: '8px 12px',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
};
