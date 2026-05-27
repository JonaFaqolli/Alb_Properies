const LAYER_COLORS = [
  '#00e5a0', '#0066ff', '#ff6b35', '#f7c948',
  '#c77dff', '#ff4d6d', '#4cc9f0', '#80ffdb',
];

export function getLayerColor(index) {
  return LAYER_COLORS[index % LAYER_COLORS.length];
}

export default function LayerPanel({ layers, onToggle, onLoad, activeFile }) {
  if (!activeFile || layers.length === 0) return null;

  return (
    <div className="panel-in" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--geo-border)' }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--geo-dim)' }}>
          Layers
        </p>
        <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--geo-text)' }}>
          {activeFile.name}
        </p>
      </div>

      {/* Layer list */}
      <div className="py-1 overflow-y-auto" style={{ maxHeight: '320px' }}>
        {layers.map((layer, i) => {
          const color = getLayerColor(i);
          const isLoaded = !!layer.geojson;
          const featureCount = layer.geojson?.features?.length ?? null;

          return (
            <div
              key={layer.name}
              className="flex items-center gap-2 px-3 py-2 group transition-all cursor-pointer"
              style={{
                opacity: layer.visible ? 1 : 0.45,
                borderLeft: layer.visible ? `2px solid ${color}` : '2px solid transparent',
              }}
            >
              {/* Visibility toggle */}
              <button
                onClick={() => onToggle(layer.name)}
                className="shrink-0 w-4 h-4 rounded-sm border flex items-center justify-center transition-all"
                style={{
                  background: layer.visible ? color : 'transparent',
                  borderColor: layer.visible ? color : 'var(--geo-muted)',
                }}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                {layer.visible && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4l2 2 4-3" stroke="#0a0c0f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Layer name */}
              <span className="flex-1 text-xs truncate" style={{ color: 'var(--geo-text)' }} title={layer.name}>
                {layer.name}
              </span>

              {/* Status / Load button */}
              <div className="shrink-0">
                {layer.loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg
                      width="12" height="12" viewBox="0 0 12 12"
                      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
                    >
                      <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--geo-border)" strokeWidth="1.5" />
                      <path d="M6 1.5A4.5 4.5 0 0 1 10.5 6" fill="none" stroke="var(--geo-accent)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-xs" style={{ color: 'var(--geo-accent)' }}>Loading</span>
                  </span>
                ) : isLoaded ? (
                  <span className="text-xs" style={{ color: 'var(--geo-dim)' }}>
                    {featureCount ?? 0}
                  </span>
                ) : (
                  <button
                    onClick={() => onLoad(layer.name)}
                    className="text-xs px-2 py-0.5 rounded transition-all"
                    style={{
                      background: 'rgba(0,229,160,0.1)',
                      color: 'var(--geo-accent)',
                      border: '1px solid rgba(0,229,160,0.2)',
                    }}
                  >
                    Load
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}