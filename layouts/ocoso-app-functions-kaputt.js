console.log('ocoso-app-functions.js loaded');

// Globales Flag initialisieren
window.disableGlobalNavHover = false;

// Prevent caching
console.log('Adding cache control meta tags');
const metaTags = `
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
`;
document.querySelector('head').insertAdjacentHTML('beforeend', metaTags);
console.log('Meta tags added');

// Force CSS reload
console.log('Checking for CSS links');
const links = document.getElementsByTagName('link');
console.log('Found links:', links.length);
for (let i = 0; i < links.length; i++) {
    const link = links[i];
    console.log('Checking link:', link.href, 'with rel:', link.rel);
    if (link.rel === 'stylesheet') {
        const newHref = link.href.split('?')[0] + '?v=' + new Date().getTime();
        console.log('Updating to:', newHref);
        link.href = newHref;
    }
}

// Menu toggle functionality
function toggleMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    const hamburgerButton = document.querySelector('.hamburger-button');
    const mainNavigation = document.querySelector('.main-navigation');
    const isMobile = window.matchMedia("(max-width: 991px)").matches;

    menuOverlay.classList.toggle('show');

    if (menuOverlay.classList.contains('show')) {
        document.body.style.overflow = 'hidden';
        if (isMobile) {
            hamburgerButton.style.display = 'none';
            mainNavigation.style.display = 'none';
        }
    } else {
        document.body.style.overflow = 'auto';
        if (isMobile) {
            hamburgerButton.style.display = 'block';
            mainNavigation.style.display = 'none';
        }
    }
}

// Handle window resize
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
window.addEventListener('resize', handleResize);

// Typ-Kachel: Auswahl und Auswertung
let selectedType = null;
document.addEventListener('DOMContentLoaded', () => {
  const galleryItems = document.querySelectorAll('.gallery-item-caroussel');
  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      galleryItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const typeLabel = item.querySelector('h4')?.textContent.trim();
      selectedType = typeLabel;
      console.log('Ausgewählter IP-Typ:', selectedType);
    });
  });
});

// Carousel functionality
const galleries = document.querySelectorAll('.caroussel-gallery');
const backBtn = document.querySelector('.caroussel-back');
const nextBtn = document.querySelector('.caroussel-next');
const steps = document.querySelectorAll('.step-item');
if (galleries.length > 0 && backBtn && nextBtn && steps.length > 0) {
    let currentIndex = 0;
    function updateCarousel() {
      galleries.forEach((gallery, idx) => {
        gallery.style.display = (idx === currentIndex) ? 'flex' : 'none';
      });
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
    updateCarousel();
    backBtn.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + galleries.length) % galleries.length;
      updateCarousel();
    });
    nextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % galleries.length;
      updateCarousel();
    });
    steps.forEach((step, idx) => {
      step.addEventListener('click', () => {
        currentIndex = idx;
        updateCarousel();
      });
    });
} else {
    console.log("Carousel elements not found. Skipping carousel initialization.");
}

// Upload-Bereich: Mouse-Over für Tooltip
const uploadArea = document.getElementById('uploadArea');
if (uploadArea) {
    uploadArea.addEventListener('mouseenter', () => {
      uploadArea.classList.add('hovered');
    });
    uploadArea.addEventListener('mouseleave', () => {
      uploadArea.classList.remove('hovered');
    });
} else {
    console.log("Upload area element not found.");
}

// Function to prevent CSS caching
function preventCSSCaching() {
    console.log('Running preventCSSCaching');
    const links = document.getElementsByTagName('link');
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (link.rel === 'stylesheet') {
            const newHref = link.href.split('?')[0] + '?v=' + new Date().getTime();
            link.href = newHref;
        }
    }
}
document.addEventListener('DOMContentLoaded', preventCSSCaching);

