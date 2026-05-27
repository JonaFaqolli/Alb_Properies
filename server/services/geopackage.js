import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const sqlJsModule = require('sql.js');

// sql.js can export either directly or as .default depending on version
const initSqlJs = sqlJsModule.default || sqlJsModule;

let SQL = null;
// Cached DB instances for preloaded (static) files — never closed
const _dbCache = new Map();

async function getSql() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

async function openDB(filePath) {
  if (_dbCache.has(filePath)) return _dbCache.get(filePath);
  const sql = await getSql();
  const fileBuffer = readFileSync(filePath);
  return new sql.Database(new Uint8Array(fileBuffer));
}

function closeDB(db, filePath) {
  // Don't close cached DBs
  if (!_dbCache.has(filePath)) db.close();
}

// Call this on server startup for each preloaded file to avoid cold-start delay
export async function warmupDB(filePath) {
  if (_dbCache.has(filePath)) return;
  const sql = await getSql();
  const fileBuffer = readFileSync(filePath);
  _dbCache.set(filePath, new sql.Database(new Uint8Array(fileBuffer)));
}

export async function getLayerNames(filePath) {
  const db = await openDB(filePath);
  try {
    const stmt = db.prepare(`SELECT table_name, data_type FROM gpkg_contents`);
    const featureLayers = [];
    const tileLayers = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.data_type === 'features') featureLayers.push(row.table_name);
      else if (row.data_type === 'tiles') tileLayers.push(row.table_name);
    }
    stmt.free();
    return { featureLayers, tileLayers };
  } finally {
    closeDB(db, filePath);
  }
}

function _getLayerInfoFromDB(db, layerName) {
  const countStmt = db.prepare(`SELECT COUNT(*) as cnt FROM "${layerName}"`);
  countStmt.step();
  const count = countStmt.getAsObject().cnt;
  countStmt.free();

  const geomStmt = db.prepare(
    `SELECT column_name, geometry_type_name FROM gpkg_geometry_columns WHERE table_name = ?`
  );
  geomStmt.bind([layerName]);
  let geomCol = null;
  if (geomStmt.step()) geomCol = geomStmt.getAsObject();
  geomStmt.free();

  const pragmaRows = db.exec(`PRAGMA table_info("${layerName}")`);
  const columns = pragmaRows[0]
    ? pragmaRows[0].values
        .map(([cid, name, type]) => ({ name, type }))
        .filter((c) => c.name !== geomCol?.column_name)
    : [];

  return {
    layerName,
    featureCount: count,
    geometryType: geomCol?.geometry_type_name || 'Unknown',
    geometryColumn: geomCol?.column_name || 'geom',
    columns,
  };
}

export async function getLayerInfo(filePath, layerName) {
  const db = await openDB(filePath);
  try {
    return _getLayerInfoFromDB(db, layerName);
  } finally {
    closeDB(db, filePath);
  }
}

function gpkgBlobToGeoJSON(buffer) {
  if (!buffer || buffer.length < 8) return null;
  try {
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    if (buf[0] !== 0x47 || buf[1] !== 0x50) return null;
    const flags = buf[3];
    const envelopeIndicator = (flags >> 1) & 0x07;
    const envelopeSizes = [0, 32, 48, 48, 64];
    const envelopeSize = envelopeSizes[envelopeIndicator] || 0;
    const wkb = buf.slice(8 + envelopeSize);
    return parseWKB(wkb, 0);
  } catch {
    return null;
  }
}

