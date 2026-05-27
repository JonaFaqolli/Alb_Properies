import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const EXCEL_PATH = path.join(__dirname, '../data/Properties_for_sale.csv');

const SKIP_PATTERNS = /\.svg(\?|$)|noscript|\.js(\?|$)|\.css(\?|$)|favicon/i;

function isPropertyPhoto(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const url = raw.trim();
  if (!url.startsWith('http')) return false;
  if (SKIP_PATTERNS.test(url)) return false;
  return true;
}

// Normalize a header key: lowercase, underscores, strip non-alphanumeric
const norm = (k) => String(k).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

// Find value in row by trying normalized key variants
function pick(row, normMap, ...candidates) {
  for (const c of candidates) {
    const n = norm(c);
    if (normMap[n] !== undefined) return row[normMap[n]];
  }
  return null;
}

// Debug: show raw vs filtered images for every property
router.get('/debug', (req, res) => {
  if (!existsSync(EXCEL_PATH)) return res.status(404).json({ error: 'File not found' });
  const workbook = XLSX.readFile(EXCEL_PATH);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });
  const normMap = {};
  Object.keys(rows[0]).forEach((k) => { normMap[norm(k)] = k; });
  const imageKeys = Object.keys(normMap)
    .filter((k) => /^image_\d+$/.test(k))
    .sort((a, b) => parseInt(a.replace('image_', '')) - parseInt(b.replace('image_', '')));

  const result = rows.slice(0, 20).map((row) => {
    const raw = imageKeys.map((k) => row[normMap[k]]).filter(Boolean);
    const kept = raw.filter(isPropertyPhoto);
    const dropped = raw.filter((u) => !isPropertyPhoto(u));
    return { title: row[normMap['descriptive_category']] || row[normMap['title']] || '', kept, dropped };
  });
  res.json(result);
});

// Parse once and cache — CSV doesn't change at runtime
let _cachedFeatures = null;

function loadAllFeatures() {
  if (_cachedFeatures) return _cachedFeatures;

  const workbook = XLSX.readFile(EXCEL_PATH);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });
  if (!rows.length) return (_cachedFeatures = []);

  const normMap = {};
  Object.keys(rows[0]).forEach((k) => { normMap[norm(k)] = k; });

  const imageKeys = Object.keys(normMap)
    .filter((k) => /^image_\d+$/.test(k))
    .sort((a, b) => parseInt(a.replace('image_', ''), 10) - parseInt(b.replace('image_', ''), 10));

  const features = [];
  for (const row of rows) {
    const lat = parseFloat(pick(row, normMap, 'latitude', 'lat'));
    const lng = parseFloat(pick(row, normMap, 'longitude', 'lng', 'lon'));
    if (!isFinite(lat) || !isFinite(lng)) continue;

    const seen = new Set();
    const images = [];
    for (const key of imageKeys) {
      const raw = row[normMap[key]];
      if (!isPropertyPhoto(raw)) continue;
      const url = raw.trim();
      if (!seen.has(url)) {
        seen.add(url);
        images.push(url);
      }
    }

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        title: pick(row, normMap, 'descriptive_category', 'descriptic_category', 'description', 'title') || '',
        status: pick(row, normMap, 'status') || '',
        price: pick(row, normMap, 'price_text', 'price') || '',
        reference: pick(row, normMap, 'reference') || '',
        area_m2: pick(row, normMap, 'area_m2', 'area') || null,
        bedrooms: pick(row, normMap, 'bedrooms', 'bedroom') || null,
        bathrooms: pick(row, normMap, 'bathroom', 'bathrooms') || null,
        living_room: pick(row, normMap, 'living_room', 'living_roo') || null,
        floor: pick(row, normMap, 'floor') || null,
        property_type: pick(row, normMap, 'property_type', 'property_') || '',
        property_url: pick(row, normMap, 'property_url', 'url', 'link') || '',
        images,
      },
    });
  }

  return (_cachedFeatures = features);
}

router.get('/', (req, res) => {
  if (!existsSync(EXCEL_PATH)) {
    return res.status(404).json({ error: 'Properties file not found. Place Properties_for_sale.csv in server/data/' });
  }

  try {
    let features = loadAllFeatures();

    // Bbox filter: ?bbox=minLng,minLat,maxLng,maxLat
    if (req.query.bbox) {
      const parts = req.query.bbox.split(',').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        features = features.filter(({ geometry: { coordinates: [lng, lat] } }) =>
          lng >= minLng && lat >= minLat && lng <= maxLng && lat <= maxLat
        );
      }
    }

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('Error reading properties:', err);
    res.status(500).json({ error: 'Failed to parse properties file.' });
  }
});

export default router;
