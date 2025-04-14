// 3D Kippeln der Navigations-Kacheln
//
// Die Map erzeugt sich aus dem HTML/CSS im Code
//
// 1) Selektor, der beide Klassen abdeckt
//    z. B. .responsive, .responsive-reduced
const allResponsiveBlocks = document.querySelectorAll('.responsive, .responsive-reduced, .responsive-narrow');

// 2) Iteriere über jedes Element
allResponsiveBlocks.forEach(element => {
  // Gleiche Logik wie bei .wrapper:
  const outer = element.parentElement.parentElement;
  if(getComputedStyle(outer).position === 'static'){
    outer.style.position = 'relative';
  }

  const rect = element.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const outerRect = outer.getBoundingClientRect();
  const relX = rect.left - outerRect.left + window.scrollX;
  const relY = rect.top  - outerRect.top  + window.scrollY;

  // Pufferfaktor
  const paddingFactor = 0.1;
  const wCanvas = w * (1 + 2 * paddingFactor);
  const hCanvas = h * (1 + 2 * paddingFactor);

  // Screenshot
  html2canvas(element, { backgroundColor: null }).then(canvasScreenshot => {

    // Container
    const container3D = document.createElement('div');
    container3D.classList.add('three-container');
    container3D.style.width = wCanvas + 'px';
    container3D.style.height= hCanvas + 'px';
    container3D.style.left  = (relX - w * paddingFactor) + 'px';
    container3D.style.top   = (relY - h * paddingFactor) + 'px';
    outer.appendChild(container3D);

    // Unsichtbar
    element.style.visibility = 'hidden'; 

    // Three.js Setup
    const fov = 45;
    const aspect = wCanvas / hCanvas;
    const near = 0.1, far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    const fovRad = THREE.MathUtils.degToRad(fov);
    const distance = (h / 2) / Math.tan(fovRad / 2);
    camera.position.set(0, 0, distance * 1.2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(wCanvas, hCanvas);
    renderer.setClearColor(0x000000, 0);
    container3D.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null; // Wichtig: Transparenter Hintergrund
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(10, 3, 15);
    scene.add(directionalLight);


    // Plane
    const geometry = new THREE.PlaneGeometry(w, h);
    const texture = new THREE.CanvasTexture(canvasScreenshot);
    const material = new THREE.MeshPhongMaterial({ map: texture, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(0,0,0);
    scene.add(plane);

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();
	  
    // Am Ende innerhalb des html2canvas()-Callbacks, bevor die Maus-Listener hinzugefügt werden:
    container3D.addEventListener('click', () => {
      // Lese den Link aus einem data‑Attribut des originalen Elements
      const url = element.getAttribute('data-link');
      if (url) {
        window.location.href = url;
      }
    });

    window.addEventListener('mousemove', (evt) => {
      // Bestimme die Position des Containers
      const rect = container3D.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Berechne den Abstand der Maus vom Zentrum
      const dx = evt.clientX - centerX;
      const dy = evt.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Berechne den Annäherungsfaktor:
      // Abstand >= 400px -> factor = 0, Abstand <= 200px -> factor = 1
      const factor = THREE.MathUtils.clamp((300 - distance) / 200, 0, 1);

      // Zusätzlich normieren wir die Mauskoordinaten relativ zum Container
      const normX = (evt.clientX - centerX) / (rect.width / 2);  // -1 bis 1
      const normY = (evt.clientY - centerY) / (rect.height / 2); // -1 bis 1

      // Maximaler Drehwinkel (z.B. 10° in Radiant)
      const maxAngle = THREE.MathUtils.degToRad(6);

      // Setze die Rotation der Plane, gewichtet mit unserem Faktor
      plane.rotation.y = normX * maxAngle * factor;
      plane.rotation.x = -normY * maxAngle * factor;
    });

    window.addEventListener('mouseleave', () => {
      plane.rotation.x = 0;
      plane.rotation.y = 0;
    });

  });
});

		
		
		
function toggleMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    const hamburgerButton = document.querySelector('.hamburger-button');
    const mainNavigation = document.querySelector('.main-navigation');
    const isMobile = window.matchMedia("(max-width: 991px)").matches;

    menuOverlay.classList.toggle('show');

    if (menuOverlay.classList.contains('show')) {
        document.body.style.overflow = 'hidden';

        if (isMobile) {
            hamburgerButton.style.display = 'none'; /* Verstecke Hamburger-Button */
            mainNavigation.style.display = 'none'; /* Verstecke Main-Navigation */
        }
    } else {
        document.body.style.overflow = 'auto';

        if (isMobile) {
            hamburgerButton.style.display = 'block'; /* Zeige Hamburger-Button */
            mainNavigation.style.display = 'none'; /* Verstecke Main-Navigation */
        }
    }
}

/* Überwachung der Bildschirmgröße */
function handleResize() {
    const hamburgerButton = document.querySelector('.hamburger-button');
    const mainNavigation = document.querySelector('.main-navigation');
    const isMobile = window.matchMedia("(max-width: 991px)").matches;

    if (isMobile) {
        hamburgerButton.style.display = 'block';
        mainNavigation.style.display = 'none';
    } else {
        hamburgerButton.style.display = 'none';
        mainNavigation.style.display = 'flex';
    }
}

/* Initiale Überprüfung der Bildschirmgröße */
handleResize();

/* Bildschirmgröße wird überwacht */
window.addEventListener('resize', handleResize);

document.querySelectorAll('.gallery-item-caroussel').forEach(item => {
  item.addEventListener('click', () => {
    // Entferne aktive Klasse von allen
    document.querySelectorAll('.gallery-item-caroussel.active')
      .forEach(activeItem => activeItem.classList.remove('active'));
    // Füge aktive Klasse zum geklickten Element hinzu
    item.classList.add('active');
  });
});		


// Erfasse alle Gallery-Elemente und den Stepper
const galleries = document.querySelectorAll('.caroussel-gallery');
const backBtn = document.querySelector('.caroussel-back');
const nextBtn = document.querySelector('.caroussel-next');
const steps = document.querySelectorAll('.step-item');

let currentIndex = 0;

// Funktion zum Aktualisieren der Anzeige
function updateCarousel() {
  // Alle Galerien verbergen
  galleries.forEach((gallery, idx) => {
    gallery.style.display = (idx === currentIndex) ? 'flex' : 'none';
  });
  // Stepper updaten
  steps.forEach((step, idx) => {
    if (idx === currentIndex) {
      step.classList.add('active');
      step.setAttribute('aria-current', 'step');
    } else {
      step.classList.remove('active');
      step.removeAttribute('aria-current');
    }
  });
}

// Initiale Anzeige
updateCarousel();

// Zurück-Button: gehe einen Schritt zurück
backBtn.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + galleries.length) % galleries.length;
  updateCarousel();
});

// Next-Button: gehe einen Schritt vorwärts
nextBtn.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % galleries.length;
  updateCarousel();
});

// Klick auf Stepper-Elemente
steps.forEach((step, idx) => {
  step.addEventListener('click', () => {
    currentIndex = idx;
    updateCarousel();
  });
});		
		
	
	
	
	
	
// JavaScript: Beim Mouse-Enter wird der Zustand "hovered" gesetzt, sodass der Tooltip erscheint.
const uploadArea = document.getElementById('uploadArea');

uploadArea.addEventListener('mouseenter', () => {
  uploadArea.classList.add('hovered');
});

uploadArea.addEventListener('mouseleave', () => {
  uploadArea.classList.remove('hovered');
});

// Optionaler Klick-Handler für den Upload-Bereich
uploadArea.addEventListener('click', () => {
  alert("Upload area clicked!");
});