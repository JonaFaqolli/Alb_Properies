import { useState } from 'react';

const HEADER_KEYS = new Set(['title', 'price', 'status', 'reference', 'images', 'property_url']);

export default function PropertyPopup({ feature }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  if (!feature) return null;

  const p = feature.properties || {};
  const images = Array.isArray(p.images) ? p.images : [];

  const prev = () => { setImgIdx((i) => (i - 1 + images.length) % images.length); setImgError(false); };
  const next = () => { setImgIdx((i) => (i + 1) % images.length); setImgError(false); };

  // All remaining props not shown in the header
  const extraEntries = Object.entries(p).filter(
    ([k, v]) => !HEADER_KEYS.has(k) && v !== null && v !== undefined && v !== ''
  );

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', width: 300 }}>

      {/* Image carousel */}
      <div style={{ position: 'relative', height: 160, background: '#0a0c0f', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {images.length === 0 || imgError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--geo-dim)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9l4-4 4 4 4-5 4 5" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
            <span style={{ fontSize: 10 }}>Image unavailable</span>
          </div>
        ) : (
          <img
            key={imgIdx}
            src={images[imgIdx]}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        )}
        {images.length > 1 && !imgError && (
          <>
            <button onClick={prev} style={navBtn('left')}>‹</button>
            <button onClick={next} style={navBtn('right')}>›</button>
            <span style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 10, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: 3 }}>
              {imgIdx + 1}/{images.length}
            </span>
          </>
        )}
      </div>

      {/* Header: reference + status */}
      <div style={{ padding: '8px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--geo-dim)' }}>{p.reference}</span>
        {p.status && (
          <span style={{ fontSize: 10, background: 'rgba(0,229,160,0.1)', color: 'var(--geo-accent)', border: '1px solid rgba(0,229,160,0.2)', padding: '1px 7px', borderRadius: 3 }}>
            {p.status}
          </span>
        )}
      </div>

      {/* Title */}
      {p.title && (
        <div style={{ padding: '5px 12px 0', fontSize: 12, color: 'var(--geo-text)', fontWeight: 600, lineHeight: 1.4, maxHeight: 160, overflowY: 'auto' }}>
          {p.title}
        </div>
      )}

      {/* Price */}
      {p.price && (
        <div style={{ padding: '4px 12px 0', fontSize: 14, color: '#f59e0b', fontWeight: 700 }}>
          {p.price}
        </div>
      )}

      {/* All other properties */}
      {extraEntries.length > 0 && (
        <div style={{ margin: '6px 12px 0', borderTop: '1px solid var(--geo-border)' }} />
      )}
      <div style={{ padding: '0 12px', maxHeight: 180, overflowY: 'auto', fontSize: 11 }}>
        {extraEntries.map(([key, value]) => (
          <div key={key} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(30,37,48,0.5)' }}>
            <span style={{ color: 'var(--geo-dim)', minWidth: 90, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={key}>
              {key}
            </span>
            <span style={{ color: 'var(--geo-text)', wordBreak: 'break-word' }}>
              {String(value)}
            </span>
          </div>
        ))}
      </div>

      {/* View listing */}
      {p.property_url && (
        <div style={{ padding: '8px 12px' }}>
          <a
            href={p.property_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center', fontSize: 11,
              padding: '5px 0', borderRadius: 4, textDecoration: 'none',
              background: 'rgba(0,229,160,0.1)', color: 'var(--geo-accent)',
              border: '1px solid rgba(0,229,160,0.2)',
            }}
          >
            View listing →
          </a>
        </div>
      )}
    </div>
  );
}

function navBtn(side) {
  return {
    position: 'absolute', [side]: 6, top: '50%', transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none',
    borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 16, zIndex: 1,
  };
}
