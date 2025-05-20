(function () {
  "use strict";

  /* --- feste Config --- */
  const BP = 768, TOL = 100;
  const GAP_BETWEEN_STACKS = 20;
  const SHIFT_Y_CONST      = -20;     /* fester vertikaler Versatz  */
  const WHEEL_PX_PER_CARD  = 400;
  const SCROLL_STEPS_PER_CARD = 5;
  const DRAG_SPEED = 0.7;             /* 1 = 1 Kartenhöhe pro Karte */

  /* --- Helper --- */
  const clamp = (v,a,b)=>v<a?a:v>b?b:v;
  const mobile= ()=>matchMedia(`(max-width:${BP}px)`).matches;
  const engaged=r=>{
    const V=innerHeight,H=r.height;
    return H<=V&&r.top>=0&&r.bottom<=V&&
           Math.abs((r.top+r.bottom)/2-V/2)<=TOL;
  };

  document.addEventListener("DOMContentLoaded",()=>{
    document.querySelectorAll(".comic-row").forEach(initRow);
  });

  function initRow(row){
    const cards=[...row.children];
    if(!cards.length) return;

    /* --------- dynamische Maße -------- */
    let cardW,rowW,maxX,SHIFT_X,SHIFT_Y=SHIFT_Y_CONST,
        stackShiftX,stackShiftY,shiftDown,
        stepPx,deltaP;

    const measure = ()=>{
      cardW=cards[0].getBoundingClientRect().width;
      rowW =row.getBoundingClientRect().width||innerWidth;

      const avail=(rowW-2*cardW-GAP_BETWEEN_STACKS)/2;
      SHIFT_X=avail/(cards.length-1);

      stackShiftX=(cards.length-1)*SHIFT_X;
      stackShiftY=(cards.length-1)*Math.abs(SHIFT_Y);
      shiftDown  =stackShiftY;

      maxX=rowW-cardW-stackShiftX;

      stepPx =WHEEL_PX_PER_CARD*SCROLL_STEPS_PER_CARD;
      deltaP=1/(cards.length*SCROLL_STEPS_PER_CARD);

      layout(progress);
    };

    /* --------- Layout --------- */
    const BASE_LEFT=300,BASE_RIGHT=300,BASE_MOVE=320;

    const layout = p=>{
      const steps=p*cards.length;
      cards.forEach((c,i)=>{
        const leftX =(cards.length-1-i)*SHIFT_X;
        const leftY = shiftDown + (cards.length-1-i)*SHIFT_Y;
        const rightX=i*SHIFT_X;
        const rightY= shiftDown + i*SHIFT_Y;

        const local = clamp(steps - i, 0, 1);

        const x = leftX + local*(maxX + rightX - leftX);
        const y = leftY + local*(rightY - leftY);
        c.style.transform=`translate(${x}px,${y}px)`;

        let z;
        if(local===0)      z=BASE_LEFT +(cards.length-1-i);
        else if(local===1) z=BASE_RIGHT+i;
        else               z=BASE_MOVE +i;
        c.style.zIndex=z;
      });
    };

    /* --------- State & Lock --------- */
    let progress=0,locked=false;

    const lock   =()=>{ if(!locked){locked=true; document.body.style.overflow='hidden';}};
    const unlock =()=>{ if(locked){ locked=false;document.body.style.overflow='';}};

    const snap=()=>{ const step=1/(cards.length-1);
                     progress=Math.round(progress/step)*step;
                     layout(progress); };

    const check=()=>{ mobile()?unlock(): engaged(row.getBoundingClientRect())?lock():unlock(); };

    /* --------- Wheel --------- */
    const onWheel=e=>{
      if(!locked) return;
      e.preventDefault();
      progress=clamp(progress+Math.sign(e.deltaY)*deltaP,0,1);
      layout(progress);
      if(progress===0||progress===1) unlock();
    };









/* ==========================================================
   DRAGGING – horizontal, jederzeit nutzbar
   ----------------------------------------------------------
   ▸ idx   : Index der aktuell „fliegenden” Karte
   ▸ intra : Teilfortschritt dieser Karte (0 = links, 1 = rechts)
   ▸ progress = (idx + intra) / (nCards-1)   →   layout(progress)
   ========================================================== */

let idx   = 0;            // 0 = oberste links
let intra = 0;            // 0‥1 innerhalb eines Flips

const nCards   = cards.length;
const toProg   = () => (idx + intra) / (nCards - 1);

/* rendert mit deinem vorhandenen layout(progress) */
function renderDrag() {
  progress = toProg();
  layout(progress);
}

/* Pointer-Start */
const onPointerDown = (p) => {
  if (p.pointerType === "mouse" && p.button !== 0) return; // nur linker Klick

  /* Ausgangs-Lock merken; bei Bedarf temporär sperren */
  const wasLocked = locked;
  if (!locked) lock();              // Seite fixieren

  const startX   = p.clientX;
  const startAll = idx + intra;     // Gesamtfortschritt als Zahl

  const onMove = (e) => {
    e.preventDefault();             // Seiten-Scroll blocken
    const curX = e.clientX ??
                 e.touches?.[0]?.clientX ?? startX;

    /* Rechtsziehen  →  Karte nach rechts (delta > 0) */
    const deltaCards = (curX - startX) / (cardW * DRAG_SPEED);
    let total = startAll + deltaCards;
    total = clamp(total, 0, nCards - 1 + 1e-6);

    idx   = Math.floor(total);
    intra = total - idx;
    renderDrag();
  };

  const onUp = () => {
    removeEventListener("pointermove", onMove);
    removeEventListener("pointerup",   onUp);

    /* Einrasten auf 0 oder 1 */
    intra = intra >= 0.5 ? 1 : 0;
    renderDrag();

    /* Stapel freigeben, wenn Rand erreicht,
       sonst ursprünglichen Lock-Zustand wiederherstellen */
    const atEdge = (idx === 0 && intra === 0) ||
                   (idx === nCards - 1 && intra === 1);

    if (atEdge || !wasLocked) unlock();
    else if (wasLocked) lock();  // Lock bleibt aktiv
  };

  addEventListener("pointermove", onMove, { passive: false });
  addEventListener("pointerup",   onUp,   { once: true   });
};

/* Listener registrieren (alte pointerdown-Bindung ersetzen) */
row.addEventListener("pointerdown", onPointerDown);








    /* --------- Bind Events --------- */
    measure(); layout(0);
    window.addEventListener("load",measure);
    window.addEventListener("resize",()=>setTimeout(measure,120));
    addEventListener("scroll",check,{passive:true});
    addEventListener("resize",check);
    row   .addEventListener("wheel", onWheel, {passive:false});
    window.addEventListener("wheel", onWheel,{passive:false});
    row   .addEventListener("pointerdown", onPointerDown);
    window.addEventListener("wheel", ()=>{ if(!locked)snap(); }, {passive:true});
    check();
  }
})();