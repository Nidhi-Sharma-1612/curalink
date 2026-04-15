import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatWindow({ messages, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (messages.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        gap: 12,
        padding: 32,
      }}>
        <div style={{ fontSize: '3rem' }}>🔬</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>Curalink</div>
        <div style={{ fontSize: '0.88rem', textAlign: 'center', maxWidth: 480 }}>
          Your AI medical research assistant. Ask about diseases, treatments, clinical trials, or recent studies.
          I retrieve real publications from PubMed and OpenAlex, and live clinical trials from ClinicalTrials.gov.
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <Pill color="var(--pubmed)">PubMed</Pill>
          <Pill color="var(--openalex)">OpenAlex</Pill>
          <Pill color="var(--trial)">ClinicalTrials.gov</Pill>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>
          <LoadingDots />
          Retrieving research from PubMed, OpenAlex & ClinicalTrials.gov…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{
      background: color + '22',
      border: `1px solid ${color}`,
      color,
      borderRadius: 20,
      padding: '2px 10px',
      fontSize: '0.75rem',
      fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100% { transform:scale(0.6); opacity:0.4; } 40% { transform:scale(1); opacity:1; } }`}</style>
    </span>
  );
}
