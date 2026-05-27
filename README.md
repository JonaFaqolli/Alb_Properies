# GeoPackage Viewer

An interactive map viewer for GeoPackage (`.gpkg`) files with property listings overlaid from a CSV dataset.

## Tech Stack

- **Frontend** — React 19, MapLibre GL, Tailwind CSS, Vite
- **Backend** — Node.js, Express, sql.js (SQLite in WASM)

## Getting Started

### 1. Install dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Add your data (optional)

| What | Where |
|------|-------|
| Preloaded map files | `server/preloaded/*.gpkg` |
| Property listings | `server/data/Properties_for_sale.csv` |

### 3. Start the server

```bash
cd server
npm run dev
```

Runs on `http://localhost:3001`

### 4. Start the client

```bash
cd client
npm run dev
```

Opens on `http://localhost:5173`

## Features

- Upload or select preloaded `.gpkg` files
- Toggle and inspect map layers
- Property dots appear when zoomed in (zoom ≥ 10), fetched per viewport
- Click a dot to see photos, price, and listing details
