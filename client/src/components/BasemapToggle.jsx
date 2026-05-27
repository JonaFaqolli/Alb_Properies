import { useState } from 'react';

const BASEMAPS = [
  {
    id: 'dark',
    label: 'Dark',
    icon: '◼',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  {
    id: 'osm',
    label: 'Streets',
    icon: '⊞',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
  },
  {
    id: 'positron',
    label: 'Light',
    icon: '◻',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  {
    id: 'topo',
    label: 'Topo',
    icon: '⌇',
    style: {
      version: 8,
      sources: {
        topo: {
          type: 'raster',
          tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenTopoMap contributors',
        },
      },
      layers: [{ id: 'topo', type: 'raster', source: 'topo' }],
    },
  },
];

export { BASEMAPS };

export default function BasemapToggle({ current, onChange }) {
  const [open, setOpen] = useState(false);
  const active = BASEMAPS.find((b) => b.id === current) || BASEMAPS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 text-xs font-mono rounded border transition-all"
        style={{
          background: 'var(--geo-panel)',
          borderColor: open ? 'var(--geo-accent)' : 'var(--geo-border)',
          color: open ? 'var(--geo-accent)' : 'var(--geo-text)',
        }}
        title="Switch basemap"
      >
        <span style={{ fontSize: 14 }}>{active.icon}</span>
        <span>{active.label}</span>
        <span style={{ color: 'var(--geo-dim)', marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 right-0 rounded border overflow-hidden fade-up"
          style={{ background: 'var(--geo-panel)', borderColor: 'var(--geo-border)', minWidth: 130 }}
        >
          {BASEMAPS.map((bm) => (
            <button
              key={bm.id}
              onClick={() => { onChange(bm); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-all"
              style={{
                background: current === bm.id ? 'rgba(0,229,160,0.08)' : 'transparent',
                color: current === bm.id ? 'var(--geo-accent)' : 'var(--geo-text)',
                borderLeft: current === bm.id ? '2px solid var(--geo-accent)' : '2px solid transparent',
              }}
            >
              <span style={{ fontSize: 14 }}>{bm.icon}</span>
              {bm.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}