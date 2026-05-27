import { useState } from 'react';
import Map from './components/Map';
import UploadPanel from './components/UploadPanel';
import LayerPanel from './components/LayerPanel';
import BasemapToggle from './components/BasemapToggle';
import { BASEMAPS } from './components/BasemapToggle';
import { useGeoPackage } from './hooks/useGeoPackage';

export default function App() {
  const [basemap, setBasemap] = useState(BASEMAPS[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    activeFile,
    layers,
    loading,
    loadingPreloaded,
    uploadProgress,
    error,
    preloadedDatasets,
    clearError,
    loadPreloaded,
    upload,
    selectPreloaded,
    toggleLayer,
    ensureLayerLoaded,
    clearFile,
    setSelectedFeature,
  } = useGeoPackage();

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'var(--geo-bg)' }}>

      {/* ── Map (full bleed) ── */}
      <div className="absolute inset-0">
        <Map
          layers={layers}
          basemap={basemap}
          onFeatureClick={setSelectedFeature}
        />
      </div>

      {/* ── Top bar ── */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,12,15,0.95) 0%, rgba(10,12,15,0) 100%)',
          pointerEvents: 'none',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3" style={{ pointerEvents: 'auto' }}>
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex items-center gap-2 group"
          >
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: 'var(--geo-accent)',
                color: 'var(--geo-bg)',
                fontFamily: 'Syne, sans-serif',
              }}
            >
              G
            </div>
            <span
              className="text-sm font-bold hidden sm:block"
              style={{ fontFamily: 'Syne, sans-serif', color: 'var(--geo-text)', letterSpacing: '-0.02em' }}
            >
              GeoViewer
            </span>
          </button>

          {/* Active file badge */}
          {activeFile && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs fade-up"
              style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)' }}
            >
              <span className="pulse-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--geo-accent)' }} />
              <span style={{ color: 'var(--geo-accent)' }}>{layers.length} layer{layers.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Basemap toggle */}
        <div style={{ pointerEvents: 'auto' }}>
          <BasemapToggle current={basemap.id} onChange={setBasemap} />
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div
        className="absolute top-0 left-0 bottom-0 z-20 flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? 280 : 0,
          overflow: 'hidden',
        }}
      >
        <div
          className="flex flex-col h-full"
          style={{
            width: 280,
            background: 'rgba(17,20,24,0.97)',
            borderRight: '1px solid var(--geo-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Sidebar top spacer (below top bar) */}
          <div style={{ height: 56 }} />

          {/* Upload / Preloaded panel */}
          <UploadPanel
            onUpload={upload}
            onSelectPreloaded={selectPreloaded}
            preloadedDatasets={preloadedDatasets}
            loadPreloaded={loadPreloaded}
            loading={loading}
            loadingPreloaded={loadingPreloaded}
            uploadProgress={uploadProgress}
            activeFile={activeFile}
            onClear={clearFile}
          />

          {/* Layer panel */}
          <div className="flex-1 overflow-hidden">
            <LayerPanel
              layers={layers}
              activeFile={activeFile}
              onToggle={toggleLayer}
              onLoad={ensureLayerLoaded}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--geo-border)' }}>
            <p className="text-xs" style={{ color: 'var(--geo-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              GeoPackage Viewer · v1.0
            </p>
          </div>
        </div>
      </div>

      {/* ── Sidebar toggle button (when closed) ── */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-3 left-4 z-30 w-8 h-8 flex items-center justify-center rounded transition-all fade-up"
          style={{
            background: 'var(--geo-panel)',
            border: '1px solid var(--geo-border)',
            color: 'var(--geo-accent)',
          }}
        >
          ☰
        </button>
      )}

      {/* ── Error toast ── */}
      {error && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded fade-up"
          style={{
            background: 'rgba(255,77,109,0.15)',
            border: '1px solid rgba(255,77,109,0.4)',
            fontFamily: 'JetBrains Mono, monospace',
            maxWidth: 400,
          }}
        >
          <span className="text-xs" style={{ color: '#ff4d6d' }}>{error}</span>
          <button onClick={clearError} className="text-xs shrink-0" style={{ color: 'var(--geo-dim)' }}>✕</button>
        </div>
      )}
    </div>
  );
}