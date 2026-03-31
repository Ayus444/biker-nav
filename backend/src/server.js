require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const NodeCache = require("node-cache");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3001;
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1hr TTL

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

// ─── OSRM / GraphHopper config ────────────────────────────────────────────────
const ROUTING_ENGINE = process.env.ROUTING_ENGINE || "osrm"; // 'osrm' | 'graphhopper'
const OSRM_BASE = process.env.OSRM_URL || "https://router.project-osrm.org";
const GH_BASE = process.env.GH_URL || "https://graphhopper.com/api/1";
const GH_KEY = process.env.GH_API_KEY || "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Haversine distance in meters */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Decode a Google-style polyline */
function decodePolyline(encoded) {
  const coords = [];
  let idx = 0,
    lat = 0,
    lng = 0;
  while (idx < encoded.length) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(idx++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do {
      b = encoded.charCodeAt(idx++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

/** Format distance human-readable */
function formatDist(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

/** Format duration human-readable */
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

/** Normalise a raw instruction sign/text to a clean action label */
function parseManeuver(sign, text = "") {
  const t = text.toLowerCase();
  if (sign === -3 || t.includes("sharp left")) return "sharp-left";
  if (sign === -2 || t.includes("left")) return "left";
  if (sign === -1 || t.includes("slight left")) return "slight-left";
  if (sign === 1 || t.includes("slight right")) return "slight-right";
  if (sign === 2 || t.includes("right")) return "right";
  if (sign === 3 || t.includes("sharp right")) return "sharp-right";
  if (sign === 4 || t.includes("finish") || t.includes("arrive")) return "arrive";
  if (sign === 6 || t.includes("roundabout")) return "roundabout";
  if (t.includes("ferry")) return "ferry";
  return "straight";
}

/** Build voice instruction string */
function buildVoice(action, streetName, distMeters) {
  const dist = formatDist(distMeters);
  const street = streetName ? ` onto ${streetName}` : "";
  switch (action) {
    case "left":
      return `In ${dist}, turn left${street}`;
    case "right":
      return `In ${dist}, turn right${street}`;
    case "sharp-left":
      return `In ${dist}, turn sharp left${street}`;
    case "sharp-right":
      return `In ${dist}, turn sharp right${street}`;
    case "slight-left":
      return `In ${dist}, keep left${street}`;
    case "slight-right":
      return `In ${dist}, keep right${street}`;
    case "roundabout":
      return `In ${dist}, enter the roundabout${street}`;
    case "arrive":
      return "You have arrived at your destination";
    default:
      return `Continue straight for ${dist}${street}`;
  }
}

// ─── OSRM Route Fetcher ───────────────────────────────────────────────────────
async function fetchOSRM(srcLat, srcLng, dstLat, dstLng) {
  const url =
    `${OSRM_BASE}/route/v1/cycling/` +
    `${srcLng},${srcLat};${dstLng},${dstLat}` +
    `?overview=full&geometries=polyline&steps=true&annotations=false`;

  const res = await fetch(url, { timeout: 10000 });
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);
  const data = await res.json();

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No route found");
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  const coordinates = decodePolyline(route.geometry);

  const steps = leg.steps.map((s) => {
    const action = parseManeuver(s.maneuver.type === "turn" ? (s.maneuver.modifier === "left" ? -2 : 2) : 0, s.maneuver.type + " " + (s.maneuver.modifier || ""));
    const distMeters = s.distance;
    return {
      action,
      streetName: s.name || "",
      distance: distMeters,
      distanceText: formatDist(distMeters),
      duration: Math.round(s.duration),
      voice: buildVoice(action, s.name, distMeters),
      location: s.maneuver.location
        ? { lat: s.maneuver.location[1], lng: s.maneuver.location[0] }
        : null,
    };
  });

  return {
    coordinates,
    distance: route.distance,
    distanceText: formatDist(route.distance),
    duration: Math.round(route.duration),
    durationText: formatDuration(route.duration),
    steps,
    engine: "osrm",
  };
}

// ─── GraphHopper Route Fetcher ────────────────────────────────────────────────
async function fetchGraphHopper(srcLat, srcLng, dstLat, dstLng) {
  const params = new URLSearchParams({
    point: `${srcLat},${srcLng}`,
    key: GH_KEY,
    vehicle: "bike",
    locale: "en",
    points_encoded: "true",
    instructions: "true",
  });
  // GraphHopper accepts multiple 'point' params
  const url = `${GH_BASE}/route?${params}&point=${dstLat},${dstLng}`;

  const res = await fetch(url, { timeout: 10000 });
  if (!res.ok) throw new Error(`GraphHopper error: ${res.status}`);
  const data = await res.json();

  if (!data.paths?.length) throw new Error("No route found");

  const path = data.paths[0];
  const coordinates = decodePolyline(path.points);

  const steps = (path.instructions || []).map((inst) => {
    const action = parseManeuver(inst.sign, inst.text);
    return {
      action,
      streetName: inst.street_name || "",
      distance: inst.distance,
      distanceText: formatDist(inst.distance),
      duration: Math.round(inst.time / 1000),
      voice: buildVoice(action, inst.street_name, inst.distance),
      location:
        coordinates[inst.interval?.[0]]
          ? { lat: coordinates[inst.interval[0]][0], lng: coordinates[inst.interval[0]][1] }
          : null,
    };
  });

  return {
    coordinates,
    distance: path.distance,
    distanceText: formatDist(path.distance),
    duration: Math.round(path.time / 1000),
    durationText: formatDuration(path.time / 1000),
    steps,
    engine: "graphhopper",
  };
}

// ─── Cache key ────────────────────────────────────────────────────────────────
function cacheKey(srcLat, srcLng, dstLat, dstLng) {
  // Round to ~10m precision to improve cache hits
  const r = (n) => Math.round(n * 10000) / 10000;
  return `route:${r(srcLat)},${r(srcLng)}->${r(dstLat)},${r(dstLng)}:${ROUTING_ENGINE}`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    engine: ROUTING_ENGINE,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.post("/route", async (req, res) => {
  try {
    const { source, destination } = req.body;

    // Validate
    if (!source || !destination) {
      return res.status(400).json({ error: "source and destination required" });
    }

    const [srcLat, srcLng] = source.split(",").map(Number);
    const [dstLat, dstLng] = destination.split(",").map(Number);

    if ([srcLat, srcLng, dstLat, dstLng].some((n) => isNaN(n))) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Check cache
    const key = cacheKey(srcLat, srcLng, dstLat, dstLng);
    const cached = cache.get(key);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Fetch route
    let result;
    if (ROUTING_ENGINE === "graphhopper" && GH_KEY) {
      result = await fetchGraphHopper(srcLat, srcLng, dstLat, dstLng);
    } else {
      result = await fetchOSRM(srcLat, srcLng, dstLat, dstLng);
    }

    // Store in cache
    cache.set(key, result);

    res.json({ ...result, cached: false });
  } catch (err) {
    console.error("Route error:", err.message);
    res.status(500).json({ error: err.message || "Routing failed" });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚲 Biker Nav backend running on port ${PORT}`);
  console.log(`   Engine: ${ROUTING_ENGINE}`);
});
