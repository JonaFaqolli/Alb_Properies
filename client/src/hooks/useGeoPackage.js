import { useState, useCallback } from 'react';
import {
  uploadGeoPackage,
  deleteUpload,
  getLayers,
  getLayerFeatures,
  getPreloadedDatasets,
} from '../services/api';

// Layers to hide from the panel — administrative zones not needed in UI
const HIDDEN_LAYERS = [
  'alb_admbnda_adm2_2019c',
  'alb_admbnda_adm1_2019c',
];

export function useGeoPackage() {
  const [activeFile, setActiveFile] = useState(null); // { id, name, type: 'upload'|'preloaded' }
  const [layers, setLayers] = useState([]);            // [{ name, visible, geojson, info }]
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [preloadedDatasets, setPreloadedDatasets] = useState([]);
  const [loadingPreloaded, setLoadingPreloaded] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const clearError = () => setError(null);

  // ── Load preloaded datasets list ─────────────────────
  const loadPreloaded = useCallback(async () => {
    setLoadingPreloaded(true);
    try {
      const { data } = await getPreloadedDatasets();
      setPreloadedDatasets(data.datasets || []);
    } catch (e) {
      console.error('Failed to load preloaded datasets', e);
    } finally {
      setLoadingPreloaded(false);
    }
  }, []);

  // ── Upload a .gpkg file ──────────────────────────────
  const upload = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    try {
      const { data } = await uploadGeoPackage(file, setUploadProgress);
      const newFile = {
        id: data.file.id,
        name: data.file.originalName,
        type: data.fileType || 'upload',
        projectName: data.projectName || null,
      };
      setActiveFile(newFile);

      // QGZ returns enriched layer objects, .gpkg returns plain strings
      const rawLayers = (data.layers.features || []).filter((l) => {
        const name = typeof l === 'string' ? l : l.name;
        return !HIDDEN_LAYERS.includes(name);
      });
      const layerList = rawLayers.map((l) => {
        const name = typeof l === 'string' ? l : l.name;
        const displayName = typeof l === 'string' ? l : (l.displayName || l.name);
        return { name, displayName, visible: true, geojson: null, loading: false };
      });
      setLayers(layerList);
      return newFile;
    } catch (e) {
      setError(e.response?.data?.error || 'Upload failed.');
      return null;
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, []);

  // ── Select a preloaded dataset ───────────────────────
  const selectPreloaded = useCallback(async (dataset) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getLayers(null, dataset.filename);
      const newFile = { id: dataset.filename, name: dataset.name, type: 'preloaded' };
      setActiveFile(newFile);
      setLayers((data.featureLayers || []).filter((name) => !HIDDEN_LAYERS.includes(name)).map((name) => ({
        name,
        visible: true,
        geojson: null,
        loading: false,
      })));
      setSelectedFeature(null);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load dataset.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch GeoJSON for a layer ────────────────────────
  const fetchLayerFeatures = useCallback(async (layerName) => {
    if (!activeFile) return;
    setLayers((prev) =>
      prev.map((l) => (l.name === layerName ? { ...l, loading: true } : l))
    );
    try {
      const fileId = activeFile.type === 'upload' ? activeFile.id : null;
      const preloaded = activeFile.type === 'preloaded' ? activeFile.id : null;
      const { data } = await getLayerFeatures(layerName, fileId, preloaded);
      setLayers((prev) =>
        prev.map((l) =>
          l.name === layerName ? { ...l, geojson: data, loading: false } : l
        )
      );
    } catch (e) {
      setLayers((prev) =>
        prev.map((l) => (l.name === layerName ? { ...l, loading: false } : l))
      );
      setError(`Failed to load layer: ${layerName}`);
    }
  }, [activeFile]);

  // ── Toggle layer visibility ──────────────────────────
  const toggleLayer = useCallback((layerName) => {
    setLayers((prev) =>
      prev.map((l) => (l.name === layerName ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  // ── Load layer if not yet fetched ────────────────────
  const ensureLayerLoaded = useCallback((layerName) => {
    const layer = layers.find((l) => l.name === layerName);
    if (layer && !layer.geojson && !layer.loading) {
      fetchLayerFeatures(layerName);
    }
  }, [layers, fetchLayerFeatures]);

  // ── Clear active file ────────────────────────────────
  const clearFile = useCallback(async () => {
    if (activeFile?.type === 'upload') {
      try { await deleteUpload(activeFile.id); } catch {}
    }
    setActiveFile(null);
    setLayers([]);
    setSelectedFeature(null);
    setError(null);
  }, [activeFile]);

  return {
    activeFile,
    layers,
    loading,
    loadingPreloaded,
    uploadProgress,
    error,
    preloadedDatasets,
    selectedFeature,
    setSelectedFeature,
    clearError,
    loadPreloaded,
    upload,
    selectPreloaded,
    toggleLayer,
    ensureLayerLoaded,
    fetchLayerFeatures,
    clearFile,
  };
}