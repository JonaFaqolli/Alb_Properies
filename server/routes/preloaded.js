import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, statSync, existsSync } from 'fs';
import { getLayerNames } from '../services/geopackage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRELOADED_DIR = path.join(__dirname, '..', 'preloaded');

const router = express.Router();

/**
 * GET /api/preloaded
 * List all .gpkg files in the preloaded directory.
 */
router.get('/', (req, res) => {
  try {
    if (!existsSync(PRELOADED_DIR)) {
      return res.json({ datasets: [] });
    }

    const datasets = readdirSync(PRELOADED_DIR)
      .filter((f) => f.toLowerCase().endsWith('.gpkg'))
      .map((f) => {
        const fp = path.join(PRELOADED_DIR, f);
        const stats = statSync(fp);
        return {
          id: f,
          name: f.replace('.gpkg', '').replace(/[-_]/g, ' '),
          filename: f,
          size: stats.size,
          sizeLabel: formatBytes(stats.size),
          modified: stats.mtime.toISOString(),
        };
      });

    res.json({ datasets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list preloaded datasets.' });
  }
});

/**
 * GET /api/preloaded/:filename/layers
 * List layers for a specific preloaded dataset.
 */
router.get('/:filename/layers', async (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = path.join(PRELOADED_DIR, filename);

  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Preloaded dataset not found.' });
  }

  try {
    const { featureLayers, tileLayers } = await getLayerNames(filePath);
    res.json({
      dataset: filename,
      featureLayers,
      tileLayers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default router;
