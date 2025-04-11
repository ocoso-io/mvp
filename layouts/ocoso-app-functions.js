console.log('ocoso-app-functions.js loaded');

// Prevent caching
console.log('Adding cache control meta tags...');
const metaTags = `
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
`;
document.querySelector('head').insertAdjacentHTML('beforeend', metaTags);
console.log('Meta tags added');

// Force CSS reload
console.log('Checking for CSS links...');
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

// Navigation functionality for responsive blocks
const allResponsiveBlocks = document.querySelectorAll('.responsive, .responsive-reduced, .responsive-narrow');

allResponsiveBlocks.forEach(element => {
  element.addEventListener('click', () => {
    const url = element.getAttribute('data-link');
    if (url) {
      window.location.href = url;
    }
  });
});

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

// Gallery item click handlers
document.querySelectorAll('.gallery-item-caroussel').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.gallery-item-caroussel.active')
      .forEach(activeItem => activeItem.classList.remove('active'));
    item.classList.add('active');
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

    // Optionaler Klick-Handler für den Upload-Bereich
    uploadArea.addEventListener('click', () => {
      alert("Upload area clicked!");
    });
} else {
    console.log("Upload area element not found on this page.");
}

// Function to prevent CSS caching
function preventCSSCaching() {
    console.log('Running preventCSSCaching...');
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
                // Re-initialize event listeners or functions that depend on the nav
                // (e.g., toggleMenu, handleResize might need to be called or re-bound 
                // if elements were inside the loaded HTML)
                // Since toggleMenu and handleResize are global, they should still work,
                // but we might need to re-run handleResize to set the initial state.
                handleResize(); 
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
                // Potentially re-initialize event listeners if needed
            })
            .catch(error => {
                console.error('Error loading overlay menu:', error);
                overlayPlaceholder.innerHTML = '<p>Error loading overlay menu.</p>';
            });
    }
}

// Call loadNavigation and loadOverlayMenu when the page loads
document.addEventListener('DOMContentLoaded', loadNavigation);
document.addEventListener('DOMContentLoaded', loadOverlayMenu);