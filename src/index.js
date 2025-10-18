import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(morgan("tiny"));

const PORT = parseInt(process.env.PORT || "3000", 10);
const TTL_MS = Math.max(0, parseInt(process.env.CACHE_TTL || "300", 10)) * 1000;

const cache = new Map(); // key=userId string -> { data, expires }

/** simple digit guard */
function isDigits(x) {
  return typeof x === "string" && /^[0-9]+$/.test(x);
}

/** fetch from Roblox thumbnails API and cache */
async function fetchHeadshot(userId) {
  const key = String(userId);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now < hit.expires) return hit.data;

  const upstream = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(
    key
  )}&size=420x420&format=Png&isCircular=false`;

  const resp = await fetch(upstream, { headers: { Accept: "application/json" } });
  if (!resp.ok) {
    throw new Error(`upstream ${resp.status}`);
  }
  const json = await resp.json();
  const item = json && json.data && json.data[0];
  if (!item) throw new Error("no data");
  cache.set(key, { data: item, expires: now + TTL_MS });
  return item;
}

/** GET /v1/headshot?userId=123 -> JSON with imageUrl + raw */
app.get("/v1/headshot", async (req, res) => {
  const userId = String(req.query.userId || "").trim();
  if (!isDigits(userId)) return res.status(400).json({ error: "invalid userId" });
  try {
    const item = await fetchHeadshot(userId);
    res.json({
      targetId: item.targetId,
      state: item.state,
      imageUrl: item.imageUrl || null,
      version: item.version || null,
      raw: item
    });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

/** GET /v1/headshot/url?userId=123 -> text/plain image URL or empty */
app.get("/v1/headshot/url", async (req, res) => {
  const userId = String(req.query.userId || "").trim();
  if (!isDigits(userId)) return res.status(400).type("text/plain").send("");
  try {
    const item = await fetchHeadshot(userId);
    res.type("text/plain").send(item.imageUrl || "");
  } catch {
    res.status(502).type("text/plain").send("");
  }
});

/** GET /v1/headshot/redirect?userId=123 -> 302 to image URL, 202 if not ready */
app.get("/v1/headshot/redirect", async (req, res) => {
  const userId = String(req.query.userId || "").trim();
  if (!isDigits(userId)) return res.status(400).send("invalid userId");
  try {
    const item = await fetchHeadshot(userId);
    if (item.imageUrl) return res.redirect(302, item.imageUrl);
    res.setHeader("Retry-After", "15");
    res.status(202).send("not ready");
  } catch {
    res.status(502).send("upstream error");
  }
});

/** health */
app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`roblox-headshot-proxy listening on :${PORT}`);
});
