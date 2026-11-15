import { put, get } from "@vercel/blob";
import seed from "./_seed.js";

export const COLLS = ["checks", "gear", "exp", "todos", "notes", "photos"];

export function authorized(req) {
  const code = process.env.ACCESS_CODE;
  return !!code && req.headers["x-code"] === code;
}

function statePath() {
  return `state/${process.env.STATE_KEY || "default"}.json`;
}

export async function loadState() {
  const res = await get(statePath(), { access: "public", useCache: false });
  if (!res || !res.stream) return structuredClone(seed);
  const text = await new Response(res.stream).text();
  try { return JSON.parse(text); } catch { return structuredClone(seed); }
}

export async function saveState(data) {
  await put(statePath(), JSON.stringify(data), {
    access: "public", addRandomSuffix: false, allowOverwrite: true,
    contentType: "application/json", cacheControlMaxAge: 60
  });
}
