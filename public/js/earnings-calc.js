// ThumbSnag - YouTube earnings calculator
// RPM ranges are 2026 published figures for a US audience; geo multipliers scale them.
(function () {
  "use strict";

  const NICHES = [
    { id: "finance", label: "Finance & Investing", low: 10, high: 30 },
    { id: "realestate", label: "Real Estate", low: 8, high: 20 },
    { id: "business", label: "Business & Entrepreneurship", low: 8, high: 18 },
    { id: "marketing", label: "Digital Marketing", low: 8, high: 16 },
    { id: "tech", label: "Tech & Software", low: 5, high: 12 },
    { id: "education", label: "Education & How-To", low: 4, high: 9 },
    { id: "health", label: "Health & Fitness", low: 3, high: 7 },
    { id: "travel", label: "Travel", low: 3, high: 6 },
    { id: "beauty", label: "Beauty & Fashion", low: 2.5, high: 5 },
    { id: "food", label: "Food & Cooking", low: 2, high: 4.5 },
    { id: "gaming", label: "Gaming", low: 1.5, high: 4 },
    { id: "entertainment", label: "Entertainment & Vlogs", low: 1.5, high: 3.5 },
    { id: "music", label: "Music", low: 0.75, high: 2 },
  ];

  const GEOS = [
    { id: "us", label: "United States", mult: 1.0 },
    { id: "uk", label: "United Kingdom", mult: 0.85 },
    { id: "ca", label: "Canada", mult: 0.8 },
    { id: "au", label: "Australia / New Zealand", mult: 0.8 },
    { id: "weu", label: "Western Europe", mult: 0.65 },
    { id: "jpkr", label: "Japan / South Korea", mult: 0.5 },
    { id: "global", label: "Mixed / global audience", mult: 0.45 },
    { id: "latam", label: "Latin America", mult: 0.2 },
    { id: "sea", label: "Southeast Asia", mult: 0.15 },
    { id: "in", label: "India", mult: 0.1 },
  ];

  const SHORTS_RPM = 0.1; // typical $0.05 to $0.15 per 1,000 Shorts views

  const nicheSel = document.getElementById("niche");
  const geoSel = document.getElementById("geo");
  const viewsInput = document.getElementById("views");
  const shortsSel = document.getElementById("shorts-pct");

  NICHES.forEach((n) => nicheSel.add(new Option(n.label, n.id)));
  GEOS.forEach((g) => geoSel.add(new Option(g.label, g.id)));

  const fmt = (v) =>
    "$" + (v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2));

  let lastResult = null;

  function calc() {
    const views = Math.max(0, Number(viewsInput.value) || 0);
    const niche = NICHES.find((n) => n.id === nicheSel.value) || NICHES[0];
    const geo = GEOS.find((g) => g.id === geoSel.value) || GEOS[0];
    const shortsPct = Number(shortsSel.value) / 100;

    const longViews = views * (1 - shortsPct);
    const shortViews = views * shortsPct;

    const lowRpm = niche.low * geo.mult;
    const highRpm = niche.high * geo.mult;
    const midRpm = (lowRpm + highRpm) / 2;

    const low = (longViews / 1000) * lowRpm + (shortViews / 1000) * SHORTS_RPM * 0.5;
    const high = (longViews / 1000) * highRpm + (shortViews / 1000) * SHORTS_RPM * 1.5;
    const mid = (longViews / 1000) * midRpm + (shortViews / 1000) * SHORTS_RPM;

    const blendedRpm = views > 0 ? mid / (views / 1000) : 0;

    document.getElementById("monthly-mid").textContent = fmt(mid);
    document.getElementById("monthly-range").textContent =
      "low " + fmt(low) + " to high " + fmt(high);
    document.getElementById("yearly").textContent = fmt(mid * 12);
    document.getElementById("rpm").textContent = fmt(blendedRpm);
    document.getElementById("per-view").textContent =
      views > 0 ? "$" + (mid / views).toFixed(4) : "$0";
    document.getElementById("views-1k").textContent =
      blendedRpm > 0
        ? Math.ceil(1000 / (blendedRpm / 1000)).toLocaleString("en-US") + " views"
        : "-";

    lastResult = { views, niche, geo, mid, low, high, blendedRpm };
    renderComparison(views, geo, shortsPct, niche.id);
  }

  // "Same views, every niche" comparison bars
  function renderComparison(views, geo, shortsPct, selectedId) {
    const list = document.getElementById("compare-list");
    const longViews = views * (1 - shortsPct);
    const shortViews = views * shortsPct;
    const rows = NICHES.map((n) => {
      const midRpm = ((n.low + n.high) / 2) * geo.mult;
      const mid = (longViews / 1000) * midRpm + (shortViews / 1000) * SHORTS_RPM;
      return { n, mid };
    }).sort((a, b) => b.mid - a.mid);
    const max = rows[0] ? rows[0].mid : 0;

    list.innerHTML = "";
    rows.forEach(({ n, mid }) => {
      const row = document.createElement("div");
      row.className = "compare-row" + (n.id === selectedId ? " selected" : "");
      const pct = max > 0 ? Math.max(3, Math.round((mid / max) * 100)) : 3;
      row.innerHTML =
        '<div class="cr-label"></div>' +
        '<div class="cr-bar-holder"><div class="cr-bar" style="width:' + pct + '%"></div></div>' +
        '<div class="cr-value">' + fmt(mid) + "</div>";
      row.querySelector(".cr-label").textContent =
        n.label + (n.id === selectedId ? " (you)" : "");
      list.appendChild(row);
    });
  }

  document.getElementById("calc-btn").addEventListener("click", calc);
  [viewsInput, nicheSel, geoSel, shortsSel].forEach((el) =>
    el.addEventListener("input", calc)
  );

  // ---- Shareable result card (canvas PNG) ----
  document.getElementById("share-btn").addEventListener("click", () => {
    if (!lastResult) calc();
    const r = lastResult;
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 630;
    const ctx = c.getContext("2d");

    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGrad.addColorStop(0, "#0c0e13");
    bgGrad.addColorStop(1, "#141a28");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    ctx.fillStyle = "#ff5a45";
    ctx.fillRect(0, 0, 1200, 8);

    ctx.fillStyle = "#eef1f7";
    ctx.font = "800 42px Inter, sans-serif";
    ctx.fillText("ThumbSnag", 70, 100);
    ctx.fillStyle = "#9aa3b5";
    ctx.font = "600 26px Inter, sans-serif";
    ctx.fillText("YouTube Earnings Estimate", 70, 145);

    ctx.fillStyle = "#3ddc97";
    ctx.font = "800 110px Inter, sans-serif";
    ctx.fillText(fmt(r.mid) + "/mo", 70, 300);

    ctx.fillStyle = "#eef1f7";
    ctx.font = "600 30px Inter, sans-serif";
    ctx.fillText(
      r.views.toLocaleString("en-US") + " monthly views • " + r.niche.label,
      70,
      370
    );
    ctx.fillStyle = "#9aa3b5";
    ctx.fillText(
      "Audience: " + r.geo.label + " • RPM " + fmt(r.blendedRpm),
      70,
      415
    );
    ctx.fillText(
      "Range: " + fmt(r.low) + " to " + fmt(r.high) + " per month",
      70,
      460
    );

    ctx.fillStyle = "#ff5a45";
    ctx.font = "700 28px Inter, sans-serif";
    ctx.fillText("thumbsnag.com/youtube-earnings-calculator", 70, 560);

    const a = document.createElement("a");
    a.download = "thumbsnag-earnings-estimate.png";
    a.href = c.toDataURL("image/png");
    a.click();
  });

  calc();
})();
