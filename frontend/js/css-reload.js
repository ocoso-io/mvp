/* css-reload.js — importierte CSS einmalig „neu“ laden (Cache-Buster),
   ohne HTML umzubauen. Spätere @imports > überschreiben frühere. */
(function () {
  // Nur einmal pro Aufruf
  if (document.documentElement.dataset.cssReloaded) return;
  document.documentElement.dataset.cssReloaded = "1";

  const BUST = Date.now().toString();

  // @import-Parser: zieht URL + optionales Media
  const IMPORT_RE = /@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?(?:\s+([^;]+))?;/gi;

  // Alle <link rel="stylesheet"> durchgehen und ihre @imports „später“ erneut laden
  function reimportWithBust(linkEl) {
    const href = linkEl.getAttribute("href");
    if (!href || !/\.css(\?|#|$)/i.test(href)) return;

    const base = new URL(href, location.href);

    fetch(base.href, { cache: "no-cache" })
      .then(r => (r.ok ? r.text() : Promise.reject(r.status)))
      .then(cssText => {
        IMPORT_RE.lastIndex = 0;
        let m, imports = [];
        while ((m = IMPORT_RE.exec(cssText))) {
          try {
            const rel = m[1];                    // z. B. "01-typography.css"
            const media = (m[2] || "").trim();   // z. B. "screen and (min-width:720px)"
            const abs = new URL(rel, base);      // korrekt relativ zu main.css auflösen
            const bustURL = abs.pathname + "?v=" + BUST + abs.hash;
            const mediaPart = media ? " " + media : "";
            imports.push(`@import url("${bustURL}");${mediaPart ? " /* " + media + " */" : ""}`);
          } catch { /* still */ }
        }

        if (!imports.length) return;

        // Spätes <style> anhängen → gewinnt im Cascade-Konflikt
        const style = document.createElement("style");
        style.setAttribute("data-css-reload", "1");
        // Wichtig: getrennte Zeilen (sicherer bzgl. Parser)
        style.textContent = imports.join("\n");
        document.head.appendChild(style);

        // Debug
        // console.log("[CSS] re-imported with bust v=" + BUST, imports);
      })
      .catch(() => { /* still */ });
  }

  // Nach DOM bereit starten (CSS-Links sind im DOM)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll('link[rel="stylesheet"]').forEach(reimportWithBust);
    });
  } else {
    document.querySelectorAll('link[rel="stylesheet"]').forEach(reimportWithBust);
  }

  // Optional: bfcache-Rückkehr absichern (Safari/Firefox)
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      document.querySelectorAll('link[rel="stylesheet"]').forEach(reimportWithBust);
    }
  });
})();