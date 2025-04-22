console.log('ocoso-app-functions.js loaded');

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
        console.log('Found stylesheet:', link.href);
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

// Add resize event listener
window.addEventListener('resize', handleResize);




// Typ-Kachel Auswählen und Auswerten

let selectedType = null;

document.addEventListener('DOMContentLoaded', () => {
  const galleryItems = document.querySelectorAll('.gallery-item-caroussel');

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      // Deaktiviere vorherige Auswahl
      galleryItems.forEach(i => i.classList.remove('active'));

      // Aktiviere geklicktes Element
      item.classList.add('active');

      // Hole den zugehörigen Typ
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

// Only initialize carousel if all necessary elements are found
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

    // Initial carousel setup
    updateCarousel();

    // Carousel navigation
    backBtn.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + galleries.length) % galleries.length;
      updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % galleries.length;
      updateCarousel();
    });

    // Step click handlers
    steps.forEach((step, idx) => {
      step.addEventListener('click', () => {
        currentIndex = idx;
        updateCarousel();
      });
    });
} else {
    console.log("Carousel elements not found on this page. Skipping carousel initialization.");
}

// JavaScript: Beim Mouse-Enter wird der Zustand "hovered" gesetzt, sodass der Tooltip erscheint.
const uploadArea = document.getElementById('uploadArea');

// Only add listeners if the upload area exists
if (uploadArea) {
    uploadArea.addEventListener('mouseenter', () => {
      uploadArea.classList.add('hovered');
    });

    uploadArea.addEventListener('mouseleave', () => {
      uploadArea.classList.remove('hovered');
    });
} else {
    console.log("Upload area element not found on this page.");
}



	  
	  


// Function to prevent CSS caching
function preventCSSCaching() {
    console.log('Running preventCSSCaching');
    const links = document.getElementsByTagName('link');
    console.log('Found links:', links.length);
    
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        console.log('Checking link:', link.href, 'with rel:', link.rel);
        
        if (link.rel === 'stylesheet') {
            console.log('Found stylesheet:', link.href);
            // Add a timestamp to the href to force a fresh load
            const newHref = link.href.split('?')[0] + '?v=' + new Date().getTime();
            console.log('Updating to:', newHref);
            link.href = newHref;
        }
    }
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', preventCSSCaching);

// NEW: Make parent wrapper clickable based on data-link
function setupWrapperLinks() {
    console.log('Setting up wrapper links');
    const linkedElements = document.querySelectorAll('[data-link]');
    console.log(`Found ${linkedElements.length} elements with data-link.`);

    linkedElements.forEach(element => {
        const url = element.getAttribute('data-link');
        // Find the closest ancestor element with the class 'wrapper'
        const parentWrapper = element.closest('.wrapper'); 

        if (parentWrapper && url) {
            console.log(`Attaching link ${url} to wrapper:`, parentWrapper);
            // Prevent duplicate listeners if this runs multiple times
            if (!parentWrapper.dataset.hasLinkListener) { 
                parentWrapper.addEventListener('click', (event) => {
                    // Optional: Prevent clicks on interactive elements inside the wrapper from navigating
                    // if (event.target.closest('button, a, input, textarea')) {
                    //     return; 
                    // }
                    console.log(`Wrapper clicked, navigating to: ${url}`);
                    window.location.href = url;
                });
                parentWrapper.dataset.hasLinkListener = 'true'; // Mark as having a listener
            }
        } else {
            if (!parentWrapper) console.warn('Could not find parent .wrapper for element:', element);
            if (!url) console.warn('Element has data-link attribute but no value:', element);
        }
    });
}

// Call setupWrapperLinks after components are loaded 
// We need to ensure this runs *after* loadNavigation and loadOverlayMenu
// A simple way is to call it inside those functions, but let's try a slightly delayed call
// or potentially call it within the .then() block of the fetch calls.

document.addEventListener('DOMContentLoaded', () => {
    // Initial setup for elements present on page load
    setupWrapperLinks();
});

// Function to load navigation component
function loadNavigation() {
    const navPlaceholder = document.getElementById('navigation-placeholder');
    if (navPlaceholder) {
        fetch('components/navigation.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok for navigation.html');
                }
                return response.text();
            })
            .then(html => {
                navPlaceholder.innerHTML = html;
                console.log('Navigation loaded successfully.');
                handleResize(); 
                setupWrapperLinks();

                // 1️⃣ wallet.js nachladen
                const script = document.createElement('script');
                script.src = 'js/wallet.js';
                script.defer = true;
                script.onload = () => {
                    console.log('wallet.js geladen');

                    // 2️⃣ initWallet() ausführen
                    if (typeof initWallet === 'function') {
                        initWallet();
                        console.log('initWallet() aufgerufen');
                    }

                    // 3️⃣ Wallet-Zustand sofort prüfen
                    if (typeof window.ethereum !== 'undefined') {
                        window.ethereum.request({ method: 'eth_accounts' })
                            .then(accounts => {
                                if (accounts.length > 0 && typeof handleAccountsChanged === 'function') {
                                    handleAccountsChanged(accounts); // 💡 aktualisiert Button
                                    console.log('Wallet war bereits verbunden:', accounts[0]);
                                }
                            })
                            .catch(error => {
                                console.error('Fehler beim Abfragen von eth_accounts:', error);
                            });
                    }
                };
                document.body.appendChild(script);
            })
            .catch(error => {
                console.error('Error loading navigation:', error);
                navPlaceholder.innerHTML = '<p>Error loading navigation.</p>';
            });
    }
}

