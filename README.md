# ⟁ VeloPath — Low-Distraction Biker Navigation System

A full-stack, offline-first bike navigation app designed for city riders.  
**Backend → Render** | **Frontend → Vercel**

---

## 🗂 Project Structure

```
biker-nav/
├── backend/
│   ├── src/server.js        # Express API
│   ├── package.json
│   ├── render.yaml          # Render deployment config
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/             # Next.js App Router
    │   ├── components/      # Map, HUD, Search, TurnArrow
    │   ├── hooks/           # useNavigation, useRoute
    │   └── lib/             # offlineStore (IndexedDB)
    ├── public/
    │   ├── sw.js            # Service Worker
    │   └── manifest.json    # PWA manifest
    ├── package.json
    └── .env.example
```

---

## 🚀 Local Development

### 1. Clone & install

```bash
git clone <your-repo>
cd biker-nav
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # Edit as needed
npm install
npm run dev                 # Starts on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local  # Set NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
npm install
npm run dev                 # Starts on http://localhost:3000
```

---

## 🌐 API Reference

### `GET /health`
Returns server status.

### `POST /route`
**Body:**
```json
{
  "source": "48.8584,2.2945",
  "destination": "48.8606,2.3376"
}
```
**Response:**
```json
{
  "coordinates": [[lat, lng], ...],
  "distance": 2400,
  "distanceText": "2.4 km",
  "duration": 720,
  "durationText": "12 min",
  "steps": [
    {
      "action": "left",
      "streetName": "Rue de Rivoli",
      "distance": 320,
      "distanceText": "320 m",
      "duration": 96,
      "voice": "In 320 m, turn left onto Rue de Rivoli",
      "location": { "lat": 48.86, "lng": 2.34 }
    }
  ],
  "engine": "osrm",
  "cached": false
}
```

---

## ☁️ Deployment

### Backend → Render

1. Push `backend/` to a GitHub repo
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect repo, set **Root Directory** to `backend`
4. Render auto-detects `render.yaml`
5. Set env vars in Render dashboard:
   - `FRONTEND_URL` = your Vercel URL (e.g. `https://velopath.vercel.app`)
   - `ROUTING_ENGINE` = `osrm` (free, no key)
6. Deploy — health check at `/health`

### Frontend → Vercel

1. Push `frontend/` to a GitHub repo (or monorepo)
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import repo, set **Root Directory** to `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_BACKEND_URL` = your Render backend URL
5. Deploy — Vercel detects Next.js automatically

---

## 🔑 Environment Variables

### Backend `.env`
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
ROUTING_ENGINE=osrm
OSRM_URL=https://router.project-osrm.org
# Optional GraphHopper:
# ROUTING_ENGINE=graphhopper
# GH_URL=https://graphhopper.com/api/1
# GH_API_KEY=your_key_here
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## 🔌 Routing Engines

| Engine | Key Required | Bike Support | Notes |
|--------|-------------|-------------|-------|
| **OSRM** (default) | No | ✅ | Free public demo server. Self-host for production. |
| **GraphHopper** | Yes (free tier) | ✅ | More detailed turn instructions. |

**Self-hosted OSRM** (recommended for production):
```bash
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-extract -p /opt/bicycle.lua /data/your-region.osm.pbf
```

---

## 📱 Features

| Feature | Status |
|---------|--------|
| Route calculation (OSRM/GraphHopper) | ✅ |
| Step-by-step voice navigation | ✅ Web Speech API |
| Offline route caching (IndexedDB) | ✅ |
| Service Worker (network-first) | ✅ |
| Dark map (CartoDB Dark Matter) | ✅ |
| Missed turn detection | ✅ |
| Off-route detection | ✅ |
| Vibration alerts | ✅ |
| Focus mode (minimal UI) | ✅ |
| PWA installable | ✅ |
| Route caching on backend (1hr) | ✅ |
| Mobile-first responsive UI | ✅ |

---

## 🐳 Docker (Backend)

```bash
cd backend
docker build -t biker-nav-backend .
docker run -p 3001:3001 --env-file .env biker-nav-backend
```

---

## ⚡ Performance Tips

- The OSRM public demo server has rate limits — self-host for production
- Route cache TTL is 1 hour (configurable in `server.js`)
- Leaflet tiles use CartoDB Dark Matter CDN (fast, no API key needed)
- IndexedDB stores the last fetched route for offline use automatically
