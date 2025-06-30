console.log('ocoso-app-functions.js loaded');

/* ============================================================= */
/* 0 · Hilfs-Funktionen                                          */
/* ============================================================= */
function isMobileDevice () {
  if (window.matchMedia('(hover:none) and (pointer:coarse)').matches) return true;
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    if (innerWidth < 768 || innerHeight < 768) return true;           // kleine Tablets ausschließen
  }
  return /android|mobi|iphone|ipod|webos|blackberry|windows phone/i
         .test(navigator.userAgent || navigator.vendor || window.opera);
}

function preventCSSCaching () {
  [...document.querySelectorAll('link[rel="stylesheet"]')].forEach(link => {
    try {
      const u = new URL(link.href, document.baseURI);
      u.searchParams.set('v', Date.now());
      link.href = u.toString();
    } catch {
      link.href = link.href.split('?')[0] + '?v=' + Date.now();
    }
  });
}

/* ============================================================= */
/* 1 · Card-Stack-Sichtbarkeit                                 */
/* ============================================================= */
function updateCardStack() {
  const hide = isMobileDevice();
  document.querySelectorAll('.card-stack-wrapper').forEach(el => el.hidden = hide);
}

/* ============================================================= */
/* 2 · Resize-Handler (Hamburger, Wallet …)                      */
/* ============================================================= */
function handleResize () {
  updateCardStack();
}
handleResize();
addEventListener('resize', handleResize);

