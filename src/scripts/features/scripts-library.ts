/** Scripts library: filterable grid plus a "batch" install command for selected scripts. */
import { profile } from '../../config/site';
import { escapeHtml } from '../../lib/text';
import { onPageLoad } from '../lifecycle';

interface Script {
  name: string;
  'short-code': string;
  oses: string[];
  url: string;
}
type Os = 'windows' | 'linux';
type OsFilter = Os | 'all';

const baseUrl = profile.scriptsBaseUrl.replace(/\/$/, '');
const osOf = (script: Script): Os => (script.oses.includes('windows') ? 'windows' : 'linux');

const installCommand = (os: Os, codes: string): string =>
  os === 'windows'
    ? `irm ${baseUrl}/w -OutFile $env:TEMP\\w.ps1; & $env:TEMP\\w.ps1 ${codes}`
    : `curl ${baseUrl}/l -o /tmp/l && bash /tmp/l ${codes}`;

function scriptCard(script: Script, selected: boolean): string {
  const os = osOf(script);
  const code = escapeHtml(script['short-code']);
  return `
    <div data-script="${code}" data-os="${os}" class="block card p-6 rounded-2xl bg-zinc-950/55 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/65 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 h-full group relative ${selected ? 'ring-2 ring-white/20' : ''}">
      <div class="absolute bottom-4 right-4 z-10">
        <div class="w-6 h-6 rounded border ${selected ? 'bg-white border-white' : 'border-zinc-700 bg-zinc-900'} flex items-center justify-center transition-colors">
          ${selected ? '<i class="ri-check-line text-black text-sm"></i>' : ''}
        </div>
      </div>
      <div class="flex justify-between items-start mb-4">
        <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-300 bg-white/5">
          <i class="${os === 'windows' ? 'ri-windows-fill' : 'ri-qq-fill'}"></i>${os === 'windows' ? 'Windows' : 'Linux'}
        </span>
        <a href="${escapeHtml(script.url)}" target="_blank" rel="noopener noreferrer" data-no-select class="text-gray-400 hover:text-gray-100 transition-colors z-20 relative" title="View Source">
          <i class="ri-external-link-line"></i>
        </a>
      </div>
      <h3 class="text-xl font-bold text-gray-100 mb-2">${escapeHtml(script.name)}</h3>
      <div class="flex items-center gap-2 text-sm text-gray-400 mb-4 font-mono bg-zinc-950/50 px-2 py-1 rounded w-fit">
        <i class="ri-terminal-box-line"></i>${code}
      </div>
      <div class="relative" data-no-select>
        <div class="bg-zinc-950/70 rounded-lg p-3 font-mono text-xs text-gray-300 break-all pr-10 h-20 overflow-y-auto custom-scrollbar border border-white/5">${escapeHtml(installCommand(os, script['short-code']))}</div>
        <button data-copy="${escapeHtml(installCommand(os, script['short-code']))}" class="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-900/80 text-gray-400 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800" title="Copy command">
          <i class="ri-file-copy-line"></i>
        </button>
      </div>
    </div>`;
}

/** Applies a temporary visual state, then reverts it after two seconds. */
function flash(apply: () => void, revert: () => void): void {
  apply();
  setTimeout(revert, 2000);
}

