import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readdirSync, existsSync } from 'fs';

import uploadRouter from './routes/upload.js';
import layersRouter from './routes/layers.js';
import preloadedRouter from './routes/preloaded.js';
import propertiesRouter from './routes/properties.js';
import { warmupDB } from './services/geopackage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure required directories exist
mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
mkdirSync(path.join(__dirname, 'preloaded'), { recursive: true });

// Warmup preloaded GeoPackage files into memory so first request is instant
const PRELOADED_DIR = path.join(__dirname, 'preloaded');
if (existsSync(PRELOADED_DIR)) {
  readdirSync(PRELOADED_DIR)
    .filter((f) => f.toLowerCase().endsWith('.gpkg'))
    .forEach((f) => warmupDB(path.join(PRELOADED_DIR, f)).catch((err) =>
      console.error(`[preload] Failed to warmup ${f}:`, err)
    ));
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://geopackage-viewer.netlify.app',
  ],
}));
app.use(express.json());

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/layers', layersRouter);
app.use('/api/preloaded', preloadedRouter);
app.use('/api/properties', propertiesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🌍 GeoPackage server running on http://localhost:${PORT}`);
});
