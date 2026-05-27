import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

// ── Upload ──────────────────────────────────────────────
export const uploadGeoPackage = (file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
};

export const deleteUpload = (fileId) => api.delete(`/upload/${fileId}`);

// ── Layers ──────────────────────────────────────────────
export const getLayers = (fileId, preloaded) => {
  const params = fileId ? { fileId } : { preloaded };
  return api.get('/layers', { params });
};

export const getLayerInfo = (layerName, fileId, preloaded) => {
  const params = fileId ? { fileId } : { preloaded };
  return api.get(`/layers/${layerName}/info`, { params });
};

export const getLayerFeatures = (layerName, fileId, preloaded, bbox = null) => {
  const params = fileId ? { fileId } : { preloaded };
  if (bbox) params.bbox = bbox.join(',');
  return api.get(`/layers/${layerName}/features`, { params });
};

// ── Preloaded ────────────────────────────────────────────
export const getPreloadedDatasets = () => api.get('/preloaded');

// ── Properties ───────────────────────────────────────────
export const getProperties = (params = {}) => api.get('/properties', { params });

export const getPreloadedLayers = (filename) =>
  api.get(`/preloaded/${filename}/layers`);

export default api;