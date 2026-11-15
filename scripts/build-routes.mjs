// Berekent echte autoroutes (OSRM, OpenStreetMap-data) voor elke rit in DAY_LEGS
// en schrijft ze als compacte polylines in index.html tussen de ROADS-markers.
// Opnieuw draaien na het wijzigen van PLACES, DAY_LEGS of DRIVE_TO: node scripts/build-routes.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "index.html");
const OSRM = "https://router.project-osrm.org/route/v1/driving/";

// Waar de auto echt naartoe rijdt als de pin zelf niet aan een weg ligt (kabelbaan-dalstations).
const DRIVE_TO = {
  h3: [46.5402, 11.5637],  // Seiser Alm Bahn, dalstation Seis
  h4: [46.5770, 11.6739],  // Seceda-kabelbaan, Ortisei (bushalte Seceda)
  h11: [46.5187, 12.0387], // Cinque Torri-stoeltjeslift, Bai de Dònes
  h12b: [46.6123, 12.2939] // Rifugio Auronzo, parking tolweg Tre Cime
};
const LONG = new Set(["home", "ulm"]); // lange snelwegritten mogen grover

const html = fs.readFileSync(FILE, "utf8");
const grab = name => {
  const m = html.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]|\\{[\\s\\S]*?\\n\\});`));
  if (!m) throw new Error(`${name} niet gevonden in index.html`);
  return new Function(`return ${m[1]}`)();
};
const PLACES = grab("PLACES");
const DAY_LEGS = grab("DAY_LEGS");
const where = id => {
  if (DRIVE_TO[id]) return DRIVE_TO[id];
  const p = PLACES.find(q => q.id === id);
  if (!p) throw new Error(`Onbekende plek ${id}`);
  return [p.lat, p.lon];
};

// Douglas-Peucker op [lon,lat]
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, idx = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, len = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = pts[i];
      let t = len ? ((x - x1) * dx + (y - y1) * dy) / len : 0; t = Math.max(0, Math.min(1, t));
      const ex = x1 + t * dx - x, ey = y1 + t * dy - y, d = ex * ex + ey * ey;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol * tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// Google polyline-encoding, precisie 5, invoer [lon,lat]
function encode(pts) {
  let out = "", pLat = 0, pLon = 0;
  const enc = v => { v = v < 0 ? ~(v << 1) : v << 1; let s = ""; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
  for (const [lon, lat] of pts) {
    const la = Math.round(lat * 1e5), lo = Math.round(lon * 1e5);
    out += enc(la - pLat) + enc(lo - pLon); pLat = la; pLon = lo;
  }
  return out;
}

const legs = [...new Set(Object.values(DAY_LEGS).flat().map(([a, b]) => `${a}>${b}`))];
const roads = {};
for (const key of legs) {
  const [a, b] = key.split(">"), A = where(a), B = where(b);
  const url = `${OSRM}${A[1]},${A[0]};${B[1]},${B[0]}?overview=full&geometries=geojson`;
  const r = await fetch(url, { headers: { "user-agent": "trip-planner-route-builder" } });
  const j = await r.json();
  if (j.code !== "Ok") throw new Error(`${key}: ${j.code} ${j.message || ""}`);
  const rt = j.routes[0], tol = LONG.has(a) || LONG.has(b) ? 0.0006 : 0.00012;
  const pts = simplify(rt.geometry.coordinates, tol);
  roads[key] = { km: Math.round(rt.distance / 100) / 10, min: Math.round(rt.duration / 60), p: encode(pts) };
  console.log(`${key.padEnd(10)} ${String(roads[key].km).padStart(6)} km ${String(roads[key].min).padStart(4)} min  ${pts.length} punten`);
  await new Promise(res => setTimeout(res, 1100));
}

const block = `/* ROADS:start - gegenereerd door scripts/build-routes.mjs (OSRM, © OpenStreetMap-bijdragers) */\nconst ROADS = ${JSON.stringify(roads)};\n/* ROADS:end */`;
const out = html.replace(/\/\* ROADS:start[\s\S]*?\/\* ROADS:end \*\//, block);
if (out === html && !html.includes(block)) throw new Error("ROADS-markers niet gevonden in index.html");
fs.writeFileSync(FILE, out);
console.log(`${legs.length} ritten geschreven, ${(block.length / 1024).toFixed(1)} KB`);
