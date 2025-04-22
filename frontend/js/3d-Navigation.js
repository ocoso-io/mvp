document.addEventListener('DOMContentLoaded', () => {
  const cards   = document.querySelectorAll('.card');
  const main    = document.querySelector('.main');
  const root    = document.documentElement;
  const styles  = getComputedStyle(root);

  const spacing = parseFloat(styles.getPropertyValue('--card-spacing'));
  const baseW   = parseFloat(styles.getPropertyValue('--card-width'));
  const stepA   = parseFloat(styles.getPropertyValue('--step-angle'));
  const baseAngleStatic = parseFloat(styles.getPropertyValue('--base-angle'));
  const maxBlur = 3;
	
  const cardnumber = cards.length;	
	
  let vw = window.innerWidth;
  let vh = window.innerHeight;
	
  let dynamicAngle = 0;
  let dynamicSpacing = 0;
  let dynamicMain = 8;
  let gcardwidth = 0;

	
	
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
        + ` translateY(${offset / 6 - dynamicSpacing*j/2}px)`
        + ` translateX(${offset}px)`
        + ` translateZ(${offset}px)`;
      c.style.filter = `blur(0)`;
    });
  }
  updateDynamicAngle();

	
	
  function updateDynamicWidth() {
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
	  
    gcardwidth = cardwidth;
	  
    cards.forEach((c, j) => {
      const offset = j * (spacing - dynamicSpacing);
      c.style.width = `${baseW}px`;
      c.style.transform =
        `rotateY(${baseA}deg)`
        + ` translateY(${offset / 6 - dynamicSpacing*j/2}px)`
        + ` translateX(${offset}px)`
        + ` translateZ(${offset}px)`;
      c.style.filter = `blur(0)`;
      dynamicMain = cardwidth - stackWidth + (spacing-dynamicSpacing) * (j+2) ;
    });
	  
    main.style.marginLeft = `${dynamicMain}px`;
    main.style.width = `${vw-dynamicMain}px`;
  }
  updateDynamicWidth();

	
	
function updatePerspectiveOrigin() {
  const scrollTop = window.scrollY;
  const viewportHeight = window.innerHeight;
  const y = scrollTop + viewportHeight / 2;

  const totalHeight = document.body.scrollHeight;
  const yPercent = (y / totalHeight) * 100;

  const origin = `50% ${yPercent}%`;

  const stack = document.querySelector('.card-stack');
  stack.style.perspectiveOrigin = origin;
}
	
	
  /*window.addEventListener('resize', () => {
 
      // Grundstellung setzen
      const event1 = new Event('mouseenter');
      cards.forEach(card => card.dispatchEvent(event1));
      const event2 = new Event('mouseleave');
      cards.forEach(card => card.dispatchEvent(event2));
      updatePerspectiveOrigin();
  });*/
	
window.addEventListener('resize', () => {
  updatePerspectiveOrigin();
  const enter = new Event('mouseenter');
  const leave = new Event('mouseleave');
  cards.forEach(card => {
    card.dispatchEvent(enter);
    card.dispatchEvent(leave);
  });
});	
	
window.addEventListener('scroll', updatePerspectiveOrigin);

// initial
updatePerspectiveOrigin();	
	
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
		
      const distance = 0;
      vw = window.innerWidth;
				
		
      cards.forEach((c, j) => {
        
        const delta = i - j;
        const angle = j > i
          ? baseA + delta * stepA
          : baseA;
		  
        const distance = j > i
          ? cardwidth/2
          : 0;
		  
        if (j == 0) {
            c.style.width = `420px`;
			c.style.padding = `0 0 0 50px`;
			c.style.margin = `0 0 0 -50px`;
        }		
		  
        const offset = (spacing - dynamicSpacing) * j * 2.5;
		  
        let blur = 0;
        if (j > i && j > 0) {
          blur = (j / maxOff) * maxBlur;
        } else {
          blur = 0;
		}

		  
        if (j > 0) {
          c.style.transform =
            `rotateY(${angle}deg)`
            + ` translateY(${offset / 6 - dynamicSpacing*j/2}px)`
            + ` translateX(${offset+distance+20}px)`
            + ` translateZ(${offset}px)`;
        } else {
          c.style.transform =
            `rotateY(${angle}deg)`
            + ` translateY(${offset / 6 - dynamicSpacing*j/2}px)`
            + ` translateX(${offset+distance+20}px)`
            + ` translateZ(${offset}px)`;
        }
		  
		  
        c.style.filter = `blur(${blur}px)`;
        dynamicMain = stackWidth;
	  });
		

      vw = window.innerWidth;
      main.style.marginLeft = `${dynamicMain}px`;
      main.style.width = `${vw-dynamicMain-20}px`;
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
		
      const movedeck = cardwidth + spacing * (cardnumber +2) - stackWidth;
		
      dynamicMain = cardwidth + movedeck;// - spacing * (cardnumber-2) ;	
      vw = window.innerWidth;
      main.style.marginLeft = `${dynamicMain}px`;
      main.style.width = `${vw-dynamicMain-20}px`;
		
      cards.forEach((c, j) => {
        const offset = j * (spacing - dynamicSpacing);
        c.style.width = `${baseW}px`;
        c.style.transform =
          `rotateY(${baseA*1.5}deg)`
          + ` translateY(${0}px)`
          + ` translateX(${offset + movedeck}px)`
          + ` translateZ(${offset}px)`;
        c.style.filter = `blur(0)`;
	  });
    });
  });

function showNumbers() {
  const el = document.getElementById('angle-display');
  if (el) el.textContent = dynamicAngle.toFixed(1);
  const sl = document.getElementById('spacing-display');
  if (sl) sl.textContent = dynamicSpacing.toFixed(1);
  const ml = document.getElementById('main-display');
  if (ml) ml.textContent = dynamicMain.toFixed(1);
  const cl = document.getElementById('card-display');
  if (cl) cl.textContent = gcardwidth.toFixed(1);
	
}	
	
  // Grundstellung setzen
  const event1 = new Event('mouseenter');
  cards.forEach(card => card.dispatchEvent(event1));
	
  const event2 = new Event('mouseleave');
  cards.forEach(card => card.dispatchEvent(event2));
});