function parseWKB(buf, offset = 0) {
  const le = buf[offset] === 1;
  offset += 1;
  const geomType = readUint32(buf, offset, le) & 0xffff;
  offset += 4;
  switch (geomType) {
    case 1: {
      return { type: 'Point', coordinates: [readDouble(buf, offset, le), readDouble(buf, offset + 8, le)] };
    }
    case 2: {
      const [coords] = readCoordArray(buf, offset, le);
      return { type: 'LineString', coordinates: coords };
    }
    case 3: {
      const [rings] = readRings(buf, offset, le);
      return { type: 'Polygon', coordinates: rings };
    }
    case 4: {
      const [geoms] = readGeomCollection(buf, offset, le);
      return { type: 'MultiPoint', coordinates: geoms.map((g) => g.coordinates) };
    }
    case 5: {
      const [geoms] = readGeomCollection(buf, offset, le);
      return { type: 'MultiLineString', coordinates: geoms.map((g) => g.coordinates) };
    }
    case 6: {
      const [geoms] = readGeomCollection(buf, offset, le);
      return { type: 'MultiPolygon', coordinates: geoms.map((g) => g.coordinates) };
    }
    case 7: {
      const [geoms] = readGeomCollection(buf, offset, le);
      return { type: 'GeometryCollection', geometries: geoms };
    }
    default: return null;
  }
}

function readUint32(buf, offset, le) {
  return le ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
}
function readDouble(buf, offset, le) {
  return le ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
}
function readCoordArray(buf, offset, le) {
  const count = readUint32(buf, offset, le);
  offset += 4;
  const coords = [];
  for (let i = 0; i < count; i++) {
    coords.push([readDouble(buf, offset, le), readDouble(buf, offset + 8, le)]);
    offset += 16;
  }
  return [coords, offset];
}
function readRings(buf, offset, le) {
  const numRings = readUint32(buf, offset, le);
  offset += 4;
  const rings = [];
  for (let i = 0; i < numRings; i++) {
    const [coords, newOffset] = readCoordArray(buf, offset, le);
    rings.push(coords);
    offset = newOffset;
  }
  return [rings, offset];
}
function readGeomCollection(buf, offset, le) {
  const count = readUint32(buf, offset, le);
  offset += 4;
  const geoms = [];
  for (let i = 0; i < count; i++) {
    const geom = parseWKB(buf, offset);
    if (geom) geoms.push(geom);
    offset = advanceWKB(buf, offset);
  }
  return [geoms, offset];
}
function advanceWKB(buf, offset) {
  const le = buf[offset] === 1;
  offset += 1;
  const geomType = readUint32(buf, offset, le) & 0xffff;
  offset += 4;
  switch (geomType) {
    case 1: return offset + 16;
    case 2: case 4: {
      const n = readUint32(buf, offset, le);
      return offset + 4 + n * 16;
    }
    case 3: case 5: {
      const nr = readUint32(buf, offset, le);
      offset += 4;
      for (let i = 0; i < nr; i++) {
        const n = readUint32(buf, offset, le);
        offset += 4 + n * 16;
      }
      return offset;
    }
    case 6: case 7: {
      const nc = readUint32(buf, offset, le);
      offset += 4;
      for (let i = 0; i < nc; i++) offset = advanceWKB(buf, offset);
      return offset;
    }
    default: return offset;
  }
}

export async function getLayerAsGeoJSON(filePath, layerName) {
  const db = await openDB(filePath);
  try {
    // Reuse same DB connection — avoids re-reading the file a second time
    const info = _getLayerInfoFromDB(db, layerName);
    const geomCol = info.geometryColumn;
    const propCols = info.columns.map((c) => `"${c.name}"`).join(', ');
    const query = `SELECT "${geomCol}"${propCols ? ', ' + propCols : ''} FROM "${layerName}" LIMIT 5000`;
    const results = db.exec(query);

    if (!results[0]) {
      return { type: 'FeatureCollection', features: [], metadata: { layerName, featureCount: 0 } };
    }

    const { columns, values } = results[0];
    const geomIndex = columns.indexOf(geomCol);
    const features = [];

    for (const row of values) {
      const geomBlob = row[geomIndex];
      const geometry = geomBlob ? gpkgBlobToGeoJSON(Buffer.from(geomBlob)) : null;
      if (!geometry) continue;
      const properties = {};
      columns.forEach((col, i) => { if (col !== geomCol) properties[col] = row[i]; });
      features.push({ type: 'Feature', geometry, properties });
    }

    return {
      type: 'FeatureCollection',
      features,
      metadata: { layerName, featureCount: features.length },
    };
  } finally {
    closeDB(db, filePath);
  }
}