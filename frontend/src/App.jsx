import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatWindow from './components/ChatWindow';
import InputPanel from './components/InputPanel';
import { sendMessage } from './services/api';
import './index.css';

const SESSION_KEY = 'curalink_session_id';

export default function App() {
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem(SESSION_KEY) || uuidv4();
  });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = useCallback(async ({ message, disease, patientName, location }) => {
    if (loading) return;
    setError(null);

    // Optimistically add user message
    const userMsg = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await sendMessage({ sessionId, message, disease, patientName, location });

      // Persist session ID
      localStorage.setItem(SESSION_KEY, data.sessionId);
      if (data.sessionId !== sessionId) setSessionId(data.sessionId);

      const assistantMsg = {
        role: 'assistant',
        content: data.message,
        research: data.research,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Something went wrong');
      // Remove the optimistic user message on failure
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [sessionId, loading]);

  function handleNewSession() {
    const newId = uuidv4();
    setSessionId(newId);
    localStorage.setItem(SESSION_KEY, newId);
    setMessages([]);
    setError(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>🔬</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Curalink</span>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '1px 8px',
          }}>
            AI Medical Research Assistant
          </span>
        </div>
        <button
          onClick={handleNewSession}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 12px',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          + New Chat
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div style={{
          background: '#7f1d1d',
          color: '#fca5a5',
          padding: '8px 20px',
          fontSize: '0.82rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>⚠ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '1rem' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Chat area */}
      <ChatWindow messages={messages} loading={loading} />

      {/* Input */}
      <InputPanel onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
