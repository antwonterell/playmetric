// ThumbSnag - thumbnail downloader frontend
(function () {
  "use strict";

  const urlInput = document.getElementById("url-input");
  const grabBtn = document.getElementById("grab-btn");
  const singleError = document.getElementById("single-error");
  const results = document.getElementById("results");
  const grid = document.getElementById("thumb-grid");
  const mockLarge = document.getElementById("mock-large");
  const mockSmall = document.getElementById("mock-small");
  const analyzerGrid = document.getElementById("analyzer-grid");

  const batchInput = document.getElementById("batch-input");
  const batchBtn = document.getElementById("batch-btn");
  const batchQuality = document.getElementById("batch-quality");
  const batchError = document.getElementById("batch-error");

  // ---- Tabs ----
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("pane-" + btn.dataset.tab).classList.add("active");
    });
  });

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.add("show");
  }
  function clearError(el) {
    el.textContent = "";
    el.classList.remove("show");
  }

  // ---- Single video flow ----
  async function grab() {
    const url = urlInput.value.trim();
    if (!url) return;
    clearError(singleError);
    grabBtn.disabled = true;
    grabBtn.textContent = "Snagging...";
    try {
      const res = await fetch("/api/thumbnails?url=" + encodeURIComponent(url));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      render(data);
    } catch (err) {
      results.classList.add("hidden");
      showError(singleError, err.message);
    } finally {
      grabBtn.disabled = false;
      grabBtn.textContent = "Snag it";
    }
  }

  grabBtn.addEventListener("click", grab);
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") grab();
  });
  // Paste-and-go: fire right after the pasted text lands in the input
  urlInput.addEventListener("paste", () => setTimeout(grab, 60));

  function render(data) {
    const available = data.thumbnails.filter((t) => t.available);
    if (available.length === 0) {
      showError(singleError, "No thumbnails found for that video. Is it public?");
      return;
    }
    grid.innerHTML = "";
    for (const t of available) {
      const card = document.createElement("div");
      card.className = "thumb-card";
      card.innerHTML =
        '<div class="img-holder"><img loading="lazy" alt="YouTube thumbnail ' +
        t.width + "x" + t.height + '"></div>' +
        '<div class="meta"><span class="res-label">' + t.label + "</span>" +
        (t.file === "maxresdefault" ? '<span class="badge">best quality</span>' : "") +
        '<div class="res-size">' + t.width + " x " + t.height + " px</div>" +
        '<div class="actions">' +
        '<a class="btn sm" href="/api/download?id=' + data.videoId + "&file=" + t.file + '">Download</a>' +
        '<button class="btn ghost sm copy-btn">Copy URL</button>' +
        "</div></div>";
      card.querySelector("img").src = t.url;
      card.querySelector(".copy-btn").addEventListener("click", async (e) => {
        await navigator.clipboard.writeText(t.url);
        e.target.textContent = "Copied!";
        setTimeout(() => (e.target.textContent = "Copy URL"), 1500);
      });
      grid.appendChild(card);
    }

    const best = available[0];
    mockLarge.src = best.url;
    mockSmall.src = best.url;
    results.classList.remove("hidden");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
    analyze(data.videoId, best.file);
  }

  // ---- Analyzer: brightness, contrast, palette from canvas ----
  async function analyze(videoId, file) {
    analyzerGrid.innerHTML = '<div class="stat-tile"><div class="k">Analyzing</div><div class="v">...</div></div>';
    try {
      // Pull through our own proxy so the canvas is not CORS-tainted
      const blob = await fetch("/api/download?id=" + videoId + "&file=" + file).then((r) => r.blob());
      const img = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      const w = (canvas.width = 160);
      const h = (canvas.height = 90);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);

      let sum = 0;
      const lums = [];
      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += lum;
        lums.push(lum);
        // coarse 32-step color bucket for dominant palette
        const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
        const cur = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
        cur.n++; cur.r += r; cur.g += g; cur.b += b;
        buckets.set(key, cur);
      }
      const n = lums.length;
      const mean = sum / n;
      const variance = lums.reduce((a, l) => a + (l - mean) * (l - mean), 0) / n;
      const stdev = Math.sqrt(variance);

      const palette = [...buckets.values()]
        .sort((a, b) => b.n - a.n)
        .slice(0, 5)
        .map((c) => "rgb(" + Math.round(c.r / c.n) + "," + Math.round(c.g / c.n) + "," + Math.round(c.b / c.n) + ")");

      const brightPct = Math.round((mean / 255) * 100);
      const contrastScore = Math.round((stdev / 128) * 100);

      const brightVerdict =
        brightPct < 25 ? "Very dark. Dark thumbnails disappear in YouTube's dark mode feed."
        : brightPct > 80 ? "Very bright. Make sure text still stands out."
        : "Good range. Neither washed out nor invisible.";
      const contrastVerdict =
        contrastScore < 25 ? "Low contrast. Faces and text may blend together at small sizes."
        : contrastScore > 60 ? "Punchy contrast. This tends to pull clicks."
        : "Decent contrast. Could push highlights harder for the sidebar size.";

      analyzerGrid.innerHTML = "";
      addTile("Brightness", brightPct + "%", brightVerdict);
      addTile("Contrast", contrastScore + "/100", contrastVerdict);

      const palTile = document.createElement("div");
      palTile.className = "stat-tile";
      palTile.innerHTML = '<div class="k">Dominant colors</div><div class="palette-row"></div>' +
        '<div class="d">3 or fewer strong colors usually beats a rainbow.</div>';
      const row = palTile.querySelector(".palette-row");
      palette.forEach((c) => {
        const sw = document.createElement("div");
        sw.className = "palette-swatch";
        sw.style.background = c;
        row.appendChild(sw);
      });
      analyzerGrid.appendChild(palTile);
    } catch (err) {
      analyzerGrid.innerHTML = '<div class="stat-tile"><div class="k">Analyzer</div><div class="d">Could not analyze this image.</div></div>';
    }
  }

  function addTile(k, v, d) {
    const el = document.createElement("div");
    el.className = "stat-tile";
    el.innerHTML = '<div class="k"></div><div class="v"></div><div class="d"></div>';
    el.querySelector(".k").textContent = k;
    el.querySelector(".v").textContent = v;
    el.querySelector(".d").textContent = d;
    analyzerGrid.appendChild(el);
  }

  // ---- Batch flow ----
  batchBtn.addEventListener("click", async () => {
    const urls = batchInput.value.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    clearError(batchError);
    if (urls.length === 0) {
      showError(batchError, "Paste at least one YouTube link.");
      return;
    }
    batchBtn.disabled = true;
    batchBtn.textContent = "Zipping...";
    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urls, file: batchQuality.value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Batch download failed.");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "thumbsnag-thumbnails.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      showError(batchError, err.message);
    } finally {
      batchBtn.disabled = false;
      batchBtn.textContent = "Download all as ZIP";
    }
  });
})();
