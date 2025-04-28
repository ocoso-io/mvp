function initialize3DNavigation() {
    window.scrollTo(0, 1); // 🔁 Initialer Scroll zur Aktivierung

    const cards = document.querySelectorAll('.card');
    const stack = document.querySelector('.card-stack');
    const main = document.querySelector('.main');

    const maxBlur = 3;

    // Direktzuweisungen der ursprünglichen CSS-Variablen
    const baseAngleStatic = 30;           // --base-angle: 30deg
    const stepA = 5;            // --step-angle: 5deg
    const baseW = 370;          // --card-width: var(--px-370)
    const spacing = 30;           // --card-spacing: 30px

    const cardCount = cards.length;

    let vw = window.innerWidth;

    let dynamicAngle = 0;
    let dynamicSpacing = 0;
    let dynamicMain = 8;
    let gcardwidth = 0;

    let lastScrollY = window.scrollY;
    let lastOrigin = '';

    function forceReflow() {
        void document.body.offsetHeight;
    }

    function updateDynamicAngle() {
        vw = window.innerWidth;

        dynamicSpacing = Math.max(0, (1600 - vw) / 70);
        dynamicAngle = Math.max(0, (1600 - vw) / 40);

        const baseA = baseAngleStatic + dynamicAngle;

        cards.forEach((c, j) => {
            const offset = j * (spacing - dynamicSpacing);
            c.style.width = `${baseW}px`;
            c.style.transform =
                `rotateY(${baseA}deg)`
                + ` translateY(${offset / 6 - dynamicSpacing * j / 2}px)`
                + ` translateX(${offset}px)`
                + ` translateZ(${offset}px)`;
            c.style.filter = `blur(0)`;
        });
    }

    function updateDynamicWidth() {
        vw = window.innerWidth;

        const card = document.querySelector('.card');
        const rect = card.getBoundingClientRect();
        const cardwidth = rect.width;

        const stack = document.getElementById('stack');
        const stackRect = stack.getBoundingClientRect();
        const stackWidth = stackRect.width;

        dynamicSpacing = Math.max(0, (1600 - vw) / 70);
        dynamicAngle = Math.max(0, (1600 - vw) / 40);

        const baseA = baseAngleStatic + dynamicAngle;

        gcardwidth = cardwidth;

        cards.forEach((c, j) => {
            const offset = j * (spacing - dynamicSpacing);
            c.style.width = `${baseW}px`;
            c.style.transform =
                `rotateY(${baseA}deg)`
                + ` translateY(${offset / 6 - dynamicSpacing * j / 2}px)`
                + ` translateX(${offset}px)`
                + ` translateZ(${offset}px)`;
            c.style.filter = `blur(0)`;
            dynamicMain = cardwidth - stackWidth + (spacing - dynamicSpacing) * (j + 2);
        });

        main.style.marginLeft = `${dynamicMain}px`;
        main.style.width = `${vw - dynamicMain}px`;
    }

    function updatePerspectiveOrigin() {
        forceReflow();

        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;
        const yPercent = (scrollTop / viewportHeight) * 100;

        const origin = `50% ${yPercent}%`;

        // Nur aktualisieren, wenn sich etwas geändert hat
        if (origin !== lastOrigin) {
            //stack.style.perspectiveOrigin = origin;
            //document.documentElement.style.setProperty('--perspective-origin', origin);
            //stack.style.setProperty("perspective-origin", origin);
            stack.style.perspectiveOrigin = origin;
            lastOrigin = origin;
            //root.style.setProperty('--perspective-origin', origin); // ✅ CSS var update
            stack.getBoundingClientRect(); // Repaint triggern
        }
    }

    function dispatchEnterAndLeaveMouseEventsToAllCards() {
        const enter = new Event('mouseenter');
        const leave = new Event('mouseleave');
        cards.forEach(card => {
            card.dispatchEvent(enter);
            card.dispatchEvent(leave);
        });
    }

    window.addEventListener('resize', () => {
        updatePerspectiveOrigin();
        dispatchEnterAndLeaveMouseEventsToAllCards();
    });

    document.scrollingElement.addEventListener('scroll', updatePerspectiveOrigin);

    cards.forEach((card, i) => {
        card.addEventListener('mouseenter', () => {

            const baseA = baseAngleStatic + dynamicAngle;
            const maxOff = (cards.length - 1);

            const card = document.querySelector('.card');
            const rect = card.getBoundingClientRect();
            const cardwidth = rect.width;

            const stack = document.getElementById('stack');
            const stackRect = stack.getBoundingClientRect();
            const stackWidth = stackRect.width;

            vw = window.innerWidth;

            cards.forEach((c, j) => {

                const delta = i - j;
                const angle = j > i
                    ? baseA + delta * stepA
                    : baseA;

                const distance = j > i
                    ? cardwidth
                    : 0;

                const offset = (spacing - dynamicSpacing) * j * 1.5;

                let blur = (j > i && j > 0) ? (j / maxOff) * maxBlur : 0;

                c.style.transform =
                    `rotateY(${angle}deg)`
                    + ` translateY(${0}px)` //offset / 6 - dynamicSpacing*j/2}px`
                    + ` translateX(${offset + distance + 0}px)`
                    + ` translateZ(${offset}px)`;

                c.style.filter = `blur(${blur}px)`;
            });


            const movedeck = cardwidth + spacing * (cardCount + 2) - stackWidth;
            dynamicMain = cardwidth + movedeck;

            vw = window.innerWidth;
            /*main.style.marginLeft = `${dynamicMain}px`;
            main.style.width = `${vw-dynamicMain-20}px`;*/
            gcardwidth = cardwidth;

        });

        card.addEventListener('mouseleave', () => {

            vw = window.innerWidth;
            const card = document.querySelector('.card');
            const rect = card.getBoundingClientRect();
            const cardwidth = rect.width;

            const stack = document.getElementById('stack');
            const stackRect = stack.getBoundingClientRect();
            const stackWidth = stackRect.width;

            dynamicSpacing = Math.max(0, (1600 - vw) / 70);
            dynamicAngle = Math.max(0, (1600 - vw) / 40); // z. B. bei 1200px → +20°
            const baseA = baseAngleStatic + dynamicAngle;

            const movedeck = 0; //cardwidth + spacing * (cardnumber + 1) - stackWidth;

            dynamicMain = cardwidth + movedeck;
            vw = window.innerWidth;
            main.style.marginLeft = `${dynamicMain}px`;
            main.style.width = `${vw - dynamicMain - 20}px`;

            cards.forEach((c, j) => {
                const offset = j * (spacing - dynamicSpacing);
                c.style.width = `${baseW}px`;
                c.style.transform =
                    `rotateY(${baseA * 1.5}deg)`
                    + ` translateY(${0}px)`
                    + ` translateX(${0}px)`
                    + ` translateZ(${offset}px)`;
                c.style.filter = `blur(0)`;
            });
        });
    });


    function checkScroll() {
        const currentScroll = window.scrollY;
        if (Math.abs(currentScroll - lastScrollY) > 1) {
            lastScrollY = currentScroll;
            updatePerspectiveOrigin();
        }
        requestAnimationFrame(checkScroll);
    }

    updateDynamicAngle();
    updateDynamicWidth();
    updatePerspectiveOrigin();
    setInterval(updatePerspectiveOrigin, 50);
    requestAnimationFrame(checkScroll);
    dispatchEnterAndLeaveMouseEventsToAllCards()
}

document.addEventListener('DOMContentLoaded', initialize3DNavigation);
