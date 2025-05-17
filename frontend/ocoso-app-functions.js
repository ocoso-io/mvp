/* ------------- ocoso-app-functions.js (COMPLETE) ------------- */
console.log('ocoso-app-functions.js loaded');

/* 0. Desktop-only CSS for .card-stack-wrapper */
/* -------- helper ---------- */
function isMobileDevice(){
    // primary method
    if (window.matchMedia && window.matchMedia('(hover:none) and (pointer:coarse)').matches) {
        return true;
    }

    // secondary method
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        // Ausschluss von Desktop-Geräten mit Touch-Fähigkeit aber großem Bildschirm
        if (window.innerWidth < 768 || window.innerHeight < 768) {
            return true;
        }
    }

    // last method
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /android|mobi|iphone|ipod|webos|blackberry|windows phone/i.test(ua);
}

function preventCSSCaching() {
  [...document.querySelectorAll('link[rel="stylesheet"]')].forEach(link => {
    try {
      const url = new URL(link.href, document.baseURI);
      url.searchParams.set('v', Date.now());
      link.href = url.toString();
    } catch {
      link.href = link.href.split('?')[0] + '?v=' + Date.now();
    }
  });
}

/* ========== 2. Responsive helpers ========== */
/* -------- visibility ---------- */
function updateCardStackVisibility(){
  const hide = isMobileDevice();
  document.querySelectorAll('.card-stack-wrapper')
          .forEach(el => el.hidden = hide);   // <-- nur Attribut toggeln
}

function handleResize() {
  const hb   = document.querySelector('.hamburger-button');
  const main = document.querySelector('.main-navigation');
  const mob  = isMobileDevice()
               || window.matchMedia('(max-width: 991px)').matches;

  if (hb && main) {
    hb.style.display   = mob ? 'flex' : 'none';
    main.style.display = mob ? 'none' : 'flex';
  }
  updateCardStackVisibility();       // keep in sync
}
window.addEventListener('resize', handleResize);

/* ========== 4. Type selection ========== */
let selectedType = null;
function initializeTypeSelection() {
  document.querySelectorAll('.gallery-item-caroussel').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.gallery-item-caroussel')
              .forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      selectedType = item.querySelector('h4')?.textContent.trim();
      console.log('Ausgewählter IP-Typ:', selectedType);
    });
  });
}

/* ========== 5. Carousel ========== */
function initializeCarousel() {
  const galleries = document.querySelectorAll('.caroussel-gallery');
  const backBtn   = document.querySelector('.caroussel-back');
  const nextBtn   = document.querySelector('.caroussel-next');
  const steps     = document.querySelectorAll('.step-item');
  if (!galleries.length || !backBtn || !nextBtn || !steps.length) return;

  let cur = 0;
  const update = () => {
    galleries.forEach((g, i) => g.style.display = i === cur ? 'flex' : 'none');
    steps.forEach((s, i) => {
      s.classList.toggle('active', i === cur);
      if (i === cur) s.setAttribute('aria-current', 'step');
      else           s.removeAttribute('aria-current');
    });
  };
  update();
  backBtn.addEventListener('click', () => { cur = (cur - 1 + galleries.length) % galleries.length; update(); });
  nextBtn.addEventListener('click', () => { cur = (cur + 1) % galleries.length; update(); });
  steps.forEach((s, i) => s.addEventListener('click', () => { cur = i; update(); }));
}

/* ========== 6. Tooltip hover ========== */
function initializeTooltip() {
  const area = document.getElementById('uploadArea');
  if (area) {
    area.addEventListener('mouseenter', () => area.classList.add('hovered'));
    area.addEventListener('mouseleave', () => area.classList.remove('hovered'));
  }
}

/* ========== 7. data-link wrapper navigation ========== */
function setupWrapperLinks() {
  document.querySelectorAll('[data-link]').forEach(el => {
    const url = el.dataset.link;
    const wrap = el.closest('.wrapper');
    if (wrap && url && !wrap.dataset.hasLinkListener) {
      wrap.addEventListener('click', ev => {
        if (ev.target.closest('a,button,input,textarea,select,[onclick],.click-target')) return;
        window.location.href = url;
      });
      wrap.dataset.hasLinkListener = 'true';
    }
  });
}

