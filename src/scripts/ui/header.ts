/** Header menus: search bar, mobile overflow menu and mobile socials. */
import { onPageLoad } from '../lifecycle';

const MENUS = [
  { toggle: '#mobile-social-toggle', menu: '#mobile-social-menu' },
  { toggle: '#mobile-nav-overflow-toggle', menu: '#mobile-nav-overflow-menu' },
];

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);

function setSearchOpen(open: boolean): void {
  const container = $('#search-container');
  if (!container) return;
  container.classList.toggle('search-open', open);
  container.classList.toggle('search-hidden', !open);
  if (open) $<HTMLInputElement>('#search-input')?.focus();
}

function closeMenus(except?: string): void {
  for (const { menu } of MENUS) if (menu !== except) $(menu)?.classList.add('hidden');
}

document.addEventListener('click', (event) => {
  const target = event.target as Element;

  if (target.closest('#search-toggle')) {
    const isOpen = $('#search-container')?.classList.contains('search-open');
    setSearchOpen(!isOpen);
    if (!isOpen) closeMenus();
    return;
  }

  for (const { toggle, menu } of MENUS) {
    if (target.closest(toggle)) {
      $(menu)?.classList.toggle('hidden');
      closeMenus(menu);
      setSearchOpen(false);
      return;
    }
  }

  // Clicks outside close whatever is open.
  if (!target.closest('#search-container')) setSearchOpen(false);
  for (const { menu } of MENUS) if (!target.closest(menu)) $(menu)?.classList.add('hidden');
});

// A fresh page always starts with everything closed.
onPageLoad(() => {
  setSearchOpen(false);
  closeMenus();
});
