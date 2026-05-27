export default function FeaturePopup({ feature }) {
  if (!feature) return null;

  const props = feature.properties || {};
  const entries = Object.entries(props).filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--geo-border)' }}
      >
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--geo-accent)' }}>
          Feature
        </span>
        <span className="text-xs" style={{ color: 'var(--geo-dim)' }}>
          {feature.geometry?.type || ''}
        </span>
      </div>

      {/* Properties */}
      <div className="px-3 py-2 max-h-64 overflow-y-auto" style={{ fontSize: 11 }}>
        {entries.length === 0 ? (
          <p style={{ color: 'var(--geo-dim)' }} className="py-1">No properties</p>
        ) : (
          entries.map(([key, value]) => (
            <div key={key} className="flex gap-2 py-1" style={{ borderBottom: '1px solid rgba(30,37,48,0.5)' }}>
              <span className="shrink-0" style={{ color: 'var(--geo-dim)', minWidth: 90, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={key}>
                {key}
              </span>
              <span
                className="truncate"
                style={{ color: 'var(--geo-text)' }}
                title={String(value)}
              >
                {String(value)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}