/* ========== 8. Upload area ========== */
function initializeUploadArea() {
  const area  = document.getElementById('uploadArea');
  const input = document.getElementById('uploadInput');
  if (!area || !input) return;

  const content = area.querySelector('.upload-content');
  const btn     = area.querySelector('.content-button');
  let fileSel   = null;

  area.addEventListener('click', e => { if (!e.target.closest('.content-button')) input.click(); });
  input.addEventListener('change', e => { if (e.target.files[0]) handle(e.target.files[0]); });
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f) { input.files = e.dataTransfer.files; handle(f); }
  });
  btn?.addEventListener('click', () => {
    alert(fileSel ? `Demo: "${fileSel.name}" erkannt – Upload möglich.` : 'Bitte Datei auswählen.');
  });

  function handle(f) {
    fileSel = f;
    if (content) {
      content.innerHTML =
        `<h2>${f.name}</h2><p>${(f.size / 1048576).toFixed(2)} MB</p><p>${f.type}</p>`;
    }
  }
}

/* ========== 9. Desktop hover navigation ========== */
function initDesktopHoverNavigation() {
  const wrappers = document.querySelectorAll('.nav-item-wrapper');
  if (!wrappers.length) return false;

  wrappers.forEach(w => {
    const sub = w.querySelector('.hsub-menu');
    let hide;
    w.addEventListener('mouseenter', () => {
      clearTimeout(hide); sub?.classList.add('active'); sub?.classList.remove('inactive');
    });
    w.addEventListener('mouseleave', () => {
      hide = setTimeout(() => { if (!w.matches(':hover')) { sub?.classList.remove('active'); sub?.classList.add('inactive'); } }, 300);
    });
    sub?.addEventListener('mouseenter', () => clearTimeout(hide));
    sub?.addEventListener('mouseleave', () => {
      hide = setTimeout(() => { if (!w.matches(':hover')) { sub.classList.remove('active'); sub.classList.add('inactive'); } }, 300);
    });
  });
  console.log('Desktop hover navigation initialized.');
  return true;
}

/* ========== 10. Loaders: NAV, Overlay, Footer, Wallet ========== */
function loadNavigation() {
  const ph = document.getElementById('navigation-placeholder');
  if (!ph) return;
  fetch('components/navigation.html')
    .then(r => { if (!r.ok) throw new Error('nav'); return r.text(); })
    .then(html => {
      ph.innerHTML = html;
      console.log('Navigation loaded');
      highlightActivePage(); 
      handleResize();
      setupWrapperLinks();
      loadAndInitWallet();
    })
    .catch(() => ph.innerHTML = '<p>Error loading navigation.</p>');
}

function highlightActivePage() {
  const cur = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  document.querySelectorAll('.main-navigation a[href]').forEach(a => {
    const linkFile = a.href.split('/').pop().toLowerCase();
    if (linkFile === cur) {
      a.classList.add('active-link');                      // Unterpunkt
      a.closest('.nav-item-wrapper')
       ?.querySelector('.nav-button')
       ?.classList.add('active-link');                     // Hauptbutton
    }
  });
}


function loadOverlayMenu() {
  const ph = document.getElementById('overlay-menu-placeholder');
  if (!ph) return;
  fetch('components/mobile-flag-nav3d-crossbrowser.html')
    .then(r => { if (!r.ok) throw new Error('overlay'); return r.text(); })
    .then(html => {
      ph.innerHTML = html;
      console.log('Overlay menu loaded');
      initializeFlagNav(ph);
    })
    .catch(() => ph.innerHTML = '<p>Error loading overlay menu.</p>');
}

function loadFooter() {
  const ph = document.getElementById('footer-placeholder');
  if (!ph) return;
  fetch('components/footer.html')
    .then(r => { if (!r.ok) throw new Error('footer'); return r.text(); })
    .then(html => {
      ph.innerHTML = html;
      console.log('Footer loaded');
      setupWrapperLinks();
    })
    .catch(() => ph.innerHTML = '<p>Error loading footer.</p>');
}

function loadAndInitWallet() {
  const s = document.createElement('script');
  s.src = 'js/wallet.js';
  s.defer = true;
  s.onload = () => {
    console.log('wallet.js geladen');
    typeof initWallet === 'function' && initWallet();
    if (window.ethereum && typeof handleAccountsChanged === 'function') {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(acc => acc.length && handleAccountsChanged(acc))
        .catch(console.error);
    }
  };
  s.onerror = () => console.error('wallet.js failed');
  document.body.appendChild(s);
}

