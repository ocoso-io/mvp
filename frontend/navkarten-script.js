// script.js
const cards = document.querySelectorAll('.card');
const main = document.querySelector('.main');

cards.forEach((card, i) => {
  card.addEventListener('mouseenter', () => {
    cards.forEach((c, j) => {
      const delta = j - i;
      if (j < i) {
        c.style.transform = `rotateY(-45deg) translateX(${j*20}px) scaleX(0.9)`;
      } else if (j === i) {
        c.style.transform = `rotateY(-10deg) translateX(${j*20}px) scaleX(1)`;
      } else {
        c.style.transform = `rotateY(-30deg) translateX(${j*20}px)`;
      }
    });
    main.style.marginLeft = '220px';
  });
  card.addEventListener('mouseleave', () => {
    cards.forEach((c, j) => {
      c.style.transform = `rotateY(-30deg) translateX(${j*20}px) scaleX(1)`;
    });
    main.style.marginLeft = '0';
  });
});// JavaScript Document