onPageLoad(() => {
  const grid = document.getElementById('scripts-grid');
  const search = document.getElementById('script-search') as HTMLInputElement | null;
  const bar = document.getElementById('batch-bar');
  const count = document.getElementById('batch-count');
  const commandInput = document.getElementById('batch-command') as HTMLInputElement | null;
  if (!grid || !search || !bar || !count || !commandInput) return;

  let scripts: Script[] = [];
  let filter: OsFilter = 'all';
  const selected = new Set<string>();

  const selectionOs = (): Os | null => {
    const first = scripts.find((s) => s['short-code'] === selected.values().next().value);
    return first ? osOf(first) : null;
  };

  const render = () => {
    const term = search.value.toLowerCase();
    const lockedOs = selectionOs();
    const visible = scripts.filter((script) => {
      const matchesText =
        script.name.toLowerCase().includes(term) || script['short-code'].toLowerCase().includes(term);
      const matchesOs = lockedOs ? osOf(script) === lockedOs : filter === 'all' || script.oses.includes(filter);
      return matchesText && matchesOs;
    });

    grid.innerHTML = visible.length
      ? visible.map((script) => scriptCard(script, selected.has(script['short-code']))).join('')
      : '<div class="col-span-full text-center py-12 text-gray-500"><p>No scripts found matching your criteria.</p></div>';

    bar.classList.toggle('translate-y-full', selected.size === 0);
    count.textContent = String(selected.size);
    const os = selectionOs();
    if (os) commandInput.value = installCommand(os, [...selected].join(' '));
  };

  grid.addEventListener('click', (event) => {
    const target = event.target as Element;

    const copyButton = target.closest<HTMLButtonElement>('[data-copy]');
    if (copyButton) {
      void navigator.clipboard.writeText(copyButton.dataset.copy ?? '').then(() => {
        const icon = copyButton.querySelector('i');
        if (!icon) return;
        const original = icon.className;
        flash(
          () => {
            icon.className = 'ri-check-line text-green-400';
            copyButton.classList.add('border-green-500/50');
          },
          () => {
            icon.className = original;
            copyButton.classList.remove('border-green-500/50');
          },
        );
      });
      return;
    }
    if (target.closest('[data-no-select]')) return;

    const card = target.closest<HTMLElement>('[data-script]');
    if (!card) return;
    const code = card.dataset.script!;
    const os = card.dataset.os as Os;

    if (selected.size && !selected.has(code) && selectionOs() !== os) {
      alert('Cannot mix Windows and Linux scripts in one command.\nPlease clear your selection first.');
      return;
    }
    if (!selected.delete(code)) selected.add(code);
    render();
  });

  search.addEventListener('input', render);

  for (const button of document.querySelectorAll<HTMLElement>('.filter-btn')) {
    button.addEventListener('click', () => {
      for (const other of document.querySelectorAll('.filter-btn')) {
        other.classList.remove('bg-zinc-950', 'text-white');
        other.classList.add('text-gray-400');
      }
      button.classList.remove('text-gray-400');
      button.classList.add('bg-zinc-950', 'text-white');
      filter = (button.dataset.os as OsFilter) || 'all';
      render();
    });
  }

  document.getElementById('batch-clear')?.addEventListener('click', () => {
    selected.clear();
    render();
  });

  document.getElementById('batch-copy')?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLElement;
    void navigator.clipboard.writeText(commandInput.value).then(() => {
      const original = button.innerHTML;
      flash(
        () => {
          button.innerHTML = '<i class="ri-check-line"></i><span>Copied!</span>';
          button.classList.replace('bg-zinc-950', 'bg-green-600');
          button.classList.replace('hover:bg-zinc-800', 'hover:bg-green-700');
        },
        () => {
          button.innerHTML = original;
          button.classList.replace('bg-green-600', 'bg-zinc-950');
          button.classList.replace('hover:bg-green-700', 'hover:bg-zinc-800');
        },
      );
    });
  });

  fetch(profile.scriptsIndexUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data: unknown) => {
      if (!Array.isArray(data)) throw new Error('Invalid scripts data format');
      scripts = data as Script[];
      render();
    })
    .catch((error) => {
      console.error('Error fetching scripts:', error);
      grid.innerHTML =
        '<div class="col-span-full text-center py-12 text-yellow-500/70"><i class="ri-alert-line text-3xl mb-2 inline-block"></i><p class="text-sm">Scripts library is currently unavailable. This feature requires external data that may not be accessible in your environment.</p></div>';
    });
});