/* ========== 11. Flag Navigation (volle Version) ========== */
// --- Function to Initialize the Flag Nav ---
function initializeFlagNav(containerElement) {
    console.log('Initializing Flag Nav inside:', containerElement);

    // --- DOM Elements (Scoped to containerElement) ---
    const btnOpen = containerElement.querySelector('#hamburgerBtn');
    const btnClose = containerElement.querySelector('#closeFlagNav');
    const nav = containerElement.querySelector('#mobileFlagNav'); // The <aside> element
	const wrapperLi = document.querySelector('.flag-wrapper');

    // Check if essential elements were found
    if (!btnOpen || !btnClose || !nav) {
        console.error("Flag Nav Error: Could not find essential elements (#hamburgerBtn, #closeFlagNav, #mobileFlagNav) within", containerElement);
        // Attempt to hide the global hamburger button if the menu failed to load properly
        const globalHamburger = document.getElementById('hamburgerBtn'); // May need adjustment if ID isn't unique
        if(globalHamburger && globalHamburger !== btnOpen) { // Check it's not the one we failed to find
            globalHamburger.style.display = 'none';
            console.log("Hiding global hamburger button as flag nav failed to initialize.");
        }
        return; // Stop initialization
    } else {
        console.log('Flag Nav elements found.');
    }

    // --- State & Helpers ---
    const activeTransitions = new Map();
    const transitionListeners = new Map();

    // --- Transition End Listener Management ---
    function removeExistingListener(element, propertyName) {
        if (transitionListeners.has(element)) {
            const propertyMap = transitionListeners.get(element);
            const handler = propertyMap.get(propertyName);
            if (handler) {
                element.removeEventListener('transitionend', handler);
                propertyMap.delete(propertyName);
                if (propertyMap.size === 0) {
                    transitionListeners.delete(element);
                }
            }
        }
    }
    function addTransitionListener(element, propertyName, callback) {
        removeExistingListener(element, propertyName);
        const handler = (event) => {
            if (event.target === element && event.propertyName === propertyName) {
                removeExistingListener(element, propertyName);
                callback();
            }
        };
        if (!transitionListeners.has(element)) {
            transitionListeners.set(element, new Map());
        }
        transitionListeners.get(element).set(propertyName, handler);
        element.addEventListener('transitionend', handler);
    }
    function cancelElementTransitions(element) {
        if (!element) return;
        if (transitionListeners.has(element)) {
            const listeners = transitionListeners.get(element);
            listeners.forEach((handler, propertyName) => {
                element.removeEventListener('transitionend', handler);
            });
            transitionListeners.delete(element);
        }
    }

    // --- Reset Submenu State ---
    function resetSubmenuState(ul, state = 'closed') {
        if (!ul) return;
        cancelElementTransitions(ul);
        activeTransitions.delete(ul);
        const parentLi = ul.parentElement;
        if (!parentLi) return;
        const children = Array.from(ul.children);
        const originalTransition = ul.style.transition;
        ul.style.transition = 'none';
        if (state === 'closed') {
            parentLi.classList.remove('expanded');
            ul.style.display = 'none'; ul.style.height = ''; ul.style.overflow = '';
            children.forEach(child => {
                if(child.classList.contains('flag-item')) {
                    child.classList.add('hidden'); child.classList.remove('visible');
                    child.style.transitionDelay = '';
                }
            });
        } else {
            parentLi.classList.add('expanded');
            ul.style.display = 'block'; ul.style.height = 'auto'; ul.style.overflow = 'visible';
            children.forEach(child => {
                if(child.classList.contains('flag-item')) {
                child.classList.remove('hidden'); child.classList.add('visible');
                child.style.transitionDelay = '';
                }
            });
        }
        void ul.offsetHeight;
        ul.style.transition = originalTransition;
        if (!originalTransition) ul.style.removeProperty('transition');
    }

    // --- Animation Functions ---
     function animateOpen(parentLi) {
        const ul = parentLi.querySelector(':scope > ul');
        if (!ul || parentLi.classList.contains('expanded') || activeTransitions.get(ul) === 'opening') return;
        if (activeTransitions.get(ul) === 'closing') {
            resetSubmenuState(ul, 'closed');
        }
        activeTransitions.set(ul, 'opening');
        const children = Array.from(ul.children);
        ul.style.transition = 'none'; ul.style.display = 'block'; ul.style.height = 'auto';
        children.forEach(child => { if (child.classList.contains('flag-item')) { child.classList.remove('hidden'); } });
        void ul.offsetHeight;
        const targetHeight = ul.scrollHeight + 'px';
        ul.style.height = '0px'; ul.style.overflow = 'hidden';
        children.forEach(child => { if (child.classList.contains('flag-item')) { child.classList.add('hidden'); } });
        void ul.offsetHeight; ul.style.transition = '';
        if (parseFloat(targetHeight) <= 0) {
            console.warn(`Calculated targetHeight is ${targetHeight} for`, parentLi, ". Aborting open.");
            activeTransitions.delete(ul); ul.style.display = 'none'; return;
        }
        parentLi.classList.add('expanded');
        requestAnimationFrame(() => {
            if (activeTransitions.get(ul) !== 'opening') return;
            ul.style.transition = 'height 0.4s ease'; ul.style.height = targetHeight;
        });
        children.forEach((child, i) => {
            if (child.classList.contains('flag-item')) {
            child.style.transitionDelay = `${i * 60}ms`; child.classList.remove('hidden');
            requestAnimationFrame(() => { requestAnimationFrame(() => {
                if (activeTransitions.get(ul) !== 'opening') return;
                child.classList.add('visible');
            }); });
            }
        });
        addTransitionListener(ul, 'height', () => {
            if (activeTransitions.get(ul) === 'opening') {
                ul.style.height = 'auto'; ul.style.overflow = 'visible'; activeTransitions.set(ul, null);
            }
        });
    }
    function animateClose(parentLi, callback) {
        const ul = parentLi.querySelector(':scope > ul');
        if (!ul || !parentLi.classList.contains('expanded')) {
            if (ul && activeTransitions.get(ul) === 'opening') { resetSubmenuState(ul, 'closed'); }
            if (callback) callback(); return;
        }
        if (activeTransitions.get(ul) === 'closing') { if (callback) callback(); return; }
        if (activeTransitions.get(ul) === 'opening') { resetSubmenuState(ul, 'open'); }
        activeTransitions.set(ul, 'closing');
        ul.style.height = ul.scrollHeight + 'px'; ul.style.overflow = 'hidden';
        void ul.offsetHeight; // Reflow
        parentLi.classList.remove('expanded');
        requestAnimationFrame(() => {
        if (activeTransitions.get(ul) !== 'closing') return;
            ul.style.transition = 'height 0.4s ease';
        ul.style.height = '0px';
        });
        const children = Array.from(ul.children);
        children.reverse().forEach((child, i) => {
        if (child.classList.contains('flag-item')) {
            child.style.transitionDelay = `${i * 60}ms`;
            requestAnimationFrame(() => {
                if (activeTransitions.get(ul) !== 'closing') return;
                child.classList.remove('visible');
            });
        }
        });
        addTransitionListener(ul, 'height', () => {
            const wasClosing = activeTransitions.get(ul) === 'closing';
            if (wasClosing) { resetSubmenuState(ul, 'closed'); }
            activeTransitions.delete(ul);
            if (callback) callback();
        });
    }

    // --- Attach Event Listeners ---
    btnOpen.addEventListener('click', () => {
        console.log('Flag Nav Hamburger Clicked');
        if (!nav) { console.error("Cannot open flag nav, element not found."); return; }
        nav.classList.add('open');
        btnOpen.classList.add('hamburger-hidden');
        btnClose.classList.remove('close-btn-hidden');
        //document.body.style.overflow = 'hidden';

        const wrapperLi = nav.querySelector('.flag-wrapper');
        if (wrapperLi) {
            wrapperLi.classList.remove('hidden');
            wrapperLi.classList.add('visible');
            setTimeout(() => { animateOpen(wrapperLi); }, 50);
            
            
/* ==========================================================
   Auto-Open → öffnet Vorfahren in Reihenfolge
   -------------------------------------------------------- */

/* 1 · Pfad normalisieren */
const canon = p => p.replace(/\/?(index\.html)?\/?$/, '');

/* 2 · Aktiven Link finden */
const current = [...nav.querySelectorAll('a[href]')]
                  .find(a => canon(a.pathname) === canon(location.pathname));
if (!current) { console.warn('kein aktiver Link'); }

/* 3 · Trail außen→innen */
const trail = [];
let li = current?.closest('li.flag-item');
while (li && !li.classList.contains('flag-wrapper')) {
  trail.unshift(li);
  li = li.parentElement.closest('li.flag-item, .flag-wrapper');
}

/* 4 · Helper – wartet nur auf **einen** height-End */
function waitHeight(ul){
  return new Promise(res=>{
    const h = e=>{
      if (e.target === ul && e.propertyName === 'height'){
        ul.removeEventListener('transitionend', h);
        res();
      }
    };
    ul.addEventListener('transitionend', h);
  });
}

/* 5 · Öffnet ein <li> + wartet */
async function openLi(li){
  const ul = li.querySelector(':scope > ul');
  if (!ul || li.classList.contains('expanded')) return;

  const p = waitHeight(ul);
  animateOpen(li);
  await p;                       // erst weiter, wenn fertig
}

/* 6 · Warte, bis Root-<ul> aufgeklappt ist */
const rootUl = wrapperLi.querySelector(':scope > ul');
(async ()=>{
  if (rootUl) await waitHeight(rootUl);   // Root-Animation abwarten

  for (const step of trail) await openLi(step);

  /* Finishing */
  current?.classList.add('active');
  current?.closest('li.flag-item')?.classList.add('active-li');
  current?.scrollIntoView({block:'center', behavior:'smooth'});
})();
            
            
            
            
        } else { console.warn('Flag wrapper not found inside nav.'); }
    });

    btnClose.addEventListener('click', closeNavMenu);

    /* ------------------ Klick außerhalb schließt ------------------ */
    document.addEventListener('click', outsideClickClose, true); // capture-Phase

    function outsideClickClose(e) {
      /* nur reagieren, wenn Menü offen */
      if (!nav.classList.contains('open')) return;

      /* Klick IM Menü → ignorieren */
      if (e.target.closest('.mobile-flag-nav')) return;

      /* Klick auf einen Hamburger (auch zukünftige) → ignorieren */
      if (e.target.closest('.hamburger-button')) return;

      /* alles andere schließt */
      closeNavMenu();
    }

    /* ------------------ Menü zentral schließen ------------------ */
    function closeNavMenu() {
      if (!nav.classList.contains('open')) return;

      btnOpen.classList.remove('hamburger-hidden');
      btnClose.classList.add('close-btn-hidden');

      const wrapperLi = nav.querySelector('.flag-wrapper');
      if (!wrapperLi) {
        nav.classList.remove('open');
        return;
      }

      const expanded = nav.querySelectorAll(
        '.flag-item.expanded, .flag-wrapper.expanded'
      );

      const cleanup = () => {
        nav.classList.remove('open');
        wrapperLi.classList.remove('visible');
        wrapperLi.classList.add('hidden');
      };

      if (!expanded.length) {
        animateClose(wrapperLi, cleanup);
        return;
      }
      expanded.forEach(li => {
        const isWrapper = li === wrapperLi;
        animateClose(li, () => { if (isWrapper) cleanup(); });
      });
    }

    console.log('Flag Nav initialised with outside-click close.');

    // Attach submenu click listener
    nav.addEventListener('click', e => {
        const linkElement = e.target.closest('.flag-item > a');
        if (!linkElement) return;
        const li = linkElement.parentElement;
        const ul = li ? li.querySelector(':scope > ul') : null;
        if (!li || !ul) return;

        e.preventDefault();
        const isExpanded = li.classList.contains('expanded');
        const currentState = activeTransitions.get(ul);
        const siblings = Array.from(li.parentElement.children)
            .filter(el => el !== li && el.classList.contains('flag-item') && el.classList.contains('expanded'));
        siblings.forEach(sibLi => animateClose(sibLi));

        if (isExpanded && currentState !== 'closing') {
            animateClose(li);
        } else if (!isExpanded && currentState !== 'opening') {
            setTimeout(() => {
                const currentUl = li.querySelector(':scope > ul');
                if (currentUl && !li.classList.contains('expanded') && activeTransitions.get(currentUl) !== 'opening'){
                    animateOpen(li);
                }
            }, 60);
        }
    });

    console.log("Flag Nav Initialized successfully.");

} // --- End of initializeFlagNav function ---


/* ========== 12. Demo-Fetch JSON ========== 
fetch('/data/ipnft_dashboard_data.json')
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(d => console.log('Erste Kategorie:', d.kategorien?.[0]))
  .catch(console.error);*/

/* ========== 13. DOMContentLoaded bootstrap ========== */
document.addEventListener('DOMContentLoaded', () => {
  preventCSSCaching();
  loadNavigation();
  loadOverlayMenu();
  loadFooter();

  handleResize();                     // initial sync
  initializeTypeSelection();
  initializeCarousel();
  initializeTooltip();
  initializeUploadArea();
  setupWrapperLinks();
  updateCardStackVisibility();

  if (!initDesktopHoverNavigation()) {
    const obs = new MutationObserver((_, o) => {
      if (initDesktopHoverNavigation()) o.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* watch late-loaded card stacks */
  const csObs = new MutationObserver(updateCardStackVisibility);
  csObs.observe(document.body, { childList: true, subtree: true });
});