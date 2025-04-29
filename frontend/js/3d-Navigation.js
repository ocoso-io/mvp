function initialize3DNavigation() {
    window.scrollTo(0, 1); // 🔁 Initialer Scroll zur Aktivierung

    const cards = document.querySelectorAll('.card');
    const stack = document.querySelector('.card-stack');
    const main = document.querySelector('.main');

    // Konfigurationswerte
    const config = {
        maxBlur: 3,
        baseAngle: 30,         // --base-angle: 30deg
        stepAngle: 5,          // --step-angle: 5deg
        cardWidth: 370,        // --card-width: var(--px-370)
        cardSpacing: 30,       // --card-spacing: 30px
        breakpoint: 1600       // Breakpoint für responsive Anpassungen
    };

    const cardCount = cards.length;
    
    // Cached Werte
    let viewport = {
        width: window.innerWidth,
        height: window.innerHeight
    };
    
    let dynamics = {
        angle: 0,
        spacing: 0,
        mainOffset: 8,
        cardWidth: 0
    };

    let lastScrollY = window.scrollY;
    let lastOrigin = '';

    /**
     * Erzwingt einen Reflow des Dokuments
     */
    function forceReflow() {
        void document.body.offsetHeight;
    }

    /**
     * Berechnet dynamische Werte basierend auf Viewport-Breite
     */
    function calculateDynamicValues() {
        dynamics.spacing = Math.max(0, (config.breakpoint - viewport.width) / 70);
        dynamics.angle = Math.max(0, (config.breakpoint - viewport.width) / 40);
        
        return {
            baseAngle: config.baseAngle + dynamics.angle,
            spacing: config.cardSpacing - dynamics.spacing
        };
    }

    /**
     * Aktualisiert die Dimension und Position des Hauptinhalts
     */
    function updateLayout() {
        viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        const card = cards[0];
        const cardRect = card.getBoundingClientRect();
        const stackRect = stack.getBoundingClientRect();
        
        dynamics.cardWidth = cardRect.width;
        
        const { baseAngle, spacing } = calculateDynamicValues();
        
        // Aktualisiere Kartenpositionierung
        cards.forEach((card, index) => {
            const offset = index * spacing;
            card.style.width = `${config.cardWidth}px`;
            card.style.transform = 
                `rotateY(${baseAngle}deg) 
                 translateY(${offset / 6 - dynamics.spacing * index / 2}px) 
                 translateX(${offset}px) 
                 translateZ(${offset}px)`;
            card.style.filter = 'blur(0)';
            
            // Berechnung nur beim letzten Element
            if (index === cards.length - 1) {
                dynamics.mainOffset = cardRect.width - stackRect.width + spacing * (index + 2);
            }
        });
        
        // Hauptinhalt positionieren
        main.style.marginLeft = `${dynamics.mainOffset}px`;
        main.style.width = `${viewport.width - dynamics.mainOffset}px`;
    }

    /**
     * Aktualisiert den Perspektivursprung basierend auf Scroll-Position
     */
    function updatePerspectiveOrigin() {
        forceReflow();

        const yPercent = (window.scrollY / viewport.height) * 100;
        const origin = `50% ${yPercent}%`;

        if (origin !== lastOrigin) {
            stack.style.perspectiveOrigin = origin;
            lastOrigin = origin;
            stack.getBoundingClientRect(); // Repaint triggern
        }
    }

    /**
     * Löst Mausereignisse für alle Karten aus
     */
    function dispatchMouseEvents() {
        const enter = new Event('mouseenter');
        const leave = new Event('mouseleave');
        cards.forEach(card => {
            card.dispatchEvent(enter);
            card.dispatchEvent(leave);
        });
    }

    // Event Listeners
    window.addEventListener('resize', () => {
        updatePerspectiveOrigin();
        updateLayout();
    });

    document.scrollingElement.addEventListener('scroll', updatePerspectiveOrigin);

    // Mouseenter/leave Handler für jede Karte
    cards.forEach((card, activeIndex) => {
        card.addEventListener('mouseenter', () => {
            const { baseAngle } = calculateDynamicValues();
            const maxOff = cardCount - 1;
            const cardWidth = dynamics.cardWidth;
            
            cards.forEach((otherCard, index) => {
                const delta = activeIndex - index;
                const angle = index > activeIndex ? baseAngle + delta * config.stepAngle : baseAngle;
                const distance = index > activeIndex ? cardWidth : 0;
                const offset = (config.cardSpacing - dynamics.spacing) * index * 1.5;
                const blur = (index > activeIndex && index > 0) ? (index / maxOff) * config.maxBlur : 0;

                otherCard.style.transform = 
                    `rotateY(${angle}deg) 
                     translateY(0px) 
                     translateX(${offset + distance}px) 
                     translateZ(${offset}px)`;
                
                otherCard.style.filter = `blur(${blur}px)`;
            });
        });

        card.addEventListener('mouseleave', updateLayout);
    });

    function checkScroll() {
        const currentScroll = window.scrollY;
        if (Math.abs(currentScroll - lastScrollY) > 1) {
            lastScrollY = currentScroll;
            updatePerspectiveOrigin();
        }
        requestAnimationFrame(checkScroll);
    }

    // Initialisierung
    updateLayout();
    updatePerspectiveOrigin();
    setInterval(updatePerspectiveOrigin, 50);
    requestAnimationFrame(checkScroll);
    dispatchMouseEvents();
}

document.addEventListener('DOMContentLoaded', initialize3DNavigation);