// Applies the saved light/dark choice before the first paint, so the page never flashes the other colours.
// Load it as a plain blocking script at the top of <head>: <script src="/theme-init.js"></script>
// The key and values match src/lib/theme.ts.
/* global document */
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') document.documentElement.classList.add(saved);
  } catch {
    // Storage blocked: the system setting applies.
  }
})();
