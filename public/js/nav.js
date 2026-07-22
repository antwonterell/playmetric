// PlayMETRIC - mobile nav toggle
(function () {
  var header = document.querySelector(".site-header");
  var btn = document.querySelector(".nav-toggle");
  if (!header || !btn) return;

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    var open = header.classList.toggle("nav-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Tap anywhere else (or pick a link) closes the menu
  document.addEventListener("click", function (e) {
    if (!header.classList.contains("nav-open")) return;
    if (e.target.closest(".nav-toggle")) return;
    header.classList.remove("nav-open");
    btn.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && header.classList.contains("nav-open")) {
      header.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
})();
