/** Click-to-zoom for images inside article content. */

let overlay: HTMLDivElement | null = null;
let image: HTMLImageElement | null = null;

function ensureOverlay() {
  if (overlay && image) return { overlay, image };

  overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 z-[100] bg-black/90 hidden flex items-center justify-center cursor-zoom-out opacity-0 transition-opacity duration-300';
  image = document.createElement('img');
  image.className = 'max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-300 scale-95';
  overlay.append(image);
  document.body.append(overlay);

  overlay.addEventListener('click', () => {
    overlay!.classList.add('opacity-0');
    image!.classList.replace('scale-100', 'scale-95');
    setTimeout(() => overlay!.classList.add('hidden'), 300);
  });
  return { overlay, image };
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement) || !target.closest('.prose')) return;

  event.stopPropagation();
  const lightbox = ensureOverlay();
  lightbox.image.src = target.src;
  lightbox.image.alt = target.alt;
  lightbox.overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    lightbox.overlay.classList.remove('opacity-0');
    lightbox.image.classList.replace('scale-95', 'scale-100');
  });
});

// The overlay lives on <body>, which Astro replaces on navigation.
document.addEventListener('astro:before-swap', () => {
  overlay = null;
  image = null;
});
