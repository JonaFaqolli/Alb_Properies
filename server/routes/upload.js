import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, readdirSync, rmSync } from 'fs';
import { getLayerNames } from '../services/geopackage.js';
import { extractQGZ } from '../services/qgz.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.gpkg') || name.endsWith('.qgz')) {
    cb(null, true);
  } else {
    cb(new Error('Only .gpkg or .qgz files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
});

/**
 * POST /api/upload
 * Handles both .gpkg and .qgz uploads.
 */
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;
  const isQGZ = req.file.originalname.toLowerCase().endsWith('.qgz');

  try {
    if (isQGZ) {
      // ── QGZ: extract and find .gpkg files ──────────────
      const extractDir = path.join(UPLOADS_DIR, `${req.file.filename}-extracted`);
      const { gpkgFiles, qgsLayers, projectName } = extractQGZ(filePath, extractDir);

      if (gpkgFiles.length === 0) {
        // No embedded .gpkg — project references external files
        // Return the QGS layer info so the frontend knows what to expect
        return res.json({
          success: true,
          fileType: 'qgz',
          projectName,
          file: {
            id: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
          },
          embedded: false,
          qgsLayers,
          layers: { features: [], tiles: [] },
          message: 'QGZ project loaded. No embedded .gpkg found — layers reference external files.',
        });
      }

      // Use the first .gpkg found (most projects have one)
      const primaryGpkg = gpkgFiles[0];
      const gpkgId = path.basename(primaryGpkg);
      const { featureLayers, tileLayers } = getLayerNames(primaryGpkg);

      // Cross-reference with QGS layer metadata for richer info
      const enrichedLayers = featureLayers.map((name) => {
        const qgsMatch = qgsLayers.find((l) => l.tableName === name || l.name === name);
        return {
          name,
          displayName: qgsMatch?.name || name,
          geometry: qgsMatch?.geometry || null,
        };
      });

      return res.json({
        success: true,
        fileType: 'qgz',
        projectName,
        file: {
          id: gpkgId,           // Use the extracted .gpkg as the active file
          originalName: req.file.originalname,
          size: req.file.size,
          qgzId: req.file.filename,
        },
        embedded: true,
        gpkgCount: gpkgFiles.length,
        qgsLayers,
        layers: {
          features: enrichedLayers,
          tiles: tileLayers,
        },
      });
    } else {
      // ── GPKG: direct read ───────────────────────────────
      const { featureLayers, tileLayers } = getLayerNames(filePath);
      return res.json({
        success: true,
        fileType: 'gpkg',
        file: {
          id: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
        },
        layers: {
          features: featureLayers,
          tiles: tileLayers,
        },
      });
    }
  } catch (err) {
    if (existsSync(filePath)) unlinkSync(filePath);
    console.error('Upload processing error:', err.message);
    res.status(422).json({ error: `Failed to process file: ${err.message}` });
  }
});

/**
 * DELETE /api/upload/:fileId
 */
router.delete('/:fileId', (req, res) => {
  const { fileId } = req.params;
  if (fileId.includes('/') || fileId.includes('..')) {
    return res.status(400).json({ error: 'Invalid file ID.' });
  }

  const filePath = path.join(UPLOADS_DIR, fileId);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found.' });
  }

  unlinkSync(filePath);

  // Also remove extracted dir if exists
  const extractDir = path.join(UPLOADS_DIR, `${fileId}-extracted`);
  if (existsSync(extractDir)) {
    rmSync(extractDir, { recursive: true, force: true });
  }

  res.json({ success: true, message: 'File deleted.' });
});

/**
 * GET /api/upload
 */
router.get('/', (req, res) => {
  try {
    const files = readdirSync(UPLOADS_DIR)
      .filter((f) => f.endsWith('.gpkg') || f.endsWith('.qgz'))
      .map((f) => ({ id: f, name: f }));
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

export default router;