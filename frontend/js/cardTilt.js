/* ===========================================================
   1. Karten-Tilt  (unverändert, nur in IIFE gepackt)
   =========================================================== */
(() => {
  const MAX = 15, SPEED = .5;

  document.querySelectorAll('.wrapper').forEach(wrap=>{
      
      
    /* --- Fallback: .tilt-inner dynamisch einfügen ------------ */
    let card = wrap.querySelector('.tilt-inner');
    if (!card) {
      card = document.createElement('div');
      card.className = 'tilt-inner';

      /* alle vorhandenen Kinder in die neue Hülle verschieben */
      while (wrap.firstChild) card.append(wrap.firstChild);
      wrap.append(card);
    }
    /* ---------------------------------------------------------     
          
      
    const card = wrap.querySelector('.tilt-inner');*/

    if (!card) return;

    let tx=0, ty=0, rx=0, ry=0;
    const lerp=(v,t)=>v+(t-v)*SPEED;

    wrap.addEventListener('mousemove',e=>{
      const r = card.getBoundingClientRect();
      const cx = e.clientX - r.left - r.width *.5;
      const cy = e.clientY - r.top  - r.height*.5;
      ty =  (cx/(r.width *.5))*MAX;
      tx = -(cy/(r.height*.5))*MAX;
    });
    wrap.addEventListener('mouseleave',()=>{tx=ty=0});

    (function loop(){
      rx=lerp(rx,tx); ry=lerp(ry,ty);
      card.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg)`;
      requestAnimationFrame(loop);
    })();
  });
})();