/** Scroll reveals, cursor spotlight and backdrop parallax. All of it is decoration: content is
 *  fully visible without it, and the start states in CSS only apply when motion is allowed. */
import { onPageLoad } from '../lifecycle';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      visible.forEach((entry, index) => {
        const el = entry.target as HTMLElement;
        // Elements revealed in the same frame cascade instead of popping in together.
        el.style.setProperty('--d', `${index * 80}ms`);
        el.classList.add('is-in');
        observer?.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  return observer;
}

/** Starts watching every `[data-reveal]` under `root`; call again after rendering new ones. */
export function observeReveals(root: ParentNode = document): void {
  const io = getObserver();
  root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
}

// Cursor spotlight: cards expose the pointer position to CSS, which paints the glow.
document.addEventListener(
  'pointermove',
  (event) => {
    if (!(event.target instanceof Element)) return;
    const spot = event.target.closest<HTMLElement>('.spot');
    if (!spot) return;
    const rect = spot.getBoundingClientRect();
    spot.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    spot.style.setProperty('--my', `${event.clientY - rect.top}px`);
  },
  { passive: true },
);

// Backdrop logo drifts slowly against the scroll.
let frame = 0;
window.addEventListener(
  'scroll',
  () => {
    if (reduceMotion.matches) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const logo = document.getElementById('background-logo');
      if (logo) logo.style.transform = `translate3d(0, ${window.scrollY * -0.06}px, 0)`;
    });
  },
  { passive: true },
);

onPageLoad(() => {
  observer?.disconnect();
  observer = null;
  observeReveals();
});
