/** Giscus comments: injects the widget into the page's `.giscus-slot` on every navigation. */
import { onPageLoad } from '../lifecycle';

const show = () => {
  document.getElementById('comments-loading')?.classList.add('hidden');
  document.getElementById('comments-container')?.classList.remove('hidden');
};

onPageLoad(() => {
  const slot = document.querySelector<HTMLElement>('.giscus-slot');
  if (!slot) return;

  const script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.crossOrigin = 'anonymous';
  script.async = true;
  script.setAttribute('data-mapping', 'pathname');
  script.setAttribute('data-strict', '0');
  script.setAttribute('data-reactions-enabled', '1');
  script.setAttribute('data-emit-metadata', '0');
  script.setAttribute('data-input-position', 'top');
  script.setAttribute('data-lang', 'en');
  script.setAttribute('data-loading', 'eager');
  for (const [name, value] of Object.entries(slot.dataset)) {
    if (value === undefined) continue;
    script.setAttribute(`data-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value);
  }

  const observer = new MutationObserver(() => {
    if (!slot.querySelector('iframe.giscus-frame')) return;
    observer.disconnect();
    show();
  });
  observer.observe(slot, { childList: true, subtree: true });
  setTimeout(() => {
    observer.disconnect();
    show();
  }, 900);

  slot.append(script);
});