// Globaler Wrapper-Link Setup
function setupWrapperLinks() {
    console.log('Setting up wrapper links');
    const linkedElements = document.querySelectorAll('[data-link]');
    console.log(`Found ${linkedElements.length} elements with data-link.`);
    linkedElements.forEach(element => {
        const url = element.getAttribute('data-link');
        const parentWrapper = element.closest('.wrapper'); 
        if (parentWrapper && url) {
            console.log(`Attaching link ${url} to wrapper:`, parentWrapper);
            if (!parentWrapper.dataset.hasLinkListener) { 
                parentWrapper.addEventListener('click', () => {
                    console.log(`Wrapper clicked, navigating to: ${url}`);
                    window.location.href = url;
                });
                parentWrapper.dataset.hasLinkListener = 'true';
            }
        } else {
            if (!parentWrapper) console.warn('Could not find parent .wrapper for element:', element);
            if (!url) console.warn('Element has data-link but no value:', element);
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    setupWrapperLinks();
});

// Globaler Hover-Listener (nur aktiv, wenn Flag false)
if (!window.disableGlobalNavHover) {
  document.querySelectorAll('.nav-item-wrapper').forEach(function(wrapper) {
    let hideTimeout;
    let submenu = wrapper.querySelector('.hsub-menu');
    wrapper.addEventListener('mouseenter', function() {
      clearTimeout(hideTimeout);
      if (submenu) {
        submenu.classList.add('active');
      }
    });
    wrapper.addEventListener('mouseleave', function() {
      hideTimeout = setTimeout(function() {
        if (!wrapper.matches(':hover') && !submenu.matches(':hover')) {
          submenu.classList.remove('active');
        }
      }, 300);
    });
    if (submenu) {
      submenu.addEventListener('mouseenter', function() {
        clearTimeout(hideTimeout);
      });
      submenu.addEventListener('mouseleave', function() {
        hideTimeout = setTimeout(function() {
          if (!wrapper.matches(':hover')) {
            submenu.classList.remove('active');
          }
        }, 300);
      });
    }
  });
}

// Funktionen zum Laden von Komponenten
function loadNavigation() {
    const navPlaceholder = document.getElementById('navigation-placeholder');
    if (navPlaceholder) {
        fetch('components/navigation.html')
            .then(response => {
                if (!response.ok) throw new Error('Error loading navigation.html');
                return response.text();
            })
            .then(html => {
                navPlaceholder.innerHTML = html;
                console.log('Navigation loaded successfully.');
                handleResize();
                setupWrapperLinks();
                // Hier passiert die Umstellung: Nachladen-HTML soll die Oberhand haben.
                // Setze das Flag in diesem Fall auf true.
                window.disableGlobalNavHover = true;
            })
            .catch(error => {
                console.error('Error loading navigation:', error);
                navPlaceholder.innerHTML = '<p>Error loading navigation.</p>';
            });
    }
}

/*function loadNavigation() {
  const navPlaceholder = document.getElementById('navigation-placeholder');
  if (navPlaceholder) {
    fetch('components/navigation.html')
      .then(response => {
        if (!response.ok) {
          throw new Error('Navigation konnte nicht geladen werden');
        }
        return response.text();
      })
      .then(html => {
        navPlaceholder.innerHTML = html;
        // Jetzt suchen wir alle <script>-Tags im eingefügten HTML
        const scripts = navPlaceholder.querySelectorAll('script');
        scripts.forEach(oldScript => {
          // Erstelle ein neues <script>-Element
          const newScript = document.createElement('script');
          // Kopiere den Inhalt (inneren Text) des alten Scripts
          newScript.text = oldScript.innerText;
          // Optional: Falls das Script ein src-Attribut hat, kopiere es
          if(oldScript.src) {
            newScript.src = oldScript.src;
          }
          // Füge das neue Script dem Body hinzu, damit es ausgeführt wird
          document.body.appendChild(newScript);
        });
      })
      .catch(error => {
        console.error('Fehler beim Laden der Navigation:', error);
        navPlaceholder.innerHTML = '<p>Navigation konnte nicht geladen werden.</p>';
      });
  }
}*/



function loadOverlayMenu() {
    const overlayPlaceholder = document.getElementById('overlay-menu-placeholder');
    if (overlayPlaceholder) {
        fetch('components/overlay-menu.html')
            .then(response => {
                if (!response.ok) throw new Error('Error loading overlay-menu.html');
                return response.text();
            })
            .then(html => {
                overlayPlaceholder.innerHTML = html;
                console.log('Overlay menu loaded successfully.');
                setupWrapperLinks();
            })
            .catch(error => {
                console.error('Error loading overlay menu:', error);
                overlayPlaceholder.innerHTML = '<p>Error loading overlay menu.</p>';
            });
    }
}
function loadFooter() {
    console.log("Running loadFooter()");
    const footerPlaceholder = document.getElementById('footer-placeholder');
    console.log("Found footerPlaceholder:", footerPlaceholder);
    if (footerPlaceholder) {
        fetch('components/footer.html')
            .then(response => {
                if (!response.ok) throw new Error('Error loading footer.html');
                return response.text();
            })
            .then(html => {
                footerPlaceholder.innerHTML = html;
                console.log('Footer loaded successfully.');
                setupWrapperLinks();
            })
            .catch(error => {
                console.error('Error loading footer:', error);
                footerPlaceholder.innerHTML = '<p>Error loading footer.</p>';
            });
    }
}
document.addEventListener('DOMContentLoaded', loadNavigation);
document.addEventListener('DOMContentLoaded', loadOverlayMenu);
document.addEventListener('DOMContentLoaded', loadFooter);

// Fetch-API für Daten
fetch('/data/ipnft_dashboard_data.json')
  .then(response => response.json())
  .then(data => {
    console.log('Geladene Daten:', data);
    const kategorien = data.kategorien;
    console.log('Erste Kategorie:', kategorien[0]);
  });

// Upload-Funktionalität
let selectedFile = null;
document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.getElementById('uploadArea');
  const uploadInput = document.getElementById('uploadInput');
  const uploadContent = uploadArea.querySelector('.upload-content');
  const uploadButton = uploadArea.querySelector('.content-button');
  uploadArea.addEventListener('click', (e) => {
    if (!e.target.closest('.content-button')) {
      uploadInput.click();
    }
  });
  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadInput.files = e.dataTransfer.files;
      handleFile(file);
    }
  });
  uploadButton.addEventListener('click', () => {
    if (selectedFile) {
      console.log('Demo: Datei bereit zum Upload:', selectedFile);
      alert(`Demo: "${selectedFile.name}" erkannt – Upload wäre jetzt möglich.`);
    } else {
      alert('Bitte zuerst eine Datei auswählen oder hineinziehen.');
    }
  });
  function handleFile(file) {
    selectedFile = file;
    uploadContent.innerHTML = `
      <h2>${file.name}</h2>
      <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
      <p>${file.type}</p>
    `;
  }
});



// Call loadNavigation and loadOverlayMenu when the page loads
document.addEventListener('DOMContentLoaded', loadNavigation);
document.addEventListener('DOMContentLoaded', loadOverlayMenu);
document.addEventListener('DOMContentLoaded', loadFooter);