// Function to load navigation
function loadNavigation() {
    // Create a container for the navigation
    const navContainer = document.createElement('div');
    navContainer.id = 'navigation-container';
    
    // Fetch the navigation HTML
    fetch('components/navigation.html')
        .then(response => response.text())
        .then(html => {
            // Insert the navigation HTML into the container
            navContainer.innerHTML = html;
            
            // Insert the container at the beginning of the body
            document.body.insertBefore(navContainer, document.body.firstChild);
            
            // Re-initialize any event listeners or functionality
            initializeNavigation();
        })
        .catch(error => console.error('Error loading navigation:', error));
}

// Function to initialize navigation functionality
function initializeNavigation() {
    // Re-initialize the toggleMenu function
    window.toggleMenu = function() {
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
    };

    // Re-initialize resize handler
    window.handleResize = function() {
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
    };

    // Add event listener for resize
    window.addEventListener('resize', handleResize);
    
    // Initial check
    handleResize();
}

// Load navigation when the DOM is ready
document.addEventListener('DOMContentLoaded', loadNavigation); 