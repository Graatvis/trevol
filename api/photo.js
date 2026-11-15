import { put, del } from "@vercel/blob";
import { authorized } from "./_lib.js";


export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!authorized(req)) return res.status(401).json({ error: "code" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (req.method === "POST") {
      const place = String(b.place || "x").replace(/[^a-z0-9]/gi, "").slice(0, 20);
      if (typeof b.data !== "string") return res.status(400).json({ error: "bad" });
      const buf = Buffer.from(b.data, "base64");
      if (buf.length > 3_000_000) return res.status(413).json({ error: "too_large" });
      if (buf[0] !== 0xff || buf[1] !== 0xd8) return res.status(415).json({ error: "jpeg" });
      const r = await put(`photos/${place}.jpg`, buf, { access: "public", addRandomSuffix: true, contentType: "image/jpeg" });
      return res.status(200).json({ url: r.url });
    }
    if (req.method === "DELETE") {
      if (typeof b.url !== "string" || !/\.blob\.vercel-storage\.com\/photos\//.test(b.url)) return res.status(400).json({ error: "bad" });
      await del(b.url);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "POST, DELETE");
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server" });
  }
}
