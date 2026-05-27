import { useState, useRef, useEffect } from 'react';

export default function UploadPanel({
  onUpload,
  onSelectPreloaded,
  preloadedDatasets,
  loadPreloaded,
  loading,
  loadingPreloaded,
  uploadProgress,
  activeFile,
  onClear,
}) {
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState('upload'); // 'upload' | 'preloaded'
  const fileRef = useRef();

  useEffect(() => {
    loadPreloaded();
  }, [loadPreloaded]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.name.endsWith('.gpkg') || file?.name.endsWith('.qgz')) onUpload(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  // ── If a file is active, show compact status ─────────
  if (activeFile) {
    return (
      <div className="panel-in px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--geo-border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: 'var(--geo-accent)', fontSize: 16 }}>◈</span>
          <span className="text-xs truncate" style={{ color: 'var(--geo-text)' }}>{activeFile.name}</span>
          <span className="text-xs shrink-0 px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--geo-accent)', fontSize: 10 }}>
            {activeFile.type}
          </span>
        </div>
        <button
          onClick={onClear}
          className="shrink-0 text-xs px-2 py-1 rounded transition-all"
          style={{ color: 'var(--geo-dim)', border: '1px solid var(--geo-border)' }}
        >
          ✕ Close
        </button>
      </div>
    );
  }

  return (
    <div className="panel-in">
      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--geo-border)' }}>
        {['upload', 'preloaded'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs uppercase tracking-widest transition-all relative"
            style={{
              color: tab === t ? 'var(--geo-accent)' : 'var(--geo-dim)',
              borderBottom: tab === t ? '2px solid var(--geo-accent)' : '2px solid transparent',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {t}
            {t === 'preloaded' && preloadedDatasets.length > 0 && (
              <span
                className="absolute top-2 right-4 w-2 h-2 rounded-full"
                style={{ background: 'var(--geo-accent)' }}
                title={`${preloadedDatasets.length} dataset${preloadedDatasets.length > 1 ? 's' : ''} available`}
              />
            )}
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {tab === 'upload' && (
        <div className="p-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="rounded border-2 border-dashed p-5 text-center cursor-pointer transition-all"
            style={{
              borderColor: dragging ? 'var(--geo-accent)' : 'var(--geo-border)',
              background: dragging ? 'rgba(0,229,160,0.04)' : 'transparent',
            }}
          >
            <input ref={fileRef} type="file" accept=".gpkg,.qgz" className="hidden" onChange={handleFileChange} />
            <div className="text-2xl mb-2" style={{ color: dragging ? 'var(--geo-accent)' : 'var(--geo-dim)' }}>
              ⬆
            </div>
            <p className="text-xs" style={{ color: 'var(--geo-dim)' }}>
              {loading ? (
                <span style={{ color: 'var(--geo-accent)' }}>
                  Uploading{uploadProgress > 0 ? ` ${uploadProgress}%` : '...'}
                </span>
              ) : (
                <>Drop <span style={{ color: 'var(--geo-text)' }}>.gpkg</span> or <span style={{ color: 'var(--geo-text)' }}>.qgz</span> here or click</>
              )}
            </p>
          </div>

          {/* Progress bar */}
          {loading && uploadProgress > 0 && (
            <div className="mt-2 h-0.5 rounded overflow-hidden" style={{ background: 'var(--geo-border)' }}>
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%`, background: 'var(--geo-accent)' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Preloaded tab */}
      {tab === 'preloaded' && (
        <div className="py-1">
          {loadingPreloaded ? (
            <div className="px-4 py-6 flex flex-col items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation: 'spin 0.9s linear infinite' }}>
                <circle cx="10" cy="10" r="8" fill="none" stroke="var(--geo-border)" strokeWidth="2" />
                <path d="M10 2A8 8 0 0 1 18 10" fill="none" stroke="var(--geo-accent)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-xs" style={{ color: 'var(--geo-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                Loading datasets…
              </span>
            </div>
          ) : preloadedDatasets.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-xs" style={{ color: 'var(--geo-dim)' }}>
                No preloaded datasets.<br />
                <span style={{ color: 'var(--geo-muted)', fontSize: 10 }}>
                  Drop .gpkg files in server/preloaded/
                </span>
              </p>
            </div>
          ) : (
            preloadedDatasets.map((ds) => (
              <button
                key={ds.id}
                onClick={() => !loading && onSelectPreloaded(ds)}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-all group"
                style={{ borderBottom: '1px solid var(--geo-border)', opacity: loading ? 0.6 : 1, cursor: loading ? 'default' : 'pointer' }}
              >
                <div>
                  <p className="text-xs capitalize" style={{ color: 'var(--geo-text)' }}>{ds.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--geo-dim)', fontSize: 10 }}>{ds.sizeLabel}</p>
                </div>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--geo-border)" strokeWidth="1.5" />
                      <path d="M6 1.5A4.5 4.5 0 0 1 10.5 6" fill="none" stroke="var(--geo-accent)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-xs" style={{ color: 'var(--geo-accent)' }}>Loading</span>
                  </span>
                ) : (
                  <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--geo-accent)' }}>
                    Load →
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}