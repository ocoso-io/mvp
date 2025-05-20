/**
 * Comic Carousel v1.4 — cross-platform drag & scroll lock
 * -------------------------------------------------------
 *  • Lock greift, sobald ≥ 85 % der Section sichtbar sind
 *  • Sanftes LERP-Scrolling, direkter Drag ohne Verzögerung
 *  • Einheitliche Pointer-Erkennung (Chrome, Firefox, Safari, iOS, Android)
 *  • Mobile < 768 px immer ohne Scroll-Lock
 */

(function () {
  "use strict";

  /* ===== Konfiguration =================================== */
  const STEP  = 10;     // 1 Rad-Schritt = Kartenbreite/STEP
  const LERP  = 0.18;   // 0 … 1 → Animations-Glättung
  const BP    = 768;    // Mobile-Breakpoint
  const TOL   = 100;    // Lock-Toleranz um Viewport-Mitte
  const FACT_MOUSE = 4; // Drag-Faktor Maus/Trackpad
  const FACT_TOUCH = 6; // Drag-Faktor Touch (iOS/Android)

  /* ===== Helfer ========================================== */
  const clamp  = (v, a, b) => Math.max(a, Math.min(v, b));
  const mobile = () => matchMedia(`(max-width:${BP}px)`).matches;

  /* ===== Globale State-Variablen ========================= */
  let offset = 0, target = 0;
  let anim = false, dragging = false, locked = false;

  /* ===== Sichtbarkeits-Logik (Scroll-Lock) =============== */
  const engaged = rect => {
    const V = innerHeight;
    if (rect.height > V) return false;
    const fully = rect.top >= 0 && rect.bottom <= V;
    if (!fully) return false;
    const centerDist = (rect.top + rect.bottom) / 2 - V / 2;
    return Math.abs(centerDist) <= TOL;
  };

  /* ===== Nach DOM-Ready starten ========================= */
  document.addEventListener("DOMContentLoaded", () => {
    const zone = document.querySelector("#why-carousel");
    if (!zone) return;

    /* Track erzeugen (falls noch nicht vorhanden) */
    let track = zone.querySelector(".carousel-track");
    if (!track) {
      track = document.createElement("div");
      track.className = "carousel-track";
      track.append(...zone.children);
      zone.append(track);
    }
    track.style.willChange = "transform";

    const cards = [...track.children];

    /* ---- Geometriedaten berechnen ---------------------- */
    let cardW = cards[0].getBoundingClientRect().width;
    let gap   = cardW / 10;
    let max   = (cards.length - 1) * (cardW + gap);
    let SCROLLSTEP = cardW / STEP;
    track.style.gap = `${gap}px`;

    /* ---- Animation ------------------------------------- */
    const apply = () => { track.style.transform = `translateX(${-offset}px)`; };

    const stepAnim = () => {
      if (!anim) return;
      offset = dragging ? target : offset + (target - offset) * LERP;
      if (Math.abs(target - offset) < 0.5) offset = target;
      apply();
      if (offset !== target) requestAnimationFrame(stepAnim);
      else {
        anim = false;
        if (offset === 0 || offset === max) unlock();
      }
    };

    const go = () => {
      if (!anim) {
        anim = true;
        requestAnimationFrame(stepAnim);
      }
    };

    /* ---- Lock-Mechanik --------------------------------- */
    const lock = () => { if (!locked) { locked = true; document.body.style.overflow = "hidden"; } };
    const unlock = () => { if (locked) { locked = false; document.body.style.overflow = ""; } };

    const check = () => {
      if (mobile()) { unlock(); return; }
      engaged(zone.getBoundingClientRect()) ? lock() : unlock();
    };

    /* ---- Recalc bei Resize ----------------------------- */
    const recalc = () => {
      cardW = cards[0].getBoundingClientRect().width;
      gap   = cardW / 10;
      track.style.gap = `${gap}px`;
      max   = (cards.length - 1) * (cardW + gap);
      SCROLLSTEP = cardW / STEP;
      target = clamp(target, 0, max);
      offset = target;
      apply();
    };

    addEventListener("resize", () => setTimeout(recalc, 120));
    window.addEventListener("load", recalc);

    addEventListener("scroll", check,  { passive: true });
    addEventListener("resize", check);
    check();

    /* ===== Wheel-Steuerung ============================== */
    const onWheel = e => {
      if (!locked) return;
      e.preventDefault();          // vertikales Scrollen blocken
      target = clamp(target + Math.sign(e.deltaY) * SCROLLSTEP, 0, max);
      go();
    };
    zone.addEventListener("wheel",   onWheel, { passive: false });
    window.addEventListener("wheel", onWheel, { passive: false });

    /* ===== Pointer / Drag =============================== */
    const detectPointerKind = ev => {
      if (ev.pointerType) {
        return ev.pointerType === "" ? "touch" : ev.pointerType;  // iOS-Safari liefert ""
      }
      if ("touches" in ev)          return "touch";
      if (ev.type.startsWith("touch")) return "touch";
      return navigator.maxTouchPoints ? "touch" : "mouse";
    };

    zone.addEventListener("pointerdown", p => {
      zone.setPointerCapture(p.pointerId);
      dragging = true;

      const kind       = detectPointerKind(p);
      const dragFactor = kind === "touch" ? FACT_TOUCH : FACT_MOUSE;

      const startX = p.clientX;
      const startT = target;

      const move = e => {
        target = clamp(startT + (startX - e.clientX) * dragFactor, 0, max);
        go();
        e.preventDefault();
      };

      const end = () => {
        dragging = false;
        zone.releasePointerCapture(p.pointerId);
        zone.removeEventListener("pointermove", move);
      };

      zone.addEventListener("pointermove", move, { passive: false });
      zone.addEventListener("pointerup",    end, { once: true });
      zone.addEventListener("pointercancel",end, { once: true });
      zone.addEventListener("lostpointercapture", end, { once: true });
    });
  });
})();