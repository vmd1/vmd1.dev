/** Behaviour for components/ScrollRuler.astro. */

const TICKS = 100;
const MAJOR_EVERY = 5;

const ruler = document.getElementById('scroll-ruler') as HTMLElement;
const tickLayer = ruler.querySelector<HTMLElement>('.scroll-ruler__ticks')!;
const marker = ruler.querySelector<HTMLElement>('.scroll-ruler__marker')!;
const markerValue = ruler.querySelector<HTMLElement>('.scroll-ruler__value')!;
const hit = ruler.querySelector<HTMLElement>('.scroll-ruler__hit')!;

for (let i = 0; i <= TICKS; i++) {
  const major = i % MAJOR_EVERY === 0;
  const tick = document.createElement('div');
  tick.className = `scroll-ruler__tick${major ? ' scroll-ruler__tick--major' : ''}`;
  tick.style.top = `${i}%`;
  if (major) tick.dataset.label = String(i);
  tickLayer.append(tick);
}

const pageHeight = () => document.documentElement.scrollHeight;
const maxScroll = () => Math.max(pageHeight() - window.innerHeight, 0);

function render(): void {
  // Ticks live in page coordinates, so shifting by scrollY keeps them glued to the content.
  tickLayer.style.height = `${pageHeight()}px`;
  tickLayer.style.transform = `translate3d(0, ${-window.scrollY}px, 0)`;
  const max = maxScroll();
  ruler.setAttribute('aria-valuenow', String(max ? Math.round((window.scrollY / max) * 100) : 0));
}

const percentAt = (clientY: number) =>
  Math.min(100, Math.max(0, ((clientY + window.scrollY) / pageHeight()) * 100));

function showMarker(clientY: number): void {
  marker.style.transform = `translate3d(0, ${clientY}px, 0)`;
  markerValue.textContent = `${Math.round(percentAt(clientY))}%`;
  marker.classList.add('is-visible');
}

/** Scrolls so that the page position under `clientY` lands in the middle of the viewport. */
function jumpTo(clientY: number): void {
  const target = (percentAt(clientY) / 100) * pageHeight() - window.innerHeight / 2;
  window.scrollTo({ top: Math.min(Math.max(target, 0), maxScroll()), behavior: 'auto' });
}

let dragging = false;
hit.addEventListener('pointerdown', (event) => {
  dragging = true;
  hit.setPointerCapture(event.pointerId);
  jumpTo(event.clientY);
});
hit.addEventListener('pointermove', (event) => {
  showMarker(event.clientY);
  if (dragging) jumpTo(event.clientY);
});
hit.addEventListener('pointerup', () => (dragging = false));
hit.addEventListener('pointerleave', () => {
  if (!dragging) marker.classList.remove('is-visible');
});

window.addEventListener('scroll', render, { passive: true });
window.addEventListener('resize', render);
// Content such as the home timeline loads after first paint and changes the page height.
new ResizeObserver(render).observe(document.body);
document.addEventListener('astro:page-load', render);
render();
