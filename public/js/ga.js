// PlayMETRIC - GA4 loader
// Paste the real measurement ID (looks like G-XXXXXXXXXX) below and redeploy.
// Until then this file safely does nothing.
(function () {
  var ID = "PASTE-GA4-ID-HERE";
  if (!/^G-[A-Z0-9]{6,}$/.test(ID)) return;

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", ID, { anonymize_ip: true });

  // Track tool usage: downloads, batch zips, calculator share cards
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='/api/download'], a[download], #batch-btn, #share-btn, #lineup-btn");
    if (!a) return;
    var label = a.id || (a.getAttribute("download") || a.getAttribute("href") || "unknown");
    gtag("event", "tool_action", { action_label: String(label).slice(0, 80) });
  });
})();
