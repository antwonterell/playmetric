// server.js - ThumbSnag
// Free YouTube creator tools: thumbnail downloader + earnings calculator
// Lean by design: no file storage, no heavy processing, images stream through.

const express = require("express");
const path = require("path");
const archiver = require("archiver");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
// Render sits behind a proxy; without this, every request looks like it comes
// from the load balancer IP and rate limiting punishes everyone at once.
app.set("trust proxy", 1);

app.use(express.json({ limit: "50kb" }));

// ============================================
// SECURITY HEADERS
// ============================================
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob: https://i.ytimg.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; script-src 'self'; " +
      "connect-src 'self'"
  );
  next();
});

// ============================================
// RATE LIMITING (in-memory, health checks exempt)
// ============================================
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 60; // requests per IP per minute on /api routes
const hits = new Map();

setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [ip, entry] of hits) {
    if (entry.start < cutoff) hits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

app.use("/api", (req, res, next) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  let entry = hits.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    entry = { start: now, count: 0 };
    hits.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_MAX) {
    return res.status(429).json({ error: "Too many requests. Slow down a little." });
  }
  next();
});

// ============================================
// YOUTUBE HELPERS
// ============================================
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// Accepts: full watch URLs, youtu.be, shorts, embed, live, or a bare 11-char ID
function extractVideoId(input) {
  if (!input || typeof input !== "string") return null;
  const raw = input.trim();
  if (VIDEO_ID_RE.test(raw)) return raw;

  let url;
  try {
    url = new URL(raw.startsWith("http") ? raw : "https://" + raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return VIDEO_ID_RE.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && VIDEO_ID_RE.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    // /shorts/ID, /embed/ID, /live/ID, /v/ID
    if (parts.length >= 2 && ["shorts", "embed", "live", "v"].includes(parts[0])) {
      return VIDEO_ID_RE.test(parts[1]) ? parts[1] : null;
    }
  }
  return null;
}

const RESOLUTIONS = [
  { file: "maxresdefault", label: "Max HD", width: 1280, height: 720 },
  { file: "sddefault", label: "SD", width: 640, height: 480 },
  { file: "hqdefault", label: "High", width: 480, height: 360 },
  { file: "mqdefault", label: "Medium", width: 320, height: 180 },
  { file: "default", label: "Small", width: 120, height: 90 },
];
// YouTube also auto-captures three alternate frames per video
const FRAMES = [
  { file: "hq1", label: "Frame 1", width: 480, height: 360 },
  { file: "hq2", label: "Frame 2", width: 480, height: 360 },
  { file: "hq3", label: "Frame 3", width: 480, height: 360 },
];
const RES_FILES = new Set([...RESOLUTIONS, ...FRAMES].map((r) => r.file));

function thumbUrl(id, file) {
  return `https://i.ytimg.com/vi/${id}/${file}.jpg`;
}

async function fetchThumb(id, file) {
  const res = await fetch(thumbUrl(id, file), {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  // YouTube serves a 1097-byte gray placeholder for some missing sizes
  if (buf.length < 2000 && file !== "default") return null;
  return buf;
}

// ============================================
// API ROUTES
// ============================================

// Which resolutions actually exist for this video
app.get("/api/thumbnails", async (req, res) => {
  const id = extractVideoId(String(req.query.url || ""));
  if (!id) {
    return res.status(400).json({ error: "That does not look like a YouTube link or video ID." });
  }
  try {
    const check = async (r, lenient) => {
      const head = await fetch(thumbUrl(id, r.file), {
        method: "HEAD",
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      const len = head && head.ok ? Number(head.headers.get("content-length") || 0) : 0;
      const available = !!(head && head.ok) && (lenient || len === 0 || len >= 2000);
      return { ...r, url: thumbUrl(id, r.file), available };
    };
    const [thumbnails, frames] = await Promise.all([
      Promise.all(RESOLUTIONS.map((r) => check(r, r.file === "default"))),
      Promise.all(FRAMES.map((r) => check(r, true))),
    ]);
    res.json({ videoId: id, thumbnails, frames });
  } catch (err) {
    console.error("thumbnails error:", err.message);
    res.status(502).json({ error: "Could not reach YouTube's image servers. Try again." });
  }
});

// Proxy a single thumbnail with a download filename
app.get("/api/download", async (req, res) => {
  const id = String(req.query.id || "");
  const file = String(req.query.file || "maxresdefault");
  if (!VIDEO_ID_RE.test(id) || !RES_FILES.has(file)) {
    return res.status(400).json({ error: "Invalid request." });
  }
  try {
    const buf = await fetchThumb(id, file);
    if (!buf) return res.status(404).json({ error: "That resolution is not available for this video." });
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${id}-${file}.jpg"`);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) {
    console.error("download error:", err.message);
    res.status(502).json({ error: "Download failed. Try again." });
  }
});

// Batch: zip up thumbnails for up to 20 videos
app.post("/api/batch", async (req, res) => {
  const { urls, file } = req.body || {};
  const quality = RES_FILES.has(file) ? file : "maxresdefault";
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Paste at least one YouTube link." });
  }
  const ids = [...new Set(urls.map(extractVideoId).filter(Boolean))].slice(0, 20);
  if (ids.length === 0) {
    return res.status(400).json({ error: "No valid YouTube links found." });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="thumbsnag-thumbnails.zip"');

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (err) => {
    console.error("zip error:", err.message);
    res.destroy();
  });
  archive.pipe(res);

  for (const id of ids) {
    // Fall back through resolutions so every video yields something
    let buf = await fetchThumb(id, quality).catch(() => null);
    let used = quality;
    if (!buf) {
      buf = await fetchThumb(id, "hqdefault").catch(() => null);
      used = "hqdefault";
    }
    if (buf) archive.append(buf, { name: `${id}-${used}.jpg` });
  }
  archive.finalize();
});

// ============================================
// STATIC SITE + HEALTH
// ============================================
app.get("/healthz", (req, res) => res.json({ status: "ok" }));

app.use(
  express.static(path.join(__dirname, "public"), {
    extensions: ["html"],
    maxAge: "1h",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    },
  })
);

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "public", "404.html")));

app.listen(PORT, () => {
  console.log(`ThumbSnag running on port ${PORT}`);
});
