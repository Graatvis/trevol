import { COLLS, authorized, loadState, saveState } from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!authorized(req)) return res.status(401).json({ error: "code" });
  try {
    if (req.method === "GET") return res.status(200).json(await loadState());
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const data = await loadState();
      if (b.coll === "settings") {
        if (!b.data || typeof b.data !== "object") return res.status(400).json({ error: "bad" });
        data.settings = b.data;
      } else if (COLLS.includes(b.coll) && typeof b.id === "string" && b.id.length < 80) {
        data[b.coll] = data[b.coll] || {};
        if (b.data === null) delete data[b.coll][b.id];
        else if (typeof b.data === "object") data[b.coll][b.id] = b.data;
        else return res.status(400).json({ error: "bad" });
      } else return res.status(400).json({ error: "bad" });
      const size = JSON.stringify(data).length;
      if (size > 4_000_000) return res.status(413).json({ error: "full" });
      await saveState(data);
      return res.status(200).json(data);
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server" });
  }
}
