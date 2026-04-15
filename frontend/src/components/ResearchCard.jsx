export default function ResearchCard({ pub, index }) {
  const sourceColor = pub.source === 'PubMed' ? 'var(--pubmed)' : 'var(--openalex)';

  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          background: sourceColor,
          color: '#fff',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          marginTop: 2,
          flexShrink: 0,
        }}>
          {pub.source}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a
            href={pub.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--text)',
              fontWeight: 600,
              fontSize: '0.82rem',
              lineHeight: 1.4,
              display: 'block',
              marginBottom: 3,
            }}
          >
            [{index + 1}] {pub.title}
          </a>
          {pub.authors?.length > 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 3 }}>
              {pub.authors.slice(0, 3).join(', ')}{pub.authors.length > 3 ? ' et al.' : ''}{pub.year ? ` · ${pub.year}` : ''}
            </div>
          )}
          {pub.abstract && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
              {pub.abstract.substring(0, 180)}…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