// Function to load overlay menu component
function loadOverlayMenu() {
    const overlayPlaceholder = document.getElementById('overlay-menu-placeholder');
    if (overlayPlaceholder) {
        fetch('components/overlay-menu.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok for overlay-menu.html');
                }
                return response.text();
            })
            .then(html => {
                overlayPlaceholder.innerHTML = html;
                console.log('Overlay menu loaded successfully.');
                setupWrapperLinks(); // Re-run link setup for newly added content
            })
            .catch(error => {
                console.error('Error loading overlay menu:', error);
                overlayPlaceholder.innerHTML = '<p>Error loading overlay menu.</p>';
            });
    }
}

// Function to load overlay menu component
function loadFooter() {
	console.log("Running loadFooter()");
    const footerPlaceholder = document.getElementById('footer-placeholder');
    console.log("Found footerPlaceholder:", footerPlaceholder);
	
    if (footerPlaceholder) {
        fetch('components/footer.html')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok for footer.html');
                return response.text();
            })
            .then(html => {
                footerPlaceholder.innerHTML = html;
                console.log('Footer loaded successfully.');
                setupWrapperLinks?.();
            })
            .catch(error => {
                console.error('Error loading footer:', error);
                footerPlaceholder.innerHTML = '<p>Error loading footer.</p>';
            });
    }
}

// Fetch-API zum Laden der Daten
fetch('/data/ipnft_dashboard_data.json')
  .then(response => response.json())
  .then(data => {
    console.log('Geladene Daten:', data);

    // Zugriff auf Datenblöcke
    const kategorien = data.kategorien;
    const monetarisierung = data.monetarisierung;
    const anteile = data.anteile_monetarisierung;

    // Beispiel: Erste Kategorie ausgeben
    console.log('Erste Kategorie:', kategorien[0]);
  });

			
				
// Upload-Funktionalitaet				
				
let selectedFile = null; // speichert die ausgewählte Datei für später

document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.getElementById('uploadArea');
  const uploadInput = document.getElementById('uploadInput');
  const uploadContent = uploadArea.querySelector('.upload-content');
  const uploadButton = uploadArea.querySelector('.content-button');

  // Klick auf Upload-Bereich → Datei-Auswahl öffnen
  uploadArea.addEventListener('click', (e) => {
    // Nur auslösen, wenn NICHT auf den Button geklickt wurde
    if (!e.target.closest('.content-button')) {
      uploadInput.click();
    }
  });

  // Datei wurde über Datei-Auswahl ausgewählt
  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // Datei per Drag & Drop
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

  // Upload-Button klick (Demo)
  uploadButton.addEventListener('click', () => {
    if (selectedFile) {
      console.log('Demo: Datei bereit zum Upload:', selectedFile);
      alert(`Demo: "${selectedFile.name}" erkannt – Upload wäre jetzt möglich.`);
    } else {
      alert('Bitte zuerst eine Datei auswählen oder hineinziehen.');
    }
  });

  // Datei verarbeiten (für Anzeige + Speicherung)
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



document.addEventListener('DOMContentLoaded', function() {

  // Initialisiert das Navigationsverhalten.
  function initNavigation() {
    const wrappers = document.querySelectorAll('.nav-item-wrapper');
    if (wrappers.length === 0) {
      return false;
    }
    wrappers.forEach(function(wrapper) {
      let hideTimeout;
      let submenu = wrapper.querySelector('.hsub-menu');

      wrapper.addEventListener('mouseenter', function() {
        clearTimeout(hideTimeout);
        if (submenu) {
          submenu.classList.add('active');
          submenu.classList.remove('inactive');
        }
      });

      wrapper.addEventListener('mouseleave', function() {
        hideTimeout = setTimeout(function() {
          if (!wrapper.matches(':hover') && !submenu.matches(':hover')) {
            submenu.classList.remove('active');
            submenu.classList.add('inactive');
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
              submenu.classList.add('inactive');
            }
          }, 300);
        });
      }
    });
    return true;
  }

  // MutationObserver wird gestartet.
  const observer = new MutationObserver(function(mutations, obs) {
    if (initNavigation()) {
      console.log('Navigationselemente sind geladen.');
      obs.disconnect();
    }
  });
  
  // Beobachtet Änderungen im ganzen Dokument.
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
});