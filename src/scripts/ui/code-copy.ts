/** Click or keyboard-activate a code block to copy its contents. */

const ICONS = {
  idle: 'ri-file-copy-line',
  ok: 'ri-check-line',
  error: 'ri-error-warning-line',
} as const;

function setState(button: HTMLButtonElement, state: keyof typeof ICONS): void {
  button.innerHTML = `<i class="${ICONS[state]}"></i>`;
  button.classList.toggle('copied', state === 'ok');
  button.classList.toggle('error', state === 'error');
}

async function copy(wrap: HTMLElement): Promise<void> {
  const code = wrap.querySelector('pre code');
  const button = wrap.querySelector<HTMLButtonElement>('.code-copy-btn');
  if (!code) return;
  try {
    await navigator.clipboard.writeText((code as HTMLElement).innerText);
    if (button) setState(button, 'ok');
    setTimeout(() => button && setState(button, 'idle'), 1500);
  } catch (error) {
    console.error('Failed to copy:', error);
    if (button) setState(button, 'error');
    setTimeout(() => button && setState(button, 'idle'), 1800);
  }
}

document.addEventListener('click', (event) => {
  const wrap = (event.target as Element | null)?.closest<HTMLElement>('.code-copy-wrap');
  if (wrap) void copy(wrap);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target as Element | null;
  const wrap = target?.matches('pre') ? target.closest<HTMLElement>('.code-copy-wrap') : null;
  if (!wrap) return;
  event.preventDefault();
  void copy(wrap);
});
