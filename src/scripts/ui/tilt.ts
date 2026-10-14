/** 3D tilt for interactive cards. One delegated listener covers cards added later. */

const INTERACTIVE_CARD = '.card:not(.static-card)';

const cardFor = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>(INTERACTIVE_CARD) : null;

document.addEventListener('mousemove', (event) => {
  const card = cardFor(event.target);
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -20;
  const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 20;
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

document.addEventListener('mouseout', (event) => {
  const card = cardFor(event.target);
  if (!card || (event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) return;
  card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
});