/* ============================================================= */
/* 3 · Comic-Row-Initialisierung                       */
/* ============================================================= */
/* ============================================================= */
/* Comic-Row: Fächern (Desktop) + beliebiges Draggen (Touch)     */
/* ============================================================= */
(function () {
  "use strict";

  /* ----- Konstante Basismaße ----- */
  const GAP_BETWEEN_STACKS   = 20;
  const SHIFT_Y_CONST        = -20;
  const WHEEL_PX_PER_CARD    = 400;
  const SCROLL_STEPS_PER_CARD= 5;
  const DRAG_SPEED           = 0.7;

  const BASE_LEFT  = 300;
  const BASE_RIGHT = 300;
  const BASE_MOVE  = 320;

  const PICK_CLASS = 'is-picking';
  const DROP_CLASS = 'is-dropping';
  const SHADOW     = '1rem 1rem 1.5rem rgba(0,0,0,.25)';
  const OFFSET     = 0;          // 1 rem
  const DUR        = 300;         // ms
  const FREE_ATTR  = 'data-free'; // Karten, die layout() ignoriert

  let startX = 0;
  let startY = 0;

  /* ----- kleine Helfer ----- */
  const clamp = (v,a,b)=>v<a?a:v>b?b:v;
  const isTouch = () => ('ontouchstart' in window) || navigator.maxTouchPoints>0;

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.comic-row').forEach(initRow);
  });

  /* ============================================================
     initRow
  ============================================================ */
  function initRow(row){

    /* ---------- Grund­werte ---------- */
    const cards   = [...row.children];
    if (!cards.length) return;

    let cardW,rowW,maxX,shiftX,shiftY=SHIFT_Y_CONST,
        shiftDown,deltaP,progress   = 0;

    /* ---------- Layout ---------- */
    function layout(p){
      const steps = p*cards.length;
      cards.forEach((c,i)=>{
        if (c.hasAttribute(FREE_ATTR)) return;       // bereits abgelegt

        const leftX  = (cards.length-1-i)*shiftX;
        const leftY  = shiftDown + (cards.length-1-i)*shiftY;
        const rightX = i*shiftX;
        const rightY = shiftDown + i*shiftY;

        const local  = clamp(steps-i,0,1);           // 0‥1
        const x      = leftX + local*(maxX + rightX - leftX);
        const y      = leftY + local*(rightY - leftY);

        /* 2 · Karte - wie bei onUp() - OHNE transform absolut einpassen  */
        Object.assign(c.style,{
          position : 'absolute',     // ← wichtig: gleiches Modell wie onUp
          left     : `${x}px`,
          top      : `${y}px`,
          transform: 'none'          // keine zusätzliche Verschiebung
        });

        /*c.style.transform = `translate(${x}px,${y}px)`;*/
        c.style.zIndex    = local===0 ? BASE_LEFT +(cards.length-1-i)
                            : local===1 ? BASE_RIGHT+i
                            :              BASE_MOVE +i;
      });
    }

    /* ---------- neu messen ---------- */
    function measure(){
      cardW = cards[0].getBoundingClientRect().width;
      rowW  = row.getBoundingClientRect().width || innerWidth;

      const multiplier = isTouch() ? 2 : 1;
      let avail;
      
      if (multiplier == 1) {
        avail   = (rowW-2*cardW-GAP_BETWEEN_STACKS)/2; 
      } else {
        avail = (rowW-cardW)/2;
      }
      
      shiftX        = (avail/(cards.length-1)) * multiplier; /* auf Touch-Devices doppelte Breite */
      shiftDown     = (cards.length-1)*Math.abs(shiftY);

      maxX   = rowW - cardW - (cards.length-1)*shiftX;
      deltaP = 1/(cards.length*SCROLL_STEPS_PER_CARD);

      console.log(`maxX = ${maxX}px   avail = ${avail}px  shiftX = ${shiftX}px  deltaP = ${deltaP}px`);

      layout(progress);
    }
    measure();
    addEventListener('resize',()=>setTimeout(measure,100));

    /* ==========================================================
       Desktop: Wheel-Scroll zwischen Stapeln
    ========================================================== */
    if (!isTouch()){
      let locked=false;
      const lock   =()=>{ if(!locked){locked=true;  document.body.style.overflow='hidden';}};
      const unlock =()=>{ if( locked){locked=false; document.body.style.overflow='';}};
      const snap   =()=>{ const st=1/(cards.length-1);
                          progress=Math.round(progress/st)*st; layout(progress);};

      function onWheel(e){
        if(!locked) return;
        e.preventDefault();
        progress = clamp(progress + Math.sign(e.deltaY)*deltaP,0,1);
        layout(progress);
        if(progress===0||progress===1) unlock();
      }

      /* nur aktiv, wenn Reihe gerade mittig im Viewport */
      const TOL = 100;
      function engaged(){
        const r=row.getBoundingClientRect(), V=innerHeight;
        return r.height<=V && r.top>=0 && r.bottom<=V &&
               Math.abs((r.top+r.bottom)/2 - V/2) <= TOL;
      }
      function check(){ engaged()?lock():unlock(); }

      row   .addEventListener('wheel',onWheel,{passive:false});
      window.addEventListener('wheel',onWheel,{passive:false});
      window.addEventListener('wheel',()=>{if(!locked)snap();},{passive:true});
      addEventListener('scroll',check,{passive:true});
      addEventListener('resize',check);

      check();
      return;                         // Touch-Teil überspringen
    }

    /* ==========================================================
       Touch-Geräte: Freies Draggen
    ========================================================== */
    let highestZ = 1000;
    let dragging=null, pid=null, offX=0, offY=0;

    /* Scroll während Drag komplett unterdrücken */
    function preventScroll(ev){ ev.preventDefault(); }
    const scrollLock={
      on (){
        document.documentElement.style.overflow='hidden';
        addEventListener('touchmove',preventScroll,{passive:false});
      },
      off(){
        document.documentElement.style.overflow='';
        removeEventListener('touchmove',preventScroll);
      }
    };

    /* --- Pointer Down --- */
    cards.forEach(card=>{
      card.addEventListener('pointerdown',e=>{
        if(e.pointerType==='mouse' && e.button!==0) return;

        dragging  = card; 
        pid       = e.pointerId;
        card.setPointerCapture(pid);
                
        const r   = card.getBoundingClientRect();
        
        /* Pointer-Position innerhalb der Karte ermitteln */
        offX      = e.clientX - r.left;
        offY      = e.clientY - r.top;
        
        const rowR   = row.getBoundingClientRect();
      
        /* Ausgangslage der Karte abhängig von der ROW */
        startX = r.left - rowR.left + OFFSET;
        startY = r.top  - rowR.top  + OFFSET;
 
        Object.assign(card.style,{
          position      :'fixed',
          width         : r.width +'px',
          height        : r.height+'px',
          zIndex        : ++highestZ,
          pointerEvents :'none',
          boxShadow     : SHADOW,
          transition    :'none'
        });
        card.classList.add(PICK_CLASS);
        moveAt(e.clientX - startX, e.clientY - startY);

        document.addEventListener('pointermove',onMove,{passive:false});
        document.addEventListener('pointerup',  onUp,  {passive:false});
        document.addEventListener('pointercancel', onUp, {passive:false});
        document.addEventListener('touchcancel',   onUp, {passive:false});

        scrollLock.on();
      },{passive:false});
    });

    /* --- Move --- */
    function onMove(e){
      if(e.pointerId!==pid || !dragging) return;
      e.preventDefault();
      
      /* Karte an verschobenen Punkt bewegen abhängig von der aktuellen Pointer-Koordinate */
      const x = e.clientX - startX;
      const y = e.clientY - startY;
      
      /* aktuelle Karten-Position (linke obere Ecke) zum logging
      const r  = dragging.getBoundingClientRect(); */
      /*console.log(`x = ${x.toFixed(1)}px   y = ${y.toFixed(1)}px     r.left = ${r.left.toFixed(1)}px   r.top = ${r.top.toFixed(1)}px`);*/
    
      moveAt(x, y);
    }
    
    function moveAt(x,y){
      dragging.style.transform=`translate3d(${x-offX}px,${y-offY}px,0)`;
      /*dragging.style.transform=`translate3d(${x}px,${y}px,0)`;*/
    }

    /* --- Up / Ablegen --- */
    function onUp (e){
      if(e.pointerId!==pid || !dragging) return;
    
      const card    = dragging;                     // 1) lokaler Alias
      const rowR    = row.getBoundingClientRect();
      const r       = card.getBoundingClientRect();
      
      const x  = r.left - rowR.left + OFFSET;   // kleiner Ruck
      const y  = r.top  - rowR.top  + OFFSET;
        
      /* Sofort auf absolute Koords umstellen */
      Object.assign(card.style,{
        position :'absolute',
        left     : x + 'px',
        top      : y + 'px',
        transform: 'none',               // wichtig: **kein** weiterer Translate
        transition: 'none',
        boxShadow : 'none',
        pointerEvents:''
      });
      card.classList.remove(PICK_CLASS);
      card.classList.add(DROP_CLASS);
      card.setAttribute(FREE_ATTR,'1');
    
      card.addEventListener('transitionend', () => {
        card.classList.remove(DROP_CLASS);         // 2) Zugriff sicher
      }, {once:true});
    
      /* Aufräumen */
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup',   onUp);
      card.releasePointerCapture(pid);
      scrollLock.off();
      dragging = null;  pid = null;                // 3) erst ganz zum Schluss
    }
  }
})();