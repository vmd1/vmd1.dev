/**
 * Runs `init` once per page: immediately if the page has already loaded (module scripts can
 * finish loading after Astro has fired `astro:page-load`), and again after every client-side
 * navigation. Astro swaps `<body>` on navigation, so the body identifies a page.
 */
export function onPageLoad(init: () => void): void {
  let handledBody: HTMLElement | null = null;
  const run = () => {
    if (document.body === handledBody) return;
    handledBody = document.body;
    init();
  };

  document.addEventListener('astro:page-load', run);
  if (document.readyState !== 'loading') run();
}
