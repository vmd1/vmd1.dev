/** Reading-progress bar pinned to the top of the viewport. */

function update(): void {
  const bar = document.getElementById('reading-progress');
  if (!bar) return;
  const root = document.documentElement;
  const scrollable = root.scrollHeight - root.clientHeight;
  bar.style.width = `${scrollable > 0 ? (root.scrollTop / scrollable) * 100 : 0}%`;
}

window.addEventListener('scroll', update, { passive: true });
document.addEventListener('astro:page-load', update);
