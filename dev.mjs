// Lokale dev-server: serveert index.html en bootst /api/state en /api/photo na
// met een JSON-bestand en een fotomap op schijf (geen Vercel Blob nodig).
// Start: npm run dev   (code: ACCESS_CODE of standaard "dev")
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import seed from "./api/_seed.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(ROOT, ".dev-state.json");
const PHOTOS = path.join(ROOT, ".dev-photos");
const PORT = Number(process.env.PORT) || 3000;
const CODE = process.env.ACCESS_CODE || "dev";
const COLLS = ["checks", "gear", "exp", "todos", "notes", "photos"];

async function loadState() {
  try { return JSON.parse(await fs.readFile(STATE, "utf8")); } catch { return structuredClone(seed); }
}
const saveState = d => fs.writeFile(STATE, JSON.stringify(d, null, 1));

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const t = Buffer.concat(chunks).toString();
  return t ? JSON.parse(t) : {};
}

async function state(req, res) {
  if (req.method === "GET") return send(res, 200, await loadState());
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await readBody(req);
  const data = await loadState();
  if (b.coll === "settings") {
    if (!b.data || typeof b.data !== "object") return send(res, 400, { error: "bad" });
    data.settings = b.data;
  } else if (COLLS.includes(b.coll) && typeof b.id === "string" && b.id.length < 80) {
    data[b.coll] = data[b.coll] || {};
    if (b.data === null) delete data[b.coll][b.id];
    else if (typeof b.data === "object") data[b.coll][b.id] = b.data;
    else return send(res, 400, { error: "bad" });
  } else return send(res, 400, { error: "bad" });
  await saveState(data);
  send(res, 200, data);
}

async function photo(req, res) {
  const b = await readBody(req);
  if (req.method === "POST") {
    const place = String(b.place || "x").replace(/[^a-z0-9]/gi, "").slice(0, 20);
    const buf = Buffer.from(String(b.data || ""), "base64");
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return send(res, 415, { error: "jpeg" });
    await fs.mkdir(PHOTOS, { recursive: true });
    const name = `${place}-${crypto.randomBytes(4).toString("hex")}.jpg`;
    await fs.writeFile(path.join(PHOTOS, name), buf);
    return send(res, 200, { url: `/.dev-photos/${name}` });
  }
  if (req.method === "DELETE") {
    const name = path.basename(String(b.url || ""));
    await fs.rm(path.join(PHOTOS, name), { force: true });
    return send(res, 200, { ok: true });
  }
  send(res, 405, { error: "method" });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname.startsWith("/api/")) {
      if (req.headers["x-code"] !== CODE) return send(res, 401, { error: "code" });
      if (url.pathname === "/api/state") return await state(req, res);
      if (url.pathname === "/api/photo") return await photo(req, res);
      return send(res, 404, { error: "not found" });
    }
    if (url.pathname.startsWith("/.dev-photos/")) {
      const f = path.join(PHOTOS, path.basename(url.pathname));
      return send(res, 200, await fs.readFile(f), "image/jpeg");
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return send(res, 200, await fs.readFile(path.join(ROOT, "index.html")), "text/html; charset=utf-8");
    }
    send(res, 404, "Niet gevonden", "text/plain");
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "server" });
  }
}).listen(PORT, () => console.log(`Dolomieten 2027 lokaal op http://localhost:${PORT}  (code: ${CODE})`));
