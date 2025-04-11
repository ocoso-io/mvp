// Cache-busting function
function updateCssVersion() {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
        if (link.href.includes('3d-effect.css')) {
            const url = new URL(link.href);
            url.searchParams.set('v', Date.now());
            link.href = url.toString();
        }
    });
}

// Mobile detection
function isMobileDevice() {
    return window.innerWidth <= 991;
}

// Restore original content for mobile
function restoreOriginalContent(container) {
    if (!container) return;
    
    // Remove Three.js related classes
    container.classList.remove('responsive', 'responsive-reduced', 'responsive-narrow');
    
    // Restore original content if stored
    const originalContent = container.dataset.originalContent;
    if (originalContent) {
        container.innerHTML = originalContent;
    }
    
    // Clean up Three.js container if it exists
    const threeContainer = container.querySelector('.three-container');
    if (threeContainer) {
        threeContainer.remove();
    }
}

// Initialize 3D effect
function initialize3DEffect() {
    updateCssVersion();
    
    const containers = document.querySelectorAll('.card-content-wide');
    if (!containers.length) return;
    
    // Check if we're on mobile first
    if (isMobileDevice()) {
        containers.forEach(container => {
            restoreOriginalContent(container);
        });
        return;
    }
    
    // Load Three.js dynamically
    if (typeof THREE === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => initThreeJS(containers);
        script.onerror = () => {
            console.error('Failed to load Three.js');
            containers.forEach(container => restoreOriginalContent(container));
        };
        document.head.appendChild(script);
    } else {
        initThreeJS(containers);
    }
}

// Initialize Three.js
function initThreeJS(containers) {
    containers.forEach(container => {
        try {
            // Store original content
            container.dataset.originalContent = container.innerHTML;
            
            // Create Three.js container
            const threeContainer = document.createElement('div');
            threeContainer.className = 'three-container';
            container.appendChild(threeContainer);
            
            // Initialize scene
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(container.offsetWidth, container.offsetHeight);
            renderer.setClearColor(0x000000, 0);
            threeContainer.appendChild(renderer.domElement);
            
            // Create plane with content texture
            const geometry = new THREE.PlaneGeometry(2, 2);
            const texture = createTextureFromContent(container);
            const material = new THREE.MeshBasicMaterial({ 
                map: texture,
                transparent: true,
                opacity: 1
            });
            const plane = new THREE.Mesh(geometry, material);
            scene.add(plane);
            
            // Position camera
            camera.position.z = 2;
            
            // Mouse move handler
            const handleMouseMove = (event) => {
                const rect = container.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width * 2 - 1;
                const y = -(event.clientY - rect.top) / rect.height * 2 + 1;
                
                // Smoother rotation with easing
                const targetRotationX = y * 0.2;
                const targetRotationY = x * 0.2;
                
                plane.rotation.x += (targetRotationX - plane.rotation.x) * 0.1;
                plane.rotation.y += (targetRotationY - plane.rotation.y) * 0.1;
            };
            
            // Mouse leave handler
            const handleMouseLeave = () => {
                // Smoothly return to original position
                const animateReturn = () => {
                    if (Math.abs(plane.rotation.x) > 0.001 || Math.abs(plane.rotation.y) > 0.001) {
                        plane.rotation.x *= 0.9;
                        plane.rotation.y *= 0.9;
                        requestAnimationFrame(animateReturn);
                    } else {
                        plane.rotation.x = 0;
                        plane.rotation.y = 0;
                    }
                };
                animateReturn();
            };
            
            // Add event listeners
            container.addEventListener('mousemove', handleMouseMove);
            container.addEventListener('mouseleave', handleMouseLeave);
            
            // Animation loop
            function animate() {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            }
            animate();
            
            // Handle resize
            const handleResize = debounce(() => {
                if (isMobileDevice()) {
                    restoreOriginalContent(container);
                    return;
                }
                
                const rect = container.getBoundingClientRect();
                camera.aspect = rect.width / rect.height;
                camera.updateProjectionMatrix();
                renderer.setSize(rect.width, rect.height);
                
                // Update texture
                const newTexture = createTextureFromContent(container);
                plane.material.map = newTexture;
                plane.material.needsUpdate = true;
            }, 250);
            
            window.addEventListener('resize', handleResize);
            
        } catch (error) {
            console.error('Error initializing Three.js:', error);
            restoreOriginalContent(container);
        }
    });
}

// Create texture from content
function createTextureFromContent(container) {
    const content = container.querySelector('.content-block, .content-block-reduced, .content-block-narrow');
    if (!content) return null;
    
    const rect = content.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas size to match content
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Draw content to canvas
    html2canvas(content, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        allowTaint: true
    }).then(canvas => {
        return new THREE.CanvasTexture(canvas);
    }).catch(error => {
        console.error('Error creating texture:', error);
        return null;
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize3DEffect); 