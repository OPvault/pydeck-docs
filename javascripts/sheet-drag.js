/*
 * Mobile bottom-sheet drag-to-dismiss for the navigation drawer.
 * The drag starts on the sheet's title/handle area only, so scrolling
 * the nav list is unaffected. Uses inline !important transforms so it
 * overrides the stylesheet's !important open/closed states.
 *
 * Delegated on document so it survives Material's instant navigation
 * (which swaps the sidebar DOM without a full page reload).
 */
(function () {
  var bp = window.matchMedia("(max-width: 76.1875em)");
  var HANDLE = ".md-sidebar--primary .md-nav--primary > .md-nav__title";

  var sheet = null;
  var startY = 0;
  var delta = 0;
  var dragging = false;
  var active = false;

  function drawer() {
    return document.getElementById("__drawer");
  }

  document.addEventListener(
    "touchstart",
    function (e) {
      if (!bp.matches) return;
      var title = e.target.closest && e.target.closest(HANDLE);
      if (!title) return;
      sheet = title.closest(".md-sidebar--primary");
      if (!sheet) return;
      active = true;
      dragging = false;
      delta = 0;
      startY = e.touches[0].clientY;
      sheet.style.setProperty("transition", "none", "important");
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    function (e) {
      if (!active || !sheet) return;
      delta = e.touches[0].clientY - startY;
      if (delta < 0) delta = 0; // only allow dragging downward
      if (delta > 6) dragging = true;
      if (dragging) {
        e.preventDefault(); // stop page scroll and the label's tap-to-close
        sheet.style.setProperty(
          "transform",
          "translateY(" + delta + "px)",
          "important"
        );
      }
    },
    { passive: false }
  );

  function finish(e) {
    if (!active) return;
    active = false;
    var s = sheet;
    sheet = null;
    if (!s) return;
    s.style.removeProperty("transition"); // restore the CSS slide transition

    if (!dragging) return; // a plain tap: let the label close the drawer normally
    if (e && e.cancelable) e.preventDefault(); // suppress the click after a drag

    var threshold = Math.min(140, s.offsetHeight * 0.28);
    if (delta > threshold) {
      // Fling/drag past threshold: animate the rest of the way down, then close.
      s.style.setProperty("transform", "translateY(100%)", "important");
      var closed = false;
      var done = function (ev) {
        if (ev && ev.propertyName && ev.propertyName !== "transform") return;
        if (closed) return;
        closed = true;
        var d = drawer();
        if (d) d.checked = false;
        s.style.removeProperty("transform");
        s.removeEventListener("transitionend", done);
      };
      s.addEventListener("transitionend", done);
      setTimeout(done, 350); // fallback if transitionend doesn't fire
    } else {
      // Not far enough: snap back to the open position.
      s.style.removeProperty("transform");
    }
    dragging = false;
  }

  document.addEventListener("touchend", finish, { passive: false });
  document.addEventListener("touchcancel", finish, { passive: true });
})();

/*
 * Mobile: tapping anywhere on the header bar (its empty space / title)
 * opens the navigation drawer — not just the small hamburger icon.
 * Clicks on the real controls (logo, theme toggle, search, source, and
 * the hamburger/search labels themselves) keep their own behavior.
 */
(function () {
  var bp = window.matchMedia("(max-width: 76.1875em)");
  document.addEventListener("click", function (e) {
    if (!bp.matches) return;
    var header = e.target.closest && e.target.closest(".md-header");
    if (!header) return;
    // Leave interactive controls alone.
    if (
      e.target.closest(
        'a, button, input, label, .md-search, [data-md-component="palette"], .md-header__source, .md-tabs'
      )
    )
      return;
    var d = document.getElementById("__drawer");
    if (d) d.checked = !d.checked;
  });
})();
