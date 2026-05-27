import AdmZip from 'adm-zip';
import path from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

/**
 * Extract a .qgz file and return paths to all .gpkg files found inside.
 * Also parses the .qgs XML to find externally referenced .gpkg files by name.
 *
 * @param {string} qgzPath - Path to the uploaded .qgz file
 * @param {string} extractDir - Directory to extract contents into
 * @returns {{ gpkgFiles: string[], qgsLayers: object[], projectName: string }}
 */
export function extractQGZ(qgzPath, extractDir) {
  mkdirSync(extractDir, { recursive: true });

  const zip = new AdmZip(qgzPath);
  const entries = zip.getEntries();

  const gpkgFiles = [];
  let projectName = path.basename(qgzPath, '.qgz');
  let qgsXml = null;

  for (const entry of entries) {
    const entryName = entry.entryName;
    const destPath = path.join(extractDir, path.basename(entryName));

    if (entryName.endsWith('.gpkg')) {
      // Extract embedded .gpkg files
      const data = entry.getData();
      writeFileSync(destPath, data);
      gpkgFiles.push(destPath);
    } else if (entryName.endsWith('.qgs')) {
      // Extract and read the QGIS project XML
      qgsXml = entry.getData().toString('utf8');
      projectName = path.basename(entryName, '.qgs');
    }
  }

  // Parse .qgs XML to find layer info (names, datasource paths)
  const qgsLayers = qgsXml ? parseQGSLayers(qgsXml) : [];

  return { gpkgFiles, qgsLayers, projectName };
}

/**
 * Parse a .qgs XML string and extract layer metadata.
 * Looks for <maplayer> elements with datasource and layername.
 */
function parseQGSLayers(xml) {
  const layers = [];

  // Match all <maplayer> blocks
  const layerBlocks = xml.match(/<maplayer[\s\S]*?<\/maplayer>/g) || [];

  for (const block of layerBlocks) {
    try {
      // Extract type
      const typeMatch = block.match(/type="([^"]+)"/);
      const type = typeMatch?.[1] || 'unknown';

      // Extract layer name
      const nameMatch = block.match(/<layername>([^<]+)<\/layername>/);
      const name = nameMatch?.[1] || 'Unnamed Layer';

      // Extract datasource
      const dsMatch = block.match(/<datasource>([^<]+)<\/datasource>/);
      const datasource = dsMatch?.[1] || '';

      // Extract geometry type
      const geomMatch = block.match(/geometry="([^"]+)"/);
      const geometry = geomMatch?.[1] || '';

      // Check if datasource references a .gpkg
      const gpkgMatch = datasource.match(/([^/\\|]+\.gpkg)/i);
      const gpkgFile = gpkgMatch?.[1] || null;

      // Extract the table/layer name from datasource (after the | symbol in QGIS format)
      // Format: /path/to/file.gpkg|layername=my_layer
      const tableMatch = datasource.match(/layername=([^|&\s]+)/);
      const tableName = tableMatch?.[1] || null;

      layers.push({ name, type, geometry, datasource, gpkgFile, tableName });
    } catch {
      // Skip malformed layer entries
    }
  }

  return layers;
}