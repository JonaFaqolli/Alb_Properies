import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import { createRoot } from 'react-dom/client';
import FeaturePopup from './FeaturePopup';
import PropertyPopup from './PropertyPopup';
import { getLayerColor } from './LayerPanel';
import { BASEMAPS } from './BasemapToggle';
import { getProperties } from '../services/api';

const DEFAULT_BASEMAP = BASEMAPS[0];

const MIN_ZOOM_PROPERTIES = 10;

export default function Map({ layers, basemap, onFeatureClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const propPopupElRef = useRef(document.createElement('div'));
  const layerIdsRef = useRef(new Set());
  const fetchTimerRef = useRef(null);
  const [propsLoading, setPropsLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(7);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activePropFeature, setActivePropFeature] = useState(null);
  const [activePropLngLat, setActivePropLngLat] = useState(null);

  // ── Init map ─────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_BASEMAP.style,
      center: [20.1683, 41.1533], // Albania center
      zoom: 7,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('zoomend', () => setZoomLevel(map.getZoom()));
    map.once('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Switch basemap ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !basemap) return;

    const onLoad = () => {
      layerIdsRef.current.clear();
      addAllLayers(map, layers);
    };

    map.setStyle(basemap.style);
    map.once('styledata', onLoad);
  }, [basemap]);

  // ── Add/remove/show/hide layers ──────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => addAllLayers(map, layers);

    if (map.isStyleLoaded()) {
      update();
    } else {
      map.once('styledata', update);
    }
  }, [layers]);

  // ── Properties layer — fetched from API per viewport ──
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const SOURCE     = 'properties-source';
    const LAYER      = 'properties-circle';
    const SEL_SOURCE = 'properties-selected-source';
    const SEL_LAYER  = 'properties-selected-circle';

    const fetchViewport = async () => {
      const m = mapRef.current;
      if (!m) return;
      const zoom = m.getZoom();

      if (zoom < MIN_ZOOM_PROPERTIES) {
        m.getSource(SOURCE)?.setData({ type: 'FeatureCollection', features: [] });
        setPropsLoading(false);
        return;
      }

      const b = m.getBounds();
      const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',');

      setPropsLoading(true);
      try {
        const { data } = await getProperties({ bbox });
        m.getSource(SOURCE)?.setData(data);
      } catch (e) {
        console.error('[props] fetch error:', e);
      } finally {
        setPropsLoading(false);
      }
    };

    const scheduleFetch = () => {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = setTimeout(fetchViewport, 400);
    };

    // Add sources/layers (idempotent)
    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }
    if (!map.getSource(SEL_SOURCE)) {
      map.addSource(SEL_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }
    if (!map.getLayer(LAYER)) {
      try {
        map.addLayer({
          id: LAYER, type: 'circle', source: SOURCE,
          paint: {
            'circle-color': '#f59e0b',
            'circle-radius': 7,
            'circle-stroke-color': '#0a0c0f',
            'circle-stroke-width': 2,
            'circle-opacity': 0.92,
          },
        });
      } catch (e) {
        console.error('[props] addLayer error:', e);
      }
    }
    if (!map.getLayer(SEL_LAYER)) {
      try {
        map.addLayer({
          id: SEL_LAYER, type: 'circle', source: SEL_SOURCE,
          paint: {
            'circle-color': '#fff',
            'circle-radius': 10,
            'circle-stroke-color': '#f59e0b',
            'circle-stroke-width': 3,
            'circle-opacity': 1,
          },
        });
      } catch (e) {
        console.error('[props] addLayer SEL error:', e);
      }

      map.on('click', LAYER, (e) => {
        const raw = e.features?.[0];
        if (!raw) return;
        const props = { ...raw.properties };
        try { props.images = JSON.parse(props.images); } catch { props.images = []; }
        map.getSource(SEL_SOURCE)?.setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: raw.geometry, properties: {} }],
        });
        setActivePropFeature({ ...raw, properties: props });
        setActivePropLngLat(e.lngLat);
      });
      map.on('mouseenter', LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', LAYER, () => { map.getCanvas().style.cursor = ''; });
    }

    map.on('moveend', scheduleFetch);

    // Initial fetch for current viewport
    fetchViewport();

    return () => {
      map.off('moveend', scheduleFetch);
      clearTimeout(fetchTimerRef.current);
    };
  }, [mapLoaded]);

  // ── Property popup via portal (keeps React state working) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activePropFeature) return;

    if (popupRef.current) popupRef.current.remove();

    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
      .setLngLat(activePropLngLat)
      .setDOMContent(propPopupElRef.current)
      .addTo(map);

    popup.on('close', () => {
      setActivePropFeature(null);
      map.getSource('properties-selected-source')?.setData({ type: 'FeatureCollection', features: [] });
    });
    popupRef.current = popup;
  }, [activePropFeature, activePropLngLat]);

  const addAllLayers = useCallback((map, layers) => {
    layers.forEach((layer, i) => {
      if (!layer.geojson) return;

      const sourceId = `geo-source-${layer.name}`;
      const isInterestZone = layer.name === 'interest_zone__single_parts';
      const color = getLayerColor(i);

      // Price-based color expression for interest_zone__single_parts
      const priceColor = [
        'match',
        ['downcase', ['coalesce', ['get', 'Range_Pric'], '']],
        'low',     '#00c853', // green
        'medium',  '#ff9800', // orange
        'high',    '#ff5722', // deep orange
        'premium', '#b71c1c', // dark red
        '#888888',            // default grey for unknown
      ];

      const fillColor = isInterestZone ? priceColor : color;
      const lineColor = isInterestZone ? priceColor : color;

      // Add source
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: layer.geojson });
      } else {
        map.getSource(sourceId).setData(layer.geojson);
      }

      const geomTypes = new Set(layer.geojson.features.map((f) => f.geometry?.type).filter(Boolean));

      // Polygon fill
      if (geomTypes.has('Polygon') || geomTypes.has('MultiPolygon')) {
        addLayerIfMissing(map, `${layer.name}-fill`, {
          id: `${layer.name}-fill`,
          type: 'fill',
          source: sourceId,
          filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
          paint: {
            'fill-color': fillColor,
            'fill-opacity': isInterestZone ? 0.55 : 0.25,
          },
        });
        addLayerIfMissing(map, `${layer.name}-line`, {
          id: `${layer.name}-line`,
          type: 'line',
          source: sourceId,
          filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
          paint: { 'line-color': lineColor, 'line-width': isInterestZone ? 1 : 1.5 },
        });
      }

      // Lines
      if (geomTypes.has('LineString') || geomTypes.has('MultiLineString')) {
        addLayerIfMissing(map, `${layer.name}-stroke`, {
          id: `${layer.name}-stroke`,
          type: 'line',
          source: sourceId,
          filter: ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]],
          paint: { 'line-color': color, 'line-width': 2 },
        });
      }

      // Points
      if (geomTypes.has('Point') || geomTypes.has('MultiPoint')) {
        addLayerIfMissing(map, `${layer.name}-circle`, {
          id: `${layer.name}-circle`,
          type: 'circle',
          source: sourceId,
          filter: ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]],
          paint: {
            'circle-color': color,
            'circle-radius': 5,
            'circle-stroke-color': '#0a0c0f',
            'circle-stroke-width': 1.5,
          },
        });
      }

      // Visibility
      const visible = layer.visible ? 'visible' : 'none';
      [`${layer.name}-fill`, `${layer.name}-line`, `${layer.name}-stroke`, `${layer.name}-circle`].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible);
      });

      // Click handler (only once per layer)
      if (!layerIdsRef.current.has(layer.name)) {
        layerIdsRef.current.add(layer.name);
        const clickableLayers = [
          `${layer.name}-fill`,
          `${layer.name}-stroke`,
          `${layer.name}-circle`,
          `${layer.name}-line`,
        ].filter((id) => map.getLayer(id));

        clickableLayers.forEach((lid) => {
          map.on('click', lid, (e) => {
            const feature = e.features?.[0];
            if (!feature) return;

            // Property dot takes priority — let its handler handle the click
            if (map.getLayer('properties-circle')) {
              const hits = map.queryRenderedFeatures(e.point, { layers: ['properties-circle'] });
              if (hits.length > 0) return;
            }

            if (popupRef.current) popupRef.current.remove();

            const el = document.createElement('div');
            const root = createRoot(el);
            root.render(<FeaturePopup feature={feature} />);

            popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
              .setLngLat(e.lngLat)
              .setDOMContent(el)
              .addTo(map);

            if (onFeatureClick) onFeatureClick(feature);
          });

          map.on('mouseenter', lid, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', lid, () => { map.getCanvas().style.cursor = ''; });
        });
      }
    });

    // Fit bounds to loaded layers
    fitToLayers(map, layers);
  }, [onFeatureClick]);

  const hasInterestZone = layers.some(
    (l) => l.name === 'interest_zone__single_parts' && l.geojson
  );

  const propertiesVisible = zoomLevel >= MIN_ZOOM_PROPERTIES;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading indicator — shows while API fetch is in flight */}
      {propsLoading && propertiesVisible && (
        <div
          className="absolute fade-up"
          style={{
            bottom: 36,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 20,
            background: 'rgba(17,20,24,0.93)',
            border: '1px solid var(--geo-border)',
            backdropFilter: 'blur(8px)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: 'spin 1.2s linear infinite', flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--geo-border)" strokeWidth="1.5" />
            <path d="M6 1.5A4.5 4.5 0 0 1 10.5 6" fill="none" stroke="var(--geo-accent)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ color: 'var(--geo-dim)' }}>Loading properties…</span>
        </div>
      )}

      {/* Zoom hint — always shown when below threshold */}
      {!propertiesVisible && (
        <div
          className="absolute fade-up"
          style={{
            bottom: 36,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 20,
            background: 'rgba(17,20,24,0.85)',
            border: '1px solid var(--geo-border)',
            backdropFilter: 'blur(8px)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 13 }}>🔍</span>
          <span style={{ color: 'var(--geo-dim)' }}>Zoom in to see property listings</span>
        </div>
      )}

      {/* Price legend */}
      {hasInterestZone && (
        <div
          className="absolute bottom-10 right-4 rounded p-3 fade-up"
          style={{
            background: 'rgba(17,20,24,0.92)',
            border: '1px solid var(--geo-border)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            minWidth: 150,
            backdropFilter: 'blur(8px)',
          }}
        >
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--geo-dim)' }}>
            Price Range
          </p>
          {[
            { color: '#00c853', label: 'Low' },
            { color: '#ff9800', label: 'Medium' },
            { color: '#ff5722', label: 'High' },
            { color: '#b71c1c', label: 'Premium' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
              <span style={{ color: 'var(--geo-text)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
      {/* Property popup portal — keeps React state alive for carousel */}
      {activePropFeature && createPortal(
        <PropertyPopup feature={activePropFeature} />,
        propPopupElRef.current
      )}
    </div>
  );
}

function addLayerIfMissing(map, id, spec) {
  if (!map.getLayer(id)) {
    // Insert below properties dots so they always stay on top
    const beforeId = map.getLayer('properties-circle') ? 'properties-circle' : undefined;
    try { map.addLayer(spec, beforeId); } catch {}
  }
}

function fitToLayers(map, layers) {
  const loaded = layers.filter((l) => l.geojson?.features?.length > 0 && l.visible);
  if (loaded.length === 0) return;

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

  loaded.forEach((layer) => {
    layer.geojson.features.forEach((f) => {
      if (!f.geometry) return;
      const coords = flattenCoords(f.geometry);
      coords.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      });
    });
  });

  if (isFinite(minLng)) {
    try {
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 14, duration: 800 });
    } catch {}
  }
}

function flattenCoords(geometry) {
  const { type, coordinates } = geometry;
  if (type === 'Point') return [coordinates];
  if (type === 'MultiPoint' || type === 'LineString') return coordinates;
  if (type === 'MultiLineString' || type === 'Polygon') return coordinates.flat();
  if (type === 'MultiPolygon') return coordinates.flat(2);
  return [];
}
