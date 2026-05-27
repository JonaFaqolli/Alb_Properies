import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { getLayerNames, getLayerAsGeoJSON, getLayerInfo } from '../services/geopackage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PRELOADED_DIR = path.join(__dirname, '..', 'preloaded');

const router = express.Router();

/**
 * Resolve file path from query params.
 * Supports: ?fileId=uploaded-file.gpkg  or  ?preloaded=dataset-name.gpkg
 */
function resolveFilePath(query) {
  if (query.fileId) {
    const fileId = query.fileId.replace(/[^a-zA-Z0-9._-]/g, '');
    const fp = path.join(UPLOADS_DIR, fileId);
    if (!existsSync(fp)) return null;
    return fp;
  }
  if (query.preloaded) {
    const name = query.preloaded.replace(/[^a-zA-Z0-9._-]/g, '');
    const fp = path.join(PRELOADED_DIR, name);
    if (!existsSync(fp)) return null;
    return fp;
  }
  return null;
}

/**
 * GET /api/layers
 * List all layers in a GeoPackage file.
 * Query: ?fileId=xxx  or  ?preloaded=xxx
 */
router.get('/', async (req, res) => {
  const filePath = resolveFilePath(req.query);
  if (!filePath) {
    return res.status(400).json({ error: 'Provide ?fileId or ?preloaded query parameter.' });
  }

  try {
    const { featureLayers, tileLayers } = await getLayerNames(filePath);
    res.json({ featureLayers, tileLayers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/layers/:layerName/info
 * Get metadata for a specific layer.
 * Query: ?fileId=xxx  or  ?preloaded=xxx
 */
router.get('/:layerName/info', async (req, res) => {
  const filePath = resolveFilePath(req.query);
  if (!filePath) {
    return res.status(400).json({ error: 'Provide ?fileId or ?preloaded query parameter.' });
  }

  try {
    const info = await getLayerInfo(filePath, req.params.layerName);
    res.json(info);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

/**
 * GET /api/layers/:layerName/features
 * Return GeoJSON FeatureCollection for a layer.
 * Query: ?fileId=xxx  or  ?preloaded=xxx
 * Optional: ?bbox=minLng,minLat,maxLng,maxLat
 */
router.get('/:layerName/features', async (req, res) => {
  const filePath = resolveFilePath(req.query);
  if (!filePath) {
    return res.status(400).json({ error: 'Provide ?fileId or ?preloaded query parameter.' });
  }

  let bbox = null;
  if (req.query.bbox) {
    bbox = req.query.bbox.split(',').map(Number);
    if (bbox.length !== 4 || bbox.some(isNaN)) {
      return res.status(400).json({ error: 'Invalid bbox. Use: minLng,minLat,maxLng,maxLat' });
    }
  }

  try {
    const geojson = await getLayerAsGeoJSON(filePath, req.params.layerName, bbox);
    res.json(geojson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
